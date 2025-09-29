"""
Authentication-related endpoints for API v1.
"""
from fastapi import APIRouter, Depends, Header
from typing import Dict, Any, Optional

from api.auth import require_auth
from api.schemas.v1 import SuccessResponse, BaseResponse
from infra.config import config

# Create router for auth endpoints
auth_router = APIRouter(prefix="/auth", tags=["auth"])


@auth_router.get("/status")
def api_auth_status_v1(
    token: Optional[str] = Header(None, alias="X-API-Token"),
) -> Dict[str, Any]:
    """
    Get authentication status for debugging (v1).
    """
    if config.dev_no_auth:
        return {"ok": True, "data": {"reason": "dev_no_auth"}}
    if not config.api_token:
        return {"ok": True, "data": {"reason": "no_auth_required"}}
    if token and token == config.api_token:
        return {"ok": True, "data": {"reason": "valid_token"}}
    return {"ok": False, "message": "invalid_token"}


@auth_router.post("/check")
def api_auth_check_v1(
    auth_context: Dict[str, Any] = Depends(require_auth)
) -> Dict[str, Any]:
    """
    POST endpoint that succeeds only if Authorization is accepted (v1).
    
    Useful for quickly verifying client token configuration in development.
    """
    return {"ok": True, "data": auth_context}