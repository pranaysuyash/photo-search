"""Models status router.

Exposes `/api/model/status` used by the frontend to understand whether
local (bundled) embedding/caption models are present and considered loaded.

Intentionally lightweight: no heavyweight ML imports or eager loads.
Just inspects filesystem + optional manifest to report coarse status.

Returned JSON structure matches the TypeScript consumer expectation in
`apiModelStatus()` (see `webapp/src/api.ts`).
"""
from __future__ import annotations

from pathlib import Path
from typing import Dict, Any, Iterable, Sequence
import json
import os
import time

from fastapi import APIRouter

from infra.config import config
from api.runtime_flags import is_offline as runtime_is_offline

router = APIRouter(tags=["models"])  # No prefix to stay consistent with other legacy routes

_CACHE_TTL = 5.0  # seconds – avoid hammering filesystem on rapid polls
_cache: Dict[str, Any] = {"ts": 0.0, "payload": None}


def _candidate_model_dir() -> Path | None:
    """Return plausible local models directory via layered heuristic."""
    return (
        _explicit_model_dir()
        or _search_ancestors_for(("electron", "models"))
        or _search_ancestors_for(("models",))
    )


def _explicit_model_dir() -> Path | None:
    if config.photovault_model_dir and config.photovault_model_dir.exists():
        return config.photovault_model_dir
    if config.sentence_transformers_home and config.sentence_transformers_home.exists():
        return config.sentence_transformers_home
    return None


def _search_ancestors_for(rel: Sequence[str]) -> Path | None:
    base_parents: Sequence[Path] = list(Path(__file__).resolve().parents)[:6]
    for anc in base_parents:
        candidate = anc.joinpath(*rel)
        if candidate.exists():
            return candidate
    return None


def _dir_size_mb(path: Path) -> float:
    total = 0
    try:
        for p in path.rglob("*"):
            if p.is_file():
                # Skip extremely large single files early if permission denied etc.
                try:
                    total += p.stat().st_size
                except Exception:
                    continue
    except Exception:
        return 0.0
    return round(total / (1024 * 1024), 2)


def _load_manifest(model_dir: Path) -> dict | None:
    # prepare_models.py writes a manifest.json next to downloaded models (if present)
    for candidate in [model_dir / "manifest.json", model_dir.parent / "manifest.json"]:
        if candidate.exists():
            try:
                return json.loads(candidate.read_text(encoding="utf-8"))
            except Exception:
                return None
    return None


_WEIGHT_SUFFIXES = {".pt", ".bin", ".safetensors", ".msgpack", ".h5"}


def _iter_weight_files(root: Path) -> Iterable[Path]:
    for p in root.rglob("*"):
        if p.is_file() and p.suffix.lower() in _WEIGHT_SUFFIXES:
            yield p


def _collect_models(model_dir: Path | None) -> Dict[str, Dict[str, Any]]:
    models: Dict[str, Dict[str, Any]] = {}
    if not (model_dir and model_dir.exists()):
        return models
    for child in sorted(model_dir.iterdir()):
        if not child.is_dir():
            continue
        size_mb = _dir_size_mb(child)
        # Detect weight presence either at top-level or nested (common for sentence-transformers exported format)
        has_weights = any(_iter_weight_files(child))
        # Heuristic: sentence-transformers config implies readiness even if weight scan fails (extremely rare)
        if not has_weights and (child / "config_sentence_transformers.json").exists():
            has_weights = True
        models[child.name] = {
            "name": child.name,
            "size_mb": size_mb,
            "loaded": bool(has_weights),
        }
    return models


def _normalize_manifest_list_item(models: Dict[str, Dict[str, Any]], model_dir: Path, item: Dict[str, Any]) -> None:
    name = _manifest_item_name(item)
    if not name:
        return
    entry = models.setdefault(name, {"name": name, "loaded": False})
    _apply_size(entry, item)
    _apply_hash(entry, item)
    _apply_loaded(entry, model_dir / name)


def _manifest_item_name(item: Dict[str, Any]) -> str | None:
    return item.get("local_name") or item.get("name") or item.get("repo_id")


