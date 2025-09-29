from __future__ import annotations

import json
import logging
import os
import shutil
import platform
import time
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Optional, TypeVar

from fastapi import Body, FastAPI, HTTPException, Query, Header
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from datetime import datetime, timezone

from adapters.provider_factory import get_provider
from api.utils import _from_body, _require, _as_bool, _as_str_list, _emb, _zip_meta
from api.schemas.v1 import (
    SearchRequest,
    SearchResponse,
    SearchResultItem,
    TagsRequest,
    FavoritesRequest,
    ShareRequest,
    ShareRevokeRequest,
    CachedSearchRequest,
    WorkspaceSearchRequest,
    BaseResponse,
    SuccessResponse,
    IndexResponse,
    ShareResponse,
    FavoriteResponse,
    TagResponse,
    CollectionResponse,
    HealthResponse,
)
from api.exception_handlers import (
    custom_http_exception_handler,
    validation_exception_handler,
    general_exception_handler,
)
from api.v1.router import api_v1
from api.search_models import (
    SearchRequest as UnifiedSearchRequest,
    build_unified_request_from_flat,
    PaginatedSearchRequest,
    PaginatedSearchResponse,
)
from api.routers.analytics import router as analytics_router, legacy_router as analytics_legacy_router
from api.routers.auth import router as auth_router
from api.routers.indexing import router as indexing_router
from api.routers.config import router as config_router
from api.routers.tagging import router as tagging_router
from api.attention import router as attention_router  # NEW: adaptive attention (scaffold)
from api.routes.health import router as health_router  # Extracted health & root endpoints
from infra.analytics import log_search, _analytics_file, _write_event as _write_event_infra
from infra.collections import load_collections, save_collections, load_smart_collections, save_smart_collections
from infra.config import config
from infra.index_store import IndexStore
from infra.fast_index import FastIndexManager
from infra.tags import load_tags, save_tags, all_tags
from infra.trips import build_trips as _build_trips, load_trips as _load_trips
from infra.faces import (
    build_faces as _build_faces,
    list_clusters as _face_list,
    photos_for_person as _face_photos,
    set_cluster_name as _face_name,
)
from infra.shares import (
    create_share as _share_create,
    is_expired as _share_expired,
    list_shares as _share_list,
    load_share as _share_load,
    revoke_share as _share_revoke,
)
from infra.edits import EditOps as _EditOps, apply_ops as _edit_apply_ops, upscale as _edit_upscale
from usecases.manage_saved import load_saved, save_saved
from usecases.manage_presets import load_presets, save_presets
from usecases.index_photos import index_photos
from adapters.vlm_caption_hf import VlmCaptionHF
from infra.video_index_store import VideoIndexStore
from infra.thumbs import get_or_create_thumb, get_or_create_face_thumb
from infra.faces import load_faces as _faces_load
try:
    from adapters.video_processor import list_videos, get_video_metadata, extract_video_thumbnail
except Exception:
    # Fallback stubs if video processor adapter is optional
    def list_videos(root: Path) -> List[Path]:
        out: List[Path] = []
        for r, _, files in os.walk(root):
            for n in files:
                ext = Path(n).suffix.lower()
                if ext in SUPPORTED_VIDEO_EXTS:
                    out.append(Path(r) / n)
        return out
    def get_video_metadata(path: str) -> Dict[str, Any]:
        try:
            st = Path(path).stat()
            return {"mtime": st.st_mtime, "duration": None}
        except Exception:
            return {"mtime": 0.0, "duration": None}
    def extract_video_thumbnail(video_path: str, out_path: Path, when_sec: float = 0.0) -> bool:
        # No-op fallback: return False to indicate no thumbnail extracted
        return False
from PIL import Image, ExifTags

# Initialize app early (was missing due to prior broken edits)
_APP_START = time.time()
app = FastAPI(title="Photo Search API")

