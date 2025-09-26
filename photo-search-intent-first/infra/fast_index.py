"""Fast index strategy manager.

Intent:
  Provide a single abstraction for optional ANN backends (faiss, hnsw, annoy) plus
  an always-available exact fallback. This keeps API/server/usecases free from
  backend‑specific conditionals and centralizes capability + status reporting.

Contract:
  - build(kind) -> bool (False if library missing or no embeddings)
  - status() -> { backends: [ {kind, available, built, size, dim, error} ], selected?: str }
  - search(query, top_k, fast_kind_hint, use_fast) -> (results, metadata)

Selection Rules:
  1. If not use_fast: always exact.
  2. If fast_kind_hint provided and that backend is built+available -> use it; else fall back to exact.
  3. If fast_kind_hint is None or 'auto': pick first built+available in preference order FAISS > HNSW > ANNOY.
  4. Always rerank final candidates using exact similarities for deterministic ordering.

This module is intentionally dependency-light; it delegates actual index
construction/search to the existing methods on IndexStore.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from infra.index_store import IndexStore
from domain.models import SearchResult

_PREF_ORDER = ["faiss", "hnsw", "annoy"]


def _backend_status(store: IndexStore, kind: str) -> Dict[str, Any]:
    out: Dict[str, Any] = {"kind": kind, "available": False, "built": False, "size": None, "dim": None, "error": None}
    try:
        if kind == "faiss":
            st = store.faiss_status()
        elif kind == "hnsw":
            st = store.hnsw_status()
        elif kind == "annoy":
            st = store.annoy_status()
        else:
            return out
        # Library availability is encoded in exists for faiss, others we test import inline
        if kind == "faiss":
            out["available"] = bool(st.get("exists"))  # already gated by import
            out["built"] = bool(st.get("exists"))
        else:
            # For hnsw/annoy we treat 'exists' as built; try import to set available
            out["built"] = bool(st.get("exists"))
            try:
                if kind == "hnsw":
                    import hnswlib  # type: ignore  # noqa: F401
                elif kind == "annoy":
                    from annoy import AnnoyIndex  # type: ignore  # noqa: F401
                out["available"] = True
            except Exception:
                out["available"] = False
        if out["built"]:
            out["size"] = st.get("size")
            out["dim"] = st.get("dim")
    except Exception as e:  # pragma: no cover (defensive)
        out["error"] = str(e)
    return out


class FastIndexManager:
    def __init__(self, store: IndexStore) -> None:
        self.store = store

    # Build operations -------------------------------------------------
    def build(self, kind: str) -> bool:
        kind = kind.lower()
        if kind == "faiss":
            return self.store.build_faiss()
        if kind == "hnsw":
            return self.store.build_hnsw()
        if kind == "annoy":
            return self.store.build_annoy()
        return False

    # Status -----------------------------------------------------------
    def status(self) -> Dict[str, Any]:
        backs = [_backend_status(self.store, k) for k in _PREF_ORDER]
        return {"backends": backs}

    # Search -----------------------------------------------------------
    def search(
        self,
        embedder,
        query: str,
        top_k: int = 12,
        use_fast: bool = False,
        fast_kind_hint: Optional[str] = None,
        subset: Optional[List[int]] = None,
    ) -> Tuple[List[SearchResult], Dict[str, Any]]:
        meta: Dict[str, Any] = {"backend": "exact", "fallback": False, "requested": fast_kind_hint, "use_fast": use_fast}
        if not use_fast:
            return self.store.search(embedder, query, top_k=top_k, subset=subset), meta

        status = self.status()
        chosen: Optional[str] = None
        hint = fast_kind_hint.lower() if fast_kind_hint else None
        if hint == "exact":
            meta["fallback"] = True
            return self.store.search(embedder, query, top_k=top_k, subset=subset), meta
        if hint and hint not in ("auto", "exact"):
            # explicit request
            for b in status["backends"]:
                if b["kind"] == hint and b["available"] and b["built"]:
                    chosen = b["kind"]
                    break
            if chosen is None:
                meta["fallback"] = True
                return self.store.search(embedder, query, top_k=top_k, subset=subset), meta
        if chosen is None and (hint is None or hint == "auto"):  # auto path
            for b in status["backends"]:
                if b["available"] and b["built"]:
                    chosen = b["kind"]
                    break
        if chosen is None:
            meta["fallback"] = True
            return self.store.search(embedder, query, top_k=top_k, subset=subset), meta
        meta["backend"] = chosen
        if chosen == "faiss":
            res = self.store.search_faiss(embedder, query, top_k=top_k, subset=subset)
        elif chosen == "hnsw":
            res = self.store.search_hnsw(embedder, query, top_k=top_k, subset=subset)
        elif chosen == "annoy":
            res = self.store.search_annoy(embedder, query, top_k=top_k, subset=subset)
        else:
            res = self.store.search(embedder, query, top_k=top_k, subset=subset)
        return res, meta

__all__ = ["FastIndexManager"]
