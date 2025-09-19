from pathlib import Path
from typing import List

import numpy as np
from PIL import Image

from infra.index_store import IndexStore


class _Dummy:
    def __init__(self, dim: int = 32) -> None:
        self._dim = dim

    @property
    def index_id(self) -> str:  # emulate provider key
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
    img = Image.new("RGB", (80, 80), color=color)
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)


def test_optional_fast_indexes(tmp_path: Path) -> None:
    # Seed small dataset
    root = tmp_path / "imgs"
    _mkimg(root / "red.png", (255, 0, 0))
    _mkimg(root / "green.png", (0, 255, 0))
    _mkimg(root / "blue.png", (0, 0, 255))

    # Build base index
    store = IndexStore(root)
    dummy = _Dummy()
    photos = [type("Photo", (), {"path": p, "mtime": p.stat().st_mtime}) for p in sorted(root.glob("*.png"))]
    new_c, upd_c = store.upsert(dummy, photos, batch_size=16)
    assert new_c == 3 and upd_c == 0

    # Baseline search works
    base = store.search(dummy, "red", top_k=1)
    assert base and base[0].path.name == "red.png"

    # Annoy (may be missing) — build returns False if lib not present
    ok_ann = store.build_annoy(trees=10)
    if ok_ann:
        res = store.search_annoy(dummy, "red", top_k=2)
        assert res

    # HNSW (optional)
    ok_hnsw = store.build_hnsw()
    if ok_hnsw:
        res = store.search_hnsw(dummy, "red", top_k=2)
        assert res

    # FAISS (optional)
    ok_faiss = store.build_faiss()
    if ok_faiss:
        res = store.search_faiss(dummy, "red", top_k=2)
        assert res
