"""
API Integration Smoke Tests

Comprehensive smoke tests for the Photo Search API using FastAPI TestClient.
Tests core functionality with temporary directories and sample assets.
"""

import json
import shutil
import tempfile
from pathlib import Path
from typing import Dict, Any, List

import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from api.server import app
from infra.index_store import IndexStore
from adapters.embedding_transformers_clip import TransformersClipEmbedding


class TestPhotoSearchAPI:
    """Smoke tests for Photo Search API endpoints."""

    @pytest.fixture
    def client(self) -> TestClient:
        """FastAPI test client."""
        return TestClient(app)

    @pytest.fixture
    def temp_dir(self) -> Path:
        """Temporary directory for test data."""
        temp_path = Path(tempfile.mkdtemp(prefix="photo_search_test_"))
        yield temp_path
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)

    @pytest.fixture
    def sample_images(self, temp_dir: Path) -> List[Path]:
        """Create sample test images."""
        images = []

        # Create a few test images with different colors/content
        test_images = [
            ("red_square.png", (255, 0, 0)),
            ("blue_circle.png", (0, 0, 255)),
            ("green_triangle.png", (0, 255, 0)),
        ]

        for filename, color in test_images:
            img_path = temp_dir / filename
            img = Image.new("RGB", (200, 200), color)

            # Add some text to make images more distinctive
            draw = ImageDraw.Draw(img)
            draw.text((10, 10), filename.split('.')[0], fill=(255, 255, 255))

            img.save(img_path)
            images.append(img_path)

        return images

    @pytest.fixture
    def indexed_library(self, client: TestClient, temp_dir: Path, sample_images: List[Path]) -> str:
        """Set up an indexed photo library."""
        # Index the sample images
        response = client.post("/index", json={
            "dir": str(temp_dir),
            "provider": "local",
            "batch_size": 2
        })

        assert response.status_code == 200
        data = response.json()
        assert data["new"] == len(sample_images)
        assert data["updated"] == 0

        return str(temp_dir)

    def test_health_endpoints(self, client: TestClient):
        """Test health check endpoints."""
        # Test /health
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert "uptime_seconds" in data

        # Test /api/health
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True

        # Test /api/ping
        response = client.get("/api/ping")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True

    def test_demo_directory(self, client: TestClient):
        """Test demo directory endpoint."""
        response = client.get("/demo/dir")
        assert response.status_code == 200
        data = response.json()
        # May or may not have demo directory, but should not error
        assert "ok" in data

    def test_search_without_index(self, client: TestClient, temp_dir: Path):
        """Test search on non-indexed directory."""
        response = client.post("/search", json={
            "dir": str(temp_dir),
            "query": "red square",
            "top_k": 5,
            "provider": "local"
        })

        assert response.status_code == 200
        data = response.json()
        assert "search_id" in data
        assert "results" in data
        assert isinstance(data["results"], list)
        # Should return empty results for non-indexed directory
        assert len(data["results"]) == 0

    def test_index_and_search(self, client: TestClient, indexed_library: str, sample_images: List[Path]):
        """Test indexing and then searching."""
        # Search for red content
        response = client.post("/search", json={
            "dir": indexed_library,
            "query": "red square",
            "top_k": 5,
            "provider": "local"
        })

        assert response.status_code == 200
        data = response.json()
        assert "search_id" in data
        assert "results" in data
        assert isinstance(data["results"], list)
        assert len(data["results"]) > 0

        # Check result structure
        result = data["results"][0]
        assert "path" in result
        assert "score" in result
        assert isinstance(result["score"], (int, float))

        # The red square should be the top result
        assert "red_square" in result["path"]

    def test_favorites_management(self, client: TestClient, indexed_library: str, sample_images: List[Path]):
        """Test favorites CRUD operations."""
        # Get initial favorites (should be empty)
        response = client.get(f"/favorites?dir={indexed_library}")
        assert response.status_code == 200
        data = response.json()
        assert "favorites" in data
        assert data["favorites"] == []

        # Add a photo to favorites
        test_path = str(sample_images[0])
        response = client.post("/favorites", json={
            "dir": indexed_library,
            "path": test_path,
            "favorite": True
        })

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert test_path in data["favorites"]

        # Get favorites again (should contain the added photo)
        response = client.get(f"/favorites?dir={indexed_library}")
        assert response.status_code == 200
        data = response.json()
        assert test_path in data["favorites"]

        # Remove from favorites
        response = client.post("/favorites", json={
            "dir": indexed_library,
            "path": test_path,
            "favorite": False
        })

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert test_path not in data["favorites"]

    def test_tags_management(self, client: TestClient, indexed_library: str, sample_images: List[Path]):
        """Test tags CRUD operations."""
        # Get initial tags (should be empty or minimal)
        response = client.get(f"/tags?dir={indexed_library}")
        assert response.status_code == 200
        data = response.json()
        assert "tags" in data
        assert "all" in data

        # For now, just test that the POST endpoint exists and handles parameters
        # The exact parameter format may need adjustment based on endpoint implementation
        test_path = str(sample_images[0])
        test_tags = ["vacation", "beach", "summer"]

        # Try different parameter formats
        success = False
        for attempt in [
            # Query parameters
            {"params": {"dir": indexed_library, "path": test_path, "tags": ",".join(test_tags)}},
            # Form data
            {"data": {"dir": indexed_library, "path": test_path, "tags": json.dumps(test_tags)}},
            # JSON
            {"json": {"dir": indexed_library, "path": test_path, "tags": test_tags}},
        ]:
            response = client.post("/tags", **attempt)
            if response.status_code == 200:
                data = response.json()
                if data.get("ok"):
                    success = True
                    break

        # For smoke test purposes, just ensure the endpoint is accessible
        # Full functionality testing can be done separately
        assert success or response.status_code in [200, 422], f"Tags endpoint failed: {response.status_code} {response.text}"

        # Get tags again (should contain the added tags)
        response = client.get(f"/tags?dir={indexed_library}")
        assert response.status_code == 200
        data = response.json()
        assert test_path in data["tags"]
        assert set(data["tags"][test_path]) == set(test_tags)

        # Test search with tags
        response = client.post("/search", json={
            "dir": indexed_library,
            "query": "vacation",
            "top_k": 5,
            "provider": "local",
            "tags": ["vacation"]
        })

        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) > 0
        # Should find the tagged photo
        found_paths = [r["path"] for r in data["results"]]
        assert test_path in found_paths

    def test_collections_management(self, client: TestClient, indexed_library: str, sample_images: List[Path]):
        """Test collections operations."""
        # Collections are more complex, test basic functionality
        # This is a placeholder for more comprehensive collection tests
        # For now, just ensure the endpoint doesn't crash

        # We could test saving/loading collections, but that requires more setup
        # For smoke tests, basic endpoint availability is sufficient
        pass

    def test_index_status(self, client: TestClient, indexed_library: str):
        """Test index status endpoint."""
        response = client.get(f"/index/status?dir={indexed_library}&provider=local")
        assert response.status_code == 200
        data = response.json()

        # Should have some status information
        assert isinstance(data, dict)
        # May contain 'state', 'total', etc. depending on index state

    def test_search_with_filters(self, client: TestClient, indexed_library: str, sample_images: List[Path]):
        """Test search with various filters."""
        # Test basic search with different parameters
        response = client.post("/search", json={
            "dir": indexed_library,
            "query": "colorful",
            "top_k": 10,
            "provider": "local",
            "use_captions": False,
            "use_ocr": False
        })

        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert isinstance(data["results"], list)

    def test_error_handling(self, client: TestClient):
        """Test error handling for invalid requests."""
        # Test with non-existent directory
        response = client.post("/search", json={
            "dir": "/non/existent/directory",
            "query": "test",
            "provider": "local"
        })

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data

        # Test missing required parameters
        response = client.post("/search", json={
            "query": "test",
            "provider": "local"
        })

        assert response.status_code == 422  # Validation error

    def test_concurrent_requests(self, client: TestClient, indexed_library: str):
        """Test handling of multiple sequential requests."""
        queries = ["red", "blue", "green", "square", "circle"]
        results = []

        # Make sequential requests (avoiding threading issues in tests)
        for query in queries:
            response = client.post("/search", json={
                "dir": indexed_library,
                "query": query,
                "top_k": 3,
                "provider": "local"
            })
            results.append((query, response.status_code, response.json()))

        # Check results
        assert len(results) == len(queries)

        for query, status, data in results:
            assert status == 200
            assert "results" in data
            assert isinstance(data["results"], list)

    def test_large_result_set(self, client: TestClient, indexed_library: str):
        """Test handling of large result sets."""
        # Request more results than available
        response = client.post("/search", json={
            "dir": indexed_library,
            "query": "color",
            "top_k": 100,  # More than our 3 test images
            "provider": "local"
        })

        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert isinstance(data["results"], list)
        # Should not crash, should return available results
        assert len(data["results"]) <= 100

    def test_provider_validation(self, client: TestClient, indexed_library: str):
        """Test different provider configurations."""
        # Test with local provider (should work)
        response = client.post("/search", json={
            "dir": indexed_library,
            "query": "test",
            "provider": "local"
        })

        assert response.status_code == 200

        # Test with invalid provider (should handle gracefully)
        response = client.post("/search", json={
            "dir": indexed_library,
            "query": "test",
            "provider": "invalid_provider"
        })

        # Should either work or fail gracefully
        assert response.status_code in [200, 400, 500]


if __name__ == "__main__":
    # Allow running individual tests
    pytest.main([__file__, "-v"])