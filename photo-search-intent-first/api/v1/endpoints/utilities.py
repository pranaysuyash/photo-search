"""
Utilities-related endpoints for API v1.
"""
from fastapi import APIRouter, Body, HTTPException, Query, Depends, Request
from fastapi.responses import FileResponse, JSONResponse
from typing import Dict, Any, List, Optional

from api.schemas.v1 import CachedSearchRequest, SearchRequest, SuccessResponse
from api.utils import _as_bool, _as_str_list, _emb, _from_body, _require
from api.auth import require_auth
from infra.analytics import log_search, _write_event as _write_event_infra
from infra.thumbs import get_or_create_face_thumb, get_or_create_thumb
from pathlib import Path
import hashlib
import json
import os
import shutil
import time


# Create router for utilities endpoints
utilities_router = APIRouter(prefix="/utilities", tags=["utilities"])


@utilities_router.post("/export", response_model=SuccessResponse)
def export_v1(
    directory: Optional[str] = None,
    paths: Optional[List[str]] = None,
    dest: Optional[str] = None,
    mode: Optional[str] = None,
    strip_exif: Optional[bool] = None,
    overwrite: Optional[bool] = None,
    body: Optional[Dict[str, Any]] = Body(None),
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Export/copy selected photos to a destination directory with various options.
    """
    dir_value = _require(_from_body(body, directory, "dir"), "dir")
    paths_value = _from_body(body, paths, "paths", default=[], cast=_as_str_list) or []
    dest_value = _require(_from_body(body, dest, "dest"), "dest")
    mode_value = (_from_body(body, mode, "mode", default="copy") or "copy").lower()
    strip_exif_value = _from_body(body, strip_exif, "strip_exif", default=False, cast=_as_bool) or False
    overwrite_value = _from_body(body, overwrite, "overwrite", default=False, cast=_as_bool) or False

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    dest_dir = Path(dest_value).expanduser()
    try:
        dest_dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        raise HTTPException(400, "Cannot create destination")
    copied = 0; skipped = 0; errors = 0
    for sp in paths_value:
        src = Path(sp)
        if not src.exists():
            errors += 1; continue
        out = dest_dir / src.name
        if out.exists() and not overwrite_value:
            skipped += 1; continue
        try:
            if mode_value == 'symlink':
                try:
                    if out.exists(): out.unlink()
                    os.symlink(src, out)
                    copied += 1
                    continue
                except Exception:
                    pass
            if strip_exif_value:
                try:
                    from PIL import Image
                    with Image.open(src) as img:
                        img = img.convert('RGB') if img.mode not in ('RGB','L') else img
                        img.save(out)
                    copied += 1
                    continue
                except Exception:
                    pass
            shutil.copy2(src, out)
            copied += 1
        except Exception:
            errors += 1
    return SuccessResponse(
        ok=True, 
        data={
            "copied": copied, 
            "skipped": skipped, 
            "errors": errors, 
            "dest": str(dest_dir)
        }
    )


@utilities_router.get("/map", response_model=SuccessResponse)
def map_v1(
    directory: str = Query(..., alias="dir"), 
    limit: int = 1000,
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Extract GPS coordinates from EXIF data of photos for map visualization.
    """
    from PIL import ExifTags
    from infra.index_store import IndexStore
    folder = Path(directory)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    inv = {v: k for k, v in ExifTags.TAGS.items()}
    pts: List[Dict[str, float]] = []
    store = IndexStore(folder)
    store.load()
    def to_deg(val):
        try:
            d,m,s = val
            def cv(x):
                return float(x[0])/float(x[1]) if isinstance(x, tuple) else float(x)
            return cv(d)+cv(m)/60.0+cv(s)/3600.0
        except Exception:
            return None
    for sp in (store.state.paths or [])[:limit]:
        try:
            from PIL import Image
            img = Image.open(sp)
            ex = img._getexif() or {}
            gps = ex.get(inv.get('GPSInfo', -1)) or {}
            lat = gps.get(2); lat_ref = gps.get(1)
            lon = gps.get(4); lon_ref = gps.get(3)
            if lat and lon and lat_ref and lon_ref:
                latd = to_deg(lat); lond = to_deg(lon)
                if latd is not None and lond is not None:
                    if str(lat_ref).upper().startswith('S'):
                        latd = -latd
                    if str(lon_ref).upper().startswith('W'):
                        lond = -lond
                    pts.append({"lat": latd, "lon": lond})
        except Exception:
            continue
    return SuccessResponse(ok=True, data={"points": pts})


@utilities_router.get("/tech.json")
def tech_manifest_v1(_auth = Depends(require_auth)):
    """
    Machine-readable manifest for auditors and tools.
    Confirms Electron + React (Vite) + FastAPI stack, and that Streamlit is not used.
    """
    return JSONResponse({
        "frontend": "react+vite",
        "shell": "electron",
        "backend": "fastapi",
        "streamlit": False,
        "version": "0.1.0"
    })


@utilities_router.post("/search/paginated", response_model=SuccessResponse)
def search_paginated_v1(
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    body: Optional[Dict[str, Any]] = Body(None),
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Paginated search with cursor support for large result sets.
    """
    from infra.index_store import IndexStore
    # Extract pagination parameters
    limit_value = _from_body(body, limit, "limit", default=24, cast=lambda v: int(v)) or 24
    offset_value = _from_body(body, offset, "offset", default=0, cast=lambda v: int(v)) or 0

    # Build unified search request from body parameters
    try:
        search_req = SearchRequest.from_query_params(body or {})
    except Exception as e:
        raise HTTPException(400, f"Invalid search parameters: {e}")

    # Override top_k to get enough results for pagination
    search_req.top_k = min(limit_value + offset_value + 50, search_req.top_k)

    # Validate directory
    if not search_req.dir:
        raise HTTPException(400, "Directory path is required")

    folder = Path(search_req.dir).expanduser().resolve()
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    # Get embedder
    emb = _emb(search_req.provider, search_req.hf_token, search_req.openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()

    # Perform search
    if search_req.use_captions and store.captions_available():
        results = store.search_with_captions(emb, search_req.query, top_k=search_req.top_k)
    elif search_req.use_ocr and store.ocr_available():
        results = store.search_with_ocr(emb, search_req.query, top_k=search_req.top_k)
    else:
        results = store.search(emb, search_req.query, top_k=search_req.top_k)

    # Apply pagination
    total = len(results)
    paginated_results = results[offset_value:offset_value + limit_value]

    # Log search
    sid = log_search(store.index_dir, getattr(emb, 'index_id', 'default'), search_req.query, [(str(r.path), float(r.score)) for r in results])

    return SuccessResponse(
        ok=True,
        data={
            "search_id": sid,
            "results": [{"path": str(r.path), "score": float(r.score)} for r in paginated_results],
            "pagination": {
                "offset": offset_value,
                "limit": limit_value,
                "total": total,
                "has_more": offset_value + limit_value < total
            }
        }
    )


@utilities_router.post("/search/cached", response_model=SuccessResponse)
def search_cached_v1(
    req: CachedSearchRequest = Body(...),
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Perform a semantic search with lightweight result caching.
    """
    from infra.index_store import IndexStore
    folder = Path(req.dir).expanduser().resolve()
    if not folder.exists() or not folder.is_dir():
        raise HTTPException(400, "Folder not found")

    # Derive cache key if missing
    cache_key = req.cache_key
    if not cache_key:
        raw_key = (
            f"{req.query}:{req.top_k}:{req.provider}:{req.use_fast}:{req.fast_kind}:"
            f"{req.use_captions}:{req.use_ocr}:{req.favorites_only}:{','.join(req.tags or [])}:"
            f"{req.date_from}:{req.date_to}:{req.place}:{req.person}:{','.join(req.persons or [])}"
        )
        cache_key = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    # Build store for path computations
    store = IndexStore(folder, index_key=None)
    cache_file = store.index_dir / f"search_cache_{cache_key}.json"

    # Check cache validity
    try:
        if cache_file.exists():
            cached_data = json.loads(cache_file.read_text())
            cache_time = cached_data.get("timestamp", 0)
            index_mtime = store.index_dir.stat().st_mtime
            
            # Cache valid for 1 hour OR until index changes
            if (time.time() - cache_time < 3600) and (cache_time > index_mtime):
                return SuccessResponse(ok=True, data=cached_data.get("results", {"results": []}))
    except Exception:
        pass

    # Cache miss - perform actual search
    emb = _emb(req.provider, req.hf_token, req.openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    
    if req.use_captions and store.captions_available():
        results = store.search_with_captions(emb, req.query, top_k=req.top_k)
    elif req.use_ocr and store.ocr_available():
        results = store.search_with_ocr(emb, req.query, top_k=req.top_k)
    else:
        results = store.search(emb, req.query, top_k=req.top_k)
    
    output = {"results": [{"path": str(r.path), "score": float(r.score)} for r in results]}
    
    # Cache the results
    try:
        cache_data = {
            "timestamp": time.time(),
            "cache_key": cache_key,
            "results": output
        }
        cache_file.write_text(json.dumps(cache_data))
    except Exception:
        pass  # Don't fail search if caching fails
    
    return SuccessResponse(ok=True, data=output)


@utilities_router.post("/thumbs", response_model=SuccessResponse)
def build_thumbnails_v1(
    dir: Optional[str] = None,
    size: Optional[int] = None,
    provider: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Build thumbnails for all photos in directory.
    """
    from infra.index_store import IndexStore
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    size_value = _from_body(body, size, "size", default=512, cast=int) or 512
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    emb = _emb(provider_value, hf_token_value, openai_key_value)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    
    made = 0
    for sp, mt in zip(store.state.paths or [], store.state.mtimes or []):
        tp = get_or_create_thumb(store.index_dir, Path(sp), float(mt), size=size_value)
        if tp is not None:
            made += 1
    
    out = {"made": made}
    _write_event_infra(store.index_dir, { 
        'type': 'thumbs_build', 
        'made': made, 
        'size': size_value 
    })
    return SuccessResponse(ok=True, data=out)


@utilities_router.post("/thumb/batch", response_model=SuccessResponse)
def thumb_batch_v1(
    dir: Optional[str] = None,
    paths: Optional[List[str]] = None,
    size: Optional[int] = None,
    provider: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Generate thumbnails for multiple images in batch to reduce API calls.
    """
    from infra.index_store import IndexStore
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    paths_value = _from_body(body, paths, "paths", default=[], cast=_as_str_list) or []
    size_value = _from_body(body, size, "size", default=256, cast=int) or 256

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    store = IndexStore(folder)
    results = []
    
    for path_str in paths_value:
        try:
            path = folder / path_str
            if path.exists() and path.is_file():
                # Use existing thumbnail infrastructure
                thumb_path = get_or_create_thumb(store.index_dir, path, path.stat().st_mtime, size_value)
                results.append({
                    "path": path_str,
                    "success": thumb_path is not None,
                    "thumb_path": str(thumb_path) if thumb_path else None
                })
            else:
                results.append({
                    "path": path_str,
                    "success": False,
                    "error": "File not found"
                })
        except Exception as e:
            results.append({
                "path": path_str,
                "success": False,
                "error": str(e)
            })

    return SuccessResponse(
        ok=True, 
        data={
            "results": results,
            "total": len(paths_value),
            "success_count": sum(1 for r in results if r["success"])
        }
    )


@utilities_router.get("/thumb")
def get_thumbnail_v1(
    directory: str = Query(..., alias="dir"), 
    path: str = Query(...), 
    size: int = 256,
    _auth = Depends(require_auth)
):
    """
    Get thumbnail of a photo.
    """
    from infra.index_store import IndexStore
    folder = Path(directory)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    store = IndexStore(folder)
    store.load()
    
    try:
        # Find the mtime for this path
        idx_map = {sp: float(mt) for sp, mt in zip(store.state.paths or [], store.state.mtimes or [])}
        mtime = idx_map.get(path, 0.0)
        
        # Generate or get existing thumbnail
        tp = get_or_create_thumb(store.index_dir, Path(path), float(mtime), size=size)
        if tp is None or not tp.exists():
            raise HTTPException(404, "Thumb not found")
        
        return FileResponse(str(tp))
    except Exception:
        raise HTTPException(500, "Failed to generate thumbnail")


@utilities_router.get("/thumb_face")
def get_face_thumbnail_v1(
    directory: str = Query(..., alias="dir"), 
    path: str = Query(...), 
    emb: int = Query(...), 
    provider: str = "local", 
    size: int = 256, 
    hf_token: Optional[str] = None, 
    openai_key: Optional[str] = None,
    _auth = Depends(require_auth)
):
    """
    Get thumbnail of a face from a photo.
    """
    from infra.index_store import IndexStore
    from infra.faces import load as _faces_load
    folder = Path(directory)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    embd = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(embd, 'index_id', None))
    store.load()
    
    try:
        idx_map = {sp: float(mt) for sp, mt in zip(store.state.paths or [], store.state.mtimes or [])}
        mtime = idx_map.get(path, 0.0)
        data = _faces_load(store.index_dir)
        bbox = None
        
        for it in data.get('photos', {}).get(path, []) or []:
            try:
                if int(it.get('emb')) == int(emb):
                    bb = it.get('bbox')
                    if isinstance(bb, list) and len(bb) == 4:
                        bbox = (int(bb[0]), int(bb[1]), int(bb[2]), int(bb[3]))
                        break
            except Exception:
                continue
        
        if bbox is None:
            # fallback to generic thumb
            tp = get_or_create_thumb(store.index_dir, Path(path), float(mtime), size=size)
            if tp is None or not tp.exists():
                raise HTTPException(404, "Thumb not found")
            return FileResponse(str(tp))
        
        fp = get_or_create_face_thumb(store.index_dir, Path(path), float(mtime), bbox, size=size)
        if fp is None or not fp.exists():
            raise HTTPException(404, "Face thumb not found")
        return FileResponse(str(fp))
    except Exception:
        raise HTTPException(500, "Failed to generate face thumbnail")


@utilities_router.post("/search_like", response_model=SuccessResponse)
def search_like_v1(
    dir: Optional[str] = None,
    path: Optional[str] = None,
    top_k: Optional[int] = None,
    provider: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Find similar photos to a given photo.
    """
    from infra.index_store import IndexStore
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    path_value = _require(_from_body(body, path, "path"), "path")
    top_k_value = _from_body(body, top_k, "top_k", default=12, cast=int) or 12
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    emb = _emb(provider_value, hf_token_value, openai_key_value)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    out = store.search_like(path_value, top_k=top_k_value)
    return SuccessResponse(ok=True, data={"results": [{"path": str(r.path), "score": float(r.score)} for r in out]})


@utilities_router.post("/search_like_plus", response_model=SuccessResponse)
def search_like_plus_v1(
    dir: Optional[str] = None,
    path: Optional[str] = None,
    top_k: Optional[int] = None,
    text: Optional[str] = None,
    weight: Optional[float] = None,
    provider: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Enhanced similarity search with text weighting.
    """
    from infra.index_store import IndexStore
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    path_value = _require(_from_body(body, path, "path"), "path")
    top_k_value = _from_body(body, top_k, "top_k", default=12, cast=int) or 12
    text_value = _from_body(body, text, "text")
    weight_value = _from_body(body, weight, "weight", default=0.5, cast=float) or 0.5
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    emb = _emb(provider_value, hf_token_value, openai_key_value)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    
    if store.state.embeddings is None or not store.state.paths:
        return SuccessResponse(ok=True, data={"results": []})
    
    try:
        i = store.state.paths.index(path_value)
        img_emb = store.state.embeddings[i]
        
        if text_value:
            text_emb = emb.embed_text(text_value)
            combined_emb = weight_value * img_emb + (1 - weight_value) * text_emb
        else:
            combined_emb = img_emb
            
        out = store.search_by_embedding(combined_emb, top_k=top_k_value)
        return SuccessResponse(ok=True, data={"results": [{"path": str(r.path), "score": float(r.score)} for r in out]})
    except (ValueError, IndexError):
        raise HTTPException(404, "Photo not found in index")