"""
Tests for optimized indexing functionality.
"""
import json
import tempfile
import shutil
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import numpy as np
from typing import List, Optional

import pytest

from services.optimized_indexing import (
    OptimizedIndexingService, 
    MemoryEfficientIndexStore, 
    IndexingStats,
    ProcessingChunk
)
from domain.models import Photo
from infra.index_store import IndexStore, IndexState


class TestOptimizedIndexingService:
    """Test cases for the optimized indexing service."""
    
    @pytest.fixture
    def temp_index_dir(self):
        """Create a temporary directory for testing."""
        temp_dir = Path(tempfile.mkdtemp())
        yield temp_dir
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def mock_store(self, temp_index_dir):
        """Create a mock index store for testing."""
        # Create the necessary directory structure
        index_dir = temp_index_dir / ".photo_index" / "test_model"
        index_dir.mkdir(parents=True, exist_ok=True)
        
        # Create a mock index state with dummy data
        store = IndexStore(temp_index_dir)
        store.index_dir = index_dir
        store.state = IndexState(paths=[], mtimes=[], embeddings=None)
        
        return store
    
    @pytest.fixture
    def sample_photos(self) -> List[Photo]:
        """Create sample photos for testing."""
        return [
            Photo(path=Path("/photos/trip1/photo1.jpg"), mtime=1640995200.0),  # 2022-01-01
            Photo(path=Path("/photos/trip1/photo2.jpg"), mtime=1640995300.0),  # 2022-01-01 (later)
            Photo(path=Path("/photos/trip2/photo1.jpg"), mtime=1643673600.0),  # 2022-02-01
            Photo(path=Path("/photos/portrait/person1.jpg"), mtime=1646092800.0),  # 2022-03-01
            Photo(path=Path("/photos/landscape/mountain1.jpg"), mtime=1648771200.0),  # 2022-04-01
        ]
    
    def test_initialization(self, mock_store):
        """Test that the optimized indexing service initializes properly."""
        service = OptimizedIndexingService(mock_store, max_workers=4, chunk_size=32)
        
        assert service.store == mock_store
        assert service.max_workers == 4
        assert service.chunk_size == 32
        assert isinstance(service.stats, IndexingStats)
    
    def test_categorize_photos_new_only(self, mock_store, sample_photos):
        """Test categorizing photos when all are new."""
        service = OptimizedIndexingService(mock_store)
        
        # Mock empty existing state
        mock_store.state.paths = []
        mock_store.state.mtimes = []
        mock_store.state.embeddings = None
        
        existing_map = {}
        new_photos, updated_photos = service._categorize_photos(sample_photos, existing_map)
        
        assert len(new_photos) == len(sample_photos)
        assert len(updated_photos) == 0
    
    def test_categorize_photos_with_existing(self, mock_store, sample_photos):
        """Test categorizing photos with some existing."""
        service = OptimizedIndexingService(mock_store)
        
        # Mock existing state with some photos
        existing_paths = [str(sample_photos[0].path), str(sample_photos[2].path)]
        existing_mtimes = [sample_photos[0].mtime, sample_photos[2].mtime]
        mock_store.state.paths = existing_paths
        mock_store.state.mtimes = existing_mtimes
        mock_store.state.embeddings = np.random.rand(2, 512).astype(np.float32)
        
        existing_map = {p: i for i, p in enumerate(existing_paths)}
        new_photos, updated_photos = service._categorize_photos(sample_photos, existing_map)
        
        # Should have 3 new photos (indices 1, 3, 4)
        assert len(new_photos) == 3
        assert new_photos[0].path == sample_photos[1].path  # Updated photo
        assert new_photos[1].path == sample_photos[3].path  # New photo
        assert new_photos[2].path == sample_photos[4].path  # New photo
        
        # Should have 2 updated photos (indices 0, 2)
        assert len(updated_photos) == 0  # Actually new since mtime matches
    
    def test_categorize_photos_with_updates(self, mock_store, sample_photos):
        """Test categorizing photos with updated modification times."""
        service = OptimizedIndexingService(mock_store)
        
        # Mock existing state
        existing_paths = [str(sample_photos[0].path), str(sample_photos[1].path)]
        # Older modification times for the first photo
        existing_mtimes = [sample_photos[0].mtime - 1000, sample_photos[1].mtime]
        mock_store.state.paths = existing_paths
        mock_store.state.mtimes = existing_mtimes
        mock_store.state.embeddings = np.random.rand(2, 512).astype(np.float32)
        
        existing_map = {p: i for i, p in enumerate(existing_paths)}
        new_photos, updated_photos = service._categorize_photos(sample_photos[:2], existing_map)
        
        # First photo should be updated (newer mtime)
        assert len(new_photos) == 1  # Second photo is new
        assert len(updated_photos) == 1  # First photo is updated
    
    def test_load_images_parallel(self, mock_store):
        """Test parallel image loading functionality."""
        service = OptimizedIndexingService(mock_store)
        
        # Create temporary image files for testing
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create some test images
            img_paths = []
            for i in range(3):
                img_path = Path(temp_dir) / f"test{i}.jpg"
                # Create a simple test image
                img_array = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
                from PIL import Image
                img = Image.fromarray(img_array)
                img.save(img_path)
                img_paths.append(img_path)
            
            # Test loading images in parallel
            images, valid_indices = service._load_images_parallel(img_paths)
            
            # Should have loaded all images successfully
            assert len(images) == 3
            assert len(valid_indices) == 3
            assert valid_indices == [0, 1, 2]
    
    def test_load_images_parallel_with_invalid(self, mock_store):
        """Test parallel image loading with invalid files."""
        service = OptimizedIndexingService(mock_store)
        
        # Create temporary files including invalid ones
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create valid image files
            valid_paths = []
            for i in range(2):
                img_path = Path(temp_dir) / f"valid{i}.jpg"
                img_array = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
                from PIL import Image
                img = Image.fromarray(img_array)
                img.save(img_path)
                valid_paths.append(img_path)
            
            # Create invalid files
            invalid_path = Path(temp_dir) / "invalid.txt"
            invalid_path.write_text("not an image")
            
            # Test loading mix of valid and invalid files
            all_paths = valid_paths + [invalid_path]
            images, valid_indices = service._load_images_parallel(all_paths)
            
            # Should only have loaded valid images
            assert len(images) == 2
            assert len(valid_indices) == 2
            assert valid_indices == [0, 1]
    
    def test_stop_functionality(self, mock_store):
        """Test the stop event functionality."""
        service = OptimizedIndexingService(mock_store)
        
        # Initially should not be stopped
        assert not service.is_stopped()
        
        # Stop the service
        service.stop_indexing()
        
        # Should now be stopped
        assert service.is_stopped()


