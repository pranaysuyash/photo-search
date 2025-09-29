"""
API Documentation endpoint for the photo search application.

This module provides documentation for all v1 API endpoints.
"""
from typing import Dict, List
from fastapi import APIRouter
from pydantic import BaseModel

from api.schemas.v1 import (
    SearchRequest,
    SearchResponse,
    CachedSearchRequest,
    IndexRequest,
    IndexResponse,
    ShareRequest,
    ShareResponse,
    FavoritesRequest,
    FavoriteResponse,
    TagsRequest,
    TagResponse,
    CollectionResponse,
    HealthResponse
)

router = APIRouter()


class EndpointDocumentation(BaseModel):
    """
    Documentation model for an API endpoint.
    """
    method: str
    path: str
    summary: str
    description: str
    request_schema: str
    response_schema: str
    example: str


class APIDocsResponse(BaseModel):
    """
    Response model for API documentation.
    """
    ok: bool
    endpoints: List[EndpointDocumentation]


@router.get("/docs", response_model=APIDocsResponse, 
            summary="Get API Documentation",
            description="Returns documentation for all v1 API endpoints")
async def get_api_docs():
    """
    Get documentation for all v1 API endpoints.
    """
    endpoints = [
        # Search endpoints (fully implemented)
        EndpointDocumentation(
            method="POST",
            path="/api/v1/search/",
            summary="Photo semantic search",
            description="Search for photos using semantic similarity and advanced filtering",
            request_schema="SearchRequest",
            response_schema="SearchResponse",
            example='{"dir": "/path/to/photos", "query": "red flowers", "top_k": 10}'
        ),
        EndpointDocumentation(
            method="POST",
            path="/api/v1/search/cached",
            summary="Cached photo search",
            description="Perform a cached search to improve response times for repeated queries",
            request_schema="CachedSearchRequest",
            response_schema="SearchResponse",
            example='{"dir": "/path/to/photos", "query": "red flowers", "top_k": 10}'
        ),
        # Auth endpoints (fully implemented)
        EndpointDocumentation(
            method="GET",
            path="/api/v1/auth/status",
            summary="Authentication status",
            description="Get authentication status for debugging",
            request_schema="",
            response_schema="Dict",
            example='{"X-API-Token": "your_token"}'
        ),
        EndpointDocumentation(
            method="POST",
            path="/api/v1/auth/check",
            summary="Authentication check",
            description="Verify if Authorization header is accepted",
            request_schema="",
            response_schema="Dict",
            example='{"Authorization": "Bearer your_token"}'
        ),
        # Indexing endpoints (stubs - no actual endpoints yet)
        EndpointDocumentation(
            method="N/A",
            path="/api/v1/indexing",
            summary="Indexing operations",
            description="Build and manage photo indexes (endpoints to be implemented)",
            request_schema="",
            response_schema="",
            example='{}'
        ),
        # Sharing endpoints (stubs - no actual endpoints yet)
        EndpointDocumentation(
            method="N/A",
            path="/api/v1/sharing",
            summary="Sharing operations",
            description="Share photos with others (endpoints to be implemented)",
            request_schema="",
            response_schema="",
            example='{}'
        ),
        # Analytics endpoints (stubs - no actual endpoints yet)
        EndpointDocumentation(
            method="N/A",
            path="/api/v1/analytics",
            summary="Analytics operations",
            description="Analytics and reporting (endpoints to be implemented)",
            request_schema="",
            response_schema="",
            example='{}'
        ),
        # Faces endpoints (stubs - no actual endpoints yet)
        EndpointDocumentation(
            method="N/A",
            path="/api/v1/faces",
            summary="Face recognition operations",
            description="Face detection and recognition (endpoints to be implemented)",
            request_schema="",
            response_schema="",
            example='{}'
        ),
        # Metadata endpoints (stubs - no actual endpoints yet)
        EndpointDocumentation(
            method="N/A",
            path="/api/v1/metadata",
            summary="Metadata operations",
            description="Metadata extraction and management (endpoints to be implemented)",
            request_schema="",
            response_schema="",
            example='{}'
        ),
        # Tags endpoints (fully implemented)
        EndpointDocumentation(
            method="GET",
            path="/api/v1/tags",
            summary="Get all tags",
            description="Get all tags for the specified directory",
            request_schema="",
            response_schema="Dict",
            example='{"directory": "/path/to/photos"}'
        ),
        EndpointDocumentation(
            method="POST",
            path="/api/v1/tags",
            summary="Add tags to photo",
            description="Add tags to a specific photo",
            request_schema="TagsRequest",
            response_schema="TagResponse",
            example='{"directory": "/path/to/photos", "path": "/path/to/photo.jpg", "tags": ["vacation", "beach"]}'
        ),
        EndpointDocumentation(
            method="POST",
            path="/api/v1/tags/autotag",
            summary="Auto-tag photos",
            description="Automatically tag photos based on captions",
            request_schema="",
            response_schema="Dict",
            example='{"directory": "/path/to/photos", "provider": "local", "min_len": 4, "max_tags_per_image": 8}'
        ),
        # Collections endpoints (fully implemented)
        EndpointDocumentation(
            method="GET",
            path="/api/v1/collections",
            summary="Get all collections",
            description="Get all photo collections for the specified directory",
            request_schema="",
            response_schema="Dict",
            example='{"directory": "/path/to/photos"}'
        ),
        EndpointDocumentation(
            method="POST",
            path="/api/v1/collections",
            summary="Create/update collection",
            description="Create or update a photo collection",
            request_schema="",
            response_schema="Dict",
            example='{"dir": "/path/to/photos", "name": "Vacation 2023", "paths": ["/path/to/photo1.jpg", "/path/to/photo2.jpg"]}'
        ),
        EndpointDocumentation(
            method="POST",
            path="/api/v1/collections/delete",
            summary="Delete collection",
            description="Delete a photo collection",
            request_schema="",
            response_schema="Dict",
            example='{"dir": "/path/to/photos", "name": "Vacation 2023"}'
        ),
        EndpointDocumentation(
            method="GET",
            path="/api/v1/collections/smart",
            summary="Get smart collections",
            description="Get all smart photo collections for the specified directory",
            request_schema="",
            response_schema="Dict",
            example='{"directory": "/path/to/photos"}'
        ),
        EndpointDocumentation(
            method="POST",
            path="/api/v1/collections/smart",
            summary="Create/update smart collection",
            description="Create or update a smart photo collection with rules",
            request_schema="",
            response_schema="Dict",
            example='{"dir": "/path/to/photos", "name": "Beach Photos", "rules": {"query": "beach ocean", "tags": ["vacation"]}}'
        ),
        EndpointDocumentation(
            method="POST",
            path="/api/v1/collections/smart/delete",
            summary="Delete smart collection",
            description="Delete a smart photo collection",
            request_schema="",
            response_schema="Dict",
            example='{"dir": "/path/to/photos", "name": "Beach Photos"}'
        ),
        EndpointDocumentation(
            method="POST",
            path="/api/v1/collections/smart/resolve",
            summary="Resolve smart collection",
            description="Execute rules in a smart collection to find matching photos",
            request_schema="",
            response_schema="Dict",
            example='{"dir": "/path/to/photos", "name": "Beach Photos", "provider": "local", "top_k": 50}'
        ),
        # OCR endpoints (stubs - no actual endpoints yet)
        EndpointDocumentation(
            method="N/A",
            path="/api/v1/ocr",
            summary="OCR operations",
            description="Optical character recognition (endpoints to be implemented)",
            request_schema="",
            response_schema="",
            example='{}'
        ),
        # Video endpoints (stubs - no actual endpoints yet)
        EndpointDocumentation(
            method="N/A",
            path="/api/v1/video",
            summary="Video operations",
            description="Video processing and search (endpoints to be implemented)",
            request_schema="",
            response_schema="",
            example='{}'
        )
    ]

    return APIDocsResponse(ok=True, endpoints=endpoints)