# Register global exception handlers
app.add_exception_handler(Exception, general_exception_handler)
app.add_exception_handler(HTTPException, custom_http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

# CORS for webapp/dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Mount newly extracted routers under /api
app.include_router(analytics_router)
app.include_router(indexing_router)
app.include_router(config_router)
app.include_router(attention_router)
app.include_router(health_router)

# Mount legacy routers for parity with original_server.py
app.include_router(analytics_legacy_router)
app.include_router(auth_router)
app.include_router(tagging_router)

# Mount versioned API router
app.include_router(api_v1)

# Mount static files for React app
web_dir = Path(__file__).parent / "web"
if web_dir.exists():
    app.mount("/app", StaticFiles(directory=str(web_dir), html=True), name="static")

T = TypeVar("T")


def _zip_meta(
    meta: Dict[str, Iterable[Any]],
    key: str,
    transform: Callable[[Any], T],
) -> Dict[str, T]:
    """Map values from the EXIF metadata index onto their paths with a transform."""

    paths = meta.get("paths") or []
    values = meta.get(key) or []
    result: Dict[str, T] = {}
    for path, raw in zip(paths, values):
        result[str(path)] = transform(raw)
    return result

# --- Health and diagnostics ---
@app.get("/health")
def api_health() -> HealthResponse:
    now = time.time()
    return HealthResponse(
        ok=True,
        uptime_seconds=max(0, int(now - _APP_START)),
    )

@app.get("/api/health")
def api_health_api() -> HealthResponse:
    return HealthResponse(ok=True)

@app.get("/api/ping")
def api_ping() -> HealthResponse:
    return HealthResponse(ok=True)

# Demo directory helper
@app.get("/demo/dir")
def api_demo_dir() -> BaseResponse:
    try:
        demo = Path(__file__).resolve().parent.parent / "demo_photos"
        exists = demo.exists() and demo.is_dir()
        return SuccessResponse(
            ok=True,
            data={"path": str(demo), "exists": bool(exists)}
        )
    except Exception:
        return BaseResponse(ok=False)

# Monitoring endpoints (allow unauthenticated in middleware)
@app.get("/monitoring")
def api_monitoring_get() -> Dict[str, Any]:
    return {"ok": True, "status": "up"}

@app.post("/monitoring")
def api_monitoring_post(payload: Optional[Dict[str, Any]] = Body(None)) -> Dict[str, Any]:
    return {"ok": True, "received": bool(payload is not None)}

@app.get("/api/monitoring")
def api_monitoring_api_get() -> Dict[str, Any]:
    return {"ok": True}

@app.post("/api/monitoring")
def api_monitoring_api_post(payload: Optional[Dict[str, Any]] = Body(None)) -> Dict[str, Any]:
    return {"ok": True, "received": bool(payload is not None)}

# Root: return 200 with minimal payload to satisfy health checks/tests
@app.get("/")
def api_root() -> Dict[str, Any]:
    return {"ok": True, "message": "Photo Search API", "app_path": "/app/"}

# Small helpers used by several legacy endpoints
def _normcase_path(p: str) -> str:
    try:
        return str(Path(p).expanduser().resolve()).lower()
    except Exception:
        return str(p).lower()


def _default_photo_dir_candidates() -> List[Dict[str, str]]:
    """Best-effort local photo folder suggestions across OSes."""
    out: List[Dict[str, str]] = []
    home = Path.home()
    sysname = (os.uname().sysname if hasattr(os, 'uname') else os.name).lower()
    def _add(p: Path, label: str, source: str):
        try:
            if p.exists() and p.is_dir():
                out.append({"path": str(p), "label": label, "source": source})
        except Exception:
            pass
    # Common directories
    _add(home / "Pictures", "Pictures", "home")
    _add(home / "Downloads", "Downloads", "home")
    # Windows-like envs
    one_drive_env = os.environ.get("OneDrive")
    if one_drive_env:
        _add(Path(one_drive_env) / "Pictures", "OneDrive Pictures", "onedrive")
    public_dir = os.environ.get("PUBLIC")
    if public_dir:
        _add(Path(public_dir) / "Pictures", "Public Pictures", "windows")
    # macOS iCloud hints
    if "darwin" in sysname:
        icloud_docs = home / "Library" / "Mobile Documents" / "com~apple~CloudDocs"
        _add(icloud_docs / "Photos", "iCloud Drive Photos", "icloud")
        _add(icloud_docs / "Pictures", "iCloud Drive Pictures", "icloud")
        _add(home / "Library" / "CloudStorage" / "iCloud Drive" / "Photos", "iCloud Photos", "icloud")
    # Linux XDG
    if "linux" in sysname:
        try:
            user_dirs = home / ".config" / "user-dirs.dirs"
            if user_dirs.exists():
                text = user_dirs.read_text(encoding="utf-8")
                for line in text.splitlines():
                    if line.startswith("XDG_PICTURES_DIR") or line.startswith("XDG_DOWNLOAD_DIR"):
                        parts = line.split("=")
                        if len(parts) == 2:
                            raw = parts[1].strip().strip('"')
                            resolved = raw.replace("$HOME", str(home))
                            label = "Pictures" if "PICTURES" in parts[0] else "Downloads"
                            _add(Path(resolved), label, "xdg")
        except Exception:
            pass
    # Deduplicate by normalized path
    seen: set[str] = set()
    uniq: List[Dict[str, str]] = []
    for it in out:
        key = _normcase_path(it["path"])
        if key in seen:
            continue
        seen.add(key)
        uniq.append(it)
    return uniq


def _scan_media_counts(paths: List[str], include_videos: bool = True) -> Dict[str, Any]:
    """Count image/video files and bytes for quick previews; privacy-friendly."""
    total_files = 0
    total_bytes = 0
    items: List[Dict[str, Any]] = []
    img_exts = SUPPORTED_EXTS
    vid_exts = SUPPORTED_VIDEO_EXTS if include_videos else set()
    for p in paths:
        pth = Path(p).expanduser()
        count = 0
        size = 0
        try:
            if pth.exists() and pth.is_dir():
                for root, _, files in os.walk(pth):
                    for name in files:
                        ext = Path(name).suffix.lower()
                        if ext in img_exts or ext in vid_exts:
                            count += 1
                            try:
                                size += (Path(root) / name).stat().st_size
                            except Exception:
                                continue
        except Exception:
            count = 0; size = 0
        total_files += count
        total_bytes += size
        items.append({"path": str(pth), "count": count, "bytes": size})
    return {"items": items, "total_files": total_files, "total_bytes": total_bytes}
@app.post("/search")
def api_search(req: SearchRequest) -> SearchResponse:
    """Search for photos using semantic similarity and advanced filtering.

    Migration note: This endpoint is being refactored to use the unified
    ``UnifiedSearchRequest`` model. For now we construct the unified model and
    then operate directly on it (rather than duplicating per-field *_value
    variables). A legacy dict bridge is retained temporarily for any code that
    still expects the old flat names; this will be removed once downstream
    helpers are updated.
    """

    # Build unified request (robust to unexpected legacy fields)
    try:
        unified_req = UnifiedSearchRequest.from_query_params(req.dict(by_alias=True))
    except Exception:
        # Fallback: wrap the original (should be rare); still proceed to avoid regression
        unified_req = UnifiedSearchRequest(
            directory=req.dir,
            query=req.query,
            top_k=req.top_k,
            provider=req.provider or "local",
            hf_token=req.hf_token,
            openai_key=req.openai_key,
            use_fast=req.use_fast,
            fast_kind=req.fast_kind,
            use_captions=req.use_captions,
            use_ocr=req.use_ocr,
            favorites_only=req.favorites_only,
            tags=req.tags,
            date_from=req.date_from,
            date_to=req.date_to,
            camera=req.camera,
            iso_min=req.iso_min,
            iso_max=req.iso_max,
            f_min=req.f_min,
            f_max=req.f_max,
            flash=req.flash,
            wb=req.wb,
            metering=req.metering,
            alt_min=req.alt_min,
            alt_max=req.alt_max,
            heading_min=req.heading_min,
            heading_max=req.heading_max,
            place=req.place,
            has_text=req.has_text,
            person=req.person,
            persons=req.persons,
            sharp_only=req.sharp_only,
            exclude_underexp=req.exclude_underexp,
            exclude_overexp=req.exclude_overexp,
        )

    # Temporary bridge (parity / potential logging)
    # legacy_params = unified_req.to_legacy_param_dict()  # noqa: E800 (uncomment for debugging parity)

    legacy_params = unified_req.to_legacy_param_dict()

    dir_value = legacy_params.get("dir")
    query_value = legacy_params.get("query")
    top_k_value = legacy_params.get("top_k", 48)
    provider_value = legacy_params.get("provider") or "local"
    hf_token_value = legacy_params.get("hf_token")
    openai_key_value = legacy_params.get("openai_key")
    use_fast_value = bool(legacy_params.get("use_fast"))
    fast_kind_value = legacy_params.get("fast_kind")
    use_captions_value = bool(legacy_params.get("use_captions"))
    use_ocr_value = bool(legacy_params.get("use_ocr"))
    favorites_only_value = bool(legacy_params.get("favorites_only"))
    tags_value = legacy_params.get("tags") or []
    date_from_value = legacy_params.get("date_from")
    date_to_value = legacy_params.get("date_to")
    camera_value = legacy_params.get("camera")
    iso_min_value = legacy_params.get("iso_min")
    iso_max_value = legacy_params.get("iso_max")
    f_min_value = legacy_params.get("f_min")
    f_max_value = legacy_params.get("f_max")
    flash_value = legacy_params.get("flash")
    wb_value = legacy_params.get("wb")
    metering_value = legacy_params.get("metering")
    alt_min_value = legacy_params.get("alt_min")
    alt_max_value = legacy_params.get("alt_max")
    heading_min_value = legacy_params.get("heading_min")
    heading_max_value = legacy_params.get("heading_max")
    place_value = legacy_params.get("place")
    has_text_value = legacy_params.get("has_text")
    person_value = legacy_params.get("person")
    persons_value = legacy_params.get("persons")
    sharp_only_value = legacy_params.get("sharp_only")
    exclude_under_value = legacy_params.get("exclude_underexp")
    exclude_over_value = legacy_params.get("exclude_overexp")

    # Validate directory
    if not dir_value:
        raise HTTPException(400, "Directory path is required")

    folder = Path(dir_value).expanduser().resolve()

    # Check if folder exists and is accessible
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    if not folder.is_dir():
        raise HTTPException(400, "Path is not a directory")

    try:
        # Test if we can read the directory
        next(folder.iterdir(), None)
    except PermissionError:
        raise HTTPException(403, "Permission denied to access folder")
    except Exception as e:
        raise HTTPException(400, f"Cannot access folder: {str(e)}")

    emb = _emb(provider_value, hf_token_value, openai_key_value)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()

    # Initialize metadata maps to avoid NameErrors in later logic
    cam_map: Dict[str, str] = {}
    place_map: Dict[str, str] = {}
    wb_map: Dict[str, Optional[int]] = {}
    met_map: Dict[str, Optional[int]] = {}
    iso_map: Dict[str, Optional[int]] = {}
    f_map: Dict[str, Optional[float]] = {}
    flash_map: Dict[str, Optional[int]] = {}
    alt_map: Dict[str, Optional[float]] = {}
    head_map: Dict[str, Optional[float]] = {}
    sharp_map: Dict[str, Optional[float]] = {}
    bright_map: Dict[str, Optional[float]] = {}

    # Primary semantic search
    fast_meta = None
    if use_fast_value:
        fim = FastIndexManager(store)
        try:
            results, fast_meta = fim.search(emb, query_value, top_k=top_k_value, use_fast=True, fast_kind_hint=fast_kind_value)
        except Exception:
            results = store.search(emb, query_value, top_k_value)
    else:
        if use_captions_value and store.captions_available():
            results = store.search_with_captions(emb, query_value, top_k_value)
        elif use_ocr_value and store.ocr_available():
            results = store.search_with_ocr(emb, query_value, top_k_value)
        else:
            results = store.search(emb, query_value, top_k_value)

    out = results

    # Favorites filter
    if favorites_only_value:
        try:
            coll = load_collections(store.index_dir)
            favs = set(coll.get('Favorites', []))
            out = [r for r in out if str(r.path) in favs]
        except Exception:
            pass

    # Tags filter
    if tags_value:
        try:
            tmap = load_tags(store.index_dir)
            req_tags = set(tags_value)
            out = [r for r in out if req_tags.issubset(set(tmap.get(str(r.path), [])))]
        except Exception:
            pass

    # People filter
    try:
        if persons_value and isinstance(persons_value, list) and len(persons_value) > 0:
            sets: List[set] = []
            for nm in persons_value:
                try:
                    sets.append(set(_face_photos(store.index_dir, str(nm))))
                except Exception:
                    sets.append(set())
            if sets:
                inter = set.intersection(*sets) if len(sets) > 1 else sets[0]
                out = [r for r in out if str(r.path) in inter]
        elif person_value:
            ppl = set(_face_photos(store.index_dir, str(person_value)))
            out = [r for r in out if str(r.path) in ppl]
    except Exception:
        pass

    # Date range filter
    if date_from_value is not None and date_to_value is not None:
        try:
            mmap = {
                sp: float(mt)
                for sp, mt in zip(store.state.paths or [], store.state.mtimes or [])
            }
            out = [
                r
                for r in out
                if date_from_value <= mmap.get(str(r.path), 0.0) <= date_to_value
            ]
        except Exception:
            pass

    # EXIF and quality filters
    try:
        meta_p = store.index_dir / 'exif_index.json'
        if meta_p.exists() and any([
            camera_value,
            iso_min_value is not None, iso_max_value is not None,
            f_min_value is not None, f_max_value is not None,
            place_value,
            flash_value, wb_value, metering_value,
            alt_min_value is not None, alt_max_value is not None,
            heading_min_value is not None, heading_max_value is not None,
        ]):
            m = json.loads(meta_p.read_text())
            cam_map = {
                p: (c or '')
                for p, c in zip(m.get('paths', []), m.get('camera', []))
            }
            iso_map = {
                p: (i if isinstance(i, int) else None)
                for p, i in zip(m.get('paths', []), m.get('iso', []))
            }
            f_map = {
                p: (float(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('fnumber', []))
            }
            place_map = {
                p: (s or '')
                for p, s in zip(m.get('paths', []), m.get('place', []))
            }
            flash_map = {
                p: (int(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('flash', []))
            }
            wb_map = {
                p: (int(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('white_balance', []))
            }
            met_map = {
                p: (int(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('metering', []))
            }
            alt_map = {
                p: (float(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('gps_altitude', []))
            }
            head_map = {
                p: (float(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('gps_heading', []))
            }
            sharp_map = {
                p: (float(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('sharpness', []))
            }
            bright_map = {
                p: (float(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('brightness', []))
            }

            def _matches_meta(p: str) -> bool:
                if camera_value and camera_value.strip():
                    if camera_value.strip().lower() not in (cam_map.get(p,'') or '').lower():
                        return False
                if iso_min_value is not None:
                    v = iso_map.get(p)
                    if v is None or v < int(iso_min_value):
                        return False
                if iso_max_value is not None:
                    v = iso_map.get(p)
                    if v is None or v > int(iso_max_value):
                        return False
                if f_min_value is not None:
                    v = f_map.get(p)
                    if v is None or v < float(f_min_value):
                        return False
                if f_max_value is not None:
                    v = f_map.get(p)
                    if v is None or v > float(f_max_value):
                        return False
                if place_value and place_value.strip():
                    if place_value.strip().lower() not in (place_map.get(p,'') or '').lower():
                        return False
                if flash_value:
                    fv = flash_map.get(p)
                    if fv is None:
                        return False
                    fired = 1 if fv & 1 else 0
                    if flash_value == 'fired' and fired != 1:
                        return False
                    if flash_value in ('no','noflash') and fired != 0:
                        return False
                if wb_value:
                    wv = wb_map.get(p)
                    if wv is None:
                        return False
                    if wb_value == 'auto' and wv != 0:
                        return False
                    if wb_value == 'manual' and wv != 1:
                        return False
                if metering_value:
                    mv = met_map.get(p)
                    if mv is None:
                        return False
                    name = str(metering_value).lower()
                    mm = {0: 'unknown', 1: 'average', 2: 'center', 3: 'spot', 4: 'multispot', 5: 'pattern', 6: 'partial', 255: 'other'}
                    label = mm.get(int(mv), 'other')
                    if name not in (label, 'any'):
                        if not (name == 'matrix' and label == 'pattern'):
                            return False
                if alt_min_value is not None or alt_max_value is not None:
                    av = alt_map.get(p)
                    if av is None:
                        return False
                    if alt_min_value is not None and av < float(alt_min_value):
                        return False
                    if alt_max_value is not None and av > float(alt_max_value):
                        return False
                if heading_min_value is not None or heading_max_value is not None:
                    hv = head_map.get(p)
                    if hv is None:
                        return False
                    try:
                        hh = float(hv) % 360.0
                    except Exception:
                        hh = hv
                    if heading_min_value is not None and hh < float(heading_min_value):
                        return False
                    if heading_max_value is not None and hh > float(heading_max_value):
                        return False
                if sharp_only_value:
                    sv = sharp_map.get(p)
                    if sv is None or sv < 60.0:
                        return False
                if exclude_under_value:
                    bv = bright_map.get(p)
                    if bv is not None and bv < 50.0:
                        return False
                if exclude_over_value:
                    bv = bright_map.get(p)
                    if bv is not None and bv > 205.0:
                        return False
                return True

            out = [r for r in out if _matches_meta(str(r.path))]
    except Exception:
        pass

    # OCR and quoted text filters
    try:
        texts_map: Dict[str, str] = {}
        if hasattr(store, 'ocr_texts_file') and store.ocr_texts_file.exists():
            d = json.loads(store.ocr_texts_file.read_text())
            texts_map = {p: (t or '') for p, t in zip(d.get('paths', []), d.get('texts', []))}
        if has_text_value:
            out = [r for r in out if (texts_map.get(str(r.path), '').strip() != '')]
        import re as _re
        d_parts = _re.findall(r'"([^"]+)"', query_value)
        s_parts = _re.findall(r"'([^']+)'", query_value)
        req = (d_parts or []) + (s_parts or [])
        if req:
            low = {p: texts_map.get(p, '').lower() for p in texts_map.keys()}
            def _has_all(pth: str) -> bool:
                s = low.get(pth, '')
                return all(x.lower() in s for x in req)
            out = [r for r in out if _has_all(str(r.path))]
    except Exception:
        pass

    # Captions and expression filters
    try:
        cap_map: Dict[str, str] = {}
        if store.captions_available() and store.captions_file.exists():
            cd = json.loads(store.captions_file.read_text())
            cap_map = {p: (t or '') for p, t in zip(cd.get('paths', []), cd.get('texts', []))}
        if cap_map:
            import shlex
            tokens = shlex.split(query_value)
            if tokens:
                out_q: List[str] = []
                op_set = {'AND','OR','NOT'}
                for tok in tokens:
                    tu = tok.upper()
                    if tu in op_set:
                        out_q.append(tu)
                    elif tok in ('(', ')'):
                        out_q.append(tok)
                    else:
                        out_q.append(tok)
                precedence = {'NOT': 3, 'AND': 2, 'OR': 1}
                output: List[str] = []
                stack: List[str] = []
                for tok in out_q:
                    tu = tok.upper()
                    if tu in op_set:
                        while stack and stack[-1] != '(' and precedence.get(stack[-1], 0) >= precedence[tu]:
                            output.append(stack.pop())
                        stack.append(tu)
                    elif tok == '(':
                        stack.append(tok)
                    elif tok == ')':
                        while stack and stack[-1] != '(':
                            output.append(stack.pop())
                        if stack and stack[-1] == '(':
                            stack.pop()
                    else:
                        output.append(tok)
                while stack:
                    output.append(stack.pop())
                out_q = output
                tags_map: Dict[str, List[str]] = {}
                try:
                    tags_map = load_tags(store.index_dir)
                except Exception:
                    pass
                person_cache: Dict[str, set] = {}
                cap_texts = cap_map
                texts_map_local = {}
                try:
                    d = json.loads(store.ocr_texts_file.read_text()) if hasattr(store, 'ocr_texts_file') and store.ocr_texts_file.exists() else {}
                    texts_map_local = {p: (t or '') for p, t in zip(d.get('paths', []), d.get('texts', []))}
                except Exception:
                    pass
                # Removed unused meta_maps assignment (was never referenced)
                # meta_maps: Dict[str, Dict[str, Optional[float]]] = {}
                mt_map: Dict[str, float] = {p: float(mt) for p, mt in zip(store.state.paths or [], store.state.mtimes or [])}
                iso_map_local: Dict[str, Optional[int]] = {}
                f_map_local: Dict[str, Optional[float]] = {}
                w_map: Dict[str, Optional[int]] = {}
                h_map: Dict[str, Optional[int]] = {}
                bright_map_local: Dict[str, Optional[float]] = {}
                sharp_map_local: Dict[str, Optional[float]] = {}
                exp_map: Dict[str, Optional[float]] = {}
                focal_map: Dict[str, Optional[float]] = {}
                try:
                    meta_p = store.index_dir / 'exif_index.json'
                    if meta_p.exists():
                        m = json.loads(meta_p.read_text())
                        iso_map_local = {p: (i if isinstance(i,int) else None) for p, i in zip(m.get('paths',[]), m.get('iso',[]))}
                        f_map_local = {p: (float(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('fnumber',[]))}
                        w_map = {p: (int(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('width',[]))}
                        h_map = {p: (int(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('height',[]))}
                        bright_map_local = {p: (float(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('brightness',[]))}
                        sharp_map_local = {p: (float(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('sharpness',[]))}
                        def _cv(v):
                            try:
                                if isinstance(v, (list, tuple)) and len(v) == 2:
                                    a, b = v
                                    return float(a) / float(b) if b else None
                                if isinstance(v, str) and '/' in v:
                                    a, b = v.split('/', 1)
                                    return float(a) / float(b)
                                return float(v) if isinstance(v, (int, float)) else None
                            except Exception:
                                return None
                        exp_map = {p: _cv(x) for p, x in zip(m.get('paths',[]), m.get('exposure',[]))}
                        focal_map = {p: _cv(x) for p, x in zip(m.get('paths',[]), m.get('focal',[]))}
                except Exception:
                    pass
                def doc_text(pth: str) -> str:
                    name = Path(pth).name
                    return f"{cap_texts.get(pth,'')}\n{texts_map_local.get(pth,'')}\n{name}".lower()
                def eval_field(tok: str, pth: str) -> bool:
                    if ':' not in tok:
                        return tok.lower() in doc_text(pth)
                    try:
                        field, val = tok.split(':', 1)
                        fv = (val or '').strip().strip('"').strip("'")
                        field = field.lower()
                        lp = pth
                        def parse_num_op(s: str):
                            opers = ['>=','<=','>','<','=']
                            for op in opers:
                                if s.startswith(op):
                                    rest = s[len(op):].strip()
                                    try:
                                        return op, float(rest)
                                    except Exception:
                                        return op, None
                            try:
                                return '=', float(s)
                            except Exception:
                                return None, None
                        if field == 'camera':
                            return fv.lower() in (cam_map.get(lp,'') or '').lower()
                        if field == 'place':
                            return fv.lower() in (place_map.get(lp,'') or '').lower()
                        if field == 'tag':
                            return fv in (tags_map.get(lp, []) or [])
                        if field == 'rating':
                            return f"rating:{fv}" in (tags_map.get(lp, []) or [])
                        if field == 'person':
                            key = fv
                            if key not in person_cache:
                                try:
                                    person_cache[key] = set(_face_photos(store.index_dir, key))
                                except Exception:
                                    person_cache[key] = set()
                            return lp in person_cache.get(key, set())
                        if field == 'has_text':
                            if fv == '' or fv.lower() in ('1','true','yes','y'):
                                return (texts_map_local.get(lp,'').strip() != '')
                            return (texts_map_local.get(lp,'').strip() == '')
                        if field in ('iso','fnumber','width','height','mtime','brightness','sharpness','exposure','focal','duration'):
                            op, num = parse_num_op(fv)
                            if num is None or op is None:
                                return False
                            cur = None
                            if field == 'iso':
                                cur = iso_map_local.get(lp)
                            elif field == 'fnumber':
                                cur = f_map_local.get(lp)
                            elif field == 'width':
                                cur = w_map.get(lp)
                            elif field == 'height':
                                cur = h_map.get(lp)
                            elif field == 'mtime':
                                cur = mt_map.get(lp)
                            elif field == 'brightness':
                                cur = bright_map_local.get(lp)
                            elif field == 'sharpness':
                                cur = sharp_map_local.get(lp)
                            elif field == 'exposure':
                                cur = exp_map.get(lp)
                            elif field == 'focal':
                                cur = focal_map.get(lp)
                            elif field == 'duration':
                                ext = str(Path(lp).suffix or '').lower()
                                if ext in ('.mp4','.mov','.mkv','.avi','.webm'):
                                    try:
                                        from adapters.video_processor import get_video_metadata as _gvm
                                        info = _gvm(Path(lp)) or {}
                                        cur = float(info.get('duration') or 0.0)
                                    except Exception:
                                        cur = None
                                else:
                                    cur = None
                            try:
                                if cur is None:
                                    return False
                                cv = float(cur)
                                if op == '>=':
                                    return cv >= num
                                if op == '<=':
                                    return cv <= num
                                if op == '>':
                                    return cv > num
                                if op == '<':
                                    return cv < num
                                if op == '=':
                                    return abs(cv - num) < 1e-6
                                return False
                            except Exception:
                                return False

                        if field == 'filetype':
                            ext = (Path(lp).suffix or '').lower().lstrip('.')
                            return ext == fv.lower()
                        return fv.lower() in doc_text(pth)
                    except Exception:
                        return False
                def eval_rpn(pth: str) -> bool:
                    stack: List[bool] = []
                    for tok in out_q:
                        tu = tok.upper()
                        if tu == 'NOT':
                            v = stack.pop() if stack else False
                            stack.append(not v)
                        elif tu in ('AND','OR'):
                            b = stack.pop() if stack else False
                            a = stack.pop() if stack else False
                            stack.append((a and b) if tu == 'AND' else (a or b))
                        else:
                            stack.append(eval_field(tok, pth))
                    return bool(stack[-1]) if stack else True
                out = [r for r in out if eval_rpn(str(r.path))]
    except Exception:
        pass

    # Apply pagination
    total = len(out)
    paginated_results = out[offset_value:offset_value + limit_value]

    sid = log_search(store.index_dir, getattr(emb, 'index_id', 'default'), search_req.query, [(str(r.path), float(r.score)) for r in out])

    return {
        "search_id": sid,
        "results": [{"path": str(r.path), "score": float(r.score)} for r in paginated_results],
        "pagination": {
            "offset": offset_value,
            "limit": limit_value,
            "total": total,
            "has_more": offset_value + limit_value < total
        }
    }


# Video Search API
@app.post("/search_video")
def api_search_video(
    dir: Optional[str] = None,
    query: Optional[str] = None,
    top_k: Optional[int] = None,
    provider: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Search for videos using semantic search on extracted metadata and keyframes."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    query_value = _require(_from_body(body, query, "query"), "query")
    top_k_value = _from_body(body, top_k, "top_k", default=12, cast=lambda v: int(v)) or 12
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    # Get video index store
    video_store = VideoIndexStore(folder)
    if not video_store.load():
        return {"results": []}

    # Embed query
    emb = _emb(provider_value, hf_token_value, openai_key_value)
    try:
        qv = emb.embed_text(query_value)
    except Exception:
        raise HTTPException(500, "Embedding failed")

    # Search in video store
    results = video_store.search(qv, top_k=top_k_value)

    return {"results": [{"path": r.path, "score": float(r.score)} for r in results]}


@app.post("/search_video_like")
def api_search_video_like(
    dir: Optional[str] = None,
    path: Optional[str] = None,
    top_k: Optional[int] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Find visually similar videos based on a reference video.

    Provider / token parameters were unused; removed to reduce noise. If future
    embedding-based re-ranking is added we can reintroduce via unified schema.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    path_value = _require(_from_body(body, path, "path"), "path")
    top_k_value = _from_body(body, top_k, "top_k", default=12, cast=lambda v: int(v)) or 12

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    video_store = VideoIndexStore(folder)
    if not video_store.load():
        return {"results": []}

    results = video_store.search_like(path_value, top_k=top_k_value)
    return {"results": [{"path": r.path, "score": float(r.score)} for r in results]}


# Removed duplicated health/root/monitoring/tech endpoints now handled by api.routes.health router

# Demo directory helper
@app.get("/demo/dir")
def api_demo_dir() -> BaseResponse:
    try:
        demo = Path(__file__).resolve().parent.parent / "demo_photos"
        exists = demo.exists() and demo.is_dir()
        return SuccessResponse(
            ok=True,
            data={"path": str(demo), "exists": bool(exists)}
        )
    except Exception:
        return BaseResponse(ok=False)

# Small helpers used by several legacy endpoints
def _normcase_path(p: str) -> str:
    try:
        return str(Path(p).expanduser().resolve()).lower()
    except Exception:
        return str(p).lower()


def _default_photo_dir_candidates() -> List[Dict[str, str]]:
    """Best-effort local photo folder suggestions across OSes."""
    out: List[Dict[str, str]] = []
    home = Path.home()
    sysname = (os.uname().sysname if hasattr(os, 'uname') else os.name).lower()
    def _add(p: Path, label: str, source: str):
        try:
            if p.exists() and p.is_dir():
                out.append({"path": str(p), "label": label, "source": source})
        except Exception:
            pass
    # Common directories
    _add(home / "Pictures", "Pictures", "home")
    _add(home / "Downloads", "Downloads", "home")
    # Windows-like envs
    one_drive_env = os.environ.get("OneDrive")
    if one_drive_env:
        _add(Path(one_drive_env) / "Pictures", "OneDrive Pictures", "onedrive")
    public_dir = os.environ.get("PUBLIC")
    if public_dir:
        _add(Path(public_dir) / "Pictures", "Public Pictures", "windows")
    # macOS iCloud hints
    if "darwin" in sysname:
        icloud_docs = home / "Library" / "Mobile Documents" / "com~apple~CloudDocs"
        _add(icloud_docs / "Photos", "iCloud Drive Photos", "icloud")
        _add(icloud_docs / "Pictures", "iCloud Drive Pictures", "icloud")
        _add(home / "Library" / "CloudStorage" / "iCloud Drive" / "Photos", "iCloud Photos", "icloud")
    # Linux XDG
    if "linux" in sysname:
        try:
            user_dirs = home / ".config" / "user-dirs.dirs"
            if user_dirs.exists():
                text = user_dirs.read_text(encoding="utf-8")
                for line in text.splitlines():
                    if line.startswith("XDG_PICTURES_DIR") or line.startswith("XDG_DOWNLOAD_DIR"):
                        parts = line.split("=")
                        if len(parts) == 2:
                            raw = parts[1].strip().strip('"')
                            resolved = raw.replace("$HOME", str(home))
                            label = "Pictures" if "PICTURES" in parts[0] else "Downloads"
                            _add(Path(resolved), label, "xdg")
        except Exception:
            pass
    # Deduplicate by normalized path
    seen: set[str] = set()
    uniq: List[Dict[str, str]] = []
    for it in out:
        key = _normcase_path(it["path"])
        if key in seen:
            continue
        seen.add(key)
        uniq.append(it)
    return uniq


def _scan_media_counts(paths: List[str], include_videos: bool = True) -> Dict[str, Any]:
    """Count image/video files and bytes for quick previews; privacy-friendly."""
    total_files = 0
    total_bytes = 0
    items: List[Dict[str, Any]] = []
    img_exts = SUPPORTED_EXTS
    vid_exts = SUPPORTED_VIDEO_EXTS if include_videos else set()
    for p in paths:
        pth = Path(p).expanduser()
        count = 0
        size = 0
        try:
            if pth.exists() and pth.is_dir():
                for root, _, files in os.walk(pth):
                    for name in files:
                        ext = Path(name).suffix.lower()
                        if ext in img_exts or ext in vid_exts:
                            count += 1
                            try:
                                size += (Path(root) / name).stat().st_size
                            except Exception:
                                continue
        except Exception:
            count = 0; size = 0
        total_files += count
        total_bytes += size
        items.append({"path": str(pth), "count": count, "bytes": size})
    return {"items": items, "total_files": total_files, "total_bytes": total_bytes}
@app.post("/search")
def api_search(req: SearchRequest) -> SearchResponse:
    """Search for photos using semantic similarity and advanced filtering.

    Migration note: This endpoint is being refactored to use the unified
    ``UnifiedSearchRequest`` model. For now we construct the unified model and
    then operate directly on it (rather than duplicating per-field *_value
    variables). A legacy dict bridge is retained temporarily for any code that
    still expects the old flat names; this will be removed once downstream
    helpers are updated.
    """

    # Build unified request (robust to unexpected legacy fields)
    try:
        unified_req = UnifiedSearchRequest.from_query_params(req.dict(by_alias=True))
    except Exception:
        # Fallback: wrap the original (should be rare); still proceed to avoid regression
        unified_req = UnifiedSearchRequest(
            directory=req.dir,
            query=req.query,
            top_k=req.top_k,
            provider=req.provider or "local",
            hf_token=req.hf_token,
            openai_key=req.openai_key,
            use_fast=req.use_fast,
            fast_kind=req.fast_kind,
            use_captions=req.use_captions,
            use_ocr=req.use_ocr,
            favorites_only=req.favorites_only,
            tags=req.tags,
            date_from=req.date_from,
            date_to=req.date_to,
            camera=req.camera,
            iso_min=req.iso_min,
            iso_max=req.iso_max,
            f_min=req.f_min,
            f_max=req.f_max,
            flash=req.flash,
            wb=req.wb,
            metering=req.metering,
            alt_min=req.alt_min,
            alt_max=req.alt_max,
            heading_min=req.heading_min,
            heading_max=req.heading_max,
            place=req.place,
            has_text=req.has_text,
            person=req.person,
            persons=req.persons,
            sharp_only=req.sharp_only,
            exclude_underexp=req.exclude_underexp,
            exclude_overexp=req.exclude_overexp,
        )

    # Temporary bridge (parity / potential logging)
    # legacy_params = unified_req.to_legacy_param_dict()  # noqa: E800 (uncomment for debugging parity)

    legacy_params = unified_req.to_legacy_param_dict()

    dir_value = legacy_params.get("dir")
    query_value = legacy_params.get("query")
    top_k_value = legacy_params.get("top_k", 48)
    provider_value = legacy_params.get("provider") or "local"
    hf_token_value = legacy_params.get("hf_token")
    openai_key_value = legacy_params.get("openai_key")
    use_fast_value = bool(legacy_params.get("use_fast"))
    fast_kind_value = legacy_params.get("fast_kind")
    use_captions_value = bool(legacy_params.get("use_captions"))
    use_ocr_value = bool(legacy_params.get("use_ocr"))
    favorites_only_value = bool(legacy_params.get("favorites_only"))
    tags_value = legacy_params.get("tags") or []
    date_from_value = legacy_params.get("date_from")
    date_to_value = legacy_params.get("date_to")
    camera_value = legacy_params.get("camera")
    iso_min_value = legacy_params.get("iso_min")
    iso_max_value = legacy_params.get("iso_max")
    f_min_value = legacy_params.get("f_min")
    f_max_value = legacy_params.get("f_max")
    flash_value = legacy_params.get("flash")
    wb_value = legacy_params.get("wb")
    metering_value = legacy_params.get("metering")
    alt_min_value = legacy_params.get("alt_min")
    alt_max_value = legacy_params.get("alt_max")
    heading_min_value = legacy_params.get("heading_min")
    heading_max_value = legacy_params.get("heading_max")
    place_value = legacy_params.get("place")
    has_text_value = legacy_params.get("has_text")
    person_value = legacy_params.get("person")
    persons_value = legacy_params.get("persons")
    sharp_only_value = legacy_params.get("sharp_only")
    exclude_under_value = legacy_params.get("exclude_underexp")
    exclude_over_value = legacy_params.get("exclude_overexp")

    # Validate directory
    if not dir_value:
        raise HTTPException(400, "Directory path is required")

    folder = Path(dir_value).expanduser().resolve()

    # Check if folder exists and is accessible
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    if not folder.is_dir():
        raise HTTPException(400, "Path is not a directory")

    try:
        # Test if we can read the directory
        next(folder.iterdir(), None)
    except PermissionError:
        raise HTTPException(403, "Permission denied to access folder")
    except Exception as e:
        raise HTTPException(400, f"Cannot access folder: {str(e)}")

    emb = _emb(provider_value, hf_token_value, openai_key_value)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()

    # Initialize metadata maps to avoid NameErrors in later logic
    cam_map: Dict[str, str] = {}
    place_map: Dict[str, str] = {}
    wb_map: Dict[str, Optional[int]] = {}
    met_map: Dict[str, Optional[int]] = {}
    iso_map: Dict[str, Optional[int]] = {}
    f_map: Dict[str, Optional[float]] = {}
    flash_map: Dict[str, Optional[int]] = {}
    alt_map: Dict[str, Optional[float]] = {}
    head_map: Dict[str, Optional[float]] = {}
    sharp_map: Dict[str, Optional[float]] = {}
    bright_map: Dict[str, Optional[float]] = {}

    # Primary semantic search
    fast_meta = None
    if use_fast_value:
        fim = FastIndexManager(store)
        try:
            results, fast_meta = fim.search(emb, query_value, top_k=top_k_value, use_fast=True, fast_kind_hint=fast_kind_value)
        except Exception:
            results = store.search(emb, query_value, top_k_value)
    else:
        if use_captions_value and store.captions_available():
            results = store.search_with_captions(emb, query_value, top_k_value)
        elif use_ocr_value and store.ocr_available():
            results = store.search_with_ocr(emb, query_value, top_k_value)
        else:
            results = store.search(emb, query_value, top_k_value)

    out = results

    # Favorites filter
    if favorites_only_value:
        try:
            coll = load_collections(store.index_dir)
            favs = set(coll.get('Favorites', []))
            out = [r for r in out if str(r.path) in favs]
        except Exception:
            pass

    # Tags filter
    if tags_value:
        try:
            tmap = load_tags(store.index_dir)
            req_tags = set(tags_value)
            out = [r for r in out if req_tags.issubset(set(tmap.get(str(r.path), [])))]
        except Exception:
            pass

    # People filter
    try:
        if persons_value and isinstance(persons_value, list) and len(persons_value) > 0:
            sets: List[set] = []
            for nm in persons_value:
                try:
                    sets.append(set(_face_photos(store.index_dir, str(nm))))
                except Exception:
                    sets.append(set())
            if sets:
                inter = set.intersection(*sets) if len(sets) > 1 else sets[0]
                out = [r for r in out if str(r.path) in inter]
        elif person_value:
            ppl = set(_face_photos(store.index_dir, str(person_value)))
            out = [r for r in out if str(r.path) in ppl]
    except Exception:
        pass

    # Date range filter
    if date_from_value is not None and date_to_value is not None:
        try:
            mmap = {
                sp: float(mt)
                for sp, mt in zip(store.state.paths or [], store.state.mtimes or [])
            }
            out = [
                r
                for r in out
                if date_from_value <= mmap.get(str(r.path), 0.0) <= date_to_value
            ]
        except Exception:
            pass

    # EXIF and quality filters
    try:
        meta_p = store.index_dir / 'exif_index.json'
        if meta_p.exists() and any([
            camera_value,
            iso_min_value is not None, iso_max_value is not None,
            f_min_value is not None, f_max_value is not None,
            place_value,
            flash_value, wb_value, metering_value,
            alt_min_value is not None, alt_max_value is not None,
            heading_min_value is not None, heading_max_value is not None,
        ]):
            m = json.loads(meta_p.read_text())
            cam_map = {
                p: (c or '')
                for p, c in zip(m.get('paths', []), m.get('camera', []))
            }
            iso_map = {
                p: (i if isinstance(i, int) else None)
                for p, i in zip(m.get('paths', []), m.get('iso', []))
            }
            f_map = {
                p: (float(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('fnumber', []))
            }
            place_map = {
                p: (s or '')
                for p, s in zip(m.get('paths', []), m.get('place', []))
            }
            flash_map = {
                p: (int(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('flash', []))
            }
            wb_map = {
                p: (int(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('white_balance', []))
            }
            met_map = {
                p: (int(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('metering', []))
            }
            alt_map = {
                p: (float(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('gps_altitude', []))
            }
            head_map = {
                p: (float(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('gps_heading', []))
            }
            sharp_map = {
                p: (float(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('sharpness', []))
            }
            bright_map = {
                p: (float(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('brightness', []))
            }

            def _matches_meta(p: str) -> bool:
                if camera_value and camera_value.strip():
                    if camera_value.strip().lower() not in (cam_map.get(p,'') or '').lower():
                        return False
                if iso_min_value is not None:
                    v = iso_map.get(p)
                    if v is None or v < int(iso_min_value):
                        return False
                if iso_max_value is not None:
                    v = iso_map.get(p)
                    if v is None or v > int(iso_max_value):
                        return False
                if f_min_value is not None:
                    v = f_map.get(p)
                    if v is None or v < float(f_min_value):
                        return False
                if f_max_value is not None:
                    v = f_map.get(p)
                    if v is None or v > float(f_max_value):
                        return False
                if place_value and place_value.strip():
                    if place_value.strip().lower() not in (place_map.get(p,'') or '').lower():
                        return False
                if flash_value:
                    fv = flash_map.get(p)
                    if fv is None:
                        return False
                    fired = 1 if fv & 1 else 0
                    if flash_value == 'fired' and fired != 1:
                        return False
                    if flash_value in ('no','noflash') and fired != 0:
                        return False
                if wb_value:
                    wv = wb_map.get(p)
                    if wv is None:
                        return False
                    if wb_value == 'auto' and wv != 0:
                        return False
                    if wb_value == 'manual' and wv != 1:
                        return False
                if metering_value:
                    mv = met_map.get(p)
                    if mv is None:
                        return False
                    name = str(metering_value).lower()
                    mm = {0: 'unknown', 1: 'average', 2: 'center', 3: 'spot', 4: 'multispot', 5: 'pattern', 6: 'partial', 255: 'other'}
                    label = mm.get(int(mv), 'other')
                    if name not in (label, 'any'):
                        if not (name == 'matrix' and label == 'pattern'):
                            return False
                if alt_min_value is not None or alt_max_value is not None:
                    av = alt_map.get(p)
                    if av is None:
                        return False
                    if alt_min_value is not None and av < float(alt_min_value):
                        return False
                    if alt_max_value is not None and av > float(alt_max_value):
                        return False
                if heading_min_value is not None or heading_max_value is not None:
                    hv = head_map.get(p)
                    if hv is None:
                        return False
                    try:
                        hh = float(hv) % 360.0
                    except Exception:
                        hh = hv
                    if heading_min_value is not None and hh < float(heading_min_value):
                        return False
                    if heading_max_value is not None and hh > float(heading_max_value):
                        return False
                if sharp_only_value:
                    sv = sharp_map.get(p)
                    if sv is None or sv < 60.0:
                        return False
                if exclude_under_value:
                    bv = bright_map.get(p)
                    if bv is not None and bv < 50.0:
                        return False
                if exclude_over_value:
                    bv = bright_map.get(p)
                    if bv is not None and bv > 205.0:
                        return False
                return True

            out = [r for r in out if _matches_meta(str(r.path))]
    except Exception:
        pass

    # OCR and quoted text filters
    try:
        texts_map: Dict[str, str] = {}
        if hasattr(store, 'ocr_texts_file') and store.ocr_texts_file.exists():
            d = json.loads(store.ocr_texts_file.read_text())
            texts_map = {p: (t or '') for p, t in zip(d.get('paths', []), d.get('texts', []))}
        if has_text_value:
            out = [r for r in out if (texts_map.get(str(r.path), '').strip() != '')]
        import re as _re
        d_parts = _re.findall(r'"([^"]+)"', query_value)
        s_parts = _re.findall(r"'([^']+)'", query_value)
        req = (d_parts or []) + (s_parts or [])
        if req:
            low = {p: texts_map.get(p, '').lower() for p in texts_map.keys()}
            def _has_all(pth: str) -> bool:
                s = low.get(pth, '')
                return all(x.lower() in s for x in req)
            out = [r for r in out if _has_all(str(r.path))]
    except Exception:
        pass

    # Captions and expression filters
    try:
        cap_map: Dict[str, str] = {}
        if store.captions_available() and store.captions_file.exists():
            cd = json.loads(store.captions_file.read_text())
            cap_map = {p: (t or '') for p, t in zip(cd.get('paths', []), cd.get('texts', []))}
        if cap_map:
            import shlex
            tokens = shlex.split(query_value)
            if tokens:
                out_q: List[str] = []
                op_set = {'AND','OR','NOT'}
                for tok in tokens:
                    tu = tok.upper()
                    if tu in op_set:
                        out_q.append(tu)
                    elif tok in ('(', ')'):
                        out_q.append(tok)
                    else:
                        out_q.append(tok)
                precedence = {'NOT': 3, 'AND': 2, 'OR': 1}
                output: List[str] = []
                stack: List[str] = []
                for tok in out_q:
                    tu = tok.upper()
                    if tu in op_set:
                        while stack and stack[-1] != '(' and precedence.get(stack[-1], 0) >= precedence[tu]:
                            output.append(stack.pop())
                        stack.append(tu)
                    elif tok == '(':
                        stack.append(tok)
                    elif tok == ')':
                        while stack and stack[-1] != '(':
                            output.append(stack.pop())
                        if stack and stack[-1] == '(':
                            stack.pop()
                    else:
                        output.append(tok)
                while stack:
                    output.append(stack.pop())
                out_q = output
                tags_map: Dict[str, List[str]] = {}
                try:
                    tags_map = load_tags(store.index_dir)
                except Exception:
                    pass
                person_cache: Dict[str, set] = {}
                cap_texts = cap_map
                texts_map_local = {}
                try:
                    d = json.loads(store.ocr_texts_file.read_text()) if hasattr(store, 'ocr_texts_file') and store.ocr_texts_file.exists() else {}
                    texts_map_local = {p: (t or '') for p, t in zip(d.get('paths', []), d.get('texts', []))}
                except Exception:
                    pass
                # Removed unused meta_maps assignment (was never referenced)
                # meta_maps: Dict[str, Dict[str, Optional[float]]] = {}
                mt_map: Dict[str, float] = {p: float(mt) for p, mt in zip(store.state.paths or [], store.state.mtimes or [])}
                iso_map_local: Dict[str, Optional[int]] = {}
                f_map_local: Dict[str, Optional[float]] = {}
                w_map: Dict[str, Optional[int]] = {}
                h_map: Dict[str, Optional[int]] = {}
                bright_map_local: Dict[str, Optional[float]] = {}
                sharp_map_local: Dict[str, Optional[float]] = {}
                exp_map: Dict[str, Optional[float]] = {}
                focal_map: Dict[str, Optional[float]] = {}
                try:
                    meta_p = store.index_dir / 'exif_index.json'
                    if meta_p.exists():
                        m = json.loads(meta_p.read_text())
                        iso_map_local = {p: (i if isinstance(i,int) else None) for p, i in zip(m.get('paths',[]), m.get('iso',[]))}
                        f_map_local = {p: (float(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('fnumber',[]))}
                        w_map = {p: (int(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('width',[]))}
                        h_map = {p: (int(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('height',[]))}
                        bright_map_local = {p: (float(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('brightness',[]))}
                        sharp_map_local = {p: (float(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('sharpness',[]))}
                        def _cv(v):
                            try:
                                if isinstance(v, (list, tuple)) and len(v) == 2:
                                    a, b = v
                                    return float(a) / float(b) if b else None
                                if isinstance(v, str) and '/' in v:
                                    a, b = v.split('/', 1)
                                    return float(a) / float(b)
                                return float(v) if isinstance(v, (int, float)) else None
                            except Exception:
                                return None
                        exp_map = {p: _cv(x) for p, x in zip(m.get('paths',[]), m.get('exposure',[]))}
                        focal_map = {p: _cv(x) for p, x in zip(m.get('paths',[]), m.get('focal',[]))}
                except Exception:
                    pass
                def doc_text(pth: str) -> str:
                    name = Path(pth).name
                    return f"{cap_texts.get(pth,'')}\n{texts_map_local.get(pth,'')}\n{name}".lower()
                def eval_field(tok: str, pth: str) -> bool:
                    if ':' not in tok:
                        return tok.lower() in doc_text(pth)
                    try:
                        field, val = tok.split(':', 1)
                        fv = (val or '').strip().strip('"').strip("'")
                        field = field.lower()
                        lp = pth
                        def parse_num_op(s: str):
                            opers = ['>=','<=','>','<','=']
                            for op in opers:
                                if s.startswith(op):
                                    rest = s[len(op):].strip()
                                    try:
                                        return op, float(rest)
                                    except Exception:
                                        return op, None
                            try:
                                return '=', float(s)
                            except Exception:
                                return None, None
                        if field == 'camera':
                            return fv.lower() in (cam_map.get(lp,'') or '').lower()
                        if field == 'place':
                            return fv.lower() in (place_map.get(lp,'') or '').lower()
                        if field == 'tag':
                            return fv in (tags_map.get(lp, []) or [])
                        if field == 'rating':
                            return f"rating:{fv}" in (tags_map.get(lp, []) or [])
                        if field == 'person':
                            key = fv
                            if key not in person_cache:
                                try:
                                    person_cache[key] = set(_face_photos(store.index_dir, key))
                                except Exception:
                                    person_cache[key] = set()
                            return lp in person_cache.get(key, set())
                        if field == 'has_text':
                            if fv == '' or fv.lower() in ('1','true','yes','y'):
                                return (texts_map_local.get(lp,'').strip() != '')
                            return (texts_map_local.get(lp,'').strip() == '')
                        if field in ('iso','fnumber','width','height','mtime','brightness','sharpness','exposure','focal','duration'):
                            op, num = parse_num_op(fv)
                            if num is None or op is None:
                                return False
                            cur = None
                            if field == 'iso':
                                cur = iso_map_local.get(lp)
                            elif field == 'fnumber':
                                cur = f_map_local.get(lp)
                            elif field == 'width':
                                cur = w_map.get(lp)
                            elif field == 'height':
                                cur = h_map.get(lp)
                            elif field == 'mtime':
                                cur = mt_map.get(lp)
                            elif field == 'brightness':
                                cur = bright_map_local.get(lp)
                            elif field == 'sharpness':
                                cur = sharp_map_local.get(lp)
                            elif field == 'exposure':
                                cur = exp_map.get(lp)
                            elif field == 'focal':
                                cur = focal_map.get(lp)
                            elif field == 'duration':
                                ext = str(Path(lp).suffix or '').lower()
                                if ext in ('.mp4','.mov','.mkv','.avi','.webm'):
                                    try:
                                        from adapters.video_processor import get_video_metadata as _gvm
                                        info = _gvm(Path(lp)) or {}
                                        cur = float(info.get('duration') or 0.0)
                                    except Exception:
                                        cur = None
                                else:
                                    cur = None
                            try:
                                if cur is None:
                                    return False
                                cv = float(cur)
                                if op == '>=':
                                    return cv >= num
                                if op == '<=':
                                    return cv <= num
                                if op == '>':
                                    return cv > num
                                if op == '<':
                                    return cv < num
                                if op == '=':
                                    return abs(cv - num) < 1e-6
                                return False
                            except Exception:
                                return False

                        if field == 'filetype':
                            ext = (Path(lp).suffix or '').lower().lstrip('.')
                            return ext == fv.lower()
                        return fv.lower() in doc_text(pth)
                    except Exception:
                        return False
                def eval_rpn(pth: str) -> bool:
                    stack: List[bool] = []
                    for tok in out_q:
                        tu = tok.upper()
                        if tu == 'NOT':
                            v = stack.pop() if stack else False
                            stack.append(not v)
                        elif tu in ('AND','OR'):
                            b = stack.pop() if stack else False
                            a = stack.pop() if stack else False
                            stack.append((a and b) if tu == 'AND' else (a or b))
                        else:
                            stack.append(eval_field(tok, pth))
                    return bool(stack[-1]) if stack else True
                out = [r for r in out if eval_rpn(str(r.path))]
    except Exception:
        pass

    # Apply pagination
    total = len(out)
    paginated_results = out[offset_value:offset_value + limit_value]

    sid = log_search(store.index_dir, getattr(emb, 'index_id', 'default'), search_req.query, [(str(r.path), float(r.score)) for r in out])

    return {
        "search_id": sid,
        "results": [{"path": str(r.path), "score": float(r.score)} for r in paginated_results],
        "pagination": {
            "offset": offset_value,
            "limit": limit_value,
            "total": total,
            "has_more": offset_value + limit_value < total
        }
    }


# Video Search API
@app.post("/search_video")
def api_search_video(
    dir: Optional[str] = None,
    query: Optional[str] = None,
    top_k: Optional[int] = None,
    provider: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Search for videos using semantic search on extracted metadata and keyframes."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    query_value = _require(_from_body(body, query, "query"), "query")
    top_k_value = _from_body(body, top_k, "top_k", default=12, cast=lambda v: int(v)) or 12
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    # Get video index store
    video_store = VideoIndexStore(folder)
    if not video_store.load():
        return {"results": []}

    # Embed query
    emb = _emb(provider_value, hf_token_value, openai_key_value)
    try:
        qv = emb.embed_text(query_value)
    except Exception:
        raise HTTPException(500, "Embedding failed")

    # Search in video store
    results = video_store.search(qv, top_k=top_k_value)

    return {"results": [{"path": r.path, "score": float(r.score)} for r in results]}


@app.post("/search_video_like")
def api_search_video_like(
    dir: Optional[str] = None,
    path: Optional[str] = None,
    top_k: Optional[int] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Find visually similar videos based on a reference video.

    Provider / token parameters were unused; removed to reduce noise. If future
    embedding-based re-ranking is added we can reintroduce via unified schema.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    path_value = _require(_from_body(body, path, "path"), "path")
    top_k_value = _from_body(body, top_k, "top_k", default=12, cast=lambda v: int(v)) or 12

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    video_store = VideoIndexStore(folder)
    if not video_store.load():
        return {"results": []}

    results = video_store.search_like(path_value, top_k=top_k_value)
    return {"results": [{"path": r.path, "score": float(r.score)} for r in results]}


# Removed duplicated health/root/monitoring/tech endpoints now handled by api.routes.health router

# Demo directory helper
@app.get("/demo/dir")
def api_demo_dir() -> BaseResponse:
    try:
        demo = Path(__file__).resolve().parent.parent / "demo_photos"
        exists = demo.exists() and demo.is_dir()
        return SuccessResponse(
            ok=True,
            data={"path": str(demo), "exists": bool(exists)}
        )
    except Exception:
        return BaseResponse(ok=False)

# Small helpers used by several legacy endpoints
def _normcase_path(p: str) -> str:
    try:
        return str(Path(p).expanduser().resolve()).lower()
    except Exception:
        return str(p).lower()


def _default_photo_dir_candidates() -> List[Dict[str, str]]:
    """Best-effort local photo folder suggestions across OSes."""
    out: List[Dict[str, str]] = []
    home = Path.home()
    sysname = (os.uname().sysname if hasattr(os, 'uname') else os.name).lower()
    def _add(p: Path, label: str, source: str):
        try:
            if p.exists() and p.is_dir():
                out.append({"path": str(p), "label": label, "source": source})
        except Exception:
            pass
    # Common directories
    _add(home / "Pictures", "Pictures", "home")
    _add(home / "Downloads", "Downloads", "home")
    # Windows-like envs
    one_drive_env = os.environ.get("OneDrive")
    if one_drive_env:
        _add(Path(one_drive_env) / "Pictures", "OneDrive Pictures", "onedrive")
    public_dir = os.environ.get("PUBLIC")
    if public_dir:
        _add(Path(public_dir) / "Pictures", "Public Pictures", "windows")
    # macOS iCloud hints
    if "darwin" in sysname:
        icloud_docs = home / "Library" / "Mobile Documents" / "com~apple~CloudDocs"
        _add(icloud_docs / "Photos", "iCloud Drive Photos", "icloud")
        _add(icloud_docs / "Pictures", "iCloud Drive Pictures", "icloud")
        _add(home / "Library" / "CloudStorage" / "iCloud Drive" / "Photos", "iCloud Photos", "icloud")
    # Linux XDG
    if "linux" in sysname:
        try:
            user_dirs = home / ".config" / "user-dirs.dirs"
            if user_dirs.exists():
                text = user_dirs.read_text(encoding="utf-8")
                for line in text.splitlines():
                    if line.startswith("XDG_PICTURES_DIR") or line.startswith("XDG_DOWNLOAD_DIR"):
                        parts = line.split("=")
                        if len(parts) == 2:
                            raw = parts[1].strip().strip('"')
                            resolved = raw.replace("$HOME", str(home))
                            label = "Pictures" if "PICTURES" in parts[0] else "Downloads"
                            _add(Path(resolved), label, "xdg")
        except Exception:
            pass
    # Deduplicate by normalized path
    seen: set[str] = set()
    uniq: List[Dict[str, str]] = []
    for it in out:
        key = _normcase_path(it["path"])
        if key in seen:
            continue
        seen.add(key)
        uniq.append(it)
    return uniq


def _scan_media_counts(paths: List[str], include_videos: bool = True) -> Dict[str, Any]:
    """Count image/video files and bytes for quick previews; privacy-friendly."""
    total_files = 0
    total_bytes = 0
    items: List[Dict[str, Any]] = []
    img_exts = SUPPORTED_EXTS
    vid_exts = SUPPORTED_VIDEO_EXTS if include_videos else set()
    for p in paths:
        pth = Path(p).expanduser()
        count = 0
        size = 0
        try:
            if pth.exists() and pth.is_dir():
                for root, _, files in os.walk(pth):
                    for name in files:
                        ext = Path(name).suffix.lower()
                        if ext in img_exts or ext in vid_exts:
                            count += 1
                            try:
                                size += (Path(root) / name).stat().st_size
                            except Exception:
                                continue
        except Exception:
            count = 0; size = 0
        total_files += count
        total_bytes += size
        items.append({"path": str(pth), "count": count, "bytes": size})
    return {"items": items, "total_files": total_files, "total_bytes": total_bytes}
@app.post("/search")
def api_search(req: SearchRequest) -> SearchResponse:
    """Search for photos using semantic similarity and advanced filtering.

    Migration note: This endpoint is being refactored to use the unified
    ``UnifiedSearchRequest`` model. For now we construct the unified model and
    then operate directly on it (rather than duplicating per-field *_value
    variables). A legacy dict bridge is retained temporarily for any code that
    still expects the old flat names; this will be removed once downstream
    helpers are updated.
    """

    # Build unified request (robust to unexpected legacy fields)
    try:
        unified_req = UnifiedSearchRequest.from_query_params(req.dict(by_alias=True))
    except Exception:
        # Fallback: wrap the original (should be rare); still proceed to avoid regression
        unified_req = UnifiedSearchRequest(
            directory=req.dir,
            query=req.query,
            top_k=req.top_k,
            provider=req.provider or "local",
            hf_token=req.hf_token,
            openai_key=req.openai_key,
            use_fast=req.use_fast,
            fast_kind=req.fast_kind,
            use_captions=req.use_captions,
            use_ocr=req.use_ocr,
            favorites_only=req.favorites_only,
            tags=req.tags,
            date_from=req.date_from,
            date_to=req.date_to,
            camera=req.camera,
            iso_min=req.iso_min,
            iso_max=req.iso_max,
            f_min=req.f_min,
            f_max=req.f_max,
            flash=req.flash,
            wb=req.wb,
            metering=req.metering,
            alt_min=req.alt_min,
            alt_max=req.alt_max,
            heading_min=req.heading_min,
            heading_max=req.heading_max,
            place=req.place,
            has_text=req.has_text,
            person=req.person,
            persons=req.persons,
            sharp_only=req.sharp_only,
            exclude_underexp=req.exclude_underexp,
            exclude_overexp=req.exclude_overexp,
        )

    # Temporary bridge (parity / potential logging)
    # legacy_params = unified_req.to_legacy_param_dict()  # noqa: E800 (uncomment for debugging parity)

    legacy_params = unified_req.to_legacy_param_dict()

    dir_value = legacy_params.get("dir")
    query_value = legacy_params.get("query")
    top_k_value = legacy_params.get("top_k", 48)
    provider_value = legacy_params.get("provider") or "local"
    hf_token_value = legacy_params.get("hf_token")
    openai_key_value = legacy_params.get("openai_key")
    use_fast_value = bool(legacy_params.get("use_fast"))
    fast_kind_value = legacy_params.get("fast_kind")
    use_captions_value = bool(legacy_params.get("use_captions"))
    use_ocr_value = bool(legacy_params.get("use_ocr"))
    favorites_only_value = bool(legacy_params.get("favorites_only"))
    tags_value = legacy_params.get("tags") or []
    date_from_value = legacy_params.get("date_from")
    date_to_value = legacy_params.get("date_to")
    camera_value = legacy_params.get("camera")
    iso_min_value = legacy_params.get("iso_min")
    iso_max_value = legacy_params.get("iso_max")
    f_min_value = legacy_params.get("f_min")
    f_max_value = legacy_params.get("f_max")
    flash_value = legacy_params.get("flash")
    wb_value = legacy_params.get("wb")
    metering_value = legacy_params.get("metering")
    alt_min_value = legacy_params.get("alt_min")
    alt_max_value = legacy_params.get("alt_max")
    heading_min_value = legacy_params.get("heading_min")
    heading_max_value = legacy_params.get("heading_max")
    place_value = legacy_params.get("place")
    has_text_value = legacy_params.get("has_text")
    person_value = legacy_params.get("person")
    persons_value = legacy_params.get("persons")
    sharp_only_value = legacy_params.get("sharp_only")
    exclude_under_value = legacy_params.get("exclude_underexp")
    exclude_over_value = legacy_params.get("exclude_overexp")

    # Validate directory
    if not dir_value:
        raise HTTPException(400, "Directory path is required")

    folder = Path(dir_value).expanduser().resolve()

    # Check if folder exists and is accessible
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    if not folder.is_dir():
        raise HTTPException(400, "Path is not a directory")

    try:
        # Test if we can read the directory
        next(folder.iterdir(), None)
    except PermissionError:
        raise HTTPException(403, "Permission denied to access folder")
    except Exception as e:
        raise HTTPException(400, f"Cannot access folder: {str(e)}")

    emb = _emb(provider_value, hf_token_value, openai_key_value)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()

    # Initialize metadata maps to avoid NameErrors in later logic
    cam_map: Dict[str, str] = {}
    place_map: Dict[str, str] = {}
    wb_map: Dict[str, Optional[int]] = {}
    met_map: Dict[str, Optional[int]] = {}
    iso_map: Dict[str, Optional[int]] = {}
    f_map: Dict[str, Optional[float]] = {}
    flash_map: Dict[str, Optional[int]] = {}
    alt_map: Dict[str, Optional[float]] = {}
    head_map: Dict[str, Optional[float]] = {}
    sharp_map: Dict[str, Optional[float]] = {}
    bright_map: Dict[str, Optional[float]] = {}

    # Primary semantic search
    fast_meta = None
    if use_fast_value:
        fim = FastIndexManager(store)
        try:
            results, fast_meta = fim.search(emb, query_value, top_k=top_k_value, use_fast=True, fast_kind_hint=fast_kind_value)
        except Exception:
            results = store.search(emb, query_value, top_k_value)
    else:
        if use_captions_value and store.captions_available():
            results = store.search_with_captions(emb, query_value, top_k_value)
        elif use_ocr_value and store.ocr_available():
            results = store.search_with_ocr(emb, query_value, top_k_value)
        else:
            results = store.search(emb, query_value, top_k_value)

    out = results

    # Favorites filter
    if favorites_only_value:
        try:
            coll = load_collections(store.index_dir)
            favs = set(coll.get('Favorites', []))
            out = [r for r in out if str(r.path) in favs]
        except Exception:
            pass

    # Tags filter
    if tags_value:
        try:
            tmap = load_tags(store.index_dir)
            req_tags = set(tags_value)
            out = [r for r in out if req_tags.issubset(set(tmap.get(str(r.path), [])))]
        except Exception:
            pass

    # People filter
    try:
        if persons_value and isinstance(persons_value, list) and len(persons_value) > 0:
            sets: List[set] = []
            for nm in persons_value:
                try:
                    sets.append(set(_face_photos(store.index_dir, str(nm))))
                except Exception:
                    sets.append(set())
            if sets:
                inter = set.intersection(*sets) if len(sets) > 1 else sets[0]
                out = [r for r in out if str(r.path) in inter]
        elif person_value:
            ppl = set(_face_photos(store.index_dir, str(person_value)))
            out = [r for r in out if str(r.path) in ppl]
    except Exception:
        pass

    # Date range filter
    if date_from_value is not None and date_to_value is not None:
        try:
            mmap = {
                sp: float(mt)
                for sp, mt in zip(store.state.paths or [], store.state.mtimes or [])
            }
            out = [
                r
                for r in out
                if date_from_value <= mmap.get(str(r.path), 0.0) <= date_to_value
            ]
        except Exception:
            pass

    # EXIF and quality filters
    try:
        meta_p = store.index_dir / 'exif_index.json'
        if meta_p.exists() and any([
            camera_value,
            iso_min_value is not None, iso_max_value is not None,
            f_min_value is not None, f_max_value is not None,
            place_value,
            flash_value, wb_value, metering_value,
            alt_min_value is not None, alt_max_value is not None,
            heading_min_value is not None, heading_max_value is not None,
        ]):
            m = json.loads(meta_p.read_text())
            cam_map = {
                p: (c or '')
                for p, c in zip(m.get('paths', []), m.get('camera', []))
            }
            iso_map = {
                p: (i if isinstance(i, int) else None)
                for p, i in zip(m.get('paths', []), m.get('iso', []))
            }
            f_map = {
                p: (float(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('fnumber', []))
            }
            place_map = {
                p: (s or '')
                for p, s in zip(m.get('paths', []), m.get('place', []))
            }
            flash_map = {
                p: (int(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('flash', []))
            }
            wb_map = {
                p: (int(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('white_balance', []))
            }
            met_map = {
                p: (int(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('metering', []))
            }
            alt_map = {
                p: (float(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('gps_altitude', []))
            }
            head_map = {
                p: (float(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('gps_heading', []))
            }
            sharp_map = {
                p: (float(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('sharpness', []))
            }
            bright_map = {
                p: (float(x) if isinstance(x, (int, float)) else None)
                for p, x in zip(m.get('paths', []), m.get('brightness', []))
            }

            def _matches_meta(p: str) -> bool:
                if camera_value and camera_value.strip():
                    if camera_value.strip().lower() not in (cam_map.get(p,'') or '').lower():
                        return False
                if iso_min_value is not None:
                    v = iso_map.get(p)
                    if v is None or v < int(iso_min_value):
                        return False
                if iso_max_value is not None:
                    v = iso_map.get(p)
                    if v is None or v > int(iso_max_value):
                        return False
                if f_min_value is not None:
                    v = f_map.get(p)
                    if v is None or v < float(f_min_value):
                        return False
                if f_max_value is not None:
                    v = f_map.get(p)
                    if v is None or v > float(f_max_value):
                        return False
                if place_value and place_value.strip():
                    if place_value.strip().lower() not in (place_map.get(p,'') or '').lower():
                        return False
                if flash_value:
                    fv = flash_map.get(p)
                    if fv is None:
                        return False
                    fired = 1 if fv & 1 else 0
                    if flash_value == 'fired' and fired != 1:
                        return False
                    if flash_value in ('no','noflash') and fired != 0:
                        return False
                if wb_value:
                    wv = wb_map.get(p)
                    if wv is None:
                        return False
                    if wb_value == 'auto' and wv != 0:
                        return False
                    if wb_value == 'manual' and wv != 1:
                        return False
                if metering_value:
                    mv = met_map.get(p)
                    if mv is None:
                        return False
                    name = str(metering_value).lower()
                    mm = {0: 'unknown', 1: 'average', 2: 'center', 3: 'spot', 4: 'multispot', 5: 'pattern', 6: 'partial', 255: 'other'}
                    label = mm.get(int(mv), 'other')
                    if name not in (label, 'any'):
                        if not (name == 'matrix' and label == 'pattern'):
                            return False
                if alt_min_value is not None or alt_max_value is not None:
                    av = alt_map.get(p)
                    if av is None:
                        return False
                    if alt_min_value is not None and av < float(alt_min_value):
                        return False
                    if alt_max_value is not None and av > float(alt_max_value):
                        return False
                if heading_min_value is not None or heading_max_value is not None:
                    hv = head_map.get(p)
                    if hv is None:
                        return False
                    try:
                        hh = float(hv) % 360.0
                    except Exception:
                        hh = hv
                    if heading_min_value is not None and hh < float(heading_min_value):
                        return False
                    if heading_max_value is not None and hh > float(heading_max_value):
                        return False
                if sharp_only_value:
                    sv = sharp_map.get(p)
                    if sv is None or sv < 60.0:
                        return False
                if exclude_under_value:
                    bv = bright_map.get(p)
                    if bv is not None and bv < 50.0:
                        return False
                if exclude_over_value:
                    bv = bright_map.get(p)
                    if bv is not None and bv > 205.0:
                        return False
                return True

            out = [r for r in out if _matches_meta(str(r.path))]
    except Exception:
        pass

    # OCR and quoted text filters
    try:
        texts_map: Dict[str, str] = {}
        if hasattr(store, 'ocr_texts_file') and store.ocr_texts_file.exists():
            d = json.loads(store.ocr_texts_file.read_text())
            texts_map = {p: (t or '') for p, t in zip(d.get('paths', []), d.get('texts', []))}
        if has_text_value:
            out = [r for r in out if (texts_map.get(str(r.path), '').strip() != '')]
        import re as _re
        d_parts = _re.findall(r'"([^"]+)"', query_value)
        s_parts = _re.findall(r"'([^']+)'", query_value)
        req = (d_parts or []) + (s_parts or [])
        if req:
            low = {p: texts_map.get(p, '').lower() for p in texts_map.keys()}
            def _has_all(pth: str) -> bool:
                s = low.get(pth, '')
                return all(x.lower() in s for x in req)
            out = [r for r in out if _has_all(str(r.path))]
    except Exception:
        pass

    # Captions and expression filters
    try:
        cap_map: Dict[str, str] = {}
        if store.captions_available() and store.captions_file.exists():
            cd = json.loads(store.captions_file.read_text())
            cap_map = {p: (t or '') for p, t in zip(cd.get('paths', []), cd.get('texts', []))}
        if cap_map:
            import shlex
            tokens = shlex.split(query_value)
            if tokens:
                out_q: List[str] = []
                op_set = {'AND','OR','NOT'}
                for tok in tokens:
                    tu = tok.upper()
                    if tu in op_set:
                        out_q.append(tu)
                    elif tok in ('(', ')'):
                        out_q.append(tok)
                    else:
                        out_q.append(tok)
                precedence = {'NOT': 3, 'AND': 2, 'OR': 1}
                output: List[str] = []
                stack: List[str] = []
                for tok in out_q:
                    tu = tok.upper()
                    if tu in op_set:
                        while stack and stack[-1] != '(' and precedence.get(stack[-1], 0) >= precedence[tu]:
                            output.append(stack.pop())
                        stack.append(tu)
                    elif tok == '(':
                        stack.append(tok)
                    elif tok == ')':
                        while stack and stack[-1] != '(':
                            output.append(stack.pop())
                        if stack and stack[-1] == '(':
                            stack.pop()
                    else:
                        output.append(tok)
                while stack:
                    output.append(stack.pop())
                out_q = output
                tags_map: Dict[str, List[str]] = {}
                try:
                    tags_map = load_tags(store.index_dir)
                except Exception:
                    pass
                person_cache: Dict[str, set] = {}
                cap_texts = cap_map
                texts_map_local = {}
                try:
                    d = json.loads(store.ocr_texts_file.read_text()) if hasattr(store, 'ocr_texts_file') and store.ocr_texts_file.exists() else {}
                    texts_map_local = {p: (t or '') for p, t in zip(d.get('paths', []), d.get('texts', []))}
                except Exception:
                    pass
                # Removed unused meta_maps assignment (was never referenced)
                # meta_maps: Dict[str, Dict[str, Optional[float]]] = {}
                mt_map: Dict[str, float] = {p: float(mt) for p, mt in zip(store.state.paths or [], store.state.mtimes or [])}
                iso_map_local: Dict[str, Optional[int]] = {}
                f_map_local: Dict[str, Optional[float]] = {}
                w_map: Dict[str, Optional[int]] = {}
                h_map: Dict[str, Optional[int]] = {}
                bright_map_local: Dict[str, Optional[float]] = {}
                sharp_map_local: Dict[str, Optional[float]] = {}
                exp_map: Dict[str, Optional[float]] = {}
                focal_map: Dict[str, Optional[float]] = {}
                try:
                    meta_p = store.index_dir / 'exif_index.json'
                    if meta_p.exists():
                        m = json.loads(meta_p.read_text())
                        iso_map_local = {p: (i if isinstance(i,int) else None) for p, i in zip(m.get('paths',[]), m.get('iso',[]))}
                        f_map_local = {p: (float(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('fnumber',[]))}
                        w_map = {p: (int(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('width',[]))}
                        h_map = {p: (int(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('height',[]))}
                        bright_map_local = {p: (float(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('brightness',[]))}
                        sharp_map_local = {p: (float(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('sharpness',[]))}
                        def _cv(v):
                            try:
                                if isinstance(v, (list, tuple)) and len(v) == 2:
                                    a, b = v
                                    return float(a) / float(b) if b else None
                                if isinstance(v, str) and '/' in v:
                                    a, b = v.split('/', 1)
                                    return float(a) / float(b)
                                return float(v) if isinstance(v, (int, float)) else None
                            except Exception:
                                return None
                        exp_map = {p: _cv(x) for p, x in zip(m.get('paths',[]), m.get('exposure',[]))}
                        focal_map = {p: _cv(x) for p, x in zip(m.get('paths',[]), m.get('focal',[]))}
                except Exception:
                    pass
                def doc_text(pth: str) -> str:
                    name = Path(pth).name
                    return f"{cap_texts.get(pth,'')}\n{texts_map_local.get(pth,'')}\n{name}".lower()
                def eval_field(tok: str, pth: str) -> bool:
                    if ':' not in tok:
                        return tok.lower() in doc_text(pth)
                    try:
                        field, val = tok.split(':', 1)
                        fv = (val or '').strip().strip('"').strip("'")
                        field = field.lower()
                        lp = pth
                        def parse_num_op(s: str):
                            opers = ['>=','<=','>','<','=']
                            for op in opers:
                                if s.startswith(op):
                                    rest = s[len(op):].strip()
                                    try:
                                        return op, float(rest)
                                    except Exception:
                                        return op, None
                            try:
                                return '=', float(s)
                            except Exception:
                                return None, None
                        if field == 'camera':
                            return fv.lower() in (cam_map.get(lp,'') or '').lower()
                        if field == 'place':
                            return fv.lower() in (place_map.get(lp,'') or '').lower()
                        if field == 'tag':
                            return fv in (tags_map.get(lp, []) or [])
                        if field == 'rating':
                            return f"rating:{fv}" in (tags_map.get(lp, []) or [])
                        if field == 'person':
                            key = fv
                            if key not in person_cache:
                                try:
                                    person_cache[key] = set(_face_photos(store.index_dir, key))
                                except Exception:
                                    person_cache[key] = set()
                            return lp in person_cache.get(key, set())
                        if field == 'has_text':
                            if fv == '' or fv.lower() in ('1','true','yes','y'):
                                return (texts_map_local.get(lp,'').strip() != '')
                            return (texts_map_local.get(lp,'').strip() == '')
                        if field in ('iso','fnumber','width','height','mtime','brightness','sharpness','exposure','focal','duration'):
                            op, num = parse_num_op(fv)
                            if num is None or op is None:
                                return False
                            cur = None
                            if field == 'iso':
                                cur = iso_map_local.get(lp)
                            elif field == 'fnumber':
                                cur = f_map_local.get(lp)
                            elif field == 'width':
                                cur = w_map.get(lp)
                            elif field == 'height':
                                cur = h_map.get(lp)
                            elif field == 'mtime':
                                cur = mt_map.get(lp)
                            elif field == 'brightness':
                                cur = bright_map_local.get(lp)
                            elif field == 'sharpness':
                                cur = sharp_map_local.get(lp)
                            elif field == 'exposure':
                                cur = exp_map.get(lp)
                            elif field == 'focal':
                                cur = focal_map.get(lp)
                            elif field == 'duration':
                                ext = str(Path(lp).suffix or '').lower()
                                if ext in ('.mp4','.mov','.mkv','.avi','.webm'):
                                    try:
                                        from adapters.video_processor import get_video_metadata as _gvm
                                        info = _gvm(Path(lp)) or {}
                                        cur = float(info.get('duration') or 0.0)
                                    except Exception:
                                        cur = None
                                else:
                                    cur = None
                            try:
                                if cur is None:
                                    return False
                                cv = float(cur)
                                if op == '>=':
                                    return cv >= num
                                if op == '<=':
                                    return cv <= num
                                if op == '>':
                                    return cv > num
                                if op == '<':
                                    return cv < num
                                if op == '=':
                                    return abs(cv - num) < 1e-6
                                return False
                            except Exception:
                                return False

                        if field == 'filetype':
                            ext = (Path(lp).suffix or '').lower().lstrip('.')
                            return ext == fv.lower()
                        return fv.lower() in doc_text(pth)
                    except Exception:
                        return False
                def eval_rpn(pth: str) -> bool:
                    stack: List[bool] = []
                    for tok in out_q:
                        tu = tok.upper()
                        if tu == 'NOT':
                            v = stack.pop() if stack else False
                            stack.append(not v)
                        elif tu in ('AND','OR'):
                            b = stack.pop() if stack else False
                            a = stack.pop() if stack else False
                            stack.append((a and b) if tu == 'AND' else (a or b))
                        else:
                            stack.append(eval_field(tok, pth))
                    return bool(stack[-1]) if stack else True
                out = [r for r in out if eval_rpn(str(r.path))]
    except Exception:
        pass

    # Apply pagination
    total = len(out)
    paginated_results = out[offset_value:offset_value + limit_value]

    sid = log_search(store.index_dir, getattr(emb, 'index_id', 'default'), search_req.query, [(str(r.path), float(r.score)) for r in out])

    return {
        "search_id": sid,
        "results": [{"path": str(r.path), "score": float(r.score)} for r in paginated_results],
        "pagination": {
            "offset": offset_value,
            "limit": limit_value,
            "total": total,
            "has_more": offset_value + limit_value < total
        }
    }


# Video Search API
@app.post("/search_video")
def api_search_video(
    dir: Optional[str] = None,
    query: Optional[str] = None,
    top_k: Optional[int] = None,
    provider: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Search for videos using semantic search on extracted metadata and keyframes."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    query_value = _require(_from_body(body, query, "query"), "query")
    top_k_value = _from_body(body, top_k, "top_k", default=12, cast=lambda v: int(v)) or 12
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    # Get video index store
    video_store = VideoIndexStore(folder)
    if not video_store.load():
        return {"results": []}

    # Embed query
    emb = _emb(provider_value, hf_token_value, openai_key_value)
    try:
        qv = emb.embed_text(query_value)
    except Exception:
        raise HTTPException(500, "Embedding failed")

    # Search in video store
    results = video_store.search(qv, top_k=top_k_value)

    return {"results": [{"path": r.path, "score": float(r.score)} for r in results]}


@app.post("/search_video_like")
def api_search_video_like(
    dir: Optional[str] = None,
    path: Optional[str] = None,
    top_k: Optional[int] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Find visually similar videos based on a reference video.

    Provider / token parameters were unused; removed to reduce noise. If future
    embedding-based re-ranking is added we can reintroduce via unified schema.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    path_value = _require(_from_body(body, path, "path"), "path")
    top_k_value = _from_body(body, top_k, "top_k", default=12, cast=lambda v: int(v)) or 12

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    video_store = VideoIndexStore(folder)
    if not video_store.load():
        return {"results": []}

    results = video_store.search_like(path_value, top_k=top_k_value)
    return {"results": [{"path": r.path, "score": float(r.score)} for r in results]}
