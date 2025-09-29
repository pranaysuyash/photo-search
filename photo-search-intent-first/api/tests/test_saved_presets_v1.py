"""
Tests for v1 saved searches and presets endpoints.
"""
from __future__ import annotations

import json
from pathlib import Path
from fastapi.testclient import TestClient

from server import app  # type: ignore


def test_saved_searches_crud(tmp_path: Path) -> None:
    """Test saved searches CRUD operations."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = tmp_path / "photos"
    photos_dir.mkdir()
    
    # Test getting saved searches when none exist
    response = client.get("/api/v1/saved/", params={"dir": str(photos_dir)})
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "saved" in data
    assert data["saved"] == []
    
    # Test adding a saved search
    response = client.post("/api/v1/saved/", json={
        "dir": str(photos_dir),
        "name": "Beach Photos",
        "query": "beach ocean",
        "top_k": 24
    })
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "saved" in data
    assert len(data["saved"]) == 1
    assert data["saved"][0]["name"] == "Beach Photos"
    assert data["saved"][0]["query"] == "beach ocean"
    assert data["saved"][0]["top_k"] == 24
    
    # Test getting saved searches after adding one
    response = client.get("/api/v1/saved/", params={"dir": str(photos_dir)})
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "saved" in data
    assert len(data["saved"]) == 1
    assert data["saved"][0]["name"] == "Beach Photos"
    
    # Test deleting a saved search
    response = client.post("/api/v1/saved/delete", json={
        "dir": str(photos_dir),
        "name": "Beach Photos"
    })
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "deleted" in data
    assert data["deleted"] == 1
    assert "saved" in data
    assert len(data["saved"]) == 0


def test_presets_crud(tmp_path: Path) -> None:
    """Test presets CRUD operations."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = tmp_path / "photos"
    photos_dir.mkdir()
    
    # Test getting presets when none exist
    response = client.get("/api/v1/presets/", params={"dir": str(photos_dir)})
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "presets" in data
    assert data["presets"] == []
    
    # Test adding a preset
    response = client.post("/api/v1/presets/", json={
        "dir": str(photos_dir),
        "name": "High ISO",
        "query": "iso:>1600"
    })
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "presets" in data
    assert len(data["presets"]) == 1
    assert data["presets"][0]["name"] == "High ISO"
    assert data["presets"][0]["query"] == "iso:>1600"
    
    # Test getting presets after adding one
    response = client.get("/api/v1/presets/", params={"dir": str(photos_dir)})
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "presets" in data
    assert len(data["presets"]) == 1
    assert data["presets"][0]["name"] == "High ISO"
    
    # Test updating an existing preset (same name should update)
    response = client.post("/api/v1/presets/", json={
        "dir": str(photos_dir),
        "name": "High ISO",
        "query": "iso:>3200"
    })
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "presets" in data
    assert len(data["presets"]) == 1
    assert data["presets"][0]["name"] == "High ISO"
    assert data["presets"][0]["query"] == "iso:>3200"
    
    # Test deleting a preset
    response = client.post("/api/v1/presets/delete", json={
        "dir": str(photos_dir),
        "name": "High ISO"
    })
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "deleted" in data
    assert data["deleted"] == 1
    assert "presets" in data
    assert len(data["presets"]) == 0