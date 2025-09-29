"""
Face-related endpoints for API v1.
"""
from fastapi import APIRouter, Body, HTTPException
from typing import Dict, Any, List, Optional
from pathlib import Path

from api.utils import _require, _from_body, _as_str_list, _emb
from infra.index_store import IndexStore
from infra.faces import (
    build_faces as _build_faces,
    list_clusters as _face_list,
    photos_for_person as _face_photos,
    set_cluster_name as _face_name,
    load_faces as _faces_load
)

# Create router for faces endpoints
faces_router = APIRouter(prefix="/faces", tags=["faces"])


@faces_router.post("/build")
def build_faces_v1(
    dir: Optional[str] = None,
    provider: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """
    Build face index for the specified directory.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    provider_value = _from_body(body, provider, "provider", default="local") or "local"

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    emb = _emb(provider_value, None, None)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    result = _build_faces(store.index_dir, store.state.paths or [])
    return result


@faces_router.get("/clusters")
def get_face_clusters_v1(
    directory: str,
) -> Dict[str, Any]:
    """
    Get all face clusters for the specified directory.
    """
    store = IndexStore(Path(directory))
    items = _face_list(store.index_dir)
    return {"ok": True, "clusters": items}


@faces_router.post("/name")
def name_face_cluster_v1(
    dir: Optional[str] = None,
    cluster_id: Optional[str] = None,
    name: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """
    Assign a name to a face cluster.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    cluster_value = _require(_from_body(body, cluster_id, "cluster_id"), "cluster_id")
    name_value = _require(_from_body(body, name, "name"), "name")
    
    store = IndexStore(Path(dir_value))
    result = _face_name(store.index_dir, cluster_value, name_value)
    return result


@faces_router.get("/photos")
def get_photos_for_person_v1(
    directory: str,
    cluster_id: str,
) -> Dict[str, Any]:
    """
    Get all photos containing faces from a specific cluster.
    """
    store = IndexStore(Path(directory))
    try:
        photos = _face_photos(store.index_dir, cluster_id)
        return {"ok": True, "cluster_id": cluster_id, "photos": photos, "count": len(photos)}
    except Exception:
        raise HTTPException(404, "Face cluster not found")


@faces_router.post("/merge")
def merge_face_clusters_v1(
    dir: Optional[str] = None,
    source_cluster_id: Optional[str] = None,
    target_cluster_id: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """
    Merge two face clusters together.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    source_value = _require(_from_body(body, source_cluster_id, "source_cluster_id"), "source_cluster_id")
    target_value = _require(_from_body(body, target_cluster_id, "target_cluster_id"), "target_cluster_id")

    store = IndexStore(Path(dir_value))
    try:
        # Note: This functionality would need implementation in the faces infrastructure
        # The following is a placeholder that demonstrates the intended API design
        faces_data = _faces_load(store.index_dir)
        
        # Get the photos from the source cluster
        source_photos = faces_data.get("clusters", {}).get(str(source_value), [])
        
        # Add them to the target cluster
        target_cluster = faces_data.get("clusters", {}).get(str(target_value), [])
        target_cluster.extend(source_photos)
        faces_data["clusters"][str(target_value)] = target_cluster
        
        # Remove the source cluster
        if str(source_value) in faces_data["clusters"]:
            del faces_data["clusters"][str(source_value)]
        
        # Update the cluster assignments for each photo
        for photo_path, face_list in faces_data.get("photos", {}).items():
            for face_data in face_list:
                if face_data.get("cluster") == int(source_value):
                    face_data["cluster"] = int(target_value)
        
        # Save the updated data
        from infra.faces import save_faces
        save_faces(store.index_dir, faces_data)
        
        return {
            "ok": True, 
            "merged_into": target_value, 
            "source": source_value, 
            "message": f"Merged cluster {source_value} into {target_value}"
        }
    except Exception as e:
        raise HTTPException(500, f"Could not merge face clusters: {str(e)}")


@faces_router.post("/split")
def split_face_cluster_v1(
    dir: Optional[str] = None,
    cluster_id: Optional[str] = None,
    photo_paths: Optional[List[str]] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """
    Split selected photos from a face cluster into a new cluster.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    cluster_value = _require(_from_body(body, cluster_id, "cluster_id"), "cluster_id")
    photo_values = _from_body(body, photo_paths, "photo_paths", default=[], cast=_as_str_list) or []

    store = IndexStore(Path(dir_value))
    try:
        # Note: This functionality would need implementation in the faces infrastructure
        # The following is a placeholder that demonstrates the intended API design
        faces_data = _faces_load(store.index_dir)
        
        # Find the highest cluster ID to assign a new one
        existing_cluster_ids = [int(k) for k in faces_data.get("clusters", {}).keys() if k.lstrip('-').isdigit()]
        new_cluster_id = str(max(existing_cluster_ids) + 1 if existing_cluster_ids else 0)
        
        # Find and move the specified photos to the new cluster
        cluster_photos = faces_data.get("clusters", {}).get(str(cluster_value), [])
        photos_to_move = []
        remaining_photos = []
        
        for photo_info in cluster_photos:
            photo_path, emb_idx = photo_info
            if photo_path in photo_values:
                photos_to_move.append(photo_info)
            else:
                remaining_photos.append(photo_info)
        
        # Update both clusters
        faces_data["clusters"][str(cluster_value)] = remaining_photos
        faces_data["clusters"][new_cluster_id] = photos_to_move
        
        # Update the cluster assignments for each photo in photos_to_move
        for photo_path, emb_idx in photos_to_move:
            if photo_path in faces_data.get("photos", {}):
                for face_data in faces_data["photos"][photo_path]:
                    if face_data.get("emb") == emb_idx and face_data.get("cluster") == int(cluster_value):
                        face_data["cluster"] = int(new_cluster_id)
        
        # Save the updated data
        from infra.faces import save_faces
        save_faces(store.index_dir, faces_data)
        
        return {
            "ok": True, 
            "new_cluster_id": new_cluster_id, 
            "photos": photo_values, 
            "original_cluster": cluster_value,
            "message": f"Split {len(photos_to_move)} photos from cluster {cluster_value} to new cluster {new_cluster_id}"
        }
    except Exception as e:
        raise HTTPException(500, f"Could not split face cluster: {str(e)}")