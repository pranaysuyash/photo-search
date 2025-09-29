"""Additional attention use cases: duplicates & related photos."""
from __future__ import annotations

from pathlib import Path
from typing import Dict, Any

from infra.index_store import IndexStore
from infra.dupes import find_lookalikes, build_hashes, _group_id, load_resolved, save_resolved


def duplicates(folder: Path, max_distance: int = 5, rebuild: bool = False) -> Dict[str, Any]:
    store = IndexStore(folder)
    store.load()  # only to get index_dir
    # Optionally (re)build hashes if not present or requested
    hashes_file = store.index_dir / 'hashes.json'
    if rebuild or not hashes_file.exists():
        # Build using whatever paths are present in index store; if index not built yet, nothing will happen
        if store.paths_file.exists():
            try:
                data = (store.paths_file.read_text())
                import json
                paths = json.loads(data).get("paths", [])
            except Exception:
                paths = []
        else:
            paths = []
        build_hashes(store.index_dir, paths)
    groups = find_lookalikes(store.index_dir, max_distance=max_distance)
    resolved = set(load_resolved(store.index_dir))
    out = []
    for g in groups:
        gid = _group_id(g)
        out.append({
            "id": gid,
            "size": len(g),
            "paths": g,
            "resolved": gid in resolved,
        })
    return {"groups": out}


def mark_duplicate_group(folder: Path, group_id: str, resolved: bool = True) -> Dict[str, Any]:
    store = IndexStore(folder)
    store.load()
    ids = set(load_resolved(store.index_dir))
    if resolved:
        ids.add(group_id)
    else:
        ids.discard(group_id)
    save_resolved(store.index_dir, list(ids))
    return {"ok": True, "id": group_id, "resolved": resolved}


def related(folder: Path, path: str, provider: str = "local", limit: int = 12) -> Dict[str, Any]:
    from adapters.provider_factory import get_provider
    store = IndexStore(folder)
    store.load()
    # If embeddings missing return empty
    if store.state.embeddings is None or not store.state.paths:
        return {"items": []}
    embedder = get_provider(provider)
    results = store.search_like(embedder, path, top_k=limit)
    return {"items": [{"path": str(r.path), "score": r.score} for r in results if str(r.path) != path]}
