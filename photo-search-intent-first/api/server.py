from __future__ import annotations

import json
import os
import time
import time
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Optional, TypeVar

from fastapi import Body, FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from datetime import datetime

from api.utils import _from_body, _require, _emb
from api.schemas.v1 import (
    SearchRequest,
    SearchResponse,
    SearchResultItem,
    BaseResponse,
    SuccessResponse,
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
)
from api.routers.analytics import router as analytics_router, legacy_router as analytics_legacy_router
from api.routers.auth import router as auth_router
from api.routers.batch import router as batch_router
from api.routers.captions import router as captions_router
from api.routers.collections import router as collections_router
from api.routers.data_management import router as data_management_router
from api.routers.diagnostics import router as diagnostics_router
from api.routers.editing import router as editing_router
from api.routers.faces import router as faces_router
from api.routers.fast_index import router as fast_index_router
from api.routers.favorites import router as favorites_router
from api.routers.file_management import router as file_management_router
from api.routers.index import router as index_router
from api.routers.indexing import router as indexing_router
from api.routers.config import router as config_router
from api.routers.library import router as library_router
from api.routers.metadata import router as metadata_router
from api.routers.models import router as models_router
from api.routers.ocr import router as ocr_router
from api.routers.presets import router as presets_router
from api.routers.saved import router as saved_router
from api.routers.share import router as share_router
from api.routers.smart_collections import router as smart_collections_router
from api.routers.tagging import router as tagging_router
from api.routers.trips import router as trips_router
from api.routers.utilities import router as utilities_router
from api.routers.videos import router as videos_router
from api.routers.watch import router as watch_router
from api.routers.workspace import router as workspace_router
from api.attention import router as attention_router  # NEW: adaptive attention (scaffold)
from api.routes.health import router as health_router  # Extracted health & root endpoints
from infra.analytics import log_search
from infra.collections import load_collections
from infra.config import config
from infra.index_store import IndexStore
from infra.fast_index import FastIndexManager
from infra.tags import load_tags
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
from usecases.index_photos import index_photos  # noqa: F401 (potential future use)
from infra.video_index_store import VideoIndexStore
from infra.thumbs import get_or_create_thumb, get_or_create_face_thumb  # noqa: F401
from infra.faces import load_faces as _faces_load  # noqa: F401
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
from PIL import Image, ExifTags  # noqa: F401

# Supported extension constants (import with safe fallback)
try:
    from infra.constants import SUPPORTED_EXTS, SUPPORTED_VIDEO_EXTS  # type: ignore
except Exception:  # pragma: no cover - fallback values
    SUPPORTED_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".tif", ".tiff", ".bmp"}
    SUPPORTED_VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".avi", ".webm"}

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
app.include_router(batch_router)
app.include_router(captions_router)
app.include_router(collections_router)
app.include_router(data_management_router)
app.include_router(diagnostics_router)
app.include_router(editing_router)
app.include_router(faces_router)
app.include_router(fast_index_router)
app.include_router(favorites_router)
app.include_router(file_management_router)
app.include_router(index_router)
app.include_router(library_router)
app.include_router(metadata_router)
app.include_router(models_router)
app.include_router(ocr_router)
app.include_router(presets_router)
app.include_router(saved_router)
app.include_router(share_router)
app.include_router(smart_collections_router)
app.include_router(tagging_router)
app.include_router(trips_router)
app.include_router(utilities_router)
app.include_router(videos_router)
app.include_router(watch_router)
app.include_router(workspace_router)

# Mount versioned API router
app.include_router(api_v1)

# Mount static files for React app
web_dir = Path(__file__).parent / "web"
if web_dir.exists():
    app.mount("/app", StaticFiles(directory=str(web_dir), html=True), name="static")

T = TypeVar("T")


# Removed local _zip_meta (use imported) and duplicate health/ping endpoints (handled by health_router)

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


