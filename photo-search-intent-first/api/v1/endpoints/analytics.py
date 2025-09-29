"""
Analytics-related endpoints for API v1.
"""
from fastapi import APIRouter

# Create router for analytics endpoints
analytics_router = APIRouter(prefix="/analytics", tags=["analytics"])