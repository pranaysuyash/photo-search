"""
API v1 schemas for request/response contracts.

These models are additive and do not change runtime behavior yet.
Endpoints can gradually adopt them via explicit parsing/validation.
"""
from __future__ import annotations

from typing import List, Optional, Annotated

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    dir: str = Field(..., description="Absolute path to the photo directory")
    query: str = Field(..., description="Text query to search for")
    top_k: Annotated[int, Field(ge=1, le=500)] = 12
    provider: str = "local"
    hf_token: Optional[str] = None
    openai_key: Optional[str] = None

    # Search strategy flags
    use_fast: bool = False
    fast_kind: Optional[str] = Field(
        None, description="Optional ANN backend hint: faiss|hnsw|annoy"
    )
    use_captions: bool = False
    use_ocr: bool = False

    # Post-filters
    favorites_only: bool = False
    tags: List[str] = Field(default_factory=list)
    date_from: Optional[float] = None
    date_to: Optional[float] = None
    camera: Optional[str] = None
    iso_min: Optional[int] = None
    iso_max: Optional[int] = None
    f_min: Optional[float] = None
    f_max: Optional[float] = None
    flash: Optional[str] = None
    wb: Optional[str] = None
    metering: Optional[str] = None
    alt_min: Optional[float] = None
    alt_max: Optional[float] = None
    heading_min: Optional[float] = None
    heading_max: Optional[float] = None
    place: Optional[str] = None
    has_text: bool = False
    person: Optional[str] = None
    persons: List[str] = Field(default_factory=list)
    sharp_only: bool = False
    exclude_underexp: bool = False
    exclude_overexp: bool = False


class SearchResultItem(BaseModel):
    path: str
    score: float


class SearchResponse(BaseModel):
    search_id: Optional[str] = None
    results: List[SearchResultItem] = []
    cached: bool = False
    cache_key: Optional[str] = None


class IndexRequest(BaseModel):
    dir: str
    provider: str = "local"
    batch_size: Annotated[int, Field(ge=1, le=2048)] = 32
    hf_token: Optional[str] = None
    openai_key: Optional[str] = None


class TagsRequest(BaseModel):
    dir: str
    path: str
    tags: List[str]


class FavoritesRequest(BaseModel):
    dir: str
    path: str
    favorite: bool = True


__all__ = [
    "SearchRequest",
    "SearchResponse",
    "SearchResultItem",
    "IndexRequest",
    "TagsRequest",
    "FavoritesRequest",
]
