"""
Storage backend factory for photo search.
Provides unified interface for different storage backends (file-based vs SQLite).
"""

from pathlib import Path
from typing import Union, Optional
import logging

from infra.config import config
from infra.index_store import IndexStore
from infra.sqlite_index_store import SQLiteIndexStore

logger = logging.getLogger(__name__)

def create_index_store(root: Union[str, Path], index_key: Optional[str] = None) -> Union[IndexStore, SQLiteIndexStore]:
    """
    Create appropriate index store based on configuration.

    Args:
        root: Root directory path
        index_key: Optional key for multiple indexes per root

    Returns:
        IndexStore instance (file-based or SQLite)
    """
    backend = config.storage_backend.lower()

    if backend == "sqlite":
        logger.info("Using SQLite storage backend")
        return SQLiteIndexStore(root, index_key)
    elif backend == "file":
        logger.info("Using file-based storage backend")
        return IndexStore(root, index_key)
    else:
        logger.warning(f"Unknown storage backend '{backend}', falling back to file-based")
        return IndexStore(root, index_key)

async def initialize_storage(store: Union[IndexStore, SQLiteIndexStore]) -> None:
    """
    Initialize storage backend if needed.

    Args:
        store: Index store instance
    """
    if hasattr(store, 'initialize') and callable(store.initialize):
        await store.initialize()


def initialize_storage_sync(store: Union[IndexStore, SQLiteIndexStore]) -> None:
    """
    Synchronous version of initialize_storage for backward compatibility.

    Args:
        store: Index store instance
    """
    if hasattr(store, 'initialize') and callable(store.initialize):
        # For SQLite stores, we need to run async initialization
        import asyncio
        asyncio.run(store.initialize())