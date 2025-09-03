from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, Optional

from PIL import Image, ExifTags


def _exif_store(index_dir: Path) -> Path:
    return index_dir / "exif_dates.json"


def parse_exif_datetime(val: str) -> Optional[float]:
    # Expected format: "YYYY:MM:DD HH:MM:SS"
    try:
        dt = datetime.strptime(val.strip(), "%Y:%m:%d %H:%M:%S")
        return dt.timestamp()
    except Exception:
        return None


def read_capture_ts(path: Path) -> Optional[float]:
    try:
        img = Image.open(path)
        ex = img._getexif() or {}
        inv = {v: k for k, v in ExifTags.TAGS.items()}
        dt = ex.get(inv.get("DateTimeOriginal", -1)) or ex.get(inv.get("DateTime", -1))
        if isinstance(dt, bytes):
            dt = dt.decode(errors="ignore")
        if isinstance(dt, str):
            return parse_exif_datetime(dt)
    except Exception:
        return None
    return None


def load_exif_dates(index_dir: Path) -> Dict[str, float]:
    p = _exif_store(index_dir)
    try:
        if p.exists():
            data = json.loads(p.read_text())
            if isinstance(data, dict):
                # ensure floats
                return {k: float(v) for k, v in data.items() if isinstance(k, str)}
    except Exception:
        pass
    return {}


def save_exif_dates(index_dir: Path, data: Dict[str, float]) -> None:
    try:
        _exif_store(index_dir).write_text(json.dumps(data))
    except Exception:
        pass


def preload_capture_dates(index_dir: Path, paths: Iterable[str]) -> int:
    """Compute and cache EXIF capture timestamps for given paths.

    Returns number of newly computed entries.
    """
    cache = load_exif_dates(index_dir)
    added = 0
    for sp in paths:
        if sp in cache:
            continue
        ts = read_capture_ts(Path(sp))
        if ts is not None:
            cache[sp] = float(ts)
            added += 1
    save_exif_dates(index_dir, cache)
    return added

