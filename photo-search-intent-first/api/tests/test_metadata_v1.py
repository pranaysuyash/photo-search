"""
Tests for v1 metadata endpoints.
"""
from __future__ import annotations

import json
from pathlib import Path
from fastapi.testclient import TestClient

from server import app  # type: ignore


def test_metadata_build_endpoint(tmp_path: Path) -> None:
    """Test the metadata build endpoint."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = tmp_path / "photos"
    photos_dir.mkdir()
    
    # Test the metadata build endpoint
    response = client.post("/api/v1/metadata/build", json={
        "dir": str(photos_dir),
        "provider": "local"
    })
    
    # Should succeed with a valid response
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "updated" in data


def test_metadata_get_endpoint_empty(tmp_path: Path) -> None:
    """Test the metadata get endpoint with no data."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = tmp_path / "photos"
    photos_dir.mkdir()
    
    # Test the metadata get endpoint
    response = client.get("/api/v1/metadata/", params={"dir": str(photos_dir)})
    
    # Should succeed with a valid response
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "cameras" in data
    assert "places" in data
    assert data["cameras"] == []
    assert data["places"] == []


def test_metadata_get_endpoint_with_data(tmp_path: Path) -> None:
    """Test the metadata get endpoint with metadata data."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = tmp_path / "photos"
    photos_dir.mkdir()
    
    # Create metadata index directory and files
    index_dir = photos_dir / ".photo_index"
    index_dir.mkdir()
    
    metadata_data = {
        "paths": ["/path/to/photo1.jpg", "/path/to/photo2.jpg"],
        "camera": ["Canon EOS R5", "iPhone 12"],
        "place": ["Paris, France", "New York, USA"]
    }
    
    metadata_file = index_dir / "exif_index.json"
    metadata_file.write_text(json.dumps(metadata_data), encoding="utf-8")
    
    # Test the metadata get endpoint
    response = client.get("/api/v1/metadata/", params={"dir": str(photos_dir)})
    
    # Should succeed with a valid response
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "cameras" in data
    assert "places" in data
    assert "Canon EOS R5" in data["cameras"]
    assert "iPhone 12" in data["cameras"]
    assert "Paris, France" in data["places"]
    assert "New York, USA" in data["places"]


def test_metadata_batch_endpoint_empty(tmp_path: Path) -> None:
    """Test the metadata batch endpoint with empty parameters."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = tmp_path / "photos"
    photos_dir.mkdir()
    
    # Test the metadata batch endpoint with no paths
    response = client.get("/api/v1/metadata/batch", params={
        "dir": str(photos_dir),
        "paths": ""
    })
    
    # Should succeed with a valid response
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "meta" in data


def test_metadata_batch_endpoint_with_paths(tmp_path: Path) -> None:
    """Test the metadata batch endpoint with paths."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = tmp_path / "photos"
    photos_dir.mkdir()
    
    # Create metadata index directory and files
    index_dir = photos_dir / ".photo_index"
    index_dir.mkdir()
    
    metadata_data = {
        "paths": ["/path/to/photo1.jpg", "/path/to/photo2.jpg"],
        "camera": ["Canon EOS R5", "iPhone 12"],
        "iso": [100, 800],
        "fnumber": [2.8, 1.8]
    }
    
    metadata_file = index_dir / "exif_index.json"
    metadata_file.write_text(json.dumps(metadata_data), encoding="utf-8")
    
    # Test the metadata batch endpoint
    response = client.get("/api/v1/metadata/batch", params={
        "dir": str(photos_dir),
        "paths": "/path/to/photo1.jpg,/path/to/photo2.jpg"
    })
    
    # Should succeed with a valid response
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "meta" in data
    meta = data["meta"]
    assert "/path/to/photo1.jpg" in meta
    assert "/path/to/photo2.jpg" in meta