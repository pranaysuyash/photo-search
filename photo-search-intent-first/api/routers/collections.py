"""Collections router for managing photo collections."""

from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Query

from api.schemas.v1 import CollectionsResponse, CollectionDeleteResponse
from api.utils import _as_str_list, _from_body, _require
from infra.collections import load_collections, save_collections
from infra.index_store import IndexStore

router = APIRouter(tags=["collections"])


@router.get("/collections", response_model=CollectionsResponse)
def api_get_collections(directory: str = Query(..., alias="dir")) -> CollectionsResponse:
    """Get all collections for a directory."""
    store = IndexStore(Path(directory))
    return CollectionsResponse(ok=True, collections=load_collections(store.index_dir))


@router.post("/collections", response_model=CollectionsResponse)
def api_set_collection(
    directory: Optional[str] = None,
    name: Optional[str] = None,
    paths: Optional[List[str]] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> CollectionsResponse:
    """Create or update a collection with the specified paths."""
    dir_value = _require(_from_body(body, directory, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")
    paths_value = _from_body(body, paths, "paths", default=[], cast=_as_str_list) or []

    store = IndexStore(Path(dir_value))
    coll = load_collections(store.index_dir)
    coll[name_value] = sorted(set(paths_value))
    save_collections(store.index_dir, coll)
    return CollectionsResponse(ok=True, collections=coll)


@router.post("/collections/delete", response_model=CollectionDeleteResponse)
def api_delete_collection(
    directory: Optional[str] = None,
    name: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> CollectionDeleteResponse:
    """Delete a collection by name."""
    dir_value = _require(_from_body(body, directory, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")

    store = IndexStore(Path(dir_value))
    coll = load_collections(store.index_dir)
    if name_value in coll:
        del coll[name_value]
        save_collections(store.index_dir, coll)
        return CollectionDeleteResponse(ok=True, deleted=name_value)
    return CollectionDeleteResponse(ok=False, deleted=None)