from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel

from adapters.jobs_bridge import JobsBridge
from api.auth import require_auth
from api.utils import _from_body, _require
from infra.analytics import _analytics_file, _write_event as _write_event_infra, read_recent_events
from infra.collections import load_collections
from infra.tags import all_tags
from infra.faces import list_clusters
from infra.index_store import IndexStore
import math
from datetime import datetime, UTC

# Main router with /api prefix for new endpoints
router = APIRouter(prefix="/api", tags=["analytics"])

# Legacy router without prefix for parity with original_server.py routes
legacy_router = APIRouter(tags=["analytics-legacy"])


class AnalyticsEvent(BaseModel):
    type: str
    dir: str
    job_id: Optional[str] = None

    class Config:
        extra = "allow"


@router.get("/analytics")
def api_analytics(directory: str, limit: int = 200) -> Dict[str, Any]:
    """Return recent analytics/progress events for a library index directory.

    Events are stored as JSONL under the index dir (see infra.analytics._analytics_file).
    This endpoint tails the file and returns the most recent `limit` entries.
    """
    try:
        folder = Path(directory)
        store = IndexStore(folder)
        events = read_recent_events(store.index_dir, limit=limit)

        favorites_total = 0
        try:
            collections = load_collections(store.index_dir)
            favorites_total = len(collections.get("Favorites", []))
        except Exception:
            favorites_total = 0

        total_photos, total_indexed = _summarize_index(store)
        index_size_mb = _safe_index_size_mb(store.index_dir)
        cameras, places = _load_exif_summary(store.index_dir)
        tags = _safe_tags(store.index_dir)
        people_clusters = _safe_people_clusters(store.index_dir)

        return {
            "events": events,
            "favorites_total": favorites_total,
            "total_photos": total_photos,
            "total_indexed": total_indexed,
            "index_size_mb": index_size_mb,
            "cameras": cameras,
            "places": places,
            "tags": tags,
            "people_clusters": people_clusters,
        }
    except Exception as e:
        raise HTTPException(500, f"analytics read failed: {e}")


