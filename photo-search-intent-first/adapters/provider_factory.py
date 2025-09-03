from __future__ import annotations

from typing import Optional

from adapters.embedding_clip import ClipEmbedding


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
    if name in ("local", "transformers", "fast", "clip-fast", "transformers-fast"):
        from adapters.embedding_transformers_clip import TransformersClipEmbedding
        return TransformersClipEmbedding(model_name=tf_model or "openai/clip-vit-base-patch32")
    if name in ("local-compat", "clip", "clip-local"):
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
    # default
    return ClipEmbedding(model_name=st_model or "clip-ViT-B-32")
