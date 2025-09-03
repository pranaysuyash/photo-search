from __future__ import annotations

from pathlib import Path
from typing import Dict, List

from infra.tags import load_tags as _load_tags, save_tags as _save_tags, all_tags as _all_tags


def load_tags(index_dir: Path) -> Dict[str, List[str]]:
    """Return the tag map for an index directory.

    Intent: Manage photo tags as a user concept (not storage details).
    """
    return _load_tags(index_dir)


def save_tags(index_dir: Path, data: Dict[str, List[str]]) -> None:
    """Persist tag updates for an index directory."""
    _save_tags(index_dir, data)


def all_tags(index_dir: Path) -> List[str]:
    """Return a sorted list of all tags used in this index."""
    return _all_tags(index_dir)

