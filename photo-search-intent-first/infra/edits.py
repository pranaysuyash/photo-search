from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha1
from pathlib import Path
from typing import Dict, Optional

from PIL import Image, ImageOps


@dataclass
class EditOps:
    rotate: int = 0  # degrees clockwise, multiples of 90
    flip: Optional[str] = None  # 'h' or 'v'
    crop: Optional[Dict[str, int]] = None  # {x,y,w,h}


def _edits_dir(index_dir: Path) -> Path:
    d = index_dir / "edits"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _ops_key(path: Path, ops: EditOps) -> str:
    key = f"{path}|rot={ops.rotate}|flip={ops.flip}|crop={ops.crop}"
    return sha1(key.encode("utf-8")).hexdigest()[:16]


def apply_ops(index_dir: Path, src_path: Path, ops: EditOps) -> Path:
    with Image.open(src_path) as img:
        img = img.convert("RGB")
        if ops.crop and all(k in ops.crop for k in ("x", "y", "w", "h")):
            x = int(ops.crop["x"]); y = int(ops.crop["y"]); w = int(ops.crop["w"]); h = int(ops.crop["h"])
            img = img.crop((x, y, x + w, y + h))
        rot = int(ops.rotate or 0) % 360
        if rot:
            img = img.rotate(360 - rot, expand=True)  # PIL is counter‑clockwise
        if ops.flip == 'h':
            img = ImageOps.mirror(img)
        if ops.flip == 'v':
            img = ImageOps.flip(img)
        out_dir = _edits_dir(index_dir)
        key = _ops_key(src_path, ops)
        out = out_dir / f"{src_path.stem}.edit-{key}{src_path.suffix.lower()}"
        img.save(out)
        return out


def upscale(index_dir: Path, src_path: Path, scale: int = 2, engine: str = "pil") -> Path:
    scale = 4 if scale >= 4 else 2
    with Image.open(src_path) as img:
        img = img.convert("RGB")
        if engine.lower() == 'realesrgan':
            try:
                # Optional integration; fall back to PIL resize
                pass
            except Exception:
                pass
        w, h = img.size
        out_img = img.resize((w * scale, h * scale), Image.LANCZOS)
        out_dir = _edits_dir(index_dir)
        key = sha1(f"{src_path}|up{scale}|{engine}".encode("utf-8")).hexdigest()[:12]
        out = out_dir / f"{src_path.stem}.up{scale}x-{key}{src_path.suffix.lower()}"
        out_img.save(out)
        return out
