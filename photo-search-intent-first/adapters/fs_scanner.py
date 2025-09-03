import os
from pathlib import Path
from typing import List, Optional

from PIL import Image, UnidentifiedImageError

from domain.models import Photo, SUPPORTED_EXTS


def list_photos(root: Path) -> List[Photo]:
    root = Path(root).expanduser().resolve()
    items: list[Photo] = []
    for dirpath, dirnames, filenames in os.walk(root):
        # Skip hidden directories and index folder
        dirnames[:] = [d for d in dirnames if not d.startswith('.') and d != '.photo_index']
        for fn in filenames:
            ext = Path(fn).suffix.lower()
            if ext in SUPPORTED_EXTS:
                p = Path(dirpath) / fn
                try:
                    mtime = p.stat().st_mtime
                    items.append(Photo(path=p, mtime=mtime))
                except FileNotFoundError:
                    pass
    items.sort(key=lambda x: str(x.path))
    return items


def safe_open_image(path: Path) -> Optional[Image.Image]:
    try:
        img = Image.open(path)
        if img.mode != "RGB":
            img = img.convert("RGB")
        return img
    except (UnidentifiedImageError, OSError):
        return None