# Search endpoint helper functions (extracted from 143 CCN main function)
def _validate_search_directory(directory: str) -> Path:
    """Validate search directory and return Path object."""
    try:
        dir_p = Path(directory).expanduser().resolve()
        if not dir_p.exists() or not dir_p.is_dir():
            raise HTTPException(status_code=400, detail=f"Directory not found: {directory}")
        return dir_p
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid directory: {e}")


def _initialize_search_provider(unified_req: UnifiedSearchRequest):
    """Initialize embedding provider and index store."""
    try:
        from adapters.provider_factory import get_provider
        kwargs = {}
        if unified_req.hf_token:
            kwargs['hf_token'] = unified_req.hf_token
        if unified_req.openai_key:
            kwargs['openai_api_key'] = unified_req.openai_key
        
        embedder = get_provider(unified_req.provider, **kwargs)
        dir_p = _validate_search_directory(unified_req.directory)
        
        from infra.index_store import IndexStore
        store = IndexStore(dir_p)
        
        return store, embedder
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Provider initialization failed: {e}")


def _perform_semantic_search(store, embedder, unified_req: UnifiedSearchRequest) -> List:
    """Perform the core semantic search operation with all search modes."""
    try:
        # Extract legacy parameters for compatibility
        legacy_params = unified_req.to_legacy_param_dict()
        query_value = (legacy_params.get("query") or "").strip()
        top_k_value = legacy_params.get("top_k", 48)
        use_fast_value = bool(legacy_params.get("use_fast"))
        fast_kind_value = legacy_params.get("fast_kind")
        use_captions_value = bool(legacy_params.get("use_captions"))
        use_ocr_value = bool(legacy_params.get("use_ocr"))
        
        # Handle fast indexing if enabled
        if use_fast_value:
            from infra.fast_index_manager import FastIndexManager
            fim = FastIndexManager(store)
            try:
                results, fast_meta = fim.search(
                    embedder, query_value, 
                    top_k=top_k_value, 
                    use_fast=True, 
                    fast_kind_hint=fast_kind_value
                )
                return results
            except Exception:
                # Fallback to regular search
                pass
        
        # Regular search with different modes
        if query_value and query_value.strip():
            if use_captions_value and store.captions_available():
                return store.search_with_captions(embedder, query_value, top_k_value)
            elif use_ocr_value and store.ocr_available():
                return store.search_with_ocr(embedder, query_value, top_k_value)
            else:
                return store.search(
                    embedder,
                    query_value,
                    top_k=top_k_value,
                    similarity_threshold=unified_req.similarity_threshold,
                    use_captions=use_captions_value,
                    use_fast=use_fast_value,
                    fast_kind=fast_kind_value,
                    use_ocr=use_ocr_value,
                )
        else:
            # No query: return all indexed photos (with score 1.0)
            from domain.models import SearchResult
            paths = store.state.paths or []
            return [SearchResult(path=Path(p), score=1.0) for p in paths]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {e}")


