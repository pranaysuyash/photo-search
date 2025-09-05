from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List


def trips_file(index_dir: Path) -> Path:
    d = index_dir / "trips"
    d.mkdir(parents=True, exist_ok=True)
    return d / "trips.json"


def load_trips(index_dir: Path) -> List[Dict[str, Any]]:
    p = trips_file(index_dir)
    if p.exists():
        try:
            return json.loads(p.read_text())
        except Exception:
            return []
    return []


def save_trips(index_dir: Path, trips: List[Dict[str, Any]]) -> None:
    p = trips_file(index_dir)
    p.write_text(json.dumps(trips, indent=2))


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    from math import radians, sin, cos, sqrt, atan2
    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1))*cos(radians(lat2))*sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c


def build_trips(index_dir: Path, paths: List[str], mtimes: List[float], time_gap_hours: float = 24.0, geo_km: float = 60.0) -> Dict[str, Any]:
    # Load EXIF index for place/lat/lon
    lat_map: Dict[str, float] = {}
    lon_map: Dict[str, float] = {}
    place_map: Dict[str, str] = {}
    try:
        p = index_dir / 'exif_index.json'
        if p.exists():
            d = json.loads(p.read_text())
            for sp, lat, lon, plc in zip(d.get('paths',[]), d.get('gps_lat',[]), d.get('gps_lon',[]), d.get('place',[])):
                if lat is not None and lon is not None:
                    lat_map[sp] = float(lat)
                    lon_map[sp] = float(lon)
                if plc:
                    place_map[sp] = plc
    except Exception:
        pass
    # Sort by time
    items = sorted([(p, float(t)) for p, t in zip(paths, mtimes)], key=lambda x: x[1])
    trips: List[Dict[str, Any]] = []
    cur: List[str] = []
    cur_times: List[float] = []
    last_t = None
    gap = time_gap_hours * 3600.0
    for p, t in items:
        if last_t is None or (t - last_t) <= gap:
            cur.append(p); cur_times.append(t)
        else:
            if cur:
                trips.extend(_split_geo(cur, cur_times, lat_map, lon_map, place_map, geo_km))
            cur = [p]; cur_times = [t]
        last_t = t
    if cur:
        trips.extend(_split_geo(cur, cur_times, lat_map, lon_map, place_map, geo_km))
    # Add IDs and sort by end desc
    for i, tr in enumerate(trips):
        tr['id'] = tr.get('id') or f"trip_{i+1}"
    trips.sort(key=lambda x: -(x.get('end_ts') or 0.0))
    save_trips(index_dir, trips)
    return {"trips": trips}


def _split_geo(paths: List[str], times: List[float], lat_map: Dict[str, float], lon_map: Dict[str, float], place_map: Dict[str, str], geo_km: float) -> List[Dict[str, Any]]:
    if not paths:
        return []
    # Simple geo grouping: start with first path, add to group if within geo_km of centroid
    groups: List[List[int]] = []
    groups.append([0])
    centroids: List[tuple[float,float] | None] = []
    lat0 = lat_map.get(paths[0]); lon0 = lon_map.get(paths[0])
    centroids.append((lat0, lon0) if lat0 is not None and lon0 is not None else None)
    for i in range(1, len(paths)):
        lat = lat_map.get(paths[i]); lon = lon_map.get(paths[i])
        placed = False
        for gi, g in enumerate(groups):
            c = centroids[gi]
            if c is None or lat is None or lon is None:
                # Without GPS, accept into first group
                g.append(i); placed = True; break
            d = _haversine(c[0], c[1], lat, lon)
            if d <= geo_km:
                g.append(i)
                # update centroid
                pts = [(lat_map.get(paths[j]), lon_map.get(paths[j])) for j in g if lat_map.get(paths[j]) is not None and lon_map.get(paths[j]) is not None]
                if pts:
                    la = sum(p[0] for p in pts)/len(pts); lo = sum(p[1] for p in pts)/len(pts)
                    centroids[gi] = (la, lo)
                placed = True
                break
        if not placed:
            groups.append([i])
            centroids.append((lat, lon) if lat is not None and lon is not None else None)
    out: List[Dict[str, Any]] = []
    for g, c in zip(groups, centroids):
        ps = [paths[i] for i in g]
        ts = [times[i] for i in g]
        # pick dominant place label
        place_counts: Dict[str, int] = {}
        for p in ps:
            plc = place_map.get(p)
            if plc:
                place_counts[plc] = place_counts.get(plc, 0) + 1
        place = ''
        if place_counts:
            place = sorted(place_counts.items(), key=lambda x: -x[1])[0][0]
        out.append({
            "id": None,
            "count": len(ps),
            "start_ts": min(ts) if ts else None,
            "end_ts": max(ts) if ts else None,
            "place": place,
            "paths": ps,
        })
    return out