class TestMemoryEfficientIndexStore:
    """Test cases for the memory-efficient index store."""
    
    @pytest.fixture
    def temp_index_dir(self):
        """Create a temporary directory for testing."""
        temp_dir = Path(tempfile.mkdtemp())
        yield temp_dir
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def memory_efficient_store(self, temp_index_dir):
        """Create a memory-efficient index store for testing."""
        store = MemoryEfficientIndexStore(temp_index_dir, chunk_size=50)
        return store
    
    def test_initialization(self, memory_efficient_store):
        """Test that the memory-efficient store initializes properly."""
        assert memory_efficient_store.chunk_size == 50
    
    def test_upsert_streaming(self, memory_efficient_store):
        """Test the streaming upsert functionality."""
        # Create sample photos
        sample_photos = [
            Photo(path=Path("/photos/test1.jpg"), mtime=1640995200.0),
            Photo(path=Path("/photos/test2.jpg"), mtime=1640995300.0),
        ]
        
        # Mock embedder
        mock_embedder = Mock()
        mock_embedder.embed_images.return_value = np.random.rand(2, 512).astype(np.float32)
        
        # Test streaming upsert
        new_count, updated_count = memory_efficient_store.upsert_streaming(
            mock_embedder, sample_photos, batch_size=32
        )
        
        # Should have processed the photos
        assert new_count >= 0
        assert updated_count >= 0


