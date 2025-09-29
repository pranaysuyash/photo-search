"""
Tests for v1 batch endpoints.
"""
from __future__ import annotations

import json
from pathlib import Path
from fastapi.testclient import TestClient

from server import app  # type: ignore


def test_batch_tag_endpoint(tmp_path: Path) -> None:
    """Test the batch tag endpoint."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = tmp_path / "photos"
    photos_dir.mkdir()
    
    # Test the batch tag endpoint
    response = client.post("/api/v1/batch/tag", json={
        "dir": str(photos_dir),
        "paths": ["/path/to/photo1.jpg", "/path/to/photo2.jpg"],
        "tags": ["vacation", "beach"],
        "operation": "add"
    })
    
    # Should succeed with a valid response
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "updated" in data
    assert "processed" in data
    assert "operation" in data


def test_batch_collections_endpoint(tmp_path: Path) -> None:
    """Test the batch collections endpoint."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = tmp_path / "photos"
    photos_dir.mkdir()
    
    # Test the batch collections endpoint
    response = client.post("/api/v1/batch/collections", json={
        "dir": str(photos_dir),
        "paths": ["/path/to/photo1.jpg", "/path/to/photo2.jpg"],
        "collection_name": "Summer Vacation"
    })
    
    # Should succeed with a valid response
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "collection" in data
    assert "added" in data
    assert "total" in data


def test_batch_delete_endpoint(tmp_path: Path) -> None:
    """Test the batch delete endpoint."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = tmp_path / "photos"
    photos_dir.mkdir()
    
    # Test the batch delete endpoint
    response = client.post("/api/v1/batch/delete", json={
        "directory": str(photos_dir),
        "paths": ["/path/to/photo1.jpg", "/path/to/photo2.jpg"],
        "os_trash": True
    })
    
    # Should succeed with a valid response
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "processed" in data
    assert "moved" in data
    assert "failed" in data
    assert "undoable" in data
    assert "os_trash" in data