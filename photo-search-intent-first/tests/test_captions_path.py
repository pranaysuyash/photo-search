from pathlib import Path
from typing import List

import numpy as np
from PIL import Image

from infra.index_store import IndexStore


class _DummyEmb:
    def __init__(self, dim: int = 32) -> None:
        self._dim = dim

    def embed_images(self, paths: List[Path], batch_size: int = 16) -> np.ndarray:
        out = []
        for p in paths:
            # deterministic based on filename
            v = np.zeros(self._dim, dtype=np.float32)
            name = p.name.lower()
            if "beach" in name:
                v[0] = 1
            if "dog" in name:
                v[1] = 1
            if "sunset" in name:
                v[2] = 1
            n = np.linalg.norm(v) + 1e-8
            out.append(v / n)
        return np.vstack(out) if out else np.zeros((0, self._dim), dtype=np.float32)

    def embed_text(self, text: str) -> np.ndarray:
        v = np.zeros(self._dim, dtype=np.float32)
        t = (text or "").lower()
        if "beach" in t:
            v[0] = 1
        if "dog" in t:
            v[1] = 1
        if "sunset" in t:
            v[2] = 1
        n = np.linalg.norm(v) + 1e-8
        return v / n


class _FakeVLM:
    def caption_path(self, p: Path) -> str:
        name = p.name.lower()
        if "beach" in name:
            return "a beach at sunset"
        if "dog" in name:
            return "a dog on grass"
        return "an image"


def _mkimg(path: Path, color: tuple[int, int, int]) -> None:
    img = Image.new("RGB", (64, 64), color=color)
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)


def test_captions_build_and_search(tmp_path: Path) -> None:
    root = tmp_path / "imgs"
    _mkimg(root / "beach.png", (200, 200, 0))
    _mkimg(root / "dog.png", (0, 200, 0))

    store = IndexStore(root)
    emb = _DummyEmb()
    photos = [type("Photo", (), {"path": p, "mtime": p.stat().st_mtime}) for p in sorted(root.glob("*.png"))]
    store.upsert(emb, photos, batch_size=8)

    # Build captions with fake VLM
    vlm = _FakeVLM()
    updated = store.build_captions(vlm, emb)
    assert updated >= 2

    # Search with captions weighting should retrieve beach for beach query
    res = store.search_with_captions(emb, "beach at sunset", top_k=2)
    assert res and any(r.path.name == "beach.png" for r in res)

