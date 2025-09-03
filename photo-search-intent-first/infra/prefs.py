from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict


APP_DIR = Path.home() / ".photo_search"
PREFS_FILE = APP_DIR / "intent_first_prefs.json"


DEFAULTS: Dict[str, Any] = {
    "photo_dir": str(Path.home()),
    "provider_label": "On-device (Recommended)",
    "grid_cols": 6,
    "batch_size": 32,
    "use_ann": False,
    "ann_trees": 50,
}


def load_prefs() -> Dict[str, Any]:
    try:
        if PREFS_FILE.exists():
            return {**DEFAULTS, **json.loads(PREFS_FILE.read_text())}
    except Exception:
        pass
    return DEFAULTS.copy()


def save_prefs(p: Dict[str, Any]) -> None:
    try:
        APP_DIR.mkdir(parents=True, exist_ok=True)
        PREFS_FILE.write_text(json.dumps(p, indent=2))
    except Exception:
        # Best-effort; ignore save failures
        pass