def _apply_metadata_filters(store, results: List, unified_req: UnifiedSearchRequest) -> List:
    """Apply EXIF and metadata-based filters to search results."""
    try:
        # Build metadata maps if needed for filtering
        meta_p = store.index_dir / 'exif_index.json'
        if not meta_p.exists():
            return results
            
        needs_meta = any([
            unified_req.camera,
            unified_req.iso_min is not None, unified_req.iso_max is not None,
            unified_req.f_min is not None, unified_req.f_max is not None,
            unified_req.place,
            unified_req.flash, unified_req.wb, unified_req.metering,
            unified_req.alt_min is not None, unified_req.alt_max is not None,
            unified_req.heading_min is not None, unified_req.heading_max is not None,
            unified_req.sharp_only, unified_req.exclude_under, unified_req.exclude_over,
        ])
        
        if not needs_meta:
            return results
            
        import json
        m = json.loads(meta_p.read_text())
        
        # Create metadata lookup maps
        cam_map = {p: (c or '') for p, c in zip(m.get('paths', []), m.get('camera', []))}
        iso_map = {p: (i if isinstance(i, int) else None) for p, i in zip(m.get('paths', []), m.get('iso', []))}
        f_map = {p: (float(x) if isinstance(x, (int, float)) else None) for p, x in zip(m.get('paths', []), m.get('fnumber', []))}
        place_map = {p: (s or '') for p, s in zip(m.get('paths', []), m.get('place', []))}
        flash_map = {p: (int(x) if isinstance(x, (int, float)) else None) for p, x in zip(m.get('paths', []), m.get('flash', []))}
        wb_map = {p: (int(x) if isinstance(x, (int, float)) else None) for p, x in zip(m.get('paths', []), m.get('white_balance', []))}
        met_map = {p: (int(x) if isinstance(x, (int, float)) else None) for p, x in zip(m.get('paths', []), m.get('metering', []))}
        alt_map = {p: (float(x) if isinstance(x, (int, float)) else None) for p, x in zip(m.get('paths', []), m.get('gps_altitude', []))}
        head_map = {p: (float(x) if isinstance(x, (int, float)) else None) for p, x in zip(m.get('paths', []), m.get('gps_heading', []))}
        sharp_map = {p: (float(x) if isinstance(x, (int, float)) else None) for p, x in zip(m.get('paths', []), m.get('sharpness', []))}
        bright_map = {p: (float(x) if isinstance(x, (int, float)) else None) for p, x in zip(m.get('paths', []), m.get('brightness', []))}

        # Create specialized metadata filter functions
        def _check_iso_range(p: str) -> bool:
            """Check if photo's ISO falls within specified range."""
            if unified_req.iso_min is not None:
                v = iso_map.get(p)
                if v is None or v < int(unified_req.iso_min):
                    return False
            if unified_req.iso_max is not None:
                v = iso_map.get(p)
                if v is None or v > int(unified_req.iso_max):
                    return False
            return True

        def _check_f_range(p: str) -> bool:
            """Check if photo's f-number falls within specified range."""
            if unified_req.f_min is not None:
                v = f_map.get(p)
                if v is None or v < float(unified_req.f_min):
                    return False
            if unified_req.f_max is not None:
                v = f_map.get(p)
                if v is None or v > float(unified_req.f_max):
                    return False
            return True

        def _check_camera_match(p: str) -> bool:
            """Check if photo's camera matches specified filter."""
            if unified_req.camera and unified_req.camera.strip():
                if unified_req.camera.strip().lower() not in (cam_map.get(p,'') or '').lower():
                    return False
            return True

        def _matches_camera_settings(p: str) -> bool:
            """Check camera-related filters: camera, ISO, f-number."""
            return (_check_camera_match(p) and 
                    _check_iso_range(p) and 
                    _check_f_range(p))

        def _check_place_match(p: str) -> bool:
            """Check if photo's place matches specified filter."""
            if unified_req.place and unified_req.place.strip():
                if unified_req.place.strip().lower() not in (place_map.get(p,'') or '').lower():
                    return False
            return True

        def _check_altitude_range(p: str) -> bool:
            """Check if photo's altitude falls within specified range."""
            if unified_req.alt_min is not None or unified_req.alt_max is not None:
                av = alt_map.get(p)
                if av is None:
                    return False
                if unified_req.alt_min is not None and av < float(unified_req.alt_min):
                    return False
                if unified_req.alt_max is not None and av > float(unified_req.alt_max):
                    return False
            return True

        def _check_heading_range(p: str) -> bool:
            """Check if photo's heading falls within specified range."""
            if unified_req.heading_min is not None or unified_req.heading_max is not None:
                hv = head_map.get(p)
                if hv is None:
                    return False
                try:
                    hh = float(hv) % 360.0
                except Exception:
                    hh = hv
                if unified_req.heading_min is not None and hh < float(unified_req.heading_min):
                    return False
                if unified_req.heading_max is not None and hh > float(unified_req.heading_max):
                    return False
            return True

        def _matches_location_filters(p: str) -> bool:
            """Check location-related filters: place, altitude, heading."""
            return (_check_place_match(p) and 
                    _check_altitude_range(p) and 
                    _check_heading_range(p))

        def _check_flash_setting(p: str) -> bool:
            """Check if photo's flash setting matches filter."""
            if unified_req.flash:
                fv = flash_map.get(p)
                if fv is None:
                    return False
                fired = 1 if fv & 1 else 0
                if unified_req.flash == 'fired' and fired != 1:
                    return False
                if unified_req.flash in ('no','noflash') and fired != 0:
                    return False
            return True

        def _check_white_balance(p: str) -> bool:
            """Check if photo's white balance matches filter."""
            if unified_req.wb:
                wv = wb_map.get(p)
                if wv is None:
                    return False
                if unified_req.wb == 'auto' and wv != 0:
                    return False
                if unified_req.wb == 'manual' and wv != 1:
                    return False
            return True

        def _check_metering_mode(p: str) -> bool:
            """Check if photo's metering mode matches filter."""
            if unified_req.metering:
                mv = met_map.get(p)
                if mv is None:
                    return False
                name = str(unified_req.metering).lower()
                mm = {0: 'unknown', 1: 'average', 2: 'center', 3: 'spot', 4: 'multispot', 5: 'pattern', 6: 'partial', 255: 'other'}
                label = mm.get(int(mv), 'other')
                if name not in (label, 'any'):
                    if not (name == 'matrix' and label == 'pattern'):
                        return False
            return True

        def _matches_technical_settings(p: str) -> bool:
            """Check technical camera settings: flash, white balance, metering."""
            return (_check_flash_setting(p) and 
                    _check_white_balance(p) and 
                    _check_metering_mode(p))

        def _check_sharpness_filter(p: str) -> bool:
            """Check if photo meets sharpness requirement."""
            if unified_req.sharp_only:
                sv = sharp_map.get(p)
                if sv is None or sv < 60.0:
                    return False
            return True

        def _check_exposure_filters(p: str) -> bool:
            """Check if photo meets exposure requirements."""
            if unified_req.exclude_under:
                bv = bright_map.get(p)
                if bv is not None and bv < 50.0:
                    return False
            if unified_req.exclude_over:
                bv = bright_map.get(p)
                if bv is not None and bv > 205.0:
                    return False
            return True

        def _matches_quality_filters(p: str) -> bool:
            """Check image quality filters: sharpness, exposure."""
            return (_check_sharpness_filter(p) and 
                    _check_exposure_filters(p))

        def _matches_all_metadata(p: str) -> bool:
            """Combined metadata filter checking all categories."""
            return (_matches_camera_settings(p) and
                    _matches_location_filters(p) and
                    _matches_technical_settings(p) and
                    _matches_quality_filters(p))

        return [r for r in results if _matches_all_metadata(str(r.path))]
        
    except Exception:
        # If metadata filtering fails, return original results
        return results


