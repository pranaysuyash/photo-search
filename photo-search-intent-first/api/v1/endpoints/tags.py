"""
Tags-related endpoints for API v1.
"""
from fastapi import APIRouter

# Create router for tags endpoints
tags_router = APIRouter(prefix="/tags", tags=["tags"])