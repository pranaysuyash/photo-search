from typing import List, Optional

import numpy as np
from sentence_transformers import SentenceTransformer

from adapters.fs_scanner import safe_open_image
from pathlib import Path


class ClipEmbedding:
    def __init__(self, model_name: str = "clip-ViT-B-32", device: Optional[str] = None) -> None:
        self.model = SentenceTransformer(model_name, device=device)
        self._index_id = f"st-{model_name}"

    @property
    def dim(self) -> int:
        return self.model.get_sentence_embedding_dimension()

    @property
    def index_id(self) -> str:
        return self._index_id

    def embed_images(self, paths: List[Path], batch_size: int = 32) -> np.ndarray:
        images = []
        valid_idx: list[int] = []
        for i, p in enumerate(paths):
            img = safe_open_image(p)
            if img is not None:
                images.append(img)
                valid_idx.append(i)
        if not images:
            return np.zeros((len(paths), self.dim), dtype=np.float32)
        embs = self.model.encode(images, batch_size=batch_size, convert_to_numpy=True, show_progress_bar=False, normalize_embeddings=True)
        result = np.zeros((len(paths), embs.shape[1]), dtype=np.float32)
        for j, i in enumerate(valid_idx):
            result[i] = embs[j]
        return result

    def embed_text(self, query: str) -> np.ndarray:
        return self.model.encode([query], convert_to_numpy=True, normalize_embeddings=True)[0]
