"""Collections router for managing photo collections."""

from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Query

from api.utils import _as_str_list, _from_body, _require
from infra.collections import load_collections, save_collections
from infra.index_store import IndexStore

router = APIRouter(tags=["collections"])


@router.get("/collections")
def api_get_collections(directory: str = Query(..., alias="dir")) -> Dict[str, Any]:
    """Get all collections for a directory."""
    store = IndexStore(Path(directory))
    return {"collections": load_collections(store.index_dir)}


@router.post("/collections")
def api_set_collection(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    paths: Optional[List[str]] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Create or update a collection with the specified paths."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")
    paths_value = _from_body(body, paths, "paths", default=[], cast=_as_str_list) or []

    store = IndexStore(Path(dir_value))
    coll = load_collections(store.index_dir)
    coll[name_value] = sorted(set(paths_value))
    save_collections(store.index_dir, coll)
    return {"ok": True, "collections": coll}


@router.post("/collections/delete")
def api_delete_collection(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Delete a collection by name."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")

    store = IndexStore(Path(dir_value))
    coll = load_collections(store.index_dir)
    if name_value in coll:
        del coll[name_value]
        save_collections(store.index_dir, coll)
        return {"ok": True, "deleted": name_value}
    return {"ok": False, "deleted": None}