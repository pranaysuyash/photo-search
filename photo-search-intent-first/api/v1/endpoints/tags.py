"""
Tags-related endpoints for API v1.
"""
from fastapi import APIRouter, Body
from typing import Dict, Any, List

from api.schemas.v1 import TagsRequest, TagResponse, SuccessResponse
from api.utils import _require, _from_body
from infra.tags import load_tags, save_tags
from pathlib import Path

# Create router for tags endpoints
tags_router = APIRouter(prefix="/tags", tags=["tags"])


@tags_router.get("/")
def get_tags_v1(
    directory: str,
) -> Dict[str, Any]:
    """
    Get all tags for the specified directory.
    """
    folder = Path(directory)
    if not folder.exists():
        return {"ok": False, "message": "Directory not found"}
    
    try:
        tags_map = load_tags(folder)
        return {"ok": True, "data": tags_map}
    except Exception as e:
        return {"ok": False, "message": str(e)}


@tags_router.post("/")
def set_tags_v1(
    request: TagsRequest = Body(...)
) -> TagResponse:
    """
    Add tags to a specific photo.
    """
    try:
        folder = Path(request.dir or request.directory)
        if not folder.exists():
            return TagResponse(ok=False, message="Directory not found")
        
        tags_map = load_tags(folder)
        
        # Get existing tags for the path or initialize as empty list
        existing_tags = set(tags_map.get(request.path, []))
        
        # Add new tags
        for tag in request.tags:
            existing_tags.add(tag)
        
        # Update the tags map
        tags_map[request.path] = sorted(list(existing_tags))
        
        # Save the updated tags
        save_tags(folder, tags_map)
        
        return TagResponse(
            ok=True,
            path=request.path,
            tags=sorted(list(existing_tags))
        )
    except Exception as e:
        return TagResponse(ok=False, message=str(e))


@tags_router.post("/autotag")
def autotag_v1(
    directory: str,
    provider: str = "local",
    min_len: int = 4,
    max_tags_per_image: int = 8,
) -> Dict[str, Any]:
    """
    Automatically tag photos based on captions.
    """
    from api.utils import _emb
    from infra.index_store import IndexStore
    import json
    import re
    
    folder = Path(directory)
    emb = _emb(provider, None, None)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    cap_p = store.cap_texts_file
    if not cap_p.exists():
        return {"updated": 0}
    
    try:
        data = json.loads(cap_p.read_text())
        texts = {p: t for p, t in zip(data.get('paths', []), data.get('texts', []))}
    except Exception:
        texts = {}
    
    stop = set(['the','and','with','for','from','this','that','your','their','over','under','into','near','onto','are','is','of','to','a','an','in','on','by','at','it','its','as','be'])
    tmap = load_tags(store.index_dir)
    updated = 0
    
    for p, txt in texts.items():
        if not txt:
            continue
        toks = [w.lower() for w in re.split(r"[^A-Za-z]+", txt) if len(w)>=min_len and w.lower() not in stop]
        uniq = []
        for w in toks:
            if w and w not in uniq:
                uniq.append(w)
        if not uniq:
            continue
        cur = set(tmap.get(p, []))
        before = len(cur)
        for w in uniq[:max_tags_per_image]:
            cur.add(w)
        if len(cur) != before:
            tmap[p] = sorted(cur)
            updated += 1
    
    save_tags(store.index_dir, tmap)
    return {"ok": True, "updated": updated}