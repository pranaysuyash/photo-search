"""
Collections-related endpoints for API v1.
"""
from fastapi import APIRouter

# Create router for collections endpoints
collections_router = APIRouter(prefix="/collections", tags=["collections"])