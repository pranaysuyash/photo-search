from __future__ import annotations

from typing import List, Optional
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from transformers import CLIPModel, AutoProcessor

from adapters.fs_scanner import safe_open_image


def _auto_device():
    if torch.cuda.is_available():
        return torch.device("cuda")
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


class TransformersClipEmbedding:
    def __init__(self, model_name: str = "openai/clip-vit-base-patch32", device: Optional[str] = None) -> None:
        self.device = torch.device(device) if device else _auto_device()
        # Prefer fast processor; fallback to slow if unavailable (e.g., no torchvision)
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
    def dim(self) -> int:
        # CLIP text/image projection dimension
        return int(self.model.config.projection_dim)

    @property
    def index_id(self) -> str:
        return self._index_id

    @torch.no_grad()
    def embed_images(self, paths: List[Path], batch_size: int = 32) -> np.ndarray:
        images: list[Image.Image] = []
        valid_idx: list[int] = []
        for i, p in enumerate(paths):
            img = safe_open_image(p)
            if img is not None:
                images.append(img)
                valid_idx.append(i)
        if not images:
            return np.zeros((len(paths), self.dim), dtype=np.float32)
        embs_acc: list[np.ndarray] = []
        for i in range(0, len(images), batch_size):
            batch = images[i:i+batch_size]
            inputs = self.processor(images=batch, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            feats = self.model.get_image_features(**inputs)
            feats = torch.nn.functional.normalize(feats, dim=-1)
            embs_acc.append(feats.cpu().numpy())
        embs = np.vstack(embs_acc).astype(np.float32)
        result = np.zeros((len(paths), embs.shape[1]), dtype=np.float32)
        for j, i in enumerate(valid_idx):
            result[i] = embs[j]
        return result

    @torch.no_grad()
    def embed_text(self, query: str) -> np.ndarray:
        inputs = self.processor(text=[query], return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        feats = self.model.get_text_features(**inputs)
        feats = torch.nn.functional.normalize(feats, dim=-1)
        return feats[0].detach().cpu().numpy().astype(np.float32)
