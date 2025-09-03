import json
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


def load_collections(index_dir: Path) -> Dict[str, List[str]]:
    try:
        p = _collections_file(index_dir)
        if p.exists():
            return json.loads(p.read_text())
    except Exception:
        pass
    # Fallback: adapt legacy favorites.json if present
    try:
        f = _favorites_file(index_dir)
        if f.exists():
            fav = json.loads(f.read_text()).get("paths", [])
            return {"Favorites": fav}
    except Exception:
        pass
    return {}


def save_collections(index_dir: Path, data: Dict[str, List[str]]) -> None:
    try:
        _collections_file(index_dir).write_text(json.dumps(data, indent=2))
        # Keep legacy favorites.json in sync if Favorites exists
        favs = data.get("Favorites")
        if isinstance(favs, list):
            _favorites_file(index_dir).write_text(json.dumps({"paths": favs}, indent=2))
    except Exception:
        pass


def load_tags(index_dir: Path) -> Dict[str, List[str]]:
    try:
        p = _tags_file(index_dir)
        if p.exists():
            return json.loads(p.read_text())
    except Exception:
        pass
    return {}


def save_tags(index_dir: Path, data: Dict[str, List[str]]) -> None:
    try:
        _tags_file(index_dir).write_text(json.dumps(data, indent=2))
    except Exception:
        pass


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
        pass
    return []


def save_saved(index_dir: Path, items: List[Dict[str, Any]]) -> None:
    try:
        _saved_file(index_dir).write_text(json.dumps(items, indent=2))
    except Exception:
        pass


# Simple per-user preferences
APP_DIR = Path.home() / ".photo_search"
PREFS_FILE = APP_DIR / "classic_prefs.json"


def load_prefs(defaults: Dict[str, Any]) -> Dict[str, Any]:
    try:
        if PREFS_FILE.exists():
            return {**defaults, **json.loads(PREFS_FILE.read_text())}
    except Exception:
        pass
    return defaults.copy()


def save_prefs(p: Dict[str, Any]) -> None:
    try:
        APP_DIR.mkdir(parents=True, exist_ok=True)
        PREFS_FILE.write_text(json.dumps(p, indent=2))
    except Exception:
        pass

