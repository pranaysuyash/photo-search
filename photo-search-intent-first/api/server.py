from __future__ import annotations

import json
import logging
import os
import time
import time
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Optional, TypeVar

logger = logging.getLogger(__name__)

# Set environment variables to prevent threading/mutex issues with ML libraries
# IMPORTANT: These must be set BEFORE any ML library imports
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("VECLIB_MAXIMUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")
os.environ.setdefault("TORCH_NUM_THREADS", "1")
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "")

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
from api.routers.admin import router as admin_router
from infra.analytics import log_search
from infra.collections import load_collections
from infra.config import config
# Lazy import: from infra.index_store import IndexStore  # imports numpy
from infra.fast_index import FastIndexManager
from infra.tags import load_tags
from infra.trips import build_trips as _build_trips, load_trips as _load_trips
# Lazy import: from infra.faces import (...  # imports numpy and PIL
# Lazy import: from infra.shares import (...
# Lazy import: from infra.edits import EditOps  # imports PIL
from usecases.manage_saved import load_saved, save_saved

# Import refactored services
from api.dependencies import (
    get_directory_scanner,
    get_search_executor,
    get_media_scanner,
    get_expression_evaluator,
)
from usecases.manage_presets import load_presets, save_presets
from usecases.index_photos import index_photos  # noqa: F401 (potential future use)
from services.directory_scanner import DirectoryScanner
from services.search_executor import SearchExecutor
from services.media_scanner import MediaScanner
from services.rpn_expression_evaluator import RPNExpressionEvaluator
# Lazy import: from infra.video_index_store import VideoIndexStore  # imports numpy

# Global service instances
directory_scanner = DirectoryScanner()
search_executor = SearchExecutor()
media_scanner = MediaScanner()
rpn_evaluator = RPNExpressionEvaluator()
# Lazy import: from infra.thumbs import get_or_create_thumb, get_or_create_face_thumb
# Lazy import: from infra.faces import load_faces as _faces_load
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
# Lazy import: from PIL import Image, ExifTags  # Can cause threading issues if imported at top level

# Supported extension constants (import with safe fallback)
try:
    from infra.constants import SUPPORTED_EXTS, SUPPORTED_VIDEO_EXTS  # type: ignore
except Exception:  # pragma: no cover - fallback values
    SUPPORTED_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".tif", ".tiff", ".bmp"}
    SUPPORTED_VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".avi", ".webm"}

# Initialize app early (was missing due to prior broken edits)
_APP_START = time.time()
app = FastAPI(title="Photo Search API")

from api.runtime_flags import set_offline, is_offline
set_offline(True)


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
app.include_router(admin_router)

# Mount versioned API router
app.include_router(api_v1)

# Mount static files for React app
web_dir = Path(__file__).parent / "web"
if web_dir.exists():
    app.mount("/app", StaticFiles(directory=str(web_dir), html=True), name="static")

T = TypeVar("T")


# Removed local _zip_meta (use imported) and duplicate health/ping endpoints (handled by health_router)

# Demo directory helper
@app.get("/demo/dir", response_model=SuccessResponse)
def api_demo_dir() -> SuccessResponse:
    try:
        demo = Path(__file__).resolve().parent.parent / "demo_photos"
        exists = demo.exists() and demo.is_dir()
        return SuccessResponse(
            ok=True,
            data={"path": str(demo), "exists": bool(exists), "ready": bool(exists)}
        )
    except Exception as e:
        logger.error(f"Error getting demo directory: {e}")
        return SuccessResponse(ok=False, message=str(e))

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
    scanner = get_directory_scanner()
    return scanner.get_default_photo_directories()


def _scan_media_counts(paths: List[str], include_videos: bool = True) -> Dict[str, Any]:
    """Count image/video files and bytes for quick previews; privacy-friendly."""
    scanner = get_media_scanner()
    return scanner.scan_media_counts(paths, include_videos)


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
        
        # Enforce local provider in offline mode
        provider = unified_req.provider
        if is_offline():
            provider = "local"
        
        embedder = get_provider(provider, **kwargs)
        dir_p = _validate_search_directory(unified_req.directory)
        
        from infra.index_store import IndexStore
        store = IndexStore(dir_p)
        
        return store, embedder
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Provider initialization failed: {e}")


def _perform_semantic_search(store, embedder, unified_req: UnifiedSearchRequest) -> List:
    """Perform the core semantic search operation with all search modes."""
    executor = get_search_executor()
    return executor.execute(store, embedder, unified_req)


