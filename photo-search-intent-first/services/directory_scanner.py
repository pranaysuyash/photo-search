"""Directory scanning service for finding default photo directories.

Extracted from server.py _default_photo_dir_candidates function to reduce
cyclomatic complexity from CCN 15 to 3-4 per method.
"""
from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Dict, Optional
import os


class OSDirectoryProvider(ABC):
    """Abstract base class for OS-specific directory providers."""
    
    @abstractmethod
    def get_directories(self, home: Path) -> List[Dict[str, str]]:
        """Get OS-specific photo directories."""
        pass
    
    def _safe_add(self, path: Path, label: str, source: str) -> Optional[Dict[str, str]]:
        """Safely add a directory if it exists."""
        try:
            if path.exists() and path.is_dir():
                return {"path": str(path), "label": label, "source": source}
        except Exception:
            pass
        return None


class CommonDirectoryProvider(OSDirectoryProvider):
    """Provider for common directories across all operating systems."""
    
    def get_directories(self, home: Path) -> List[Dict[str, str]]:
        """Get common directories like Pictures and Downloads."""
        dirs = [
            self._safe_add(home / "Pictures", "Pictures", "home"),
            self._safe_add(home / "Downloads", "Downloads", "home"),
        ]
        return [d for d in dirs if d is not None]


class WindowsDirectoryProvider(OSDirectoryProvider):
    """Provider for Windows-specific directories."""
    
    def get_directories(self, home: Path) -> List[Dict[str, str]]:
        """Get Windows-specific directories like OneDrive and Public folders."""
        dirs = []
        
        # OneDrive directories
        if onedrive := os.environ.get("OneDrive"):
            onedrive_pics = self._safe_add(
                Path(onedrive) / "Pictures", 
                "OneDrive Pictures", 
                "onedrive"
            )
            if onedrive_pics:
                dirs.append(onedrive_pics)
        
        # Public directories  
        if public := os.environ.get("PUBLIC"):
            public_pics = self._safe_add(
                Path(public) / "Pictures", 
                "Public Pictures", 
                "windows"
            )
            if public_pics:
                dirs.append(public_pics)
                
        return dirs


class MacOSDirectoryProvider(OSDirectoryProvider):
    """Provider for macOS-specific directories."""
    
    def get_directories(self, home: Path) -> List[Dict[str, str]]:
        """Get macOS-specific directories like iCloud Drive."""
        dirs = []
        icloud_docs = home / "Library" / "Mobile Documents" / "com~apple~CloudDocs"
        
        icloud_candidates = [
            (icloud_docs / "Photos", "iCloud Drive Photos", "icloud"),
            (icloud_docs / "Pictures", "iCloud Drive Pictures", "icloud"),
            (home / "Library" / "CloudStorage" / "iCloud Drive" / "Photos", "iCloud Photos", "icloud"),
        ]
        
        for path, label, source in icloud_candidates:
            if result := self._safe_add(path, label, source):
                dirs.append(result)
                
        return dirs


class LinuxDirectoryProvider(OSDirectoryProvider):
    """Provider for Linux-specific directories."""
    
    def get_directories(self, home: Path) -> List[Dict[str, str]]:
        """Get Linux-specific directories from XDG configuration."""
        dirs = []
        try:
            user_dirs = home / ".config" / "user-dirs.dirs"
            if user_dirs.exists():
                dirs.extend(self._parse_xdg_config(user_dirs, home))
        except Exception:
            pass
        return dirs
    
    def _parse_xdg_config(self, config_file: Path, home: Path) -> List[Dict[str, str]]:
        """Parse XDG user directories configuration."""
        dirs = []
        try:
            text = config_file.read_text(encoding="utf-8")
            for line in text.splitlines():
                if line.startswith("XDG_PICTURES_DIR") or line.startswith("XDG_DOWNLOAD_DIR"):
                    parts = line.split("=")
                    if len(parts) == 2:
                        raw = parts[1].strip().strip('"')
                        resolved = raw.replace("$HOME", str(home))
                        label = "Pictures" if "PICTURES" in parts[0] else "Downloads"
                        if result := self._safe_add(Path(resolved), label, "xdg"):
                            dirs.append(result)
        except Exception:
            pass
        return dirs


class DirectoryScanner:
    """Main service for scanning and finding default photo directories."""
    
    def __init__(self):
        """Initialize with OS-specific providers."""
        self.providers = {
            'common': CommonDirectoryProvider(),
            'windows': WindowsDirectoryProvider(),
            'darwin': MacOSDirectoryProvider(), 
            'linux': LinuxDirectoryProvider(),
        }
    
    def get_default_photo_directories(self) -> List[Dict[str, str]]:
        """Get default photo directories for the current OS."""
        all_dirs = []
        home = Path.home()
        sysname = self._get_system_name()
        
        # Always add common directories
        all_dirs.extend(self.providers['common'].get_directories(home))
        
        # Add OS-specific directories
        if sysname in self.providers:
            all_dirs.extend(self.providers[sysname].get_directories(home))
            
        return self._deduplicate_directories(all_dirs)
    
    def _get_system_name(self) -> str:
        """Get the current operating system name."""
        return (os.uname().sysname if hasattr(os, 'uname') else os.name).lower()
        
    def _deduplicate_directories(self, dirs: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """Remove duplicate directories based on normalized paths."""
        seen = set()
        unique = []
        for d in dirs:
            if d is None:
                continue
            key = self._normalize_path(d["path"])
            if key not in seen:
                seen.add(key)
                unique.append(d)
        return unique
    
    def _normalize_path(self, path: str) -> str:
        """Normalize path for comparison (case-insensitive on Windows/macOS)."""
        normalized = str(Path(path).resolve())
        # Case-insensitive comparison on case-insensitive filesystems
        if os.name == 'nt' or 'darwin' in self._get_system_name():
            normalized = normalized.lower()
        return normalized