"""
Workspace routes - manage multiple photo directories.

Handles listing, adding, and removing directories from the user's
workspace for easy switching between different photo collections.
"""
from fastapi import APIRouter
from typing import Dict, Any
from pydantic import BaseModel

from infra.workspace import load_workspace, save_workspace

router = APIRouter()


class WorkspacePath(BaseModel):
    path: str


@router.get("/workspace")
def api_workspace_list() -> Dict[str, Any]:
    """List all directories in the user's workspace."""
    return {"folders": load_workspace()}


@router.post("/workspace/add")
def api_workspace_add(data: WorkspacePath) -> Dict[str, Any]:
    """Add a directory to the user's workspace."""
    ws = load_workspace()
    if data.path not in ws:
        ws.append(data.path)
        save_workspace(ws)
    return {"folders": ws}


@router.post("/workspace/remove")
def api_workspace_remove(data: WorkspacePath) -> Dict[str, Any]:
    """Remove a directory from the user's workspace."""
    ws = load_workspace()
    ws = [p for p in ws if p != data.path]
    save_workspace(ws)
    return {"folders": ws}