def _apply_metadata_filters(store, results: List, unified_req: UnifiedSearchRequest) -> List:
    """Apply EXIF and metadata-based filters to search results."""
    try:
        # Early return if no metadata file exists
        meta_p = store.index_dir / 'exif_index.json'
        if not meta_p.exists():
            return results
            
        # Check if any metadata filtering is needed
        if not _needs_metadata_filtering(unified_req):
            return results
            
        # Load metadata maps
        metadata_maps = _load_metadata_maps(meta_p)
        
        # Create and apply filters
        filter_func = _create_metadata_filter(unified_req, metadata_maps)
        return [r for r in results if filter_func(str(r.path))]
        
    except Exception:
        # If metadata filtering fails, return original results
        return results


def _needs_metadata_filtering(unified_req: UnifiedSearchRequest) -> bool:
    """Check if any metadata-based filtering is requested."""
    return any([
        unified_req.camera,
        unified_req.iso_min is not None, unified_req.iso_max is not None,
        unified_req.f_min is not None, unified_req.f_max is not None,
        unified_req.place,
        unified_req.flash, unified_req.wb, unified_req.metering,
        unified_req.alt_min is not None, unified_req.alt_max is not None,
        unified_req.heading_min is not None, unified_req.heading_max is not None,
        unified_req.sharp_only, unified_req.exclude_under, unified_req.exclude_over,
    ])


def _load_metadata_maps(meta_path) -> dict:
    """Load and create metadata lookup maps from EXIF index."""
    import json
    m = json.loads(meta_path.read_text())
    paths = m.get('paths', [])
    
    return {
        'cam_map': _create_string_map(paths, m.get('camera', [])),
        'iso_map': _create_int_map(paths, m.get('iso', [])),
        'f_map': _create_float_map(paths, m.get('fnumber', [])),
        'place_map': _create_string_map(paths, m.get('place', [])),
        'flash_map': _create_int_map(paths, m.get('flash', [])),
        'wb_map': _create_int_map(paths, m.get('white_balance', [])),
        'met_map': _create_int_map(paths, m.get('metering', [])),
        'alt_map': _create_float_map(paths, m.get('gps_altitude', [])),
        'head_map': _create_float_map(paths, m.get('gps_heading', [])),
        'sharp_map': _create_float_map(paths, m.get('sharpness', [])),
        'bright_map': _create_float_map(paths, m.get('brightness', [])),
    }


def _create_string_map(paths: list, values: list) -> dict:
    """Create a path-to-string mapping with empty string fallback."""
    return {p: (c or '') for p, c in zip(paths, values)}


def _create_int_map(paths: list, values: list) -> dict:
    """Create a path-to-int mapping with None for invalid values."""
    return {p: (int(x) if isinstance(x, (int, float)) else None) for p, x in zip(paths, values)}


def _create_float_map(paths: list, values: list) -> dict:
    """Create a path-to-float mapping with None for invalid values."""
    return {p: (float(x) if isinstance(x, (int, float)) else None) for p, x in zip(paths, values)}


def _create_metadata_filter(unified_req: UnifiedSearchRequest, metadata_maps: dict):
    """Create a combined metadata filter function."""
    def _matches_all_metadata(p: str) -> bool:
        """Combined metadata filter checking all categories."""
        return (_matches_camera_settings(p, unified_req, metadata_maps) and
                _matches_location_filters(p, unified_req, metadata_maps) and
                _matches_technical_settings(p, unified_req, metadata_maps) and
                _matches_quality_filters(p, unified_req, metadata_maps))
    
    return _matches_all_metadata


def _matches_camera_settings(p: str, unified_req: UnifiedSearchRequest, metadata_maps: dict) -> bool:
    """Check camera-related filters: camera, ISO, f-number."""
    return (_check_camera_match(p, unified_req, metadata_maps['cam_map']) and 
            _check_iso_range(p, unified_req, metadata_maps['iso_map']) and 
            _check_f_range(p, unified_req, metadata_maps['f_map']))


def _matches_location_filters(p: str, unified_req: UnifiedSearchRequest, metadata_maps: dict) -> bool:
    """Check location-related filters: place, altitude, heading."""
    return (_check_place_match(p, unified_req, metadata_maps['place_map']) and 
            _check_altitude_range(p, unified_req, metadata_maps['alt_map']) and 
            _check_heading_range(p, unified_req, metadata_maps['head_map']))


