"""
SQLite-based IndexStore implementation.
Provides the same interface as IndexStore but uses SQLite for storage instead of files.
"""

import asyncio
import logging
from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any, Union
import numpy as np

from domain.models import Photo, SearchResult
from infra.sqlite_store import SQLitePhotoStore
from infra.index_store import IndexStore, IndexState

logger = logging.getLogger(__name__)

class SQLiteIndexStore:
    """
    SQLite-backed implementation of IndexStore interface.
    Uses SQLitePhotoStore for persistence instead of JSON/NumPy files.
    """

    def __init__(self, root: Union[str, Path], index_key: Optional[str] = None):
        """
        Initialize SQLite index store.

        Args:
            root: Root directory path
            index_key: Optional key for multiple indexes per root
        """
        self.root = Path(root).resolve()
        self.index_key = index_key or "default"

        # Create SQLite database path
        safe_root = self._sanitize_key(str(self.root))
        db_name = f"photo_index_{safe_root}_{self.index_key}.db"
        self.db_path = self.root / ".photo_index" / db_name

        # Initialize SQLite store
        self.sqlite_store = SQLitePhotoStore(self.db_path, self.root)

        # In-memory state for compatibility with existing interface
        self.state = IndexState(paths=[], mtimes=[], embeddings=None)

    def _sanitize_key(self, key: str) -> str:
        """Sanitize key for filesystem/database use."""
        import re
        return re.sub(r'[^\w\-_]', '_', key)

    async def initialize(self) -> None:
        """Initialize the SQLite database."""
        await self.sqlite_store.initialize()

    def load(self) -> None:
        """Load state from SQLite (for compatibility)."""
        # For compatibility, we don't load everything into memory
        # Instead, operations work directly with SQLite
        pass

    def save(self) -> None:
        """Save state (no-op for SQLite backend)."""
        # SQLite handles persistence automatically
        pass

    async def upsert(self, embedder, photos: List[Photo], batch_size: int = 32,
                    progress: Optional[callable] = None) -> Tuple[int, int]:
        """
        Update or insert photos with embeddings.

        Args:
            embedder: Embedding provider
            photos: List of Photo objects
            batch_size: Batch size for processing
            progress: Optional progress callback

        Returns:
            (new_count, updated_count)
        """
        await self.initialize()

        new_count = 0
        updated_count = 0

        # Get existing photos
        existing_photos = await self.sqlite_store.get_all_photos()
        existing_paths = {str(photo.path): photo_id for photo_id, photo in existing_photos}

        # Process photos in batches
        total_photos = len(photos)
        processed = 0

        for i in range(0, total_photos, batch_size):
            batch = photos[i:i + batch_size]

            # Check which photos are new or modified
            to_process = []
            for photo in batch:
                path_str = str(photo.path)
                existing_id = existing_paths.get(path_str)

                if existing_id is None:
                    # New photo
                    to_process.append(('new', photo))
                else:
                    # Check if modified
                    existing_photo = next((p for pid, p in existing_photos if pid == existing_id), None)
                    if existing_photo and photo.mtime > existing_photo.mtime + 1e-6:
                        to_process.append(('update', photo))

            if not to_process:
                processed += len(batch)
                if progress:
                    progress({
                        'phase': 'check',
                        'done': processed,
                        'total': total_photos,
                    })
                continue

            # Extract paths for embedding
            paths_to_embed = [photo.path for _, photo in to_process]

            try:
                # Generate embeddings
                embeddings = embedder.embed_images(paths_to_embed, batch_size=batch_size)

                # Store each photo and its embedding
                for j, (action, photo) in enumerate(to_process):
                    embedding = embeddings[j]

                    # Skip zero vectors
                    if np.linalg.norm(embedding) == 0:
                        continue

                    # Store photo metadata
                    photo_id = await self.sqlite_store.store_photo(photo)

                    # Store embedding
                    await self.sqlite_store.store_embedding(photo_id, embedding)

                    if action == 'new':
                        new_count += 1
                    else:
                        updated_count += 1

            except Exception as e:
                logger.error(f"Error processing batch {i//batch_size}: {e}")
                continue

            processed += len(batch)
            if progress:
                progress({
                    'phase': 'embed',
                    'done': processed,
                    'total': total_photos,
                })

        return new_count, updated_count

    async def search(self, embedder, query: str, top_k: int = 12,
                    subset: Optional[List[int]] = None) -> List[SearchResult]:
        """
        Search for similar photos.

        Args:
            embedder: Embedding provider
            query: Search query
            top_k: Number of results to return
            subset: Optional subset of photo IDs to search within

        Returns:
            List of SearchResult objects
        """
        await self.initialize()

        # Generate query embedding
        query_vector = embedder.embed_text(query)

        # Search for similar photos
        similar_photos = await self.sqlite_store.search_similar(query_vector, top_k=top_k)

        results = []
        for photo_id, score in similar_photos:
            photo = await self.sqlite_store.get_photo(photo_id)
            if photo:
                results.append(SearchResult(path=photo.path, score=score))

        return results

    async def get_all_photos(self) -> List[Photo]:
        """Get all photos."""
        await self.initialize()
        photos = await self.sqlite_store.get_all_photos()
        return [photo for _, photo in photos]

    async def get_photo_count(self) -> int:
        """Get total number of photos."""
        stats = await self.sqlite_store.get_stats()
        return stats.get('photo_count', 0)

    async def get_embedding_count(self) -> int:
        """Get number of photos with embeddings."""
        stats = await self.sqlite_store.get_stats()
        return stats.get('embedding_count', 0)

    async def cleanup_orphaned(self) -> Dict[str, int]:
        """Clean up orphaned data."""
        return await self.sqlite_store.cleanup_orphaned_data()

    async def get_stats(self) -> Dict[str, Any]:
        """Get store statistics."""
        return await self.sqlite_store.get_stats()

    # Synchronous compatibility methods for existing interface
    def upsert_sync(self, embedder, photos: List[Photo], batch_size: int = 32,
                   progress: Optional[callable] = None) -> Tuple[int, int]:
        """Synchronous version of upsert."""
        return asyncio.run(self.upsert(embedder, photos, batch_size, progress))

    def search_sync(self, embedder, query: str, top_k: int = 12,
                   subset: Optional[List[int]] = None) -> List[SearchResult]:
        """Synchronous version of search."""
        return asyncio.run(self.search(embedder, query, top_k, subset))

    def get_all_photos_sync(self) -> List[Photo]:
        """Synchronous version of get_all_photos."""
        return asyncio.run(self.get_all_photos())

    def get_photo_count_sync(self) -> int:
        """Synchronous version of get_photo_count."""
        return asyncio.run(self.get_photo_count())

    def get_embedding_count_sync(self) -> int:
        """Synchronous version of get_embedding_count."""
        return asyncio.run(self.get_embedding_count())

    def cleanup_orphaned_sync(self) -> Dict[str, int]:
        """Synchronous version of cleanup_orphaned."""
        return asyncio.run(self.cleanup_orphaned())

    def get_stats_sync(self) -> Dict[str, Any]:
        """Synchronous version of get_stats."""
        return asyncio.run(self.get_stats())

    # Delegate other methods to maintain compatibility
    def should_rebuild_cache(self, current_paths: List[str]) -> bool:
        """Check if cache should be rebuilt (not applicable for SQLite)."""
        return False  # SQLite handles this automatically

    def rebuild_cache_if_needed(self, embedder, current_paths: List[str], batch_size: int = 32) -> bool:
        """Rebuild cache if needed (no-op for SQLite)."""
        return False