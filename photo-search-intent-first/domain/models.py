from dataclasses import dataclass
from pathlib import Path
from typing import List


SUPPORTED_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".webp", ".tiff"}
MODEL_NAME = "clip-ViT-B-32"


@dataclass
class Photo:
    path: Path
    mtime: float


@dataclass
class SearchResult:
    path: Path
    score: float