def _matches_technical_settings(p: str, unified_req: UnifiedSearchRequest, metadata_maps: dict) -> bool:
    """Check technical camera settings: flash, white balance, metering."""
    return (_check_flash_setting(p, unified_req, metadata_maps['flash_map']) and 
            _check_white_balance(p, unified_req, metadata_maps['wb_map']) and 
            _check_metering_mode(p, unified_req, metadata_maps['met_map']))


def _matches_quality_filters(p: str, unified_req: UnifiedSearchRequest, metadata_maps: dict) -> bool:
    """Check image quality filters: sharpness, exposure."""
    return (_check_sharpness_filter(p, unified_req, metadata_maps['sharp_map']) and 
            _check_exposure_filters(p, unified_req, metadata_maps['bright_map']))


def _check_camera_match(p: str, unified_req: UnifiedSearchRequest, cam_map: dict) -> bool:
    """Check if photo's camera matches specified filter."""
    if unified_req.camera and unified_req.camera.strip():
        if unified_req.camera.strip().lower() not in (cam_map.get(p,'') or '').lower():
            return False
    return True


def _check_iso_range(p: str, unified_req: UnifiedSearchRequest, iso_map: dict) -> bool:
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


def _check_f_range(p: str, unified_req: UnifiedSearchRequest, f_map: dict) -> bool:
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


def _check_place_match(p: str, unified_req: UnifiedSearchRequest, place_map: dict) -> bool:
    """Check if photo's place matches specified filter."""
    if unified_req.place and unified_req.place.strip():
        if unified_req.place.strip().lower() not in (place_map.get(p,'') or '').lower():
            return False
    return True


def _check_altitude_range(p: str, unified_req: UnifiedSearchRequest, alt_map: dict) -> bool:
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


def _check_heading_range(p: str, unified_req: UnifiedSearchRequest, head_map: dict) -> bool:
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


def _check_flash_setting(p: str, unified_req: UnifiedSearchRequest, flash_map: dict) -> bool:
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


def _check_white_balance(p: str, unified_req: UnifiedSearchRequest, wb_map: dict) -> bool:
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


def _check_metering_mode(p: str, unified_req: UnifiedSearchRequest, met_map: dict) -> bool:
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


def _check_sharpness_filter(p: str, unified_req: UnifiedSearchRequest, sharp_map: dict) -> bool:
    """Check if photo meets sharpness requirement."""
    if unified_req.sharp_only:
        sv = sharp_map.get(p)
        if sv is None or sv < 60.0:
            return False
    return True


def _check_exposure_filters(p: str, unified_req: UnifiedSearchRequest, bright_map: dict) -> bool:
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


def _apply_collection_filters(store, results: List, unified_req: UnifiedSearchRequest) -> List:
    """Apply collection-based filters (favorites, tags, people, dates)."""
    output = results
    
    # Apply each filter type sequentially
    output = _apply_favorites_filter(store, output, unified_req)
    output = _apply_tags_filter(store, output, unified_req)
    output = _apply_people_filter(store, output, unified_req)
    output = _apply_date_range_filter(store, output, unified_req)
    
    return output


def _apply_favorites_filter(store, results: List, unified_req: UnifiedSearchRequest) -> List:
    """Apply favorites collection filter."""
    if not unified_req.favorites_only:
        return results
    
    try:
        from infra.collections import load_collections
        collections = load_collections(store.index_dir)
        favorites_set = set(collections.get('Favorites', []))
        return [r for r in results if str(r.path) in favorites_set]
    except Exception:
        return results


def _apply_tags_filter(store, results: List, unified_req: UnifiedSearchRequest) -> List:
    """Apply tags filter."""
    if not unified_req.tags:
        return results
    
    try:
        from infra.tags import load_tags
        tags_map = load_tags(store.index_dir)
        required_tags = set(unified_req.tags) if isinstance(unified_req.tags, list) else {unified_req.tags}
        return [r for r in results if required_tags.issubset(set(tags_map.get(str(r.path), [])))]
    except Exception:
        return results


def _apply_people_filter(store, results: List, unified_req: UnifiedSearchRequest) -> List:
    """Apply people/person filter."""
    # Handle multiple persons (intersection)
    if unified_req.persons and isinstance(unified_req.persons, list) and len(unified_req.persons) > 0:
        return _apply_multiple_persons_filter(store, results, unified_req.persons)
    
    # Handle single person
    if unified_req.person:
        return _apply_single_person_filter(store, results, unified_req.person)
    
    return results


