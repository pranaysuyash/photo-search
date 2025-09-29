from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, HTTPException

from adapters.vlm_caption_hf import VlmCaptionHF
from api.utils import _emb, _from_body, _require
from infra.analytics import _write_event as _write_event_infra
from infra.index_store import IndexStore

# Legacy router without prefix for parity with original_server.py routes
router = APIRouter(tags=["captions"])


@router.post("/captions/build")
def api_build_captions(
    directory: Optional[str] = None,
    vlm_model: Optional[str] = None,
    provider: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Build captions for photos using Vision-Language Models (VLM)."""
    dir_value = _require(_from_body(body, directory, "dir"), "dir")
    model_value = _from_body(body, vlm_model, "vlm_model", default="Qwen/Qwen2-VL-2B-Instruct") or "Qwen/Qwen2-VL-2B-Instruct"
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    vlm = VlmCaptionHF(model=model_value, hf_token=hf_token_value)
    emb = _emb(provider_value, hf_token_value, openai_key_value)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    updated = store.build_captions(vlm, emb)
    _write_event_infra(store.index_dir, { 'type': 'captions_build', 'updated': updated, 'model': model_value })
    return {"updated": updated}