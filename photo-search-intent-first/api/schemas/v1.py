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
