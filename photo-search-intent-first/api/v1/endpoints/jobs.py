"""
Job scheduler API endpoints for monitoring and managing background tasks.
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from pydantic import BaseModel

from api.scheduler.job_scheduler import get_job_scheduler

# Create router for job scheduler endpoints
job_router = APIRouter(prefix="/jobs", tags=["jobs"])


class JobSubmissionRequest(BaseModel):
    """Request model for submitting jobs."""
    name: str
    priority: str = "NORMAL"  # CRITICAL, HIGH, NORMAL, LOW
    estimated_duration: float = 1.0


class JobSubmissionResponse(BaseModel):
    """Response model for job submission."""
    job_id: str
    status: str = "submitted"


class JobStatusResponse(BaseModel):
    """Response model for job status."""
    id: str
    name: str
    status: str
    priority: str
    submit_time: float
    start_time: float | None = None
    end_time: float | None = None
    duration: float | None = None
    error: str | None = None
    progress: float | None = None


class QueueStatsResponse(BaseModel):
    """Response model for queue statistics."""
    submitted: int
    completed: int
    failed: int
    cancelled: int
    pending: int
    running: int
    workers: int


@job_router.get("/stats", response_model=QueueStatsResponse)
async def get_queue_stats() -> QueueStatsResponse:
    """Get queue statistics."""
    scheduler = get_job_scheduler()
    stats = scheduler.get_queue_stats()
    return QueueStatsResponse(**stats)


@job_router.get("/pending", response_model=List[Dict[str, Any]])
async def get_pending_jobs(limit: int = 10) -> List[Dict[str, Any]]:
    """Get list of pending jobs."""
    scheduler = get_job_scheduler()
    return scheduler.get_pending_jobs(limit)


@job_router.get("/{job_id}/status", response_model=JobStatusResponse)
async def get_job_status(job_id: str) -> JobStatusResponse:
    """Get the status of a specific job."""
    scheduler = get_job_scheduler()
    status = scheduler.get_job_status(job_id)
    
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return JobStatusResponse(**status)


@job_router.delete("/{job_id}", response_model=Dict[str, bool])
async def cancel_job(job_id: str) -> Dict[str, bool]:
    """Cancel a pending job."""
    scheduler = get_job_scheduler()
    success = scheduler.cancel_job(job_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Job not found or already running")
    
    return {"cancelled": True}