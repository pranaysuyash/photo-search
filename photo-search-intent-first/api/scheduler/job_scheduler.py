"""
Lightweight job scheduler for the Photo Search backend.
Provides simple queuing and prioritization for background tasks.
"""
import time
import heapq
import threading
from typing import Callable, Any, Optional, Dict
from dataclasses import dataclass, field
from enum import IntEnum
import logging

logger = logging.getLogger(__name__)


class JobPriority(IntEnum):
    """Job priority levels. Lower values = higher priority."""
    CRITICAL = 0     # System critical tasks
    HIGH = 1         # User initiated high priority tasks
    NORMAL = 2       # Regular background tasks
    LOW = 3          # Maintenance/background tasks


@dataclass
class Job:
    """Represents a scheduled job."""
    id: str
    name: str
    func: Callable
    args: tuple = field(default_factory=tuple)
    kwargs: dict = field(default_factory=dict)
    priority: JobPriority = JobPriority.NORMAL
    submit_time: float = field(default_factory=time.time)
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    estimated_duration: float = 1.0  # Estimated duration in seconds
    result: Any = None
    error: Optional[Exception] = None
    status: str = "pending"  # pending, running, completed, failed
    
    def __lt__(self, other):
        """For heap ordering: priority first, then submit time."""
        if self.priority != other.priority:
            return self.priority < other.priority
        return self.submit_time < other.submit_time


