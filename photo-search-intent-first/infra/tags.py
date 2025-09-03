from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List


def _file(index_dir: Path) -> Path:
    return index_dir / "tags.json"


def load_tags(index_dir: Path) -> Dict[str, List[str]]:
    try:
        p = _file(index_dir)
        if p.exists():
            return json.loads(p.read_text())
    except Exception:
        pass
    return {}


def save_tags(index_dir: Path, data: Dict[str, List[str]]) -> None:
    try:
        _file(index_dir).write_text(json.dumps(data, indent=2))
    except Exception:
        pass


def all_tags(index_dir: Path) -> List[str]:
    tags = set()
    for lst in load_tags(index_dir).values():
        for t in lst:
            if t:
                tags.add(t)
    return sorted(tags)

