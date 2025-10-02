"""
Watch-related endpoints for API v1.
"""
from fastapi import APIRouter, Body, HTTPException, Query, Depends
from typing import Dict, Any, Optional, Set

from api.schemas.v1 import SuccessResponse
from api.utils import _require, _from_body, _emb
from api.auth import require_auth
from infra.index_store import IndexStore
from infra.watcher import WatchManager
from domain.models import SUPPORTED_EXTS
from pathlib import Path
from pydantic import BaseModel

# Global watch manager instance
_WATCH = WatchManager()

# Create router for watch endpoints
watch_router = APIRouter(prefix="/watch", tags=["watch"])


class WatchReq(BaseModel):
    dir: str
    provider: str = "local"
    debounce_ms: int = 1500
    batch_size: int = 12


@watch_router.get("/status", response_model=SuccessResponse)
def watch_status_v1(_auth = Depends(require_auth)) -> SuccessResponse:
    """
    Check if file system watching is available.
    """
    return SuccessResponse(ok=True, data={"available": _WATCH.available()})


@watch_router.post("/start", response_model=SuccessResponse)
def watch_start_v1(
    req: WatchReq,
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Start watching a directory for file changes and auto-update the index.
    """
    if not _WATCH.available():
        raise HTTPException(400, "watchdog not available")
    
    folder = Path(req.dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    emb = _emb(req.provider, None, None)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))

    def on_batch(paths: Set[str]) -> None:
        try:
            wanted = [p for p in paths if str(p).lower().endswith(tuple(SUPPORTED_EXTS))]
            if not wanted:
                return
            store.upsert_paths(emb, wanted, batch_size=max(1, int(req.batch_size)))
        except Exception:
            pass

    ok = _WATCH.start(
        folder, 
        on_batch, 
        exts=set(SUPPORTED_EXTS), 
        debounce_ms=max(500, int(req.debounce_ms))
    )
    if not ok:
        raise HTTPException(500, "Failed to start watcher")
    
    return SuccessResponse(ok=True)


@watch_router.post("/stop", response_model=SuccessResponse)
def watch_stop_v1(
    directory: Optional[str] = Query(None, alias="dir"),
    body: Optional[Dict[str, Any]] = Body(None),
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Stop watching a directory for file changes.
    """
    directory_value = _require(
        _from_body(body, directory, "directory") or _from_body(body, directory, "dir"), 
        "directory"
    )
    folder = Path(directory_value)
    _WATCH.stop(folder)
    return SuccessResponse(ok=True)