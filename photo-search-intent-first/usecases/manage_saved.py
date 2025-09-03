from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List


def _file(index_dir: Path) -> Path:
    return Path(index_dir) / "saved_searches.json"


def load_saved(index_dir: Path) -> List[Dict[str, Any]]:
    """Return saved searches scoped to this index directory.

    Intent: Saved searches are tied to the current library, not global app state.
    """
    try:
        p = _file(index_dir)
        if p.exists():
            import json
            data = json.loads(p.read_text())
            if isinstance(data, list):
                return data
    except Exception:
        pass
    return []


def save_saved(index_dir: Path, items: List[Dict[str, Any]]) -> None:
    """Persist saved searches for this index directory."""
    try:
        p = _file(index_dir)
        p.write_text(__import__('json').dumps(items, indent=2))
    except Exception:
        pass
