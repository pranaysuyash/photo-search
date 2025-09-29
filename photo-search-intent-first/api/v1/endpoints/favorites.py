"""
Favorites-related endpoints for API v1.
"""
from fastapi import APIRouter, Body
from typing import Dict, Any

from api.schemas.v1 import FavoritesRequest, FavoriteResponse
from infra.collections import load_collections, save_collections
from pathlib import Path

# Create router for favorites endpoints
favorites_router = APIRouter(prefix="/favorites", tags=["favorites"])


@favorites_router.get("/")
def get_favorites_v1(
    directory: str,
) -> Dict[str, Any]:
    """
    Get all favorite photos for the specified directory.
    """
    folder = Path(directory)
    if not folder.exists():
        return {"ok": False, "message": "Directory not found"}
    
    try:
        collections = load_collections(folder)
        favorites = collections.get('Favorites', [])
        return {"ok": True, "data": {"favorites": favorites}}
    except Exception as e:
        return {"ok": False, "message": str(e)}


@favorites_router.post("/")
def set_favorite_v1(
    request: FavoritesRequest = Body(...)
) -> FavoriteResponse:
    """
    Toggle favorite status for a photo.
    """
    try:
        folder = Path(request.dir or request.directory)
        if not folder.exists():
            return FavoriteResponse(ok=False, message="Directory not found")
        
        collections = load_collections(folder)
        favorites = set(collections.get('Favorites', []))
        
        if request.favorite:
            favorites.add(request.path)
        else:
            favorites.discard(request.path)
        
        collections['Favorites'] = sorted(list(favorites))
        save_collections(folder, collections)
        
        return FavoriteResponse(
            ok=True,
            path=request.path,
            favorite=request.favorite
        )
    except Exception as e:
        return FavoriteResponse(ok=False, message=str(e))