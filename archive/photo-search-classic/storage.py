import json
import logging
from pathlib import Path
from typing import Any, Dict, List


def _collections_file(index_dir: Path) -> Path:
    return index_dir / "collections.json"


def _favorites_file(index_dir: Path) -> Path:
    return index_dir / "favorites.json"


def _tags_file(index_dir: Path) -> Path:
    return index_dir / "tags.json"


def _saved_file(index_dir: Path) -> Path:
    return index_dir / "saved.json"

def _smart_file(index_dir: Path) -> Path:
    return index_dir / "smart.json"


def load_collections(index_dir: Path) -> Dict[str, List[str]]:
    try:
        p = _collections_file(index_dir)
        if p.exists():
            return json.loads(p.read_text())
    except Exception:
        logging.exception("load_collections: failed to read collections.json at %s", str(_collections_file(index_dir)))
    # Fallback: adapt legacy favorites.json if present
    try:
        f = _favorites_file(index_dir)
        if f.exists():
            fav = json.loads(f.read_text()).get("paths", [])
            return {"Favorites": fav}
    except Exception:
        logging.exception("load_collections: failed to adapt legacy favorites at %s", str(_favorites_file(index_dir)))
    return {}


def save_collections(index_dir: Path, data: Dict[str, List[str]]) -> None:
    try:
        _collections_file(index_dir).write_text(json.dumps(data, indent=2))
        # Keep legacy favorites.json in sync if Favorites exists
        favs = data.get("Favorites")
        if isinstance(favs, list):
            _favorites_file(index_dir).write_text(json.dumps({"paths": favs}, indent=2))
    except Exception:
        logging.exception("save_collections: failed to write collections for %s", str(index_dir))


def load_tags(index_dir: Path) -> Dict[str, List[str]]:
    try:
        p = _tags_file(index_dir)
        if p.exists():
            return json.loads(p.read_text())
    except Exception:
        logging.exception("load_tags: failed to read tags.json at %s", str(_tags_file(index_dir)))
    return {}


def save_tags(index_dir: Path, data: Dict[str, List[str]]) -> None:
    try:
        _tags_file(index_dir).write_text(json.dumps(data, indent=2))
    except Exception:
        logging.exception("save_tags: failed to write tags.json for %s", str(index_dir))


def all_tags(index_dir: Path) -> List[str]:
    tags = set()
    for lst in load_tags(index_dir).values():
        for t in lst:
            if t:
                tags.add(t)
    return sorted(tags)


def load_saved(index_dir: Path) -> List[Dict[str, Any]]:
    try:
        p = _saved_file(index_dir)
        if p.exists():
            data = json.loads(p.read_text())
            if isinstance(data, list):
                return data
    except Exception:
        logging.exception("load_saved: failed to read saved.json at %s", str(_saved_file(index_dir)))
    return []


def save_saved(index_dir: Path, items: List[Dict[str, Any]]) -> None:
    try:
        _saved_file(index_dir).write_text(json.dumps(items, indent=2))
    except Exception:
        logging.exception("save_saved: failed to write saved.json for %s", str(index_dir))


def load_smart(index_dir: Path) -> Dict[str, Any]:
    try:
        p = _smart_file(index_dir)
        if p.exists():
            d = json.loads(p.read_text())
            if isinstance(d, dict):
                return d
    except Exception:
        logging.exception("load_smart: failed to read smart.json at %s", str(_smart_file(index_dir)))
    return {}


def save_smart(index_dir: Path, data: Dict[str, Any]) -> None:
    try:
        _smart_file(index_dir).write_text(json.dumps(data, indent=2))
    except Exception:
        logging.exception("save_smart: failed to write smart.json for %s", str(index_dir))


# Simple per-user preferences
APP_DIR = Path.home() / ".photo_search"
PREFS_FILE = APP_DIR / "classic_prefs.json"


def load_prefs(defaults: Dict[str, Any]) -> Dict[str, Any]:
    try:
        if PREFS_FILE.exists():
            return {**defaults, **json.loads(PREFS_FILE.read_text())}
    except Exception:
        logging.exception("load_prefs: failed to read classic_prefs.json")
    return defaults.copy()


def save_prefs(p: Dict[str, Any]) -> None:
    try:
        APP_DIR.mkdir(parents=True, exist_ok=True)
        PREFS_FILE.write_text(json.dumps(p, indent=2))
    except Exception:
        logging.exception("save_prefs: failed to write classic_prefs.json")
