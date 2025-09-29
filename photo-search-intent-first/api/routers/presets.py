"""Presets router for managing search query presets."""

from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Query

from api.utils import _from_body, _require
from infra.analytics import _write_event as _write_event_infra
from infra.index_store import IndexStore
from usecases.manage_presets import load_presets, save_presets

router = APIRouter(tags=["presets"])


@router.get("/presets")
def api_get_presets(directory: str = Query(..., alias="dir")) -> Dict[str, Any]:
    """Get all presets for a directory."""
    store = IndexStore(Path(directory))
    return {"presets": load_presets(store.index_dir)}


@router.post("/presets")
def api_add_preset(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    query: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Add or update a preset."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")
    query_value = _require(_from_body(body, query, "query"), "query")

    store = IndexStore(Path(dir_value))
    items = load_presets(store.index_dir)
    # Upsert by name
    found = False
    for it in items:
        if str(it.get('name')) == name_value:
            it['query'] = query_value
            found = True
            break
    if not found:
        items.append({"name": name_value, "query": query_value})
    save_presets(store.index_dir, items)
    try:
        _write_event_infra(store.index_dir, { 'type': 'preset_save', 'name': name_value })
    except Exception:
        pass
    return {"ok": True, "presets": items}


@router.post("/presets/delete")
def api_delete_preset(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Delete a preset by name."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")

    store = IndexStore(Path(dir_value))
    items = load_presets(store.index_dir)
    before = len(items)
    items = [it for it in items if str(it.get('name')) != name_value]
    save_presets(store.index_dir, items)
    return {"ok": True, "deleted": before - len(items), "presets": items}