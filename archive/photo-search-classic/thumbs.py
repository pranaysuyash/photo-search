from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Optional, Tuple

from PIL import Image, ImageOps


def _thumb_path(index_dir: Path, img_path: Path, mtime: float, size: int) -> Path:
    h = hashlib.sha1(f"{str(img_path)}|{int(mtime)}|{size}".encode("utf-8")).hexdigest()[:16]
    tdir = index_dir / "thumbs"
    tdir.mkdir(parents=True, exist_ok=True)
    return tdir / f"{h}-{size}.jpg"


def get_or_create_thumb(index_dir: Path, img_path: Path, mtime: float, size: int = 512) -> Optional[Path]:
    try:
        tp = _thumb_path(index_dir, img_path, mtime, size)
        if tp.exists():
            return tp
        # Generate
        with Image.open(img_path) as im:
            im = ImageOps.exif_transpose(im.convert("RGB"))
            im.thumbnail((size, size))
            im.save(tp, format="JPEG", quality=85)
        return tp
    except Exception:
        return None


def _face_thumb_path(index_dir: Path, img_path: Path, mtime: float, bbox: Tuple[int, int, int, int], size: int) -> Path:
    x, y, w, h = bbox
    hkey = hashlib.sha1(f"{str(img_path)}|{int(mtime)}|{size}|{x},{y},{w},{h}".encode("utf-8")).hexdigest()[:16]
    tdir = index_dir / "thumbs"
    tdir.mkdir(parents=True, exist_ok=True)
    return tdir / f"face-{hkey}-{size}.jpg"


def get_or_create_face_thumb(index_dir: Path, img_path: Path, mtime: float, bbox: Tuple[int, int, int, int], size: int = 256) -> Optional[Path]:
    try:
        tp = _face_thumb_path(index_dir, img_path, mtime, bbox, size)
        if tp.exists():
            return tp
        with Image.open(img_path) as im:
            im = ImageOps.exif_transpose(im.convert('RGB'))
            x, y, w, h = bbox
            x = max(0, int(x)); y = max(0, int(y)); w = max(1, int(w)); h = max(1, int(h))
            mx = int(0.1 * w); my = int(0.1 * h)
            x0 = max(0, x - mx); y0 = max(0, y - my)
            x1 = min(im.width, x + w + mx); y1 = min(im.height, y + h + my)
            crop = im.crop((x0, y0, x1, y1))
            crop.thumbnail((size, size))
            crop.save(tp, format='JPEG', quality=85)
        return tp
    except Exception:
        return None
