from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional


SUPPORTED_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".webp", ".tiff"}
SUPPORTED_VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm", ".m4v"}
MODEL_NAME = "clip-ViT-B-32"


@dataclass
class Photo:
    path: Path
    mtime: float


@dataclass
class Video:
    path: Path
    mtime: float


@dataclass
class SearchResult:
    path: Path
    score: float