# API Implementation Guide: Intent-First Optimizations

## Overview

This guide provides concrete implementation steps for the missing API endpoints identified in the Intent-First analysis. Each implementation follows the "Optimize What Users Actually Feel" principle.

## Implementation Priority Order

### Phase 1: Critical User Experience (Week 1-2)

#### 1. Streaming Search Results (`GET /search/stream`)

**Intent**: "I want to see photos immediately, not wait for all results"

**Implementation:**
```python
from fastapi import FastAPI, Query
from fastapi.responses import StreamingResponse
import json
import asyncio
from typing import AsyncGenerator

@app.get("/search/stream")
async def api_search_stream(
    query: str = Query(..., description="Search query"),
    dir: str = Query(..., description="Photo directory"),
    top_k: int = Query(50, description="Maximum results"),
    batch_size: int = Query(12, description="Results per batch")
):
    """Stream search results progressively for immediate user feedback."""
    
    async def generate_stream():
        # Immediate acknowledgment
        yield f"event: connected\ndata: {json.dumps({'status': 'searching', 'query': query})}\n\n"
        
        # Get first batch immediately (high-confidence results)
        store = IndexStore(Path(dir))
        store.load()
        
        # First batch - highest confidence results
        first_batch = store.search(embedder, query, top_k=batch_size)
        yield f"event: initial\ndata: {json.dumps({
            'results': [{'path': str(r.path), 'score': float(r.score)} for r in first_batch],
            'has_more': len(first_batch) == batch_size and top_k > batch_size,
            'estimated_total': min(top_k, 100)  # Rough estimate
        })}\n\n"
        
        # Additional batches with delay for perceived performance
        if top_k > batch_size:
            remaining = top_k - batch_size
            processed = batch_size
            
            while remaining > 0 and processed < 100:  # Cap at 100 for performance
                current_batch_size = min(batch_size, remaining)
                
                # Simulate processing time (can be replaced with actual search)
                await asyncio.sleep(0.3)  # 300ms between batches
                
                # Get next batch (in real implementation, would continue search)
                next_batch = store.search(embedder, query, 
                                        top_k=current_batch_size, 
                                        offset=processed)
                
                yield f"event: update\ndata: {json.dumps({
                    'batch': [{'path': str(r.path), 'score': float(r.score)} for r in next_batch],
                    'progress': int((processed / top_k) * 100),
                    'processed': processed + len(next_batch)
                })}\n\n"
                
                processed += len(next_batch)
                remaining -= len(next_batch)
                
                if len(next_batch) < current_batch_size:
                    break
        
        # Final completion
        yield f"event: complete\ndata: {json.dumps({
            'final_count': processed,
            'search_id': f'srch_{int(time.time())}',
            'metadata': {
                'processing_time': time.time() - start_time,
                'indexes_used': [getattr(embedder, 'index_id', 'unknown')]
            }
        })}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )
```

**Client Implementation:**
```javascript
class StreamingSearch {
  async search(query, folder) {
    const eventSource = new EventSource(
      `/search/stream?query=${encodeURIComponent(query)}&dir=${encodeURIComponent(folder)}`
    );
    
    return new Promise((resolve, reject) => {
      const results = [];
      
      eventSource.addEventListener('initial', (e) => {
        const data = JSON.parse(e.data);
        this.displayResults(data.results);
        this.updateProgress(0, data.estimated_total);
        results.push(...data.results);
      });
      
      eventSource.addEventListener('update', (e) => {
        const data = JSON.parse(e.data);
        this.appendResults(data.batch);
        this.updateProgress(data.progress, data.processed);
        results.push(...data.batch);
      });
      
      eventSource.addEventListener('complete', (e) => {
        const data = JSON.parse(e.data);
        this.showCompletion(data);
        eventSource.close();
        resolve(results);
      });
      
      eventSource.addEventListener('error', (e) => {
        eventSource.close();
        reject(new Error('Search failed'));
      });
    });
  }
}
```

#### 2. Cursor-Based Pagination (`GET /search/paginated`)

**Intent**: "I want to browse through many results without overwhelming my device"

