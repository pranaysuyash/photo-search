from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, HTTPException

from api.utils import _from_body, _require
from infra.edits import EditOps as _EditOps, apply_ops as _edit_apply_ops, upscale as _edit_upscale
from infra.index_store import IndexStore

# Legacy router without prefix for parity with original_server.py routes
router = APIRouter(tags=["editing"])


@router.post("/edit/ops")
def api_edit_ops(
    directory: Optional[str] = None,
    path: Optional[str] = None,
    rotate: Optional[int] = None,
    flip: Optional[str] = None,
    crop: Optional[Dict[str, int]] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Apply basic editing operations (rotate, flip, crop) to a photo."""
    dir_value = _require(_from_body(body, directory, "dir"), "dir")
    path_value = _require(_from_body(body, path, "path"), "path")
    rotate_value = _from_body(body, rotate, "rotate", default=0, cast=int) or 0
    flip_value = _from_body(body, flip, "flip")
    crop_value = _from_body(body, crop, "crop")

    folder = Path(dir_value)
    p = Path(path_value)
    if not folder.exists() or not p.exists():
        raise HTTPException(400, "Folder or file not found")
    store = IndexStore(folder)
    ops = _EditOps(rotate=int(rotate_value or 0), flip=flip_value, crop=crop_value)
    out = _edit_apply_ops(store.index_dir, p, ops)
    return {"out_path": str(out)}


@router.post("/edit/upscale")
def api_edit_upscale(
    directory: Optional[str] = None,
    path: Optional[str] = None,
    scale: Optional[int] = None,
    engine: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Upscale a photo using specified engine and scale factor."""
    dir_value = _require(_from_body(body, directory, "dir"), "dir")
    path_value = _require(_from_body(body, path, "path"), "path")
    scale_value = _from_body(body, scale, "scale", default=2, cast=int) or 2
    engine_value = _from_body(body, engine, "engine", default="pil") or "pil"

    folder = Path(dir_value)
    p = Path(path_value)
    if not folder.exists() or not p.exists():
        raise HTTPException(400, "Folder or file not found")
    store = IndexStore(folder)
    out = _edit_upscale(store.index_dir, p, scale=scale_value, engine=engine_value)
    return {"out_path": str(out)}