"""Attention Router (scaffold)

Exposes placeholder endpoints for adaptive attention features so frontend &
integration work can begin. Returns deterministic or synthetic data derived
from current index state until full aggregation logic is implemented.
"""
from __future__ import annotations

from pathlib import Path
from fastapi import APIRouter, HTTPException, Query

from usecases.get_popularity import (
    popularity as _uc_popularity,
    forgotten as _uc_forgotten,
    seasonal as _uc_seasonal,
    shuffle as _uc_shuffle,
    clear as _uc_clear,
)
from usecases.get_attention_extras import (
    duplicates as _uc_duplicates,
    mark_duplicate_group as _uc_mark_dup,
    related as _uc_related,
)

router = APIRouter(prefix="/attention", tags=["attention"])


def _dir_exists(p: Path) -> bool:
    try:
        return p.exists() and p.is_dir()
    except Exception:
        return False


@router.get("/popularity")
def api_attention_popularity(directory: str = Query(..., alias="dir"), limit: int = 50):
    folder = Path(directory)
    if not _dir_exists(folder):
        raise HTTPException(400, "Folder not found")
    return _uc_popularity(folder, limit=limit)


@router.get("/forgotten")
def api_attention_forgotten(directory: str = Query(..., alias="dir"), limit: int = 20, days: int = 365):
    folder = Path(directory)
    if not _dir_exists(folder):
        raise HTTPException(400, "Folder not found")
    return _uc_forgotten(folder, limit=limit, days=days)


@router.get("/seasonal")
def api_attention_seasonal(directory: str = Query(..., alias="dir"), limit: int = 20, window: int = 7):
    folder = Path(directory)
    if not _dir_exists(folder):
        raise HTTPException(400, "Folder not found")
    return _uc_seasonal(folder, limit=limit, window_days=window)


@router.get("/shuffle")
def api_attention_shuffle(directory: str = Query(..., alias="dir"), limit: int = 40):
    folder = Path(directory)
    if not _dir_exists(folder):
        raise HTTPException(400, "Folder not found")
    return _uc_shuffle(folder, limit=limit)


@router.post("/clear")
def api_attention_clear(directory: str = Query(..., alias="dir")):
    folder = Path(directory)
    if not _dir_exists(folder):
        raise HTTPException(400, "Folder not found")
    return _uc_clear(folder)


@router.get("/dupes")
def api_attention_dupes(directory: str = Query(..., alias="dir"), max_distance: int = 5, rebuild: bool = False):
    folder = Path(directory)
    if not _dir_exists(folder):
        raise HTTPException(400, "Folder not found")
    return _uc_duplicates(folder, max_distance=max_distance, rebuild=bool(rebuild))


@router.post("/dupes/{group_id}/resolve")
def api_attention_dupes_resolve(group_id: str, directory: str = Query(..., alias="dir"), resolved: bool = True):
    folder = Path(directory)
    if not _dir_exists(folder):
        raise HTTPException(400, "Folder not found")
    return _uc_mark_dup(folder, group_id, resolved=resolved)


@router.get("/related")
def api_attention_related(directory: str = Query(..., alias="dir"), path: str = Query(...), provider: str = "local", limit: int = 12):
    folder = Path(directory)
    if not _dir_exists(folder):
        raise HTTPException(400, "Folder not found")
    return _uc_related(folder, path=path, provider=provider, limit=limit)
