"""
MediaScanner Service

Extracted from server.py _scan_media_counts function to reduce
cyclomatic complexity (CCN: 11 → 3-4 per method).

Handles scanning directories for media files (images and videos),
counting files and calculating total sizes for quick previews.
"""

import os
from pathlib import Path
from typing import List, Dict, Any, Set

from domain.models import SUPPORTED_EXTS, SUPPORTED_VIDEO_EXTS


class MediaScanResult:
    """Result of a media scan operation."""
    
    def __init__(self, path: str, count: int, size: int):
        self.path = path
        self.count = count
        self.size = size
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format."""
        return {"path": self.path, "count": self.count, "bytes": self.size}


class MediaScanner:
    """Service for scanning directories and counting media files."""
    
    def scan_directories(self, paths: List[str], include_videos: bool = True) -> Dict[str, Any]:
        """Count image/video files and bytes for quick previews; privacy-friendly."""
        file_extensions = self._get_file_extensions(include_videos)
        scan_results = []
        total_files = 0
        total_bytes = 0
        
        for path in paths:
            result = self._scan_single_directory(path, file_extensions)
            scan_results.append(result)
            total_files += result.count
            total_bytes += result.size
        
        return {
            "items": [result.to_dict() for result in scan_results],
            "total_files": total_files,
            "total_bytes": total_bytes
        }
    
    def _get_file_extensions(self, include_videos: bool) -> Set[str]:
        """Get the set of file extensions to scan for."""
        extensions = SUPPORTED_EXTS.copy()
        if include_videos:
            extensions.update(SUPPORTED_VIDEO_EXTS)
        return extensions
    
    def _scan_single_directory(self, path: str, file_extensions: Set[str]) -> MediaScanResult:
        """Scan a single directory for media files."""
        try:
            pth = Path(path).expanduser()
            count, size = self._count_media_files(pth, file_extensions)
            return MediaScanResult(str(pth), count, size)
        except Exception:
            # Return zero counts for any directory that fails to scan
            return MediaScanResult(path, 0, 0)
    
    def _count_media_files(self, directory: Path, file_extensions: Set[str]) -> tuple[int, int]:
        """Count media files and calculate total size in a directory."""
        if not directory.exists() or not directory.is_dir():
            return 0, 0
        
        count = 0
        total_size = 0
        
        try:
            for root, _, files in os.walk(directory):
                for filename in files:
                    if self._is_media_file(filename, file_extensions):
                        count += 1
                        try:
                            file_path = Path(root) / filename
                            total_size += file_path.stat().st_size
                        except Exception:
                            # Skip files that can't be stat'd (permissions, etc.)
                            continue
        except Exception:
            # Return partial results if walk fails
            pass
        
        return count, total_size
    
    def _is_media_file(self, filename: str, file_extensions: Set[str]) -> bool:
        """Check if a file is a supported media file."""
        ext = Path(filename).suffix.lower()
        return ext in file_extensions