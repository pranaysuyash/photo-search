"""
Init module for v1 endpoints that imports all router modules.
"""
from .search import search_router
from .indexing import indexing_router
from .sharing import sharing_router
from .analytics import analytics_router
from .faces import faces_router
from .metadata import metadata_router
from .tags import tags_router
from .collections import collections_router
from .ocr import ocr_router
from .video import video_router
from .docs import router as docs_router
from .auth import auth_router
from .favorites import favorites_router
from .batch import batch_router
from .saved import saved_router
from .presets import presets_router

__all__ = [
    "search_router",
    "indexing_router", 
    "sharing_router",
    "analytics_router",
    "faces_router",
    "metadata_router",
    "tags_router",
    "collections_router",
    "ocr_router",
    "video_router",
    "docs_router",
    "auth_router",
    "favorites_router",
    "batch_router",
    "saved_router",
    "presets_router",
]