"""Smoke tests for attention scaffold endpoints.

These tests validate placeholder functionality; they will evolve as the
attention system gains real aggregation logic.
"""
from __future__ import annotations

import shutil
import tempfile
from pathlib import Path
from typing import List

import pytest
from fastapi.testclient import TestClient

from api.server import app
from infra.analytics import log_interaction
from infra.attention_aggregator import clear_attention
from infra.index_store import IndexStore
import numpy as np


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def temp_dir():  # type: ignore[override]
    p = Path(tempfile.mkdtemp(prefix="attn_test_"))
    yield p
    shutil.rmtree(p, ignore_errors=True)


@pytest.fixture
def sample_images(temp_dir: Path) -> List[Path]:
    out: List[Path] = []
    from PIL import Image  # local import to keep optional dependency localized
    for i, color in enumerate([(255,0,0),(0,255,0),(0,0,255),(200,200,0)]):
        img = Image.new("RGB", (64, 64), color)
        fp = temp_dir / f"img_{i}.png"
        img.save(fp)
        out.append(fp)
    return out


def _seed_index(folder: Path, paths: List[Path]):
    store = IndexStore(folder)
    store.state.paths = [str(p) for p in paths]
    store.state.mtimes = [p.stat().st_mtime for p in paths]
    # minimal embeddings (dim=4) so related endpoint can function
    dim = 4
    vecs = []
    for i, _p in enumerate(paths):
        v = np.zeros((dim,), dtype=np.float32)
        v[i % dim] = 1.0
        vecs.append(v)
    store.state.embeddings = np.stack(vecs).astype(np.float32)
    store.save()


def test_popularity_endpoint(client: TestClient, temp_dir: Path, sample_images: List[Path]):
    _seed_index(temp_dir, sample_images)
    # Log extra interactions for first image to boost popularity
    target = str(sample_images[0])
    for _ in range(3):
        log_interaction(IndexStore(temp_dir).index_dir, target, "view")
    clear_attention(IndexStore(temp_dir).index_dir)
    r = client.get(f"/attention/popularity?dir={temp_dir}&limit=5")
    assert r.status_code == 200
    data = r.json()
    assert data["items"][0]["path"] == target


def test_forgotten_endpoint(client: TestClient, temp_dir: Path, sample_images: List[Path]):
    _seed_index(temp_dir, sample_images)
    r = client.get(f"/attention/forgotten?dir={temp_dir}&limit=3&days=1")
    assert r.status_code == 200
    data = r.json()
    assert "items" in data


def test_shuffle_endpoint(client: TestClient, temp_dir: Path, sample_images: List[Path]):
    _seed_index(temp_dir, sample_images)
    r = client.get(f"/attention/shuffle?dir={temp_dir}&limit=3")
    assert r.status_code == 200
    data = r.json()
    assert "items" in data


def test_clear_endpoint(client: TestClient, temp_dir: Path):
    r = client.post(f"/attention/clear?dir={temp_dir}")
    assert r.status_code == 200
    data = r.json()
    assert data.get("ok") in (True, False)  # scaffold may return bool


def test_dupes_endpoint(client: TestClient, temp_dir: Path):
    # create two identical images and one different
    img1 = temp_dir / "a.png"
    img2 = temp_dir / "b.png"
    img3 = temp_dir / "c.png"
    from PIL import Image  # local import
    Image.new("RGB", (32, 32), (10, 10, 10)).save(img1)
    Image.new("RGB", (32, 32), (10, 10, 10)).save(img2)
    Image.new("RGB", (32, 32), (200, 0, 0)).save(img3)
    _seed_index(temp_dir, [img1, img2, img3])
    r = client.get(f"/attention/dupes?dir={temp_dir}&rebuild=1")
    assert r.status_code == 200
    data = r.json()
    assert "groups" in data
    if data["groups"]:
        assert any(len(g.get("paths", [])) >= 2 for g in data["groups"])


def test_related_endpoint(client: TestClient, temp_dir: Path, sample_images: List[Path]):
    _seed_index(temp_dir, sample_images)
    target = str(sample_images[0])
    r = client.get(f"/attention/related?dir={temp_dir}&path={target}&limit=3")
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    # ensure target not echoed back
    assert all(item["path"] != target for item in data["items"])