def _apply_size(entry: Dict[str, Any], item: Dict[str, Any]) -> None:
    total_bytes = item.get("total_bytes")
    if isinstance(total_bytes, int) and total_bytes > 0:
        entry.setdefault("size_mb", round(total_bytes / (1024 * 1024), 2))


def _apply_hash(entry: Dict[str, Any], item: Dict[str, Any]) -> None:
    sha = item.get("sha256")
    if isinstance(sha, str):
        entry["hash"] = sha


def _apply_loaded(entry: Dict[str, Any], path: Path) -> None:
    if not path.exists() or entry.get("loaded"):
        return
    has_weights = any(_iter_weight_files(path))
    if not has_weights and (path / "config_sentence_transformers.json").exists():
        has_weights = True
    if has_weights:
        entry["loaded"] = True


def _augment_from_manifest(models: Dict[str, Dict[str, Any]], model_dir: Path | None) -> None:
    if not model_dir:
        return
    manifest = _load_manifest(model_dir)
    if not manifest:
        return
    if isinstance(manifest, list):  # Format A
        _process_manifest_list(models, model_dir, manifest)
    elif isinstance(manifest, dict):
        _process_manifest_dict(models, model_dir, manifest)


def _process_manifest_list(models: Dict[str, Dict[str, Any]], model_dir: Path, items: list[Any]) -> None:
    for item in items:
        if isinstance(item, dict):
            _normalize_manifest_list_item(models, model_dir, item)


def _process_manifest_dict(models: Dict[str, Dict[str, Any]], model_dir: Path, manifest: Dict[str, Any]) -> None:
    meta_models = manifest.get("models")
    if isinstance(meta_models, list):  # Format B
        _process_manifest_list(models, model_dir, meta_models)
    elif isinstance(meta_models, dict):  # Format C
        for name, data in meta_models.items():
            if not isinstance(data, dict):
                continue
            entry = models.setdefault(name, {"name": name, "loaded": False})
            size_mb_val = data.get("size_mb")
            if isinstance(size_mb_val, (int, float)):
                entry.setdefault("size_mb", size_mb_val)
            if "hash" in data:
                entry["hash"] = data["hash"]
            _apply_loaded(entry, model_dir / name)


def _capabilities(models: Dict[str, Dict[str, Any]]) -> Dict[str, bool]:
    names = list(models.keys())
    return {
        "clip": any("clip" in m.lower() for m in names),
        "embeddings": True,
        "captions": any("caption" in m.lower() or "vlm" in m.lower() for m in names),
    }


def _build_status_payload() -> Dict[str, Any]:
    model_dir = _candidate_model_dir()
    models = _collect_models(model_dir)
    _augment_from_manifest(models, model_dir)
    # Respect runtime toggle (admin endpoint) in addition to config/env defaults
    payload = {
        "ok": True,
        "models": models,
        "offline_mode": bool(
            config.offline_mode or os.getenv("OFFLINE_MODE") == "1" or runtime_is_offline()
        ),
        "model_dir": str(model_dir) if model_dir else None,
        "capabilities": _capabilities(models),
    }
    if os.getenv("MODEL_STATUS_DEBUG") == "1":
        payload["_debug"] = {
            "cwd": os.getcwd(),
            "env_photovault_model_dir": str(config.photovault_model_dir) if config.photovault_model_dir else None,
            "env_sentence_transformers_home": str(config.sentence_transformers_home) if config.sentence_transformers_home else None,
            "searched_ancestors": [str(p) for p in Path(__file__).resolve().parents[:6]],
        }
    return payload


@router.get("/api/model/status")
def model_status(force: int = 0) -> Dict[str, Any]:  # pragma: no cover - simple aggregation
    """Return cached model status snapshot.

    Caches for a short TTL to avoid repeated directory walks on rapid UI polling.
    """
    now = time.time()
    if force:
        _cache["payload"] = None
        _cache["ts"] = 0.0
    cached = _cache.get("payload")
    ts = float(_cache.get("ts", 0.0))
    if cached is not None and now - ts < _CACHE_TTL:
        return cached  # type: ignore[return-value]
    payload = _build_status_payload()
    _cache["payload"] = payload
    _cache["ts"] = now
    return payload