def _apply_multiple_persons_filter(store, results: List, person_names: List[str]) -> List:
    """Apply filter for multiple persons (intersection logic)."""
    try:
        from infra.faces import photos_for_person as _face_photos
        person_photo_sets = []
        for person_name in person_names:
            try:
                photo_set = set(_face_photos(store.index_dir, str(person_name)))
                person_photo_sets.append(photo_set)
            except Exception:
                person_photo_sets.append(set())
        
        if person_photo_sets:
            # Find intersection of all person photo sets
            intersection = set.intersection(*person_photo_sets) if len(person_photo_sets) > 1 else person_photo_sets[0]
            return [r for r in results if str(r.path) in intersection]
        
        return results
    except Exception:
        return results


def _apply_single_person_filter(store, results: List, person_name: str) -> List:
    """Apply filter for single person."""
    try:
        from infra.faces import photos_for_person as _face_photos
        person_photos = set(_face_photos(store.index_dir, str(person_name)))
        return [r for r in results if str(r.path) in person_photos]
    except Exception:
        return results


def _apply_date_range_filter(store, results: List, unified_req: UnifiedSearchRequest) -> List:
    """Apply date range filter."""
    if unified_req.date_from is None or unified_req.date_to is None:
        return results
    
    try:
        # Build mtime map
        mtime_map = {
            path: float(mtime)
            for path, mtime in zip(store.state.paths or [], store.state.mtimes or [])
        }
        
        # Filter by date range
        return [
            r for r in results
            if unified_req.date_from <= mtime_map.get(str(r.path), 0.0) <= unified_req.date_to
        ]
    except Exception:
        return results


def _apply_text_and_caption_filters(store, results: List, unified_req: UnifiedSearchRequest, query_value: str) -> List:
    """Apply OCR text and caption-based filters including advanced expression parsing."""
    output = results
    
    # Apply each filter type sequentially
    output = _apply_ocr_text_filters(store, output, unified_req, query_value)
    output = _apply_caption_expression_filters(store, output, query_value)
    
    return output


def _apply_ocr_text_filters(store, results: List, unified_req: UnifiedSearchRequest, query_value: str) -> List:
    """Apply OCR text-based filters including has_text and quoted text requirements."""
    try:
        texts_map = _load_ocr_texts_map(store)
        
        # Apply has_text filter
        if unified_req.has_text:
            results = [r for r in results if (texts_map.get(str(r.path), '').strip() != '')]
        
        # Apply quoted text requirements filter
        results = _apply_quoted_text_filter(results, texts_map, query_value)
        
        return results
    except Exception:
        return results


def _load_ocr_texts_map(store) -> dict:
    """Load OCR texts mapping from store."""
    import json
    texts_map = {}
    if hasattr(store, 'ocr_texts_file') and store.ocr_texts_file.exists():
        data = json.loads(store.ocr_texts_file.read_text())
        texts_map = {p: (t or '') for p, t in zip(data.get('paths', []), data.get('texts', []))}
    return texts_map


def _apply_quoted_text_filter(results: List, texts_map: dict, query_value: str) -> List:
    """Apply quoted text requirements filter."""
    import re as _re
    
    # Extract quoted text requirements
    query_text = query_value or ""
    double_quoted = _re.findall(r'"([^"]+)"', query_text)
    single_quoted = _re.findall(r"'([^']+)'", query_text)
    required_phrases = (double_quoted or []) + (single_quoted or [])
    
    if not required_phrases:
        return results
    
    # Build lowercase text map for case-insensitive matching
    lowercase_texts = {path: texts_map.get(path, '').lower() for path in texts_map.keys()}
    
    def _has_all_phrases(path: str) -> bool:
        text_content = lowercase_texts.get(path, '')
        return all(phrase.lower() in text_content for phrase in required_phrases)
    
    return [r for r in results if _has_all_phrases(str(r.path))]


def _apply_caption_expression_filters(store, results: List, query_value: str) -> List:
    """Apply advanced caption expression parsing with boolean logic."""
    try:
        caption_map = _load_caption_map(store)
        
        if caption_map and query_value:
            return _parse_caption_expressions(store, results, caption_map, query_value)
        
        return results
    except Exception:
        return results


def _load_caption_map(store) -> dict:
    """Load caption mapping from store."""
    import json
    caption_map = {}
    if store.captions_available() and store.captions_file.exists():
        caption_data = json.loads(store.captions_file.read_text())
        caption_map = {p: (t or '') for p, t in zip(caption_data.get('paths', []), caption_data.get('texts', []))}
    return caption_map


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
    normalized_tokens = _normalize_rpn_tokens(tokens)
    return _apply_shunting_yard_algorithm(normalized_tokens)


