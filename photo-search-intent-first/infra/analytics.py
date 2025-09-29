from __future__ import annotations

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Iterable
from collections import deque
import time


def _analytics_file(index_dir: Path) -> Path:
    return Path(index_dir) / "analytics.jsonl"


def _feedback_file(index_dir: Path) -> Path:
    return Path(index_dir) / "feedback.json"


def _write_event(index_dir: Path, event: dict) -> None:
    """Append a single analytics event to the per-index JSONL store.
    Uses AnalyticsStore under the hood so rotation/limits are respected.
    """
    store = AnalyticsStore(index_dir)
    store.append_event(event)


def read_recent_events(index_dir: Path, limit: int = 100, *, dir_filter: Optional[str] = None) -> List[dict]:
    """Return the last `limit` events for this index directory.
    If dir_filter is provided, it filters events by event["dir"].
    """
    store = AnalyticsStore(index_dir)
    return store.get_recent_events(limit=limit, dir_filter=dir_filter)


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
    f = _analytics_file(index_dir)
    f.parent.mkdir(parents=True, exist_ok=True)
    with open(f, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(rec) + "\n")
    return sid


def log_open(index_dir: Path, path: str, search_id: Optional[str] = None) -> None:
    rec = {
        "type": "open",
        "time": datetime.utcnow().isoformat() + "Z",
        "search_id": search_id,
        "path": path,
    }
    f = _analytics_file(index_dir)
    f.parent.mkdir(parents=True, exist_ok=True)
    with open(f, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(rec) + "\n")

# --- Interaction Events ----------------------------------------------------

ALLOWED_INTERACTIONS = {"view", "favorite", "share", "edit"}


def log_interaction(index_dir: Path, path: str, action: str, meta: Optional[dict] = None) -> None:
    """Generic interaction logger.

    action must be one of ALLOWED_INTERACTIONS. Meta (if provided) must be JSON serialisable.
    A single line JSON record is appended for lightweight analytics.
    """
    act = (action or "").lower().strip()
    if act not in ALLOWED_INTERACTIONS:
        return  # silently ignore invalid actions to avoid crashing UI paths
    rec = {
        "type": "interaction",
        "time": datetime.utcnow().isoformat() + "Z",
        "action": act,
        "path": path,
    }
    if meta and isinstance(meta, dict):
        # shallow merge – avoid overwriting core keys
        for k, v in meta.items():
            if k in rec:
                continue
            try:
                json.dumps(v)  # validate
                rec[k] = v
            except Exception:
                continue
    _write_event(index_dir, rec)


def log_view(index_dir: Path, path: str):  # convenience wrappers
    log_interaction(index_dir, path, "view")


def log_favorite(index_dir: Path, path: str):
    log_interaction(index_dir, path, "favorite")


def log_share(index_dir: Path, path: str):
    log_interaction(index_dir, path, "share")


def log_edit(index_dir: Path, path: str):
    log_interaction(index_dir, path, "edit")


def load_feedback(index_dir: Path) -> Dict[str, Dict[str, int]]:
    try:
        p = _feedback_file(index_dir)
        if p.exists():
            data = json.loads(p.read_text())
            if isinstance(data, dict):
                return {str(q): {str(k): int(v) for k, v in d.items()} for q, d in data.items() if isinstance(d, dict)}
    except Exception:
        pass
    return {}


def save_feedback(index_dir: Path, fb: Dict[str, Dict[str, int]]) -> None:
    try:
        _feedback_file(index_dir).write_text(json.dumps(fb, indent=2))
    except Exception:
        pass


def log_feedback(index_dir: Path, search_id: str, query: str, positives: List[str], note: str = "") -> None:
    rec = {
        "type": "feedback",
        "time": datetime.utcnow().isoformat() + "Z",
        "search_id": search_id,
        "query": query,
        "positives": positives,
        "note": note,
    }
    f = _analytics_file(index_dir)
    f.parent.mkdir(parents=True, exist_ok=True)
    with open(f, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(rec) + "\n")
    fb = load_feedback(index_dir)
    q = fb.setdefault(query, {})
    for p in positives:
        q[p] = int(q.get(p, 0)) + 1
    save_feedback(index_dir, fb)


