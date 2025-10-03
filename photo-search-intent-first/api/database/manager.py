"""
Database manager for the Photo Search application.
Orchestrates all database operations and provides high-level interfaces.
"""

from pathlib import Path
from typing import Optional, List, Dict, Any
import time

from api.database.local_db import LocalDatabase
from api.database.daos import (
    PhotoDAO, SearchHistoryDAO, ActivityLogDAO, 
    CollectionDAO, CachedSearchDAO
)


class DatabaseManager:
    """Main database manager that orchestrates all database operations."""
    
    def __init__(self, db_path: Optional[Path] = None):
        # Default to a database file in the user's home directory
        if db_path is None:
            db_path = Path.home() / ".photo-search" / "photo_search.db"
        
        self.db = LocalDatabase(db_path)
        
        # Initialize DAOs
        self.photo_dao = PhotoDAO(self.db)
        self.search_history_dao = SearchHistoryDAO(self.db)
        self.activity_log_dao = ActivityLogDAO(self.db)
        self.collection_dao = CollectionDAO(self.db)
        self.cached_search_dao = CachedSearchDAO(self.db)
    
    def close(self):
        """Close the database connection."""
        self.db.close()
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()
    
    # Photo-related methods
    def upsert_photo(self, path: str, metadata: Dict[str, Any], embedding: Optional[bytes] = None) -> bool:
        """Insert or update a photo record."""
        return self.photo_dao.upsert_photo(path, metadata, embedding)
    
    def get_photo(self, path: str) -> Optional[Dict[str, Any]]:
        """Get a photo record by path."""
        return self.photo_dao.get_photo(path)
    
    def get_photos_by_paths(self, paths: List[str]) -> List[Dict[str, Any]]:
        """Get multiple photos by their paths."""
        return self.photo_dao.get_photos_by_paths(paths)
    
    def get_all_photos(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Get all photos with pagination."""
        return self.photo_dao.get_all_photos(limit, offset)
    
    def get_photos_count(self) -> int:
        """Get the total count of photos."""
        return self.photo_dao.get_photos_count()
    
    def update_favorite(self, path: str, favorite: bool) -> bool:
        """Update the favorite status of a photo."""
        return self.photo_dao.update_favorite(path, favorite)
    
    def update_rating(self, path: str, rating: int) -> bool:
        """Update the rating of a photo."""
        return self.photo_dao.update_rating(path, rating)
    
    # Search history methods
    def add_search(self, query: str, provider: str, top_k: int, filters: Dict[str, Any], 
                   result_count: int, search_time_ms: float, cached: bool) -> bool:
        """Add a search query to the history."""
        return self.search_history_dao.add_search(
            query, provider, top_k, filters, result_count, search_time_ms, cached
        )
    
    def get_recent_searches(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent search queries."""
        return self.search_history_dao.get_recent_searches(limit)
    
    def clear_search_history(self) -> bool:
        """Clear all search history."""
        return self.search_history_dao.clear_search_history()
    
    # Activity logging methods
    def log_activity(self, activity_type: str, path: Optional[str] = None, 
                     query: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None,
                     session_id: Optional[str] = None) -> bool:
        """Log an activity event."""
        return self.activity_log_dao.log_activity(activity_type, path, query, metadata, session_id)
    
    def get_activities(self, activity_type: Optional[str] = None, 
                       limit: int = 50) -> List[Dict[str, Any]]:
        """Get activity logs, optionally filtered by type."""
        return self.activity_log_dao.get_activities(activity_type, limit)
    
    # Collection methods
    def create_collection(self, name: str, description: Optional[str] = None, 
                          photo_paths: Optional[List[str]] = None) -> bool:
        """Create a new collection."""
        return self.collection_dao.create_collection(name, description, photo_paths)
    
    def get_collection(self, name: str) -> Optional[Dict[str, Any]]:
        """Get a collection by name."""
        return self.collection_dao.get_collection(name)
    
    def get_all_collections(self) -> List[Dict[str, Any]]:
        """Get all collections."""
        return self.collection_dao.get_all_collections()
    
    def add_photos_to_collection(self, name: str, photo_paths: List[str]) -> bool:
        """Add photos to an existing collection."""
        return self.collection_dao.add_photos_to_collection(name, photo_paths)
    
    # Cached search methods
    def cache_search_results(self, cache_key: str, query: str, provider: str, top_k: int,
                             filters: Dict[str, Any], results: List[Dict[str, Any]], 
                             ttl_seconds: int = 600) -> bool:
        """Cache search results."""
        return self.cached_search_dao.cache_search_results(
            cache_key, query, provider, top_k, filters, results, ttl_seconds
        )
    
    def get_cached_results(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached search results by cache key."""
        return self.cached_search_dao.get_cached_results(cache_key)
    
    def cleanup_expired_cache(self) -> int:
        """Remove expired cache entries."""
        return self.cached_search_dao.cleanup_expired_cache()
    
    def clear_cache(self) -> bool:
        """Clear all cached search results."""
        return self.cached_search_dao.clear_cache()


# Global database manager instance
db_manager: Optional[DatabaseManager] = None


def initialize_db_manager(db_path: Optional[Path] = None):
    """Initialize the global database manager."""
    global db_manager
    db_manager = DatabaseManager(db_path)


def get_db_manager() -> DatabaseManager:
    """Get the global database manager instance."""
    global db_manager
    if db_manager is None:
        initialize_db_manager()
    return db_manager