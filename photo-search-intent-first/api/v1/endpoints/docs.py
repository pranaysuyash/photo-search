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
        # Tags endpoints (stubs - no actual endpoints yet)
        EndpointDocumentation(
            method="N/A",
            path="/api/v1/tags",
            summary="Tagging operations",
            description="Manage tags for photos (endpoints to be implemented)",
            request_schema="",
            response_schema="",
            example='{}'
        ),
        # Collections endpoints (stubs - no actual endpoints yet)
        EndpointDocumentation(
            method="N/A",
            path="/api/v1/collections",
            summary="Collections operations",
            description="Manage photo collections (endpoints to be implemented)",
            request_schema="",
            response_schema="",
            example='{}'
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