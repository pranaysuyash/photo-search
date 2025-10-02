"""
Library-related endpoints for API v1.
"""
from fastapi import APIRouter, Query, Header, Depends
from typing import Dict, Any, List, Optional

from api.schemas.v1 import SuccessResponse
from api.auth import require_auth
from api.runtime_flags import is_offline
from domain.models import SUPPORTED_EXTS, SUPPORTED_VIDEO_EXTS
from services.directory_scanner import DirectoryScanner

# Create router for library endpoints
library_router = APIRouter(prefix="/library", tags=["library"])

# Global service instance
directory_scanner = DirectoryScanner()


def _normcase_path(p: str) -> str:
    """Normalize path case for cross-platform compatibility."""
    from pathlib import Path
    try:
        return str(Path(p).expanduser().resolve()).lower()
    except Exception:
        return str(p).lower()


def _default_photo_dir_candidates() -> List[Dict[str, str]]:
    """Best-effort local photo folder suggestions across OSes."""
    return directory_scanner.get_default_photo_directories()


def _scan_media_counts(paths: List[str], include_videos: bool = True) -> Dict[str, Any]:
    """Count image/video files and bytes for quick previews; privacy-friendly."""
    import os
    total_files = 0
    total_bytes = 0
    items: List[Dict[str, Any]] = []
    img_exts = SUPPORTED_EXTS
    vid_exts = SUPPORTED_VIDEO_EXTS if include_videos else set()
    
    for p in paths:
        from pathlib import Path
        pth = Path(p).expanduser()
        count = 0
        size = 0
        try:
            if pth.exists() and pth.is_dir():
                for root, _, files in os.walk(pth):
                    for name in files:
                        ext = Path(name).suffix.lower()
                        if ext in img_exts or ext in vid_exts:
                            count += 1
                            try:
                                size += (Path(root) / name).stat().st_size
                            except Exception:
                                continue
        except Exception:
            count = 0; size = 0
        total_files += count
        total_bytes += size
        items.append({"path": str(pth), "count": count, "bytes": size})
    return {"items": items, "total_files": total_files, "total_bytes": total_bytes}


@library_router.get("/defaults", response_model=SuccessResponse)
def get_library_defaults_v1(
    include_videos: bool = True,
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Return likely local photo folders with media counts.
    """
    candidates = _default_photo_dir_candidates()
    if not candidates:
        return SuccessResponse(ok=True, data={"items": [], "total_files": 0, "total_bytes": 0})

    counts = _scan_media_counts([c["path"] for c in candidates], include_videos)
    label_map = {}
    for item in candidates:
        key = _normcase_path(item["path"])
        label_map.setdefault(key, item)

    enriched = []
    for entry in counts.get("items", []):
        info = label_map.get(_normcase_path(entry.get("path", "")))
        data = dict(entry)
        if info:
            data["label"] = info.get("label")
            data["source"] = info.get("source")
        enriched.append(data)

    counts["items"] = enriched
    return SuccessResponse(ok=True, data=counts)


@library_router.get("/", response_model=SuccessResponse)
def get_library_v1(
    directory: str = Query(..., alias="dir"),
    provider: str = "local",
    limit: int = 120,
    offset: int = 0,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Return a slice of the indexed library paths for quick browse grids.
    """
    import json
    from pathlib import Path
    from api.utils import _emb
    from infra.index_store import IndexStore
    
    folder = Path(directory)
    if not folder.exists():
        from fastapi import HTTPException
        raise HTTPException(400, "Folder not found")
    
    # Enforce local provider in offline mode
    if is_offline():
        provider = "local"
    
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    paths = store.state.paths or []
    
    # Fallback to legacy/default index directories if empty
    if not paths:
        try:
            bases = []
            try:
                bases.append(store.index_dir.parent)
            except Exception:
                pass
            bases.append(folder / '.photo_index')
            pfile = None
            for base in bases:
                try:
                    if not base.exists():
                        continue
                    preferred = base / 'st-clip-ViT-B-32' / 'paths.json'
                    if preferred.exists():
                        pfile = preferred
                        break
                    for sub in base.iterdir():
                        cand = sub / 'paths.json'
                        if cand.exists():
                            pfile = cand
                            break
                    if pfile is not None:
                        break
                except Exception:
                    continue
            if pfile is not None:
                data = json.loads(pfile.read_text(encoding='utf-8'))
                paths = data.get('paths', []) or []
        except Exception:
            pass
    
    start = max(0, int(offset))
    end = max(start, min(len(paths), start + int(limit)))
    out = paths[start:end]
    return SuccessResponse(
        ok=True,
        data={
            "total": len(paths),
            "offset": start,
            "limit": int(limit),
            "paths": out,
            "provider": provider,
            "offline_mode": is_offline()
        }
    )