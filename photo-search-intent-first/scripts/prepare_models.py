#!/usr/bin/env python3
"""Download and stage CLIP model assets for Electron packaging.

This script reads `electron/models/manifest.template.json`, downloads the listed
Hugging Face repositories into `electron/models/<local_name>/`, computes a
stable SHA-256 digest for each staged model directory, and writes the resulting
metadata to `electron/models/manifest.json`.

The manifest is shipped with the Electron bundle so the runtime can validate and
copy models into the user data directory on first launch.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
from typing import Dict, Iterable, Tuple

try:
    from huggingface_hub import snapshot_download
except ImportError as exc:  # pragma: no cover - import guard
    print("[prepare_models] Missing dependency 'huggingface-hub'.", file=sys.stderr)
    print("Install project requirements before running this script.", file=sys.stderr)
    raise

ROOT = Path(__file__).resolve().parents[1]
MODELS_DIR = ROOT / "electron" / "models"
TEMPLATE_PATH = MODELS_DIR / "manifest.template.json"
MANIFEST_PATH = MODELS_DIR / "manifest.json"


def compute_directory_digest(directory: Path) -> Tuple[str, int]:
    """Compute a deterministic SHA-256 digest for a directory tree."""
    if not directory.exists():
        raise FileNotFoundError(f"Model directory missing: {directory}")

    hasher = hashlib.sha256()
    total_bytes = 0

    for path in sorted(directory.rglob("*")):
        if path.is_dir():
            continue
        if not path.is_file():
            continue
        relative = path.relative_to(directory).as_posix()
        hasher.update(relative.encode("utf-8"))
        with path.open("rb") as fh:
            for chunk in iter(lambda: fh.read(1024 * 1024), b""):
                hasher.update(chunk)
        total_bytes += path.stat().st_size

    return hasher.hexdigest(), total_bytes


def download_model(repo_id: str, target_dir: Path, allow_patterns: Iterable[str] | None = None) -> None:
    """Download a Hugging Face repository snapshot into ``target_dir``."""
    snapshot_download(
        repo_id=repo_id,
        local_dir=target_dir,
        local_dir_use_symlinks=False,
        allow_patterns=list(allow_patterns) if allow_patterns else None,
    )


def main(force: bool = False) -> None:
    if not TEMPLATE_PATH.exists():
        raise FileNotFoundError(f"Template manifest not found: {TEMPLATE_PATH}")

    with TEMPLATE_PATH.open("r", encoding="utf-8") as fh:
        template = json.load(fh)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    manifest: Dict[str, Dict[str, object]] = {}

    for entry in template:
        repo_id = entry["repo_id"]
        local_name = entry.get("local_name") or repo_id.split("/")[-1]
        allow_patterns = entry.get("allow_patterns")
        target_dir = MODELS_DIR / local_name

        if target_dir.exists() and not force:
            print(f"[prepare_models] Skipping existing model: {local_name}")
        else:
            if target_dir.exists():
                print(f"[prepare_models] Refreshing model directory: {local_name}")
            else:
                print(f"[prepare_models] Downloading {repo_id} → {local_name}")
            download_model(repo_id, target_dir, allow_patterns)

        digest, total_bytes = compute_directory_digest(target_dir)
        manifest[local_name] = {
            "repo_id": repo_id,
            "local_name": local_name,
            "sha256": digest,
            "total_bytes": total_bytes,
            "description": entry.get("description", ""),
        }

    with MANIFEST_PATH.open("w", encoding="utf-8") as fh:
        json.dump({"models": list(manifest.values())}, fh, indent=2)
        fh.write("\n")

    print(f"[prepare_models] Wrote manifest → {MANIFEST_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download and stage bundled models.")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download models even if the target directory already exists.",
    )
    args = parser.parse_args()
    main(force=args.force)
