"""
Enhanced Smart Collections endpoints for API v1.
"""
from datetime import datetime
from fastapi import APIRouter, Body, HTTPException, Query, Depends
from typing import Dict, Any, List, Optional

from api.schemas.v1 import SuccessResponse
from api.utils import _emb, _from_body, _require
from api.auth import require_auth
from infra.analytics import log_search
from infra.index_store import IndexStore
from domain.smart_collection_rules import SmartCollectionConfig
from services.enhanced_smart_collections import EnhancedSmartCollectionsService
from pathlib import Path


# Create router for enhanced smart collections endpoints
enhanced_smart_collections_router = APIRouter(prefix="/enhanced_smart_collections", tags=["enhanced_smart_collections"])


@enhanced_smart_collections_router.get("/", response_model=SuccessResponse)
def get_enhanced_smart_collections_v1(
    directory: str = Query(..., alias="dir"),
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Get all enhanced smart collections for a directory.
    """
    store = IndexStore(Path(directory))
    service = EnhancedSmartCollectionsService(store)
    collections = service.get_all_smart_collections()
    
    # Convert to dict format for response
    collections_dict = {name: collection.model_dump() for name, collection in collections.items()}
    
    return SuccessResponse(ok=True, data={"smart_collections": collections_dict})


@enhanced_smart_collections_router.post("/", response_model=SuccessResponse)
def create_enhanced_smart_collection_v1(
    config: SmartCollectionConfig,
    directory: str = Query(..., alias="dir"),
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Create a new enhanced smart collection with complex rules.
    """
    store = IndexStore(Path(directory))
    service = EnhancedSmartCollectionsService(store)
    
    # Set creation timestamp
    config.created_at = config.created_at or config.updated_at or datetime.now()
    config.updated_at = datetime.now()
    
    success = service.create_smart_collection(config)
    if not success:
        raise HTTPException(500, "Failed to create smart collection")
    
    return SuccessResponse(ok=True, data={"name": config.name})


@enhanced_smart_collections_router.put("/{name}", response_model=SuccessResponse)
def update_enhanced_smart_collection_v1(
    name: str,
    config: SmartCollectionConfig,
    directory: str = Query(..., alias="dir"),
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Update an existing enhanced smart collection.
    """
    store = IndexStore(Path(directory))
    service = EnhancedSmartCollectionsService(store)
    
    # Ensure the name matches the path parameter
    if config.name != name:
        raise HTTPException(400, "Collection name in body does not match path parameter")
    
    # Set update timestamp
    config.updated_at = datetime.now()
    
    success = service.update_smart_collection(name, config)
    if not success:
        raise HTTPException(404, "Smart collection not found")
    
    return SuccessResponse(ok=True, data={"name": config.name})


@enhanced_smart_collections_router.delete("/{name}", response_model=SuccessResponse)
def delete_enhanced_smart_collection_v1(
    name: str,
    directory: str = Query(..., alias="dir"),
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Delete an enhanced smart collection.
    """
    store = IndexStore(Path(directory))
    service = EnhancedSmartCollectionsService(store)
    
    success = service.delete_smart_collection(name)
    if not success:
        raise HTTPException(404, "Smart collection not found")
    
    return SuccessResponse(ok=True, data={"deleted": name})


@enhanced_smart_collections_router.post("/evaluate/{name}", response_model=SuccessResponse)
def evaluate_enhanced_smart_collection_v1(
    name: str,
    directory: str = Query(..., alias="dir"),
    provider: str = "local",
    top_k: Optional[int] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Evaluate an enhanced smart collection and return matching photos.
    """
    from datetime import datetime
    
    dir_path = Path(directory)
    if not dir_path.exists():
        raise HTTPException(400, "Folder not found")
    
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(dir_path, index_key=getattr(emb, 'index_id', None))
    store.load()
    
    service = EnhancedSmartCollectionsService(store, emb)
    collection = service.get_smart_collection(name)
    
    if not collection:
        raise HTTPException(404, "Smart collection not found")
    
    # Evaluate the collection against all available paths
    matching_paths = service.evaluate_collection(collection)
    
    # Log search
    sid = log_search(store.index_dir, getattr(emb, 'index_id', 'default'), f"Smart Collection: {name}", 
                     [(path, 1.0) for path in matching_paths])
    
    result_data = {
        "search_id": sid,
        "results": [{"path": path, "score": 1.0} for path in matching_paths],
        "total": len(matching_paths)
    }
    
    # Apply top_k limit if specified
    if top_k and top_k > 0:
        result_data["results"] = result_data["results"][:top_k]
    
    return SuccessResponse(ok=True, data=result_data)


@enhanced_smart_collections_router.post("/temporal_cluster", response_model=SuccessResponse)
def temporal_cluster_v1(
    directory: str = Query(..., alias="dir"),
    time_window_hours: int = Query(24, description="Time window in hours for clustering"),
    provider: str = "local",
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Group photos by temporal proximity (e.g., trips, events).
    """
    dir_path = Path(directory)
    if not dir_path.exists():
        raise HTTPException(400, "Folder not found")
    
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(dir_path, index_key=getattr(emb, 'index_id', None))
    store.load()
    
    service = EnhancedSmartCollectionsService(store, emb)
    
    # Perform temporal clustering
    all_paths = store.state.paths or []
    clusters = service._temporal_clustering(all_paths, time_window_hours)
    
    # Format response
    result_clusters = []
    for i, cluster in enumerate(clusters):
        # Get timestamps for the cluster
        cluster_timestamps = []
        time_map = {}
        if store.state.mtimes and store.state.paths:
            time_map = {p: t for p, t in zip(store.state.paths, store.state.mtimes)}
        
        for path in cluster:
            if path in time_map:
                cluster_timestamps.append(time_map[path])
        
        cluster_info = {
            "id": f"temporal_cluster_{i}",
            "photos": cluster,
            "count": len(cluster),
            "start_time": min(cluster_timestamps) if cluster_timestamps else None,
            "end_time": max(cluster_timestamps) if cluster_timestamps else None,
            "duration_hours": (max(cluster_timestamps) - min(cluster_timestamps)) / 3600 if len(cluster_timestamps) > 1 else 0
        }
        result_clusters.append(cluster_info)
    
    return SuccessResponse(
        ok=True,
        data={
            "clusters": result_clusters,
            "total_clusters": len(result_clusters),
            "total_photos": len(all_paths)
        }
    )


@enhanced_smart_collections_router.post("/location_cluster", response_model=SuccessResponse)
def location_cluster_v1(
    directory: str = Query(..., alias="dir"),
    distance_threshold_km: float = Query(5.0, description="Distance threshold in km for clustering"),
    provider: str = "local",
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Group photos by geographic proximity.
    """
    dir_path = Path(directory)
    if not dir_path.exists():
        raise HTTPException(400, "Folder not found")
    
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(dir_path, index_key=getattr(emb, 'index_id', None))
    store.load()
    
    service = EnhancedSmartCollectionsService(store, emb)
    
    # Perform location clustering
    all_paths = store.state.paths or []
    clusters = service._location_clustering(all_paths, distance_threshold_km)
    
    # Format response
    result_clusters = []
    for i, cluster in enumerate(clusters):
        cluster_info = {
            "id": f"location_cluster_{i}",
            "photos": cluster,
            "count": len(cluster)
        }
        result_clusters.append(cluster_info)
    
    return SuccessResponse(
        ok=True,
        data={
            "clusters": result_clusters,
            "total_clusters": len(result_clusters),
            "total_photos": len(all_paths)
        }
    )