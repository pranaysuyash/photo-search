"""Tests for the SearchExecutor service."""
import pytest
from unittest.mock import Mock, patch
from pathlib import Path

from services.search_executor import SearchExecutor, SearchMode
from api.search_models import SearchRequest as UnifiedSearchRequest
from domain.models import SearchResult


def test_search_mode_constants():
    """Test that search mode constants are defined correctly."""
    assert SearchMode.FAST == "fast"
    assert SearchMode.CAPTIONS == "captions"
    assert SearchMode.OCR == "ocr"
    assert SearchMode.REGULAR == "regular"
    assert SearchMode.ALL_PHOTOS == "all_photos"


def test_search_executor_initialization():
    """Test that SearchExecutor initializes correctly."""
    executor = SearchExecutor()
    assert executor is not None


def test_determine_search_mode_all_photos():
    """Test search mode determination for all photos (no query)."""
    executor = SearchExecutor()
    mock_store = Mock()
    
    mode = executor._determine_search_mode("", {}, mock_store)
    assert mode == SearchMode.ALL_PHOTOS
    
    mode = executor._determine_search_mode("   ", {}, mock_store)
    assert mode == SearchMode.ALL_PHOTOS


def test_determine_search_mode_fast():
    """Test search mode determination for fast search."""
    executor = SearchExecutor()
    mock_store = Mock()
    
    mode = executor._determine_search_mode(
        "test query", 
        {"use_fast": True}, 
        mock_store
    )
    assert mode == SearchMode.FAST


def test_determine_search_mode_captions():
    """Test search mode determination for caption search."""
    executor = SearchExecutor()
    mock_store = Mock()
    mock_store.captions_available.return_value = True
    
    mode = executor._determine_search_mode(
        "test query", 
        {"use_captions": True}, 
        mock_store
    )
    assert mode == SearchMode.CAPTIONS


def test_determine_search_mode_ocr():
    """Test search mode determination for OCR search."""
    executor = SearchExecutor()
    mock_store = Mock()
    mock_store.captions_available.return_value = False
    mock_store.ocr_available.return_value = True
    
    mode = executor._determine_search_mode(
        "test query", 
        {"use_ocr": True}, 
        mock_store
    )
    assert mode == SearchMode.OCR


def test_determine_search_mode_regular():
    """Test search mode determination for regular search."""
    executor = SearchExecutor()
    mock_store = Mock()
    mock_store.captions_available.return_value = False
    mock_store.ocr_available.return_value = False
    
    mode = executor._determine_search_mode(
        "test query", 
        {}, 
        mock_store
    )
    assert mode == SearchMode.REGULAR


def test_execute_all_photos_search():
    """Test execution of all photos search."""
    executor = SearchExecutor()
    mock_store = Mock()
    mock_store.state.paths = ["/path/to/photo1.jpg", "/path/to/photo2.jpg"]
    
    results = executor._execute_all_photos_search(mock_store)
    
    assert len(results) == 2
    assert all(isinstance(r, SearchResult) for r in results)
    assert all(r.score == 1.0 for r in results)
    assert results[0].path == Path("/path/to/photo1.jpg")
    assert results[1].path == Path("/path/to/photo2.jpg")


def test_execute_caption_search():
    """Test execution of caption search."""
    executor = SearchExecutor()
    mock_store = Mock()
    mock_embedder = Mock()
    mock_results = [Mock()]
    mock_store.search_with_captions.return_value = mock_results
    
    results = executor._execute_caption_search(
        mock_store, mock_embedder, "test query", {"top_k": 10}
    )
    
    assert results == mock_results
    mock_store.search_with_captions.assert_called_once_with(
        mock_embedder, "test query", 10
    )


def test_execute_ocr_search():
    """Test execution of OCR search."""
    executor = SearchExecutor()
    mock_store = Mock()
    mock_embedder = Mock()
    mock_results = [Mock()]
    mock_store.search_with_ocr.return_value = mock_results
    
    results = executor._execute_ocr_search(
        mock_store, mock_embedder, "test query", {"top_k": 10}
    )
    
    assert results == mock_results
    mock_store.search_with_ocr.assert_called_once_with(
        mock_embedder, "test query", 10
    )


def test_execute_regular_search():
    """Test execution of regular search."""
    executor = SearchExecutor()
    mock_store = Mock()
    mock_embedder = Mock()
    mock_unified_req = Mock()
    mock_unified_req.similarity_threshold = 0.5
    mock_results = [Mock()]
    mock_store.search.return_value = mock_results
    
    legacy_params = {
        "top_k": 10,
        "use_captions": False,
        "use_fast": False,
        "fast_kind": None,
        "use_ocr": False
    }
    
    results = executor._execute_regular_search(
        mock_store, mock_embedder, "test query", mock_unified_req, legacy_params
    )
    
    assert results == mock_results
    mock_store.search.assert_called_once_with(
        mock_embedder,
        "test query",
        top_k=10,
        similarity_threshold=0.5,
        use_captions=False,
        use_fast=False,
        fast_kind=None,
        use_ocr=False
    )


if __name__ == "__main__":
    pytest.main([__file__])