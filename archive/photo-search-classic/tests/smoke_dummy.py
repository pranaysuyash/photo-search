from pathlib import Path
from typing import List

import numpy as np
from PIL import Image, ImageDraw

from engine import IndexStore


class DummyModel:
    def __init__(self, dim: int = 32) -> None:
        self._dim = dim

    def get_sentence_embedding_dimension(self) -> int:
        return self._dim

    def encode(self, items: List, batch_size: int = 32, convert_to_numpy: bool = True, show_progress_bar: bool = False, normalize_embeddings: bool = True):
        if not items:
            return np.zeros((0, self._dim), dtype=np.float32)
        if isinstance(items[0], Image.Image):
            embs = []
            for img in items:
                arr = np.array(img).astype(np.float32)
                mean = arr.mean(axis=(0, 1)) / 255.0  # RGB
                v = np.zeros(self._dim, dtype=np.float32)
                v[:3] = mean / (np.linalg.norm(mean) + 1e-8)
                embs.append(v)
            return np.vstack(embs)
        else:
            # text
            embs = []
            for t in items:
                t = (t or "").lower()
                v = np.zeros(self._dim, dtype=np.float32)
                if "red" in t:
                    v[0] = 1.0
                if "green" in t:
                    v[1] = 1.0
                if "blue" in t:
                    v[2] = 1.0
                n = np.linalg.norm(v) + 1e-8
                v = v / n
                embs.append(v)
            return np.vstack(embs)


def _make_image(path: Path, color: tuple[int, int, int]):
    img = Image.new("RGB", (100, 100), color=color)
    d = ImageDraw.Draw(img)
    d.text((10, 40), str(color), fill=(255, 255, 255))
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)


def run(tmp_root: Path):
    img_dir = tmp_root / "imgs"
    # Clean any previous index
    import shutil
    shutil.rmtree(img_dir, ignore_errors=True)
    _make_image(img_dir / "red.png", (255, 0, 0))
    _make_image(img_dir / "green.png", (0, 255, 0))
    _make_image(img_dir / "blue.png", (0, 0, 255))

    store = IndexStore(img_dir)
    dummy = DummyModel()
    new_count, updated_count = store.build_or_update(dummy, batch_size=16)
    assert new_count == 3
    assert updated_count == 0

    results = store.search(dummy, "red", top_k=2)
    assert results and Path(results[0][0]).name == "red.png"
    print("OK classic dummy smoke: ", results)


if __name__ == "__main__":
    run(Path("/tmp/photo_search_classic_test"))
