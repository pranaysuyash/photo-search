"""Attention Aggregator

Real (phase 1) implementation that derives photo popularity & related adaptive
signals from analytics events. Replaces earlier scaffold that produced
synthetic data.

Data Sources:
- `analytics.jsonl` lines with types: `open` (legacy view), `interaction`
    (actions: view, favorite, share, edit), `feedback` (ignored for now).

Scoring Model (initial heuristic):
    For each event with action A at time t_e:
        contribution = weight[A] * exp(-lambda * age_days)
    popularity(photo) = sum(contribution for events of that photo)

    Default weights:
        view/open: 1.0
        favorite: 5.0
        share: 3.0
        edit: 2.0
    lambda (decay per day): 0.02 (half-life ≈ 34.6 days)

Persisted Cache:
- `aggregates.json` for quick API responses. Rebuilt when empty or when caller
    requests computation (no incremental invalidation yet – acceptable for small/medium sets).

Limitations / TODO:
- Ignore rotated analytics backups (future: merge last N rotated for long memory).
- Could migrate to incremental update keyed by last processed offset.
- Future incorporate feedback votes, search click-through rate.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional
import json, time, math, random, os
from datetime import datetime, timezone

from infra.analytics import AnalyticsStore


AGG_FILE = "aggregates.json"


@dataclass
class PhotoAggregate:
    path: str
    views: int = 0
    favorites: int = 0
    shares: int = 0
    edits: int = 0
    last_view: Optional[int] = None  # epoch ms
    popularity: float = 0.0

    def size_class(self) -> int:
        # Log-shaped scaling to 1–4 bucket range
        if self.popularity <= 0:
            return 1
        return max(1, min(4, int(1 + math.log1p(self.popularity))))


def _cache_path(index_dir: Path) -> Path:
    return Path(index_dir) / AGG_FILE


def load_aggregates(index_dir: Path) -> Dict[str, PhotoAggregate]:
    p = _cache_path(index_dir)
    if not p.exists():
        return {}
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        photos = data.get("photos", {})
        out: Dict[str, PhotoAggregate] = {}
        for k, v in photos.items():
            out[k] = PhotoAggregate(
                path=k,
                views=int(v.get("views", 0)),
                favorites=int(v.get("favorites", 0)),
                shares=int(v.get("shares", 0)),
                edits=int(v.get("edits", 0)),
                last_view=int(v.get("last_view")) if v.get("last_view") else None,
                popularity=float(v.get("popularity", 0.0)),
            )
        return out
    except Exception:
        return {}


def save_aggregates(index_dir: Path, aggs: Dict[str, PhotoAggregate]) -> None:
    try:
        data = {
            "generated_at": int(time.time() * 1000),
            "photos": {
                k: {
                    "views": v.views,
                    "favorites": v.favorites,
                    "shares": v.shares,
                    "edits": v.edits,
                    "last_view": v.last_view,
                    "popularity": v.popularity,
                }
                for k, v in aggs.items()
            },
        }
        _cache_path(index_dir).write_text(json.dumps(data), encoding="utf-8")
    except Exception:
        pass  # best effort


def _parse_time(ts: str) -> Optional[datetime]:
    if not ts:
        return None
    try:
        if ts.endswith('Z'):
            ts = ts[:-1]
        # Allow fractional seconds
        return datetime.fromisoformat(ts).replace(tzinfo=timezone.utc)
    except Exception:
        return None


def _env_float(key: str, default: float) -> float:
    try:
        return float(os.environ.get(key, default))
    except Exception:
        return float(default)


def _iter_relevant_events(store: AnalyticsStore):
    for evt in store.iter_events():
        etype = evt.get("type")
        if etype in ("open", "interaction"):
            yield evt


def _event_weight_map() -> Dict[str, float]:
    return {
        "view": _env_float("PS_WEIGHT_VIEW", 1.0),
        "open": _env_float("PS_WEIGHT_VIEW", 1.0),
        "favorite": _env_float("PS_WEIGHT_FAVORITE", 5.0),
        "share": _env_float("PS_WEIGHT_SHARE", 3.0),
        "edit": _env_float("PS_WEIGHT_EDIT", 2.0),
    }


def build_full(index_dir: Path, paths: List[str]) -> Dict[str, PhotoAggregate]:
    store = AnalyticsStore(index_dir)
    now = datetime.now(timezone.utc)
    lambda_decay = _env_float("PS_ATTENTION_LAMBDA", 0.02)
    weights = _event_weight_map()
    aggs: Dict[str, PhotoAggregate] = {p: PhotoAggregate(path=p) for p in paths}
    for evt in _iter_relevant_events(store):
        path = evt.get("path")
        if not path or path not in aggs:
            continue
        ts = _parse_time(evt.get("time", ""))
        if not ts:
            continue
        action = ("view" if evt.get("type") == "open" else evt.get("action") or "view").lower()
        w = weights.get(action)
        if w is None:
            continue
        age_days = max(0.0, (now - ts).total_seconds() / 86400.0)
        decay = math.exp(-lambda_decay * age_days)
        agg = aggs[path]
        if action in ("view", "open"):
            agg.views += 1
            agg.last_view = int(ts.timestamp() * 1000)
        elif action == "favorite":
            agg.favorites += 1
        elif action == "share":
            agg.shares += 1
        elif action == "edit":
            agg.edits += 1
        agg.popularity += w * decay
    save_aggregates(index_dir, aggs)
    return aggs


def get_popularity(index_dir: Path, paths: List[str], limit: int = 50) -> List[PhotoAggregate]:
    aggs = load_aggregates(index_dir)
    if not aggs:
        aggs = build_full(index_dir, paths)
    ordered = sorted(aggs.values(), key=lambda a: (-a.popularity, a.path))
    return ordered[: max(1, int(limit))]


def get_forgotten(index_dir: Path, paths: List[str], limit: int = 20, days: int = 365) -> List[PhotoAggregate]:
    aggs = load_aggregates(index_dir)
    if not aggs:
        aggs = build_full(index_dir, paths)
    cutoff_ms = int(time.time() * 1000) - days * 86400000
    candidates = [a for a in aggs.values() if (a.last_view is None or a.last_view < cutoff_ms)]
    candidates.sort(key=lambda a: (a.last_view or 0))
    return candidates[: max(1, int(limit))]


def get_seasonal(index_dir: Path, paths: List[str], limit: int = 20, window_days: int = 7) -> List[PhotoAggregate]:
    aggs = load_aggregates(index_dir)
    if not aggs:
        aggs = build_full(index_dir, paths)
    now = datetime.utcnow()
    doy_now = int(now.strftime('%j'))
    window = max(1, int(window_days))
    candidates: List[PhotoAggregate] = []
    for a in aggs.values():
        if not a.last_view:
            continue
        try:
            dt = datetime.utcfromtimestamp(a.last_view / 1000)
            doy = int(dt.strftime('%j'))
            diff = min(abs(doy - doy_now), 365 - abs(doy - doy_now))
            if diff <= window:
                candidates.append(a)
        except Exception:
            continue
    if not candidates:
        # fallback random sample
        pool = list(aggs.values())
        random.shuffle(pool)
        return pool[: max(1, int(limit))]
    candidates.sort(key=lambda a: -a.popularity)
    return candidates[: max(1, int(limit))]


def shuffle_weighted(index_dir: Path, paths: List[str], limit: int = 40) -> List[PhotoAggregate]:
    aggs = load_aggregates(index_dir)
    if not aggs:
        aggs = build_full(index_dir, paths)
    vals = list(aggs.values())
    # Bias low popularity higher
    weights = [1.0 / (1.0 + a.popularity) for a in vals]
    total = sum(weights) or 1.0
    norm = [w / total for w in weights]
    # Simple weighted sample (without strict uniqueness guarantees in placeholder)
    out: List[PhotoAggregate] = []
    for _ in range(min(len(vals), max(1, int(limit)))):
        r = random.random()
        acc = 0.0
        for a, w in zip(vals, norm):
            acc += w
            if r <= acc:
                out.append(a)
                break
    # De-duplicate while preserving order
    seen = set()
    uniq: List[PhotoAggregate] = []
    for a in out:
        if a.path in seen:
            continue
        seen.add(a.path)
        uniq.append(a)
    return uniq


def clear_attention(index_dir: Path) -> bool:
    ok = True
    try:
        p = _cache_path(index_dir)
        if p.exists():
            p.unlink()
    except Exception:
        ok = False
    # NOTE: Not removing analytics log here; that remains separate for now.
    return ok