def _normalize_rpn_tokens(tokens: List[str]) -> List[str]:
    """Normalize tokens for RPN conversion."""
    op_set = {'AND', 'OR', 'NOT'}
    normalized_tokens = []
    
    for tok in tokens:
        tu = tok.upper()
        if tu in op_set:
            normalized_tokens.append(tu)
        elif tok in ('(', ')'):
            normalized_tokens.append(tok)
        else:
            normalized_tokens.append(tok)
    
    return normalized_tokens


def _apply_shunting_yard_algorithm(tokens: List[str]) -> List[str]:
    """Apply shunting yard algorithm to convert to RPN."""
    precedence = {'NOT': 3, 'AND': 2, 'OR': 1}
    op_set = {'AND', 'OR', 'NOT'}
    
    output = []
    stack = []
    
    for tok in tokens:
        tu = tok.upper()
        
        if tu in op_set:
            _process_operator_token(stack, output, tu, precedence)
        elif tok == '(':
            stack.append(tok)
        elif tok == ')':
            _process_closing_parenthesis(stack, output)
        else:
            output.append(tok)
    
    # Pop remaining operators
    while stack:
        output.append(stack.pop())
    
    return output


def _process_operator_token(stack: List[str], output: List[str], operator: str, precedence: dict) -> None:
    """Process an operator token in shunting yard algorithm."""
    while (stack and 
           stack[-1] != '(' and 
           precedence.get(stack[-1], 0) >= precedence[operator]):
        output.append(stack.pop())
    stack.append(operator)


def _process_closing_parenthesis(stack: List[str], output: List[str]) -> None:
    """Process a closing parenthesis in shunting yard algorithm."""
    while stack and stack[-1] != '(':
        output.append(stack.pop())
    if stack and stack[-1] == '(':
        stack.pop()


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
        exif_data = _load_exif_file_data(store)
        if not exif_data:
            return
        
        paths = exif_data.get('paths', [])
        
        # Load different types of metadata
        _load_numeric_metadata(metadata_maps, paths, exif_data)
        _load_string_metadata(metadata_maps, paths, exif_data)
        _load_fractional_metadata(metadata_maps, paths, exif_data)
    except Exception:
        pass


def _load_exif_file_data(store) -> dict:
    """Load and parse EXIF index file."""
    try:
        exif_file_path = store.index_dir / 'exif_index.json'
        if not exif_file_path.exists():
            return {}
        return json.loads(exif_file_path.read_text())
    except Exception:
        return {}


def _load_numeric_metadata(metadata_maps: dict, paths: list, exif_data: dict) -> None:
    """Load numeric EXIF metadata with type safety."""
    numeric_fields = [
        ('iso', int, 'iso'),
        ('fnumber', float, 'fnumber'),
        ('width', int, 'width'),
        ('height', int, 'height'),
        ('brightness', float, 'brightness'),
        ('sharpness', float, 'sharpness')
    ]
    
    for field_name, field_type, data_key in numeric_fields:
        metadata_maps[field_name] = {
            p: (field_type(x) if isinstance(x, (int, float)) else None)
            for p, x in zip(paths, exif_data.get(data_key, []))
        }


def _load_string_metadata(metadata_maps: dict, paths: list, exif_data: dict) -> None:
    """Load string EXIF metadata."""
    string_fields = [
        ('camera', 'camera'),
        ('place', 'place')
    ]
    
    for field_name, data_key in string_fields:
        metadata_maps[field_name] = {
            p: (value or '') for p, value in zip(paths, exif_data.get(data_key, []))
        }


def _load_fractional_metadata(metadata_maps: dict, paths: list, exif_data: dict) -> None:
    """Load fractional EXIF metadata with conversion."""
    def _convert_fraction_value(v):
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
    
    fractional_fields = [
        ('exposure', 'exposure'),
        ('focal', 'focal')
    ]
    
    for field_name, data_key in fractional_fields:
        metadata_maps[field_name] = {
            p: _convert_fraction_value(x) for p, x in zip(paths, exif_data.get(data_key, []))
        }


def _evaluate_rpn_expression(rpn_output: List[str], path: str, context: dict) -> bool:
    """Evaluate RPN expression for a single photo path."""
    evaluator = get_expression_evaluator()
    return evaluator.evaluate(rpn_output, path, context)


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
            from infra.faces import photos_for_person as _face_photos
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
    
    # Enforce local provider in offline mode
    if is_offline():
        provider_value = "local"

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    from infra.video_index_store import VideoIndexStore
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

    from infra.video_index_store import VideoIndexStore
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
