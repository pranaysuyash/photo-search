"""
Enhanced indexing endpoints for API v1 with improved performance.
"""
from fastapi import APIRouter, Body, HTTPException, Query, Depends
from typing import Dict, Any, Optional, List
import json
import logging
from pathlib import Path

from api.schemas.v1 import IndexRequest, IndexResponse, IndexStatusResponse, SuccessResponse
from api.utils import _require, _from_body, _emb
from api.auth import require_auth
from infra.index_store import IndexStore
from infra.analytics import _write_event
from adapters.fs_scanner import list_photos
from services.optimized_indexing import optimized_index_photos, MemoryEfficientIndexStore
from usecases.index_photos import index_photos
import uuid

# Create router for enhanced indexing endpoints
enhanced_indexing_router = APIRouter(prefix="/enhanced_indexing", tags=["enhanced_indexing"])


@enhanced_indexing_router.post("/", response_model=IndexResponse)
def enhanced_index_v1(
    req: IndexRequest = Body(...),
    _auth = Depends(require_auth)
) -> IndexResponse:
    """
    Enhanced photo indexing with improved performance and memory efficiency.
    """
    # Validate and expand directory path
    dir_value = req.directory or req.dir
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
    
    # Generate a job ID
    job_id = str(uuid.uuid4())
    
    # Use enhanced indexing with optimized performance
    try:
        new_c, upd_c, total = optimized_index_photos(
            folder,
            batch_size=req.batch_size,
            embedder=emb,
            job_id=job_id,
            max_workers=req.batch_size // 2,  # Adjust workers based on batch size
            chunk_size=min(req.batch_size * 2, 128)  # Optimize chunk size
        )
        
        # Log analytics event
        try:
            store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
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
            new=new_c,
            updated=upd_c,
            total=total,
            job_id=job_id,
        )
    except Exception as e:
        logging.error(f"Enhanced indexing job {job_id} failed: {str(e)}")
        raise HTTPException(500, f"Enhanced indexing failed: {str(e)}")


@enhanced_indexing_router.post("/incremental", response_model=IndexResponse)
def incremental_index_v1(
    req: IndexRequest = Body(...),
    _auth = Depends(require_auth)
) -> IndexResponse:
    """
    Incremental indexing that only processes changed/new photos for better performance.
    """
    # Validate and expand directory path
    dir_value = req.directory or req.dir
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
    
    # Generate a job ID
    job_id = str(uuid.uuid4())
    
    # Use streaming indexing for incremental updates with memory efficiency
    try:
        store = MemoryEfficientIndexStore(folder, index_key=getattr(emb, 'index_id', None))
        
        # List current photos
        photos = list_photos(folder)
        
        # Process with streaming approach for memory efficiency
        new_c, upd_c = store.upsert_streaming(
            emb, 
            photos, 
            batch_size=req.batch_size
        )
        
        # Get total count
        store.load()
        total = len(store.state.paths) if store.state.paths else 0
        
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
            new=new_c,
            updated=upd_c,
            total=total,
            job_id=job_id,
        )
    except Exception as e:
        logging.error(f"Incremental indexing job {job_id} failed: {str(e)}")
        raise HTTPException(500, f"Incremental indexing failed: {str(e)}")


@enhanced_indexing_router.post("/parallel", response_model=IndexResponse)
def parallel_index_v1(
    req: IndexRequest = Body(...),
    workers: int = Body(4, embed=True),
    _auth = Depends(require_auth)
) -> IndexResponse:
    """
    Parallel indexing using multiple worker processes for maximum performance.
    """
    # Validate and expand directory path
    dir_value = req.directory or req.dir
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
    
    # Generate a job ID
    job_id = str(uuid.uuid4())
    
    # Use optimized indexing with custom worker count
    try:
        new_c, upd_c, total = optimized_index_photos(
            folder,
            batch_size=req.batch_size,
            embedder=emb,
            job_id=job_id,
            max_workers=workers,
            chunk_size=min(req.batch_size * 2, 128)  # Optimize chunk size
        )
        
        # Log analytics event
        try:
            store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
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
            new=new_c,
            updated=upd_c,
            total=total,
            job_id=job_id,
        )
    except Exception as e:
        logging.error(f"Parallel indexing job {job_id} failed: {str(e)}")
        raise HTTPException(500, f"Parallel indexing failed: {str(e)}")


