"""
Video-related endpoints for API v1.
"""
from fastapi import APIRouter

# Create router for video endpoints
video_router = APIRouter(prefix="/video", tags=["video"])