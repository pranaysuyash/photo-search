from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List


def _file(index_dir: Path) -> Path:
    return index_dir / "collections.json"


def load_collections(index_dir: Path) -> Dict[str, List[str]]:
    try:
        p = _file(index_dir)
        if p.exists():
            return json.loads(p.read_text())
    except Exception:
        pass
    return {}


def save_collections(index_dir: Path, data: Dict[str, List[str]]) -> None:
    try:
        p = _file(index_dir)
        p.write_text(json.dumps(data, indent=2))
    except Exception:
        pass

