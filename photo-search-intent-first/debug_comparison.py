"""
Debug script to compare OCR and faces endpoints.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Add the current directory to the path so we can import the server module
sys.path.insert(0, '.')

from fastapi.testclient import TestClient

from api.server import app  # type: ignore

def debug_endpoints():
    """Debug both OCR and faces endpoints."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = Path("/tmp/debug_photos")
    photos_dir.mkdir(exist_ok=True)
    
    print("=== Faces Endpoint Test ===")
    # Test the faces build endpoint
    faces_response = client.post("/api/v1/faces/build", json={
        "dir": str(photos_dir),
        "provider": "local"
    })
    
    print(f"Faces Status code: {faces_response.status_code}")
    print(f"Faces Response: {faces_response.json()}")
    
    print("\n=== OCR Endpoint Test ===")
    # Test the OCR build endpoint
    ocr_response = client.post("/api/v1/ocr/build", json={
        "dir": str(photos_dir),
        "provider": "local"
    })
    
    print(f"OCR Status code: {ocr_response.status_code}")
    print(f"OCR Response: {ocr_response.json()}")

if __name__ == "__main__":
    debug_endpoints()