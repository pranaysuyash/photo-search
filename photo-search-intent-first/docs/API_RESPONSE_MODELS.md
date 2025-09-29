# API Response Models

## Overview
The photo search API uses Pydantic response models to ensure consistent and predictable API responses. All endpoints return structured responses following established schemas.

## Base Response Models

### BaseResponse
The foundational response model used across all API endpoints:

```python
class BaseResponse(BaseModel):
    ok: bool
    message: Optional[str] = None
```

### ErrorResponse  
For API errors with detailed error information:

```python
class ErrorResponse(BaseResponse):
    ok: bool = False
    error: Optional[Dict[str, Any]] = None
```

### SuccessResponse
For successful responses that may contain additional data:

```python
class SuccessResponse(BaseResponse):
    ok: bool = True
    data: Optional[Dict[str, Any]] = None
```

## Endpoint-Specific Response Models

### Health Response
```python
class HealthResponse(BaseResponse):
    ok: bool = True
    uptime_seconds: Optional[int] = None
    version: Optional[str] = None
```

### Share Response
```python
class ShareResponse(BaseResponse):
    ok: bool = True
    token: Optional[str] = None
    url: Optional[str] = None
    expires: Optional[str] = None
```

### Index Response
```python
class IndexResponse(BaseResponse):
    ok: bool = True
    new: int = 0
    updated: int = 0
    total: int = 0
    job_id: Optional[str] = None
```

### Favorite Response
```python
class FavoriteResponse(BaseResponse):
    ok: bool = True
    path: Optional[str] = None
    favorite: bool = False
```

### Tag Response
```python
class TagResponse(BaseResponse):
    ok: bool = True
    path: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
```

### Search Response
The search response is defined in the existing search models:

```python
class SearchResponse(BaseModel):
    search_id: Optional[str] = None
    results: List[SearchResultItem] = []
    cached: bool = False
    cache_key: Optional[str] = None
    fast_backend: Optional[str] = None
    fast_fallback: Optional[bool] = None
```

## Response Model Usage

All API endpoints now return properly typed responses using these models:

- Health-related endpoints (`/health`, `/api/health`, `/api/ping`) return `HealthResponse`
- Operation status endpoints return `BaseResponse` or `SuccessResponse`  
- Share operations return `ShareResponse`
- Favorite operations return `FavoriteResponse`
- Tag operations return `TagResponse`
- Search operations return `SearchResponse` (from search models)

## Benefits

- **Consistency**: All API responses follow the same structural pattern
- **Validation**: Pydantic models provide automatic validation and type checking
- **Documentation**: Response schemas provide clear API documentation
- **Maintainability**: Centralized response definitions improve code organization