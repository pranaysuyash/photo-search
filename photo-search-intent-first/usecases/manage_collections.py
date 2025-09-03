from __future__ import annotations

from pathlib import Path
from typing import Dict, List

from infra.collections import load_collections as _load_collections, save_collections as _save_collections


def load_collections(index_dir: Path) -> Dict[str, List[str]]:
    """Return the collections map for an index directory.

    Intent: Collections represent user-curated sets (e.g., Favorites, Albums).
    """
    return _load_collections(index_dir)


def save_collections(index_dir: Path, data: Dict[str, List[str]]) -> None:
    """Persist collection updates for an index directory."""
    _save_collections(index_dir, data)

