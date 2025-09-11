import os
from pathlib import Path
from typing import List, Optional
import json
import fnmatch

from PIL import Image, UnidentifiedImageError

from domain.models import Photo, SUPPORTED_EXTS


def _load_excludes(root: Path) -> List[str]:
    try:
        cfg_dir = Path(root).expanduser().resolve() / ".photo_index"
        cfg = cfg_dir / "excludes.json"
        if cfg.exists():
            data = json.loads(cfg.read_text(encoding="utf-8"))
            pats = data.get("patterns") or []
            if isinstance(pats, list):
                return [str(p) for p in pats if isinstance(p, str)]
    except Exception:
        pass
    return []


def list_photos(root: Path) -> List[Photo]:
    root = Path(root).expanduser().resolve()
    excludes = _load_excludes(root)
    items: list[Photo] = []
    for dirpath, dirnames, filenames in os.walk(root):
        # Skip hidden directories and index folder and excluded patterns
        def _keep_dir(d: str) -> bool:
            if d.startswith('.') or d == '.photo_index':
                return False
            full = str(Path(dirpath) / d)
            for pat in excludes:
                if fnmatch.fnmatch(full, pat) or fnmatch.fnmatch(d, pat):
                    return False
            return True
        dirnames[:] = [d for d in dirnames if _keep_dir(d)]
        for fn in filenames:
            ext = Path(fn).suffix.lower()
            full = str(Path(dirpath) / fn)
            skip = False
            for pat in excludes:
                if fnmatch.fnmatch(full, pat) or fnmatch.fnmatch(fn, pat):
                    skip = True
                    break
            if skip:
                continue
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
