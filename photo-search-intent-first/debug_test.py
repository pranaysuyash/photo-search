"""
Debug script to see what the OCR build endpoint is returning.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Add the current directory to the path so we can import the server module
sys.path.insert(0, '.')

from fastapi.testclient import TestClient

from api.server import app  # type: ignore

def debug_ocr_build():
    """Debug the OCR build endpoint."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = Path("/tmp/debug_photos")
    photos_dir.mkdir(exist_ok=True)
    
    # Test the OCR build endpoint
    response = client.post("/api/v1/ocr/build", json={
        "dir": str(photos_dir),
        "provider": "local"
    })
    
    print(f"Status code: {response.status_code}")
    print(f"Response: {response.json()}")

if __name__ == "__main__":
    debug_ocr_build()