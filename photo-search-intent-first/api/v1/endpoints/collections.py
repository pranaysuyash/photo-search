"""
Collections-related endpoints for API v1.
"""
from fastapi import APIRouter, Body
from typing import Dict, Any, List, Optional
from pathlib import Path

from api.schemas.v1 import CollectionResponse, SuccessResponse
from api.utils import _require, _from_body, _as_str_list
from infra.collections import load_collections, save_collections, load_smart_collections, save_smart_collections

# Create router for collections endpoints
collections_router = APIRouter(prefix="/collections", tags=["collections"])


@collections_router.get("/")
def get_collections_v1(
    directory: str,
) -> Dict[str, Any]:
    """
    Get all collections for the specified directory.
    """
    folder = Path(directory)
    if not folder.exists():
        return {"ok": False, "message": "Directory not found"}
    
    try:
        collections = load_collections(folder)
        return {"ok": True, "data": {"collections": collections}}
    except Exception as e:
        return {"ok": False, "message": str(e)}


@collections_router.post("/")
def set_collection_v1(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    paths: Optional[List[str]] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """
    Create or update a collection with the specified photos.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")
    paths_value = _from_body(body, paths, "paths", default=[], cast=_as_str_list) or []

    try:
        folder = Path(dir_value)
        if not folder.exists():
            return {"ok": False, "message": "Directory not found"}
        
        collections = load_collections(folder)
        collections[name_value] = sorted(set(paths_value))
        save_collections(folder, collections)
        return {"ok": True, "collections": collections}
    except Exception as e:
        return {"ok": False, "message": str(e)}


@collections_router.post("/delete")
def delete_collection_v1(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """
    Delete a collection.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")

    try:
        folder = Path(dir_value)
        if not folder.exists():
            return {"ok": False, "message": "Directory not found"}
        
        collections = load_collections(folder)
        if name_value in collections:
            del collections[name_value]
            save_collections(folder, collections)
            return {"ok": True, "deleted": name_value}
        return {"ok": False, "message": f"Collection '{name_value}' not found"}
    except Exception as e:
        return {"ok": False, "message": str(e)}


@collections_router.get("/smart")
def get_smart_collections_v1(
    directory: str,
) -> Dict[str, Any]:
    """
    Get all smart collections for the specified directory.
    """
    folder = Path(directory)
    if not folder.exists():
        return {"ok": False, "message": "Directory not found"}
    
    try:
        smart_collections = load_smart_collections(folder)
        return {"ok": True, "data": {"smart_collections": smart_collections}}
    except Exception as e:
        return {"ok": False, "message": str(e)}


@collections_router.post("/smart")
def set_smart_collection_v1(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    rules: Optional[Dict[str, Any]] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """
    Create or update a smart collection with the specified rules.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")
    rules_value = _from_body(body, rules, "rules", default={}) or {}

    try:
        folder = Path(dir_value)
        if not folder.exists():
            return {"ok": False, "message": "Directory not found"}
        
        smart_collections = load_smart_collections(folder)
        smart_collections[name_value] = rules_value
        save_smart_collections(folder, smart_collections)
        return {"ok": True, "smart_collections": smart_collections}
    except Exception as e:
        return {"ok": False, "message": str(e)}


@collections_router.post("/smart/delete")
def delete_smart_collection_v1(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """
    Delete a smart collection.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")

    try:
        folder = Path(dir_value)
        if not folder.exists():
            return {"ok": False, "message": "Directory not found"}
        
        smart_collections = load_smart_collections(folder)
        if name_value in smart_collections:
            del smart_collections[name_value]
            save_smart_collections(folder, smart_collections)
            return {"ok": True, "deleted": name_value}
        return {"ok": False, "message": f"Smart collection '{name_value}' not found"}
    except Exception as e:
        return {"ok": False, "message": str(e)}


@collections_router.post("/smart/resolve")
def resolve_smart_collection_v1(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    provider: Optional[str] = "local",
    top_k: Optional[int] = 50,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """
    Resolve a smart collection by executing its rules to find matching photos.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    top_k_value = _from_body(body, top_k, "top_k", default=50, cast=int) or 50
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    try:
        from api.utils import _emb
        from infra.index_store import IndexStore

        folder = Path(dir_value)
        if not folder.exists():
            return {"ok": False, "message": "Directory not found"}
        
        emb = _emb(provider_value, hf_token_value, openai_key_value)
        store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
        store.load()
        
        smart_collections = load_smart_collections(folder)
        rules = smart_collections.get(name_value)
        
        if not isinstance(rules, dict):
            return {"search_id": None, "results": []}
        
        # Extract rules with safe defaults
        query = str(rules.get('query') or '').strip()
        fav_only = bool(rules.get('favoritesOnly'))
        tags = rules.get('tags') or []
        date_from = rules.get('dateFrom')
        date_to = rules.get('dateTo')
        use_captions = bool(rules.get('useCaptions'))
        use_ocr = bool(rules.get('useOcr'))

        # Perform search based on rules
        if use_captions and store.captions_available():
            results = store.search_with_captions(emb, query or '', top_k_value)
        elif use_ocr and store.ocr_available():
            results = store.search_with_ocr(emb, query or '', top_k_value)
        else:
            results = store.search(emb, query or '', top_k_value)

        out = results

        # Apply filters based on rules
        # Favorites filter
        if fav_only:
            from infra.collections import load_collections
            coll = load_collections(store.index_dir)
            favs = set(coll.get('Favorites', []))
            out = [r for r in out if str(r.path) in favs]

        # Tags filter
        if tags:
            from infra.tags import load_tags
            tmap = load_tags(store.index_dir)
            req = set(tags)
            out = [r for r in out if req.issubset(set(tmap.get(str(r.path), [])))]

        # Date range filter
        if date_from is not None and date_to is not None:
            try:
                mmap = {
                    sp: float(mt)
                    for sp, mt in zip(store.state.paths or [], store.state.mtimes or [])
                }
                out = [
                    r
                    for r in out
                    if float(date_from) <= mmap.get(str(r.path), 0.0) <= float(date_to)
                ]
            except Exception:
                pass

        # Convert to response format
        from api.schemas.v1 import SearchResultItem
        result_items = [SearchResultItem(path=str(r.path), score=float(r.score)) for r in out[:top_k_value]]

        import uuid
        search_id = f"v1_smart_collection_{uuid.uuid4().hex[:8]}"

        return {
            "search_id": search_id,
            "results": result_items,
            "total": len(out)
        }
    except Exception as e:
        return {"ok": False, "message": str(e)}