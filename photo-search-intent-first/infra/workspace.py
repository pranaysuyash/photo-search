from __future__ import annotations

import json
from pathlib import Path
from typing import List, Dict

APP_DIR = Path.home() / ".photo_search"
WS_FILE = APP_DIR / "workspace.json"


def load_workspace() -> List[str]:
    try:
        if WS_FILE.exists():
            data = json.loads(WS_FILE.read_text())
            if isinstance(data, dict):
                return list(dict.fromkeys([str(p) for p in data.get("folders", [])]))
            if isinstance(data, list):
                return list(dict.fromkeys([str(p) for p in data]))
    except Exception:
        pass
    return []


def save_workspace(folders: List[str]) -> None:
    try:
        APP_DIR.mkdir(parents=True, exist_ok=True)
        WS_FILE.write_text(json.dumps({"folders": list(dict.fromkeys(folders))}, indent=2))
    except Exception:
        pass

