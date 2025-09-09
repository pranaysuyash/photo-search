from __future__ import annotations
import logging

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple


def _analytics_file(index_dir: Path) -> Path:
    return Path(index_dir) / "analytics.jsonl"


def _feedback_file(index_dir: Path) -> Path:
    return Path(index_dir) / "feedback.json"


def log_search(index_dir: Path, engine_id: str, query: str, results: List[Tuple[str, float]]) -> str:
    sid = str(uuid.uuid4())
    rec = {
        "type": "search",
        "id": sid,
        "time": datetime.utcnow().isoformat() + "Z",
        "engine": engine_id,
        "query": query,
        "results": [{"path": p, "score": float(s)} for p, s in results],
    }
    af = _analytics_file(index_dir)
    af.parent.mkdir(parents=True, exist_ok=True)
    with open(af, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec) + "\n")
    return sid


def log_open(index_dir: Path, path: str, search_id: Optional[str] = None) -> None:
    rec = {
        "type": "open",
        "time": datetime.utcnow().isoformat() + "Z",
        "search_id": search_id,
        "path": path,
    }
    af = _analytics_file(index_dir)
    af.parent.mkdir(parents=True, exist_ok=True)
    with open(af, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec) + "\n")


def load_feedback(index_dir: Path) -> Dict[str, Dict[str, int]]:
    try:
        p = _feedback_file(index_dir)
        if p.exists():
            data = json.loads(p.read_text())
            # { query: { path: votes } }
            if isinstance(data, dict):
                return {str(q): {str(k): int(v) for k, v in d.items()} for q, d in data.items() if isinstance(d, dict)}
    except Exception:
        logging.exception("analytics log_search failed")
    return {}


def save_feedback(index_dir: Path, fb: Dict[str, Dict[str, int]]) -> None:
    try:
        _feedback_file(index_dir).write_text(json.dumps(fb, indent=2))
    except Exception:
        logging.exception("analytics log_open failed")


def log_feedback(index_dir: Path, search_id: str, query: str, positives: List[str], note: str = "") -> None:
    rec = {
        "type": "feedback",
        "time": datetime.utcnow().isoformat() + "Z",
        "search_id": search_id,
        "query": query,
        "positives": positives,
        "note": note,
    }
    af = _analytics_file(index_dir)
    af.parent.mkdir(parents=True, exist_ok=True)
    with open(af, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec) + "\n")
    # Update feedback tallies
    fb = load_feedback(index_dir)
    q = fb.setdefault(query, {})
    for p in positives:
        q[p] = int(q.get(p, 0)) + 1
    save_feedback(index_dir, fb)


def apply_feedback_boost(index_dir: Path, query: str, results: List[Tuple[str, float]], boost: float = 0.1) -> List[Tuple[str, float]]:
    """Boost scores for items previously marked correct for this query.

    boost is added per vote (e.g., 0.1 per positive mark).
    """
    fb = load_feedback(index_dir)
    votes = fb.get(query, {})
    adjusted: List[Tuple[str, float]] = []
    for p, s in results:
        v = int(votes.get(p, 0))
        adjusted.append((p, float(s) + boost * v))
    # re-sort by adjusted score desc, stable
    adjusted.sort(key=lambda x: -x[1])
    return adjusted
