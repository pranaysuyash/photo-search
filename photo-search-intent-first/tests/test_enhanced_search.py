"""
Tests for enhanced search functionality.
"""
import json
import tempfile
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from typing import Dict, Any

import pytest
import numpy as np

from services.enhanced_search import EnhancedSearchService
from infra.index_store import IndexStore, SearchResult
from domain.models import Photo


class TestEnhancedSearchService:
    """Test cases for the enhanced search service."""
    
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
        
        # Mock some photo paths and metadata
        store.state.paths = [
            "/photos/trip1/photo1.jpg",
            "/photos/trip1/photo2.jpg", 
            "/photos/trip2/photo1.jpg",
            "/photos/portrait/person1.jpg",
            "/photos/portrait/person2.jpg",
            "/photos/landscape/mountain1.jpg",
            "/photos/landscape/mountain2.jpg"
        ]
        
        # Mock modification times (for temporal search)
        now = datetime.now()
        store.state.mtimes = [
            (now - timedelta(hours=1)).timestamp(),  # Trip 1 photo 1 (1 hour ago)
            (now - timedelta(hours=0.5)).timestamp(),  # Trip 1 photo 2 (30 minutes ago)
            (now - timedelta(days=2)).timestamp(),  # Trip 2 photo 1 (2 days ago)
            (now - timedelta(hours=5)).timestamp(),  # Portrait 1 (5 hours ago)
            (now - timedelta(hours=4.5)).timestamp(),  # Portrait 2 (4.5 hours ago)
            (now - timedelta(hours=3)).timestamp(),  # Landscape 1 (3 hours ago)
            (now - timedelta(hours=2.5)).timestamp()   # Landscape 2 (2.5 hours ago)
        ]
        
        # Mock embeddings for semantic search
        store.state.embeddings = np.random.rand(7, 512).astype(np.float32)
        
        return store
    
    @pytest.fixture
    def enhanced_search_service(self, mock_store):
        """Create an enhanced search service instance."""
        service = EnhancedSearchService(mock_store)
        return service
    
    def test_temporal_search_with_query_time(self, enhanced_search_service):
        """Test temporal search with a specific query time."""
        # Use the timestamp of the first photo as our query time
        query_time = enhanced_search_service.store.state.mtimes[0]
        
        # Search for photos within 1 hour of this time
        results = enhanced_search_service.temporal_search(
            query_time=query_time,
            time_window_hours=1.0
        )
        
        # Should find at least the first photo and potentially others nearby
        assert len(results) >= 1
        assert any(str(r.path) == "/photos/trip1/photo1.jpg" for r in results)
    
    def test_temporal_search_with_season_filter(self, enhanced_search_service):
        """Test temporal search with seasonal filtering."""
        # Mock metadata to test seasonal filtering
        enhanced_search_service.meta_data = {
            "paths": enhanced_search_service.store.state.paths,
            "timestamp": [
                "2023:06:15 10:30:00",  # Summer
                "2023:06:15 11:00:00",  # Summer
                "2023:12:20 14:00:00",  # Winter
                "2023:03:10 09:00:00",  # Spring
                "2023:03:10 09:30:00",  # Spring
                "2023:09:25 16:00:00",  # Fall
                "2023:09:25 16:30:00"   # Fall
            ]
        }
        
        # Search for summer photos
        results = enhanced_search_service.temporal_search(season="summer")
        
        # Should find photos from June
        assert len(results) >= 2
        assert any("/photos/trip1/photo1.jpg" in str(r.path) for r in results)
        assert any("/photos/trip1/photo2.jpg" in str(r.path) for r in results)
    
    def test_temporal_search_with_time_of_day_filter(self, enhanced_search_service):
        """Test temporal search with time of day filtering."""
        # Mock metadata with specific times
        enhanced_search_service.meta_data = {
            "paths": enhanced_search_service.store.state.paths,
            "timestamp": [
                "2023:06:15 08:30:00",  # Morning
                "2023:06:15 09:00:00",  # Morning
                "2023:06:15 14:00:00",  # Afternoon
                "2023:06:15 18:00:00",  # Evening
                "2023:06:15 18:30:00",  # Evening
                "2023:06:15 22:00:00",  # Night
                "2023:06:15 22:30:00"   # Night
            ]
        }
        
        # Search for morning photos
        results = enhanced_search_service.temporal_search(time_of_day="morning")
        
        # Should find photos from morning hours (6-12)
        assert len(results) >= 2
        assert any("/photos/trip1/photo1.jpg" in str(r.path) for r in results)
        assert any("/photos/trip1/photo2.jpg" in str(r.path) for r in results)
    
    def test_temporal_search_with_year_month_filter(self, enhanced_search_service):
        """Test temporal search with year/month filtering."""
        # Mock metadata with specific dates
        enhanced_search_service.meta_data = {
            "paths": enhanced_search_service.store.state.paths,
            "timestamp": [
                "2022:06:15 10:30:00",  # 2022, June
                "2022:06:15 11:00:00",  # 2022, June
                "2022:12:20 14:00:00",  # 2022, December
                "2023:03:10 09:00:00",  # 2023, March
                "2023:03:10 09:30:00",  # 2023, March
                "2023:06:25 16:00:00",  # 2023, June
                "2023:06:25 16:30:00"   # 2023, June
            ]
        }
        
        # Search for photos from 2023
        results = enhanced_search_service.temporal_search(year=2023)
        
        # Should find photos from 2023
        assert len(results) >= 4
        
        # Search for photos from June 2023
        results = enhanced_search_service.temporal_search(year=2023, month=6)
        
        # Should find photos from June 2023
        assert len(results) >= 2
        assert any("/photos/landscape/mountain1.jpg" in str(r.path) for r in results)
        assert any("/photos/landscape/mountain2.jpg" in str(r.path) for r in results)
    
    def test_style_similarity_search(self, enhanced_search_service):
        """Test style similarity search functionality."""
        # For this test, we'll mock the visual feature extraction
        with patch.object(enhanced_search_service, '_extract_visual_features') as mock_extract:
            # Mock the feature extraction to return simple arrays
            mock_extract.return_value = {
                'color_histogram': np.array([0.1, 0.2, 0.3, 0.4]),
                'texture_features': np.array([0.5, 0.6]),
                'dominant_colors': np.array([[100, 150, 200], [50, 75, 100]]),
                'shape': (224, 224)
            }
            
            # Also mock the similarity methods
            with patch.object(enhanced_search_service, '_color_similarity', return_value=0.8):
                with patch.object(enhanced_search_service, '_texture_similarity', return_value=0.7):
                    # Test with a reference photo path
                    reference_path = "/photos/trip1/photo1.jpg"
                    results = enhanced_search_service.style_similarity_search(
                        reference_path=reference_path,
                        top_k=5
                    )
                    
                    # Should return some results
                    assert isinstance(results, list)
                    # Should not include the reference photo itself
                    assert not any(str(r.path) == reference_path for r in results)
    
    def test_combined_search(self, enhanced_search_service):
        """Test combined search functionality."""
        # Mock an embedder for semantic search
        mock_embedder = Mock()
        mock_embedder.embed_text.return_value = np.random.rand(512).astype(np.float32)
        
        # Test combined search with temporal parameters
        temporal_params = {
            "time_window_hours": 2.0
        }
        
        # Since we're testing the integration, we'll just verify it doesn't crash
        results = enhanced_search_service.combined_search(
            query="landscape mountains",
            embedder=mock_embedder,
            temporal_params=temporal_params,
            top_k=5
        )
        
        # Should return a list of results
        assert isinstance(results, list)
    
    def test_photo_metadata_extraction(self, enhanced_search_service):
        """Test extraction of photo metadata for filtering."""
        # Test hour extraction from file modification time
        hour = enhanced_search_service._get_photo_hour("/photos/trip1/photo1.jpg")
        assert isinstance(hour, int)
        assert 0 <= hour <= 23
        
        # Test year extraction
        year = enhanced_search_service._get_photo_year("/photos/trip1/photo1.jpg")
        assert isinstance(year, int)
        assert year >= 1970  # Unix epoch
        
        # Test month extraction
        month = enhanced_search_service._get_photo_month("/photos/trip1/photo1.jpg")
        assert isinstance(month, int)
        assert 1 <= month <= 12
    
    def test_filter_application(self, enhanced_search_service):
        """Test application of additional filters."""
        # Create some mock search results
        mock_results = [
            SearchResult(path=Path("/photos/trip1/photo1.jpg"), score=0.9),
            SearchResult(path=Path("/photos/portrait/person1.jpg"), score=0.8),
        ]
        
        # Test applying filters (this is more of an integration test)
        filters = {
            "camera": "iPhone",
            "iso_min": 100,
            "iso_max": 800,
            "aperture_min": 1.4,
            "aperture_max": 5.6
        }
        
        # Mock metadata for filter testing
        enhanced_search_service.meta_data = {
            "paths": ["/photos/trip1/photo1.jpg", "/photos/portrait/person1.jpg"],
            "camera": ["iPhone 12", "Samsung Galaxy"],
            "iso": [400, 200],
            "f_number": [2.8, 1.8]
        }
        
        filtered_results = enhanced_search_service._apply_filters(mock_results, filters)
        
        # Should return a list (actual filtering depends on metadata)
        assert isinstance(filtered_results, list)
    
    def test_empty_store_handling(self):
        """Test that service handles empty stores gracefully."""
        # Create an empty store
        temp_dir = Path(tempfile.mkdtemp())
        store = IndexStore(temp_dir)
        store.state.paths = []
        store.state.mtimes = []
        store.state.embeddings = None
        
        service = EnhancedSearchService(store)
        
        # Test temporal search with empty store
        results = service.temporal_search()
        assert results == []
        
        # Test style similarity search with empty store
        results = service.style_similarity_search("/some/photo.jpg")
        assert results == []
        
        # Cleanup
        shutil.rmtree(temp_dir)


