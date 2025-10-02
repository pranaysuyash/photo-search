"""
Data management-related endpoints for API v1.
"""
from fastapi import APIRouter, Body, HTTPException, Query, Depends
from typing import Dict, Any, Optional

from api.schemas.v1 import SuccessResponse
from api.utils import _as_bool, _emb, _from_body
from api.auth import require_auth
from infra.index_store import IndexStore
from pathlib import Path
import os
import shutil

# Create router for data management endpoints
data_management_router = APIRouter(prefix="/data", tags=["data-management"])


@data_management_router.post("/nuke", response_model=SuccessResponse)
def data_nuke_v1(
    directory: Optional[str] = Query(None, alias="dir"),
    all_data: Optional[bool] = None,
    body: Optional[Dict[str, Any]] = Body(None),
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Nuclear option: clear all photo index data for a directory or globally.
    """
    try:
        wipe_all = _from_body(body, all_data, "all", default=False, cast=_as_bool) or False
        if wipe_all:
            base = os.environ.get("PS_APPDATA_DIR", "").strip()
            if base:
                bp = Path(base).expanduser().resolve()
                if bp.exists() and bp.is_dir() and str(bp) not in ("/", str(Path.home())):
                    shutil.rmtree(bp)
                    return SuccessResponse(ok=True, data={"cleared": str(bp)})
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
        return SuccessResponse(ok=True, data={"cleared": str(idx)})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Data nuke failed: {e}")