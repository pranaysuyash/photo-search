"""
Favorites Router
Handles favorites management endpoints extracted from original_server.py.
"""

import json
from pathlib import Path
from typing import Any, Dict
from fastapi import APIRouter, HTTPException, Query

from api.schemas.v1 import FavoritesRequest, SuccessResponse
from api.utils import _zip_meta
from infra.collections import load_collections, save_collections
from infra.index_store import IndexStore

router = APIRouter()

def load_meta(index_dir: Path) -> Dict[str, Any]:
    """Load EXIF metadata from index directory."""
    meta_p = index_dir / 'exif_index.json'
    if meta_p.exists():
        return json.loads(meta_p.read_text())
    return {"paths": [], "mtime": []}

@router.get("/favorites")
def api_get_favorites(directory: str = Query(..., alias="dir")) -> SuccessResponse:
    """Get all favorites for a directory with metadata."""
    folder = Path(directory).expanduser().resolve()
    if not folder.exists() or not folder.is_dir():
        raise HTTPException(400, "Directory not found")
    coll = load_collections(folder / ".photo_index")
    favs = set(coll.get("Favorites", []))
    meta = _zip_meta(load_meta(folder / ".photo_index"), "mtime", lambda v: v)
    return SuccessResponse(
        ok=True,
        data={
            "paths": [
                {"path": str(p), "mtime": mt, "is_favorite": str(p) in favs}
                for p, mt in meta.items()
            ],
        },
    )

@router.post("/favorites")
def api_set_favorite(req: FavoritesRequest) -> Dict[str, Any]:
    """Add or remove a photo from favorites."""
    store = IndexStore(Path(req.dir))
    coll = load_collections(store.index_dir)
    fav = coll.get('Favorites', [])
    if req.favorite:
        if req.path not in fav:
            fav.append(req.path)
    else:
        fav = [p for p in fav if p != req.path]
    coll['Favorites'] = fav
    save_collections(store.index_dir, coll)
    return {"ok": True, "favorites": fav}