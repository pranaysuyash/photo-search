from __future__ import annotations

import threading
import time
from pathlib import Path
from typing import Callable, Dict, Set, Optional

try:
    from watchdog.observers import Observer  # type: ignore
    from watchdog.events import FileSystemEventHandler  # type: ignore
    _WATCHDOG_OK = True
except Exception:
    # Provide a minimal fallback to avoid NameError at import time when
    # watchdog isn't available. We will no-op the watcher in this case.
    _WATCHDOG_OK = False
    class FileSystemEventHandler:  # type: ignore
        pass


class _Handler(FileSystemEventHandler):
    def __init__(self, on_change: Callable[[str], None], exts: Optional[Set[str]] = None) -> None:
        super().__init__()
        self.on_change = on_change
        self.exts = exts or set()

    def _ok(self, path: str) -> bool:
        if not self.exts:
            return True
        from pathlib import Path as _P
        return _P(path).suffix.lower() in self.exts

    def on_created(self, event):
        if not event.is_directory and self._ok(event.src_path):
            self.on_change(event.src_path)

    def on_modified(self, event):
        if not event.is_directory and self._ok(event.src_path):
            self.on_change(event.src_path)

    def on_moved(self, event):
        if not event.is_directory and self._ok(event.dest_path):
            self.on_change(event.dest_path)


class WatchManager:
    """Lightweight directory watchers with debounce batch callback."""

    def __init__(self) -> None:
        self._obs: Dict[str, Observer] = {}
        self._pending: Dict[str, Set[str]] = {}
        self._lock = threading.Lock()
        self._workers: Dict[str, threading.Thread] = {}

    def available(self) -> bool:
        return _WATCHDOG_OK

    def start(self, folder: Path, on_batch: Callable[[Set[str]], None], exts: Optional[Set[str]] = None, debounce_ms: int = 1500) -> bool:
        if not _WATCHDOG_OK:
            return False
        p = str(Path(folder).expanduser().resolve())
        if p in self._obs:
            return True
        self._pending[p] = set()
        handler = _Handler(lambda s: self._add(p, s), exts=exts)
        obs = Observer()
        obs.schedule(handler, p, recursive=True)
        obs.start()
        self._obs[p] = obs
        # Debounce worker
        def worker():
            last = 0.0
            while p in self._obs:
                time.sleep(0.3)
                now = time.time()
                fire = False
                batch: Set[str] = set()
                with self._lock:
                    if self._pending[p]:
                        # if no changes for debounce_ms, flush
                        if now - last >= (debounce_ms / 1000.0):
                            batch = set(self._pending[p])
                            self._pending[p].clear()
                            fire = True
                        else:
                            # keep waiting
                            pass
                if fire and batch:
                    try:
                        on_batch(batch)
                    except Exception:
                        pass
                last = now
        t = threading.Thread(target=worker, daemon=True)
        t.start()
        self._workers[p] = t
        return True

    def _add(self, root: str, path: str) -> None:
        with self._lock:
            s = self._pending.get(root)
            if s is not None:
                s.add(path)

    def stop(self, folder: Path) -> None:
        p = str(Path(folder).expanduser().resolve())
        obs = self._obs.pop(p, None)
        if obs is not None:
            try:
                obs.stop()
                obs.join(timeout=2.0)
            except Exception:
                pass
        with self._lock:
            self._pending.pop(p, None)
        self._workers.pop(p, None)
