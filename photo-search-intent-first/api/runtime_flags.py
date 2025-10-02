"""Simple runtime flags for toggling behaviors (e.g. offline mode) at runtime.

This module keeps a single global flag and thread-safe setters/getters. It's intentionally tiny
so tests and admin endpoints can flip behavior without restarting the server.
"""
from threading import Lock

_lock = Lock()
_offline = False

def set_offline(value: bool) -> None:
    global _offline
    with _lock:
        _offline = bool(value)

def is_offline() -> bool:
    with _lock:
        return bool(_offline)
