"""
Optimized indexing service with improved performance and memory efficiency.
"""
import json
import time
import logging
import threading
import multiprocessing
from pathlib import Path
from typing import List, Tuple, Optional, Callable, Dict, Any
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import numpy as np
from PIL import Image

from domain.models import Photo
from infra.index_store import IndexStore
from adapters.fs_scanner import list_photos, safe_open_image


logger = logging.getLogger(__name__)


@dataclass
class IndexingStats:
    """Statistics for indexing operations."""
    total_photos: int = 0
    processed_photos: int = 0
    new_photos: int = 0
    updated_photos: int = 0
    failed_photos: int = 0
    processing_time: float = 0.0
    memory_usage_peak: int = 0  # in MB


@dataclass
class ProcessingChunk:
    """A chunk of photos to process."""
    photos: List[Photo]
    start_idx: int
    end_idx: int


class OptimizedIndexingService:
    """Optimized indexing service with improved performance and memory efficiency."""
    
    def __init__(self, 
                 store: IndexStore,
                 max_workers: Optional[int] = None,
                 chunk_size: int = 64,
                 memory_limit_mb: int = 1024):
        self.store = store
        self.max_workers = max_workers or max(1, (multiprocessing.cpu_count() // 2))
        self.chunk_size = chunk_size
        self.memory_limit_mb = memory_limit_mb
        self.stats = IndexingStats()
        self._stop_event = threading.Event()
        
    def index_photos_optimized(self,
                               photos: List[Photo],
                               embedder,
                               batch_size: int = 32,
                               progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None) -> Tuple[int, int]:
        """
        Optimized photo indexing with improved performance.
        
        Args:
            photos: List of photos to index
            embedder: Embedding model to use
            batch_size: Size of batches for embedding computation
            progress_callback: Callback for progress updates
            
        Returns:
            Tuple of (new_count, updated_count)
        """
        start_time = time.time()
        
        # Load existing index state
        self.store.load()
        existing_map = {p: i for i, p in enumerate(self.store.state.paths)}
        
        # Categorize photos
        new_photos, updated_photos = self._categorize_photos(photos, existing_map)
        
        # Process in optimized chunks
        new_count = 0
        updated_count = 0
        
        if progress_callback:
            progress_callback({
                'phase': 'start',
                'total_photos': len(photos),
                'new_photos': len(new_photos),
                'updated_photos': len(updated_photos)
            })
        
        # Process new photos
        if new_photos:
            new_count = self._process_new_photos(
                new_photos, embedder, batch_size, progress_callback
            )
        
        # Process updated photos
        if updated_photos:
            updated_count = self._process_updated_photos(
                updated_photos, existing_map, embedder, batch_size, progress_callback
            )
        
        # Update stats
        self.stats.processing_time = time.time() - start_time
        self.stats.total_photos = len(photos)
        self.stats.new_photos = new_count
        self.stats.updated_photos = updated_count
        self.stats.processed_photos = new_count + updated_count
        
        # Save the updated index
        self.store.save()
        
        return new_count, updated_count
    
    def _categorize_photos(self, 
                          photos: List[Photo], 
                          existing_map: Dict[str, int]) -> Tuple[List[Photo], List[Tuple[Photo, int]]]:
        """
        Categorize photos into new and updated.
        
        Args:
            photos: List of all photos to process
            existing_map: Map of existing photo paths to indices
            
        Returns:
            Tuple of (new_photos, updated_photos_with_indices)
        """
        new_photos = []
        updated_photos = []
        
        for photo in photos:
            photo_path = str(photo.path)
            if photo_path not in existing_map:
                new_photos.append(photo)
            else:
                idx = existing_map[photo_path]
                if (idx < len(self.store.state.mtimes) and 
                    photo.mtime > float(self.store.state.mtimes[idx]) + 1e-6):
                    updated_photos.append((photo, idx))
        
        return new_photos, updated_photos
    
    def _process_new_photos(self,
                           photos: List[Photo],
                           embedder,
                           batch_size: int,
                           progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None) -> int:
        """
        Process new photos with optimized parallel loading.
        
        Args:
            photos: List of new photos to process
            embedder: Embedding model to use
            batch_size: Size of batches for embedding computation
            progress_callback: Callback for progress updates
            
        Returns:
            Number of successfully processed new photos
        """
        if not photos:
            return 0
        
        processed_count = 0
        total_photos = len(photos)
        
        # Process in chunks for memory efficiency
        for i in range(0, total_photos, self.chunk_size):
            chunk = photos[i:i + self.chunk_size]
            chunk_photos = [p.path for p in chunk]
            
            if progress_callback:
                progress_callback({
                    'phase': 'process_new',
                    'chunk_start': i,
                    'chunk_size': len(chunk),
                    'total': total_photos
                })
            
            # Load images in parallel
            images, valid_indices = self._load_images_parallel(chunk_photos)
            
            if not images:
                continue
            
            # Compute embeddings
            try:
                embeddings = embedder.embed_images(
                    [chunk_photos[j] for j in valid_indices],
                    batch_size=batch_size,
                    num_workers=self.max_workers
                )
                
                # Filter valid embeddings (non-zero norm)
                valid_mask = [j for j, emb in enumerate(embeddings) if np.linalg.norm(emb) > 0]
                kept_embeddings = embeddings[valid_mask] if len(valid_mask) > 0 else np.zeros((0, embeddings.shape[1]), dtype=np.float32)
                kept_indices = [valid_indices[j] for j in valid_mask]
                kept_photos = [chunk[j] for j in kept_indices]
                
                if kept_embeddings.size > 0:
                    if (self.store.state.embeddings is None or 
                        len(self.store.state.paths) == 0):
                        # Initialize new index
                        self.store.state.embeddings = kept_embeddings.astype(np.float32)
                        self.store.state.paths = [str(p.path) for p in kept_photos]
                        self.store.state.mtimes = [p.mtime for p in kept_photos]
                    else:
                        # Append to existing index
                        self.store.state.embeddings = np.vstack([
                            self.store.state.embeddings,
                            kept_embeddings.astype(np.float32)
                        ])
                        self.store.state.paths.extend([str(p.path) for p in kept_photos])
                        self.store.state.mtimes.extend([p.mtime for p in kept_photos])
                
                processed_count += len(kept_photos)
                
            except Exception as e:
                logger.error(f"Error processing new photos chunk: {e}")
                if progress_callback:
                    progress_callback({
                        'phase': 'process_new_error',
                        'chunk_start': i,
                        'error': str(e)
                    })
                continue
        
        return processed_count
    
    def _process_updated_photos(self,
                               photo_indices: List[Tuple[Photo, int]],
                               existing_map: Dict[str, int],
                               embedder,
                               batch_size: int,
                               progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None) -> int:
        """
        Process updated photos with optimized embedding computation.
        
        Args:
            photo_indices: List of tuples (photo, index) for updated photos
            existing_map: Map of existing photo paths to indices
            embedder: Embedding model to use
            batch_size: Size of batches for embedding computation
            progress_callback: Callback for progress updates
            
        Returns:
            Number of successfully processed updated photos
        """
        if not photo_indices or self.store.state.embeddings is None:
            return 0
        
        processed_count = 0
        total_photos = len(photo_indices)
        
        # Process in chunks for memory efficiency
        for i in range(0, total_photos, self.chunk_size):
            chunk = photo_indices[i:i + self.chunk_size]
            chunk_paths = [p.path for p, _ in chunk]
            chunk_indices = [idx for _, idx in chunk]
            
            if progress_callback:
                progress_callback({
                    'phase': 'process_updated',
                    'chunk_start': i,
                    'chunk_size': len(chunk),
                    'total': total_photos
                })
            
            # Load images in parallel
            images, valid_indices = self._load_images_parallel(chunk_paths)
            
            if not images or self.store.state.embeddings is None:
                continue
            
            # Compute embeddings
            try:
                valid_paths = [chunk_paths[j] for j in valid_indices]
                embeddings = embedder.embed_images(
                    valid_paths,
                    batch_size=batch_size,
                    num_workers=self.max_workers
                )
                
                # Update embeddings in-place
                for j, (emb, valid_idx) in enumerate(zip(embeddings, valid_indices)):
                    if np.linalg.norm(emb) > 0:
                        photo_idx = chunk_indices[valid_idx]
                        self.store.state.embeddings[photo_idx] = emb.astype(np.float32)
                        # Update modification time
                        photo_path = str(chunk_paths[valid_idx])
                        self.store.state.mtimes[photo_idx] = Path(photo_path).stat().st_mtime
                        processed_count += 1
                        
            except Exception as e:
                logger.error(f"Error processing updated photos chunk: {e}")
                if progress_callback:
                    progress_callback({
                        'phase': 'process_updated_error',
                        'chunk_start': i,
                        'error': str(e)
                    })
                continue
        
        return processed_count
    
    def _load_images_parallel(self, paths: List[Path]) -> Tuple[List[Image.Image], List[int]]:
        """
        Load images in parallel with optimized thread pool.
        
        Args:
            paths: List of paths to load
            
        Returns:
            Tuple of (images, valid_indices)
        """
        images = []
        valid_indices = []
        
        def load_image_safe(i_p: Tuple[int, Path]) -> Optional[Tuple[int, Image.Image]]:
            """Safely load a single image."""
            i, path = i_p
            try:
                img = safe_open_image(path)
                if img is not None:
                    if img.mode != 'RGB':
                        img = img.convert('RGB')
                    return (i, img)
            except Exception as e:
                logger.debug(f"Failed to load image {path}: {e}")
            return None
        
        # Use thread pool for parallel image loading
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            results = executor.map(load_image_safe, enumerate(paths))
            for result in results:
                if result is not None:
                    i, img = result
                    images.append(img)
                    valid_indices.append(i)
        
        return images, valid_indices
    
    def get_indexing_stats(self) -> IndexingStats:
        """
        Get current indexing statistics.
        
        Returns:
            Current indexing statistics
        """
        return self.stats
    
    def stop_indexing(self) -> None:
        """
        Signal to stop ongoing indexing operations.
        """
        self._stop_event.set()
    
    def is_stopped(self) -> bool:
        """
        Check if indexing has been stopped.
        
        Returns:
            True if indexing has been stopped, False otherwise
        """
        return self._stop_event.is_set()


class MemoryEfficientIndexStore(IndexStore):
    """Memory-efficient index store with streaming capabilities."""
    
    def __init__(self, root: Path, index_key: Optional[str] = None, chunk_size: int = 1000):
        super().__init__(root, index_key)
        self.chunk_size = chunk_size
    
    def upsert_streaming(self, 
                        embedder, 
                        photos: List[Photo], 
                        batch_size: int = 32,
                        progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None) -> Tuple[int, int]:
        """
        Streaming upsert that processes photos in chunks to minimize memory usage.
        
        Args:
            embedder: Embedding model to use
            photos: List of photos to process
            batch_size: Size of batches for embedding computation
            progress_callback: Callback for progress updates
            
        Returns:
            Tuple of (new_count, updated_count)
        """
        # Process in streaming chunks
        new_count = 0
        updated_count = 0
        total_photos = len(photos)
        
        for i in range(0, total_photos, self.chunk_size):
            if i == 0:
                # Load initial state for first chunk
                self.load()
            
            chunk = photos[i:i + self.chunk_size]
            
            # Create optimized service for this chunk
            service = OptimizedIndexingService(
                self, 
                max_workers=self.chunk_size // 4,  # Adjust workers for chunk size
                chunk_size=min(self.chunk_size, 64),  # Smaller chunks for memory efficiency
                memory_limit_mb=512  # Conservative memory limit
            )
            
            # Process chunk
            chunk_new, chunk_updated = service.index_photos_optimized(
                chunk, embedder, batch_size, progress_callback
            )
            
            new_count += chunk_new
            updated_count += chunk_updated
            
            # Save intermediate results to avoid memory buildup
            if (i + self.chunk_size) < total_photos:
                self.save()
        
        # Save final results
        self.save()
        
        return new_count, updated_count


def optimized_index_photos(folder: Path,
                           batch_size: int = 32,
                           provider: str = "local",
                           hf_token: Optional[str] = None,
                           openai_api_key: Optional[str] = None,
                           embedder=None,
                           job_id: Optional[str] = None,
                           max_workers: Optional[int] = None,
                           chunk_size: int = 64) -> Tuple[int, int, int]:
    """
    Optimized photo indexing with improved performance and memory efficiency.
    
    Args:
        folder: Folder to index
        batch_size: Size of batches for embedding computation
        provider: Provider to use for embeddings
        hf_token: Hugging Face token
        openai_api_key: OpenAI API key
        embedder: Pre-configured embedder
        job_id: Job identifier
        max_workers: Maximum number of worker threads/processes
        chunk_size: Size of chunks for memory-efficient processing
        
    Returns:
        Tuple of (new_count, updated_count, total_count)
    """
    from adapters.provider_factory import get_provider
    
    # Get embedder if not provided
    if embedder is None:
        embedder = get_provider(provider, hf_token=hf_token, openai_api_key=openai_api_key)
    
    # Create memory-efficient index store
    store = MemoryEfficientIndexStore(folder, index_key=getattr(embedder, 'index_id', None))
    
    # List photos
    photos = list_photos(folder)
    
    # Process with optimized service
    service = OptimizedIndexingService(
        store, 
        max_workers=max_workers,
        chunk_size=chunk_size
    )
    
    try:
        new_count, updated_count = service.index_photos_optimized(
            photos, embedder, batch_size
        )
        
        # Get total count
        store.load()
        total_count = len(store.state.paths) if store.state.paths else 0
        
        return new_count, updated_count, total_count
        
    except Exception as e:
        logger.error(f"Optimized indexing failed: {e}")
        raise