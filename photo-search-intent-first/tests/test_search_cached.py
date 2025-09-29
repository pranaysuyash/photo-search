from __future__ import annotations

import json
import os
import shutil
import tempfile
import time
from pathlib import Path
from typing import List

import pytest
from fastapi.testclient import TestClient
import numpy as np

from api.server import app
from infra.index_store import IndexStore
from infra.analytics import log_interaction


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def temp_dir():  # type: ignore[override]
    p = Path(tempfile.mkdtemp(prefix="cached_search_"))
    yield p
    shutil.rmtree(p, ignore_errors=True)


@pytest.fixture
def sample_images(temp_dir: Path) -> List[Path]:
    from PIL import Image
    out: List[Path] = []
    colors = [(220, 10, 10), (10, 220, 10), (10, 10, 220)]
    for i, color in enumerate(colors):
        img = Image.new("RGB", (48, 48), color)
        fp = temp_dir / f"img_{i}.png"
        img.save(fp)
        out.append(fp)
    return out


def _seed_index(folder: Path, paths: List[Path]):
    store = IndexStore(folder)
    store.state.paths = [str(p) for p in paths]
    store.state.mtimes = [p.stat().st_mtime for p in paths]
    # Simple orthogonal embeddings
    dim = len(paths)
    vecs = []
    for i, _ in enumerate(paths):
        v = np.zeros((dim,), dtype=np.float32)
        v[i] = 1.0
        vecs.append(v)
    store.state.embeddings = np.stack(vecs).astype(np.float32)
    store.save()


def _cache_files(index_dir: Path) -> List[Path]:
    return list(index_dir.glob("search_cache_*.json"))


def test_cached_search_cold_and_warm(client: TestClient, temp_dir: Path, sample_images: List[Path]):
    _seed_index(temp_dir, sample_images)
    payload = {
        "dir": str(temp_dir),
        "query": "red",
        "top_k": 3,
        "provider": "local",
        "use_fast": False,
        "use_captions": False,
        "use_ocr": False,
    }
    # Cold miss
    r1 = client.post("/search/cached", json=payload)
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["cached"] is False
    assert d1.get("cache_key")
    # Warm hit
    r2 = client.post("/search/cached", json=payload)
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["cached"] is True
    assert d2["cache_key"] == d1["cache_key"]
    # Query variation should produce new key and cached False
    payload_var = dict(payload)
    payload_var["query"] = "green"
    r3 = client.post("/search/cached", json=payload_var)
    assert r3.status_code == 200
    d3 = r3.json()
    assert d3["cached"] is False
    assert d3["cache_key"] != d1["cache_key"]


def test_cached_search_ttl_invalidation(client: TestClient, temp_dir: Path, sample_images: List[Path]):
    _seed_index(temp_dir, sample_images)
    payload = {"dir": str(temp_dir), "query": "primary", "top_k": 2, "provider": "local"}
    r1 = client.post("/search/cached", json=payload)
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["cached"] is False
    cache_key = d1["cache_key"]
    store = IndexStore(temp_dir)
    cache_file = store.index_dir / f"search_cache_{cache_key}.json"
    assert cache_file.exists()
    # Simulate expiry by rewinding timestamp >1h
    try:
        data = json.loads(cache_file.read_text())
        data["timestamp"] = time.time() - 4000
        cache_file.write_text(json.dumps(data), encoding="utf-8")
    except Exception:
        pytest.skip("Could not manipulate cache timestamp")
    # Second request should be treated as miss again
    r2 = client.post("/search/cached", json=payload)
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["cached"] is False


def test_cached_search_index_mutation_invalidates(client: TestClient, temp_dir: Path, sample_images: List[Path]):
    _seed_index(temp_dir, sample_images)
    payload = {"dir": str(temp_dir), "query": "blue", "top_k": 3, "provider": "local"}
    r1 = client.post("/search/cached", json=payload)
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["cached"] is False
    cache_key = d1["cache_key"]
    store = IndexStore(temp_dir)
    cache_file = store.index_dir / f"search_cache_{cache_key}.json"
    assert cache_file.exists()
    # Touch embeddings file (or index dir) to force newer mtime
    for p in store.index_dir.glob("**/*"):
        try:
            if p.is_file():
                os.utime(p, (time.time() + 5, time.time() + 5))
                break
        except Exception:
            continue
    # Next call should be uncached
    r2 = client.post("/search/cached", json=payload)
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["cached"] is False


def test_cached_search_favorites_and_tags_filter(client: TestClient, temp_dir: Path, sample_images: List[Path]):
    _seed_index(temp_dir, sample_images)
    fav_target = str(sample_images[0])
    # Mark favorite via favorites endpoint
    fav_payload = {"dir": str(temp_dir), "path": fav_target, "favorite": True}
    r_fav = client.post("/favorites", json=fav_payload)
    assert r_fav.status_code == 200
    # First cached search with favorites_only should miss
    payload = {"dir": str(temp_dir), "query": "color", "top_k": 3, "provider": "local", "favorites_only": True}
    r1 = client.post("/search/cached", json=payload)
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["cached"] is False
    assert any(res["path"] == fav_target for res in d1["results"])  # favorite included
    # Warm request should be cached
    r2 = client.post("/search/cached", json=payload)
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["cached"] is True

    # Tag filtering
    tag_target = str(sample_images[1])
    tag_payload = {"dir": str(temp_dir), "path": tag_target, "tags": ["special"]}
    r_tag = client.post("/tags", json=tag_payload)
    assert r_tag.status_code == 200
    payload_tags = {"dir": str(temp_dir), "query": "color", "top_k": 3, "provider": "local", "tags": ["special"]}
    r3 = client.post("/search/cached", json=payload_tags)
    assert r3.status_code == 200
    d3 = r3.json()
    assert d3["cached"] is False
    assert all(res["path"] != fav_target for res in d3["results"])  # ensure it filtered to tag target only if embeddings order stable
    # Second identical call should be cached
    r4 = client.post("/search/cached", json=payload_tags)
    assert r4.status_code == 200
    d4 = r4.json()
    assert d4["cached"] is True
