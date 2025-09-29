"""
Index routes - core photo indexing operations.

Handles building photo indexes, checking status, and controlling
indexing operations (pause/resume) for embedding-based search.
"""
from fastapi import APIRouter, Body, HTTPException, Query
from typing import Dict, Any, Optional
from pathlib import Path
import json
import uuid
import logging
from pydantic import BaseModel

from api.utils import _require, _from_body, _emb
from infra.index_store import IndexStore
from infra.analytics import _analytics_file, _write_event
from usecases.index_photos import index_photos
from api.schemas.v1 import IndexResponse

router = APIRouter()


class IndexRequest(BaseModel):
    dir: str
    provider: str = "local"
    batch_size: int = 32
    hf_token: Optional[str] = None
    openai_key: Optional[str] = None


@router.post("/index")
def api_index(
    req: IndexRequest = Body(...),
) -> IndexResponse:
    """Build or update the photo index for a directory."""
    # Validate and expand directory path
    dir_value = req.dir
    if not dir_value:
        raise HTTPException(400, "Directory path is required")
    
    folder = Path(dir_value).expanduser().resolve()
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    if not folder.is_dir():
        raise HTTPException(400, "Path is not a directory")

    try:
        # Attempt to access the folder
        next(folder.iterdir(), None)
    except PermissionError:
        raise HTTPException(403, "Permission denied to access folder")
    except Exception as e:
        raise HTTPException(400, f"Cannot access folder: {str(e)}")

    emb = _emb(req.provider, req.hf_token, req.openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    
    # Generate a job ID
    job_id = str(uuid.uuid4())
    
    # Index photos synchronously (matches modern approach)
    try:
        new_c, upd_c, total = index_photos(
            folder,
            batch_size=req.batch_size,
            embedder=emb,
            job_id=job_id,
        )
        
        # Log analytics event
        try:
            _write_event(store.index_dir, {
                "type": "index",
                "new": int(new_c),
                "updated": int(upd_c),
                "total": int(total),
            })
        except Exception:
            pass  # Non-critical, don't fail the request
        
        return IndexResponse(
            ok=True,
            job_id=job_id,
        )
    except Exception as e:
        logging.error(f"Indexing job {job_id} failed: {str(e)}")
        raise HTTPException(500, f"Indexing failed: {str(e)}")


@router.get("/index/status")
def api_index_status(
    directory: str = Query(..., alias="dir"), 
    provider: str = "local", 
    hf_token: Optional[str] = None, 
    openai_key: Optional[str] = None
) -> Dict[str, Any]:
    """Get the current status of indexing for a directory."""
    folder = Path(directory)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    status_file = store.index_dir / 'index_status.json'
    ctrl_file = store.index_dir / 'index_control.json'
    
    if not status_file.exists():
        # Fallback: legacy/alternate index keys under appdata base or .photo_index
        try:
            bases = []
            try:
                bases.append(store.index_dir.parent)
            except Exception:
                pass
            bases.append(folder / '.photo_index')
            for base in bases:
                try:
                    if not base.exists():
                        continue
                    legacy = base / 'st-clip-ViT-B-32' / 'index_status.json'
                    if legacy.exists():
                        status_file = legacy
                        break
                    for sub in base.iterdir():
                        cand = sub / 'index_status.json'
                        if cand.exists():
                            status_file = cand
                            break
                    if status_file.exists():
                        break
                except Exception:
                    continue
        except Exception:
            pass
    
    if not status_file.exists():
        # Provide a minimal snapshot from diagnostics as fallback
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
        # Ensure expected numeric fields exist for clients/tests
        for k in ('target','insert_done','insert_total','updated','done','total'):
            if k not in data:
                # do not overwrite if present
                pass
        
        # Enrich with index health
        try:
            store.load()
            indexed = len(store.state.paths or [])
            data['indexed'] = int(indexed)
            tgt = int(data.get('target') or 0)
            if tgt > 0:
                cov = max(0.0, min(1.0, float(indexed) / float(tgt)))
                data['coverage'] = cov
                data['drift'] = max(0, int(tgt - indexed))
            
            # last index time from analytics log
            try:
                p = _analytics_file(store.index_dir)
                if p.exists():
                    for ln in reversed(p.read_text(encoding='utf-8').splitlines()):
                        try:
                            ev = json.loads(ln)
                            if ev.get('type') == 'index' and ev.get('time'):
                                data['last_index_time'] = ev.get('time')
                                break
                        except Exception:
                            continue
            except Exception:
                pass
        except Exception:
            pass
        
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
    """Pause indexing operations for a directory."""
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
    """Resume indexing operations for a directory."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    store = IndexStore(Path(dir_value))
    p = store.index_dir / 'index_control.json'
    try:
        if p.exists():
            p.unlink()
        return { 'ok': True }
    except Exception as e:
        raise HTTPException(500, f"Resume failed: {e}")