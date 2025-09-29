"""
Model management routes - CLIP model capabilities, download, and validation.

Handles ML model availability detection, model downloading,
and offline model validation for CLIP embedding providers.
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from pathlib import Path
import json
import importlib.util
from pydantic import BaseModel

router = APIRouter()


@router.get("/models/capabilities")
def api_models_capabilities() -> Dict[str, Any]:
    """Report availability of optional ML libraries without importing heavy modules unnecessarily.

    Uses importlib.util.find_spec to avoid triggering Pylint unused-import warnings while still
    cheaply detecting whether packages are installed. Torch is imported (if present) to probe
    CUDA/MPS capabilities which require runtime introspection.
    """
    caps: Dict[str, Any] = {"transformers": False, "torch": False, "cuda": False, "mps": False}
    
    # Torch (needed to check backend capabilities)
    try:  # pragma: no cover - environment dependent
        import torch  # type: ignore
        caps["torch"] = True
        caps["cuda"] = bool(getattr(torch, "cuda", None) and torch.cuda.is_available())
        mps = getattr(getattr(torch, "backends", None), "mps", None)
        caps["mps"] = bool(mps and mps.is_available())
    except Exception:
        pass
    
    # Transformers (lightweight spec check to avoid importing large libs if not needed)
    try:
        caps["transformers"] = importlib.util.find_spec("transformers") is not None
    except Exception:
        pass
    
    return {"ok": True, "capabilities": caps}


class ModelDownloadReq(BaseModel):
    model: str = "openai/clip-vit-base-patch32"


@router.post("/models/download")
def api_models_download(req: ModelDownloadReq) -> Dict[str, Any]:
    """Download a CLIP model from HuggingFace model hub."""
    try:
        from transformers import AutoProcessor, CLIPModel  # type: ignore
        _ = AutoProcessor.from_pretrained(req.model)
        _ = CLIPModel.from_pretrained(req.model)
        return {"ok": True, "model": req.model}
    except Exception as e:
        raise HTTPException(500, f"Model download failed: {e}")


class ModelValidateReq(BaseModel):
    dir: str


@router.post("/models/validate")
def api_models_validate(req: ModelValidateReq) -> Dict[str, Any]:
    """Validate CLIP models in a directory for offline use."""
    try:
        model_dir = Path(req.dir)
        if not model_dir.exists():
            return {"ok": False, "error": "Directory not found"}

        # Check for CLIP model components
        required_files = [
            "config.json",
            "pytorch_model.bin",  # or model.safetensors
            "preprocessor_config.json"
        ]

        optional_files = [
            "model.safetensors",
            "tokenizer.json",
            "vocab.json",
            "merges.txt",
            "special_tokens_map.json",
            "tokenizer_config.json"
        ]

        found_required = []
        found_optional = []
        missing_required = []

        # Check required files
        for filename in required_files:
            if (model_dir / filename).exists():
                found_required.append(filename)
            else:
                missing_required.append(filename)

        # Check for alternative model file
        if "pytorch_model.bin" not in found_required:
            if (model_dir / "model.safetensors").exists():
                found_required.append("model.safetensors")
            else:
                if "pytorch_model.bin" not in missing_required:
                    missing_required.append("pytorch_model.bin")

        # Check optional files
        for filename in optional_files:
            if (model_dir / filename).exists():
                found_optional.append(filename)

        # Determine if model is valid
        is_valid = len(missing_required) == 0

        # Try to extract model info from config
        model_info = {}
        config_path = model_dir / "config.json"
        if config_path.exists():
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    model_info = {
                        "model_type": config.get("model_type", "unknown"),
                        "hidden_size": config.get("hidden_size"),
                        "num_attention_heads": config.get("num_attention_heads"),
                        "num_hidden_layers": config.get("num_hidden_layers"),
                        "vocab_size": config.get("vocab_size")
                    }
            except Exception:
                pass

        return {
            "ok": True,
            "valid": is_valid,
            "model_dir": str(model_dir),
            "model_info": model_info,
            "found_required": found_required,
            "found_optional": found_optional,
            "missing_required": missing_required,
            "message": "Model validation complete"
        }

    except Exception as e:
        return {"ok": False, "error": f"Validation failed: {str(e)}"}