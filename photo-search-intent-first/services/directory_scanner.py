# services/directory_scanner.py
from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Dict
import os
import platform


class OSDirectoryProvider(ABC):
    @abstractmethod
    def get_directories(self, home: Path) -> List[Dict[str, str]]:
        pass


class CommonDirectoryProvider(OSDirectoryProvider):
    def get_directories(self, home: Path) -> List[Dict[str, str]]:
        dirs = []
        
        # Pictures directory (common on all platforms)
        pictures = home / "Pictures"
        if pictures.exists() and pictures.is_dir():
            dirs.append({"path": str(pictures), "label": "Pictures", "source": "home"})
        
        # Downloads directory (common on all platforms)
        downloads = home / "Downloads"
        if downloads.exists() and downloads.is_dir():
            dirs.append({"path": str(downloads), "label": "Downloads", "source": "home"})
        
        return dirs


class WindowsDirectoryProvider(OSDirectoryProvider):
    def get_directories(self, home: Path) -> List[Dict[str, str]]:
        dirs = []
        
        # OneDrive Pictures
        onedrive = os.environ.get("OneDrive")
        if onedrive:
            onedrive_path = Path(onedrive)
            pictures_path = onedrive_path / "Pictures"
            if pictures_path.exists() and pictures_path.is_dir():
                dirs.append({
                    "path": str(pictures_path), 
                    "label": "OneDrive Pictures", 
                    "source": "onedrive"
                })
        
        # Public Pictures
        public = os.environ.get("PUBLIC")
        if public:
            public_path = Path(public)
            pictures_path = public_path / "Pictures"
            if pictures_path.exists() and pictures_path.is_dir():
                dirs.append({
                    "path": str(pictures_path), 
                    "label": "Public Pictures", 
                    "source": "windows"
                })
        
        return dirs


class MacOSDirectoryProvider(OSDirectoryProvider):
    def get_directories(self, home: Path) -> List[Dict[str, str]]:
        dirs = []
        
        # iCloud Drive directories
        icloud_docs = home / "Library" / "Mobile Documents" / "com~apple~CloudDocs"
        if icloud_docs.exists() and icloud_docs.is_dir():
            photos_path = icloud_docs / "Photos"
            if photos_path.exists() and photos_path.is_dir():
                dirs.append({
                    "path": str(photos_path), 
                    "label": "iCloud Drive Photos", 
                    "source": "icloud"
                })
            
            pictures_path = icloud_docs / "Pictures"
            if pictures_path.exists() and pictures_path.is_dir():
                dirs.append({
                    "path": str(pictures_path), 
                    "label": "iCloud Drive Pictures", 
                    "source": "icloud"
                })
        
        # Newer iCloud Photos path
        icloud_photos = home / "Library" / "CloudStorage" / "iCloud Drive" / "Photos"
        if icloud_photos.exists() and icloud_photos.is_dir():
            dirs.append({
                "path": str(icloud_photos), 
                "label": "iCloud Photos", 
                "source": "icloud"
            })
        
        return dirs


class LinuxDirectoryProvider(OSDirectoryProvider):
    def get_directories(self, home: Path) -> List[Dict[str, str]]:
        dirs = []
        
        # XDG user directories from config file
        user_dirs_file = home / ".config" / "user-dirs.dirs"
        if user_dirs_file.exists():
            try:
                with open(user_dirs_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                # Simple parsing of XDG directory config
                for line in content.splitlines():
                    line = line.strip()
                    if line.startswith('XDG_PICTURE_DIR'):
                        # Extract path from line like: XDG_PICTURE_DIR="$HOME/Pictures"
                        path_part = line.split('=', 1)[1].strip().strip('"')
                        path_part = path_part.replace('$HOME', str(home))
                        picture_path = Path(path_part)
                        if picture_path.exists() and picture_path.is_dir():
                            dirs.append({
                                "path": str(picture_path), 
                                "label": "Pictures", 
                                "source": "xdg"
                            })
                        break
            except Exception:
                # If parsing fails, silently continue
                pass
        
        return dirs


class DirectoryScanner:
    def __init__(self):
        self.providers = {
            'common': CommonDirectoryProvider(),
            'windows': WindowsDirectoryProvider(),
            'darwin': MacOSDirectoryProvider(),
            'linux': LinuxDirectoryProvider(),
        }

    def get_default_photo_directories(self) -> List[Dict[str, str]]:
        all_dirs = []
        home = Path.home()
        sysname = platform.system().lower()
        
        # Always add common directories
        all_dirs.extend(self.providers['common'].get_directories(home))
        
        # Add OS-specific directories if they exist
        if sysname == 'windows':
            all_dirs.extend(self.providers['windows'].get_directories(home))
        elif sysname == 'darwin':  # macOS
            all_dirs.extend(self.providers['darwin'].get_directories(home))
        elif sysname == 'linux':
            all_dirs.extend(self.providers['linux'].get_directories(home))
        
        return self._deduplicate_directories(all_dirs)

    def _deduplicate_directories(self, dirs: List[Dict[str, str]]) -> List[Dict[str, str]]:
        seen = set()
        unique = []
        for d in dirs:
            if d is None:
                continue
            # Normalize the path to handle different representations of the same path
            key = self._normalize_path(d["path"])
            if key not in seen:
                seen.add(key)
                unique.append(d)
        return unique

    def _normalize_path(self, path: str) -> str:
        """Normalize a path string for comparison."""
        try:
            # Convert to Path object and resolve to handle things like .. and .
            p = Path(path).resolve()
            return str(p)
        except Exception:
            # If we can't resolve the path, return the original
            return path.strip().lower()