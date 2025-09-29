from __future__ import annotations

import os
import shutil
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, HTTPException, Query

from api.utils import _as_bool, _emb, _from_body
from infra.index_store import IndexStore

# Legacy router without prefix for parity with original_server.py routes
router = APIRouter(tags=["data-management"])


@router.post("/data/nuke")
def api_data_nuke(
    directory: Optional[str] = Query(None, alias="dir"),
    all_data: Optional[bool] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Nuclear option: clear all photo index data for a directory or globally."""
    try:
        wipe_all = _from_body(body, all_data, "all", default=False, cast=_as_bool) or False
        if wipe_all:
            base = os.environ.get("PS_APPDATA_DIR", "").strip()
            if base:
                bp = Path(base).expanduser().resolve()
                if bp.exists() and bp.is_dir() and str(bp) not in ("/", str(Path.home())):
                    shutil.rmtree(bp)
                    return {"ok": True, "cleared": str(bp)}
                else:
                    raise HTTPException(400, "Unsafe app data path")
            else:
                raise HTTPException(400, "PS_APPDATA_DIR not set")
        directory_value = _from_body(body, directory, "directory") or _from_body(body, directory, "dir")
        if not directory_value:
            raise HTTPException(400, "directory required unless all=1")
        folder = Path(directory_value)
        emb = _emb("local", None, None)
        store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
        idx = store.index_dir
        if idx.exists() and idx.is_dir():
            shutil.rmtree(idx)
        return {"ok": True, "cleared": str(idx)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Data nuke failed: {e}")