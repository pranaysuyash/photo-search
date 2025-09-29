from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel

from adapters.jobs_bridge import JobsBridge
from api.auth import require_auth
from api.utils import _from_body, _require
from infra.analytics import _analytics_file, _write_event as _write_event_infra, read_recent_events
from infra.index_store import IndexStore

# Main router with /api prefix for new endpoints
router = APIRouter(prefix="/api", tags=["analytics"])

# Legacy router without prefix for parity with original_server.py routes
legacy_router = APIRouter(tags=["analytics-legacy"])


class AnalyticsEvent(BaseModel):
    type: str
    dir: str
    job_id: Optional[str] = None

    class Config:
        extra = "allow"


@router.get("/analytics")
def api_analytics(directory: str, limit: int = 200) -> Dict[str, Any]:
    """Return recent analytics/progress events for a library index directory.

    Events are stored as JSONL under the index dir (see infra.analytics._analytics_file).
    This endpoint tails the file and returns the most recent `limit` entries.
    """
    try:
        folder = Path(directory)
        store = IndexStore(folder)
        events = read_recent_events(store.index_dir, limit=limit)
        return {"events": events}
    except Exception as e:
        raise HTTPException(500, f"analytics read failed: {e}")


@router.post("/analytics/event")
def api_analytics_event(ev: AnalyticsEvent, _auth=Depends(require_auth)) -> Dict[str, Any]:
    """Append a single analytics/progress event (JSON object) to the log.

    The server stamps a `time` field (UTC ISO8601) if not provided.
    """
    try:
        dir_value = ev.dir
        if not dir_value:
            raise HTTPException(422, "dir is required")
        folder = Path(dir_value)
        store = IndexStore(folder)
        data = ev.dict()
        _write_event_infra(store.index_dir, data)
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"analytics write failed: {e}")


class JobCancelRequest(BaseModel):
    job_id: str


@router.post("/jobs/cancel")
def api_jobs_cancel(req: JobCancelRequest, _auth=Depends(require_auth)) -> Dict[str, Any]:
    """Cancel a running job by signaling its Threading.Event.

    The job must have been started with JobsBridge for cancellation to work.
    """
    try:
        job_id = req.job_id
        if not job_id:
            raise HTTPException(422, "job_id is required")

        bridge = JobsBridge()
        cancelled = bridge.cancel(job_id)

        if cancelled:
            return {"ok": True, "job_id": job_id, "cancelled": True}
        else:
            return {"ok": False, "job_id": job_id, "cancelled": False, "error": "Job not found or not cancellable"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Job cancellation failed: {e}")


# === Legacy routes for parity with original_server.py ===

@legacy_router.get("/analytics")
def api_analytics_legacy(directory: str = Query(..., alias="dir"), limit: int = 200) -> Dict[str, Any]:
    """Return recent analytics events from JSONL log (legacy endpoint)."""
    store = IndexStore(Path(directory))
    events: List[Dict[str, Any]] = []
    try:
        p = _analytics_file(store.index_dir)
        if p.exists():
            lines = p.read_text(encoding='utf-8').splitlines()
            tail = lines[-max(1, int(limit)):] if lines else []
            for ln in tail:
                try:
                    events.append(json.loads(ln))
                except Exception:
                    continue
    except Exception:
        events = []
    return {"events": events}


@legacy_router.post("/analytics/log")
def api_analytics_log_legacy(
    directory: Optional[str] = None,
    event_type: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Append a simple event record to analytics log (legacy endpoint)."""
    dir_value = _require(_from_body(body, directory, "dir"), "dir")
    type_value = _require(_from_body(body, event_type, "type"), "type")
    data_value = _from_body(body, None, "data")

    store = IndexStore(Path(dir_value))
    rec = {
        "type": str(type_value),
        "time": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    }
    if isinstance(data_value, dict):
        try:
            # shallow merge, preferring base keys for safety
            for k, v in data_value.items():
                if k not in rec:
                    rec[k] = v
        except Exception:
            pass
    _write_event_infra(store.index_dir, rec)
    return {"ok": True}
