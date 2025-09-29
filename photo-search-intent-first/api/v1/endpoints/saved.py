"""
Saved searches endpoints for API v1.
"""
from fastapi import APIRouter, Body, Query
from typing import Dict, Any, List, Optional
from pathlib import Path

from api.utils import _require, _from_body, _as_str_list, _emb
from infra.index_store import IndexStore
from usecases.manage_saved import load_saved, save_saved

# Create router for saved searches endpoints
saved_router = APIRouter(prefix="/saved", tags=["saved"])


@saved_router.get("/")
def get_saved_v1(
    directory: str = Query(..., alias="dir"),
) -> Dict[str, Any]:
    """
    Get all saved searches for the specified directory.
    """
    store = IndexStore(Path(directory))
    saved = load_saved(store.index_dir)
    return {"ok": True, "saved": saved}


@saved_router.post("/")
def add_saved_v1(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    query: Optional[str] = None,
    top_k: Optional[int] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """
    Add a new saved search.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")
    query_value = _require(_from_body(body, query, "query"), "query")
    top_k_value = _from_body(body, top_k, "top_k", default=12, cast=int) or 12

    store = IndexStore(Path(dir_value))
    saved = load_saved(store.index_dir)
    saved.append({"name": name_value, "query": query_value, "top_k": int(top_k_value)})
    save_saved(store.index_dir, saved)
    return {"ok": True, "saved": saved}


@saved_router.post("/delete")
def delete_saved_v1(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """
    Delete a saved search by name.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")

    store = IndexStore(Path(dir_value))
    saved = load_saved(store.index_dir)
    before = len(saved)
    saved = [s for s in saved if str(s.get("name")) != name_value]
    save_saved(store.index_dir, saved)
    return {"ok": True, "deleted": before - len(saved), "saved": saved}