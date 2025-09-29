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
    # Block absolute-path traversal before touching the filesystem
    try:
        resolved_root = Path(root).expanduser().resolve()
    except (OSError, RuntimeError) as e:
        raise ValueError(f"Invalid path: {root}") from e

    # Check for path traversal attempts - ensure the path is safe and doesn't escape
    # This prevents directory traversal attacks like ../../../etc/passwd
    try:
        # Convert to absolute path and check if it's within expected bounds
        abs_root = str(resolved_root.absolute())

        # Additional safety check: reject obviously suspicious patterns
        suspicious_patterns = ['..', '~', '/etc', '/usr', '/bin', '/sbin', '/var', '/sys', '/proc']
        for pattern in suspicious_patterns:
            if pattern in abs_root:
                raise ValueError(f"Suspicious path pattern detected: {pattern}")

        # Validate that this looks like a legitimate photo directory path
        # Reject paths that are clearly system directories
        if abs_root.startswith(('/etc/', '/usr/', '/bin/', '/sbin/', '/var/', '/sys/', '/proc/')):
            raise ValueError(f"System directory access denied: {abs_root}")

    except (OSError, RuntimeError) as e:
        raise ValueError(f"Path validation failed: {root}") from e

    # Check if root directory exists and is accessible
    if not resolved_root.exists():
        raise FileNotFoundError(f"Directory not found: {resolved_root}")

    if not resolved_root.is_dir():
        raise NotADirectoryError(f"Path is not a directory: {resolved_root}")

    root = resolved_root

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
