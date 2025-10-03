"""
Migration utilities for converting between storage backends.
Supports migrating from file-based storage to SQLite and vice versa.
"""

import asyncio
import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any, Union
import numpy as np

from domain.models import Photo
from infra.index_store import IndexStore
from infra.sqlite_index_store import SQLiteIndexStore

logger = logging.getLogger(__name__)

class StorageMigrator:
    """Handles migration between different storage backends."""

    def __init__(self, root_dir: Path, index_key: Optional[str] = None):
        """
        Initialize migrator.

        Args:
            root_dir: Root directory containing the index
            index_key: Optional index key
        """
        self.root_dir = root_dir
        self.index_key = index_key or "default"

    async def migrate_file_to_sqlite(self, sqlite_store: SQLiteIndexStore,
                                    progress_callback: Optional[callable] = None) -> Dict[str, Any]:
        """
        Migrate from file-based storage to SQLite.

        Args:
            sqlite_store: Target SQLite store
            progress_callback: Optional progress reporting function

        Returns:
            Migration statistics
        """
        logger.info(f"Migrating file-based index to SQLite for {self.root_dir}")

        # Initialize SQLite store
        await sqlite_store.initialize()

        # Load existing file-based index
        file_store = IndexStore(self.root_dir, self.index_key)
        file_store.load()

        stats = {
            'photos_migrated': 0,
            'embeddings_migrated': 0,
            'thumbnails_migrated': 0,
            'errors': 0,
            'skipped_zero_embeddings': 0
        }

        if not file_store.state.paths:
            logger.info("No existing file-based index found")
            return stats

        total_photos = len(file_store.state.paths)

        if progress_callback:
            progress_callback({
                'phase': 'migration_start',
                'total': total_photos,
                'done': 0
            })

        # Process photos in batches
        batch_size = 50

        for i in range(0, total_photos, batch_size):
            batch_end = min(i + batch_size, total_photos)
            batch_paths = file_store.state.paths[i:batch_end]
            batch_mtimes = file_store.state.mtimes[i:batch_end]

            for j, (path_str, mtime) in enumerate(zip(batch_paths, batch_mtimes)):
                try:
                    photo_path = Path(path_str)

                    # Skip if file doesn't exist
                    if not photo_path.exists():
                        logger.warning(f"Photo file not found: {path_str}")
                        stats['errors'] += 1
                        continue

                    # Create Photo object
                    photo = Photo(path=photo_path, mtime=mtime)

                    # Store photo metadata
                    photo_id = await sqlite_store.sqlite_store.store_photo(photo)

                    # Store embedding if available
                    if file_store.state.embeddings is not None and i + j < len(file_store.state.embeddings):
                        embedding = file_store.state.embeddings[i + j]

                        # Skip zero vectors
                        if np.linalg.norm(embedding) > 0:
                            await sqlite_store.sqlite_store.store_embedding(photo_id, embedding)
                            stats['embeddings_migrated'] += 1
                        else:
                            stats['skipped_zero_embeddings'] += 1

                    stats['photos_migrated'] += 1

                except Exception as e:
                    logger.error(f"Error migrating photo {path_str}: {e}")
                    stats['errors'] += 1

            if progress_callback:
                progress_callback({
                    'phase': 'migration_progress',
                    'total': total_photos,
                    'done': min(batch_end, total_photos)
                })

        if progress_callback:
            progress_callback({
                'phase': 'migration_complete',
                'stats': stats
            })

        logger.info(f"Migration completed: {stats}")
        return stats

    async def migrate_sqlite_to_file(self, sqlite_store: SQLiteIndexStore,
                                    file_store: IndexStore,
                                    progress_callback: Optional[callable] = None) -> Dict[str, Any]:
        """
        Migrate from SQLite storage to file-based storage.

        Args:
            sqlite_store: Source SQLite store
            file_store: Target file store
            progress_callback: Optional progress reporting function

        Returns:
            Migration statistics
        """
        logger.info(f"Migrating SQLite index to file-based for {self.root_dir}")

        # Initialize SQLite store
        await sqlite_store.initialize()

        stats = {
            'photos_migrated': 0,
            'embeddings_migrated': 0,
            'errors': 0
        }

        # Get all photos from SQLite
        photos_data = await sqlite_store.sqlite_store.get_all_photos()

        if not photos_data:
            logger.info("No photos found in SQLite store")
            return stats

        total_photos = len(photos_data)

        if progress_callback:
            progress_callback({
                'phase': 'migration_start',
                'total': total_photos,
                'done': 0
            })

        # Prepare data for file store
        paths = []
        mtimes = []
        embeddings = []

        for i, (photo_id, photo) in enumerate(photos_data):
            try:
                paths.append(str(photo.path))
                mtimes.append(photo.mtime)

                # Get embedding
                embedding = await sqlite_store.sqlite_store.get_embedding(photo_id)
                if embedding is not None:
                    embeddings.append(embedding)
                    stats['embeddings_migrated'] += 1
                else:
                    # Add zero vector as placeholder
                    embeddings.append(np.zeros(512, dtype=np.float32))  # Assume 512-dim embeddings

                stats['photos_migrated'] += 1

            except Exception as e:
                logger.error(f"Error migrating photo ID {photo_id}: {e}")
                stats['errors'] += 1

            if progress_callback and (i + 1) % 10 == 0:
                progress_callback({
                    'phase': 'migration_progress',
                    'total': total_photos,
                    'done': i + 1
                })

        # Save to file store
        if paths:
            file_store.state.paths = paths
            file_store.state.mtimes = mtimes
            if embeddings:
                file_store.state.embeddings = np.stack(embeddings)
            file_store.save()

        if progress_callback:
            progress_callback({
                'phase': 'migration_complete',
                'stats': stats
            })

        logger.info(f"Migration completed: {stats}")
        return stats

    async def validate_migration(self, source_store: Union[IndexStore, SQLiteIndexStore],
                               target_store: Union[IndexStore, SQLiteIndexStore]) -> Dict[str, Any]:
        """
        Validate that migration preserved data integrity.

        Args:
            source_store: Source storage
            target_store: Target storage

        Returns:
            Validation results
        """
        logger.info("Validating migration integrity")

        validation = {
            'photo_count_match': False,
            'embedding_count_match': False,
            'sample_photos_match': False,
            'errors': []
        }

        try:
            # Get counts
            if isinstance(source_store, IndexStore):
                source_photos = len(source_store.state.paths) if source_store.state.paths else 0
                source_embeddings = source_store.state.embeddings.shape[0] if source_store.state.embeddings is not None else 0
            else:
                source_stats = await source_store.get_stats()
                source_photos = source_stats['photo_count']
                source_embeddings = source_stats['embedding_count']

            if isinstance(target_store, IndexStore):
                target_photos = len(target_store.state.paths) if target_store.state.paths else 0
                target_embeddings = target_store.state.embeddings.shape[0] if target_store.state.embeddings is not None else 0
            else:
                target_stats = await target_store.get_stats()
                target_photos = target_stats['photo_count']
                target_embeddings = target_stats['embedding_count']

            validation['photo_count_match'] = source_photos == target_photos
            validation['embedding_count_match'] = source_embeddings == target_embeddings

            # Sample validation (check first few photos)
            if isinstance(source_store, IndexStore) and source_store.state.paths:
                sample_paths = source_store.state.paths[:5]
            elif isinstance(source_store, SQLiteIndexStore):
                source_photos_data = await source_store.sqlite_store.get_all_photos()
                sample_paths = [str(photo.path) for _, photo in source_photos_data[:5]]
            else:
                sample_paths = []

            if isinstance(target_store, IndexStore) and target_store.state.paths:
                target_sample_paths = target_store.state.paths[:5]
            elif isinstance(target_store, SQLiteIndexStore):
                target_photos_data = await target_store.sqlite_store.get_all_photos()
                target_sample_paths = [str(photo.path) for _, photo in target_photos_data[:5]]
            else:
                target_sample_paths = []

            validation['sample_photos_match'] = set(sample_paths) == set(target_sample_paths)

        except Exception as e:
            validation['errors'].append(str(e))
            logger.error(f"Validation error: {e}")

        logger.info(f"Validation results: {validation}")
        return validation