class LightweightJobScheduler:
    """Simple job scheduler with priority queue and basic resource management."""
    
    def __init__(self, max_workers: int = 4, max_queue_size: int = 1000):
        self.max_workers = max_workers
        self.max_queue_size = max_queue_size
        self.job_queue: list = []  # Heap-based priority queue
        self.running_jobs: Dict[str, Job] = {}
        self.completed_jobs: Dict[str, Job] = {}
        self.worker_threads = []
        self.shutdown_event = threading.Event()
        self.queue_lock = threading.Lock()
        self.stats = {
            'submitted': 0,
            'completed': 0,
            'failed': 0,
            'cancelled': 0
        }
        self.stats_lock = threading.Lock()
        
        # Start worker threads
        self._start_workers()
    
    def _start_workers(self):
        """Start worker threads."""
        for i in range(self.max_workers):
            worker = threading.Thread(
                target=self._worker_loop, 
                name=f"JobWorker-{i}",
                daemon=True
            )
            worker.start()
            self.worker_threads.append(worker)
    
    def _worker_loop(self):
        """Main loop for worker threads."""
        while not self.shutdown_event.is_set():
            job = None
            try:
                # Get next job from queue
                with self.queue_lock:
                    if self.job_queue:
                        job = heapq.heappop(self.job_queue)
                    else:
                        # No jobs available, sleep briefly
                        time.sleep(0.1)
                        continue
                
                if job and not self.shutdown_event.is_set():
                    # Execute job
                    self._execute_job(job)
                    
            except Exception as e:
                logger.error(f"Worker error: {e}")
                if job:
                    self._mark_job_failed(job, e)
                time.sleep(0.1)  # Brief pause on error
    
    def _execute_job(self, job: Job):
        """Execute a job."""
        try:
            # Mark job as running
            job.start_time = time.time()
            job.status = "running"
            
            with self.queue_lock:
                self.running_jobs[job.id] = job
            
            logger.info(f"Starting job {job.id}: {job.name}")
            
            # Execute the job function
            job.result = job.func(*job.args, **job.kwargs)
            
            # Mark job as completed
            job.end_time = time.time()
            job.status = "completed"
            
            with self.queue_lock:
                self.running_jobs.pop(job.id, None)
                self.completed_jobs[job.id] = job
            
            self._inc_stat('completed')
            logger.info(f"Completed job {job.id}: {job.name} in {job.end_time - job.start_time:.2f}s")
            
        except Exception as e:
            logger.error(f"Job {job.id} failed: {e}")
            self._mark_job_failed(job, e)
    
    def _mark_job_failed(self, job: Job, error: Exception):
        """Mark a job as failed."""
        job.end_time = time.time()
        job.status = "failed"
        job.error = error
        
        with self.queue_lock:
            self.running_jobs.pop(job.id, None)
            self.completed_jobs[job.id] = job
        
        self._inc_stat('failed')
    
    def submit_job(self, job: Job) -> str:
        """Submit a job to the scheduler."""
        with self.stats_lock:
            if self.stats['submitted'] >= self.max_queue_size:
                raise RuntimeError("Job queue is full")
            self.stats['submitted'] += 1
        
        # Add to queue
        with self.queue_lock:
            heapq.heappush(self.job_queue, job)
        
        logger.info(f"Submitted job {job.id}: {job.name} with priority {job.priority.name}")
        return job.id
    
    def submit_function(self, func: Callable, *args, name: Optional[str] = None, 
                       priority: JobPriority = JobPriority.NORMAL, 
                       estimated_duration: float = 1.0, **kwargs) -> str:
        """Submit a function to be executed as a job."""
        import uuid
        job_id = str(uuid.uuid4())
        job_name = name or func.__name__
        
        job = Job(
            id=job_id,
            name=job_name,
            func=func,
            args=args,
            kwargs=kwargs,
            priority=priority,
            estimated_duration=estimated_duration
        )
        
        return self.submit_job(job)
    
    def cancel_job(self, job_id: str) -> bool:
        """Cancel a pending job."""
        with self.queue_lock:
            # Try to remove from queue
            for i, job in enumerate(self.job_queue):
                if job.id == job_id:
                    self.job_queue.pop(i)
                    heapq.heapify(self.job_queue)  # Restore heap property
                    
                    # Mark as cancelled
                    job.status = "cancelled"
                    self.completed_jobs[job.id] = job
                    self._inc_stat('cancelled')
                    return True
            return False
    
    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a job."""
        with self.queue_lock:
            # Check running jobs
            if job_id in self.running_jobs:
                job = self.running_jobs[job_id]
                return {
                    'id': job.id,
                    'name': job.name,
                    'status': job.status,
                    'priority': job.priority.name,
                    'submit_time': job.submit_time,
                    'start_time': job.start_time,
                    'progress': self._estimate_progress(job)
                }
            
            # Check completed jobs
            if job_id in self.completed_jobs:
                job = self.completed_jobs[job_id]
                return {
                    'id': job.id,
                    'name': job.name,
                    'status': job.status,
                    'priority': job.priority.name,
                    'submit_time': job.submit_time,
                    'start_time': job.start_time,
                    'end_time': job.end_time,
                    'duration': (job.end_time - job.start_time) if job.end_time and job.start_time else None,
                    'error': str(job.error) if job.error else None
                }
            
            # Check pending jobs
            for job in self.job_queue:
                if job.id == job_id:
                    return {
                        'id': job.id,
                        'name': job.name,
                        'status': job.status,
                        'priority': job.priority.name,
                        'submit_time': job.submit_time
                    }
        
        return None
    
    def _estimate_progress(self, job: Job) -> float:
        """Estimate job progress (0.0 to 1.0)."""
        if job.status == "completed":
            return 1.0
        if job.status == "running" and job.start_time:
            elapsed = time.time() - job.start_time
            # Simple estimation based on elapsed vs estimated duration
            return min(0.95, elapsed / job.estimated_duration)
        return 0.0
    
    def get_queue_stats(self) -> Dict[str, Any]:
        """Get statistics about the job queue."""
        with self.queue_lock:
            pending_count = len(self.job_queue)
            running_count = len(self.running_jobs)
            completed_count = len(self.completed_jobs)
        
        with self.stats_lock:
            stats_copy = self.stats.copy()
        
        return {
            **stats_copy,
            'pending': pending_count,
            'running': running_count,
            'completed': completed_count,
            'workers': self.max_workers
        }
    
    def get_pending_jobs(self, limit: int = 10) -> list:
        """Get list of pending jobs."""
        with self.queue_lock:
            jobs = sorted(self.job_queue, key=lambda j: (j.priority, j.submit_time))
            return [{
                'id': job.id,
                'name': job.name,
                'priority': job.priority.name,
                'submit_time': job.submit_time,
                'estimated_duration': job.estimated_duration
            } for job in jobs[:limit]]
    
    def cleanup_completed_jobs(self, max_age_seconds: float = 3600) -> int:
        """Remove completed jobs older than max_age_seconds."""
        cutoff_time = time.time() - max_age_seconds
        removed_count = 0
        
        with self.queue_lock:
            # Create list of jobs to remove
            to_remove = [
                job_id for job_id, job in self.completed_jobs.items()
                if job.end_time and job.end_time < cutoff_time
            ]
            
            # Remove them
            for job_id in to_remove:
                self.completed_jobs.pop(job_id, None)
                removed_count += 1
        
        return removed_count
    
    def _inc_stat(self, key: str):
        """Thread-safe increment of statistics."""
        with self.stats_lock:
            self.stats[key] += 1
    
    def shutdown(self, wait: bool = True):
        """Shutdown the scheduler."""
        logger.info("Shutting down job scheduler")
        self.shutdown_event.set()
        
        if wait:
            # Wait for worker threads to finish
            for worker in self.worker_threads:
                worker.join(timeout=5.0)  # 5 second timeout per worker


# Global instance
job_scheduler = LightweightJobScheduler()


def get_job_scheduler() -> LightweightJobScheduler:
    """Get the global job scheduler instance."""
    return job_scheduler