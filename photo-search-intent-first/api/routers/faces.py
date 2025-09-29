"""Faces router - face detection, clustering, and management functionality."""

from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, HTTPException, Query

from api.utils import _as_str_list, _emb, _from_body, _require
from infra.faces import (
    build_faces as _build_faces,
    list_clusters as _face_list,
    photos_for_person as _face_photos,
    set_cluster_name as _face_name,
)
from infra.index_store import IndexStore

router = APIRouter()


@router.post("/faces/build")
def build_faces(
    dir: Optional[str] = None,
    provider: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Build face detection and clustering for all photos in directory."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    provider_value = _from_body(body, provider, "provider", default="local") or "local"

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    emb = _emb(provider_value, None, None)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    out = _build_faces(store.index_dir, store.state.paths or [])
    return out


@router.get("/faces/clusters")
def get_face_clusters(directory: str = Query(..., alias="dir")) -> Dict[str, Any]:
    """Get all face clusters for a directory."""
    store = IndexStore(Path(directory))
    items = _face_list(store.index_dir)
    return {"clusters": items}


@router.post("/faces/name")
def set_face_name(
    dir: Optional[str] = None,
    cluster_id: Optional[str] = None,
    name: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Set or update the name for a face cluster."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    cluster_value = _require(_from_body(body, cluster_id, "cluster_id"), "cluster_id")
    name_value = _require(_from_body(body, name, "name"), "name")
    
    store = IndexStore(Path(dir_value))
    return _face_name(store.index_dir, cluster_value, name_value)


@router.get("/faces/photos")
def get_face_photos(directory: str = Query(..., alias="dir"), cluster_id: str = Query(...)) -> Dict[str, Any]:
    """Get all photos containing faces from a specific cluster."""
    store = IndexStore(Path(directory))
    try:
        photos = _face_photos(store.index_dir, cluster_id)
        return {"cluster_id": cluster_id, "photos": photos, "count": len(photos)}
    except Exception:
        raise HTTPException(404, "Face cluster not found")


@router.post("/faces/merge")
def merge_face_clusters(
    dir: Optional[str] = None,
    source_cluster_id: Optional[str] = None,
    target_cluster_id: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Merge two face clusters together."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    source_value = _require(_from_body(body, source_cluster_id, "source_cluster_id"), "source_cluster_id")
    target_value = _require(_from_body(body, target_cluster_id, "target_cluster_id"), "target_cluster_id")

    store = IndexStore(Path(dir_value))
    try:
        # This would need implementation in the faces infrastructure
        # For now, return a placeholder response
        return {
            "ok": True, 
            "merged_into": target_value, 
            "source": source_value, 
            "message": "Cluster merge functionality needs implementation"
        }
    except Exception:
        raise HTTPException(500, "Could not merge face clusters")


@router.post("/faces/split")
def split_face_cluster(
    dir: Optional[str] = None,
    cluster_id: Optional[str] = None,
    photo_paths: Optional[List[str]] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Split selected photos from a face cluster into a new cluster."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    cluster_value = _require(_from_body(body, cluster_id, "cluster_id"), "cluster_id")
    photo_values = _from_body(body, photo_paths, "photo_paths", default=[], cast=_as_str_list) or []

    store = IndexStore(Path(dir_value))
    try:
        # This would need implementation in the faces infrastructure
        # For now, return a placeholder response
        return {
            "ok": True, 
            "new_cluster_id": f"split_{cluster_value}", 
            "photos": photo_values, 
            "message": "Cluster split functionality needs implementation"
        }
    except Exception:
        raise HTTPException(500, "Could not split face cluster")