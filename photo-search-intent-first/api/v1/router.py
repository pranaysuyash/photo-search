"""
API v1 router for the photo search application.

This module contains the version 1 API endpoints, organized using FastAPI's
APIRouter to provide versioned access to the photo search functionality.
"""
from fastapi import APIRouter

from .endpoints import search_router, indexing_router, sharing_router, analytics_router, faces_router, metadata_router, tags_router, collections_router, ocr_router, video_router, docs_router, auth_router

# Main API v1 router
api_v1 = APIRouter(prefix="/api/v1", tags=["v1"])

# Include all v1 sub-routers
api_v1.include_router(search_router)
api_v1.include_router(indexing_router)
api_v1.include_router(sharing_router)
api_v1.include_router(analytics_router)
api_v1.include_router(faces_router)
api_v1.include_router(metadata_router)
api_v1.include_router(tags_router)
api_v1.include_router(collections_router)
api_v1.include_router(ocr_router)
api_v1.include_router(video_router)
api_v1.include_router(docs_router)
api_v1.include_router(auth_router)