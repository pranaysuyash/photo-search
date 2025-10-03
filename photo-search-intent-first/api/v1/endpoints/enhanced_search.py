"""
Enhanced Search-related endpoints for API v1.
"""
from fastapi import APIRouter, Body, HTTPException, Depends
from typing import Dict, Any, Optional, List
from pydantic import BaseModel

from api.schemas.v1 import SearchRequest, SearchResponse, SearchResultItem
from api.utils import _emb, _require, _from_body
from api.auth import require_auth
from infra.index_store import IndexStore
from services.enhanced_search import EnhancedSearchService
from pathlib import Path


# Create router for enhanced search endpoints
enhanced_search_router = APIRouter(prefix="/enhanced_search", tags=["enhanced_search"])


class TemporalSearchParams(BaseModel):
    """Parameters for temporal search."""
    query_time: Optional[float] = None
    time_window_hours: float = 24.0
    season: Optional[str] = None
    time_of_day: Optional[str] = None
    year: Optional[int] = None
    month: Optional[int] = None


class StyleSimilarityParams(BaseModel):
    """Parameters for style similarity search."""
    reference_path: str
    top_k: int = 12
    style_weight: float = 0.3
    color_weight: float = 0.4
    texture_weight: float = 0.3


class CombinedSearchParams(BaseModel):
    """Parameters for combined search."""
    query: str
    temporal_params: Optional[TemporalSearchParams] = None
    style_reference: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None
    top_k: int = 12


@enhanced_search_router.post("/temporal", response_model=SearchResponse)
def temporal_search_v1(
    dir: str = Body(..., embed=True),
    query_time: Optional[float] = None,
    time_window_hours: float = 24.0,
    season: Optional[str] = None,
    time_of_day: Optional[str] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    top_k: int = 12,
    _auth = Depends(require_auth)
) -> SearchResponse:
    """
    Search for photos based on temporal criteria.
    """
    folder = Path(dir).expanduser().resolve()
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    store = IndexStore(folder)
    store.load()
    service = EnhancedSearchService(store)
    
    results = service.temporal_search(
        query_time=query_time,
        time_window_hours=time_window_hours,
        season=season,
        time_of_day=time_of_day,
        year=year,
        month=month
    )
    
    # Limit results to top_k
    limited_results = results[:top_k]
    
    # Convert to response format
    result_items = [SearchResultItem(path=str(r.path), score=float(r.score)) for r in limited_results]
    
    import uuid
    search_id = f"temporal_search_{uuid.uuid4().hex[:8]}"
    
    return SearchResponse(
        search_id=search_id,
        results=result_items,
        cached=False,
        provider="local",
        offline_mode=True
    )


@enhanced_search_router.post("/style_similarity", response_model=SearchResponse)
def style_similarity_search_v1(
    dir: str = Body(..., embed=True),
    reference_path: str = Body(...),
    top_k: int = 12,
    style_weight: float = 0.3,
    color_weight: float = 0.4,
    texture_weight: float = 0.3,
    _auth = Depends(require_auth)
) -> SearchResponse:
    """
    Search for photos with similar visual style to a reference photo.
    """
    folder = Path(dir).expanduser().resolve()
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    # Validate reference path
    ref_path = Path(reference_path)
    if not ref_path.exists():
        raise HTTPException(400, "Reference photo not found")
    
    store = IndexStore(folder)
    store.load()
    service = EnhancedSearchService(store)
    
    try:
        results = service.style_similarity_search(
            reference_path=reference_path,
            top_k=top_k,
            style_weight=style_weight,
            color_weight=color_weight,
            texture_weight=texture_weight
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to perform style similarity search: {str(e)}")
    
    # Convert to response format
    result_items = [SearchResultItem(path=str(r.path), score=float(r.score)) for r in results]
    
    import uuid
    search_id = f"style_similarity_search_{uuid.uuid4().hex[:8]}"
    
    return SearchResponse(
        search_id=search_id,
        results=result_items,
        cached=False,
        provider="local",
        offline_mode=True
    )


@enhanced_search_router.post("/combined", response_model=SearchResponse)
def combined_search_v1(
    dir: str = Body(..., embed=True),
    query: str = Body(...),
    provider: str = "local",
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    temporal_params: Optional[TemporalSearchParams] = None,
    style_reference: Optional[str] = None,
    filters: Optional[Dict[str, Any]] = None,
    top_k: int = 12,
    _auth = Depends(require_auth)
) -> SearchResponse:
    """
    Perform a combined search using multiple criteria.
    """
    folder = Path(dir).expanduser().resolve()
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    service = EnhancedSearchService(store)
    
    # Convert temporal params to dict if provided
    temporal_dict = temporal_params.dict() if temporal_params else None
    
    try:
        results = service.combined_search(
            query=query,
            embedder=emb,
            temporal_params=temporal_dict,
            style_reference=style_reference,
            filters=filters,
            top_k=top_k
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to perform combined search: {str(e)}")
    
    # Convert to response format
    result_items = [SearchResultItem(path=str(r.path), score=float(r.score)) for r in results]
    
    import uuid
    search_id = f"combined_search_{uuid.uuid4().hex[:8]}"
    
    return SearchResponse(
        search_id=search_id,
        results=result_items,
        cached=False,
        provider=provider,
        offline_mode=False
    )


@enhanced_search_router.get("/similar_times", response_model=SearchResponse)
def find_photos_from_similar_times_v1(
    dir: str,
    reference_photo: str,
    time_window_hours: float = 24.0,
    top_k: int = 12,
    _auth = Depends(require_auth)
) -> SearchResponse:
    """
    Find photos taken around the same time as a reference photo.
    """
    folder = Path(dir).expanduser().resolve()
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    ref_path = Path(reference_photo)
    if not ref_path.exists():
        raise HTTPException(400, "Reference photo not found")
    
    store = IndexStore(folder)
    store.load()
    service = EnhancedSearchService(store)
    
    # Get the timestamp of the reference photo
    try:
        ref_time = ref_path.stat().st_mtime
    except Exception:
        raise HTTPException(400, "Could not get timestamp of reference photo")
    
    # Search for temporally similar photos
    results = service.temporal_search(
        query_time=ref_time,
        time_window_hours=time_window_hours
    )
    
    # Remove the reference photo from results
    results = [r for r in results if str(r.path) != reference_photo][:top_k]
    
    # Convert to response format
    result_items = [SearchResultItem(path=str(r.path), score=float(r.score)) for r in results]
    
    import uuid
    search_id = f"similar_times_search_{uuid.uuid4().hex[:8]}"
    
    return SearchResponse(
        search_id=search_id,
        results=result_items,
        cached=False,
        provider="local",
        offline_mode=True
    )


@enhanced_search_router.get("/seasonal", response_model=SearchResponse)
def seasonal_search_v1(
    dir: str,
    season: str,
    year: Optional[int] = None,
    top_k: int = 12,
    _auth = Depends(require_auth)
) -> SearchResponse:
    """
    Find photos from a specific season.
    """
    folder = Path(dir).expanduser().resolve()
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    store = IndexStore(folder)
    store.load()
    service = EnhancedSearchService(store)
    
    results = service.temporal_search(
        season=season,
        year=year
    )
    
    # Limit results to top_k
    limited_results = results[:top_k]
    
    # Convert to response format
    result_items = [SearchResultItem(path=str(r.path), score=float(r.score)) for r in limited_results]
    
    import uuid
    search_id = f"seasonal_search_{uuid.uuid4().hex[:8]}"
    
    return SearchResponse(
        search_id=search_id,
        results=result_items,
        cached=False,
        provider="local",
        offline_mode=True
    )