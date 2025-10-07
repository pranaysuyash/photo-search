from __future__ import annotations

import json
import os
import shutil
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, HTTPException

from api.utils import _as_bool, _as_str_list, _from_body, _require
from infra.index_store import IndexStore

# Legacy router without prefix for parity with original_server.py routes
router = APIRouter(tags=["file-management"])

# Global state for undo operations (matching original_server.py)
_last_delete: Optional[Dict[str, Any]] = None


@router.post("/delete")
def api_delete(
    directory: Optional[str] = None,
    paths: Optional[List[str]] = None,
    os_trash: Optional[bool] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Delete files either to OS Trash (if enabled) or to a local trash folder for undo."""
    dir_value = _require(_from_body(body, directory, "dir"), "dir")
    paths_value = _from_body(body, paths, "paths", default=[], cast=_as_str_list) or []
    os_trash_value = _from_body(body, os_trash, "os_trash", default=False, cast=_as_bool) or False

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    store = IndexStore(folder, index_key=None)
    store.load()
    if os_trash_value:
        # Try to use OS trash via send2trash; fall back to app trash on failure
        try:
            from send2trash import send2trash  # type: ignore
            moved = 0
            for p in paths_value:
                sp = Path(p)
                try:
                    sp_res = sp.resolve(); folder_res = folder.resolve()
                    if not str(sp_res).startswith(str(folder_res)):
                        continue
                except Exception:
                    continue
                try:
                    send2trash(str(sp))
                    moved += 1
                except Exception:
                    continue
            # No undo for OS trash path
            return {"ok": True, "moved": moved, "undoable": False, "os_trash": True}
        except Exception:
            # Fall through to app-managed trash if send2trash is unavailable
            pass
    trash_root = store.index_dir / 'trash'
    ts = str(int(time.time()))
    dest_root = trash_root / ts
    moved_list: List[Dict[str, str]] = []
    os.makedirs(dest_root, exist_ok=True)
    for p in paths_value:
        src = Path(p)
        if not src.exists():
            continue
        out = dest_root / src.name
        try:
            shutil.move(str(src), str(out))
            moved_list.append({"src": str(src), "dst": str(out)})
        except Exception:
            continue
    global _last_delete
    _last_delete = {"dir": str(folder), "batch": moved_list, "ts": ts}
    try:
        (trash_root / 'last.json').write_text(json.dumps(_last_delete, indent=2), encoding='utf-8')
    except Exception:
        pass
    return {"ok": True, "moved": len(moved_list), "undoable": True, "os_trash": False}


@router.post("/undo_delete")
def api_undo_delete(
    directory: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Undo last delete by moving files back from trash. Best‑effort."""
    dir_value = _require(_from_body(body, directory, "dir"), "dir")
    folder = Path(dir_value)
    trash_root = IndexStore(folder, index_key=None).index_dir / 'trash'
    state = None
    global _last_delete
    if _last_delete and _last_delete.get('dir') == str(folder):
        state = _last_delete
    else:
        p = trash_root / 'last.json'
        if p.exists():
            try:
                state = json.loads(p.read_text(encoding='utf-8'))
            except Exception:
                state = None
    if not state:
        return {"ok": False, "restored": 0}
    restored = 0
    for item in state.get('batch', []):
        src = Path(item.get('dst')); dst = Path(item.get('src'))
        try:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(src), str(dst))
            restored += 1
        except Exception:
            continue
    try:
        (trash_root / 'last.json').unlink(missing_ok=True)
    except Exception:
        pass
    _last_delete = None
    return {"ok": True, "restored": restored}


@router.get("/photo")
def api_photo(path: str) -> Any:
    """Serve a photo file by path with security checks."""
    from fastapi.responses import FileResponse
    
    try:
        photo_path = Path(path).resolve()
        
        # Security: Only serve files from allowed directories
        # For now, allow any path but ensure it exists and is a file
        if not photo_path.exists() or not photo_path.is_file():
            raise HTTPException(404, "Photo not found")
        
        # Check if it's an image file
        if photo_path.suffix.lower() not in {'.jpg', '.jpeg', '.png', '.webp', '.heic', '.tif', '.tiff', '.bmp', '.gif'}:
            raise HTTPException(400, "Not an image file")
        
        return FileResponse(str(photo_path), media_type=f"image/{photo_path.suffix.lower().lstrip('.')}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error serving photo: {e}")