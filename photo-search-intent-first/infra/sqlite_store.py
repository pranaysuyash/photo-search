"""
SQLite-based storage for photo metadata, thumbnails, and embeddings.
Provides structured storage with SQL querying capabilities as an alternative to file-based storage.
"""

import asyncio
import json
import logging
import sqlite3
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from contextlib import asynccontextmanager
import aiosqlite
import numpy as np
from datetime import datetime

from domain.models import Photo

logger = logging.getLogger(__name__)

class SQLitePhotoStore:
    """
    SQLite-based storage for photo search application.
    Handles photo metadata, thumbnails, and embeddings with efficient querying.
    """

    def __init__(self, db_path: Path, root_dir: Optional[Path] = None):
        """
        Initialize SQLite photo store.

        Args:
            db_path: Path to SQLite database file
            root_dir: Root directory for photos (for relative path storage)
        """
        self.db_path = db_path
        self.root_dir = root_dir or Path.cwd()
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize database schema if not exists."""
        if self._initialized:
            return

        async with self._get_connection() as conn:
            await self._create_tables(conn)
            await self._create_indexes(conn)

        self._initialized = True
        logger.info(f"Initialized SQLite photo store at {self.db_path}")

    async def _create_tables(self, conn: aiosqlite.Connection) -> None:
        """Create database tables."""

        # Photos table - core metadata
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS photos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT NOT NULL UNIQUE,
                relative_path TEXT,
                filename TEXT NOT NULL,
                mtime REAL NOT NULL,
                size INTEGER,
                width INTEGER,
                height INTEGER,
                created_at REAL DEFAULT (strftime('%s', 'now')),
                updated_at REAL DEFAULT (strftime('%s', 'now'))
            )
        """)

        # Thumbnails table - compressed image data
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS thumbnails (
                photo_id INTEGER PRIMARY KEY REFERENCES photos(id) ON DELETE CASCADE,
                data BLOB NOT NULL,
                format TEXT DEFAULT 'webp',
                width INTEGER,
                height INTEGER,
                size_bytes INTEGER,
                created_at REAL DEFAULT (strftime('%s', 'now'))
            )
        """)

        # Embeddings table - vector data for similarity search
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS embeddings (
                photo_id INTEGER PRIMARY KEY REFERENCES photos(id) ON DELETE CASCADE,
                vector BLOB NOT NULL,
                dimensions INTEGER NOT NULL,
                model_name TEXT,
                created_at REAL DEFAULT (strftime('%s', 'now'))
            )
        """)

        # Tags table - photo tagging
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at REAL DEFAULT (strftime('%s', 'now'))
            )
        """)

        # Photo-tags many-to-many relationship
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS photo_tags (
                photo_id INTEGER REFERENCES photos(id) ON DELETE CASCADE,
                tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
                confidence REAL DEFAULT 1.0,
                created_at REAL DEFAULT (strftime('%s', 'now')),
                PRIMARY KEY (photo_id, tag_id)
            )
        """)

        # Collections table - photo groupings
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS collections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                created_at REAL DEFAULT (strftime('%s', 'now'))
            )
        """)

        # Photo-collections many-to-many relationship
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS photo_collections (
                photo_id INTEGER REFERENCES photos(id) ON DELETE CASCADE,
                collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
                added_at REAL DEFAULT (strftime('%s', 'now')),
                PRIMARY KEY (photo_id, collection_id)
            )
        """)

        # Search history and analytics
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS search_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query TEXT NOT NULL,
                results_count INTEGER DEFAULT 0,
                search_time REAL,
                timestamp REAL DEFAULT (strftime('%s', 'now'))
            )
        """)

        await conn.commit()

    async def _create_indexes(self, conn: aiosqlite.Connection) -> None:
        """Create database indexes for performance."""

        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_photos_path ON photos(path)",
            "CREATE INDEX IF NOT EXISTS idx_photos_filename ON photos(filename)",
            "CREATE INDEX IF NOT EXISTS idx_photos_mtime ON photos(mtime)",
            "CREATE INDEX IF NOT EXISTS idx_photos_created ON photos(created_at)",
            "CREATE INDEX IF NOT EXISTS idx_thumbnails_format ON thumbnails(format)",
            "CREATE INDEX IF NOT EXISTS idx_embeddings_model ON embeddings(model_name)",
            "CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name)",
            "CREATE INDEX IF NOT EXISTS idx_photo_tags_photo ON photo_tags(photo_id)",
            "CREATE INDEX IF NOT EXISTS idx_photo_tags_tag ON photo_tags(tag_id)",
            "CREATE INDEX IF NOT EXISTS idx_photo_collections_photo ON photo_collections(photo_id)",
            "CREATE INDEX IF NOT EXISTS idx_photo_collections_collection ON photo_collections(collection_id)",
            "CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query)",
            "CREATE INDEX IF NOT EXISTS idx_search_history_timestamp ON search_history(timestamp)",
        ]

        for index_sql in indexes:
            await conn.execute(index_sql)

        await conn.commit()

    @asynccontextmanager
    async def _get_connection(self):
        """Get async SQLite connection."""
        async with aiosqlite.connect(self.db_path) as conn:
            # Enable foreign keys
            await conn.execute("PRAGMA foreign_keys = ON")
            # Enable WAL mode for better concurrency
            await conn.execute("PRAGMA journal_mode = WAL")
            # Enable synchronous normal for balance of safety/speed
            await conn.execute("PRAGMA synchronous = NORMAL")
            yield conn

    async def store_photo(self, photo: Photo, dimensions: Optional[Tuple[int, int]] = None) -> int:
        """
        Store or update photo metadata.

        Args:
            photo: Photo object with path and mtime
            dimensions: Optional (width, height) tuple

        Returns:
            Photo ID in database
        """
        await self.initialize()

        path_str = str(photo.path)
        relative_path = str(photo.path.relative_to(self.root_dir)) if photo.path.is_relative_to(self.root_dir) else path_str
        filename = photo.path.name
        size = photo.path.stat().st_size if photo.path.exists() else None

        width, height = dimensions or (None, None)

        async with self._get_connection() as conn:
            # Insert or replace photo
            await conn.execute("""
                INSERT OR REPLACE INTO photos
                (path, relative_path, filename, mtime, size, width, height, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
            """, (path_str, relative_path, filename, photo.mtime, size, width, height))

            # Get the photo ID
            cursor = await conn.execute("SELECT id FROM photos WHERE path = ?", (path_str,))
            row = await cursor.fetchone()
            photo_id = row[0] if row else None

            await conn.commit()
            return photo_id

    async def get_photo(self, photo_id: int) -> Optional[Photo]:
        """Get photo by ID."""
        await self.initialize()

        async with self._get_connection() as conn:
            cursor = await conn.execute("""
                SELECT path, mtime FROM photos WHERE id = ?
            """, (photo_id,))

            row = await cursor.fetchone()
            if row:
                path, mtime = row
                return Photo(path=Path(path), mtime=mtime)
            return None

    async def get_photo_by_path(self, path: str) -> Optional[Tuple[int, Photo]]:
        """Get photo ID and Photo object by path."""
        await self.initialize()

        async with self._get_connection() as conn:
            cursor = await conn.execute("""
                SELECT id, path, mtime FROM photos WHERE path = ?
            """, (path,))

            row = await cursor.fetchone()
            if row:
                photo_id, path_str, mtime = row
                return photo_id, Photo(path=Path(path_str), mtime=mtime)
            return None

    async def get_all_photos(self) -> List[Tuple[int, Photo]]:
        """Get all photos with their IDs."""
        await self.initialize()

        async with self._get_connection() as conn:
            cursor = await conn.execute("""
                SELECT id, path, mtime FROM photos ORDER BY path
            """)

            photos = []
            async for row in cursor:
                photo_id, path_str, mtime = row
                photos.append((photo_id, Photo(path=Path(path_str), mtime=mtime)))

            return photos

    async def delete_photo(self, photo_id: int) -> bool:
        """Delete photo and all associated data."""
        await self.initialize()

        async with self._get_connection() as conn:
            # Delete photo (cascade will handle related data)
            await conn.execute("DELETE FROM photos WHERE id = ?", (photo_id,))
            deleted = conn.total_changes > 0
            await conn.commit()
            return deleted

    async def store_thumbnail(self, photo_id: int, thumbnail_data: bytes,
                            format: str = 'webp', dimensions: Optional[Tuple[int, int]] = None) -> None:
        """Store thumbnail data for a photo."""
        await self.initialize()

        width, height = dimensions or (None, None)

        async with self._get_connection() as conn:
            await conn.execute("""
                INSERT OR REPLACE INTO thumbnails
                (photo_id, data, format, width, height, size_bytes)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (photo_id, thumbnail_data, format, width, height, len(thumbnail_data)))
            await conn.commit()

    async def get_thumbnail(self, photo_id: int) -> Optional[bytes]:
        """Get thumbnail data for a photo."""
        await self.initialize()

        async with self._get_connection() as conn:
            cursor = await conn.execute("""
                SELECT data FROM thumbnails WHERE photo_id = ?
            """, (photo_id,))

            row = await cursor.fetchone()
            return row[0] if row else None

    async def store_embedding(self, photo_id: int, vector: np.ndarray, model_name: str = "") -> None:
        """Store embedding vector for a photo."""
        await self.initialize()

        # Convert numpy array to bytes
        vector_bytes = vector.astype(np.float32).tobytes()

        async with self._get_connection() as conn:
            await conn.execute("""
                INSERT OR REPLACE INTO embeddings
                (photo_id, vector, dimensions, model_name)
                VALUES (?, ?, ?, ?)
            """, (photo_id, vector_bytes, len(vector), model_name))
            await conn.commit()

    async def get_embedding(self, photo_id: int) -> Optional[np.ndarray]:
        """Get embedding vector for a photo."""
        await self.initialize()

        async with self._get_connection() as conn:
            cursor = await conn.execute("""
                SELECT vector, dimensions FROM embeddings WHERE photo_id = ?
            """, (photo_id,))

            row = await cursor.fetchone()
            if row:
                vector_bytes, dimensions = row
                return np.frombuffer(vector_bytes, dtype=np.float32).reshape(dimensions)
            return None

    async def get_all_embeddings(self) -> Dict[int, np.ndarray]:
        """Get all embeddings as a dictionary of photo_id -> vector."""
        await self.initialize()

        async with self._get_connection() as conn:
            cursor = await conn.execute("""
                SELECT photo_id, vector, dimensions FROM embeddings
            """)

            embeddings = {}
            async for row in cursor:
                photo_id, vector_bytes, dimensions = row
                vector = np.frombuffer(vector_bytes, dtype=np.float32).reshape(dimensions)
                embeddings[photo_id] = vector

            return embeddings

    async def search_similar(self, query_vector: np.ndarray, top_k: int = 12) -> List[Tuple[int, float]]:
        """
        Find most similar photos using cosine similarity.
        Returns list of (photo_id, similarity_score) tuples.
        """
        await self.initialize()

        embeddings = await self.get_all_embeddings()
        if not embeddings:
            return []

        # Calculate cosine similarities
        similarities = []
        query_norm = np.linalg.norm(query_vector)

        for photo_id, vector in embeddings.items():
            vector_norm = np.linalg.norm(vector)
            if vector_norm > 0 and query_norm > 0:
                similarity = np.dot(vector, query_vector) / (vector_norm * query_norm)
                similarities.append((photo_id, float(similarity)))
            else:
                similarities.append((photo_id, 0.0))

        # Sort by similarity (descending) and return top_k
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_k]

    async def get_stats(self) -> Dict[str, Any]:
        """Get database statistics."""
        await self.initialize()

        async with self._get_connection() as conn:
            stats = {}

            # Photo count
            cursor = await conn.execute("SELECT COUNT(*) FROM photos")
            stats['photo_count'] = (await cursor.fetchone())[0]

            # Thumbnail count
            cursor = await conn.execute("SELECT COUNT(*) FROM thumbnails")
            stats['thumbnail_count'] = (await cursor.fetchone())[0]

            # Embedding count
            cursor = await conn.execute("SELECT COUNT(*) FROM embeddings")
            stats['embedding_count'] = (await cursor.fetchone())[0]

            # Total thumbnail size
            cursor = await conn.execute("SELECT SUM(size_bytes) FROM thumbnails")
            total_size = (await cursor.fetchone())[0]
            stats['total_thumbnail_size_mb'] = round((total_size or 0) / (1024 * 1024), 2)

            # Database file size
            if self.db_path.exists():
                stats['db_size_mb'] = round(self.db_path.stat().st_size / (1024 * 1024), 2)
            else:
                stats['db_size_mb'] = 0

            return stats

    async def cleanup_orphaned_data(self) -> Dict[str, int]:
        """
        Remove thumbnails and embeddings for photos that no longer exist.
        Returns counts of removed items.
        """
        await self.initialize()

        async with self._get_connection() as conn:
            # Find photos that no longer exist on disk
            cursor = await conn.execute("SELECT id, path FROM photos")
            orphaned_ids = []

            async for row in cursor:
                photo_id, path_str = row
                if not Path(path_str).exists():
                    orphaned_ids.append(photo_id)

            # Delete orphaned data (cascade will handle related records)
            removed_photos = len(orphaned_ids)
            if orphaned_ids:
                placeholders = ','.join('?' * len(orphaned_ids))
                await conn.execute(f"DELETE FROM photos WHERE id IN ({placeholders})", orphaned_ids)

            await conn.commit()

            return {
                'removed_photos': removed_photos,
                'removed_thumbnails': removed_photos,  # Same count due to cascade
                'removed_embeddings': removed_photos,  # Same count due to cascade
            }

    async def close(self) -> None:
        """Close database connections."""
        # aiosqlite handles connection closing automatically
        pass