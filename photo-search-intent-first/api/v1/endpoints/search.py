"""
Search-related endpoints for API v1.
"""
from fastapi import APIRouter, Body, HTTPException
from typing import Dict, Any, Optional

from api.schemas.v1 import SearchRequest, SearchResponse, SearchResultItem, CachedSearchRequest
from api.orchestrators.search_orchestrator import SearchOrchestrator
from api.models.search import SearchRequest as NewSearchRequest, SearchProvider
from adapters.provider_factory import get_provider
from usecases.index_photos import index_photos
from api.utils import _emb
from api.runtime_flags import is_offline
from pathlib import Path
import json

# Create router for search endpoints
search_router = APIRouter(prefix="/search", tags=["search"])


@search_router.post("/", response_model=SearchResponse)
async def search_v1(
    request: SearchRequest = Body(...)
) -> SearchResponse:
    """
    Search for photos using semantic similarity and advanced filtering.
    """
    # Validate directory
    if not request.dir:
        raise HTTPException(400, "Directory path is required")
    
    folder = Path(request.dir).expanduser().resolve()
    
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

    emb = _emb(request.provider, request.hf_token, request.openai_key)
    
    # Enforce local provider in offline mode
    if is_offline():
        request.provider = "local"
        emb = _emb(request.provider, request.hf_token, request.openai_key)
    
    from infra.index_store import IndexStore  # Lazy import to prevent mutex issues
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()

    # Primary semantic search
    if request.use_fast:
        # Using fast index (to be implemented)
        results = store.search(emb, request.query, request.top_k)
    else:
        if request.use_captions and store.captions_available():
            results = store.search_with_captions(emb, request.query, request.top_k)
        elif request.use_ocr and store.ocr_available():
            results = store.search_with_ocr(emb, request.query, request.top_k)
        else:
            results = store.search(emb, request.query, request.top_k)

    out = results

    # Apply filters if specified
    # Favorites filter
    if request.favorites_only:
        try:
            from infra.collections import load_collections
            coll = load_collections(store.index_dir)
            favs = set(coll.get('Favorites', []))
            out = [r for r in out if str(r.path) in favs]
        except Exception:
            pass

    # Tags filter
    if request.tags:
        try:
            from infra.tags import load_tags
            tmap = load_tags(store.index_dir)
            req_tags = set(request.tags)
            out = [r for r in out if req_tags.issubset(set(tmap.get(str(r.path), [])))]
        except Exception:
            pass

    # People filter
    try:
        if request.persons and len(request.persons) > 0:
            from infra.faces import photos_for_person as _face_photos
            sets = []
            for nm in request.persons:
                try:
                    sets.append(set(_face_photos(store.index_dir, str(nm))))
                except Exception:
                    sets.append(set())
            if sets:
                inter = set.intersection(*sets) if len(sets) > 1 else sets[0]
                out = [r for r in out if str(r.path) in inter]
        elif request.person:
            from infra.faces import photos_for_person as _face_photos
            ppl = set(_face_photos(store.index_dir, str(request.person)))
            out = [r for r in out if str(r.path) in ppl]
    except Exception:
        pass

    # Date range filter
    if request.date_from is not None and request.date_to is not None:
        try:
            mmap = {
                sp: float(mt)
                for sp, mt in zip(store.state.paths or [], store.state.mtimes or [])
            }
            out = [
                r
                for r in out
                if request.date_from <= mmap.get(str(r.path), 0.0) <= request.date_to
            ]
        except Exception:
            pass

    # EXIF and quality filters (simplified implementation)
    try:
        meta_p = store.index_dir / 'exif_index.json'
        if meta_p.exists() and any([
            request.camera,
            request.iso_min is not None, request.iso_max is not None,
            request.f_min is not None, request.f_max is not None,
            request.place,
            request.flash, request.wb, request.metering,
            request.alt_min is not None, request.alt_max is not None,
            request.heading_min is not None, request.heading_max is not None,
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
                if request.camera and request.camera.strip():
                    if request.camera.strip().lower() not in (cam_map.get(p,'') or '').lower():
                        return False
                if request.iso_min is not None:
                    v = iso_map.get(p)
                    if v is None or v < int(request.iso_min):
                        return False
                if request.iso_max is not None:
                    v = iso_map.get(p)
                    if v is None or v > int(request.iso_max):
                        return False
                if request.f_min is not None:
                    v = f_map.get(p)
                    if v is None or v < float(request.f_min):
                        return False
                if request.f_max is not None:
                    v = f_map.get(p)
                    if v is None or v > float(request.f_max):
                        return False
                if request.place and request.place.strip():
                    if request.place.strip().lower() not in (place_map.get(p,'') or '').lower():
                        return False
                if request.flash:
                    fv = flash_map.get(p)
                    if fv is None:
                        return False
                    fired = 1 if fv & 1 else 0
                    if request.flash == 'fired' and fired != 1:
                        return False
                    if request.flash in ('no','noflash') and fired != 0:
                        return False
                if request.wb:
                    wv = wb_map.get(p)
                    if wv is None:
                        return False
                    if request.wb == 'auto' and wv != 0:
                        return False
                    if request.wb == 'manual' and wv != 1:
                        return False
                if request.metering:
                    mv = met_map.get(p)
                    if mv is None:
                        return False
                    name = str(request.metering).lower()
                    mm = {0: 'unknown', 1: 'average', 2: 'center', 3: 'spot', 4: 'multispot', 5: 'pattern', 6: 'partial', 255: 'other'}
                    label = mm.get(int(mv), 'other')
                    if name not in (label, 'any'):
                        if not (name == 'matrix' and label == 'pattern'):
                            return False
                if request.alt_min is not None or request.alt_max is not None:
                    av = alt_map.get(p)
                    if av is None:
                        return False
                    if request.alt_min is not None and av < float(request.alt_min):
                        return False
                    if request.alt_max is not None and av > float(request.alt_max):
                        return False
                if request.heading_min is not None or request.heading_max is not None:
                    hv = head_map.get(p)
                    if hv is None:
                        return False
                    try:
                        hh = float(hv) % 360.0
                    except Exception:
                        hh = hv
                    if request.heading_min is not None and hh < float(request.heading_min):
                        return False
                    if request.heading_max is not None and hh > float(request.heading_max):
                        return False
                if request.sharp_only:
                    sv = sharp_map.get(p)
                    if sv is None or sv < 60.0:
                        return False
                if request.exclude_underexp:
                    bv = bright_map.get(p)
                    if bv is not None and bv < 50.0:
                        return False
                if request.exclude_overexp:
                    bv = bright_map.get(p)
                    if bv is not None and bv > 205.0:
                        return False
                return True

            out = [r for r in out if _matches_meta(str(r.path))]
    except Exception:
        pass

    # OCR and quoted text filters
    try:
        texts_map = {}
        if hasattr(store, 'ocr_texts_file') and store.ocr_texts_file.exists():
            d = json.loads(store.ocr_texts_file.read_text())
            texts_map = {p: (t or '') for p, t in zip(d.get('paths', []), d.get('texts', []))}
        if request.has_text:
            out = [r for r in out if (texts_map.get(str(r.path), '').strip() != '')]
    except Exception:
        pass

    # Truncate results to requested top_k
    results = out[:request.top_k]
    
    # Convert to response format
    result_items = [SearchResultItem(path=str(r.path), score=float(r.score)) for r in results]
    
    # For now, we don't have a proper search ID generation mechanism 
    # but we can generate a simple one or use a placeholder
    import uuid
    search_id = f"v1_search_{uuid.uuid4().hex[:8]}"
    
    return SearchResponse(
        search_id=search_id,
        results=result_items,
        cached=False,  # In a real implementation, this would track if results came from cache
        provider=request.provider,
        offline_mode=is_offline()
    )


@search_router.post("/cached", response_model=SearchResponse)
async def search_cached_v1(
    request: CachedSearchRequest = Body(...)
) -> SearchResponse:
    """
    Cached search that reuses previous results when possible.
    """
    # Validate directory
    if not request.dir:
        raise HTTPException(400, "Directory path is required")
    
    folder = Path(request.dir).expanduser().resolve()
    
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

    emb = _emb(request.provider, request.hf_token, request.openai_key)
    
    # Enforce local provider in offline mode
    if is_offline():
        request.provider = "local"
        emb = _emb(request.provider, request.hf_token, request.openai_key)
    
    from infra.index_store import IndexStore  # Lazy import to prevent mutex issues
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()

    # In a real implementation, we would check for cached results first
    # For now, we'll implement the same search logic but mark as cached=True
    results = store.search(emb, request.query, request.top_k)
    
    # Convert to response format
    result_items = [SearchResultItem(path=str(r.path), score=float(r.score)) for r in results[:request.top_k]]
    
    import uuid
    search_id = f"v1_cached_search_{uuid.uuid4().hex[:8]}"
    
    return SearchResponse(
        search_id=search_id,
        results=result_items,
        cached=True,  # Mark as cached since this is the cached endpoint
        provider=request.provider,
        offline_mode=is_offline()
    )