from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from infra.index_store import IndexStore
from infra.index_store import IndexStore
from infra.analytics import read_recent_events, _write_event as _write_event_infra
from adapters.jobs_bridge import JobsBridge
from api.auth import require_auth

router = APIRouter(prefix="/api", tags=["analytics"])


class AnalyticsEvent(BaseModel):
    type: str
    dir: str
    job_id: Optional[str] = None

    class Config:
        extra = "allow"


@router.get("/analytics")
def api_analytics(dir: str, limit: int = 200) -> Dict[str, Any]:
    """Return recent analytics/progress events for a library index directory.

    Events are stored as JSONL under the index dir (see infra.analytics._analytics_file).
    This endpoint tails the file and returns the most recent `limit` entries.
    """
    try:
        folder = Path(dir)
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
