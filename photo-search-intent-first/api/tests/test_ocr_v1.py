"""
Tests for v1 OCR endpoints.
"""
from __future__ import annotations

import json
from pathlib import Path
from fastapi.testclient import TestClient

from server import app  # type: ignore


def test_ocr_build_endpoint(tmp_path: Path) -> None:
    """Test the OCR build endpoint."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = tmp_path / "photos"
    photos_dir.mkdir()
    
    # Test the OCR build endpoint
    response = client.post("/api/v1/ocr/build", json={
        "dir": str(photos_dir),
        "provider": "local"
    })
    
    # Should succeed with a valid response
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "updated" in data


def test_ocr_status_endpoint_not_ready(tmp_path: Path) -> None:
    """Test the OCR status endpoint when OCR is not ready."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = tmp_path / "photos"
    photos_dir.mkdir()
    
    # Test the OCR status endpoint
    response = client.get("/api/v1/ocr/status", params={"directory": str(photos_dir)})
    
    # Should succeed with a valid response
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "data" in data


def test_ocr_status_endpoint_ready(tmp_path: Path) -> None:
    """Test the OCR status endpoint when OCR is ready."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = tmp_path / "photos"
    photos_dir.mkdir()
    
    # Create OCR index directory and files
    index_dir = photos_dir / ".photo_index"
    index_dir.mkdir()
    
    ocr_data = {
        "paths": ["photo1.jpg", "photo2.jpg"],
        "texts": ["text in photo 1", "text in photo 2"]
    }
    
    ocr_file = index_dir / "ocr_texts.json"
    ocr_file.write_text(json.dumps(ocr_data), encoding="utf-8")
    
    # Test the OCR status endpoint
    response = client.get("/api/v1/ocr/status", params={"directory": str(photos_dir)})
    
    # Should succeed with a valid response
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "data" in data


def test_ocr_snippets_endpoint_empty(tmp_path: Path) -> None:
    """Test the OCR snippets endpoint with empty results."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = tmp_path / "photos"
    photos_dir.mkdir()
    
    # Test the OCR snippets endpoint
    response = client.post("/api/v1/ocr/snippets", json={
        "dir": str(photos_dir),
        "paths": ["photo1.jpg", "photo2.jpg"],
        "limit": 100
    })
    
    # Should succeed with a valid response
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "snippets" in data


def test_ocr_snippets_endpoint_with_data(tmp_path: Path) -> None:
    """Test the OCR snippets endpoint with OCR data."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = tmp_path / "photos"
    photos_dir.mkdir()
    
    # Create OCR index directory and files
    index_dir = photos_dir / ".photo_index"
    index_dir.mkdir()
    
    ocr_data = {
        "paths": ["photo1.jpg", "photo2.jpg"],
        "texts": ["long text content for photo 1 that exceeds limits", "text in photo 2"]
    }
    
    ocr_file = index_dir / "ocr_texts.json"
    ocr_file.write_text(json.dumps(ocr_data), encoding="utf-8")
    
    # Test the OCR snippets endpoint
    response = client.post("/api/v1/ocr/snippets", json={
        "dir": str(photos_dir),
        "paths": ["photo1.jpg"],
        "limit": 20
    })
    
    # Should succeed with a valid response
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert "snippets" in data