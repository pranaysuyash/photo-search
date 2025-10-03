"""Unified search request/response models.

These models consolidate the sprawling set of query/body parameters used across
`/search`, `/search/paginated`, and related endpoints. They are introduced in a
backward-compatible fashion: existing endpoints can continue to accept the old
parameter list while internally constructing a `SearchRequest` instance.

Next migration steps (not yet implemented here):
 - Adapt `api_search_paginated` to accept a `SearchRequest` (plus pagination) via
   body JSON while preserving old param style until clients migrate.
 - Remove now-redundant local *_value variables once all logic refers directly
   to the model attributes.
"""
from __future__ import annotations

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator


class SearchFilters(BaseModel):
    # Metadata / EXIF related filters
    camera: Optional[str] = None
    iso_min: Optional[int] = None
    iso_max: Optional[int] = None
    f_min: Optional[float] = None
    f_max: Optional[float] = None
    flash: Optional[str] = None  # 'fired' | 'no' | etc (legacy textual codes)
    wb: Optional[str] = None     # 'auto' | 'manual'
    metering: Optional[str] = None
    alt_min: Optional[float] = None
    alt_max: Optional[float] = None
    heading_min: Optional[float] = None
    heading_max: Optional[float] = None
    place: Optional[str] = None
    sharp_only: Optional[bool] = None
    exclude_underexp: Optional[bool] = Field(None, description="Exclude very dark exposures")
    exclude_overexp: Optional[bool] = Field(None, description="Exclude very bright exposures")
    has_text: Optional[bool] = None
    person: Optional[str] = None
    persons: Optional[List[str]] = None

    @field_validator('persons', mode='before')
    def _norm_persons(cls, v):  # type: ignore
        if v is None:
            return v
        if isinstance(v, str):
            # Allow comma separated fallback
            return [p.strip() for p in v.split(',') if p.strip()]
        return v


class SearchRequest(BaseModel):
    # Core query parameters
    dir: str = Field(..., alias="directory", description="Root directory (deprecated alias: dir)")
    query: str
    top_k: int = 48

    # Provider / embedding config
    provider: str = "local"
    hf_token: Optional[str] = None
    openai_key: Optional[str] = None
    use_fast: bool = False
    fast_kind: Optional[str] = None  # 'faiss' | 'annoy' | 'hnsw'

    # Modalities / retrieval hints
    use_captions: bool = False
    use_ocr: bool = False

    # Simple filters
    favorites_only: bool = False
    tags: List[str] = Field(default_factory=list)
    date_from: Optional[float] = None  # epoch seconds
    date_to: Optional[float] = None

    # Structured EXIF / meta filters
    filters: SearchFilters = Field(default_factory=SearchFilters)

    model_config = ConfigDict(populate_by_name=True, str_strip_whitespace=True)

    def to_legacy_param_dict(self) -> Dict[str, Any]:
        """Return a flat dict approximating the original parameter namespace.

        This is useful while gradually migrating existing internal helper code
        that still expects individual *_value variables.
        """
        f = self.filters
        return {
            'dir': self.dir,
            'query': self.query,
            'top_k': self.top_k,
            'provider': self.provider,
            'hf_token': self.hf_token,
            'openai_key': self.openai_key,
            'use_fast': self.use_fast,
            'fast_kind': self.fast_kind,
            'use_captions': self.use_captions,
            'use_ocr': self.use_ocr,
            'favorites_only': self.favorites_only,
            'tags': self.tags,
            'date_from': self.date_from,
            'date_to': self.date_to,
            # Filter namespace
            'camera': f.camera,
            'iso_min': f.iso_min,
            'iso_max': f.iso_max,
            'f_min': f.f_min,
            'f_max': f.f_max,
            'flash': f.flash,
            'wb': f.wb,
            'metering': f.metering,
            'alt_min': f.alt_min,
            'alt_max': f.alt_max,
            'heading_min': f.heading_min,
            'heading_max': f.heading_max,
            'place': f.place,
            'sharp_only': f.sharp_only,
            'exclude_underexp': f.exclude_underexp,
            'exclude_overexp': f.exclude_overexp,
            'has_text': f.has_text,
            'person': f.person,
            'persons': f.persons,
        }

    @classmethod
    def from_query_params(cls, params: Dict[str, Any]) -> "SearchRequest":
        """Construct from a raw param dict (query string or body union).

        Supports both legacy flat names and nested 'filters.*' style. Legacy
        names take precedence if both are provided.
        """
        # Extract basic fields
        base: Dict[str, Any] = {}
        for key in [
            'dir','directory','query','top_k','provider','hf_token','openai_key','use_fast','fast_kind',
            'use_captions','use_ocr','favorites_only','tags','date_from','date_to']:
            if key in params and params[key] is not None:
                base[key] = params[key]

        # Normalise directory alias. If both provided, prefer legacy 'dir' to
        # avoid surprising existing clients while migration is in progress.
        if 'dir' in base:
            base['directory'] = base['dir']
        elif 'directory' in base:
            base['dir'] = base['directory']

        # Collect filter keys
        filter_keys = [
            'camera','iso_min','iso_max','f_min','f_max','flash','wb','metering','alt_min','alt_max',
            'heading_min','heading_max','place','sharp_only','exclude_underexp','exclude_overexp','has_text',
            'person','persons'
        ]
        filt: Dict[str, Any] = {}
        for fk in filter_keys:
            if fk in params and params[fk] is not None:
                filt[fk] = params[fk]
        # Merge nested style: filters.camera, etc.
        for k, v in params.items():
            if k.startswith('filters.'):
                short = k.split('.',1)[1]
                if short in filter_keys and short not in filt and v is not None:
                    filt[short] = v
        base['filters'] = filt
        return cls(**base)


class SearchResultItem(BaseModel):
    path: str
    score: float


class SearchResponse(BaseModel):
    results: List[SearchResultItem]
    total: Optional[int] = None  # For paginated contexts
    search_id: Optional[str] = None


class PaginatedSearchRequest(SearchRequest):
    """Search request with pagination parameters."""
    limit: int = 24
    offset: int = 0

    @classmethod
    def from_query_params(cls, params: Dict[str, Any]) -> "PaginatedSearchRequest":
        """Construct from a raw param dict, including pagination parameters."""
        # Extract pagination params first
        pagination_params = {}
        for key in ['limit', 'offset']:
            if key in params and params[key] is not None:
                pagination_params[key] = params[key]

        # Remove pagination params from the dict so parent doesn't see them
        filtered_params = {k: v for k, v in params.items() if k not in ['limit', 'offset']}

        # Get base SearchRequest
        base_request = SearchRequest.from_query_params(filtered_params)

        # Convert to dict and add pagination, using by_alias=True to get proper field names
        request_dict = base_request.dict(by_alias=True)
        request_dict.update(pagination_params)

        return cls(**request_dict)


class PaginatedSearchResponse(BaseModel):
    results: List[SearchResultItem]
    total: int
    search_id: Optional[str] = None
    pagination: Dict[str, Any]  # limit, offset, has_more


def build_unified_request_from_flat(**flat: Any) -> SearchRequest:
    """Helper shim to build a ``SearchRequest`` from a flat param set.

    This is used while migrating verbose endpoints (e.g. ``/search_paginated``)
    that still collect dozens of individual parameters. It normalizes aliases
    and funnels everything through ``SearchRequest.from_query_params`` for a
    single source of truth.
    """
    # Drop keys whose value is None to avoid overriding model defaults
    cleaned = {k: v for k, v in flat.items() if v is not None}
    return SearchRequest.from_query_params(cleaned)