@router.get("/analytics/places")
def api_analytics_places(
    directory: Optional[str] = Query(None),
    dir_alias: Optional[str] = Query(None, alias="dir"),
    limit: int = Query(5000, ge=1, le=20000),
    sample_per_location: int = Query(12, ge=1, le=100),
) -> Dict[str, Any]:
    """Return aggregated place and GPS metadata for map visualisations.

    The endpoint reads ``exif_index.json`` from the index directory, aggregates
    photos that have latitude/longitude metadata and computes clustered
    summaries that the frontend can use for map rendering and search filters.

    Parameters
    ----------
    directory:
        Library directory whose index should be analysed.
    limit:
        Maximum number of point records to return (down-sampled if necessary
        to prevent enormous payloads).
    sample_per_location:
        Maximum number of photo points returned for each aggregated location
        entry. This supports preview drawers without transferring the entire
        library for every request.
    """

    resolved_directory = directory or dir_alias
    if not resolved_directory:
        raise HTTPException(422, "directory (or dir) query parameter is required")

    try:
        store = IndexStore(Path(resolved_directory))
    except Exception as exc:
        raise HTTPException(400, f"Invalid directory: {exc}") from exc

    exif_path = store.index_dir / "exif_index.json"
    if not exif_path.exists():
        return {
            "generated_at": datetime.now(UTC).isoformat(),
            "directory": str(resolved_directory),
            "total_with_coordinates": 0,
            "total_without_coordinates": 0,
            "locations": [],
            "points": [],
        }

    try:
        data = json.loads(exif_path.read_text())
    except Exception as exc:  # pragma: no cover - defensive guard
        raise HTTPException(500, f"Failed to parse EXIF metadata: {exc}") from exc

    paths: List[str] = list(map(str, data.get("paths", [])))
    lats: List[Optional[float]] = data.get("gps_lat", [])
    lons: List[Optional[float]] = data.get("gps_lon", [])
    places_raw: List[str] = [
        str(p).strip() if isinstance(p, str) else ""
        for p in data.get("place", [])
    ]

    aggregated: Dict[str, Dict[str, Any]] = {}
    sampled_points: List[Dict[str, Any]] = []
    missing_coordinates = 0

    def _normalise_lat_lon(value: Optional[float]) -> Optional[float]:
        try:
            if value is None:
                return None
            if isinstance(value, (int, float)):
                # guard against strings masquerading as numbers
                if math.isnan(float(value)):
                    return None
                return float(value)
            if isinstance(value, str) and value.strip():
                return float(value)
        except (ValueError, TypeError):
            return None
        return None

    for idx, path in enumerate(paths):
        lat = _normalise_lat_lon(lats[idx] if idx < len(lats) else None)
        lon = _normalise_lat_lon(lons[idx] if idx < len(lons) else None)

        if lat is None or lon is None:
            missing_coordinates += 1
            continue

        place_name = places_raw[idx] if idx < len(places_raw) else ""
        coarse_key = f"{round(lat, 3):.3f},{round(lon, 3):.3f}"
        key = place_name.lower() if place_name else coarse_key

        if key not in aggregated:
            aggregated[key] = {
                "name": place_name or coarse_key,
                "count": 0,
                "lat_sum": 0.0,
                "lon_sum": 0.0,
                "min_lat": lat,
                "max_lat": lat,
                "min_lon": lon,
                "max_lon": lon,
                "samples": [],
            }

        entry = aggregated[key]
        if place_name and place_name not in entry["name"]:
            # Prefer human readable labels when available
            entry["name"] = place_name

        entry["count"] += 1
        entry["lat_sum"] += lat
        entry["lon_sum"] += lon
        entry["min_lat"] = min(entry["min_lat"], lat)
        entry["max_lat"] = max(entry["max_lat"], lat)
        entry["min_lon"] = min(entry["min_lon"], lon)
        entry["max_lon"] = max(entry["max_lon"], lon)

        if len(entry["samples"]) < sample_per_location:
            entry["samples"].append({
                "path": path,
                "lat": lat,
                "lon": lon,
                "place": place_name or None,
            })

        if len(sampled_points) < limit:
            sampled_points.append(
                {
                    "path": path,
                    "lat": lat,
                    "lon": lon,
                    "place": place_name or None,
                }
            )

    # Down-sample deterministically if we exceeded the requested limit
    if len(sampled_points) > limit:
        step = max(1, len(sampled_points) // limit)
        sampled_points = sampled_points[::step][:limit]

    locations_payload: List[Dict[str, Any]] = []
    for key, entry in aggregated.items():
        count = entry["count"] or 1
        center_lat = entry["lat_sum"] / count
        center_lon = entry["lon_sum"] / count
        radius_km = _estimate_radius_km(
            entry["min_lat"],
            entry["min_lon"],
            entry["max_lat"],
            entry["max_lon"],
        )
        locations_payload.append(
            {
                "id": key,
                "name": entry["name"],
                "count": count,
                "center": {"lat": center_lat, "lon": center_lon},
                "bounds": {
                    "min_lat": entry["min_lat"],
                    "min_lon": entry["min_lon"],
                    "max_lat": entry["max_lat"],
                    "max_lon": entry["max_lon"],
                },
                "approximate_radius_km": radius_km,
                "sample_points": entry["samples"],
            }
        )

    locations_payload.sort(key=lambda item: item["count"], reverse=True)

    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "directory": str(resolved_directory),
        "total_with_coordinates": sum(entry["count"] for entry in aggregated.values()),
        "total_without_coordinates": missing_coordinates,
        "locations": locations_payload,
        "points": sampled_points,
    }


def _estimate_radius_km(min_lat: float, min_lon: float, max_lat: float, max_lon: float) -> float:
    """Rough distance (km) covered by the bounding box for tooltips."""

    if any(v is None for v in (min_lat, min_lon, max_lat, max_lon)):
        return 0.0

    # Haversine distance between opposite corners (approximate)
    lat1 = math.radians(min_lat)
    lon1 = math.radians(min_lon)
    lat2 = math.radians(max_lat)
    lon2 = math.radians(max_lon)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(max(1e-12, 1 - a)))
    return round(6371.0 * c, 3)


def _summarize_index(store: IndexStore) -> tuple[int, int]:
    try:
        data = json.loads(store.paths_file.read_text())
        total = len(data.get("paths", []) or [])
    except Exception:
        total = 0
    return total, total