def _apply_collection_filters(store, results: List, unified_req: UnifiedSearchRequest) -> List:
    """Apply collection-based filters (favorites, tags, people, dates)."""
    out = results
    
    # Favorites filter
    if unified_req.favorites_only:
        try:
            from infra.collections import load_collections
            coll = load_collections(store.index_dir)
            favs = set(coll.get('Favorites', []))
            out = [r for r in out if str(r.path) in favs]
        except Exception:
            pass

    # Tags filter
    if unified_req.tags:
        try:
            from infra.tags import load_tags
            tmap = load_tags(store.index_dir)
            req_tags = set(unified_req.tags) if isinstance(unified_req.tags, list) else {unified_req.tags}
            out = [r for r in out if req_tags.issubset(set(tmap.get(str(r.path), [])))]
        except Exception:
            pass

    # People filter
    try:
        if unified_req.persons and isinstance(unified_req.persons, list) and len(unified_req.persons) > 0:
            sets = []
            for nm in unified_req.persons:
                try:
                    sets.append(set(_face_photos(store.index_dir, str(nm))))
                except Exception:
                    sets.append(set())
            if sets:
                inter = set.intersection(*sets) if len(sets) > 1 else sets[0]
                out = [r for r in out if str(r.path) in inter]
        elif unified_req.person:
            ppl = set(_face_photos(store.index_dir, str(unified_req.person)))
            out = [r for r in out if str(r.path) in ppl]
    except Exception:
        pass

    # Date range filter
    if unified_req.date_from is not None and unified_req.date_to is not None:
        try:
            mmap = {
                sp: float(mt)
                for sp, mt in zip(store.state.paths or [], store.state.mtimes or [])
            }
            out = [
                r
                for r in out
                if unified_req.date_from <= mmap.get(str(r.path), 0.0) <= unified_req.date_to
            ]
        except Exception:
            pass
    
    return out


