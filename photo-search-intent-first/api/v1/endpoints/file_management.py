"""
File management-related endpoints for API v1.
"""
from fastapi import APIRouter, Body, HTTPException, Depends
from typing import Dict, Any, List, Optional

from api.schemas.v1 import SuccessResponse
from api.utils import _as_bool, _as_str_list, _from_body, _require
from api.auth import require_auth
from infra.index_store import IndexStore
from pathlib import Path
import json
import os
import shutil
import time

# Global state for undo operations (matching original_server.py)
_last_delete: Optional[Dict[str, Any]] = None

# Create router for file management endpoints
file_management_router = APIRouter(prefix="/files", tags=["file-management"])


@file_management_router.post("/delete", response_model=SuccessResponse)
def delete_v1(
    directory: Optional[str] = None,
    paths: Optional[List[str]] = None,
    os_trash: Optional[bool] = None,
    body: Optional[Dict[str, Any]] = Body(None),
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Delete files either to OS Trash (if enabled) or to a local trash folder for undo.
    """
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
            return SuccessResponse(
                ok=True, 
                data={
                    "moved": moved, 
                    "undoable": False, 
                    "os_trash": True
                }
            )
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
    return SuccessResponse(
        ok=True, 
        data={
            "moved": len(moved_list),
            "undoable": True,
            "os_trash": False
        }
    )


@file_management_router.post("/undo_delete", response_model=SuccessResponse)
def undo_delete_v1(
    directory: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Undo last delete by moving files back from trash. Best‑effort.
    """
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
        return SuccessResponse(ok=False, data={"restored": 0})
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
    return SuccessResponse(ok=True, data={"restored": restored})