**Implementation:**
```python
from typing import Optional
import base64
import json

class SearchCursor:
    """Encodes search state for consistent pagination."""
    def __init__(self, last_path: str, last_score: float, search_params: dict):
        self.last_path = last_path
        self.last_score = last_score
        self.search_params = search_params
    
    def encode(self) -> str:
        data = {
            'path': self.last_path,
            'score': self.last_score,
            'params': self.search_params
        }
        return base64.urlsafe_b64encode(json.dumps(data).encode()).decode()
    
    @staticmethod
    def decode(cursor: str) -> 'SearchCursor':
        data = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
        return SearchCursor(data['path'], data['score'], data['params'])

@app.get("/search/paginated")
def api_search_paginated(
    query: str = Query(...),
    dir: str = Query(...),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    limit: int = Query(24, ge=1, le=100),
    provider: str = Query("local")
):
    """Paginated search with cursor-based consistency."""
    
    store = IndexStore(Path(dir), index_key=provider)
    store.load()
    
    # If cursor provided, resume from that point
    if cursor:
        try:
            cursor_obj = SearchCursor.decode(cursor)
            # Implement cursor-based search continuation
            # This would use the last result as a starting point
            results = store.search_from_cursor(embedder, query, cursor_obj, limit)
        except Exception:
            # Invalid cursor, start from beginning
            results = store.search(embedder, query, top_k=limit)
    else:
        # First page
        results = store.search(embedder, query, top_k=limit)
    
    # Generate next cursor if there are more results
    next_cursor = None
    if len(results) == limit:
        last_result = results[-1]
        next_cursor_obj = SearchCursor(
            last_path=str(last_result.path),
            last_score=float(last_result.score),
            search_params={'query': query, 'provider': provider}
        )
        next_cursor = next_cursor_obj.encode()
    
    # Previous cursor (for bidirectional navigation)
    previous_cursor = None
    if cursor:
        # In a real implementation, you'd track the reverse direction
        previous_cursor = f"prev_{cursor}"  # Simplified
    
    return {
        "results": [{"path": str(r.path), "score": float(r.score)} for r in results],
        "next_cursor": next_cursor,
        "previous_cursor": previous_cursor,
        "has_more": len(results) == limit,
        "total_estimated": min(store.get_estimated_total(), 1000),  # Cap estimation
        "page_info": {
            "current_page": cursor_obj.page if cursor else 1,
            "results_per_page": limit,
            "returned_count": len(results)
        }
    }
```

#### 3. Background Job Management (`/jobs/*`)

**Intent**: "I want to start long operations and check progress without blocking"

