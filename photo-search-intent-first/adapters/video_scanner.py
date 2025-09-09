import os
from pathlib import Path
from typing import List

from domain.models import Video, SUPPORTED_VIDEO_EXTS


def list_videos(root: Path) -> List[Video]:
    """List all video files in a directory tree."""
    root = Path(root).expanduser().resolve()
    items: List[Video] = []
    
    for dirpath, dirnames, filenames in os.walk(root):
        # Skip hidden directories and index folder
        dirnames[:] = [d for d in dirnames if not d.startswith('.') and d != '.photo_index']
        
        for fn in filenames:
            ext = Path(fn).suffix.lower()
            if ext in SUPPORTED_VIDEO_EXTS:
                p = Path(dirpath) / fn
                try:
                    mtime = p.stat().st_mtime
                    items.append(Video(path=p, mtime=mtime))
                except FileNotFoundError:
                    pass
    
    items.sort(key=lambda x: str(x.path))
    return items