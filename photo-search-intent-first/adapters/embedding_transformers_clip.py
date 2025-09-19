from __future__ import annotations

from typing import List, Optional
from pathlib import Path
import os
import warnings

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
        
        # Honor offline mode and local cache directory if provided
        offline = os.getenv("OFFLINE_MODE", "").lower() in ("1", "true", "yes")
        local_dir = os.getenv("PHOTOVAULT_MODEL_DIR") or os.getenv("TRANSFORMERS_CACHE")
        if local_dir:
            os.environ.setdefault("TRANSFORMERS_CACHE", local_dir)
        if offline:
            os.environ.setdefault("HF_HUB_OFFLINE", "1")
            os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
        
        # Prefer fast processor; fallback to slow if unavailable (e.g., no torchvision)
        try_names = [model_name]
        if local_dir:
            try_names.insert(0, os.path.join(local_dir, model_name))
        last_err: Optional[Exception] = None
        for name in try_names:
            try:
                with warnings.catch_warnings():
                    warnings.filterwarnings("ignore", message=".*slow image processor.*")
                    self.processor = AutoProcessor.from_pretrained(name, use_fast=True)
                self._fast = True
                break
            except Exception as e:
                last_err = e
                self.processor = None
        if self.processor is None:
            # Fallback to slow processor
            for name in try_names:
                try:
                    with warnings.catch_warnings():
                        warnings.filterwarnings("ignore", message=".*slow image processor.*")
                        self.processor = AutoProcessor.from_pretrained(name, use_fast=False)
                    self._fast = False
                    break
                except Exception as e:
                    last_err = e
                    self.processor = None
        if self.processor is None:
            raise RuntimeError(f"Failed to load CLIP processor for {model_name}. If offline, ensure model is cached locally. Last error: {last_err}")
        
        # Load model
        for name in try_names:
            try:
                self.model = CLIPModel.from_pretrained(name)
                break
            except Exception as e:
                last_err = e
                self.model = None
        if self.model is None:
            raise RuntimeError(f"Failed to load CLIP model for {model_name}. If offline, ensure model is cached locally. Last error: {last_err}")
        
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
