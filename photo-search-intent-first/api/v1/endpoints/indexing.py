"""
Indexing-related endpoints for API v1.
"""
from fastapi import APIRouter

# Create router for indexing endpoints
indexing_router = APIRouter(prefix="/indexing", tags=["indexing"])