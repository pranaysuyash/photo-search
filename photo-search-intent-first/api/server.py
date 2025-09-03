from __future__ import annotations

from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from adapters.provider_factory import get_provider
from usecases.index_photos import index_photos
from usecases.search_photos import search_photos
from infra.index_store import IndexStore
from infra.collections import load_collections, save_collections
from infra.tags import load_tags, save_tags, all_tags
from usecases.manage_saved import load_saved, save_saved
from infra.analytics import log_search, log_feedback
from infra.dupes import find_lookalikes, load_resolved, save_resolved, _group_id  # type: ignore
from infra.thumbs import get_or_create_thumb
from infra.edits import apply_ops as _edit_apply_ops, upscale as _edit_upscale, EditOps as _EditOps
from adapters.vlm_caption_hf import VlmCaptionHF
import shutil, os
import json

from PIL import Image, ExifTags


app = FastAPI(title="Photo Search – Intent-First API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Simple static frontend (minimal, modern, not complicated)
STATIC_DIR = Path(__file__).resolve().parent / "web"
if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")


def _emb(provider: str, hf_token: Optional[str], openai_key: Optional[str], st_model: Optional[str] = None,
         tf_model: Optional[str] = None, hf_model: Optional[str] = None) -> Any:
    return get_provider(provider, hf_token=hf_token, openai_api_key=openai_key, st_model=st_model, tf_model=tf_model, hf_model=hf_model)


@app.post("/index")
def api_index(dir: str, provider: str = "local", batch_size: int = 32, hf_token: Optional[str] = None, openai_key: Optional[str] = None) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    new_c, upd_c, total = index_photos(folder, batch_size=batch_size, embedder=emb)
    return {"new": new_c, "updated": upd_c, "total": total}


@app.post("/search")
def api_search(dir: str, query: str, top_k: int = 12, provider: str = "local", hf_token: Optional[str] = None, openai_key: Optional[str] = None,
               favorites_only: bool = False, tags: Optional[List[str]] = None, date_from: Optional[float] = None, date_to: Optional[float] = None,
               use_fast: bool = False, fast_kind: Optional[str] = None, use_captions: bool = False,
               camera: Optional[str] = None, iso_min: Optional[int] = None, iso_max: Optional[int] = None,
               f_min: Optional[float] = None, f_max: Optional[float] = None) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    # Basic search via usecase or fast search
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    if use_fast:
        try:
            if fast_kind and fast_kind.lower() == 'faiss' and store.faiss_status().get('exists'):
                results = store.search_faiss(emb, query, top_k=top_k)
            elif fast_kind and fast_kind.lower() == 'hnsw' and store.hnsw_status().get('exists'):
                results = store.search_hnsw(emb, query, top_k=top_k)
            elif fast_kind and fast_kind.lower() == 'annoy' and store.ann_status().get('exists'):
                results = store.search_annoy(emb, query, top_k=top_k)
            else:
                # Choose best available
                if store.faiss_status().get('exists'):
                    results = store.search_faiss(emb, query, top_k=top_k)
                elif store.hnsw_status().get('exists'):
                    results = store.search_hnsw(emb, query, top_k=top_k)
                elif store.ann_status().get('exists'):
                    results = store.search_annoy(emb, query, top_k=top_k)
                else:
                    results = store.search(emb, query, top_k=top_k)
        except Exception:
            results = store.search(emb, query, top_k=top_k)
    else:
        if use_captions and store.captions_available():
            results = store.search_with_captions(emb, query, top_k=top_k)
        else:
            results = store.search(emb, query, top_k=top_k)
    out = results
    # Favorites filter
    if favorites_only:
        coll = load_collections(store.index_dir)
        favs = set(coll.get('Favorites', []))
        out = [r for r in out if str(r.path) in favs]
    # Tags filter
    if tags:
        tmap = load_tags(store.index_dir)
        req = set(tags)
        out = [r for r in out if req.issubset(set(tmap.get(str(r.path), [])))]
    # Date filter (by mtimes)
    if date_from is not None and date_to is not None:
        mmap = {sp: float(mt) for sp, mt in zip(store.state.paths or [], store.state.mtimes or [])}
        out = [r for r in out if date_from <= mmap.get(str(r.path), 0.0) <= date_to]
    # Log search
    # EXIF-based filtering if metadata exists
    try:
        meta_p = store.index_dir / 'exif_index.json'
        if meta_p.exists() and any([camera, iso_min is not None, iso_max is not None, f_min is not None, f_max is not None]):
            m = json.loads(meta_p.read_text())
            cam_map = {p: (c or '') for p, c in zip(m.get('paths',[]), m.get('camera',[]))}
            iso_map = {p: (i if isinstance(i,int) else None) for p, i in zip(m.get('paths',[]), m.get('iso',[]))}
            f_map = {p: (float(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('fnumber',[]))}
            def ok(p:str) -> bool:
                if camera and camera.strip():
                    if camera.strip().lower() not in (cam_map.get(p,'') or '').lower():
                        return False
                if iso_min is not None:
                    v = iso_map.get(p)
                    if v is None or v < int(iso_min):
                        return False
                if iso_max is not None:
                    v = iso_map.get(p)
                    if v is None or v > int(iso_max):
                        return False
                if f_min is not None:
                    v = f_map.get(p)
                    if v is None or v < float(f_min):
                        return False
                if f_max is not None:
                    v = f_map.get(p)
                    if v is None or v > float(f_max):
                        return False
                return True
            out = [r for r in out if ok(str(r.path))]
    except Exception:
        pass
    sid = log_search(store.index_dir, getattr(emb, 'index_id', 'default'), query, [(str(r.path), float(r.score)) for r in out])
    return {"search_id": sid, "results": [{"path": str(r.path), "score": float(r.score)} for r in out]}


@app.post("/captions/build")
def api_build_captions(dir: str, vlm_model: str = "Qwen/Qwen2-VL-2B-Instruct", provider: str = "local", hf_token: Optional[str] = None, openai_key: Optional[str] = None) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    vlm = VlmCaptionHF(model=vlm_model, hf_token=hf_token)
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    updated = store.build_captions(vlm, emb)
    return {"updated": updated}


@app.post("/search_workspace")
def api_search_workspace(dir: str, query: str, top_k: int = 12, provider: str = "local", hf_token: Optional[str] = None, openai_key: Optional[str] = None,
                         favorites_only: bool = False, tags: Optional[List[str]] = None, date_from: Optional[float] = None, date_to: Optional[float] = None) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    primary = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    primary.load()
    from infra.workspace import load_workspace
    stores: List[IndexStore] = [primary]
    for f in load_workspace():
        p = Path(f)
        if p.exists() and str(p.resolve()) != str(folder.resolve()):
            s = IndexStore(p, index_key=getattr(emb, 'index_id', None))
            s.load()
            stores.append(s)
    # build combined search
    try:
        qv = emb.embed_text(query)
    except Exception:
        raise HTTPException(500, "Embedding failed")
    import numpy as np
    E_list = []; paths: List[str] = []
    for s in stores:
        if s.state.embeddings is not None and len(s.state.embeddings) > 0:
            E_list.append(s.state.embeddings)
            paths.extend(s.state.paths)
    if not E_list:
        return {"search_id": None, "results": []}
    E = np.vstack(E_list).astype('float32')
    sims = (E @ qv).astype(float)
    k = max(1, min(top_k, len(sims)))
    idx = np.argpartition(-sims, k - 1)[:k]
    idx = idx[np.argsort(-sims[idx])]
    # Convert to SearchResults-like tuples for filters
    out_pairs = [(paths[i], float(sims[i])) for i in idx]
    # Apply filters
    if favorites_only:
        favset = set()
        for s in stores:
            coll = load_collections(s.index_dir)
            favset.update(coll.get('Favorites', []))
        out_pairs = [(p, s) for (p, s) in out_pairs if p in favset]
    if tags:
        req = set(tags)
        # merge tags
        tmap: Dict[str, List[str]] = {}
        for s in stores:
            for k,v in (load_tags(s.index_dir)).items():
                tmap[k] = v
        out_pairs = [(p, s) for (p, s) in out_pairs if req.issubset(set(tmap.get(p, [])))]
    if date_from is not None and date_to is not None:
        mmap: Dict[str, float] = {}
        for s in stores:
            mmap.update({sp: float(mt) for sp, mt in zip(s.state.paths or [], s.state.mtimes or [])})
        out_pairs = [(p, s) for (p, s) in out_pairs if date_from <= mmap.get(p, 0.0) <= date_to]
    # Log
    sid = log_search(primary.index_dir, getattr(emb, 'index_id', 'default'), query, out_pairs)
    return {"search_id": sid, "results": [{"path": p, "score": sc} for (p, sc) in out_pairs]}


@app.get("/favorites")
def api_get_favorites(dir: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    coll = load_collections(store.index_dir)
    return {"favorites": coll.get('Favorites', [])}


@app.post("/favorites")
def api_set_favorite(dir: str, path: str, favorite: bool = True) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    coll = load_collections(store.index_dir)
    fav = coll.get('Favorites', [])
    if favorite:
        if path not in fav:
            fav.append(path)
    else:
        fav = [p for p in fav if p != path]
    coll['Favorites'] = fav
    save_collections(store.index_dir, coll)
    return {"ok": True, "favorites": fav}


@app.get("/tags")
def api_get_tags(dir: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    return {"tags": load_tags(store.index_dir), "all": all_tags(store.index_dir)}


@app.post("/tags")
def api_set_tags(dir: str, path: str, tags: List[str]) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    t = load_tags(store.index_dir)
    t[path] = sorted({s.strip() for s in tags if s.strip()})
    save_tags(store.index_dir, t)
    return {"ok": True, "tags": t[path]}


@app.get("/saved")
def api_get_saved(dir: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    return {"saved": load_saved(store.index_dir)}


@app.post("/saved")
def api_add_saved(dir: str, name: str, query: str, top_k: int = 12) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    saved = load_saved(store.index_dir)
    saved.append({"name": name, "query": query, "top_k": int(top_k)})
    save_saved(store.index_dir, saved)
    return {"ok": True, "saved": saved}


@app.post("/saved/delete")
def api_delete_saved(dir: str, name: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    saved = load_saved(store.index_dir)
    before = len(saved)
    saved = [s for s in saved if str(s.get("name")) != name]
    save_saved(store.index_dir, saved)
    return {"ok": True, "deleted": before - len(saved), "saved": saved}


# Collections CRUD
@app.get("/collections")
def api_get_collections(dir: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    return {"collections": load_collections(store.index_dir)}

@app.post("/collections")
def api_set_collection(dir: str, name: str, paths: List[str]) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    coll = load_collections(store.index_dir)
    coll[name] = sorted(set(paths))
    save_collections(store.index_dir, coll)
    return {"ok": True, "collections": coll}

@app.post("/collections/delete")
def api_delete_collection(dir: str, name: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    coll = load_collections(store.index_dir)
    if name in coll:
        del coll[name]
        save_collections(store.index_dir, coll)
        return {"ok": True, "deleted": name}
    return {"ok": False, "deleted": None}


@app.post("/feedback")
def api_feedback(dir: str, search_id: str, query: str, positives: List[str], note: str = "") -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    log_feedback(store.index_dir, search_id, query, positives, note)
    return {"ok": True}


@app.get("/lookalikes")
def api_lookalikes(dir: str, max_distance: int = 5) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    groups = find_lookalikes(store.index_dir, max_distance=max_distance)
    resolved = set(load_resolved(store.index_dir))
    items = []
    for g in groups:
        gid = _group_id(g)
        items.append({"id": gid, "paths": g, "resolved": gid in resolved})
    return {"groups": items}


@app.post("/lookalikes/resolve")
def api_resolve_lookalike(dir: str, group_paths: List[str]) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    gid = _group_id(group_paths)
    ids = load_resolved(store.index_dir)
    if gid not in ids:
        ids.append(gid)
    save_resolved(store.index_dir, ids)
    return {"ok": True, "id": gid}


# Extras now that we have a proper frontend
@app.post("/ocr/build")
def api_build_ocr(dir: str, provider: str = "local", languages: Optional[List[str]] = None, hf_token: Optional[str] = None, openai_key: Optional[str] = None) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    updated = store.build_ocr(emb, languages=languages)
    return {"updated": updated}


@app.post("/fast/build")
def api_build_fast(dir: str, kind: str = "faiss", trees: int = 50, provider: str = "local", hf_token: Optional[str] = None, openai_key: Optional[str] = None) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    ok = False
    if kind.lower() == 'faiss':
        ok = store.build_faiss()
    elif kind.lower() == 'hnsw':
        ok = store.build_hnsw()
    else:
        ok = store.build_annoy(trees=trees)
    return {"ok": ok, "kind": kind}


@app.post("/thumbs")
def api_build_thumbs(dir: str, size: int = 512, provider: str = "local", hf_token: Optional[str] = None, openai_key: Optional[str] = None) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    made = 0
    for sp, mt in zip(store.state.paths or [], store.state.mtimes or []):
        tp = get_or_create_thumb(store.index_dir, Path(sp), float(mt), size=size)
        if tp is not None:
            made += 1
    return {"made": made}


@app.get("/map")
def api_map(dir: str, limit: int = 1000) -> Dict[str, Any]:
    folder = Path(dir)
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
    return {"points": pts}


@app.get("/thumb")
def api_thumb(dir: str, path: str, provider: str = "local", size: int = 512, hf_token: Optional[str] = None, openai_key: Optional[str] = None):
    from fastapi.responses import FileResponse
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    try:
        idx_map = {sp: float(mt) for sp, mt in zip(store.state.paths or [], store.state.mtimes or [])}
        mtime = idx_map.get(path, 0.0)
        tp = get_or_create_thumb(store.index_dir, Path(path), float(mtime), size=size)
        if tp is None or not tp.exists():
            raise HTTPException(404, "Thumb not found")
        return FileResponse(str(tp))
    except Exception:
        raise HTTPException(404, "Thumb not found")




@app.post("/search_like")
def api_search_like(dir: str, path: str, top_k: int = 12, provider: str = "local", hf_token: Optional[str] = None, openai_key: Optional[str] = None) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    out = store.search_like(path, top_k=top_k)
    return {"results": [{"path": str(r.path), "score": float(r.score)} for r in out]}
@app.post("/open")
def api_open(dir: str, path: str) -> Dict[str, Any]:
    p = Path(path)
    if not p.exists():
        raise HTTPException(404, "File not found")
    import os as _os, platform as _pf
    try:
        sysname = _pf.system()
        if sysname == 'Darwin':
            _os.system(f"open -R '{p}'")
        elif sysname == 'Windows':
            _os.system(f"explorer /select, {str(p)}")
        else:
            _os.system(f"xdg-open '{p.parent}'")
    except Exception:
        pass
    return {"ok": True}


@app.post("/edit/ops")
def api_edit_ops(dir: str, path: str, rotate: int = 0, flip: Optional[str] = None, crop: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
    folder = Path(dir)
    p = Path(path)
    if not folder.exists() or not p.exists():
        raise HTTPException(400, "Folder or file not found")
    store = IndexStore(folder)
    ops = _EditOps(rotate=int(rotate or 0), flip=flip, crop=crop)
    out = _edit_apply_ops(store.index_dir, p, ops)
    return {"out_path": str(out)}


@app.post("/edit/upscale")
def api_edit_upscale(dir: str, path: str, scale: int = 2, engine: str = "pil") -> Dict[str, Any]:
    folder = Path(dir)
    p = Path(path)
    if not folder.exists() or not p.exists():
        raise HTTPException(400, "Folder or file not found")
    store = IndexStore(folder)
    out = _edit_upscale(store.index_dir, p, scale=scale, engine=engine)
    return {"out_path": str(out)}


@app.post("/export")
def api_export(dir: str, paths: List[str], dest: str, mode: str = "copy", strip_exif: bool = False, overwrite: bool = False) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    dest_dir = Path(dest).expanduser()
    try:
        dest_dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        raise HTTPException(400, "Cannot create destination")
    copied = 0; skipped = 0; errors = 0
    for sp in paths:
        src = Path(sp)
        if not src.exists():
            errors += 1; continue
        out = dest_dir / src.name
        if out.exists() and not overwrite:
            skipped += 1; continue
        try:
            if mode.lower() == 'symlink':
                try:
                    if out.exists(): out.unlink()
                    os.symlink(src, out)
                    copied += 1
                    continue
                except Exception:
                    pass
            if strip_exif:
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
    return {"ok": True, "copied": copied, "skipped": skipped, "errors": errors, "dest": str(dest_dir)}


@app.get("/diagnostics")
def api_diagnostics(dir: str, provider: Optional[str] = None, hf_token: Optional[str] = None, openai_key: Optional[str] = None) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    # If provider specified, report its index; else list indexes under .photo_index
    items: List[Dict[str, Any]] = []
    if provider:
        emb = _emb(provider, hf_token, openai_key)
        store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
        store.load()
        info = {"key": getattr(emb, 'index_id', 'default'), "index_dir": str(store.index_dir), "count": len(store.state.paths or [])}
        try:
            info["fast"] = {
                "annoy": bool(store.ann_status().get('exists')),
                "faiss": bool(store.faiss_status().get('exists')),
                "hnsw": bool(store.hnsw_status().get('exists')),
            }
        except Exception:
            info["fast"] = {"annoy": False, "faiss": False, "hnsw": False}
        items.append(info)
    else:
        base = folder / ".photo_index"
        if base.exists():
            for sub in base.iterdir():
                if not sub.is_dir():
                    continue
                p = sub / "paths.json"
                cnt = 0
                try:
                    import json
                    if p.exists():
                        data = json.loads(p.read_text())
                        cnt = len(data.get("paths", []))
                except Exception:
                    cnt = 0
                items.append({"key": sub.name, "index_dir": str(sub), "count": cnt})
    import shutil, platform
    free_gb = shutil.disk_usage(Path.home()).free / (1024**3)
    return {"folder": str(folder), "engines": items, "free_gb": round(free_gb, 1), "os": platform.system()}


# Workspace management (intent-first only)
from infra.workspace import load_workspace, save_workspace


@app.get("/workspace")
def api_workspace_list() -> Dict[str, Any]:
    return {"folders": load_workspace()}


@app.post("/workspace/add")
def api_workspace_add(path: str) -> Dict[str, Any]:
    ws = load_workspace()
    if path not in ws:
        ws.append(path)
        save_workspace(ws)
    return {"folders": ws}


@app.post("/workspace/remove")
def api_workspace_remove(path: str) -> Dict[str, Any]:
    ws = load_workspace()
    ws = [p for p in ws if p != path]
    save_workspace(ws)
    return {"folders": ws}


def _build_exif_index(index_dir: Path, paths: List[str]) -> Dict[str, Any]:
    from PIL import Image, ExifTags
    inv = {v: k for k, v in ExifTags.TAGS.items()}
    out = {"paths": [], "camera": [], "iso": [], "fnumber": [], "exposure": [], "focal": [], "width": [], "height": []}
    for sp in paths:
        p = Path(sp)
        cam = None; iso = None; fn = None; exp = None; foc = None; w=None; h=None
        try:
            with Image.open(p) as img:
                w, h = img.size
                ex = img._getexif() or {}
                cam = ex.get(inv.get('Model', -1))
                iso = ex.get(inv.get('ISOSpeedRatings', -1)) or ex.get(inv.get('PhotographicSensitivity', -1))
                fn = ex.get(inv.get('FNumber', -1))
                exp = ex.get(inv.get('ExposureTime', -1))
                foc = ex.get(inv.get('FocalLength', -1))
                def cv(v):
                    if isinstance(v, tuple) and len(v)==2 and all(isinstance(x,(int,float)) for x in v):
                        a,b=v; return float(a)/float(b) if b else None
                    return float(v) if isinstance(v,(int,float)) else None
                if isinstance(fn, tuple): fn = cv(fn)
                if isinstance(exp, tuple): exp = cv(exp)
                if isinstance(foc, tuple): foc = cv(foc)
                if isinstance(iso, (list, tuple)) and iso:
                    iso = int(iso[0])
                if isinstance(iso, (float,int)):
                    iso = int(iso)
                if isinstance(cam, bytes): cam = cam.decode(errors='ignore')
        except Exception:
            pass
        out["paths"].append(str(p)); out["camera"].append(cam); out["iso"].append(iso); out["fnumber"].append(fn); out["exposure"].append(exp); out["focal"].append(foc); out["width"].append(w); out["height"].append(h)
    (index_dir / 'exif_index.json').write_text(json.dumps(out))
    return out

@app.post("/metadata/build")
def api_build_metadata(dir: str, provider: str = "local", hf_token: Optional[str] = None, openai_key: Optional[str] = None) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    if not store.state.paths:
        return {"updated": 0}
    data = _build_exif_index(store.index_dir, store.state.paths)
    cams = sorted({c for c in data.get('camera',[]) if c})
    return {"updated": len(store.state.paths or []), "cameras": cams}

@app.get("/metadata")
def api_get_metadata(dir: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    p = store.index_dir / 'exif_index.json'
    if not p.exists():
        return {"cameras": []}
    try:
        data = json.loads(p.read_text())
        cams = sorted({c for c in data.get('camera',[]) if c})
        return {"cameras": cams}
    except Exception:
        return {"cameras": []}


@app.post("/autotag")
def api_autotag(dir: str, provider: str = "local", min_len: int = 4, max_tags_per_image: int = 8) -> Dict[str, Any]:
    """Derive simple tags from captions (if available) and add them to tags.json.
    Heuristic: split on non-letters, lowercase, drop stopwords/short tokens, keep unique tokens.
    """
    folder = Path(dir)
    emb = _emb(provider, None, None)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    cap_p = store.cap_texts_file
    if not cap_p.exists():
        return {"updated": 0}
    try:
        data = json.loads(cap_p.read_text())
        texts = {p: t for p, t in zip(data.get('paths', []), data.get('texts', []))}
    except Exception:
        texts = {}
    stop = set(['the','and','with','for','from','this','that','your','their','over','under','into','near','onto','are','is','of','to','a','an','in','on','by','at','it','its','as','be'])
    import re
    tmap = load_tags(store.index_dir)
    updated = 0
    for p, txt in texts.items():
        if not txt:
            continue
        toks = [w.lower() for w in re.split(r"[^A-Za-z]+", txt) if len(w)>=min_len and w.lower() not in stop]
        uniq = []
        for w in toks:
            if w and w not in uniq:
                uniq.append(w)
        if not uniq:
            continue
        cur = set(tmap.get(p, []))
        before = len(cur)
        for w in uniq[:max_tags_per_image]:
            cur.add(w)
        if len(cur) != before:
            tmap[p] = sorted(cur)
            updated += 1
    save_tags(store.index_dir, tmap)
    return {"updated": updated}
