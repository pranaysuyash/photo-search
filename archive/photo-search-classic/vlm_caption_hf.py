from __future__ import annotations

from pathlib import Path
from typing import Optional


class VlmCaptionHF:
    def __init__(self, model: str = "Qwen/Qwen2-VL-2B-Instruct", hf_token: Optional[str] = None) -> None:
        from transformers import pipeline  # lazy
        self._pipe = pipeline(task="image-to-text", model=model, token=hf_token)

    def caption_path(self, path: Path) -> str:
        try:
            out = self._pipe(str(path))
            if isinstance(out, list) and out:
                item = out[0]
                if isinstance(item, dict) and "generated_text" in item:
                    return str(item["generated_text"]).strip()
                return str(item).strip()
            return ""
        except Exception:
            return ""

