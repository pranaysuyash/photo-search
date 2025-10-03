"""
Enhanced Face-related endpoints for API v1.
"""
from fastapi import APIRouter, Body, HTTPException, Depends
from typing import Dict, Any, List, Optional

from api.utils import _require, _from_body, _as_str_list, _emb
from api.auth import require_auth
from infra.index_store import IndexStore
from services.enhanced_face_recognition import EnhancedFaceRecognizer, EnhancedFaceClusteringService
from pathlib import Path


# Create router for enhanced faces endpoints
enhanced_faces_router = APIRouter(prefix="/enhanced_faces", tags=["enhanced_faces"])


@enhanced_faces_router.post("/build", response_model=Dict[str, Any])
def build_enhanced_faces_v1(
    dir: Optional[str] = None,
    provider: Optional[str] = None,
    clustering_method: str = "hdbscan",
    min_cluster_size: int = 3,
    similarity_threshold: float = 0.6,
    quality_threshold: float = 0.3,
    body: Optional[Dict[str, Any]] = Body(None),
    _auth = Depends(require_auth)
) -> Dict[str, Any]:
    """
    Build enhanced face index for the specified directory with improved clustering.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    clustering_method_value = _from_body(body, clustering_method, "clustering_method", default="hdbscan") or "hdbscan"
    min_cluster_size_value = _from_body(body, min_cluster_size, "min_cluster_size", default=3, cast=int) or 3
    similarity_threshold_value = _from_body(body, similarity_threshold, "similarity_threshold", default=0.6, cast=float) or 0.6
    quality_threshold_value = _from_body(body, quality_threshold, "quality_threshold", default=0.3, cast=float) or 0.3

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    emb = _emb(provider_value, None, None)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    
    # Use enhanced face recognizer
    recognizer = EnhancedFaceRecognizer(
        clustering_method=clustering_method_value,
        similarity_threshold=similarity_threshold_value,
        quality_threshold=quality_threshold_value
    )
    
    result = recognizer.build_face_index(
        store.index_dir, 
        store.state.paths or [], 
        min_cluster_size=min_cluster_size_value
    )
    
    return result


@enhanced_faces_router.get("/clusters", response_model=Dict[str, Any])
def get_enhanced_face_clusters_v1(
    directory: str,
    _auth = Depends(require_auth)
) -> Dict[str, Any]:
    """
    Get all enhanced face clusters for the specified directory.
    """
    store = IndexStore(Path(directory))
    
    # Use enhanced service to get clusters
    service = EnhancedFaceClusteringService(store.index_dir)
    items = service.get_face_clusters()
    
    return {"ok": True, "clusters": items}


@enhanced_faces_router.post("/merge", response_model=Dict[str, Any])
def merge_enhanced_face_clusters_v1(
    dir: Optional[str] = None,
    source_cluster_id: Optional[str] = None,
    target_cluster_id: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
    _auth = Depends(require_auth)
) -> Dict[str, Any]:
    """
    Merge two face clusters together using enhanced clustering algorithms.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    source_value = _require(_from_body(body, source_cluster_id, "source_cluster_id"), "source_cluster_id")
    target_value = _require(_from_body(body, target_cluster_id, "target_cluster_id"), "target_cluster_id")

    store = IndexStore(Path(dir_value))
    
    # Use enhanced service for clustering operations
    service = EnhancedFaceClusteringService(store.index_dir)
    result = service.merge_clusters(source_value, target_value)
    
    return result


@enhanced_faces_router.post("/split", response_model=Dict[str, Any])
def split_enhanced_face_cluster_v1(
    dir: Optional[str] = None,
    cluster_id: Optional[str] = None,
    photo_paths: Optional[List[str]] = None,
    body: Optional[Dict[str, Any]] = Body(None),
    _auth = Depends(require_auth)
) -> Dict[str, Any]:
    """
    Split selected photos from a face cluster into a new cluster using enhanced algorithms.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    cluster_value = _require(_from_body(body, cluster_id, "cluster_id"), "cluster_id")
    photo_values = _from_body(body, photo_paths, "photo_paths", default=[], cast=_as_str_list) or []

    store = IndexStore(Path(dir_value))
    
    # Use enhanced service for clustering operations
    service = EnhancedFaceClusteringService(store.index_dir)
    result = service.split_cluster(cluster_value, photo_values)
    
    return result


@enhanced_faces_router.post("/find_similar", response_model=Dict[str, Any])
def find_similar_faces_v1(
    dir: Optional[str] = None,
    photo_path: Optional[str] = None,
    face_idx: Optional[int] = None,
    threshold: float = 0.6,
    body: Optional[Dict[str, Any]] = Body(None),
    _auth = Depends(require_auth)
) -> Dict[str, Any]:
    """
    Find faces similar to a specified face in the cluster.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    photo_path_value = _require(_from_body(body, photo_path, "photo_path"), "photo_path")
    face_idx_value = _from_body(body, face_idx, "face_idx", default=0, cast=int) or 0
    threshold_value = _from_body(body, threshold, "threshold", default=0.6, cast=float) or 0.6

    store = IndexStore(Path(dir_value))
    
    # Use enhanced service for similarity search
    service = EnhancedFaceClusteringService(store.index_dir)
    results = service.find_similar_faces(photo_path_value, face_idx_value, threshold_value)
    
    return {
        "ok": True,
        "target_face": {"photo_path": photo_path_value, "face_idx": face_idx_value},
        "similar_faces": results,
        "count": len(results)
    }


@enhanced_faces_router.get("/quality_stats", response_model=Dict[str, Any])
def get_face_quality_stats_v1(
    directory: str,
    _auth = Depends(require_auth)
) -> Dict[str, Any]:
    """
    Get statistics about face detection quality in the index.
    """
    store = IndexStore(Path(directory))
    service = EnhancedFaceClusteringService(store.index_dir)
    
    # Calculate quality statistics
    total_faces = 0
    high_quality_faces = 0
    quality_sum = 0.0
    
    for photo_path, face_list in service.faces_data.get("photos", {}).items():
        for face_data in face_list:
            quality_score = face_data.get("quality_score", 0.0)
            total_faces += 1
            quality_sum += quality_score
            if quality_score >= 0.7:  # High quality threshold
                high_quality_faces += 1
    
    avg_quality = quality_sum / total_faces if total_faces > 0 else 0.0
    
    return {
        "ok": True,
        "total_faces": total_faces,
        "high_quality_faces": high_quality_faces,
        "average_quality": avg_quality,
        "high_quality_ratio": high_quality_faces / total_faces if total_faces > 0 else 0.0
    }