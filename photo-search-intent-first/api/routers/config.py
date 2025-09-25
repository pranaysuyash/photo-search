from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import json
from api.auth import require_auth


router = APIRouter()


class ExcludeReq(BaseModel):
    dir: str
    patterns: list[str] = []


@router.post("/settings/excludes")
def api_set_excludes(req: ExcludeReq, _auth=Depends(require_auth)) -> Dict[str, Any]:
    folder = Path(req.dir)
    try:
        p = folder / ".photo_index"
        p.mkdir(parents=True, exist_ok=True)
        cfg = p / "excludes.json"
        cfg.write_text(json.dumps({"patterns": req.patterns}, indent=2), encoding='utf-8')
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, f"Failed to save excludes: {e}")


class ConfigSetReq(BaseModel):
    key: str
    value: str


@router.post("/config/set")
def api_config_set(req: ConfigSetReq, _auth=Depends(require_auth)) -> Dict[str, Any]:
    import os
    try:
        # Set in process environment for immediate effect
        os.environ[req.key] = req.value
        return {"ok": True, "key": req.key, "value": req.value}
    except Exception as e:
        raise HTTPException(500, f"Failed to set config: {e}")
