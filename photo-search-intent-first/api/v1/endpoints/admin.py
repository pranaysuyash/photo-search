"""
Admin-related endpoints for API v1.
"""
from fastapi import APIRouter, Body, Depends
from typing import Dict

from api.schemas.v1 import SuccessResponse
from api.runtime_flags import set_offline, is_offline
from api.auth import require_auth

# Create router for admin endpoints
admin_router = APIRouter(prefix="/admin", tags=["admin"])


@admin_router.post("/flags/offline", response_model=SuccessResponse)
def toggle_offline_v1(
    value: Dict[str, bool] = Body(...),
    _auth = Depends(require_auth)
):
    """
    Toggle offline mode at runtime. Body: { "offline": true|false }
    """
    v = bool(value.get("offline", False))
    set_offline(v)
    return SuccessResponse(
        ok=True, 
        data={"offline_mode": is_offline()}
    )


@admin_router.get("/flags", response_model=SuccessResponse)
def get_flags_v1(_auth = Depends(require_auth)):
    return SuccessResponse(
        ok=True, 
        data={"offline_mode": is_offline()}
    )