def apply_feedback_boost(
    index_dir: Path,
    query: str,
    results: List[Tuple[str, float]],
    boost: float = 0.1,
) -> List[Tuple[str, float]]:
    fb = load_feedback(index_dir)
    votes = fb.get(query, {})
    adjusted: List[Tuple[str, float]] = []
    for p, s in results:
        v = int(votes.get(p, 0))
        adjusted.append((p, float(s) + boost * v))
    adjusted.sort(key=lambda x: -x[1])
    return adjusted


class AnalyticsStore:
    """Storage class for job analytics events with rotation and size limits."""

    def __init__(self, data_dir: Path, max_size_mb: float = 5.0, max_lines: int = 10000):
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.analytics_file = data_dir / "analytics.jsonl"
        self.max_size_bytes = int(max_size_mb * 1024 * 1024)
        self.max_lines = max_lines

    def _rotate_if_needed(self):
        """Rotate analytics file if it exceeds size or line limits."""
        if not self.analytics_file.exists():
            return

        # Check size
        size = self.analytics_file.stat().st_size
        if size >= self.max_size_bytes:
            self._rotate_file("size")
            return

        # Check line count without loading entire file into memory
        try:
            count = 0
            with open(self.analytics_file, 'r', encoding='utf-8', errors='ignore') as f:
                for count, _ in enumerate(f, start=1):
                    if count >= self.max_lines:
                        self._rotate_file("lines")
                        break
        except Exception:
            pass  # Best effort

    def _rotate_file(self, reason: str):
        """Rotate current file to timestamped backup."""
        timestamp = int(time.time())
        backup_name = f"analytics.{timestamp}.{reason}.jsonl"
        backup_path = self.data_dir / backup_name

        try:
            self.data_dir.mkdir(parents=True, exist_ok=True)
            self.analytics_file.rename(backup_path)
            # Keep only last 5 backups to prevent accumulation
            backups = sorted(self.data_dir.glob("analytics.*.jsonl"))
            if len(backups) > 5:
                for old_backup in backups[:-5]:
                    old_backup.unlink()
        except Exception:
            pass  # Best effort rotation

    def append_event(self, event: dict):
        """Append an analytics event to the file."""
        self._rotate_if_needed()

        # Preserve provided timestamp if present; otherwise stamp ISO8601 Z for frontend compatibility
        if "time" not in event:
            event = {**event, "time": datetime.utcnow().isoformat() + "Z"}

        try:
            self.data_dir.mkdir(parents=True, exist_ok=True)
            with open(self.analytics_file, 'a', encoding='utf-8') as f:
                json.dump(event, f, ensure_ascii=False)
                f.write('\n')
        except Exception:
            pass  # Best effort logging

    def get_recent_events(self, limit: int = 100, dir_filter: Optional[str] = None) -> List[dict]:
        """Get recent events, optionally filtered by directory. Efficiently tails the last `limit` lines."""
        if not self.analytics_file.exists():
            return []

        tail = deque(maxlen=max(1, int(limit)))
        try:
            with open(self.analytics_file, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    tail.append(line)
        except Exception:
            return []

        events: List[dict] = []
        for line in tail:
            try:
                event = json.loads(line.strip())
            except Exception:
                # malformed line; skip
                continue
            if dir_filter is None or str(event.get("dir")) == str(dir_filter):
                events.append(event)
        return events

    # New helper for streaming events (no limit) – used by attention aggregator.
    def iter_events(self) -> Iterable[dict]:
        if not self.analytics_file.exists():
            return
        if not self.analytics_file.exists():
            return
        with open(self.analytics_file, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                try:
                    evt = json.loads(line.strip())
                except Exception:
                    continue
                else:
                    yield evt
