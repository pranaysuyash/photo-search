from __future__ import annotations

from pathlib import Path
from typing import List, Optional

import numpy as np
from PIL import Image


class HfCaptionEmbed:
    """Caption images with Hugging Face Inference API, then embed captions.

    - Caption model default: Salesforce/blip-image-captioning-large
    - Embedding model default: sentence-transformers/all-MiniLM-L6-v2
    """

    def __init__(self, token: Optional[str] = None, cap_model: str = "Salesforce/blip-image-captioning-large", emb_model: str = "sentence-transformers/all-MiniLM-L6-v2") -> None:
        self.token = token
        self.cap_model = cap_model
        self.emb_model = emb_model
        self._index_id = f"hfcap-{cap_model}-emb-{emb_model}".replace('/', '_')

    @property
    def dim(self) -> int:
        # all-MiniLM-L6-v2 -> 384 dims typically
        return 384

    @property
    def index_id(self) -> str:
        return self._index_id

    def _headers(self) -> dict:
        h = {}
        if self.token:
            h["Authorization"] = f"Bearer {self.token}"
        return h

    def _caption(self, path: Path) -> str:
        import requests
        from io import BytesIO
        try:
            with Image.open(path).convert('RGB') as img:
                buf = BytesIO()
                img.save(buf, format="PNG")
            r = requests.post(
                f"https://api-inference.huggingface.co/models/{self.cap_model}",
                headers={**self._headers(), "Content-Type": "application/octet-stream"},
                data=buf.getvalue(),
                timeout=60,
            )
            r.raise_for_status()
            data = r.json()
            if isinstance(data, list) and data and isinstance(data[0], dict) and 'generated_text' in data[0]:
                return (data[0]['generated_text'] or '').strip()
            if isinstance(data, list) and data and isinstance(data[0], str):
                return data[0].strip()
        except Exception:
            pass
        return ""

    def _embed_texts(self, texts: List[str]) -> np.ndarray:
        import requests, json
        try:
            payload = {"inputs": texts}
            r = requests.post(
                f"https://api-inference.huggingface.co/pipeline/feature-extraction/{self.emb_model}",
                headers={**self._headers(), "Content-Type": "application/json"},
                data=json.dumps(payload),
                timeout=60,
            )
            r.raise_for_status()
            data = r.json()
            arr = np.array(data, dtype=np.float32)
            if arr.ndim == 3:
                arr = arr.mean(axis=1)
            if arr.ndim == 1:
                arr = arr.reshape(1, -1)
        except Exception:
            arr = np.zeros((len(texts), self.dim), dtype=np.float32)
        norms = np.linalg.norm(arr, axis=1, keepdims=True) + 1e-8
        return (arr / norms).astype(np.float32)

    def embed_images(self, paths: List[Path], batch_size: int = 4) -> np.ndarray:
        caps = [self._caption(p) for p in paths]
        return self._embed_texts(caps)

    def embed_text(self, query: str) -> np.ndarray:
        return self._embed_texts([query])[0]

