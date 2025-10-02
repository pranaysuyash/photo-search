"""
Trips-related endpoints for API v1.
"""
from fastapi import APIRouter, Body, HTTPException, Query, Depends
from typing import Dict, Any, Optional

from api.schemas.v1 import SuccessResponse
from api.utils import _emb, _from_body, _require
from api.auth import require_auth
from infra.analytics import _write_event as _write_event_infra
from infra.index_store import IndexStore
from infra.trips import build_trips, load_trips
from pathlib import Path

# Create router for trips endpoints
trips_router = APIRouter(prefix="/trips", tags=["trips"])


@trips_router.post("/build", response_model=SuccessResponse)
def trips_build_v1(
    dir: Optional[str] = None,
    provider: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Build trips from photos using clustering of time and location data.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    provider_value = _from_body(body, provider, "provider", default="local") or "local"

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider_value, None, None)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    res = build_trips(store.index_dir, store.state.paths or [], store.state.mtimes or [])
    try:
        _write_event_infra(store.index_dir, { 'type': 'trips_build', 'trips': len(res.get('trips', [])) })
    except Exception:
        pass
    return SuccessResponse(ok=True, data=res)


@trips_router.get("/", response_model=SuccessResponse)
def trips_list_v1(
    directory: str = Query(..., alias="dir"),
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    List existing trips for a directory.
    """
    store = IndexStore(Path(directory))
    return SuccessResponse(ok=True, data={"trips": load_trips(store.index_dir)})