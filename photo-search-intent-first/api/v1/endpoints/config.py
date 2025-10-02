"""
Config-related endpoints for API v1.
"""
from fastapi import APIRouter, Body, HTTPException, Depends
from typing import Dict, Any, Optional

from api.schemas.v1 import SuccessResponse
from api.auth import require_auth
from pydantic import BaseModel

# Create router for config endpoints
config_router = APIRouter(prefix="/config", tags=["config"])


class ExcludeReq(BaseModel):
    dir: str
    patterns: list[str] = []


@config_router.post("/settings/excludes", response_model=SuccessResponse)
def set_excludes_v1(
    req: ExcludeReq,
    _auth=Depends(require_auth)
) -> SuccessResponse:
    """
    Set exclude patterns for a directory.
    """
    from pathlib import Path
    import json
    
    folder = Path(req.dir)
    try:
        p = folder / ".photo_index"
        p.mkdir(parents=True, exist_ok=True)
        cfg = p / "excludes.json"
        cfg.write_text(json.dumps({"patterns": req.patterns}, indent=2), encoding='utf-8')
        return SuccessResponse(ok=True)
    except Exception as e:
        raise HTTPException(500, f"Failed to save excludes: {e}")


class ConfigSetReq(BaseModel):
    key: str
    value: str


@config_router.post("/set", response_model=SuccessResponse)
def config_set_v1(
    req: ConfigSetReq,
    _auth=Depends(require_auth)
) -> SuccessResponse:
    """
    Set a configuration key-value pair.
    """
    try:
        import os
        # Set in process environment for immediate effect
        os.environ[req.key] = req.value
        return SuccessResponse(
            ok=True, 
            data={"key": req.key, "value": req.value}
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to set config: {e}")