def _apply_text_and_caption_filters(store, results: List, unified_req: UnifiedSearchRequest, query_value: str) -> List:
    """Apply OCR text and caption-based filters including advanced expression parsing."""
    out = results
    
    # OCR and quoted text filters
    try:
        import json
        texts_map = {}
        if hasattr(store, 'ocr_texts_file') and store.ocr_texts_file.exists():
            d = json.loads(store.ocr_texts_file.read_text())
            texts_map = {p: (t or '') for p, t in zip(d.get('paths', []), d.get('texts', []))}
        
        if unified_req.has_text:
            out = [r for r in out if (texts_map.get(str(r.path), '').strip() != '')]
        
        # Handle quoted text requirements
        import re as _re
        qtext = query_value or ""
        d_parts = _re.findall(r'"([^"]+)"', qtext)
        s_parts = _re.findall(r"'([^']+)'", qtext)
        req = (d_parts or []) + (s_parts or [])
        if req:
            low = {p: texts_map.get(p, '').lower() for p in texts_map.keys()}
            def _has_all(pth: str) -> bool:
                s = low.get(pth, '')
                return all(x.lower() in s for x in req)
            out = [r for r in out if _has_all(str(r.path))]
    except Exception:
        pass

    # Advanced caption expression parsing with boolean logic
    try:
        cap_map = {}
        if store.captions_available() and store.captions_file.exists():
            cd = json.loads(store.captions_file.read_text())
            cap_map = {p: (t or '') for p, t in zip(cd.get('paths', []), cd.get('texts', []))}
        
        if cap_map and query_value:
            # Parse boolean expressions in captions
            out = _parse_caption_expressions(store, out, cap_map, query_value)
    except Exception:
        pass
    
    return out


def _parse_caption_expressions(store, results: List, cap_map: dict, query_value: str) -> List:
    """Parse advanced boolean expressions in caption search."""
    try:
        import shlex
        
        tokens = shlex.split(query_value) if query_value else []
        if not tokens:
            return results
        
        # Step 1: Convert query to RPN notation
        rpn_output = _convert_to_rpn(tokens)
        
        # Step 2: Build evaluation context with all metadata
        evaluation_context = _build_evaluation_context(store, cap_map)
        
        # Step 3: Evaluate each result against the RPN expression
        return [r for r in results if _evaluate_rpn_expression(rpn_output, str(r.path), evaluation_context)]
    except Exception:
        return results


def _convert_to_rpn(tokens: List[str]) -> List[str]:
    """Convert infix tokens to Reverse Polish Notation using shunting yard algorithm."""
    op_set = {'AND', 'OR', 'NOT'}
    precedence = {'NOT': 3, 'AND': 2, 'OR': 1}
    
    # Normalize tokens
    normalized_tokens = []
    for tok in tokens:
        tu = tok.upper()
        if tu in op_set:
            normalized_tokens.append(tu)
        elif tok in ('(', ')'):
            normalized_tokens.append(tok)
        else:
            normalized_tokens.append(tok)
    
    # Apply shunting yard algorithm
    output = []
    stack = []
    for tok in normalized_tokens:
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
    
    return output


