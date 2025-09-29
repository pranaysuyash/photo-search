"""
OCR-related endpoints for API v1.
"""
from fastapi import APIRouter

# Create router for OCR endpoints
ocr_router = APIRouter(prefix="/ocr", tags=["ocr"])