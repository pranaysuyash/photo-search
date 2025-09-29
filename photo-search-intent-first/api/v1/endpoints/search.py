"""
Search-related endpoints for API v1.
"""
from fastapi import APIRouter, Body
from typing import Dict, Any

from api.schemas.v1 import SearchRequest, SearchResponse

# Create router for search endpoints
search_router = APIRouter(prefix="/search", tags=["search"])


@search_router.post("/", response_model=SearchResponse)
async def search_v1(
    request: SearchRequest = Body(...)
) -> SearchResponse:
    """
    Search for photos using semantic similarity and advanced filtering.
    API v1 endpoint - implementation to be added later to maintain full compatibility.
    """
    # This is a placeholder; the actual implementation will be added later
    # For now, we just return a response that shows the v1 endpoint is working
    return SearchResponse(
        search_id="v1_search_placeholder",
        results=[],
        cached=False
    )


@search_router.post("/cached")
async def search_cached_v1(
    request: SearchRequest = Body(...)
) -> Dict[str, Any]:
    """
    Cached search that reuses previous results when possible.
    API v1 endpoint - implementation to be added later to maintain full compatibility.
    """
    # Placeholder implementation
    return {"message": "V1 cached search endpoint", "query": request.query}