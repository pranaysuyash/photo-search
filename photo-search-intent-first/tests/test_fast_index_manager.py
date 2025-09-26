from pathlib import Path
from typing import List

import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

from infra.index_store import IndexStore
from infra.fast_index import FastIndexManager
from api.server import app  # fast endpoints live here


class _Dummy:
    def __init__(self, dim: int = 32) -> None:
        self._dim = dim

    @property
    def index_id(self) -> str:
        return "dummy"

    def embed_images(self, paths: List[Path], batch_size: int = 16) -> np.ndarray:
        embs = []
        for p in paths:
            with Image.open(p).convert("RGB") as img:
                arr = np.array(img).astype(np.float32)
                mean = arr.mean(axis=(0, 1)) / 255.0
            v = np.zeros(self._dim, dtype=np.float32)
            v[:3] = mean / (np.linalg.norm(mean) + 1e-8)
            embs.append(v)
        return np.vstack(embs) if embs else np.zeros((0, self._dim), dtype=np.float32)

    def embed_text(self, query: str) -> np.ndarray:
        v = np.zeros(self._dim, dtype=np.float32)
        q = (query or "").lower()
        if "red" in q:
            v[0] = 1.0
        if "green" in q:
            v[1] = 1.0
        if "blue" in q:
            v[2] = 1.0
        n = np.linalg.norm(v) + 1e-8
        return v / n


def _mkimg(path: Path, color: tuple[int, int, int]) -> None:
    img = Image.new("RGB", (40, 40), color=color)
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)


def _seed(root: Path) -> IndexStore:
    root.mkdir(parents=True, exist_ok=True)
    _mkimg(root / "red.png", (255, 0, 0))
    _mkimg(root / "green.png", (0, 255, 0))
    _mkimg(root / "blue.png", (0, 0, 255))
    store = IndexStore(root)
    dummy = _Dummy()
    photos = [type("Photo", (), {"path": p, "mtime": p.stat().st_mtime}) for p in sorted(root.glob("*.png"))]
    new_c, upd_c = store.upsert(dummy, photos, batch_size=8)
    assert new_c == 3 and upd_c == 0
    return store


def test_status_reports_backends(tmp_path: Path):
    store = _seed(tmp_path / "imgs")
    fim = FastIndexManager(store)
    st = fim.status()
    kinds = [b["kind"] for b in st["backends"]]
    assert kinds == ["faiss", "hnsw", "annoy"]
    for b in st["backends"]:
        assert set(b.keys()) >= {"kind", "available", "built", "size", "dim", "error"}


def test_build_and_auto_selection(tmp_path: Path):
    store = _seed(tmp_path / "imgs")
    fim = FastIndexManager(store)
    dummy = _Dummy()
    # Try building each; they may return False if lib missing.
    built_any = False
    for kind in ("annoy", "hnsw", "faiss"):
        ok = fim.build(kind)
        built_any = built_any or ok
    res, meta = fim.search(dummy, "red", top_k=1, use_fast=True, fast_kind_hint=None)
    assert res
    if built_any:
        assert meta["backend"] in {"faiss", "hnsw", "annoy"}
    else:
        assert meta["backend"] == "exact"


def test_api_fast_endpoints_and_search_metadata(tmp_path: Path):
    store = _seed(tmp_path / "imgs")
    client = TestClient(app)

    # Status endpoint should work even if no fast indexes built
    r = client.get("/fast/status", params={"dir": str(store.root_dir)})
    assert r.status_code == 200
    data = r.json()
    assert "backends" in data

    # Build attempt (choose annoy as the lightest) - may fail if missing library, that's ok
    r2 = client.post("/fast/build", json={"dir": str(store.root_dir), "kind": "annoy"})
    assert r2.status_code in (200, 400)  # 400 could be invalid folder but we supplied valid, so expect 200
    if r2.status_code == 200:
        assert r2.json()["kind"] == "annoy"

    # Search API path: we only assert metadata presence; we call the generic search endpoint variant that was modified
    # Identify parameter names for use_fast and fast_kind_hint; they are part of form in main search route
    payload = {
        "dir": str(store.root_dir),
        "query": "red",
        "provider": "local",
        "use_fast": True,
        "fast_kind": "auto",
    }
    r3 = client.post("/search", json=payload)
    assert r3.status_code == 200
    payload = r3.json()
    # payload may have either list or dict with 'results'
    if isinstance(payload, dict) and "results" in payload:
        meta_backend = payload.get("fast_backend")
        assert "fast_backend" in payload and "fast_fallback" in payload
        if meta_backend != "exact":
            assert meta_backend in {"faiss", "hnsw", "annoy"}
    else:
        # In case search returns raw list (legacy path) we skip
        pass
