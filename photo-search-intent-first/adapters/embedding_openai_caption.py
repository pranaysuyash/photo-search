from __future__ import annotations

import base64
from pathlib import Path
from typing import List, Optional

import numpy as np


class OpenAICaptionEmbed:
    """Caption images with OpenAI Vision, then embed captions with OpenAI embeddings.

    Warning: This is slow and potentially costly for large photo libraries.
    Consider limiting to small folders or sampling.
    """

    def __init__(self, api_key: Optional[str] = None, caption_model: str = "gpt-4o-mini", embed_model: str = "text-embedding-3-small") -> None:
        from openai import OpenAI  # lazy import
        self.api_key = api_key
        self.caption_model = caption_model
        self.embed_model = embed_model
        self.client = OpenAI(api_key=api_key) if api_key else OpenAI()
        self._index_id = f"openai-cap-{caption_model}-emb-{embed_model}"

    @property
    def dim(self) -> int:
        # 1536 for text-embedding-3-small
        return 1536

    @property
    def index_id(self) -> str:
        return self._index_id

    def _b64_image(self, path: Path) -> str:
        with open(path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")

    def _caption(self, path: Path) -> str:
        b64 = self._b64_image(path)
        prompt = "Describe this image succinctly with key subjects, scene, and actions."
        try:
            resp = self.client.chat.completions.create(
                model=self.caption_model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                        ],
                    }
                ],
                temperature=0.2,
                max_tokens=120,
            )
            return (resp.choices[0].message.content or "").strip()
        except Exception:
            return ""

    def _embed_texts(self, texts: List[str]) -> np.ndarray:
        try:
            resp = self.client.embeddings.create(model=self.embed_model, input=texts)
            arr = np.array([d.embedding for d in resp.data], dtype=np.float32)
        except Exception:
            arr = np.zeros((len(texts), self.dim), dtype=np.float32)
        # normalize each
        norms = np.linalg.norm(arr, axis=1, keepdims=True) + 1e-8
        return arr / norms

    def embed_images(self, paths: List[Path], batch_size: int = 4) -> np.ndarray:
        captions = [self._caption(p) for p in paths]
        return self._embed_texts(captions)

    def embed_text(self, query: str) -> np.ndarray:
        return self._embed_texts([query])[0]
