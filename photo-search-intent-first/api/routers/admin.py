from fastapi import APIRouter, Body
from typing import Dict

from api.runtime_flags import set_offline, is_offline

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/flags/offline")
def toggle_offline(value: Dict[str, bool] = Body(...)):
    """Toggle offline mode at runtime. Body: { "offline": true|false }"""
    v = bool(value.get("offline", False))
    set_offline(v)
    return {"ok": True, "offline_mode": is_offline()}


@router.get("/flags")
def get_flags():
    return {"ok": True, "offline_mode": is_offline()}
