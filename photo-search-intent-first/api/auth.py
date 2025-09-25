from __future__ import annotations

from typing import Optional, Dict, Any

from fastapi import Header, HTTPException

from infra.config import config


def require_auth(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    """FastAPI dependency to enforce simple Bearer token auth.

    Behavior:
    - If dev_no_auth is enabled or no API token is configured, allow the request.
    - Otherwise, require header Authorization: Bearer <API_TOKEN>.
    - Returns a small context dict when authorized; raises 401 when not.
    """
    # Bypass in development mode or when token not configured
    if config.dev_no_auth or not config.api_token:
        return {"authorized": False, "reason": "no_auth_required"}

    # Enforce exact bearer token match
    expected = f"Bearer {config.api_token}"
    if authorization == expected:
        return {"authorized": True}

    raise HTTPException(status_code=401, detail="Unauthorized")
