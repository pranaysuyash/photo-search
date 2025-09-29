"""Trips and events router."""

from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, HTTPException, Query

from api.utils import _emb, _from_body, _require
from infra.analytics import _write_event as _write_event_infra
from infra.index_store import IndexStore
from infra.trips import build_trips, load_trips

router = APIRouter(tags=["trips"])


@router.post("/trips/build")
def api_trips_build(
    dir: Optional[str] = None,
    provider: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Build trips from photos using clustering of time and location data."""
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
    return res


@router.get("/trips")
def api_trips_list(directory: str = Query(..., alias="dir")) -> Dict[str, Any]:
    """List existing trips for a directory."""
    store = IndexStore(Path(directory))
    return {"trips": load_trips(store.index_dir)}