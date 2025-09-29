"""
Metadata-related endpoints for API v1.
"""
from fastapi import APIRouter

# Create router for metadata endpoints
metadata_router = APIRouter(prefix="/metadata", tags=["metadata"])