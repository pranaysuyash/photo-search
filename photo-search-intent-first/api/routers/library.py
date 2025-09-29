"""
Library Router
Handles library browsing and default directory suggestion endpoints extracted from original_server.py.
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Header

from api.utils import _emb
from domain.models import SUPPORTED_EXTS, SUPPORTED_VIDEO_EXTS
from infra.index_store import IndexStore

router = APIRouter()

def _normcase_path(p: str) -> str:
    """Normalize path case for cross-platform compatibility."""
    try:
        return str(Path(p).expanduser().resolve()).lower()
    except Exception:
        return str(p).lower()

def _default_photo_dir_candidates() -> List[Dict[str, str]]:
    """Best-effort local photo folder suggestions across OSes."""
    out: List[Dict[str, str]] = []
    home = Path.home()
    sysname = (os.uname().sysname if hasattr(os, 'uname') else os.name).lower()
    
    def _add(p: Path, label: str, source: str):
        try:
            if p.exists() and p.is_dir():
                out.append({"path": str(p), "label": label, "source": source})
        except Exception:
            pass
    
    # Common directories
    _add(home / "Pictures", "Pictures", "home")
    _add(home / "Downloads", "Downloads", "home")
    
    # Windows-like envs
    one_drive_env = os.environ.get("OneDrive")
    if one_drive_env:
        _add(Path(one_drive_env) / "Pictures", "OneDrive Pictures", "onedrive")
    public_dir = os.environ.get("PUBLIC")
    if public_dir:
        _add(Path(public_dir) / "Pictures", "Public Pictures", "windows")
    
    # macOS iCloud hints
    if "darwin" in sysname:
        icloud_docs = home / "Library" / "Mobile Documents" / "com~apple~CloudDocs"
        _add(icloud_docs / "Photos", "iCloud Drive Photos", "icloud")
        _add(icloud_docs / "Pictures", "iCloud Drive Pictures", "icloud")
        _add(home / "Library" / "CloudStorage" / "iCloud Drive" / "Photos", "iCloud Photos", "icloud")
    
    # Linux XDG
    if "linux" in sysname:
        try:
            user_dirs = home / ".config" / "user-dirs.dirs"
            if user_dirs.exists():
                text = user_dirs.read_text(encoding="utf-8")
                for line in text.splitlines():
                    if line.startswith("XDG_PICTURES_DIR") or line.startswith("XDG_DOWNLOAD_DIR"):
                        parts = line.split("=")
                        if len(parts) == 2:
                            raw = parts[1].strip().strip('"')
                            resolved = raw.replace("$HOME", str(home))
                            label = "Pictures" if "PICTURES" in parts[0] else "Downloads"
                            _add(Path(resolved), label, "xdg")
        except Exception:
            pass
    
    # Deduplicate by normalized path
    seen: set[str] = set()
    uniq: List[Dict[str, str]] = []
    for it in out:
        key = _normcase_path(it["path"])
        if key in seen:
            continue
        seen.add(key)
        uniq.append(it)
    return uniq

def _scan_media_counts(paths: List[str], include_videos: bool = True) -> Dict[str, Any]:
    """Count image/video files and bytes for quick previews; privacy-friendly."""
    total_files = 0
    total_bytes = 0
    items: List[Dict[str, Any]] = []
    img_exts = SUPPORTED_EXTS
    vid_exts = SUPPORTED_VIDEO_EXTS if include_videos else set()
    
    for p in paths:
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

@router.get("/library/defaults")
def api_library_defaults(include_videos: bool = True) -> Dict[str, Any]:
    """Return likely local photo folders with media counts."""
    candidates = _default_photo_dir_candidates()
    if not candidates:
        return {"items": [], "total_files": 0, "total_bytes": 0}

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
    return counts

@router.get("/library")
def api_library(
    directory: str = Query(..., alias="dir"), 
    provider: str = "local", 
    limit: int = 120, 
    offset: int = 0, 
    hf_token: Optional[str] = None, 
    openai_key: Optional[str] = None
) -> Dict[str, Any]:
    """Return a slice of the indexed library paths for quick browse grids."""
    folder = Path(directory)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
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
    return {"total": len(paths), "offset": start, "limit": int(limit), "paths": out}