"""Tests for the DirectoryScanner service."""
import tempfile
from pathlib import Path
from unittest.mock import patch
import pytest

from services.directory_scanner import DirectoryScanner, CommonDirectoryProvider


def test_common_directory_provider():
    """Test that common directories are found."""
    provider = CommonDirectoryProvider()
    with tempfile.TemporaryDirectory() as temp_dir:
        home = Path(temp_dir)
        pictures = home / "Pictures"
        downloads = home / "Downloads"
        
        # Create test directories
        pictures.mkdir()
        downloads.mkdir()
        
        dirs = provider.get_directories(home)
        
        assert len(dirs) == 2
        assert any(d["label"] == "Pictures" for d in dirs)
        assert any(d["label"] == "Downloads" for d in dirs)


def test_directory_scanner_initialization():
    """Test that DirectoryScanner initializes correctly."""
    scanner = DirectoryScanner()
    
    assert 'common' in scanner.providers
    assert 'windows' in scanner.providers
    assert 'darwin' in scanner.providers
    assert 'linux' in scanner.providers


def test_directory_scanner_deduplication():
    """Test that duplicate directories are removed."""
    scanner = DirectoryScanner()
    
    test_dirs = [
        {"path": "/home/user/Pictures", "label": "Pictures", "source": "home"},
        {"path": "/home/user/Pictures", "label": "Pictures Alt", "source": "alt"},
        {"path": "/home/user/Downloads", "label": "Downloads", "source": "home"},
    ]
    
    unique_dirs = scanner._deduplicate_directories(test_dirs)
    
    assert len(unique_dirs) == 2
    # Should keep first occurrence
    assert unique_dirs[0]["label"] == "Pictures"
    assert unique_dirs[1]["label"] == "Downloads"


@patch('services.directory_scanner.os.uname')
def test_get_system_name_unix(mock_uname):
    """Test system name detection on Unix-like systems."""
    mock_uname.return_value.sysname = "Linux"
    scanner = DirectoryScanner()
    
    assert scanner._get_system_name() == "linux"


def test_get_system_name_windows(monkeypatch):
    """Test system name detection on Windows."""
    import services.directory_scanner
    
    # Mock os to simulate Windows environment
    class MockOS:
        name = 'nt'
        
    monkeypatch.setattr(services.directory_scanner, 'os', MockOS())
    
    scanner = DirectoryScanner()
    assert scanner._get_system_name() == "nt"


def test_safe_add_nonexistent_directory():
    """Test that _safe_add returns None for non-existent directories."""
    provider = CommonDirectoryProvider()
    
    result = provider._safe_add(Path("/nonexistent/path"), "Test", "test")
    
    assert result is None


if __name__ == "__main__":
    pytest.main([__file__])