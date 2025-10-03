"""
Data Access Objects for the Photo Search local database.
Provides high-level interfaces for database operations.
"""

from pathlib import Path
import json
import sqlite3
import time
from typing import List, Dict, Any, Optional, Tuple

from api.database.local_db import LocalDatabase


class PhotoDAO:
    """Data Access Object for photo-related operations."""
    
    def __init__(self, db: LocalDatabase):
        self.db = db
    
    def upsert_photo(self, path: str, metadata: Dict[str, Any], embedding: Optional[bytes] = None) -> bool:
        """Insert or update a photo record in the database."""
        cursor = self.db.connection.cursor()
        
        # Convert metadata to JSON string
        metadata_json = json.dumps(metadata) if metadata else None
        
        try:
            cursor.execute('''
                INSERT OR REPLACE INTO photos (
                    path, filename, mtime, ctime, size_bytes, width, height, 
                    embedding, metadata_json, ocr_text, caption, last_accessed, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
                )
            ''', (
                path,
                metadata.get('filename'),
                metadata.get('mtime'),
                metadata.get('ctime'),
                metadata.get('size_bytes'),
                metadata.get('width'),
                metadata.get('height'),
                embedding,
                metadata_json,
                metadata.get('ocr_text'),
                metadata.get('caption'),
                time.time()
            ))
            
            self.db.connection.commit()
            return True
        except Exception as e:
            print(f"Error upserting photo {path}: {e}")
            return False
    
    def get_photo(self, path: str) -> Optional[Dict[str, Any]]:
        """Get a photo record by path."""
        cursor = self.db.connection.cursor()
        cursor.execute('SELECT * FROM photos WHERE path = ?', (path,))
        row = cursor.fetchone()
        
        if row:
            return self._row_to_photo_dict(row)
        return None
    
    def get_photos_by_paths(self, paths: List[str]) -> List[Dict[str, Any]]:
        """Get multiple photos by their paths."""
        if not paths:
            return []
        
        cursor = self.db.connection.cursor()
        # Create placeholders for the IN clause
        placeholders = ','.join('?' * len(paths))
        cursor.execute(f'SELECT * FROM photos WHERE path IN ({placeholders})', paths)
        
        return [self._row_to_photo_dict(row) for row in cursor.fetchall()]
    
    def get_all_photos(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Get all photos with pagination."""
        cursor = self.db.connection.cursor()
        cursor.execute('SELECT * FROM photos LIMIT ? OFFSET ?', (limit, offset))
        
        return [self._row_to_photo_dict(row) for row in cursor.fetchall()]
    
    def get_photos_count(self) -> int:
        """Get the total count of photos in the database."""
        cursor = self.db.connection.cursor()
        cursor.execute('SELECT COUNT(*) FROM photos')
        return cursor.fetchone()[0]
    
    def update_favorite(self, path: str, favorite: bool) -> bool:
        """Update the favorite status of a photo."""
        cursor = self.db.connection.cursor()
        
        try:
            cursor.execute(
                'UPDATE photos SET favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE path = ?',
                (1 if favorite else 0, path)
            )
            self.db.connection.commit()
            return cursor.rowcount > 0
        except Exception as e:
            print(f"Error updating favorite status for {path}: {e}")
            return False
    
    def update_rating(self, path: str, rating: int) -> bool:
        """Update the rating of a photo."""
        cursor = self.db.connection.cursor()
        
        try:
            cursor.execute(
                'UPDATE photos SET rating = ?, updated_at = CURRENT_TIMESTAMP WHERE path = ?',
                (rating, path)
            )
            self.db.connection.commit()
            return cursor.rowcount > 0
        except Exception as e:
            print(f"Error updating rating for {path}: {e}")
            return False
    
    def _row_to_photo_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        """Convert a database row to a photo dictionary."""
        photo_dict = dict(row)
        
        # Parse JSON fields
        if photo_dict.get('metadata_json'):
            photo_dict['metadata'] = json.loads(photo_dict['metadata_json'])
            del photo_dict['metadata_json']
        else:
            photo_dict['metadata'] = {}
        
        if photo_dict.get('tags_json'):
            photo_dict['tags'] = json.loads(photo_dict['tags_json'])
            del photo_dict['tags_json']
        else:
            photo_dict['tags'] = []
        
        return photo_dict


class SearchHistoryDAO:
    """Data Access Object for search history operations."""
    
    def __init__(self, db: LocalDatabase):
        self.db = db
    
    def add_search(self, query: str, provider: str, top_k: int, filters: Dict[str, Any], 
                   result_count: int, search_time_ms: float, cached: bool) -> bool:
        """Add a search query to the history."""
        cursor = self.db.connection.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO search_history 
                (query, provider, top_k, filters_json, result_count, search_time_ms, timestamp, cached)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                query,
                provider,
                top_k,
                json.dumps(filters) if filters else None,
                result_count,
                search_time_ms,
                time.time(),
                1 if cached else 0
            ))
            
            self.db.connection.commit()
            return True
        except Exception as e:
            print(f"Error adding search to history: {e}")
            return False
    
    def get_recent_searches(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent search queries."""
        cursor = self.db.connection.cursor()
        cursor.execute('''
            SELECT query, provider, top_k, filters_json, result_count, 
                   search_time_ms, timestamp, cached
            FROM search_history 
            ORDER BY timestamp DESC 
            LIMIT ?
        ''', (limit,))
        
        results = []
        for row in cursor.fetchall():
            row_dict = dict(row)
            # Parse JSON filters
            if row_dict['filters_json']:
                row_dict['filters'] = json.loads(row_dict['filters_json'])
                del row_dict['filters_json']
            else:
                row_dict['filters'] = {}
            results.append(row_dict)
        
        return results
    
    def clear_search_history(self) -> bool:
        """Clear all search history."""
        cursor = self.db.connection.cursor()
        
        try:
            cursor.execute('DELETE FROM search_history')
            self.db.connection.commit()
            return True
        except Exception as e:
            print(f"Error clearing search history: {e}")
            return False


class ActivityLogDAO:
    """Data Access Object for activity logging."""
    
    def __init__(self, db: LocalDatabase):
        self.db = db
    
    def log_activity(self, activity_type: str, path: Optional[str] = None, 
                     query: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None,
                     session_id: Optional[str] = None) -> bool:
        """Log an activity event."""
        cursor = self.db.connection.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO activity_log 
                (activity_type, path, query, metadata_json, timestamp, session_id)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                activity_type,
                path,
                query,
                json.dumps(metadata) if metadata else None,
                time.time(),
                session_id
            ))
            
            self.db.connection.commit()
            return True
        except Exception as e:
            print(f"Error logging activity: {e}")
            return False
    
    def get_activities(self, activity_type: Optional[str] = None, 
                       limit: int = 50) -> List[Dict[str, Any]]:
        """Get activity logs, optionally filtered by type."""
        cursor = self.db.connection.cursor()
        
        if activity_type:
            cursor.execute('''
                SELECT * FROM activity_log 
                WHERE activity_type = ?
                ORDER BY timestamp DESC 
                LIMIT ?
            ''', (activity_type, limit))
        else:
            cursor.execute('''
                SELECT * FROM activity_log 
                ORDER BY timestamp DESC 
                LIMIT ?
            ''', (limit,))
        
        results = []
        for row in cursor.fetchall():
            row_dict = dict(row)
            # Parse JSON metadata
            if row_dict['metadata_json']:
                row_dict['metadata'] = json.loads(row_dict['metadata_json'])
                del row_dict['metadata_json']
            else:
                row_dict['metadata'] = {}
            results.append(row_dict)
        
        return results