@enhanced_indexing_router.get("/stats", response_model=Dict[str, Any])
def get_indexing_stats_v1(
    directory: str = Query(..., alias="dir"),
    _auth = Depends(require_auth)
) -> Dict[str, Any]:
    """
    Get detailed statistics about the indexing process performance.
    """
    folder = Path(directory)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    try:
        store = IndexStore(folder)
        store.load()
        
        # Calculate statistics
        total_photos = len(store.state.paths or [])
        total_embeddings = store.state.embeddings.shape[0] if store.state.embeddings is not None else 0
        embedding_dimension = store.state.embeddings.shape[1] if store.state.embeddings is not None else 0
        
        # Estimate memory usage (assuming float32 = 4 bytes per element)
        estimated_memory_mb = 0
        if store.state.embeddings is not None:
            estimated_memory_mb = (store.state.embeddings.nbytes / (1024 * 1024))
        
        # Get file sizes
        index_dir_size = 0
        if store.index_dir.exists():
            for file_path in store.index_dir.rglob('*'):
                if file_path.is_file():
                    try:
                        index_dir_size += file_path.stat().st_size
                    except Exception:
                        pass
        
        index_dir_size_mb = index_dir_size / (1024 * 1024)
        
        return {
            "ok": True,
            "stats": {
                "total_photos": total_photos,
                "total_embeddings": total_embeddings,
                "embedding_dimension": embedding_dimension,
                "estimated_memory_mb": round(estimated_memory_mb, 2),
                "index_directory_size_mb": round(index_dir_size_mb, 2),
                "average_embedding_size_kb": round((estimated_memory_mb * 1024) / max(1, total_embeddings), 2) if total_embeddings > 0 else 0
            }
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to get indexing stats: {str(e)}")


@enhanced_indexing_router.post("/benchmark", response_model=Dict[str, Any])
def benchmark_indexing_v1(
    req: IndexRequest = Body(...),
    iterations: int = Body(3, embed=True),
    _auth = Depends(require_auth)
) -> Dict[str, Any]:
    """
    Benchmark indexing performance with multiple iterations.
    """
    # Validate and expand directory path
    dir_value = req.directory or req.dir
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
    
    # Run benchmark
    import time
    results = []
    
    for i in range(iterations):
        try:
            start_time = time.time()
            
            # Clear existing index for fair benchmark
            store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
            if store.index_dir.exists():
                import shutil
                shutil.rmtree(store.index_dir)
                store.index_dir.mkdir(parents=True, exist_ok=True)
            
            # Run indexing
            new_c, upd_c, total = optimized_index_photos(
                folder,
                batch_size=req.batch_size,
                embedder=emb,
                job_id=f"benchmark_{i}",
                chunk_size=min(req.batch_size * 2, 128)
            )
            
            end_time = time.time()
            duration = end_time - start_time
            
            results.append({
                "iteration": i + 1,
                "duration_seconds": round(duration, 2),
                "photos_per_second": round(total / duration, 2) if duration > 0 else 0,
                "new_count": new_c,
                "updated_count": upd_c,
                "total_count": total
            })
            
        except Exception as e:
            results.append({
                "iteration": i + 1,
                "error": str(e)
            })
    
    # Calculate averages
    successful_runs = [r for r in results if "error" not in r]
    if successful_runs:
        avg_duration = sum(r["duration_seconds"] for r in successful_runs) / len(successful_runs)
        avg_rate = sum(r["photos_per_second"] for r in successful_runs) / len(successful_runs)
    else:
        avg_duration = 0
        avg_rate = 0
    
    return {
        "ok": True,
        "benchmark": {
            "iterations": iterations,
            "successful_runs": len(successful_runs),
            "average_duration_seconds": round(avg_duration, 2),
            "average_photos_per_second": round(avg_rate, 2),
            "results": results
        }
    }