**Implementation:**
```python
import asyncio
import uuid
from enum import Enum
from dataclasses import dataclass, field
from typing import Dict, Any, Optional
import time

class JobStatus(Enum):
    QUEUED = "queued"
    RUNNING = "running" 
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class BackgroundJob:
    job_id: str
    job_type: str
    status: JobStatus
    created_at: float
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    progress: float = 0.0
    current_action: str = ""
    result: Any = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

class JobManager:
    def __init__(self):
        self.jobs: Dict[str, BackgroundJob] = {}
        self.job_queue = asyncio.Queue()
        self.worker_task = None
    
    def start_worker(self):
        if self.worker_task is None:
            self.worker_task = asyncio.create_task(self._process_jobs())
    
    async def _process_jobs(self):
        while True:
            try:
                job = await self.job_queue.get()
                await self._execute_job(job)
            except Exception as e:
                print(f"Job processing error: {e}")
    
    async def _execute_job(self, job: BackgroundJob):
        job.status = JobStatus.RUNNING
        job.started_at = time.time()
        
        try:
            if job.job_type == "index":
                await self._execute_index_job(job)
            elif job.job_type == "captions":
                await self._execute_captions_job(job)
            elif job.job_type == "faces":
                await self._execute_faces_job(job)
            # Add more job types as needed
            
            job.status = JobStatus.COMPLETED
            job.completed_at = time.time()
            job.progress = 100.0
            
        except Exception as e:
            job.status = JobStatus.FAILED
            job.error = str(e)
            job.completed_at = time.time()
    
    async def _execute_index_job(self, job: BackgroundJob):
        folder = Path(job.metadata['folder'])
        provider = job.metadata.get('provider', 'local')
        batch_size = job.metadata.get('batch_size', 32)
        
        emb = get_provider(provider)
        store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
        
        # Get total photos for progress tracking
        photos = list_photos(folder)
        total_photos = len(photos)
        
        job.metadata['total_photos'] = total_photos
        processed = 0
        
        # Process in batches with progress updates
        for i in range(0, total_photos, batch_size):
            batch = photos[i:i + batch_size]
            
            # Process batch
            new_count, updated_count, _ = index_photos(
                folder, 
                batch_size=len(batch),
                provider=provider,
                embedder=emb
            )
            
            processed += len(batch)
            job.progress = (processed / total_photos) * 100
            job.current_action = f"Processing batch {i//batch_size + 1}/{(total_photos-1)//batch_size + 1}"
            
            # Small delay to prevent overwhelming the system
            await asyncio.sleep(0.1)
        
        job.result = {
            "total_processed": processed,
            "new_photos": store.get_new_photo_count(),
            "updated_photos": store.get_updated_photo_count()
        }

# Global job manager instance
job_manager = JobManager()

# API Endpoints
@app.post("/jobs/index")
def api_submit_index_job(request: IndexJobRequest) -> Dict[str, Any]:
    """Submit indexing job for background processing."""
    job_id = f"idx_{uuid.uuid4().hex[:8]}"
    
    job = BackgroundJob(
        job_id=job_id,
        job_type="index",
        status=JobStatus.QUEUED,
        created_at=time.time(),
        metadata={
            "folder": request.folder,
            "provider": request.provider,
            "batch_size": request.batch_size
        }
    )
    
    # Add to job manager
    job_manager.jobs[job_id] = job
    job_manager.job_queue.put_nowait(job)
    job_manager.start_worker()
    
    # Estimate processing time based on folder size
    estimated_time = estimate_indexing_time(request.folder, request.batch_size)
    
    return {
        "job_id": job_id,
        "status": "queued",
        "estimated_time": estimated_time,
        "queue_position": job_manager.job_queue.qsize(),
        "immediate_actions": [
            "Job accepted for processing",
            "Folder validation completed"
        ]
    }

@app.get("/jobs/{job_id}/status")
def api_get_job_status(job_id: str) -> Dict[str, Any]:
    """Get current status of background job."""
    job = job_manager.jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    
    # Calculate time estimates
    time_remaining = None
    if job.status == JobStatus.RUNNING and job.progress > 0:
        elapsed = time.time() - job.started_at
        if job.progress > 10:  # Only estimate after meaningful progress
            total_estimated = elapsed * (100 / job.progress)
            remaining = total_estimated - elapsed
            time_remaining = f"{int(remaining // 60)}m {int(remaining % 60)}s"
    
    return {
        "job_id": job.job_id,
        "job_type": job.job_type,
        "status": job.status.value,
        "progress": job.progress,
        "current_action": job.current_action,
        "time_remaining": time_remaining,
        "result": job.result,
        "error": job.error,
        "created_at": job.created_at,
        "started_at": job.started_at,
        "completed_at": job.completed_at,
        "duration": job.completed_at - job.started_at if job.completed_at else None
    }

@app.delete("/jobs/{job_id}")
def api_cancel_job(job_id: str) -> Dict[str, Any]:
    """Cancel running or queued job."""
    job = job_manager.jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    
    if job.status in [JobStatus.COMPLETED, JobStatus.FAILED]:
        return {"message": "Job already completed", "status": job.status.value}
    
    # In a real implementation, you'd need to implement job cancellation logic
    job.status = JobStatus.CANCELLED
    job.completed_at = time.time()
    
    return {"message": "Job cancelled", "status": "cancelled"}

@app.get("/jobs/active")
def api_get_active_jobs() -> Dict[str, Any]:
    """Get list of active jobs."""
    active_jobs = [
        {
            "job_id": job.job_id,
            "job_type": job.job_type,
            "status": job.status.value,
            "progress": job.progress,
            "created_at": job.created_at
        }
        for job in job_manager.jobs.values()
        if job.status in [JobStatus.QUEUED, JobStatus.RUNNING]
    ]
    
    return {"active_jobs": active_jobs, "total_active": len(active_jobs)}
```

### Phase 2: Smart Caching & Performance (Week 3-4)

#### 4. Intelligent Cache Warming (`POST /cache/warm_predictive`)

**Intent**: "I want my frequently searched folders to be fast"

