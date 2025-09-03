from __future__ import annotations

import base64
import json
from pathlib import Path
from typing import List, Optional

import numpy as np
import requests


class HfClipAPI:
    """Hugging Face Inference API wrapper for CLIP-like feature extraction.

    Uses feature-extraction pipeline on a CLIP model for both image and text.
    Defaults to sentence-transformers/clip-ViT-B-32.
    """

    def __init__(self, model: str = "sentence-transformers/clip-ViT-B-32", token: Optional[str] = None) -> None:
        self.model = model
        self.token = token
        self.endpoint = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{self.model}"
        self._index_id = f"hf-api-{self.model}"

    @property
    def dim(self) -> int:
        # We won't know until first call; not needed by callers.
        return 512

    @property
    def index_id(self) -> str:
        return self._index_id

    def _headers(self):
        h = {"Accept": "application/json"}
        if self.token:
            h["Authorization"] = f"Bearer {self.token}"
        return h

    def embed_images(self, paths: List[Path], batch_size: int = 8) -> np.ndarray:
        embs: List[np.ndarray] = []
        for p in paths:
            try:
                with open(p, "rb") as f:
                    data = f.read()
                # For images, Inference API supports raw bytes with octet-stream
                r = requests.post(self.endpoint, data=data, headers={**self._headers(), "Content-Type": "application/octet-stream"}, timeout=120)
                r.raise_for_status()
                arr = np.array(r.json(), dtype=np.float32)
                # Normalize
                n = np.linalg.norm(arr) + 1e-8
                arr = arr / n
                embs.append(arr)
            except Exception:
                embs.append(np.zeros((self.dim,), dtype=np.float32))
        return np.vstack(embs) if embs else np.zeros((0, self.dim), dtype=np.float32)

    def embed_text(self, query: str) -> np.ndarray:
        payload = {"inputs": query}
        r = requests.post(self.endpoint, headers={**self._headers(), "Content-Type": "application/json"}, data=json.dumps(payload), timeout=60)
        r.raise_for_status()
        arr = np.array(r.json(), dtype=np.float32)
        n = np.linalg.norm(arr) + 1e-8
        return arr / n
