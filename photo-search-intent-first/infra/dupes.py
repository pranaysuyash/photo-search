from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Tuple

from PIL import Image


def _file(index_dir: Path) -> Path:
    return index_dir / "hashes.json"


def _ahash(path: Path, size: int = 8) -> int:
    img = Image.open(path).convert("L").resize((size, size), Image.BILINEAR)
    pixels = list(img.getdata())
    avg = sum(pixels) / len(pixels)
    bits = 0
    for p in pixels:
        bits = (bits << 1) | (1 if p >= avg else 0)
    return bits


def _hamming(a: int, b: int) -> int:
    return (a ^ b).bit_count()


def build_hashes(index_dir: Path, paths: List[str], size: int = 8) -> int:
    """Compute simple image hashes for quick look-alike detection.

    Returns number of hashes computed.
    """
    index_dir.mkdir(parents=True, exist_ok=True)
    data = {"paths": [], "hashes": []}
    f = _file(index_dir)
    if f.exists():
        try:
            data = json.loads(f.read_text())
        except Exception:
            data = {"paths": [], "hashes": []}
    known = {p: h for p, h in zip(data.get("paths", []), data.get("hashes", []))}
    updated = 0
    for p in paths:
        if p in known:
            continue
        try:
            h = _ahash(Path(p), size=size)
            known[p] = h
            updated += 1
        except Exception:
            continue
    # remove entries for missing files
    cleaned = {p: h for p, h in known.items() if Path(p).exists()}
    data = {"paths": list(cleaned.keys()), "hashes": list(cleaned.values())}
    f.write_text(json.dumps(data))
    return updated


def find_lookalikes(index_dir: Path, max_distance: int = 5) -> List[List[str]]:
    """Group look-alike photos by simple hash distance (small number means very similar)."""
    f = _file(index_dir)
    if not f.exists():
        return []
    try:
        data = json.loads(f.read_text())
    except Exception:
        return []
    paths = data.get("paths", [])
    hashes = data.get("hashes", [])
    n = len(paths)
    used = [False] * n
    groups: List[List[str]] = []
    for i in range(n):
        if used[i]:
            continue
        gi = [paths[i]]
        used[i] = True
        hi = hashes[i]
        for j in range(i + 1, n):
            if used[j]:
                continue
            if _hamming(int(hi), int(hashes[j])) <= max_distance:
                gi.append(paths[j])
                used[j] = True
        if len(gi) > 1:
            groups.append(gi)
    return groups


# Group resolution tracking
def _resolved_file(index_dir: Path) -> Path:
    return index_dir / "dupes_resolved.json"


def _group_id(paths: List[str]) -> str:
    import hashlib
    key = "|".join(sorted(paths))
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]


def load_resolved(index_dir: Path) -> List[str]:
    p = _resolved_file(index_dir)
    try:
        if p.exists():
            import json
            data = json.loads(p.read_text())
            if isinstance(data, list):
                return [str(x) for x in data]
    except Exception:
        pass
    return []


def save_resolved(index_dir: Path, ids: List[str]) -> None:
    from json import dumps
    try:
        _resolved_file(index_dir).write_text(dumps(sorted(set(ids))))
    except Exception:
        pass