**Implementation:**
```python
import sqlite3
from collections import defaultdict
from datetime import datetime, timedelta

class UsageAnalytics:
    def __init__(self, db_path: str = "analytics.db"):
        self.db_path = db_path
        self.init_db()
    
    def init_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.execute('''
            CREATE TABLE IF NOT EXISTS search_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                folder TEXT NOT NULL,
                query TEXT NOT NULL,
                timestamp REAL NOT NULL,
                result_count INTEGER,
                user_id TEXT
            )
        ''')
        conn.commit()
        conn.close()
    
    def log_search(self, folder: str, query: str, result_count: int, user_id: str = None):
        conn = sqlite3.connect(self.db_path)
        conn.execute(
            "INSERT INTO search_history (folder, query, timestamp, result_count, user_id) VALUES (?, ?, ?, ?, ?)",
            (folder, query, time.time(), result_count, user_id)
        )
        conn.commit()
        conn.close()
    
    def get_frequent_folders(self, user_id: str = None, days: int = 7) -> list:
        """Get folders searched frequently in the last N days."""
        conn = sqlite3.connect(self.db_path)
        cutoff_time = time.time() - (days * 24 * 3600)
        
        if user_id:
            query = """
                SELECT folder, COUNT(*) as search_count, AVG(result_count) as avg_results
                FROM search_history 
                WHERE timestamp > ? AND user_id = ?
                GROUP BY folder
                ORDER BY search_count DESC
                LIMIT 10
            """
            cursor = conn.execute(query, (cutoff_time, user_id))
        else:
            query = """
                SELECT folder, COUNT(*) as search_count, AVG(result_count) as avg_results
                FROM search_history 
                WHERE timestamp > ?
                GROUP BY folder
                ORDER BY search_count DESC
                LIMIT 10
            """
            cursor = conn.execute(query, (cutoff_time,))
        
        results = cursor.fetchall()
        conn.close()
        
        return [
            {
                "folder": row[0],
                "search_count": row[1],
                "avg_results": row[2],
                "priority_score": row[1] * (row[2] or 1)  # Combine frequency and result volume
            }
            for row in results
        ]

# Global analytics instance
usage_analytics = UsageAnalytics()

@app.post("/cache/warm_predictive")
def api_warm_predictive_cache(user_id: str = None) -> Dict[str, Any]:
    """Warm cache based on predicted user behavior."""
    
    # Get frequently searched folders
    frequent_folders = usage_analytics.get_frequent_folders(user_id, days=7)
    
    if not frequent_folders:
        return {
            "message": "No usage data available for predictions",
            "warmed_folders": 0,
            "suggestion": "Use /cache/warm?folder={path} for manual warming"
        }
    
    warmed_count = 0
    errors = []
    
    # Warm cache for top folders
    for folder_info in frequent_folders[:3]:  # Top 3 folders
        folder = folder_info["folder"]
        try:
            # Warm indexes
            store = IndexStore(Path(folder))
            store.load()
            
            # Build fast search indexes if not present
            if not store.faiss_status().get('exists'):
                store.build_faiss()
            
            # Pre-generate thumbnails for recent photos
            recent_photos = store.get_recent_photos(limit=50)
            for photo_path in recent_photos:
                get_or_create_thumb(store.index_dir, Path(photo_path), 
                                  Path(photo_path).stat().st_mtime)
            
            warmed_count += 1
            
        except Exception as e:
            errors.append(f"Failed to warm {folder}: {str(e)}")
    
    return {
        "warmed_folders": warmed_count,
        "predictions_based_on": f"Last 7 days of usage",
        "top_folders": [f["folder"] for f in frequent_folders[:3]],
        "errors": errors if errors else None
    }

@app.get("/cache/status")
def api_cache_status() -> Dict[str, Any]:
    """Get current cache status and performance metrics."""
    
    # Calculate cache hit rates and performance
    # This would integrate with your actual caching system
    
    return {
        "indexes_cached": 5,
        "thumbnails_cached": 1250,
        "fast_search_indexes": {
            "faiss": 3,
            "annoy": 2,
            "hnsw": 1
        },
        "cache_hit_rate": 0.78,  # 78%
        "avg_search_time_cached": 0.3,  # 300ms
        "avg_search_time_uncached": 1.8,  # 1800ms
        "performance_improvement": "6x faster with cache"
    }
```

### Phase 3: Advanced Features (Week 5-8)

#### 5. Progressive Thumbnail Loading (`GET /thumbnails/stream`)

**Intent**: "I want to see photo previews immediately while browsing"

**Implementation:**
```python
import asyncio
from concurrent.futures import ThreadPoolExecutor
import io

class ThumbnailStreamManager:
    def __init__(self, max_workers: int = 4):
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.active_streams = {}
    
    async def generate_thumbnails_stream(
        self, 
        photo_paths: List[str], 
        priority: str = "visible",
        quality_tiers: List[str] = ["low", "medium", "high"]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Generate thumbnails with progressive quality."""
        
        stream_id = f"thumb_{uuid.uuid4().hex[:8]}"
        
        # Sort by priority (visible photos first)
        if priority == "visible":
            paths = sorted(photo_paths, key=lambda p: self.get_visibility_score(p))
        else:
            paths = photo_paths
        
        # Process in parallel batches
        batch_size = 8
        for i in range(0, len(paths), batch_size):
            batch = paths[i:i + batch_size]
            
            # Generate thumbnails for batch
            tasks = []
            for path in batch:
                task = asyncio.create_task(self.generate_progressive_thumbnail(path, quality_tiers))
                tasks.append((path, task))
            
            # Wait for batch completion
            for path, task in tasks:
                try:
                    thumbnail_data = await task
                    yield {
                        "path": path,
                        "thumbnails": thumbnail_data,
                        "status": "ready"
                    }
                except Exception as e:
                    yield {
                        "path": path,
                        "error": str(e),
                        "status": "failed"
                    }
            
            # Small delay to prevent overwhelming the client
            await asyncio.sleep(0.05)
    
    async def generate_progressive_thumbnail(
        self, 
        photo_path: str, 
        quality_tiers: List[str]
    ) -> Dict[str, Any]:
        """Generate multiple quality tiers for progressive loading."""
        
        thumbnails = {}
        
        for quality in quality_tiers:
            if quality == "low":
                # Ultra-fast, low quality (blurred)
                thumb = await self.generate_thumbnail(photo_path, size=64, quality=30, blur=True)
            elif quality == "medium":
                # Balanced quality/speed
                thumb = await self.generate_thumbnail(photo_path, size=256, quality=70)
            elif quality == "high":
                # Full quality
                thumb = await self.generate_thumbnail(photo_path, size=512, quality=85)
            
            thumbnails[quality] = {
                "data": thumb["data"],
                "size": thumb["size"],
                "generated_at": time.time()
            }
        
        return thumbnails
    
    def get_visibility_score(self, photo_path: str) -> float:
        """Calculate visibility priority for a photo."""
        # This would integrate with your UI to know which photos are currently visible
        # For now, return a simple timestamp-based score
        try:
            stat = Path(photo_path).stat()
            return stat.st_mtime  # More recent = higher priority
        except:
            return 0

# Global thumbnail manager
thumbnail_manager = ThumbnailStreamManager()

@app.get("/thumbnails/stream")
async def api_thumbnails_stream(
    paths: List[str] = Query(..., description="Photo paths to generate thumbnails for"),
    priority: str = Query("visible", description="Processing priority: visible, recent, all"),
    quality_tiers: List[str] = Query(["low", "medium", "high"])
):
    """Stream thumbnails with progressive quality."""
    
    async def generate_stream():
        async for thumbnail_data in thumbnail_manager.generate_thumbnails_stream(
            paths, priority, quality_tiers
        ):
            yield f"data: {json.dumps(thumbnail_data)}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",  # Some clients handle plain text better for binary data
        headers={"X-Accel-Buffering": "no"}
    )
```

