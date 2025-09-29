"""
Sharing-related endpoints for API v1.
"""
from fastapi import APIRouter

# Create router for sharing endpoints
sharing_router = APIRouter(prefix="/sharing", tags=["sharing"])