"""
Search request and response models for the Photo Search API.
Provides structured, type-safe parameter handling for search operations.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator
from enum import Enum


class SearchProvider(str, Enum):
    """Available search providers for embedding generation."""
    LOCAL = "local"
    OPENAI = "openai"
    HUGGINGFACE = "huggingface"


class FastSearchKind(str, Enum):
    """Types of fast search algorithms."""
    HNSW = "hnsw"
    FAISS = "faiss"
    ANNOY = "annoy"


class WhiteBalance(str, Enum):
    """Camera white balance settings."""
    AUTO = "auto"
    MANUAL = "manual"
    DAYLIGHT = "daylight"
    CLOUDY = "cloudy"
    TUNGSTEN = "tungsten"
    FLUORESCENT = "fluorescent"
    FLASH = "flash"


class MeteringMode(str, Enum):
    """Camera metering modes."""
    AVERAGE = "average"
    CENTER_WEIGHTED = "center-weighted"
    SPOT = "spot"
    MULTI_SPOT = "multi-spot"
    PATTERN = "pattern"
    PARTIAL = "partial"


class DateRange(BaseModel):
    """Date range filter for search queries."""
    start: Optional[datetime] = Field(None, description="Start date for date range filter")
    end: Optional[datetime] = Field(None, description="End date for date range filter")

    @validator('end')
    def validate_end_date(cls, v, values):
        if v and 'start' in values and values['start']:
            if v < values['start']:
                raise ValueError("End date must be after start date")
        return v


class CameraSettings(BaseModel):
    """Camera-specific filter settings."""
    camera: Optional[str] = Field(None, description="Camera make/model filter")
    iso_min: Optional[int] = Field(None, ge=0, le=12800, description="Minimum ISO sensitivity")
    iso_max: Optional[int] = Field(None, ge=0, le=12800, description="Maximum ISO sensitivity")
    aperture_min: Optional[float] = Field(None, ge=0.1, le=256, description="Minimum aperture (f-stop)")
    aperture_max: Optional[float] = Field(None, ge=0.1, le=256, description="Maximum aperture (f-stop)")
    flash: Optional[bool] = Field(None, description="Flash used filter")
    white_balance: Optional[WhiteBalance] = Field(None, description="White balance setting")
    metering: Optional[MeteringMode] = Field(None, description="Metering mode")


class LocationFilter(BaseModel):
    """Location and GPS-based filters."""
    altitude_min: Optional[float] = Field(None, description="Minimum altitude in meters")
    altitude_max: Optional[float] = Field(None, description="Maximum altitude in meters")
    heading_min: Optional[float] = Field(None, ge=0, le=360, description="Minimum heading in degrees")
    heading_max: Optional[float] = Field(None, ge=0, le=360, description="Maximum heading in degrees")
    place: Optional[str] = Field(None, description="Place name filter")

    @validator('heading_max')
    def validate_heading_max(cls, v, values):
        if v and 'heading_min' in values and values['heading_min']:
            if v < values['heading_min']:
                raise ValueError("Maximum heading must be >= minimum heading")
        return v


class QualityFilter(BaseModel):
    """Image quality-based filters."""
    sharp_only: Optional[bool] = Field(None, description="Only sharp images")
    exclude_underexposed: Optional[bool] = Field(None, description="Exclude underexposed images")
    exclude_overexposed: Optional[bool] = Field(None, description="Exclude overexposed images")


class ContentFilter(BaseModel):
    """Content-based filters."""
    has_text: Optional[bool] = Field(None, description="Images with text content (OCR)")
    persons: Optional[List[str]] = Field(None, description="List of person names to filter by")
    collections: Optional[List[str]] = Field(None, description="Collection names to filter by")
    tags: Optional[List[str]] = Field(None, description="Tags to filter by")
    exclude_tags: Optional[List[str]] = Field(None, description="Tags to exclude")


class SearchFeatures(BaseModel):
    """Search feature toggles."""
    use_fast: bool = Field(True, description="Use fast search algorithms")
    fast_kind: Optional[FastSearchKind] = Field(None, description="Fast search algorithm type")
    use_captions: bool = Field(True, description="Include image captions in search")
    use_ocr: bool = Field(True, description="Include OCR text in search")
    use_metadata: bool = Field(True, description="Include metadata in search")


class SearchRequest(BaseModel):
    """Main search request model consolidating all search parameters."""
    # Core search parameters
    directory: str = Field(..., description="Directory to search in")
    query: str = Field(..., description="Search query")
    limit: int = Field(12, ge=1, le=1000, description="Maximum number of results")
    provider: SearchProvider = Field(SearchProvider.LOCAL, description="Embedding provider")

    # Authentication tokens
    hf_token: Optional[str] = Field(None, description="HuggingFace API token")
    openai_key: Optional[str] = Field(None, description="OpenAI API key")

    # Feature toggles
    features: SearchFeatures = Field(default_factory=SearchFeatures)

    # Filter categories
    favorites_only: bool = Field(False, description="Only favorite photos")
    date_range: Optional[DateRange] = Field(None, description="Date range filter")
    camera: Optional[CameraSettings] = Field(None, description="Camera settings filter")
    location: Optional[LocationFilter] = Field(None, description="Location filter")
    quality: Optional[QualityFilter] = Field(None, description="Quality filter")
    content: Optional[ContentFilter] = Field(None, description="Content filter")

    # Additional options
    threshold: float = Field(0.7, ge=0.0, le=1.0, description="Similarity threshold")
    include_metadata: bool = Field(True, description="Include detailed metadata in results")

    @validator('limit')
    def validate_limit(cls, v):
        if v > 1000:
            raise ValueError("Limit cannot exceed 1000 results")
        return v


class SearchResult(BaseModel):
    """Individual search result model."""
    id: str = Field(..., description="Photo identifier")
    filename: str = Field(..., description="Photo filename")
    path: str = Field(..., description="Full file path")
    score: float = Field(..., description="Similarity score")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Photo metadata")
    thumbnail_path: Optional[str] = Field(None, description="Path to thumbnail")
    embedding_similarity: Optional[float] = Field(None, description="Embedding similarity score")
    ocr_score: Optional[float] = Field(None, description="OCR match score")
    caption_score: Optional[float] = Field(None, description="Caption match score")


class SearchResponse(BaseModel):
    """Complete search response model."""
    results: List[SearchResult] = Field(..., description="Search results")
    total_count: int = Field(..., description="Total number of results")
    query: str = Field(..., description="Original search query")
    filters_applied: List[str] = Field(default_factory=list, description="List of applied filters")
    search_time_ms: Optional[float] = Field(None, description="Search execution time in milliseconds")
    provider_used: SearchProvider = Field(..., description="Provider used for search")

    @validator('results')
    def validate_results(cls, v, values):
        limit = values.get('limit', 1000)
        if len(v) > limit:
            raise ValueError(f"Number of results ({len(v)}) exceeds limit ({limit})")
        return v


class SearchStatus(BaseModel):
    """Search indexing status model."""
    is_indexing: bool = Field(..., description="Currently indexing")
    progress: float = Field(..., ge=0.0, le=1.0, description="Indexing progress (0.0 to 1.0)")
    current_file: Optional[str] = Field(None, description="Currently processing file")
    total_files: int = Field(..., description="Total files to process")
    processed_files: int = Field(..., description="Files processed so far")
    estimated_time_remaining: Optional[int] = Field(None, description="Estimated time remaining in seconds")
    error: Optional[str] = Field(None, description="Error message if indexing failed")


class SearchSuggestion(BaseModel):
    """Search suggestion model."""
    text: str = Field(..., description="Suggestion text")
    type: str = Field(..., description="Suggestion type (query, tag, person, etc.)")
    score: float = Field(..., description="Suggestion relevance score")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class SearchSuggestionsResponse(BaseModel):
    """Search suggestions response model."""
    suggestions: List[SearchSuggestion] = Field(..., description="Search suggestions")
    query: str = Field(..., description="Original query prefix")
    limit: int = Field(..., description="Number of suggestions returned")