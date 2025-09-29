"""
API v1 schemas for request/response contracts.

These models are additive and do not change runtime behavior yet.
Endpoints can gradually adopt them via explicit parsing/validation.
"""
from __future__ import annotations

from typing import List, Optional, Annotated, Dict, Any

from pydantic import BaseModel, Field
try:  # Pydantic v2
    from pydantic import model_validator  # type: ignore
except Exception:  # pragma: no cover
    model_validator = None  # type: ignore


class BaseResponse(BaseModel):
    """Base response model for all API responses."""
    ok: bool
    message: Optional[str] = None


class ErrorResponse(BaseResponse):
    """Error response model for API errors."""
    ok: bool = False
    error: Optional[Dict[str, Any]] = None


class SuccessResponse(BaseResponse):
    """Generic success response model."""
    ok: bool = True
    data: Optional[Dict[str, Any]] = None


class IndexResponse(BaseResponse):
    """Response model for index operations."""
    ok: bool = True
    new: int = 0
    updated: int = 0
    total: int = 0
    job_id: Optional[str] = None


class ShareResponse(BaseResponse):
    """Response model for share operations."""
    ok: bool = True
    token: Optional[str] = None
    url: Optional[str] = None
    expires: Optional[str] = None


class FavoriteResponse(BaseResponse):
    """Response model for favorite operations."""
    ok: bool = True
    path: Optional[str] = None
    favorite: bool = False


class TagResponse(BaseResponse):
    """Response model for tag operations."""
    ok: bool = True
    path: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class CollectionResponse(BaseResponse):
    """Response model for collection operations."""
    ok: bool = True
    name: Optional[str] = None
    paths: List[str] = Field(default_factory=list)


class HealthResponse(BaseResponse):
    """Response model for health check operations."""
    ok: bool = True
    uptime_seconds: Optional[int] = None
    version: Optional[str] = None


class SearchRequest(BaseModel):
    dir: str = Field(..., description="Absolute path to the photo directory")
    query: str = Field(..., description="Text query to search for")
    top_k: Annotated[int, Field(ge=1, le=500, description="Number of results to return")] = 12
    provider: Annotated[str, Field(pattern="^(local|huggingface|openai)$", description="Provider for embeddings")] = "local"
    hf_token: Optional[str] = Field(None, description="Hugging Face API token")
    openai_key: Optional[str] = Field(None, description="OpenAI API key")

    # Search strategy flags
    use_fast: bool = Field(default=False, description="Use fast approximate search")
    fast_kind: Optional[Annotated[str, Field(pattern="^(faiss|hnsw|annoy|auto)$")]] = Field(
        None, description="Optional ANN backend hint: faiss|hnsw|annoy|auto"
    )
    use_captions: bool = Field(default=False, description="Use captions for search")
    use_ocr: bool = Field(default=False, description="Use OCR text for search")

    # Post-filters
    favorites_only: bool = Field(default=False, description="Only return favorite photos")
    tags: List[Annotated[str, Field(min_length=1)]] = Field(default_factory=list, description="Filter by tags")
    date_from: Optional[float] = Field(None, description="Filter photos from this date (Unix timestamp)")
    date_to: Optional[float] = Field(None, description="Filter photos until this date (Unix timestamp)")
    camera: Optional[str] = Field(None, description="Filter by camera model")
    iso_min: Optional[Annotated[int, Field(ge=0)]] = Field(None, description="Minimum ISO value")
    iso_max: Optional[Annotated[int, Field(ge=0)]] = Field(None, description="Maximum ISO value")
    f_min: Optional[Annotated[float, Field(ge=0.0)]] = Field(None, description="Minimum f-number")
    f_max: Optional[Annotated[float, Field(ge=0.0)]] = Field(None, description="Maximum f-number")
    flash: Optional[Annotated[str, Field(pattern="^(fired|no|noflash)$")]] = Field(None, description="Flash mode filter")
    wb: Optional[Annotated[str, Field(pattern="^(auto|manual)$")]] = Field(None, description="White balance filter")
    metering: Optional[str] = Field(None, description="Metering mode filter")
    alt_min: Optional[Annotated[float, Field(ge=0.0)]] = Field(None, description="Minimum altitude")
    alt_max: Optional[Annotated[float, Field(ge=0.0)]] = Field(None, description="Maximum altitude")
    heading_min: Optional[Annotated[float, Field(ge=0.0, le=360.0)]] = Field(None, description="Minimum GPS heading in degrees")
    heading_max: Optional[Annotated[float, Field(ge=0.0, le=360.0)]] = Field(None, description="Maximum GPS heading in degrees")
    place: Optional[str] = Field(None, description="Filter by place name")
    has_text: bool = Field(default=False, description="Filter photos that have OCR-extracted text")
    person: Optional[Annotated[str, Field(min_length=1)]] = Field(None, description="Filter by a specific person")
    persons: List[Annotated[str, Field(min_length=1)]] = Field(default_factory=list, description="Filter by multiple persons (all must be present)")
    sharp_only: bool = Field(default=False, description="Only return sharp photos")
    exclude_underexp: bool = Field(default=False, description="Exclude underexposed photos")
    exclude_overexp: bool = Field(default=False, description="Exclude overexposed photos")

    class Config:
        # Support both pydantic v1 and v2
        allow_population_by_field_name = True  # pydantic v1
        populate_by_name = True  # pydantic v2


class SearchResultItem(BaseModel):
    path: str
    score: float


