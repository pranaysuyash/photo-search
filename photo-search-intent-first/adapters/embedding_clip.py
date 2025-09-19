from typing import List, Optional

import numpy as np
import os
from sentence_transformers import SentenceTransformer

from adapters.fs_scanner import safe_open_image
from pathlib import Path


class ClipEmbedding:
    def __init__(self, model_name: str = "clip-ViT-B-32", device: Optional[str] = None) -> None:
        # Honor offline mode and local cache directory if provided
        offline = os.getenv("OFFLINE_MODE", "").lower() in ("1", "true", "yes")
        local_dir = os.getenv("PHOTOVAULT_MODEL_DIR") or os.getenv("SENTENCE_TRANSFORMERS_HOME")
        if local_dir:
            os.environ.setdefault("SENTENCE_TRANSFORMERS_HOME", local_dir)
        if offline:
            os.environ.setdefault("HF_HUB_OFFLINE", "1")
            os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
        # Load model; if a local_dir exists, try that path first
        try_names = [model_name]
        if local_dir:
            try_names.insert(0, os.path.join(local_dir, model_name))
        last_err: Optional[Exception] = None
        for name in try_names:
            try:
                self.model = SentenceTransformer(name, device=device)
                break
            except Exception as e:  # keep trying
                last_err = e
                self.model = None  # type: ignore
        if self.model is None:  # type: ignore
            # Re-raise the last error for visibility
            raise last_err  # type: ignore
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
