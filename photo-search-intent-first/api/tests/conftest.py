from __future__ import annotations

import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient


# Ensure imports resolve relative to api/ directory
THIS_DIR = Path(__file__).resolve().parent
API_DIR = THIS_DIR.parent
ROOT_DIR = API_DIR.parent
for p in (str(API_DIR), str(ROOT_DIR)):
    if p not in sys.path:
        sys.path.insert(0, p)

from server import app  # noqa: E402


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)