def _build_evaluation_context(store, cap_map: dict) -> dict:
    """Build comprehensive evaluation context with all metadata maps."""
    from infra.tags import load_tags
    
    context = {
        'cap_map': cap_map,
        'store_index_dir': store.index_dir,  # Include store index dir for person field
        'tags_map': load_tags(store.index_dir) if store.index_dir else {},
        'person_cache': {},
        'texts_map': {},
        'metadata_maps': {}
    }
    
    # Load OCR texts
    try:
        if hasattr(store, 'ocr_texts_file') and store.ocr_texts_file.exists():
            d = json.loads(store.ocr_texts_file.read_text())
            context['texts_map'] = {p: (t or '') for p, t in zip(d.get('paths', []), d.get('texts', []))}
    except Exception:
        pass
    
    # Build basic metadata maps
    context['metadata_maps']['mtime'] = {p: float(mt) for p, mt in zip(store.state.paths or [], store.state.mtimes or [])}
    
    # Load EXIF metadata
    _load_exif_metadata(store, context['metadata_maps'])
    
    return context


def _load_exif_metadata(store, metadata_maps: dict) -> None:
    """Load EXIF metadata into evaluation context."""
    try:
        meta_p = store.index_dir / 'exif_index.json'
        if not meta_p.exists():
            return
            
        m = json.loads(meta_p.read_text())
        paths = m.get('paths', [])
        
        # Load numeric metadata with type safety
        metadata_maps['iso'] = {p: (i if isinstance(i, int) else None) for p, i in zip(paths, m.get('iso', []))}
        metadata_maps['fnumber'] = {p: (float(x) if isinstance(x, (int, float)) else None) for p, x in zip(paths, m.get('fnumber', []))}
        metadata_maps['width'] = {p: (int(x) if isinstance(x, (int, float)) else None) for p, x in zip(paths, m.get('width', []))}
        metadata_maps['height'] = {p: (int(x) if isinstance(x, (int, float)) else None) for p, x in zip(paths, m.get('height', []))}
        metadata_maps['brightness'] = {p: (float(x) if isinstance(x, (int, float)) else None) for p, x in zip(paths, m.get('brightness', []))}
        metadata_maps['sharpness'] = {p: (float(x) if isinstance(x, (int, float)) else None) for p, x in zip(paths, m.get('sharpness', []))}
        
        # Load string metadata
        metadata_maps['camera'] = {p: (c or '') for p, c in zip(paths, m.get('camera', []))}
        metadata_maps['place'] = {p: (s or '') for p, s in zip(paths, m.get('place', []))}
        
        # Load complex value metadata with conversion
        def _convert_fraction(v):
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
        
        metadata_maps['exposure'] = {p: _convert_fraction(x) for p, x in zip(paths, m.get('exposure', []))}
        metadata_maps['focal'] = {p: _convert_fraction(x) for p, x in zip(paths, m.get('focal', []))}
    except Exception:
        pass


def _evaluate_rpn_expression(rpn_output: List[str], path: str, context: dict) -> bool:
    """Evaluate RPN expression for a single photo path."""
    stack = []
    for token in rpn_output:
        tu = token.upper()
        if tu == 'NOT':
            v = stack.pop() if stack else False
            stack.append(not v)
        elif tu in ('AND', 'OR'):
            b = stack.pop() if stack else False
            a = stack.pop() if stack else False
            stack.append((a and b) if tu == 'AND' else (a or b))
        else:
            stack.append(_evaluate_field_expression(token, path, context))
    
    return bool(stack[-1]) if stack else True