class CollectionDAO:
    """Data Access Object for collections."""
    
    def __init__(self, db: LocalDatabase):
        self.db = db
    
    def create_collection(self, name: str, description: Optional[str] = None, 
                          photo_paths: Optional[List[str]] = None) -> bool:
        """Create a new collection."""
        cursor = self.db.connection.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO collections 
                (name, description, photo_paths_json)
                VALUES (?, ?, ?)
            ''', (
                name,
                description,
                json.dumps(photo_paths or [])
            ))
            
            self.db.connection.commit()
            return True
        except Exception as e:
            print(f"Error creating collection: {e}")
            return False
    
    def get_collection(self, name: str) -> Optional[Dict[str, Any]]:
        """Get a collection by name."""
        cursor = self.db.connection.cursor()
        cursor.execute('SELECT * FROM collections WHERE name = ?', (name,))
        row = cursor.fetchone()
        
        if row:
            row_dict = dict(row)
            # Parse JSON photo paths
            if row_dict['photo_paths_json']:
                row_dict['photo_paths'] = json.loads(row_dict['photo_paths_json'])
                del row_dict['photo_paths_json']
            else:
                row_dict['photo_paths'] = []
            return row_dict
        return None
    
    def get_all_collections(self) -> List[Dict[str, Any]]:
        """Get all collections."""
        cursor = self.db.connection.cursor()
        cursor.execute('SELECT * FROM collections')
        
        results = []
        for row in cursor.fetchall():
            row_dict = dict(row)
            # Parse JSON photo paths
            if row_dict['photo_paths_json']:
                row_dict['photo_paths'] = json.loads(row_dict['photo_paths_json'])
                del row_dict['photo_paths_json']
            else:
                row_dict['photo_paths'] = []
            results.append(row_dict)
        
        return results
    
    def add_photos_to_collection(self, name: str, photo_paths: List[str]) -> bool:
        """Add photos to an existing collection."""
        collection = self.get_collection(name)
        if not collection:
            return False
        
        all_paths = set(collection['photo_paths'])
        all_paths.update(photo_paths)
        new_paths = list(all_paths)
        
        cursor = self.db.connection.cursor()
        try:
            cursor.execute('''
                UPDATE collections 
                SET photo_paths_json = ?, updated_at = CURRENT_TIMESTAMP
                WHERE name = ?
            ''', (json.dumps(new_paths), name))
            
            self.db.connection.commit()
            return True
        except Exception as e:
            print(f"Error adding photos to collection: {e}")
            return False


class CachedSearchDAO:
    """Data Access Object for cached search results."""
    
    def __init__(self, db: LocalDatabase):
        self.db = db
    
    def cache_search_results(self, cache_key: str, query: str, provider: str, top_k: int,
                             filters: Dict[str, Any], results: List[Dict[str, Any]], 
                             ttl_seconds: int = 600) -> bool:  # 10 minutes default TTL
        """Cache search results."""
        import time
        cursor = self.db.connection.cursor()
        
        try:
            expires_at = time.time() + ttl_seconds
            cursor.execute('''
                INSERT OR REPLACE INTO cached_search_results 
                (cache_key, query, provider, top_k, filters_json, results_json, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                cache_key,
                query,
                provider,
                top_k,
                json.dumps(filters) if filters else None,
                json.dumps(results),
                expires_at
            ))
            
            self.db.connection.commit()
            return True
        except Exception as e:
            print(f"Error caching search results: {e}")
            return False
    
    def get_cached_results(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached search results by cache key."""
        import time
        cursor = self.db.connection.cursor()
        cursor.execute('''
            SELECT * FROM cached_search_results 
            WHERE cache_key = ? AND expires_at > ?
        ''', (cache_key, time.time()))
        
        row = cursor.fetchone()
        if row:
            # Update hit count
            self._increment_hit_count(cache_key)
            
            row_dict = dict(row)
            # Parse JSON results and filters
            row_dict['results'] = json.loads(row_dict['results_json'])
            del row_dict['results_json']
            
            if row_dict['filters_json']:
                row_dict['filters'] = json.loads(row_dict['filters_json'])
                del row_dict['filters_json']
            else:
                row_dict['filters'] = {}
            
            return row_dict
        return None
    
    def _increment_hit_count(self, cache_key: str) -> bool:
        """Increment the hit count for a cached result."""
        cursor = self.db.connection.cursor()
        
        try:
            cursor.execute('''
                UPDATE cached_search_results 
                SET hit_count = hit_count + 1
                WHERE cache_key = ?
            ''', (cache_key,))
            
            self.db.connection.commit()
            return True
        except Exception as e:
            print(f"Error incrementing hit count: {e}")
            return False
    
    def cleanup_expired_cache(self) -> int:
        """Remove expired cache entries and return number of deleted entries."""
        import time
        cursor = self.db.connection.cursor()
        cursor.execute('DELETE FROM cached_search_results WHERE expires_at <= ?', (time.time(),))
        deleted_count = cursor.rowcount
        self.db.connection.commit()
        return deleted_count
    
    def clear_cache(self) -> bool:
        """Clear all cached search results."""
        cursor = self.db.connection.cursor()
        
        try:
            cursor.execute('DELETE FROM cached_search_results')
            self.db.connection.commit()
            return True
        except Exception as e:
            print(f"Error clearing cache: {e}")
            return False