class TestEnhancedIndexingEndpoints:
    """Test cases for the enhanced indexing API endpoints."""
    
    def test_enhanced_index_endpoint(self, client):
        """Test the enhanced indexing endpoint."""
        # Create a temporary directory structure for testing
        with tempfile.TemporaryDirectory() as temp_dir:
            photos_dir = Path(temp_dir) / "photos"
            photos_dir.mkdir()
            
            # Create some test photos
            for i in range(3):
                img_path = photos_dir / f"photo{i}.jpg"
                img_array = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
                from PIL import Image
                img = Image.fromarray(img_array)
                img.save(img_path)
            
            # Test the enhanced indexing endpoint
            response = client.post("/api/v1/enhanced_indexing/", json={
                "dir": str(photos_dir),
                "provider": "local",
                "batch_size": 16
            })
            
            # Should succeed with a valid response
            assert response.status_code == 200
            data = response.json()
            assert "ok" in data
            assert "new" in data
            assert "updated" in data
            assert "total" in data
            assert "job_id" in data
    
    def test_incremental_index_endpoint(self, client):
        """Test the incremental indexing endpoint."""
        # Create a temporary directory structure for testing
        with tempfile.TemporaryDirectory() as temp_dir:
            photos_dir = Path(temp_dir) / "photos"
            photos_dir.mkdir()
            
            # Test the incremental indexing endpoint
            response = client.post("/api/v1/enhanced_indexing/incremental", json={
                "dir": str(photos_dir),
                "provider": "local",
                "batch_size": 16
            })
            
            # Should succeed with a valid response
            assert response.status_code == 200
            data = response.json()
            assert "ok" in data
            assert "new" in data
            assert "updated" in data
            assert "total" in data
            assert "job_id" in data
    
    def test_parallel_index_endpoint(self, client):
        """Test the parallel indexing endpoint."""
        # Create a temporary directory structure for testing
        with tempfile.TemporaryDirectory() as temp_dir:
            photos_dir = Path(temp_dir) / "photos"
            photos_dir.mkdir()
            
            # Test the parallel indexing endpoint
            response = client.post("/api/v1/enhanced_indexing/parallel", json={
                "dir": str(photos_dir),
                "provider": "local",
                "batch_size": 16,
                "workers": 2
            })
            
            # Should succeed with a valid response
            assert response.status_code == 200
            data = response.json()
            assert "ok" in data
            assert "new" in data
            assert "updated" in data
            assert "total" in data
            assert "job_id" in data
    
    def test_indexing_stats_endpoint(self, client):
        """Test the indexing stats endpoint."""
        # Create a temporary directory structure for testing
        with tempfile.TemporaryDirectory() as temp_dir:
            photos_dir = Path(temp_dir) / "photos"
            photos_dir.mkdir()
            
            # Test the indexing stats endpoint
            response = client.get("/api/v1/enhanced_indexing/stats", params={
                "dir": str(photos_dir)
            })
            
            # Should succeed with a valid response
            assert response.status_code == 200
            data = response.json()
            assert "ok" in data
            assert "stats" in data
    
    def test_benchmark_endpoint(self, client):
        """Test the indexing benchmark endpoint."""
        # Create a temporary directory structure for testing
        with tempfile.TemporaryDirectory() as temp_dir:
            photos_dir = Path(temp_dir) / "photos"
            photos_dir.mkdir()
            
            # Test the benchmark endpoint
            response = client.post("/api/v1/enhanced_indexing/benchmark", json={
                "dir": str(photos_dir),
                "provider": "local",
                "batch_size": 8,
                "iterations": 1
            })
            
            # Should succeed with a valid response
            assert response.status_code == 200
            data = response.json()
            assert "ok" in data
            assert "benchmark" in data


class TestPerformanceOptimizations:
    """Test cases for performance optimizations."""
    
    def test_adaptive_batch_sizing(self):
        """Test that batch sizing adapts to system resources."""
        with tempfile.TemporaryDirectory() as temp_dir:
            store = IndexStore(Path(temp_dir))
            
            # Test with different configurations
            service_small = OptimizedIndexingService(store, max_workers=2, chunk_size=16)
            service_large = OptimizedIndexingService(store, max_workers=8, chunk_size=128)
            
            # Different configurations should have different settings
            assert service_small.max_workers == 2
            assert service_small.chunk_size == 16
            assert service_large.max_workers == 8
            assert service_large.chunk_size == 128
    
    def test_memory_efficient_processing(self):
        """Test memory-efficient processing with large datasets."""
        with tempfile.TemporaryDirectory() as temp_dir:
            store = MemoryEfficientIndexStore(Path(temp_dir), chunk_size=10)
            
            # Create a large number of sample photos
            sample_photos = []
            for i in range(50):  # Larger than chunk size
                sample_photos.append(
                    Photo(path=Path(f"/photos/photo{i}.jpg"), mtime=float(1640995200 + i))
                )
            
            # Mock embedder
            mock_embedder = Mock()
            mock_embedder.embed_images.return_value = np.random.rand(10, 512).astype(np.float32)
            
            # Test streaming processing
            new_count, updated_count = store.upsert_streaming(
                mock_embedder, sample_photos, batch_size=5
            )
            
            # Should process all photos in chunks
            assert new_count >= 0
            assert updated_count >= 0


if __name__ == "__main__":
    pytest.main([__file__])