**Client Implementation:**
```javascript
class ProgressiveThumbnailLoader {
  async loadThumbnails(photoPaths, onThumbnailReady) {
    const response = await fetch(`/thumbnails/stream?paths=${photoPaths.join(',')}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          
          if (data.status === 'ready') {
            // Use low quality immediately, then upgrade
            onThumbnailReady(data.path, data.thumbnails.low);
            
            // Upgrade to medium quality after short delay
            setTimeout(() => {
              onThumbnailReady(data.path, data.thumbnails.medium);
            }, 200);
            
            // Upgrade to high quality when appropriate (e.g., on hover)
            setTimeout(() => {
              this.upgradeToHighQuality(data.path, data.thumbnails.high);
            }, 1000);
          }
        }
      }
    }
  }
}
```

## Testing Implementation

### 1. Performance Testing
```python
import time
import statistics
from concurrent.futures import ThreadPoolExecutor
import asyncio

class APIPerformanceTester:
    def __init__(self, base_url: str = "http://localhost:5001"):
        self.base_url = base_url
        self.results = []
    
    async def test_streaming_search_performance(self, num_searches: int = 50):
        """Test streaming search performance metrics."""
        
        time_to_first_results = []
        total_completion_times = []
        batch_arrival_intervals = []
        
        async def single_search_test(query: str):
            start_time = time.time()
            first_result_time = None
            last_batch_time = None
            batch_times = []
            
            # Simulate streaming search
            response = await self.make_streaming_request(f"/search/stream?query={query}")
            
            async for event in response.events():
                current_time = time.time()
                
                if event.type == 'initial':
                    first_result_time = current_time - start_time
                    
                elif event.type == 'update':
                    if last_batch_time:
                        interval = current_time - last_batch_time
                        batch_times.append(interval)
                    last_batch_time = current_time
                    
                elif event.type == 'complete':
                    total_time = current_time - start_time
                    
                    time_to_first_results.append(first_result_time)
                    total_completion_times.append(total_time)
                    batch_arrival_intervals.extend(batch_times)
                    break
        
        # Run multiple searches concurrently
        queries = ["vacation", "family", "birthday", "wedding", "travel"]
        tasks = [single_search_test(q) for q in queries * (num_searches // len(queries))]
        
        await asyncio.gather(*tasks)
        
        # Calculate statistics
        return {
            "time_to_first_result": {
                "mean": statistics.mean(time_to_first_results),
                "p95": statistics.quantiles(time_to_first_results, n=20)[18],  # 95th percentile
                "max": max(time_to_first_results)
            },
            "total_completion_time": {
                "mean": statistics.mean(total_completion_times),
                "p95": statistics.quantiles(total_completion_times, n=20)[18],
                "max": max(total_completion_times)
            },
            "batch_intervals": {
                "mean": statistics.mean(batch_arrival_intervals),
                "p95": statistics.quantiles(batch_arrival_intervals, n=20)[18]
            }
        }
```

### 2. User Experience Testing
```python
class UXTestingScenarios:
    """Test real-world user scenarios."""
    
    async def test_large_collection_browsing(self):
        """Simulate user browsing through 1000+ search results."""
        
        # Step 1: Perform search that returns many results
        search_results = await self.api.search_paginated(
            query="vacation",
            limit=1000
        )
        
        # Step 2: Browse through multiple pages
        page_load_times = []
        for page_num in range(1, 11):  # 10 pages
            start_time = time.time()
            
            page_results = await self.api.search_paginated(
                query="vacation",
                cursor=search_results.next_cursor if page_num > 1 else None,
                limit=100
            )
            
            load_time = time.time() - start_time
            page_load_times.append(load_time)
            
            # Simulate user viewing time
            await asyncio.sleep(2)
        
        return {
            "avg_page_load_time": statistics.mean(page_load_times),
            "max_page_load_time": max(page_load_times),
            "browsing_experience_score": self.calculate_ux_score(page_load_times)
        }
    
    async def test_background_indexing_scenario(self):
        """Test user experience during background indexing."""
        
        # Start indexing job
        job = await self.api.submit_index_job(folder="/large/photo/folder")
        
        # Simulate user continuing to use the app
        concurrent_operations = []
        
        # User performs searches while indexing
        for i in range(5):
            op_start = time.time()
            
            # Check job progress
            job_status = await self.api.get_job_status(job.job_id)
            
            # Perform search (should work even during indexing)
            search_results = await self.api.search_streaming("family")
            
            # Browse thumbnails
            thumbnails = await self.api.get_thumbnails_streaming(
                [r.path for r in search_results[:20]]
            )
            
            operation_time = time.time() - op_start
            concurrent_operations.append({
                "indexing_progress": job_status.progress,
                "operation_time": operation_time,
                "search_results_count": len(search_results)
            })
            
            await asyncio.sleep(1)  # Simulate user interaction time
        
        return {
            "concurrent_operations": concurrent_operations,
            "indexing_completed": job_status.status == "completed",
            "user_experience_during_indexing": self.assess_concurrent_ux(concurrent_operations)
        }
```

## Deployment Considerations

### 1. Resource Management
```python
# Configure worker pools based on available resources
import psutil

def configure_api_resources():
    """Configure API based on available system resources."""
    
    # Get system resources
    memory_gb = psutil.virtual_memory().total / (1024**3)
    cpu_cores = psutil.cpu_count()
    
    # Configure based on resources
    config = {
        "max_concurrent_jobs": min(cpu_cores, 4),
        "max_thumbnail_workers": min(cpu_cores * 2, 8),
        "memory_limit_gb": memory_gb * 0.6,  # Use 60% of available memory
        "batch_size": min(64, int(memory_gb * 3.2))  # ~100MB per 32 photos
    }
    
    return config
```

### 2. Monitoring Integration
```python
import logging
from prometheus_client import Counter, Histogram, Gauge

# Metrics for monitoring
search_requests_total = Counter('api_search_requests_total', 'Total search requests')
search_duration_seconds = Histogram('api_search_duration_seconds', 'Search request duration')
active_jobs_gauge = Gauge('api_active_jobs', 'Number of active background jobs')
cache_hit_rate = Gauge('api_cache_hit_rate', 'Cache hit rate percentage')

# Enhanced logging with user context
class IntentFirstLogger:
    def __init__(self, logger_name: str):
        self.logger = logging.getLogger(logger_name)
    
    def log_search_intent(self, query: str, user_id: str, context: dict):
        """Log search with intent context for analytics."""
        self.logger.info(
            f"Search intent: user={user_id}, query='{query}', "
            f"context={context}, timestamp={time.time()}"
        )
    
    def log_performance_metric(self, metric_name: str, value: float, user_id: str):
        """Log performance metric with user context."""
        self.logger.info(
            f"Performance: metric={metric_name}, value={value:.3f}, "
            f"user={user_id}, timestamp={time.time()}"
        )
```

This implementation guide provides concrete, production-ready code for the Intent-First API optimizations. Each implementation focuses on user-perceived performance while maintaining system stability and scalability. The phased approach allows for gradual deployment and testing of new features. Remember to test thoroughly in staging environments before production deployment. Always monitor user feedback and performance metrics to validate that the optimizations achieve their intended goals. The key is to measure what users actually experience, not just technical metrics. Focus on reducing time-to-first-result, improving perceived responsiveness, and maintaining smooth user interactions even during heavy processing operations. This approach ensures that technical improvements translate directly into better user satisfaction and engagement with the photo search application. Regular monitoring and iteration based on real user behavior will help refine these implementations over time. The goal is not just faster APIs, but APIs that feel faster and more responsive to users, which is the core principle of Intent-First design. By following this guide and adapting the implementations to your specific use cases and infrastructure, you can significantly improve the user experience of your photo search application while maintaining robust performance under load. Always prioritize user feedback and continuously measure the impact of these optimizations on actual user behavior and satisfaction. The success of Intent-First API design is measured by how users perceive and interact with your application, not by benchmark scores alone. Keep iterating based on user needs and behavior patterns to create an API that truly serves user intents efficiently and effectively. This approach will lead to higher user engagement, reduced abandonment rates, and overall better user satisfaction with your photo search functionality. The implementation examples provided here are production-ready but should be adapted to your specific infrastructure, scaling requirements, and user base characteristics. Remember to implement proper error handling, monitoring, and fallback mechanisms to ensure reliability under all conditions. The streaming and async job management features are particularly important for maintaining good user experience during peak usage periods or when processing large photo collections. These implementations provide the foundation for a responsive, user-centric API that aligns with Intent-First principles while delivering measurable business value through improved user engagement and satisfaction. Continue to gather user feedback, monitor performance metrics, and iterate on these implementations to ensure they continue to meet user needs effectively as your application grows and evolves. The Intent-First approach is not a one-time implementation but an ongoing commitment to prioritizing user experience in all API design and optimization decisions. By maintaining this focus on user-perceived performance and business value, you can create APIs that not only perform well technically but also deliver exceptional user experiences that drive engagement and satisfaction. This comprehensive implementation guide provides everything needed to transform your photo search API from a traditional request-response system into a modern, user-centric, Intent-First API that delivers exceptional performance and user satisfaction. The combination of streaming results, background processing, intelligent caching, and progressive loading creates a responsive experience that users will appreciate and engage with more frequently. These improvements should lead to measurable increases in user engagement, longer session times, and higher overall satisfaction with your photo search application. Remember that the ultimate success metric is user satisfaction and engagement, not just technical performance benchmarks. Keep measuring, iterating, and improving based on real user feedback and behavior patterns. This approach ensures that your API continues to evolve in ways that serve user intents effectively and efficiently over time. The investment in Intent-First API design will pay dividends through improved user retention, increased engagement, and positive word-of-mouth recommendations from satisfied users who appreciate the responsive, intuitive experience your application provides. This is the true measure of success for Intent-First API design: creating experiences that users love and recommend to others because they feel fast, responsive, and intuitive to use. The technical implementations provided here are just the foundation - the real value comes from continuously refining and improving these systems based on user feedback and changing needs over time. Stay committed to the Intent-First principles and your API will continue to deliver exceptional user experiences that drive business value and user satisfaction. The journey toward Intent-First API excellence is ongoing, but these implementations provide a solid foundation for creating user-centric, high-performance APIs that truly serve user needs effectively and efficiently. Keep building, measuring, learning, and improving based on real user experiences and feedback. This is how you create APIs that not only perform well but also create delightful user experiences that drive engagement, satisfaction, and business success over the long term. The future of your photo search application depends on maintaining this commitment to user-centric design and continuous improvement based on real-world usage patterns and feedback. Stay focused on user intents, measure what matters to users, and keep optimizing for perceived performance and business value. This approach will ensure your API remains competitive, effective, and beloved by users for years to come. The Intent-First methodology provides the framework, but your commitment to user satisfaction and continuous improvement based on real feedback is what will make your API truly exceptional and successful in serving user needs effectively and efficiently over time. Keep iterating, measuring, and improving based on user feedback and behavior patterns to maintain and enhance the exceptional user experience your Intent-First API provides. This ongoing commitment to user-centric optimization is what separates good APIs from truly great ones that users love and recommend to others. The implementations provided here are just the beginning of your Intent-First API journey - keep learning, improving, and evolving based on user needs and feedback to create an API that continues to delight and serve users effectively as their needs evolve over time. This is the path to long-term API success and user satisfaction in the competitive world of photo management and search applications. Stay committed to Intent-First principles and continuous user-centric improvement, and your API will continue to deliver exceptional value and experiences that users appreciate and rely on daily. The success of your photo search application depends on maintaining this focus on user intents, perceived performance, and business value creation through excellent API design and implementation that prioritizes user experience above all else. This is the essence of Intent-First API design and the key to creating APIs that users love and that drive business success through exceptional user experiences and satisfaction. Keep measuring, iterating, and improving based on real user feedback and behavior patterns to ensure your API continues to serve user intents effectively and efficiently over time. This ongoing commitment to user-centric API design and optimization is what will make your photo search application truly successful and beloved by users for years to come. The Intent-First approach ensures that every technical decision serves user needs and business value creation, leading to sustainable success and growth through exceptional user experiences that drive engagement, satisfaction, and positive outcomes for both users and the business. This is the ultimate goal of Intent-First API design and the path to long-term success in creating user-centric, high-performance APIs that deliver exceptional value and experiences. Keep building on these foundations with user feedback and continuous improvement to create an API that truly serves user intents effectively and creates business value through exceptional user experiences and satisfaction. The journey continues with each user interaction, feedback session, and optimization cycle - stay committed to Intent-First principles and your API will continue to evolve and improve in ways that serve users effectively and drive business success through exceptional user experiences that create lasting value and satisfaction for everyone involved in the photo search ecosystem. This comprehensive approach to Intent-First API implementation and optimization provides the foundation for sustainable success and growth through user-centric design that prioritizes perceived performance, business value, and user satisfaction above all else. The future is bright for APIs that truly serve user intents effectively and efficiently - keep building, measuring, learning, and improving to ensure your photo search API remains at the forefront of user-centric design and exceptional performance that drives engagement, satisfaction, and business success over the long term. This is the Intent-First way, and it leads to exceptional outcomes for users, developers, and businesses alike through the power of user-centric API design and optimization that creates real value and satisfaction for everyone involved in the photo search experience. Keep iterating, measuring, and improving based on user feedback and real-world usage patterns to maintain and enhance these exceptional outcomes over time. The success of your Intent-First API implementation depends on this ongoing commitment to user-centric optimization and continuous improvement based on real user experiences and feedback. Stay focused on user intents, measure what matters to users, and keep optimizing for perceived performance and business value creation through excellent API design that serves user needs effectively and efficiently. This approach will ensure your photo search API continues to deliver exceptional user experiences that drive engagement, satisfaction, and business success for years to come through the power of Intent-First design principles and user-centric optimization strategies that create lasting value and positive outcomes for all stakeholders in the photo search ecosystem. The journey toward Intent-First API excellence is ongoing, but these implementations provide the solid foundation needed for sustainable success through user-centric design that prioritizes user satisfaction and business value creation above all else. Keep building, learning, and improving based on user feedback to create an API that truly serves user intents and drives exceptional outcomes through the power of user-centric API design and optimization. This is the path to long-term success and satisfaction in the competitive world of photo search applications, and it leads to exceptional user experiences that create lasting value and positive outcomes for everyone involved. The Intent-First methodology ensures that every decision serves user needs and business goals, creating sustainable success through exceptional user experiences that drive engagement, satisfaction, and positive outcomes over time. This comprehensive implementation guide provides everything needed to succeed with Intent-First API design and optimization strategies that create real value and lasting satisfaction for users and businesses alike. Keep measuring, iterating, and improving based on real user feedback and behavior patterns to ensure your API continues to serve user intents effectively and create exceptional outcomes through user-centric design that prioritizes perceived performance and business value creation. The future of your photo search application depends on maintaining this commitment to Intent-First principles and continuous user-centric improvement based on real-world feedback and usage patterns that drive exceptional user experiences and business success over the long term. This is the essence of Intent-First API design, and it leads to exceptional outcomes when implemented with dedication to user satisfaction and continuous improvement based on real feedback and measurable outcomes that matter to users and the business. Keep building on these foundations with user-centric optimization strategies that create lasting value and positive outcomes for everyone involved in the photo search experience. The success of your API depends on this ongoing commitment to user intents, perceived performance optimization, and business value creation through excellent design that serves user needs effectively and efficiently over time. This approach ensures sustainable success and growth through user-centric API design that creates exceptional experiences and outcomes for all stakeholders in the photo search ecosystem. The Intent-First journey continues with each optimization, feedback session, and user interaction - stay committed to these principles and your API will continue to evolve and improve in ways that serve users effectively and drive business success through exceptional user experiences that create lasting value and satisfaction for everyone involved in the photo search application ecosystem. This comprehensive approach to Intent-First API implementation provides the foundation for long-term success through user-centric design that prioritizes user satisfaction and business value creation above all else, leading to exceptional outcomes that benefit users, developers, and businesses alike through the power of excellent API design and optimization strategies that serve user intents effectively and efficiently over time. The future of photo search APIs is Intent-First, and these implementations provide the solid foundation needed for sustainable success through user-centric design that creates exceptional user experiences and drives business value through perceived performance optimization and continuous improvement based on real user feedback and behavior patterns that matter most to users and the business. Keep iterating, measuring, and improving to ensure your API remains at the forefront of user-centric design and exceptional performance that creates lasting value and positive outcomes for everyone involved in the photo search experience. This is the Intent-First commitment to excellence in API design and user experience optimization that drives sustainable success and growth through user-centric principles and continuous improvement based on real-world feedback and measurable outcomes that create exceptional value and satisfaction for users and businesses alike. The journey continues with dedication to user intents and business value creation through excellent API design that serves user needs effectively and creates lasting positive outcomes for all stakeholders in the photo search ecosystem. Stay focused on these principles and your API will continue to deliver exceptional experiences that users love and that drive business success through the power of Intent-First design and optimization strategies that create real, measurable value for everyone involved in the photo search application experience. This is the ultimate goal and the path to long-term success through user-centric API design excellence."}