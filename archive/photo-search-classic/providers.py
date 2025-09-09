from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, List, Optional

import numpy as np


@dataclass
class ProviderInfo:
    key: str
    index_id: str


class TransformersCLIPShim:
    """On-device CLIP using transformers; exposes a SentenceTransformers-like encode()."""

    def __init__(self, model_name: str = "openai/clip-vit-base-patch32", device: Optional[str] = None) -> None:
        import torch  # lazy
        from transformers import CLIPModel, AutoProcessor  # lazy

        self._torch = torch
        self.device = torch.device(device) if device else (torch.device("cuda") if torch.cuda.is_available() else (torch.device("mps") if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available() else torch.device("cpu")))
        # prefer fast if possible
        try:
            self.processor = AutoProcessor.from_pretrained(model_name, use_fast=True)
            self._fast = True
        except Exception:
            self.processor = AutoProcessor.from_pretrained(model_name, use_fast=False)
            self._fast = False
        self.model = CLIPModel.from_pretrained(model_name)
        self.model.to(self.device)
        self.model.eval()
        self._index_id = f"hf-{model_name}{'-fast' if self._fast else ''}"

    @property
    def index_id(self) -> str:
        return self._index_id

    def _normalize(self, arr: np.ndarray) -> np.ndarray:
        n = np.linalg.norm(arr, axis=1, keepdims=True) + 1e-8
        return (arr / n).astype(np.float32)

    def encode(self, items: List[Any], batch_size: int = 32, convert_to_numpy: bool = True, show_progress_bar: bool = False, normalize_embeddings: bool = True):
        import numpy as _np
        # Image path via PIL.Image.Image or text strings
        if not items:
            # Determine dim lazily via text path
            feats = self.embed_text("dummy").reshape(1, -1)
            return _np.zeros((0, feats.shape[1]), dtype=_np.float32)
        if hasattr(items[0], "mode") or str(type(items[0])).endswith("PIL.Image.Image'>"):
            # Images
            embs_acc: list[_np.ndarray] = []
            for i in range(0, len(items), batch_size):
                batch = items[i:i+batch_size]
                inputs = self.processor(images=batch, return_tensors="pt")
                inputs = {k: v.to(self.device) for k, v in inputs.items()}
                feats = self.model.get_image_features(**inputs)
                feats = self._torch.nn.functional.normalize(feats, dim=-1)
                embs_acc.append(feats.detach().cpu().numpy())
            arr = _np.vstack(embs_acc).astype(_np.float32) if embs_acc else _np.zeros((0, self.model.config.projection_dim), dtype=_np.float32)
            return self._normalize(arr) if normalize_embeddings else arr
        else:
            # Text
            inputs = self.processor(text=[str(x) for x in items], return_tensors="pt", padding=True)
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            feats = self.model.get_text_features(**inputs)
            feats = self._torch.nn.functional.normalize(feats, dim=-1)
            arr = feats.detach().cpu().numpy().astype(_np.float32)
            return self._normalize(arr) if normalize_embeddings else arr

    def embed_text(self, query: str) -> np.ndarray:
        out = self.encode([query])
        return out[0]


class HfClipAPISlim:
    """Hugging Face Inference API client for CLIP embeddings (image+text)."""

    def __init__(self, model: str = "sentence-transformers/clip-ViT-B-32", token: Optional[str] = None) -> None:
        self.model = model
        self.token = token
        self.endpoint = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{model}"
        self._index_id = f"hfapi-{model}"

    @property
    def index_id(self) -> str:
        return self._index_id

    def _headers(self) -> dict:
        h = {}
        if self.token:
            h["Authorization"] = f"Bearer {self.token}"
        return h

    def encode(self, items: List[Any], batch_size: int = 8, convert_to_numpy: bool = True, show_progress_bar: bool = False, normalize_embeddings: bool = True):
        import json
        import requests
        import numpy as _np
        # Only handle text here to keep it simple; for images, return zero vectors (fallback)
        if not items:
            return _np.zeros((0, 512), dtype=_np.float32)
        if isinstance(items[0], str):
            payload = {"inputs": items}
            r = requests.post(self.endpoint, headers={**self._headers(), "Content-Type": "application/json"}, data=json.dumps(payload), timeout=60)
            r.raise_for_status()
            data = r.json()
            arr = _np.array(data, dtype=_np.float32)
            if arr.ndim == 1:
                arr = arr.reshape(1, -1)
            # Normalize rows
            n = _np.linalg.norm(arr, axis=1, keepdims=True) + 1e-8
            return (arr / n).astype(_np.float32) if normalize_embeddings else arr.astype(_np.float32)
        # Return zeros for image list to avoid errors; image embedding via HF API would require image uploads
        dim = 512
        return _np.zeros((len(items), dim), dtype=_np.float32)

    def embed_text(self, query: str) -> np.ndarray:
        return self.encode([query])[0]


