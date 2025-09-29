"""
Tests for v1 faces endpoints.
"""
from __future__ import annotations

import json
from pathlib import Path
from fastapi.testclient import TestClient

from server import app  # type: ignore


def test_faces_build_endpoint(tmp_path: Path) -> None:
    """Test the faces build endpoint."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = tmp_path / "photos"
    photos_dir.mkdir()
    
    # Test the faces build endpoint
    response = client.post("/api/v1/faces/build", json={
        "dir": str(photos_dir),
        "provider": "local"
    })
    
    # Should succeed with a valid response
    assert response.status_code == 200
    data = response.json()
    assert "clusters" in data
    assert "faces" in data
    assert "updated" in data


def test_faces_clusters_endpoint_empty(tmp_path: Path) -> None:
    """Test the faces clusters endpoint with no data."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = tmp_path / "photos"
    photos_dir.mkdir()
    
    # Test the faces clusters endpoint
    response = client.get("/api/v1/faces/clusters", params={"directory": str(photos_dir)})
    
    # Should succeed with a valid response
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "clusters" in data


def test_faces_name_endpoint(tmp_path: Path) -> None:
    """Test the faces name endpoint."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = tmp_path / "photos"
    photos_dir.mkdir()
    
    # Test the faces name endpoint
    response = client.post("/api/v1/faces/name", json={
        "dir": str(photos_dir),
        "cluster_id": "1",
        "name": "John Doe"
    })
    
    # Should succeed with a valid response
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data


def test_faces_photos_endpoint(tmp_path: Path) -> None:
    """Test the faces photos endpoint."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = tmp_path / "photos"
    photos_dir.mkdir()
    
    # Test the faces photos endpoint
    response = client.get("/api/v1/faces/photos", params={
        "directory": str(photos_dir),
        "cluster_id": "1"
    })
    
    # Should succeed with a valid response
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "cluster_id" in data
    assert "photos" in data
    assert "count" in data


def test_faces_merge_endpoint(tmp_path: Path) -> None:
    """Test the faces merge endpoint."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = tmp_path / "photos"
    photos_dir.mkdir()
    
    # Test the faces merge endpoint
    response = client.post("/api/v1/faces/merge", json={
        "dir": str(photos_dir),
        "source_cluster_id": "2",
        "target_cluster_id": "1"
    })
    
    # Should succeed with a valid response
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "merged_into" in data
    assert "source" in data


def test_faces_split_endpoint(tmp_path: Path) -> None:
    """Test the faces split endpoint."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = tmp_path / "photos"
    photos_dir.mkdir()
    
    # Test the faces split endpoint
    response = client.post("/api/v1/faces/split", json={
        "dir": str(photos_dir),
        "cluster_id": "1",
        "photo_paths": ["/path/to/photo1.jpg", "/path/to/photo2.jpg"]
    })
    
    # Should succeed with a valid response
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "new_cluster_id" in data
    assert "photos" in data
    assert "original_cluster" in data