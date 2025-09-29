"""
Watch routes - file system monitoring for automatic index updates.

Handles starting/stopping directory watchers that automatically update
the photo index when files are added, modified, or moved.
"""
from fastapi import APIRouter, Body, HTTPException, Query
from typing import Dict, Any, Optional, Set
from pathlib import Path
from pydantic import BaseModel

from api.utils import _require, _from_body, _emb
from infra.index_store import IndexStore
from infra.watcher import WatchManager
from domain.models import SUPPORTED_EXTS

# Global watch manager instance
_WATCH = WatchManager()

router = APIRouter()


class WatchReq(BaseModel):
    dir: str
    provider: str = "local"
    debounce_ms: int = 1500
    batch_size: int = 12


@router.get("/watch/status")
def api_watch_status() -> Dict[str, Any]:
    """Check if file system watching is available."""
    return {"available": _WATCH.available()}


@router.post("/watch/start")
def api_watch_start(req: WatchReq) -> Dict[str, Any]:
    """Start watching a directory for file changes and auto-update the index."""
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
    
    return {"ok": True}


@router.post("/watch/stop")
def api_watch_stop(
    directory: Optional[str] = Query(None, alias="dir"),
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Stop watching a directory for file changes."""
    directory_value = _require(
        _from_body(body, directory, "directory") or _from_body(body, directory, "dir"), 
        "directory"
    )
    folder = Path(directory_value)
    _WATCH.stop(folder)
    return {"ok": True}