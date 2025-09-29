from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header

from api.auth import require_auth
from infra.config import config

# Legacy router without prefix for parity with original_server.py routes
router = APIRouter(tags=["auth"])


@router.get("/auth/status")
def api_auth_status(
    token: Optional[str] = Header(None, alias="X-API-Token"),
) -> Dict[str, Any]:
    """Get authentication status for debugging."""
    if config.dev_no_auth:
        return {"ok": True, "data": {"reason": "dev_no_auth"}}
    if not config.api_token:
        return {"ok": True, "data": {"reason": "no_auth_required"}}
    if token and token == config.api_token:
        return {"ok": True, "data": {"reason": "valid_token"}}
    return {"ok": False, "message": "invalid_token"}


@router.post("/auth/check")
def api_auth_check(auth_context: Dict[str, Any] = Depends(require_auth)) -> Dict[str, Any]:
    """POST endpoint that succeeds only if Authorization is accepted.

    Useful for quickly verifying client token configuration in development.
    """
    return {"ok": True}