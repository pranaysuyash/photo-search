"""Tests for the MediaScanner service."""
import tempfile
import pytest
from pathlib import Path
from unittest.mock import patch

from services.media_scanner import MediaScanner, MediaScanResult


def test_media_scan_result():
    """Test MediaScanResult class."""
    result = MediaScanResult("/test/path", 5, 1024)
    
    assert result.path == "/test/path"
    assert result.count == 5
    assert result.size == 1024
    
    result_dict = result.to_dict()
    assert result_dict == {"path": "/test/path", "count": 5, "bytes": 1024}


def test_media_scanner_initialization():
    """Test that MediaScanner initializes correctly."""
    scanner = MediaScanner()
    assert scanner is not None


def test_get_file_extensions_with_videos():
    """Test file extension gathering with videos included."""
    scanner = MediaScanner()
    
    extensions = scanner._get_file_extensions(include_videos=True)
    
    # Should include both image and video extensions
    assert '.jpg' in extensions
    assert '.png' in extensions
    assert '.mp4' in extensions
    assert '.mov' in extensions


def test_get_file_extensions_without_videos():
    """Test file extension gathering without videos."""
    scanner = MediaScanner()
    
    extensions = scanner._get_file_extensions(include_videos=False)
    
    # Should include only image extensions
    assert '.jpg' in extensions
    assert '.png' in extensions
    assert '.mp4' not in extensions
    assert '.mov' not in extensions


def test_is_media_file():
    """Test media file detection."""
    scanner = MediaScanner()
    extensions = {'.jpg', '.png', '.mp4'}
    
    assert scanner._is_media_file('photo.jpg', extensions) is True
    assert scanner._is_media_file('PHOTO.JPG', extensions) is True  # Case insensitive
    assert scanner._is_media_file('image.png', extensions) is True
    assert scanner._is_media_file('video.mp4', extensions) is True
    assert scanner._is_media_file('document.txt', extensions) is False
    assert scanner._is_media_file('archive.zip', extensions) is False


def test_scan_single_directory_nonexistent():
    """Test scanning a non-existent directory."""
    scanner = MediaScanner()
    extensions = {'.jpg', '.png'}
    
    result = scanner._scan_single_directory('/nonexistent/path', extensions)
    
    assert result.path == '/nonexistent/path'
    assert result.count == 0
    assert result.size == 0


def test_count_media_files_nonexistent_directory():
    """Test counting files in non-existent directory."""
    scanner = MediaScanner()
    extensions = {'.jpg', '.png'}
    
    count, size = scanner._count_media_files(Path('/nonexistent'), extensions)
    
    assert count == 0
    assert size == 0


def test_scan_directories_with_real_files():
    """Test scanning directories with actual files."""
    scanner = MediaScanner()
    
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # Create test files
        (temp_path / "photo1.jpg").write_text("fake jpg content")
        (temp_path / "photo2.png").write_text("fake png content")
        (temp_path / "video.mp4").write_text("fake mp4 content")
        (temp_path / "document.txt").write_text("not a media file")
        
        # Create subdirectory with files
        subdir = temp_path / "subdir"
        subdir.mkdir()
        (subdir / "photo3.jpg").write_text("another fake jpg")
        
        # Test with videos included
        result = scanner.scan_directories([str(temp_path)], include_videos=True)
        
        assert result["total_files"] == 4  # 3 images + 1 video
        assert result["total_bytes"] > 0
        assert len(result["items"]) == 1
        assert result["items"][0]["path"] == str(temp_path)
        assert result["items"][0]["count"] == 4
        
        # Test without videos
        result_no_video = scanner.scan_directories([str(temp_path)], include_videos=False)
        
        assert result_no_video["total_files"] == 3  # Only images
        assert result_no_video["items"][0]["count"] == 3


def test_scan_directories_multiple_paths():
    """Test scanning multiple directories."""
    scanner = MediaScanner()
    
    with tempfile.TemporaryDirectory() as temp_dir1, tempfile.TemporaryDirectory() as temp_dir2:
        # Create files in first directory
        (Path(temp_dir1) / "photo1.jpg").write_text("content1")
        (Path(temp_dir1) / "photo2.png").write_text("content2")
        
        # Create files in second directory
        (Path(temp_dir2) / "photo3.jpg").write_text("content3")
        
        result = scanner.scan_directories([temp_dir1, temp_dir2], include_videos=False)
        
        assert result["total_files"] == 3
        assert len(result["items"]) == 2
        assert result["items"][0]["count"] == 2
        assert result["items"][1]["count"] == 1


def test_scan_directories_error_handling():
    """Test error handling during directory scanning."""
    scanner = MediaScanner()
    
    # Mix of valid and invalid paths
    paths = ["/nonexistent/path1", "/nonexistent/path2"]
    
    result = scanner.scan_directories(paths, include_videos=True)
    
    # Should return zero counts for all failed directories
    assert result["total_files"] == 0
    assert result["total_bytes"] == 0
    assert len(result["items"]) == 2
    assert all(item["count"] == 0 for item in result["items"])


@patch('services.media_scanner.os.walk')
def test_count_media_files_walk_exception(mock_walk):
    """Test handling of os.walk exceptions."""
    scanner = MediaScanner()
    mock_walk.side_effect = OSError("Permission denied")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        count, size = scanner._count_media_files(Path(temp_dir), {'.jpg'})
        
        assert count == 0
        assert size == 0


if __name__ == "__main__":
    pytest.main([__file__])