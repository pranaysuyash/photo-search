# adapters/jobs_bridge.py
import requests
import time
import threading
from typing import Dict, Optional, Any

class JobsBridge:
    # Class-level registry for job cancellation events
    _cancel_events: Dict[str, threading.Event] = {}
    _registry_lock = threading.Lock()

    def __init__(self, base_url: str = "http://localhost:8000", dir_path: str = "", job_id: str = "", token: Optional[str] = None):
        self.base = base_url.rstrip("/")
        self.dir = dir_path
        self.job_id = job_id
        self.headers = {"Content-Type": "application/json"}
        if token:
            self.headers["Authorization"] = f"Bearer {token}"
        self._total: Optional[int] = None

        # Register cancellation event for this job
        if job_id:
            with self._registry_lock:
                self._cancel_events[job_id] = threading.Event()

    def __del__(self):
        # Clean up cancellation event when bridge is destroyed
        if hasattr(self, 'job_id') and self.job_id:
            with self._registry_lock:
                self._cancel_events.pop(self.job_id, None)

    @classmethod
    def cancel(cls, job_id: str) -> bool:
        """Signal cancellation for a job by setting its Threading.Event.

        Returns True if the job was found and cancelled, False otherwise.
        """
        with cls._registry_lock:
            event = cls._cancel_events.get(job_id)
            if event:
                event.set()
                return True
        return False

    @classmethod
    def get_cancel_event(cls, job_id: str) -> Optional[threading.Event]:
        """Get the cancellation event for a job, or None if not found."""
        with cls._registry_lock:
            return cls._cancel_events.get(job_id)

    @classmethod
    def cleanup_job(cls, job_id: str):
        """Clean up the cancellation event for a completed/cancelled job."""
        with cls._registry_lock:
            cls._cancel_events.pop(job_id, None)

    def emit(self, type_: str, **payload):
        data = {"type": type_, "dir": self.dir, "job_id": self.job_id, **payload}
        try:
            requests.post(f"{self.base}/analytics/event", json=data, headers=self.headers, timeout=2.0)
        except Exception:
            pass  # best-effort, don't break jobs

    def progress_cb(self, e: Dict[str, Any]):
        phase = e.get("phase")
        if phase == "load_start":
            self.emit("embed_start", total=e.get("total", 0))
        elif phase == "load":
            self.emit("embed_load", done=e.get("done", 0), total=e.get("total", 0))
        elif phase == "encode_start":
            self.emit("embed_encode", batch_size=e.get("batch_size"), workers=e.get("workers"))
        elif phase == "encode_done":
            self.emit("embed_encode_done", valid=e.get("valid", 0))
        elif phase == "index_add_chunk":
            self.emit("index_add_chunk", added=e.get("added", 0), chunk=e.get("chunk"))
        elif phase == "index_done":
            self.emit("index_done", added=e.get("added", 0))

    def started(self, title: str, description: Optional[str] = None, total: Optional[int] = None):
        # cache total for future generic progress
        self._total = total
        # Emit events expected by App.tsx mapping (compat layer)
        if total is not None:
            self.emit("embed_start", total=total)
        # Also emit a generic job status for other consumers
        self.emit("job_status", status="running", title=title, description=description, total=total)
        # Legacy/custom event for other parts of the app (non-breaking)
        self.emit("job_started", title=title, description=description, total=total, job_type="index")

    def progress(self, progress: int, current_item: Optional[str] = None, speed: Optional[str] = None, estimated_time_remaining: Optional[int] = None):
        total = self._total
        if total is not None:
            # Emit UI-friendly incremental progress
            self.emit("embed_load", done=progress, total=total)
        # Emit detailed progress for any consumers that want richer telemetry
        self.emit("job_progress", progress=progress, current_item=current_item, speed=speed, estimated_time_remaining=estimated_time_remaining)

    def completed(self, **extra):
        # Final status for App.tsx mapping
        self.emit("job_status", status="completed", **extra)
        # Legacy/custom
        self.emit("job_completed", **extra)
        # Clean up cancellation event
        self.cleanup_job(self.job_id)

    def failed(self, error: str):
        # Final status for App.tsx mapping
        self.emit("job_status", status="failed", error=error)
        # Legacy/custom
        self.emit("job_failed", error=error)
        # Clean up cancellation event
        self.cleanup_job(self.job_id)

    def cancelled(self):
        # Final status for App.tsx mapping
        self.emit("job_status", status="cancelled")
        # Legacy/custom
        self.emit("job_cancelled")
        # Clean up cancellation event
        self.cleanup_job(self.job_id)