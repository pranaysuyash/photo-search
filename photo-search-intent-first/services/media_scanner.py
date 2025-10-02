# services/media_scanner.py
from pathlib import Path
from typing import List, Dict, Any, Set
from dataclasses import dataclass


@dataclass
class MediaCounts:
    path: str
    count: int = 0
    bytes: int = 0


@dataclass
class ScanResult:
    items: List[MediaCounts]
    total_files: int
    total_bytes: int


class FileTypeFilter:
    def __init__(self, img_exts: Set[str], vid_exts: Set[str]):
        self.allowed_extensions = img_exts | vid_exts
        
    def is_media_file(self, file_path: Path) -> bool:
        return file_path.suffix.lower() in self.allowed_extensions


class DirectoryScanner:
    def __init__(self, file_filter: FileTypeFilter):
        self.file_filter = file_filter
        
    def scan_directory(self, directory: Path) -> MediaCounts:
        if not (directory.exists() and directory.is_dir()):
            return MediaCounts(path=str(directory))
            
        count = 0
        size = 0
        
        try:
            for file_path in self._walk_directory(directory):
                if self.file_filter.is_media_file(file_path):
                    count += 1
                    size += self._get_file_size(file_path)
        except Exception:
            # Reset on error
            count = 0
            size = 0
            
        return MediaCounts(path=str(directory), count=count, bytes=size)
    
    def _walk_directory(self, directory: Path):
        for root, _, files in os.walk(directory):
            for name in files:
                yield Path(root) / name
                
    def _get_file_size(self, file_path: Path) -> int:
        try:
            return file_path.stat().st_size
        except Exception:
            return 0


class MediaScanner:
    def __init__(self):
        # Define common image and video extensions
        self.img_exts = {
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', 
            '.webp', '.heic', '.heif', '.raw', '.cr2', '.nef', '.arw'
        }
        self.vid_exts = {
            '.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', 
            '.m4v', '.3gp', '.3g2', '.m2ts', '.mts'
        }

    def scan_media_counts(self, paths: List[str], include_videos: bool = True) -> Dict[str, Any]:
        file_filter = FileTypeFilter(
            self.img_exts, 
            self.vid_exts if include_videos else set()
        )
        scanner = DirectoryScanner(file_filter)
        
        results = []
        total_files = 0
        total_bytes = 0
        
        for path_str in paths:
            path = Path(path_str).expanduser()
            counts = scanner.scan_directory(path)
            results.append(counts)
            total_files += counts.count
            total_bytes += counts.bytes
            
        return ScanResult(
            items=[{"path": r.path, "count": r.count, "bytes": r.bytes} for r in results],
            total_files=total_files,
            total_bytes=total_bytes
        ).__dict__