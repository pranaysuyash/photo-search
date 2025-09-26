from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Optional, Tuple
import os


from adapters.fs_scanner import safe_open_image


def _thumbs_dir(index_dir: Path) -> Path:
    d = index_dir / "thumbs"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _thumb_name(path: Path, mtime: float, size: int) -> str:
    h = hashlib.sha1(f"{str(path)}|{mtime}|{size}".encode("utf-8")).hexdigest()
    return f"{h}.jpg"


def get_or_create_thumb(index_dir: Path, img_path: Path, mtime: float, size: int = 512) -> Optional[Path]:
    try:
        tdir = _thumbs_dir(index_dir)
        tname = _thumb_name(img_path, mtime, size)
        tpath = tdir / tname
        if tpath.exists():
            return tpath
        img = safe_open_image(img_path)
        if img is None:
            return None
        img = img.copy()
        img.thumbnail((size, size))
        img.save(tpath, format="JPEG", quality=85)
        return tpath
    except Exception:
        return None


def _face_thumb_name(path: Path, mtime: float, bbox: Tuple[int, int, int, int], size: int) -> str:
    x, y, w, h = bbox
    hkey = hashlib.sha1(f"{str(path)}|{mtime}|{size}|{x},{y},{w},{h}".encode("utf-8")).hexdigest()
    return f"f_{hkey}.jpg"


def get_or_create_face_thumb(index_dir: Path, img_path: Path, mtime: float, bbox: Tuple[int, int, int, int], size: int = 256) -> Optional[Path]:
    """Create or fetch a cached face-cropped thumbnail for an image and bbox.

    bbox: (x, y, w, h) in pixel coordinates.
    """
    try:
        tdir = _thumbs_dir(index_dir)
        tname = _face_thumb_name(img_path, mtime, bbox, size)
        tpath = tdir / tname
        if tpath.exists():
            return tpath
        img = safe_open_image(img_path)
        if img is None:
            return None
        # crop with a small margin
        x, y, w, h = bbox
        x = max(0, int(x)); y = max(0, int(y)); w = max(1, int(w)); h = max(1, int(h))
        # Add 10% margin
        mx = int(0.1 * w); my = int(0.1 * h)
        x0 = max(0, x - mx); y0 = max(0, y - my)
        x1 = min(img.width, x + w + mx); y1 = min(img.height, y + h + my)
        crop = img.crop((x0, y0, x1, y1))
        crop.thumbnail((size, size))
        crop = crop.convert('RGB') if crop.mode not in ('RGB','L') else crop
        crop.save(tpath, format="JPEG", quality=85)
        return tpath
    except Exception:
        return None


def enforce_cache_cap(index_dir: Path, cap_mb: int) -> None:
    """Ensure thumbnail cache stays under cap_mb. Removes oldest thumbnails first.

    If cap_mb <= 0, does nothing.
    """
    if cap_mb is None or cap_mb <= 0:
        return
    tdir = _thumbs_dir(index_dir)
    files = []
    total = 0
    for p in tdir.glob("*.jpg"):
        try:
            st = p.stat()
            files.append((p, st.st_mtime, st.st_size))
            total += st.st_size
        except FileNotFoundError:
            continue
    cap_bytes = cap_mb * 1024 * 1024
    if total <= cap_bytes:
        return
    # Remove oldest first
    files.sort(key=lambda x: x[1])
    for p, _, sz in files:
        try:
            os.remove(p)
            total -= sz
            if total <= cap_bytes:
                break
        except FileNotFoundError:
            continue
