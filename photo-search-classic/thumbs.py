from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Optional

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

