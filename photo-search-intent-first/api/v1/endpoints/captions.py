"""
Captions-related endpoints for API v1.
"""
from fastapi import APIRouter, Body, HTTPException, Query, Depends
from typing import Dict, Any, Optional, List

from api.schemas.v1 import SuccessResponse
from api.utils import _from_body, _require
from api.auth import require_auth
from adapters.provider_factory import get_provider
from infra.index_store import IndexStore
from pathlib import Path

# Create router for captions endpoints
captions_router = APIRouter(prefix="/captions", tags=["captions"])


@captions_router.post("/generate", response_model=SuccessResponse)
def generate_captions_v1(
    directory: Optional[str] = None,
    batch_size: Optional[int] = None,
    provider: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Generate captions for images in a directory.
    """
    dir_value = _require(_from_body(body, directory, "dir"), "dir")
    batch_size_value = _from_body(body, batch_size, "batch_size", default=8, cast=int) or 8
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    # Get the provider for captioning
    kwargs = {}
    if hf_token_value:
        kwargs['hf_token'] = hf_token_value
    if openai_key_value:
        kwargs['openai_api_key'] = openai_key_value
    
    caption_provider = get_provider(provider_value, **kwargs)

    # Load the store
    store = IndexStore(folder)
    store.load()

    # Generate captions for images
    # This is a simplified implementation - you would implement the actual captioning logic
    try:
        # In a real implementation, you would call the caption_provider to generate captions
        # for the images in the store.state.paths
        image_paths = store.state.paths or []
        
        # Placeholder for actual captioning implementation
        # This would process images in batches and generate captions
        caption_results = []
        
        # Process images in batches
        for i in range(0, len(image_paths), batch_size_value):
            batch_paths = image_paths[i:i+batch_size_value]
            # In a real implementation, call the caption provider for this batch
            # For now, we'll return a mock response
            for path in batch_paths:
                caption_results.append({
                    "path": path,
                    "caption": f"Caption for {Path(path).name}",
                    "status": "success"
                })
        
        return SuccessResponse(
            ok=True,
            data={
                "total_processed": len(caption_results),
                "results": caption_results
            }
        )
    except Exception as e:
        raise HTTPException(500, f"Caption generation failed: {str(e)}")


@captions_router.get("/status", response_model=SuccessResponse)
def captions_status_v1(
    directory: str = Query(..., alias="dir"),
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Get the status of captions generation for a directory.
    """
    folder = Path(directory)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    store = IndexStore(folder)
    if store.captions_available():
        captions_file = store.captions_file
        if captions_file and captions_file.exists():
            import json
            try:
                captions_data = json.loads(captions_file.read_text())
                total_captions = len(captions_data.get('paths', []))
                return SuccessResponse(
                    ok=True,
                    data={
                        "available": True,
                        "total_captions": total_captions,
                        "captions_file": str(captions_file)
                    }
                )
            except Exception as e:
                return SuccessResponse(
                    ok=True,
                    data={
                        "available": False,
                        "error": str(e)
                    }
                )
    
    return SuccessResponse(
        ok=True,
        data={
            "available": False,
            "message": "No captions available for this directory"
        }
    )


@captions_router.get("/list", response_model=SuccessResponse)
def list_captions_v1(
    directory: str = Query(..., alias="dir"),
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    List available captions for the indexed photos.
    """
    folder = Path(directory)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    store = IndexStore(folder)
    if not store.captions_available() or not store.captions_file.exists():
        return SuccessResponse(
            ok=True,
            data={
                "captions": {},
                "message": "No captions available for this directory"
            }
        )

    import json
    try:
        captions_data = json.loads(store.captions_file.read_text())
        paths = captions_data.get('paths', [])
        texts = captions_data.get('texts', [])
        
        captions_map = dict(zip(paths, texts))
        return SuccessResponse(
            ok=True,
            data={
                "captions": captions_map,
                "total": len(captions_map)
            }
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to load captions: {str(e)}")