class OpenAICaptionEmbedSlim:
    """Captions images with OpenAI then embeds caption text. Slow/paid; optional."""

    def __init__(self, api_key: Optional[str] = None, caption_model: str = "gpt-4o-mini", embed_model: str = "text-embedding-3-small") -> None:
        from openai import OpenAI  # lazy
        self.api_key = api_key
        self.caption_model = caption_model
        self.embed_model = embed_model
        self.client = OpenAI(api_key=api_key) if api_key else OpenAI()
        self._index_id = f"openai-cap-{caption_model}-emb-{embed_model}"

    @property
    def index_id(self) -> str:
        return self._index_id

    def _b64_image(self, img) -> str:
        import base64
        from io import BytesIO
        buf = BytesIO()
        img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode("utf-8")

    def _caption_one(self, img) -> str:
        try:
            b64 = self._b64_image(img)
            prompt = "Describe this image succinctly with key subjects, scene, and actions."
            resp = self.client.chat.completions.create(
                model=self.caption_model,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                    ],
                }],
                temperature=0.2,
                max_tokens=120,
            )
            return (resp.choices[0].message.content or "").strip()
        except Exception:
            return ""

    def _embed_texts(self, texts: List[str]) -> np.ndarray:
        import numpy as _np
        try:
            resp = self.client.embeddings.create(model=self.embed_model, input=texts)
            arr = _np.array([d.embedding for d in resp.data], dtype=_np.float32)
        except Exception:
            arr = _np.zeros((len(texts), 1536), dtype=_np.float32)
        n = _np.linalg.norm(arr, axis=1, keepdims=True) + 1e-8
        return (arr / n).astype(_np.float32)

    def encode(self, items: List[Any], batch_size: int = 4, convert_to_numpy: bool = True, show_progress_bar: bool = False, normalize_embeddings: bool = True):
        # If text, embed directly; if images, caption then embed
        if not items:
            return np.zeros((0, 1536), dtype=np.float32)
        if isinstance(items[0], str):
            return self._embed_texts([str(x) for x in items])
        # Assume PIL Image list
        caps = [self._caption_one(img) for img in items]
        return self._embed_texts(caps)

    def embed_text(self, query: str) -> np.ndarray:
        return self.encode([query])[0]


class HfCaptionEmbedAPI:
    """Caption images with Hugging Face Inference API, then embed captions.

    Uses two endpoints:
    - Image caption: https://api-inference.huggingface.co/models/<cap_model>
    - Text embedding: https://api-inference.huggingface.co/pipeline/feature-extraction/<emb_model>
    """

    def __init__(self, token: Optional[str] = None, cap_model: str = "Salesforce/blip-image-captioning-large", emb_model: str = "sentence-transformers/all-MiniLM-L6-v2") -> None:
        self.token = token
        self.cap_model = cap_model
        self.emb_model = emb_model
        self._index_id = f"hfcap-{cap_model}-emb-{emb_model}".replace('/', '_')

    @property
    def index_id(self) -> str:
        return self._index_id

    def _headers(self) -> dict:
        h = {}
        if self.token:
            h["Authorization"] = f"Bearer {self.token}"
        return h

    def _caption(self, img) -> str:
        import requests
        from io import BytesIO
        try:
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
            # Response shapes vary; try common ones
            if isinstance(data, list) and data and isinstance(data[0], dict) and 'generated_text' in data[0]:
                return (data[0]['generated_text'] or '').strip()
            if isinstance(data, list) and data and isinstance(data[0], str):
                return data[0].strip()
        except Exception:
            pass
        return ""

    def _embed_texts(self, texts: List[str]) -> np.ndarray:
        import requests, json
        import numpy as _np
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
            arr = _np.array(data, dtype=_np.float32)
            # If token-level features returned, average over tokens
            if arr.ndim == 3:
                arr = arr.mean(axis=1)
            if arr.ndim == 1:
                arr = arr.reshape(1, -1)
        except Exception:
            arr = _np.zeros((len(texts), 384), dtype=_np.float32)
        n = _np.linalg.norm(arr, axis=1, keepdims=True) + 1e-8
        return (arr / n).astype(_np.float32)

    def encode(self, items: List[Any], batch_size: int = 4, convert_to_numpy: bool = True, show_progress_bar: bool = False, normalize_embeddings: bool = True):
        import numpy as _np
        if not items:
            return _np.zeros((0, 384), dtype=_np.float32)
        if isinstance(items[0], str):
            return self._embed_texts([str(x) for x in items])
        # Assume images
        caps = [self._caption(img) for img in items]
        return self._embed_texts(caps)

    def embed_text(self, query: str) -> np.ndarray:
        return self._embed_texts([query])[0]

def get_provider(name: str, hf_token: Optional[str] = None, openai_api_key: Optional[str] = None, st_model: Optional[str] = None, tf_model: Optional[str] = None, hf_model: Optional[str] = None, openai_caption_model: Optional[str] = None, openai_embed_model: Optional[str] = None):
    key = (name or "").lower()
    # Align with intent-first naming: 'local' => transformers (recommended), 'local-compat' => ST
    if key in ("local", "local-fast", "transformers", "hf-local", "fast", "clip-fast"):
        return TransformersCLIPShim(model_name=tf_model or "openai/clip-vit-base-patch32")
    if key in ("local-compat", "on-device", "compatible", "st", "clip", "clip-local"):
        # SentenceTransformers
        from sentence_transformers import SentenceTransformer  # lazy
        model = SentenceTransformer(st_model or "clip-ViT-B-32")
        model.index_id = f"st-{st_model or 'clip-ViT-B-32'}"  # type: ignore[attr-defined]
        return model
    if key in ("hf", "huggingface"):
        return HfClipAPISlim(model=hf_model or "sentence-transformers/clip-ViT-B-32", token=hf_token)
    if key in ("hf-caption", "huggingface-caption"):
        return HfCaptionEmbedAPI(token=hf_token)
    if key in ("openai", "openai-caption"):
        return OpenAICaptionEmbedSlim(api_key=openai_api_key, caption_model=openai_caption_model or "gpt-4o-mini", embed_model=openai_embed_model or "text-embedding-3-small")
    # default
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(st_model or "clip-ViT-B-32")
    model.index_id = f"st-{st_model or 'clip-ViT-B-32'}"  # type: ignore[attr-defined]
    return model
