"""
Debug script to see what the faces split endpoint is returning.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Add the current directory to the path so we can import the server module
sys.path.insert(0, '.')

from fastapi.testclient import TestClient

from api.server import app  # type: ignore

def debug_faces_split():
    """Debug the faces split endpoint."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = Path("/tmp/debug_photos")
    photos_dir.mkdir(exist_ok=True)
    
    # Test the faces split endpoint
    response = client.post("/api/v1/faces/split", json={
        "dir": str(photos_dir),
        "cluster_id": "1",
        "photo_paths": ["/path/to/photo1.jpg", "/path/to/photo2.jpg"]
    })
    
    print(f"Status code: {response.status_code}")
    print(f"Response: {response.json()}")

if __name__ == "__main__":
    debug_faces_split()