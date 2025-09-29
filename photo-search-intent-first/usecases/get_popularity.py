"""Use case: Retrieve popularity & related adaptive attention datasets (scaffold)."""
from __future__ import annotations

from pathlib import Path
from typing import Dict, Any

from infra.index_store import IndexStore
from infra.attention_aggregator import (
    get_popularity as _get_popularity,
    get_forgotten as _get_forgotten,
    get_seasonal as _get_seasonal,
    shuffle_weighted as _shuffle_weighted,
    clear_attention as _clear_attention,
)


def popularity(folder: Path, limit: int = 50) -> Dict[str, Any]:
    store = IndexStore(folder)
    store.load()
    aggs = _get_popularity(store.index_dir, store.state.paths or [], limit=limit)
    return {
        "items": [
            {
                "path": a.path,
                "score": a.popularity,
                "size": a.size_class(),
                "views": a.views,
                "favorites": a.favorites,
                "shares": a.shares,
                "edits": a.edits,
                "last_view": a.last_view,
            }
            for a in aggs
        ]
    }


def forgotten(folder: Path, limit: int = 20, days: int = 365) -> Dict[str, Any]:
    store = IndexStore(folder)
    store.load()
    aggs = _get_forgotten(store.index_dir, store.state.paths or [], limit=limit, days=days)
    return {"items": [{"path": a.path, "last_view": a.last_view} for a in aggs]}


def seasonal(folder: Path, limit: int = 20, window_days: int = 7) -> Dict[str, Any]:
    store = IndexStore(folder)
    store.load()
    aggs = _get_seasonal(store.index_dir, store.state.paths or [], limit=limit, window_days=window_days)
    return {"items": [{"path": a.path} for a in aggs]}


def shuffle(folder: Path, limit: int = 40) -> Dict[str, Any]:
    store = IndexStore(folder)
    store.load()
    aggs = _shuffle_weighted(store.index_dir, store.state.paths or [], limit=limit)
    return {"items": [{"path": a.path} for a in aggs]}


def clear(folder: Path) -> Dict[str, Any]:
    store = IndexStore(folder)
    ok = _clear_attention(store.index_dir)
    return {"ok": bool(ok)}
