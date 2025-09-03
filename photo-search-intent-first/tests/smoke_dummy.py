from pathlib import Path
from typing import List

import numpy as np
from PIL import Image, ImageDraw

from infra.index_store import IndexStore


class DummyEmbedder:
    def __init__(self, dim: int = 32):
        self._dim = dim

    @property
    def dim(self) -> int:
        return self._dim

    def embed_images(self, paths: List[Path], batch_size: int = 32) -> np.ndarray:
        embs = []
        for p in paths:
            img = Image.open(p).convert("RGB")
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


def _make_image(path: Path, color: tuple[int, int, int]):
    img = Image.new("RGB", (100, 100), color=color)
    d = ImageDraw.Draw(img)
    d.text((10, 40), str(color), fill=(255, 255, 255))
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)


def run(tmp_root: Path):
    img_dir = tmp_root / "imgs"
    # Clean any previous index/files
    import shutil
    shutil.rmtree(img_dir, ignore_errors=True)
    _make_image(img_dir / "red.png", (255, 0, 0))
    _make_image(img_dir / "green.png", (0, 255, 0))
    _make_image(img_dir / "blue.png", (0, 0, 255))

    store = IndexStore(img_dir)
    dummy = DummyEmbedder()
    # Build paths list similar to adapters.fs_scanner.list_photos
    photos = []
    for p in sorted(list(img_dir.glob("*.png")) + list(img_dir.glob("*.jpg")) + list(img_dir.glob("*.jpeg"))):
        photos.append(type("Photo", (), {"path": p, "mtime": p.stat().st_mtime}))

    new_count, updated_count = store.upsert(dummy, photos, batch_size=16)
    assert new_count == 3
    assert updated_count == 0

    results = store.search(dummy, "red", top_k=2)
    assert results and results[0].path.name == "red.png"
    print("OK intent-first dummy smoke: ", results[0].path.name)


if __name__ == "__main__":
    run(Path("/tmp/photo_search_intent_test"))
