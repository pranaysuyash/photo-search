"""Videos router for listing and indexing video files."""

import hashlib
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, HTTPException, Query
from fastapi.responses import FileResponse

from api.utils import _from_body, _require
from infra.index_store import IndexStore
from infra.video_index_store import VideoIndexStore

try:
    from adapters.video_processor import list_videos, get_video_metadata, extract_video_thumbnail
except Exception:
    # Fallback stubs if video processor adapter is optional
    import os
    from domain.models import SUPPORTED_VIDEO_EXTS
    
    def list_videos(root: Path) -> List[Path]:
        out: List[Path] = []
        for r, _, files in os.walk(root):
            for n in files:
                ext = Path(n).suffix.lower()
                if ext in SUPPORTED_VIDEO_EXTS:
                    out.append(Path(r) / n)
        return out
    
    def get_video_metadata(path: str) -> Dict[str, Any]:
        try:
            st = Path(path).stat()
            return {"mtime": st.st_mtime, "duration": None}
        except Exception:
            return {"mtime": 0.0, "duration": None}
    
    def extract_video_thumbnail(video_path: str, out_path: Path, when_sec: float = 0.0) -> bool:
        # No-op fallback: return False to indicate no thumbnail extracted
        return False

router = APIRouter(tags=["videos"])


@router.get("/videos")
def api_list_videos(directory: str = Query(..., alias="dir")) -> Dict[str, Any]:
    """List all video files in a directory."""
    folder = Path(directory)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    videos = list_videos(folder)
    video_data = []
    for video in videos:
        video_data.append({
            "path": str(video),
            "mtime": video.stat().st_mtime if video.exists() else 0,
            "size": video.stat().st_size if video.exists() else 0
        })

    return {"videos": video_data, "count": len(video_data)}


@router.post("/videos/index")
def api_index_videos(
    directory: Optional[str] = None,
    provider: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Index video files for search (extract metadata and generate thumbnails)."""
    dir_value = _require(_from_body(body, directory, "directory") or _from_body(body, None, "dir"), "directory")
    provider_value = _from_body(body, provider, "provider", default="local") or "local"

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    store = IndexStore(folder)
    video_store = VideoIndexStore(folder)

    videos = list_videos(folder)
    indexed = 0

    for video in videos:
        try:
            # Extract metadata
            metadata = get_video_metadata(str(video))
            if metadata:
                # Store video metadata
                video_store.add_video(str(video), metadata, video.stat().st_mtime)
                indexed += 1
        except Exception:
            continue

    video_store.save()
    return {"indexed": indexed, "total": len(videos), "provider": provider_value}


@router.get("/video/metadata")
def api_get_video_metadata(directory: str = Query(..., alias="dir"), path: str = Query(...)) -> Dict[str, Any]:
    """Get metadata for a specific video file."""
    folder = Path(directory)
    video_path = Path(path)

    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    if not video_path.exists():
        raise HTTPException(404, "Video file not found")

    metadata = get_video_metadata(str(video_path))
    if not metadata:
        raise HTTPException(500, "Could not extract video metadata")

    return {"metadata": metadata}


@router.get("/video/thumbnail")
def api_get_video_thumbnail(directory: str = Query(..., alias="dir"), path: str = Query(...), frame_time: float = 1.0, size: int = 256):
    """Generate and return a thumbnail for a video file."""
    folder = Path(directory)
    video_path = Path(path)

    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    if not video_path.exists():
        raise HTTPException(404, "Video file not found")

    # Create thumbnail in cache directory
    store = IndexStore(folder)
    thumb_dir = store.index_dir / "video_thumbs"
    thumb_dir.mkdir(exist_ok=True)

    # Generate unique filename for thumbnail (migration: switched MD5 -> SHA256 for stronger hashing)
    video_hash = hashlib.sha256(str(video_path).encode()).hexdigest()
    thumb_path = thumb_dir / f"{video_hash}_{size}.jpg"

    # Backward compatibility: if an older MD5-named thumbnail exists, reuse it to avoid regeneration.
    # Legacy MD5 only used here for lookup (not for generating new hashes).
    legacy_hash = hashlib.md5(str(video_path).encode()).hexdigest()  # nosec: legacy migration path
    legacy_thumb = thumb_dir / f"{legacy_hash}_{size}.jpg"
    if not thumb_path.exists() and legacy_thumb.exists():
        try:
            legacy_thumb.rename(thumb_path)
        except Exception:
            # Fallback copy if rename fails (e.g., cross-device)
            try:
                shutil.copy2(legacy_thumb, thumb_path)
            except Exception:
                pass

    # Generate thumbnail if it doesn't exist
    if not thumb_path.exists():
        success = extract_video_thumbnail(str(video_path), thumb_path, frame_time)
        if not success:
            raise HTTPException(500, "Could not generate video thumbnail")

    return FileResponse(str(thumb_path))