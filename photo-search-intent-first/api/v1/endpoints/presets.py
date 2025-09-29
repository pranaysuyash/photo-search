"""
Presets endpoints for API v1.
"""
from fastapi import APIRouter, Body, Query
from typing import Dict, Any, List, Optional
from pathlib import Path

from api.utils import _require, _from_body, _as_str_list, _emb
from infra.index_store import IndexStore
from usecases.manage_presets import load_presets, save_presets
from infra.analytics import _write_event as _write_event_infra

# Create router for presets endpoints
presets_router = APIRouter(prefix="/presets", tags=["presets"])


@presets_router.get("/")
def get_presets_v1(
    directory: str = Query(..., alias="dir"),
) -> Dict[str, Any]:
    """
    Get all presets for the specified directory.
    """
    store = IndexStore(Path(directory))
    presets = load_presets(store.index_dir)
    return {"ok": True, "presets": presets}


@presets_router.post("/")
def add_preset_v1(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    query: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """
    Add or update a preset.
    """
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
    _write_event_infra(store.index_dir, {'type': 'preset_save', 'name': name_value})
    return {"ok": True, "presets": items}


@presets_router.post("/delete")
def delete_preset_v1(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """
    Delete a preset by name.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")

    store = IndexStore(Path(dir_value))
    items = load_presets(store.index_dir)
    before = len(items)
    items = [it for it in items if str(it.get('name')) != name_value]
    save_presets(store.index_dir, items)
    return {"ok": True, "deleted": before - len(items), "presets": items}