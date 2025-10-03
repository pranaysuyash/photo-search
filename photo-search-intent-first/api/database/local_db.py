"""
Local database schema for the Photo Search application using SQLite.

This module defines the database schema for storing:
- Photo metadata and embeddings
- Search history
- Analytics/tracking data
- User preferences and favorites
"""

import sqlite3
import json
from pathlib import Path
from typing import Optional, Dict, Any


class LocalDatabase:
    """SQLite database manager for the Photo Search application."""
    
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.connection = None
        self._connect()
    
    def _connect(self):
        """Establish connection to the SQLite database."""
        self.connection = sqlite3.connect(self.db_path)
        self.connection.row_factory = sqlite3.Row  # Enable column access by name
        self._create_tables()
    
    def _create_tables(self):
        """Create all necessary tables if they don't exist."""
        cursor = self.connection.cursor()
        
        # Table for photo metadata and embeddings
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS photos (
                id INTEGER PRIMARY KEY,
                path TEXT UNIQUE NOT NULL,
                filename TEXT,
                mtime REAL NOT NULL,
                ctime REAL,
                size_bytes INTEGER,
                width INTEGER,
                height INTEGER,
                embedding BLOB,
                metadata_json TEXT,
                ocr_text TEXT,
                caption TEXT,
                favorite BOOLEAN DEFAULT 0,
                rating INTEGER DEFAULT 0,
                tags_json TEXT,
                last_accessed REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes for common queries
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_photos_mtime ON photos(mtime)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_photos_favorite ON photos(favorite)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_photos_rating ON photos(rating)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_photos_path ON photos(path)')
        
        # Table for search history
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS search_history (
                id INTEGER PRIMARY KEY,
                query TEXT NOT NULL,
                provider TEXT DEFAULT 'local',
                top_k INTEGER DEFAULT 12,
                filters_json TEXT,
                result_count INTEGER,
                search_time_ms REAL,
                timestamp REAL NOT NULL,
                cached BOOLEAN DEFAULT 0
            )
        ''')
        
        # Create indexes for search history
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_search_history_timestamp ON search_history(timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query)')
        
        # Table for analytics/tracking
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS activity_log (
                id INTEGER PRIMARY KEY,
                activity_type TEXT NOT NULL,  -- search, view, favorite, open, tag, etc.
                path TEXT,
                query TEXT,
                metadata_json TEXT,
                timestamp REAL NOT NULL,
                session_id TEXT
            )
        ''')
        
        # Create indexes for activity log
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_log(timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_log(activity_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_activity_path ON activity_log(path)')
        
        # Table for user collections
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS collections (
                id INTEGER PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                photo_paths_json TEXT,  -- JSON array of photo paths in the collection
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Table for tags
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                color TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Junction table for photo-tag relationships
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS photo_tags (
                photo_path TEXT NOT NULL,
                tag_name TEXT NOT NULL,
                PRIMARY KEY (photo_path, tag_name),
                FOREIGN KEY (photo_path) REFERENCES photos(path),
                FOREIGN KEY (tag_name) REFERENCES tags(name)
            )
        ''')
        
        # Table for cached search results
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cached_search_results (
                id INTEGER PRIMARY KEY,
                cache_key TEXT UNIQUE NOT NULL,
                query TEXT NOT NULL,
                provider TEXT DEFAULT 'local',
                top_k INTEGER DEFAULT 12,
                filters_json TEXT,
                results_json TEXT NOT NULL,  -- JSON array of search results
                hit_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at REAL NOT NULL  -- epoch seconds for timezone consistency
            )
        ''')
        
        # Create indexes for cached results
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_cached_search_created ON cached_search_results(created_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_cached_search_expires ON cached_search_results(expires_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_cached_search_query ON cached_search_results(query)')
        
        self.connection.commit()
    
    def close(self):
        """Close the database connection."""
        if self.connection:
            self.connection.close()
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()