def _evaluate_field_expression(token: str, path: str, context: dict) -> bool:
    """Evaluate a single field expression against a photo path."""
    def _get_document_text(pth: str) -> str:
        from pathlib import Path
        name = Path(pth).name
        return f"{context['cap_map'].get(pth, '')}\n{context['texts_map'].get(pth, '')}\n{name}".lower()
    
    # Simple text search (no field specified)
    if ':' not in token:
        return token.lower() in _get_document_text(path)
    
    try:
        field, value = token.split(':', 1)
        field_value = (value or '').strip().strip('"').strip("'")
        field_name = field.lower()
        
        # Route to appropriate field handler
        if field_name in ('camera', 'place'):
            return _evaluate_string_field(field_name, field_value, path, context)
        elif field_name in ('tag', 'rating'):
            return _evaluate_tag_field(field_name, field_value, path, context)
        elif field_name == 'person':
            return _evaluate_person_field(field_value, path, context)
        elif field_name == 'has_text':
            return _evaluate_text_presence_field(field_value, path, context)
        elif field_name == 'filetype':
            return _evaluate_filetype_field(field_value, path)
        elif field_name in ('iso', 'fnumber', 'width', 'height', 'mtime', 'brightness', 'sharpness', 'exposure', 'focal', 'duration'):
            return _evaluate_numeric_field(field_name, field_value, path, context)
        else:
            # Unknown field - search in document text
            return field_value.lower() in _get_document_text(path)
    except Exception:
        return False


def _evaluate_string_field(field_name: str, field_value: str, path: str, context: dict) -> bool:
    """Evaluate string-based fields like camera and place."""
    field_data = context['metadata_maps'].get(field_name, {}).get(path, '')
    return field_value.lower() in (field_data or '').lower()


def _evaluate_tag_field(field_name: str, field_value: str, path: str, context: dict) -> bool:
    """Evaluate tag-based fields."""
    tags = context['tags_map'].get(path, []) or []
    if field_name == 'tag':
        return field_value in tags
    elif field_name == 'rating':
        return f"rating:{field_value}" in tags
    return False


def _evaluate_person_field(person_name: str, path: str, context: dict) -> bool:
    """Evaluate person field with caching."""
    if person_name not in context['person_cache']:
        try:
            # Get store from context or pass None for backward compatibility
            store_index_dir = context.get('store_index_dir')
            context['person_cache'][person_name] = set(_face_photos(store_index_dir, person_name))
        except Exception:
            context['person_cache'][person_name] = set()
    return path in context['person_cache'].get(person_name, set())


def _evaluate_text_presence_field(field_value: str, path: str, context: dict) -> bool:
    """Evaluate has_text field."""
    has_text = (context['texts_map'].get(path, '').strip() != '')
    if field_value == '' or field_value.lower() in ('1', 'true', 'yes', 'y'):
        return has_text
    return not has_text


def _evaluate_filetype_field(field_value: str, path: str) -> bool:
    """Evaluate filetype field."""
    from pathlib import Path
    ext = (Path(path).suffix or '').lower().lstrip('.')
    return ext == field_value.lower()


def _evaluate_numeric_field(field_name: str, field_value: str, path: str, context: dict) -> bool:
    """Evaluate numeric fields with comparison operators."""
    def _parse_numeric_operator(s: str):
        operators = ['>=', '<=', '>', '<', '=']
        for op in operators:
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
    
    op, target_value = _parse_numeric_operator(field_value)
    if target_value is None or op is None:
        return False
    
    # Get current value for the field
    current_value = _get_numeric_field_value(field_name, path, context)
    if current_value is None:
        return False
    
    try:
        cv = float(current_value)
        if op == '>=':
            return cv >= target_value
        elif op == '<=':
            return cv <= target_value
        elif op == '>':
            return cv > target_value
        elif op == '<':
            return cv < target_value
        elif op == '=':
            return abs(cv - target_value) < 1e-6
        return False
    except Exception:
        return False


def _get_numeric_field_value(field_name: str, path: str, context: dict):
    """Get numeric field value for a specific path."""
    if field_name in context['metadata_maps']:
        return context['metadata_maps'][field_name].get(path)
    elif field_name == 'duration':
        return _get_video_duration(path)
    return None