class SearchResponse(BaseModel):
    search_id: Optional[str] = None
    results: List[SearchResultItem] = []
    cached: bool = False
    cache_key: Optional[str] = None
    fast_backend: Optional[str] = None
    fast_fallback: Optional[bool] = None


class IndexRequest(BaseModel):
    """Index build/update request.

    Canonical field is now 'directory'; legacy clients still send 'dir'.
    We accept either and normalize so existing code using `.dir` continues to work.
    """

    # Deprecated: prefer 'directory'
    dir: Optional[str] = Field(default=None, description="Deprecated; use 'directory' instead")
    directory: Optional[str] = Field(
        default=None,
        alias="directory",
        description="Absolute path to the photo directory",
    )
    provider: str = "local"
    batch_size: Annotated[int, Field(ge=1, le=2048)] = 32
    hf_token: Optional[str] = None
    openai_key: Optional[str] = None

    if model_validator:  # Pydantic v2 path
        @model_validator(mode="after")  # type: ignore
        def _unify_directory(self):  # type: ignore
            if not self.dir and self.directory:
                self.dir = self.directory
            if not self.dir:
                raise ValueError("directory required")
            return self

    class Config:
        allow_population_by_field_name = True  # pydantic v1
        populate_by_name = True  # pydantic v2


class TagsRequest(BaseModel):
    """Tag mutation request.

    New canonical field is 'directory'; legacy clients still send 'dir'.
    We accept either and normalize so existing code using `.dir` continues to work.
    """

    # Deprecated: prefer 'directory'
    dir: Optional[str] = Field(default=None, description="Deprecated; use 'directory' instead")
    directory: Optional[str] = Field(default=None, alias="directory", description="Absolute path to the photo directory")
    path: str
    tags: List[str]

    if model_validator:  # Pydantic v2 path
        @model_validator(mode="after")  # type: ignore
        def _unify_directory(self):  # type: ignore
            if not self.dir and self.directory:
                self.dir = self.directory
            if not self.dir:
                raise ValueError("directory required")
            return self

    class Config:
        allow_population_by_field_name = True  # pydantic v1
        populate_by_name = True  # pydantic v2


class FavoritesRequest(BaseModel):
    """Favorite toggle request with directory alias migration."""

    dir: Optional[str] = Field(default=None, description="Deprecated; use 'directory'")
    directory: Optional[str] = Field(default=None, alias="directory", description="Absolute path to the photo directory")
    path: str
    favorite: bool = True

    if model_validator:  # Pydantic v2 path
        @model_validator(mode="after")  # type: ignore
        def _unify_directory(self):  # type: ignore
            if not self.dir and self.directory:
                self.dir = self.directory
            if not self.dir:
                raise ValueError("directory required")
            return self

    class Config:
        allow_population_by_field_name = True  # pydantic v1
        populate_by_name = True  # pydantic v2


class ShareRequest(BaseModel):
    """Share request with directory alias migration."""

    dir: Optional[str] = Field(default=None, description="Deprecated; use 'directory'")
    directory: Optional[str] = Field(default=None, alias="directory", description="Absolute path to the photo directory")
    # Accept new 'directory' name or legacy 'dir' for backward compatibility
    provider: str = "local"
    paths: List[str] = Field(default_factory=list)
    expiry_hours: int = 24
    password: Optional[str] = None
    view_only: bool = True

    if model_validator:  # Pydantic v2 path
        @model_validator(mode="after")  # type: ignore
        def _unify_directory(self):  # type: ignore
            if not self.dir and self.directory:
                self.dir = self.directory
            if not self.dir:
                raise ValueError("directory required")
            return self

    class Config:
        allow_population_by_field_name = True  # pydantic v1
        populate_by_name = True  # pydantic v2


class ShareRevokeRequest(BaseModel):
    """Request to revoke a share token."""
    token: str

    class Config:
        allow_population_by_field_name = True  # pydantic v1
        populate_by_name = True  # pydantic v2


class CachedSearchRequest(SearchRequest):
    """Search request with additional cache parameters."""
    cache_key: Optional[str] = None
    use_captions: bool = False
    use_ocr: bool = False
    use_fast: bool = False
    fast_kind: Optional[str] = None

    class Config:
        allow_population_by_field_name = True  # pydantic v1
        populate_by_name = True  # pydantic v2


class WorkspaceSearchRequest(SearchRequest):
    """Search request for workspace functionality."""
    # Additional parameters specific to workspace search
    favorites_only: bool = False
    tags: List[str] = Field(default_factory=list)
    date_from: Optional[float] = None
    date_to: Optional[float] = None
    place: Optional[str] = None
    has_text: bool = False
    person: Optional[str] = None
    persons: List[str] = Field(default_factory=list)

    class Config:
        allow_population_by_field_name = True  # pydantic v1
        populate_by_name = True  # pydantic v2


__all__ = [
    "BaseResponse",
    "ErrorResponse",
    "SuccessResponse",
    "IndexResponse",
    "ShareResponse",
    "FavoriteResponse",
    "TagResponse",
    "CollectionResponse",
    "HealthResponse",
    "SearchRequest",
    "SearchResponse",
    "SearchResultItem",
    "IndexRequest",
    "TagsRequest",
    "FavoritesRequest",
    "ShareRequest",
    "ShareRevokeRequest",
    "CachedSearchRequest",
    "WorkspaceSearchRequest",
]
