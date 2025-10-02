from __future__ import annotations

from typing import Optional
import os
from pathlib import Path


def get_provider(
    name: str,
    hf_token: Optional[str] = None,
    openai_api_key: Optional[str] = None,
    st_model: Optional[str] = None,
    tf_model: Optional[str] = None,
    hf_model: Optional[str] = None,
    openai_caption_model: Optional[str] = None,
    openai_embed_model: Optional[str] = None,
):
    name = (name or "").lower()
    
    # Check for offline mode
    offline = os.getenv("OFFLINE_MODE") == "1"
    
    if name in ("local", "transformers", "fast", "clip-fast", "transformers-fast"):
        # Import heavy ML library only when needed, not at module load time
        from adapters.embedding_transformers_clip import TransformersClipEmbedding
        model_name = tf_model or "openai/clip-vit-base-patch32"
        if offline:
            # Use bundled model directory
            bundled_dir = _find_bundled_model_dir()
            if bundled_dir:
                # Map model name to bundled directory
                if "base-patch32" in model_name:
                    model_path = bundled_dir / "clip-vit-base-patch32"
                else:
                    model_path = bundled_dir / "clip-vit-b-32"
                if model_path.exists():
                    model_name = str(model_path)
        return TransformersClipEmbedding(model_name=model_name)
    if name in ("local-compat", "clip", "clip-local"):
        # Import heavy ML library only when needed, not at module load time
        from adapters.embedding_clip import ClipEmbedding
        return ClipEmbedding(model_name=st_model or "clip-ViT-B-32")
    if name in ("hf", "huggingface"):
        from adapters.embedding_hf_api import HfClipAPI
        return HfClipAPI(model=hf_model or "sentence-transformers/clip-ViT-B-32", token=hf_token)
    if name in ("hf-caption", "huggingface-caption"):
        from adapters.embedding_hf_caption import HfCaptionEmbed
        return HfCaptionEmbed(token=hf_token)
    if name in ("openai", "openai-caption"):
        from adapters.embedding_openai_caption import OpenAICaptionEmbed
        return OpenAICaptionEmbed(api_key=openai_api_key, caption_model=openai_caption_model or "gpt-4o-mini", embed_model=openai_embed_model or "text-embedding-3-small")
    # default - import heavy ML library only when needed
    from adapters.embedding_clip import ClipEmbedding
    return ClipEmbedding(model_name=st_model or "clip-ViT-B-32")


def _find_bundled_model_dir() -> Path | None:
    """Find the bundled model directory relative to this file."""
    # Look for electron/models relative to the project root
    base = Path(__file__).resolve().parent.parent
    candidates = [
        base / "electron" / "models",
        base.parent / "electron" / "models",
    ]
    for cand in candidates:
        if cand.exists() and cand.is_dir():
            return cand
    return None
