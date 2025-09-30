"""
Contract tests for API routers to ensure response schemas and backward compatibility.

These tests establish a safety net for refactoring complex endpoints.
Run before and after code changes to detect breaking changes.
"""
import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import tempfile
import shutil

# Import the FastAPI app
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from api.server import app

client = TestClient(app)


@pytest.fixture
def temp_photo_dir():
    """Create a temporary directory with test photos for contract tests."""
    temp_dir = Path(tempfile.mkdtemp())
    
    # Create minimal test structure
    (temp_dir / "test.jpg").touch()  # Dummy photo file
    (temp_dir / ".index").mkdir(exist_ok=True)  # Index directory
    
    yield str(temp_dir)
    
    # Cleanup
    shutil.rmtree(temp_dir)


class TestIndexRouterContracts:
    """Contract tests for index router endpoints."""
    
    def test_index_status_response_structure(self, temp_photo_dir):
        """Verify /index/status returns expected response structure."""
        response = client.get(f"/index/status?dir={temp_photo_dir}")
        
        # Basic HTTP contract
        assert response.status_code == 200
        
        data = response.json()
        
        # Core response fields
        assert "ok" in data
        assert isinstance(data["ok"], bool)
        
        # Index status specific fields (check actual response structure)
        expected_fields = ["state", "indexed", "total", "coverage"]
        for field in expected_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Optional fields that may be present
        optional_fields = ["error", "drift", "last_index_time"]
        # These are not required but should be present in some form
    
    def test_index_pause_resume_contracts(self, temp_photo_dir):
        """Verify pause/resume endpoints return structured responses."""
        # Test pause
        pause_response = client.post(f"/index/pause?dir={temp_photo_dir}")
        assert pause_response.status_code == 200
        
        pause_data = pause_response.json()
        assert "ok" in pause_data
        assert isinstance(pause_data["ok"], bool)
        
        # Test resume
        resume_response = client.post(f"/index/resume?dir={temp_photo_dir}")
        assert resume_response.status_code == 200
        
        resume_data = resume_response.json()
        assert "ok" in resume_data
        assert isinstance(resume_data["ok"], bool)


class TestFavoritesRouterContracts:
    """Contract tests for favorites router endpoints."""
    
    def test_favorites_list_structure(self, temp_photo_dir):
        """Verify GET /favorites returns expected structure."""
        response = client.get(f"/favorites?dir={temp_photo_dir}")
        assert response.status_code == 200
        
        data = response.json()
        assert "ok" in data
        assert "favorites" in data
        assert isinstance(data["favorites"], list)
    
    def test_favorites_set_structure(self, temp_photo_dir):
        """Verify POST /favorites returns expected structure."""
        payload = {
            "dir": temp_photo_dir,
            "path": "test.jpg",
            "favorite": True
        }
        response = client.post("/favorites", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "ok" in data
        assert "path" in data
        assert "favorite" in data


class TestTaggingRouterContracts:
    """Contract tests for tagging router endpoints."""
    
    def test_tags_list_structure(self, temp_photo_dir):
        """Verify GET /tags returns expected structure."""
        response = client.get(f"/tags?dir={temp_photo_dir}")
        assert response.status_code == 200
        
        data = response.json()
        assert "ok" in data
        assert "tags" in data
        assert "all" in data
        assert isinstance(data["tags"], dict)
        assert isinstance(data["all"], list)
    
    def test_autotag_structure(self, temp_photo_dir):
        """Verify /autotag returns expected structure."""
        payload = {
            "dir": temp_photo_dir,
            "limit": 5
        }
        response = client.post("/autotag", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "ok" in data
        assert "updated" in data
        assert isinstance(data["updated"], int)


class TestShareRouterContracts:
    """Contract tests for share router endpoints."""
    
    def test_share_list_structure(self, temp_photo_dir):
        """Verify GET /share returns expected structure."""
        response = client.get(f"/share?dir={temp_photo_dir}")
        assert response.status_code == 200
        
        data = response.json()
        assert "ok" in data
        assert "shares" in data
        assert isinstance(data["shares"], list)
    
    def test_share_create_structure(self, temp_photo_dir):
        """Verify POST /share returns expected structure."""
        payload = {
            "dir": temp_photo_dir,
            "paths": ["test.jpg"],
            "provider": "local"
        }
        response = client.post("/share", json=payload)
        
        # May fail due to missing dependencies, but should have expected structure
        data = response.json()
        assert "ok" in data
        
        if response.status_code == 200:
            assert "token" in data
            assert "url" in data


class TestCollectionsRouterContracts:
    """Contract tests for collections router endpoints."""
    
    def test_collections_list_structure(self, temp_photo_dir):
        """Verify GET /collections returns expected structure."""
        response = client.get(f"/collections?dir={temp_photo_dir}")
        assert response.status_code == 200
        
        data = response.json()
        assert "ok" in data
        assert "collections" in data
        assert isinstance(data["collections"], dict)
    
    def test_collections_set_structure(self, temp_photo_dir):
        """Verify POST /collections returns expected structure."""
        payload = {
            "dir": temp_photo_dir,
            "name": "test_collection",
            "paths": ["test.jpg"]
        }
        response = client.post("/collections", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "ok" in data
        assert "collections" in data
        assert isinstance(data["collections"], dict)


class TestLegacyBehaviorContracts:
    """Tests ensuring legacy client behavior is preserved."""
    
    def test_share_list_empty_on_error(self, temp_photo_dir):
        """Verify share list returns empty list on errors (legacy behavior)."""
        # This should still return ok=True with empty shares list
        response = client.get(f"/share?dir=/nonexistent/path")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert data["shares"] == []
    
    def test_collections_delete_response(self, temp_photo_dir):
        """Verify collection delete returns proper structure."""
        payload = {
            "dir": temp_photo_dir,
            "name": "nonexistent_collection"
        }
        response = client.post("/collections/delete", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "ok" in data
        assert "deleted" in data
        # Should be ok=False, deleted=None for missing collection
        assert data["ok"] is False
        assert data["deleted"] is None


if __name__ == "__main__":
    # Run with: python -m pytest tests/test_contracts.py -v
    pytest.main([__file__, "-v"])