def _safe_index_size_mb(index_dir: Path) -> float:
    try:
        total = 0
        if not index_dir.exists():
            return 0.0
        for path in index_dir.rglob("*"):
            if path.is_file():
                try:
                    total += path.stat().st_size
                except OSError:
                    continue
        return round(total / (1024 * 1024), 2)
    except Exception:
        return 0.0


def _load_exif_summary(index_dir: Path) -> tuple[List[str], List[str]]:
    p = index_dir / "exif_index.json"
    if not p.exists():
        return [], []
    try:
        data = json.loads(p.read_text())
        cameras = sorted({c for c in data.get("camera", []) if c})
        places = sorted({c for c in data.get("place", []) if c})
        return cameras, places
    except Exception:
        return [], []


def _safe_tags(index_dir: Path) -> List[str]:
    try:
        return all_tags(index_dir)
    except Exception:
        return []


def _safe_people_clusters(index_dir: Path) -> List[Dict[str, Any]]:
    try:
        clusters = []
        for cluster in list_clusters(index_dir):
            clusters.append(
                {
                    "id": cluster.get("id"),
                    "name": cluster.get("name", "") or "",
                    "size": int(cluster.get("size", 0) or 0),
                }
            )
        return clusters
    except Exception:
        return []


@router.post("/analytics/event")
def api_analytics_event(ev: AnalyticsEvent, _auth=Depends(require_auth)) -> Dict[str, Any]:
    """Append a single analytics/progress event (JSON object) to the log.

    The server stamps a `time` field (UTC ISO8601) if not provided.
    """
    try:
        dir_value = ev.dir
        if not dir_value:
            raise HTTPException(422, "dir is required")
        folder = Path(dir_value)
        store = IndexStore(folder)
        data = ev.dict()
        _write_event_infra(store.index_dir, data)
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"analytics write failed: {e}")


class JobCancelRequest(BaseModel):
    job_id: str


@router.post("/jobs/cancel")
def api_jobs_cancel(req: JobCancelRequest, _auth=Depends(require_auth)) -> Dict[str, Any]:
    """Cancel a running job by signaling its Threading.Event.

    The job must have been started with JobsBridge for cancellation to work.
    """
    try:
        job_id = req.job_id
        if not job_id:
            raise HTTPException(422, "job_id is required")

        bridge = JobsBridge()
        cancelled = bridge.cancel(job_id)

        if cancelled:
            return {"ok": True, "job_id": job_id, "cancelled": True}
        else:
            return {"ok": False, "job_id": job_id, "cancelled": False, "error": "Job not found or not cancellable"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Job cancellation failed: {e}")


# === Legacy routes for parity with original_server.py ===

@legacy_router.get("/analytics")
def api_analytics_legacy(directory: str = Query(..., alias="dir"), limit: int = 200) -> Dict[str, Any]:
    """Return recent analytics events from JSONL log (legacy endpoint)."""
    store = IndexStore(Path(directory))
    events: List[Dict[str, Any]] = []
    try:
        p = _analytics_file(store.index_dir)
        if p.exists():
            lines = p.read_text(encoding='utf-8').splitlines()
            tail = lines[-max(1, int(limit)):] if lines else []
            for ln in tail:
                try:
                    events.append(json.loads(ln))
                except Exception:
                    continue
    except Exception:
        events = []
    return {"events": events}


@legacy_router.post("/analytics/log")
def api_analytics_log_legacy(
    directory: Optional[str] = None,
    event_type: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Append a simple event record to analytics log (legacy endpoint)."""
    dir_value = _require(_from_body(body, directory, "dir"), "dir")
    type_value = _require(_from_body(body, event_type, "type"), "type")
    data_value = _from_body(body, None, "data")

    store = IndexStore(Path(dir_value))
    rec = {
        "type": str(type_value),
        "time": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    }
    if isinstance(data_value, dict):
        try:
            # shallow merge, preferring base keys for safety
            for k, v in data_value.items():
                if k not in rec:
                    rec[k] = v
        except Exception:
            pass
    _write_event_infra(store.index_dir, rec)
    return {"ok": True}
