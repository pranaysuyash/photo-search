"""
Batch operations endpoints for API v1.
"""
from fastapi import APIRouter, Body, HTTPException
from typing import Dict, Any, List, Optional
from pathlib import Path
import json
import shutil
from datetime import datetime, timezone
import time
import os

from api.utils import _require, _from_body, _as_str_list, _as_bool, _emb
from infra.index_store import IndexStore
from infra.tags import load_tags, save_tags
from infra.collections import load_collections, save_collections

# Create router for batch operations
batch_router = APIRouter(prefix="/batch", tags=["batch"])


@batch_router.post("/tag")
def batch_tag_v1(
    dir: Optional[str] = None,
    paths: Optional[List[str]] = None,
    tags: Optional[List[str]] = None,
    operation: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """
    Apply tags to multiple files in batch. Operation can be 'add', 'remove', or 'replace'.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    paths_value = _from_body(body, paths, "paths", default=[], cast=_as_str_list) or []
    tags_value = _from_body(body, tags, "tags", default=[], cast=_as_str_list) or []
    operation_value = (_from_body(body, operation, "operation", default="add") or "add").lower()

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    store = IndexStore(folder)
    tag_map = load_tags(store.index_dir)
    updated = 0
    
    for path in paths_value:
        current_tags = set(tag_map.get(path, []))
        
        if operation_value == "replace":
            tag_map[path] = sorted(set(tags_value))
            updated += 1
        elif operation_value == "add":
            for tag in tags_value:
                current_tags.add(tag)
            tag_map[path] = sorted(current_tags)
            updated += 1
        elif operation_value == "remove":
            for tag in tags_value:
                current_tags.discard(tag)
            tag_map[path] = sorted(current_tags)
            updated += 1
    
    save_tags(store.index_dir, tag_map)
    return {
        "ok": True, 
        "updated": updated, 
        "processed": len(paths_value), 
        "operation": operation_value
    }


@batch_router.post("/collections")
def batch_add_to_collection_v1(
    dir: Optional[str] = None,
    paths: Optional[List[str]] = None,
    collection_name: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """
    Add multiple files to a collection in batch.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    paths_value = _from_body(body, paths, "paths", default=[], cast=_as_str_list) or []
    collection_value = _require(_from_body(body, collection_name, "collection_name"), "collection_name")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    store = IndexStore(folder)
    collections = load_collections(store.index_dir)

    current_paths = set(collections.get(collection_value, []))
    new_paths = current_paths.union(set(paths_value))

    collections[collection_value] = sorted(new_paths)
    save_collections(store.index_dir, collections)

    added = len(new_paths) - len(current_paths)
    return {
        "ok": True, 
        "collection": collection_value, 
        "added": added, 
        "total": len(new_paths)
    }


@batch_router.post("/delete")
def batch_delete_v1(
    directory: Optional[str] = None,
    paths: Optional[List[str]] = None,
    os_trash: Optional[bool] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """
    Delete multiple files in batch.
    """
    from api.routers.file_management import api_delete
    
    dir_value = _require(_from_body(body, directory, "directory") or _from_body(body, None, "dir"), "directory")
    paths_value = _from_body(body, paths, "paths", default=[], cast=_as_str_list) or []
    os_trash_value = _from_body(body, os_trash, "os_trash", default=False, cast=_as_bool) or False

    # Call the delete function from the file management router
    result = api_delete(dir_value, paths_value, os_trash_value)
    return {
        "ok": result["ok"],
        "processed": len(paths_value),
        "moved": result["moved"],
        "failed": len(paths_value) - int(result["moved"]),
        "undoable": result.get("undoable", False),
        "os_trash": result.get("os_trash", False)
    }