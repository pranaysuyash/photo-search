from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, HTTPException, Query

from api.utils import _emb, _from_body, _require
from infra.fast_index import FastIndexManager
from infra.index_store import IndexStore

# Legacy router without prefix for parity with original_server.py routes
router = APIRouter(tags=["fast-index"])


@router.post("/fast/build")
def api_fast_build(
    directory: Optional[str] = None,
    kind: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Build fast approximate nearest neighbor (ANN) indexes for vector search acceleration."""
    dir_value = _require(_from_body(body, directory, "dir"), "dir")
    kind_value = _require(_from_body(body, kind, "kind"), "kind").lower()
    if kind_value not in {"faiss", "hnsw", "annoy"}:
        raise HTTPException(400, "Invalid kind; expected faiss|hnsw|annoy")
    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb("local", None, None)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    fim = FastIndexManager(store)
    ok = fim.build(kind_value)
    return {"ok": bool(ok), "kind": kind_value}


@router.get("/fast/status")
def api_fast_status(
    directory: str = Query(..., alias="dir"),
    provider: str = "local",
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None
) -> Dict[str, Any]:
    """Get status of fast ANN indexes (FAISS, HNSW, Annoy)."""
    folder = Path(directory)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    fim = FastIndexManager(store)
    return fim.status()