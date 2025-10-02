"""
Fast index-related endpoints for API v1.
"""
from fastapi import APIRouter, Body, HTTPException, Query, Depends
from typing import Dict, Any, Optional

from api.schemas.v1 import SuccessResponse
from api.utils import _emb, _from_body, _require
from api.auth import require_auth
from infra.fast_index import FastIndexManager
from infra.index_store import IndexStore
from pathlib import Path

# Create router for fast index endpoints
fast_index_router = APIRouter(prefix="/fast_index", tags=["fast-index"])


@fast_index_router.post("/build", response_model=SuccessResponse)
def fast_build_v1(
    directory: Optional[str] = None,
    kind: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Build fast approximate nearest neighbor (ANN) indexes for vector search acceleration.
    """
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
    return SuccessResponse(ok=bool(ok), data={"kind": kind_value})


@fast_index_router.get("/status", response_model=SuccessResponse)
def fast_status_v1(
    directory: str = Query(..., alias="dir"),
    provider: str = "local",
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Get status of fast ANN indexes (FAISS, HNSW, Annoy).
    """
    folder = Path(directory)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    fim = FastIndexManager(store)
    return SuccessResponse(ok=True, data=fim.status())