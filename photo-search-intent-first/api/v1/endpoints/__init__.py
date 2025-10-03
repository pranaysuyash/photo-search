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
from .config import config_router
from .library import library_router
from .editing import editing_router
from .models import models_router
from .data_management import data_management_router
from .utilities import utilities_router
from .file_management import file_management_router
from .fast_index import fast_index_router
from .captions import captions_router
from .admin import admin_router
from .watch import watch_router
from .workspace import workspace_router
from .smart_collections import smart_collections_router
from .trips import trips_router
from .enhanced_smart_collections import enhanced_smart_collections_router
from .enhanced_faces import enhanced_faces_router
from .enhanced_search import enhanced_search_router
from .enhanced_indexing import enhanced_indexing_router

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
    "config_router",
    "library_router",
    "editing_router",
    "models_router",
    "data_management_router",
    "utilities_router",
    "file_management_router",
    "fast_index_router",
    "captions_router",
    "admin_router",
    "watch_router",
    "workspace_router",
    "smart_collections_router",
    "trips_router",
    "enhanced_smart_collections_router",
    "enhanced_faces_router",
    "enhanced_search_router",
    "enhanced_indexing_router",
]