class TestEnhancedSearchEndpoints:
    """Test cases for the enhanced search API endpoints."""
    
    def test_temporal_search_endpoint(self, client):
        """Test the temporal search endpoint."""
        # Create a temporary directory structure for testing
        with tempfile.TemporaryDirectory() as temp_dir:
            photos_dir = Path(temp_dir) / "photos"
            photos_dir.mkdir()
            
            # Test the temporal search endpoint
            response = client.post("/api/v1/enhanced_search/temporal", json={
                "dir": str(photos_dir),
                "time_window_hours": 24.0,
                "top_k": 12
            })
            
            # Should succeed with a valid response
            assert response.status_code == 200
            data = response.json()
            assert "search_id" in data
            assert "results" in data
            assert "cached" in data
    
    def test_style_similarity_search_endpoint(self, client):
        """Test the style similarity search endpoint."""
        # Create a temporary directory structure for testing
        with tempfile.TemporaryDirectory() as temp_dir:
            photos_dir = Path(temp_dir) / "photos"
            photos_dir.mkdir()
            
            # Test the style similarity search endpoint
            response = client.post("/api/v1/enhanced_search/style_similarity", json={
                "dir": str(photos_dir),
                "reference_path": "/some/reference/photo.jpg",
                "top_k": 12
            })
            
            # Should either succeed or fail gracefully with proper error
            assert response.status_code in [200, 400, 500]
    
    def test_combined_search_endpoint(self, client):
        """Test the combined search endpoint."""
        # Create a temporary directory structure for testing
        with tempfile.TemporaryDirectory() as temp_dir:
            photos_dir = Path(temp_dir) / "photos"
            photos_dir.mkdir()
            
            # Test the combined search endpoint
            response = client.post("/api/v1/enhanced_search/combined", json={
                "dir": str(photos_dir),
                "query": "mountains landscape",
                "top_k": 12
            })
            
            # Should succeed with a valid response
            assert response.status_code == 200
            data = response.json()
            assert "search_id" in data
            assert "results" in data
            assert "cached" in data
    
    def test_similar_times_search_endpoint(self, client):
        """Test the similar times search endpoint."""
        # Create a temporary directory structure for testing
        with tempfile.TemporaryDirectory() as temp_dir:
            photos_dir = Path(temp_dir) / "photos"
            photos_dir.mkdir()
            
            # Create a mock photo file
            mock_photo = photos_dir / "mock_photo.jpg"
            mock_photo.touch()
            
            # Test the similar times search endpoint
            response = client.get("/api/v1/enhanced_search/similar_times", params={
                "dir": str(photos_dir),
                "reference_photo": str(mock_photo),
                "time_window_hours": 24.0,
                "top_k": 12
            })
            
            # Should succeed with a valid response
            assert response.status_code == 200
            data = response.json()
            assert "search_id" in data
            assert "results" in data
            assert "cached" in data
    
    def test_seasonal_search_endpoint(self, client):
        """Test the seasonal search endpoint."""
        # Create a temporary directory structure for testing
        with tempfile.TemporaryDirectory() as temp_dir:
            photos_dir = Path(temp_dir) / "photos"
            photos_dir.mkdir()
            
            # Test the seasonal search endpoint
            response = client.get("/api/v1/enhanced_search/seasonal", params={
                "dir": str(photos_dir),
                "season": "summer",
                "top_k": 12
            })
            
            # Should succeed with a valid response
            assert response.status_code == 200
            data = response.json()
            assert "search_id" in data
            assert "results" in data
            assert "cached" in data


if __name__ == "__main__":
    pytest.main([__file__])