def _get_video_duration(path: str):
    """Get video duration for duration field."""
    from pathlib import Path
    ext = str(Path(path).suffix or '').lower()
    if ext in ('.mp4', '.mov', '.mkv', '.avi', '.webm'):
        try:
            from adapters.video_processor import get_video_metadata as _gvm
            info = _gvm(Path(path)) or {}
            return float(info.get('duration') or 0.0)
        except Exception:
            return None
    return None


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

    # Extract minimal legacy parameters needed for text filtering and logging
    legacy_params = unified_req.to_legacy_param_dict()
    query_value = (legacy_params.get("query") or "").strip()
    top_k_value = legacy_params.get("top_k", 48)

    # Step 1: Initialize provider and validate directory  
    store, embedder = _initialize_search_provider(unified_req)
    
    # Step 2: Perform semantic search or get all results
    initial_results = _perform_semantic_search(store, embedder, unified_req)
    
    # Step 3: Apply collection-based filters (favorites, tags, people, dates)
    collection_filtered = _apply_collection_filters(store, initial_results, unified_req)
    
    # Step 4: Apply metadata filters (EXIF, camera settings, quality)
    metadata_filtered = _apply_metadata_filters(store, collection_filtered, unified_req)
    
    # Step 5: Apply text and caption filters with advanced expression parsing
    text_filtered = _apply_text_and_caption_filters(store, metadata_filtered, unified_req, query_value)
    
    # Step 6: Apply pagination and format response
    total = len(text_filtered)
    try:
        tk = int(top_k_value) if top_k_value is not None else 12
    except Exception:
        tk = 12
    paginated_results = text_filtered[:tk]

    # Log search and return response
    sid = log_search(
        store.index_dir,
        getattr(embedder, 'index_id', 'default'),
        query_value or "",
        [(str(r.path), float(r.score)) for r in paginated_results]
    )

    return SearchResponse(
        search_id=sid,
        results=[SearchResultItem(path=str(r.path), score=float(r.score)) for r in paginated_results]
    )


# Video Search API
@app.post("/search_video", response_model=SearchResponse)
def api_search_video(
    dir: Optional[str] = None,
    query: Optional[str] = None,
    top_k: Optional[int] = None,
    provider: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> SearchResponse:
    """Search for videos using semantic search on extracted metadata and keyframes.

    Standardized to return SearchResponse (same schema as photo search) for
    consistency across clients.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    query_value = _require(_from_body(body, query, "query"), "query")
    top_k_value = _from_body(body, top_k, "top_k", default=12, cast=lambda v: int(v)) or 12
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    video_store = VideoIndexStore(folder)
    if not video_store.load():
        return SearchResponse(search_id="video-empty", results=[])

    emb_inst = _emb(provider_value, hf_token_value, openai_key_value)
    try:
        qv = emb_inst.embed_text(query_value)
    except Exception as e:
        raise HTTPException(500, f"Embedding failed: {e}")

    results = video_store.search(qv, top_k=top_k_value)
    # Fabricate a search id (video index currently separate from photo log system)
    search_id = f"video-{int(time.time()*1000)}"
    return SearchResponse(
        search_id=search_id,
        results=[SearchResultItem(path=str(r.path), score=float(r.score)) for r in results]
    )


@app.post("/search_video_like", response_model=SearchResponse)
def api_search_video_like(
    dir: Optional[str] = None,
    path: Optional[str] = None,
    top_k: Optional[int] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> SearchResponse:
    """Find visually similar videos based on a reference video.

    Standardized to return SearchResponse for client uniformity. The
    search_id encodes the reference path for traceability.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    path_value = _require(_from_body(body, path, "path"), "path")
    top_k_value = _from_body(body, top_k, "top_k", default=12, cast=lambda v: int(v)) or 12

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    video_store = VideoIndexStore(folder)
    if not video_store.load():
        return SearchResponse(search_id="video-like-empty", results=[])

    results = video_store.search_like(path_value, top_k=top_k_value)
    search_id = f"video-like-{int(time.time()*1000)}"
    return SearchResponse(
        search_id=search_id,
        results=[SearchResultItem(path=str(r.path), score=float(r.score)) for r in results]
    )


"""(End of file)"""
