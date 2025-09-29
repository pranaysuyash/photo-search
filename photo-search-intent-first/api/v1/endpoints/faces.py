"""
Face-related endpoints for API v1.
"""
from fastapi import APIRouter

# Create router for faces endpoints
faces_router = APIRouter(prefix="/faces", tags=["faces"])