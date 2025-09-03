from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

APP_DIR = Path.home() / ".photo_search"
SAVED_FILE = APP_DIR / "saved_searches.json"


def load_saved() -> List[Dict[str, Any]]:
    try:
        if SAVED_FILE.exists():
            return json.loads(SAVED_FILE.read_text())
    except Exception:
        pass
    return []


def save_saved(items: List[Dict[str, Any]]) -> None:
    try:
        APP_DIR.mkdir(parents=True, exist_ok=True)
        SAVED_FILE.write_text(json.dumps(items, indent=2))
    except Exception:
        pass

