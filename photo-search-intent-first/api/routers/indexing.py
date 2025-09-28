from __future__ import annotations

import json
import os
import shutil
import time
import uuid
from pathlib import Path
from typing import Any, Dict, Optional, Set

from fastapi import APIRouter, Body, HTTPException, Depends
from pydantic import BaseModel

from adapters.provider_factory import get_provider
from domain.models import SUPPORTED_EXTS
from infra.index_store import IndexStore
from infra.analytics import _write_event as _write_event_infra
from infra.watcher import WatchManager
from usecases.index_photos import index_photos
from api.auth import require_auth
from api.utils import _from_body, _require, _emb


router = APIRouter(prefix="/api", tags=["indexing"])


class IndexRequest(BaseModel):
    dir: str
    provider: str = "local"
    batch_size: int = 32
    hf_token: Optional[str] = None
    openai_key: Optional[str] = None


@router.post("/index")
def api_index(req: IndexRequest, _auth=Depends(require_auth)) -> Dict[str, Any]:
    folder = Path(req.dir)

    if not folder:
        raise HTTPException(400, "Folder path is required")
    folder = folder.expanduser().resolve()
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    if not folder.is_dir():
        raise HTTPException(400, "Path is not a directory")
    try:
        next(folder.iterdir(), None)
    except PermissionError:
        raise HTTPException(403, "Permission denied to access folder")
    except Exception as e:
        raise HTTPException(400, f"Cannot access folder: {str(e)}")

    emb = _emb(req.provider, req.hf_token, req.openai_key)

    job_id = f"index-{uuid.uuid4().hex[:8]}"

    new_c, upd_c, total = index_photos(
        folder,
        batch_size=req.batch_size,
        embedder=emb,
        job_id=job_id,
    )
    try:
        _write_event_infra(IndexStore(folder, index_key=getattr(emb, "index_id", None)).index_dir, {
            "type": "index",
            "new": int(new_c),
            "updated": int(upd_c),
            "total": int(total),
        })
    except Exception:
        pass
    return {"new": new_c, "updated": upd_c, "total": total, "job_id": job_id}


@router.post("/data/nuke")
def api_data_nuke(
    dir: Optional[str] = None,
    all: Optional[bool] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    try:
        wipe_all = _from_body(body, all, "all", default=False, cast=lambda v: str(v).lower() in {"1", "true", "yes"}) or False
        if wipe_all:
            base = os.environ.get("PS_APPDATA_DIR", "").strip()
            if base:
                bp = Path(base).expanduser().resolve()
                if bp.exists() and bp.is_dir() and str(bp) not in ("/", str(Path.home())):
                    shutil.rmtree(bp)
                    return {"ok": True, "cleared": str(bp)}
                else:
                    raise HTTPException(400, "Unsafe app data path")
            else:
                raise HTTPException(400, "PS_APPDATA_DIR not set")
        dir_value = _from_body(body, dir, "dir")
        if not dir_value:
            raise HTTPException(400, "dir required unless all=1")
        folder = Path(dir_value)
        emb = _emb("local", None, None)
        store = IndexStore(folder, index_key=getattr(emb, "index_id", None))
        idx = store.index_dir
        if idx.exists() and idx.is_dir():
            shutil.rmtree(idx)
        return {"ok": True, "cleared": str(idx)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to clear data: {e}")


# Watch endpoints
_WATCH = WatchManager()


@router.get("/watch/status")
def api_watch_status() -> Dict[str, Any]:
    return {"available": _WATCH.available()}


class WatchReq(BaseModel):
    dir: str
    provider: str = "local"
    debounce_ms: int = 1500
    batch_size: int = 12


@router.post("/watch/start")
def api_watch_start(req: WatchReq, _auth=Depends(require_auth)) -> Dict[str, Any]:
    if not _WATCH.available():
        raise HTTPException(400, "watchdog not available")
    folder = Path(req.dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(req.provider, None, None)
    store = IndexStore(folder, index_key=getattr(emb, "index_id", None))

    def on_batch(paths: Set[str]) -> None:
        try:
            wanted = [p for p in paths if str(p).lower().endswith(tuple(SUPPORTED_EXTS))]
            if not wanted:
                return
            store.upsert_paths(emb, wanted, batch_size=max(1, int(req.batch_size)))
        except Exception:
            pass

    ok = _WATCH.start(folder, on_batch, exts=set(SUPPORTED_EXTS), debounce_ms=max(500, int(req.debounce_ms)))
    if not ok:
        raise HTTPException(500, "Failed to start watcher")
    return {"ok": True}


@router.post("/watch/stop")
def api_watch_stop(
    dir: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    folder = Path(dir_value)
    _WATCH.stop(folder)
    return {"ok": True}


@router.get("/index/status")
def api_index_status(dir: str, provider: str = "local", hf_token: Optional[str] = None, openai_key: Optional[str] = None) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    status_file = store.index_dir / 'index_status.json'
    ctrl_file = store.index_dir / 'index_control.json'
    if not status_file.exists():
        try:
            store.load()
            return {
                'state': 'idle',
                'total': len(store.state.paths or []),
            }
        except Exception:
            return { 'state': 'idle' }
    try:
        data = json.loads(status_file.read_text(encoding='utf-8'))
        try:
            store.load()
            indexed = len(store.state.paths or [])
            data['indexed'] = int(indexed)
            tgt = int(data.get('target') or 0)
            if tgt > 0:
                cov = max(0.0, min(1.0, float(indexed) / float(tgt)))
                data['coverage'] = cov
                data['drift'] = max(0, int(tgt - indexed))
        except Exception:
            pass
        # No analytics last_index_time enrichment here to keep router minimal
        if ctrl_file.exists():
            try:
                cfg = json.loads(ctrl_file.read_text(encoding='utf-8'))
                if bool(cfg.get('pause')):
                    data['state'] = 'paused'
                    data['paused'] = True
            except Exception:
                pass
        return data
    except Exception:
        return { 'state': 'unknown' }


@router.post("/index/pause")
def api_index_pause(
    dir: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    store = IndexStore(Path(dir_value))
    p = store.index_dir / 'index_control.json'
    try:
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, 'w', encoding='utf-8') as fh:
            fh.write(json.dumps({ 'pause': True }))
        return { 'ok': True }
    except Exception as e:
        raise HTTPException(500, f"Pause failed: {e}")


@router.post("/index/resume")
def api_index_resume(
    dir: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    store = IndexStore(Path(dir_value))
    p = store.index_dir / 'index_control.json'
    try:
        if p.exists():
            p.unlink()
        return { 'ok': True }
    except Exception as e:
        raise HTTPException(500, f"Resume failed: {e}")
