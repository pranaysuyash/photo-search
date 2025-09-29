from __future__ import annotations

import os
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, HTTPException, Query
from PIL import Image, ExifTags

from api.utils import _as_bool, _as_str_list, _from_body, _require
from infra.index_store import IndexStore

# Legacy router without prefix for parity with original_server.py routes
router = APIRouter(tags=["utilities"])


@router.post("/export")
def api_export(
    directory: Optional[str] = None,
    paths: Optional[List[str]] = None,
    dest: Optional[str] = None,
    mode: Optional[str] = None,
    strip_exif: Optional[bool] = None,
    overwrite: Optional[bool] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Export/copy selected photos to a destination directory with various options."""
    dir_value = _require(_from_body(body, directory, "dir"), "dir")
    paths_value = _from_body(body, paths, "paths", default=[], cast=_as_str_list) or []
    dest_value = _require(_from_body(body, dest, "dest"), "dest")
    mode_value = (_from_body(body, mode, "mode", default="copy") or "copy").lower()
    strip_exif_value = _from_body(body, strip_exif, "strip_exif", default=False, cast=_as_bool) or False
    overwrite_value = _from_body(body, overwrite, "overwrite", default=False, cast=_as_bool) or False

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    dest_dir = Path(dest_value).expanduser()
    try:
        dest_dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        raise HTTPException(400, "Cannot create destination")
    copied = 0; skipped = 0; errors = 0
    for sp in paths_value:
        src = Path(sp)
        if not src.exists():
            errors += 1; continue
        out = dest_dir / src.name
        if out.exists() and not overwrite_value:
            skipped += 1; continue
        try:
            if mode_value == 'symlink':
                try:
                    if out.exists(): out.unlink()
                    os.symlink(src, out)
                    copied += 1
                    continue
                except Exception:
                    pass
            if strip_exif_value:
                try:
                    with Image.open(src) as img:
                        img = img.convert('RGB') if img.mode not in ('RGB','L') else img
                        img.save(out)
                    copied += 1
                    continue
                except Exception:
                    pass
            shutil.copy2(src, out)
            copied += 1
        except Exception:
            errors += 1
    return {"ok": True, "copied": copied, "skipped": skipped, "errors": errors, "dest": str(dest_dir)}


@router.get("/map")
def api_map(directory: str = Query(..., alias="dir"), limit: int = 1000) -> Dict[str, Any]:
    """Extract GPS coordinates from EXIF data of photos for map visualization."""
    folder = Path(directory)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    inv = {v: k for k, v in ExifTags.TAGS.items()}
    pts: List[Dict[str, float]] = []
    store = IndexStore(folder)
    store.load()
    def to_deg(val):
        try:
            d,m,s = val
            def cv(x):
                return float(x[0])/float(x[1]) if isinstance(x, tuple) else float(x)
            return cv(d)+cv(m)/60.0+cv(s)/3600.0
        except Exception:
            return None
    for sp in (store.state.paths or [])[:limit]:
        try:
            img = Image.open(sp)
            ex = img._getexif() or {}
            gps = ex.get(inv.get('GPSInfo', -1)) or {}
            lat = gps.get(2); lat_ref = gps.get(1)
            lon = gps.get(4); lon_ref = gps.get(3)
            if lat and lon and lat_ref and lon_ref:
                latd = to_deg(lat); lond = to_deg(lon)
                if latd is not None and lond is not None:
                    if str(lat_ref).upper().startswith('S'):
                        latd = -latd
                    if str(lon_ref).upper().startswith('W'):
                        lond = -lond
                    pts.append({"lat": latd, "lon": lond})
        except Exception:
            continue
    return {"points": pts}