"""
Workspace-related endpoints for API v1.
"""
from fastapi import APIRouter, Body, Depends
from typing import Dict, Any

from api.schemas.v1 import SuccessResponse
from api.auth import require_auth
from infra.workspace import load_workspace, save_workspace
from pydantic import BaseModel

# Create router for workspace endpoints
workspace_router = APIRouter(prefix="/workspace", tags=["workspace"])


class WorkspacePath(BaseModel):
    path: str


@workspace_router.get("/", response_model=SuccessResponse)
def workspace_list_v1(_auth = Depends(require_auth)) -> SuccessResponse:
    """
    List all directories in the user's workspace.
    """
    return SuccessResponse(ok=True, data={"folders": load_workspace()})


@workspace_router.post("/add", response_model=SuccessResponse)
def workspace_add_v1(
    data: WorkspacePath,
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Add a directory to the user's workspace.
    """
    ws = load_workspace()
    if data.path not in ws:
        ws.append(data.path)
        save_workspace(ws)
    return SuccessResponse(ok=True, data={"folders": ws})


@workspace_router.post("/remove", response_model=SuccessResponse)
def workspace_remove_v1(
    data: WorkspacePath,
    _auth = Depends(require_auth)
) -> SuccessResponse:
    """
    Remove a directory from the user's workspace.
    """
    ws = load_workspace()
    ws = [p for p in ws if p != data.path]
    save_workspace(ws)
    return SuccessResponse(ok=True, data={"folders": ws})