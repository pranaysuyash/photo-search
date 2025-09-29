from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Query

from api.schemas.v1 import TagsRequest
from api.utils import _from_body, _require, _emb
from infra.index_store import IndexStore
from infra.tags import load_tags, save_tags, all_tags

# Legacy router without prefix for parity with original_server.py routes
router = APIRouter(tags=["tagging"])


@router.post("/autotag")
def api_autotag(
    directory: Optional[str] = None,
    provider: Optional[str] = None,
    min_len: Optional[int] = None,
    max_tags_per_image: Optional[int] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Derive simple tags from captions (if available) and add them to tags.json.
    Heuristic: split on non-letters, lowercase, drop stopwords/short tokens, keep unique tokens.
    """
    dir_value = _require(_from_body(body, directory, "dir"), "dir")
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    min_len_value = _from_body(body, min_len, "min_len", default=4, cast=int) or 4
    max_tags_value = _from_body(body, max_tags_per_image, "max_tags_per_image", default=8, cast=int) or 8

    folder = Path(dir_value)
    emb = _emb(provider_value, None, None)
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
        toks = [w.lower() for w in re.split(r"[^A-Za-z]+", txt) if len(w)>=min_len_value and w.lower() not in stop]
        uniq = []
        for w in toks:
            if w and w not in uniq:
                uniq.append(w)
        if not uniq:
            continue
        cur = set(tmap.get(p, []))
        before = len(cur)
        for w in uniq[:max_tags_value]:
            cur.add(w)
        if len(cur) != before:
            tmap[p] = sorted(cur)
            updated += 1
    save_tags(store.index_dir, tmap)
    return {"updated": updated}


@router.get("/tags")
def api_get_tags(directory: str = Query(..., alias="dir")) -> Dict[str, Any]:
    """Get all tags for a directory."""
    store = IndexStore(Path(directory))
    return {"tags": load_tags(store.index_dir), "all": all_tags(store.index_dir)}


@router.post("/tags")
def api_set_tags(req: TagsRequest) -> Dict[str, Any]:
    """Set tags for a specific photo."""
    store = IndexStore(Path(req.dir))
    t = load_tags(store.index_dir)
    t[req.path] = sorted({s.strip() for s in req.tags if s.strip()})
    save_tags(store.index_dir, t)
    return {"ok": True, "tags": t[req.path]}