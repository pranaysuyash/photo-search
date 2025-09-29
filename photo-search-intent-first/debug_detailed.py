"""
Debug script to check what parameters are being received by the OCR endpoint.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Dict, Any, Optional, List

# Add the current directory to the path so we can import the server module
sys.path.insert(0, '.')

from fastapi.testclient import TestClient

from api.server import app  # type: ignore
from api.utils import _require, _from_body

# Monkey patch to add debug prints
original_require = _require
original_from_body = _from_body

def debug_require(value: Optional[Any], name: str) -> Any:
    print(f"_require called with value: {value}, name: {name}")
    return original_require(value, name)

def debug_from_body(
    body: Optional[Dict[str, Any]],
    current: Optional[Any],
    key: str,
    *,
    default: Optional[Any] = None,
    cast=None,
) -> Any:
    result = original_from_body(body, current, key, default=default, cast=cast)
    print(f"_from_body called with body: {body}, current: {current}, key: {key}, result: {result}")
    return result

# Apply monkey patches
import api.utils
api.utils._require = debug_require
api.utils._from_body = debug_from_body

def debug_ocr_build():
    """Debug the OCR build endpoint with debug prints."""
    client = TestClient(app)
    
    # Create a test directory
    photos_dir = Path("/tmp/debug_photos")
    photos_dir.mkdir(exist_ok=True)
    
    print("=== Sending OCR build request ===")
    # Test the OCR build endpoint
    response = client.post("/api/v1/ocr/build", json={
        "dir": str(photos_dir),
        "provider": "local"
    })
    
    print(f"\n=== OCR Response ===")
    print(f"Status code: {response.status_code}")
    print(f"Response: {response.json()}")

if __name__ == "__main__":
    debug_ocr_build()