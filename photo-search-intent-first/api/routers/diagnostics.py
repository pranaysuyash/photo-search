from __future__ import annotations

import json
import platform
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from api.utils import _emb
from infra.index_store import IndexStore

# Legacy router without prefix for parity with original_server.py routes
router = APIRouter(tags=["diagnostics"])


@router.get("/diagnostics")
def api_diagnostics(
    directory: str = Query(..., alias="dir"),
    provider: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None
) -> Dict[str, Any]:
    """Get diagnostic information about photo index status and system resources."""
    folder = Path(directory)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    # If provider specified, report its index; else list indexes under .photo_index
    items: List[Dict[str, Any]] = []
    if provider:
        emb = _emb(provider, hf_token, openai_key)
        store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
        store.load()
        info = {"key": getattr(emb, 'index_id', 'default'), "index_dir": str(store.index_dir), "count": len(store.state.paths or [])}
        try:
            info["fast"] = {
                "annoy": bool(store.ann_status().get('exists')),
                "faiss": bool(store.faiss_status().get('exists')),
                "hnsw": bool(store.hnsw_status().get('exists')),
            }
        except Exception:
            info["fast"] = {"annoy": False, "faiss": False, "hnsw": False}
        items.append(info)
    else:
        base = folder / ".photo_index"
        if base.exists():
            for sub in base.iterdir():
                if not sub.is_dir():
                    continue
                p = sub / "paths.json"
                cnt = 0
                try:
                    if p.exists():
                        data = json.loads(p.read_text())
                        cnt = len(data.get("paths", []))
                except Exception:
                    cnt = 0
                items.append({"key": sub.name, "index_dir": str(sub), "count": cnt})
    free_gb = shutil.disk_usage(Path.home()).free / (1024**3)
    return {"folder": str(folder), "engines": items, "free_gb": round(free_gb, 1), "os": platform.system()}


@router.get("/status/{operation}")
def api_operation_status(operation: str, directory: str = Query(..., alias="dir")) -> Dict[str, Any]:
    """Get status of long-running operations like indexing, caption building, etc."""
    store = IndexStore(Path(directory))

    status_files = {
        'index': 'index_status.json',
        'captions': 'captions_status.json',
        'ocr': 'ocr_status.json',
        'metadata': 'metadata_status.json',
        'fast_index': 'fast_status.json'
    }

    status_file = status_files.get(operation)
    if not status_file:
        return {"error": f"Unknown operation: {operation}"}

    status_path = store.index_dir / status_file
    if not status_path.exists():
        return {"state": "idle"}

    try:
        status = json.loads(status_path.read_text(encoding='utf-8'))
        return status
    except Exception:
        return {"state": "error", "error": "Could not read status file"}