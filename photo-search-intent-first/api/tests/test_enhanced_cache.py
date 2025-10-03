"""
Tests for the enhanced search cache manager with proper DTO handling and canonicalization.
"""
import pytest
import tempfile
import time
from pathlib import Path
from unittest.mock import patch, MagicMock

from api.managers.search_cache_manager import (
    SearchCacheManager, 
    _canonicalize_params,
    LRUCache
)
from api.models.search import SearchResponse, SearchResult, SearchProvider


def test_canonicalize_params_stability():
    """Test that canonicalization produces stable keys for semantically identical params."""
    # Same params in different orders should produce same canonical form
    params1 = {
        "query": "sunset beach",
        "dir": "/photos",
        "provider": "local",
        "top_k": 12,
        "use_fast": True
    }
    
    params2 = {
        "dir": "/photos",
        "query": "sunset beach",
        "use_fast": True,
        "top_k": 12,
        "provider": "local"
    }
    
    canonical1 = _canonicalize_params(params1)
    canonical2 = _canonicalize_params(params2)
    
    # Should be identical dicts
    assert canonical1 == canonical2
    
    # Generate cache keys - should be identical
    cache_manager = SearchCacheManager()
    key1 = cache_manager._generate_cache_key(params1)
    key2 = cache_manager._generate_cache_key(params2)
    
    assert key1 == key2


def test_canonicalize_params_filtering():
    """Test that canonicalization filters to only semantic fields."""
    params = {
        "query": "mountains",
        "dir": "/photos/nature",
        "provider": "local",
        "top_k": 10,
        "use_fast": True,
        "debug_info": "should_be_filtered_out",
        "temporary_flag": True,
        "cache_buster": "12345"  # Should be filtered out
    }
    
    canonical = _canonicalize_params(params)
    
    # Should only contain semantic fields
    expected_fields = {
        "query", "dir", "provider", "top_k", "use_fast", "use_captions", 
        "use_ocr", "use_metadata", "favorites_only", "date_from", "date_to",
        "camera", "iso_min", "iso_max", "f_min", "f_max", "place", "person",
        "persons", "has_text", "flash", "wb", "metering", "alt_min", "alt_max",
        "heading_min", "heading_max", "sharp_only", "exclude_underexp", 
        "exclude_overexp", "tags", "exclude_tags", "collections", "fast_kind",
        "limit"
    }
    
    # All canonical keys should be in expected fields
    for key in canonical:
        assert key in expected_fields


def test_lru_cache_thread_safety():
    """Test that LRU cache operations are thread-safe."""
    import threading
    import time
    
    cache = LRUCache(max_size=100, default_ttl=10)
    
    # Simulate concurrent access
    errors = []
    
    def worker(thread_id):
        try:
            for i in range(50):
                key = f"key_{thread_id}_{i}"
                value = f"value_{thread_id}_{i}"
                
                # Set value
                cache.set(key, value)
                
                # Get value
                retrieved = cache.get(key)
                assert retrieved == value
                
                # Occasionally delete
                if i % 10 == 0:
                    cache.delete(key)
                
                # Occasionally clear
                if i % 25 == 0:
                    cache.clear()
                
                time.sleep(0.001)  # Small delay
                
        except Exception as e:
            errors.append(f"Thread {thread_id}: {e}")
    
    # Start multiple threads
    threads = []
    for i in range(5):
        t = threading.Thread(target=worker, args=(i,))
        threads.append(t)
        t.start()
    
    # Wait for all threads
    for t in threads:
        t.join()
    
    # Check for errors
    assert len(errors) == 0, f"Thread safety errors: {errors}"


def test_search_cache_manager_dto_handling():
    """Test that cache manager properly handles SearchResponse DTOs."""
    with tempfile.TemporaryDirectory() as temp_dir:
        # Mock database manager
        mock_db_manager = MagicMock()
        mock_db_manager.get_cached_results.return_value = None
        
        # Create cache manager with mocked DB
        with patch('api.managers.search_cache_manager.get_db_manager') as mock_get_db:
            mock_get_db.return_value = mock_db_manager
            cache_manager = SearchCacheManager()
        
        # Create a sample SearchResponse
        sample_results = [
            SearchResult(
                id="photo1.jpg",
                filename="photo1.jpg",
                path="/photos/photo1.jpg",
                score=0.95,
                metadata={"camera": "Canon EOS R5"},
                thumbnail_path="/thumbnails/photo1.jpg"
            ),
            SearchResult(
                id="photo2.jpg", 
                filename="photo2.jpg",
                path="/photos/photo2.jpg",
                score=0.87,
                metadata={"camera": "Sony A7R IV"},
                thumbnail_path="/thumbnails/photo2.jpg"
            )
        ]
        
        search_response = SearchResponse(
            results=sample_results,
            total_count=2,
            query="beach sunset",
            filters_applied=["favorites_only"],
            search_time_ms=123.45,
            provider_used=SearchProvider.LOCAL
        )
        
        # Create search params
        search_params = {
            "query": "beach sunset",
            "dir": "/photos",
            "provider": "local",
            "top_k": 12
        }
        
        # Cache the response
        cache_manager.cache_search_results(search_params, search_response, ttl=300)
        
        # Retrieve cached results
        cached_dto = cache_manager.get_search_results(search_params)
        
        # Verify DTO structure
        assert cached_dto is not None
        assert "query" in cached_dto
        assert "provider" in cached_dto
        assert "results" in cached_dto
        assert "total_count" in cached_dto
        assert "filters_applied" in cached_dto
        assert cached_dto["query"] == "beach sunset"
        assert cached_dto["total_count"] == 2
        assert len(cached_dto["results"]) == 2
        assert cached_dto["filters_applied"] == ["favorites_only"]


def test_cache_stats_thread_safety():
    """Test that cache statistics are thread-safe."""
    import threading
    import time
    
    cache_manager = SearchCacheManager()
    
    # Simulate concurrent stat updates
    errors = []
    
    def worker(thread_id):
        try:
            for i in range(100):
                # Randomly update different stats
                if i % 4 == 0:
                    cache_manager._inc_stat('hits')
                elif i % 4 == 1:
                    cache_manager._inc_stat('misses')
                elif i % 4 == 2:
                    cache_manager._inc_stat('db_hits')
                else:
                    cache_manager._inc_stat('db_misses')
                
                time.sleep(0.001)  # Small delay
                
        except Exception as e:
            errors.append(f"Thread {thread_id}: {e}")
    
    # Start multiple threads
    threads = []
    for i in range(3):
        t = threading.Thread(target=worker, args=(i,))
        threads.append(t)
        t.start()
    
    # Wait for all threads
    for t in threads:
        t.join()
    
    # Check final stats
    stats = cache_manager.get_stats()
    total_ops = stats['hits'] + stats['misses'] + stats['db_hits'] + stats['db_misses']
    assert total_ops == 300  # 3 threads * 100 operations each
    assert len(errors) == 0, f"Stat safety errors: {errors}"


def test_cache_invalidation():
    """Test cache invalidation functionality."""
    with tempfile.TemporaryDirectory() as temp_dir:
        # Mock database manager
        mock_db_manager = MagicMock()
        mock_db_manager.clear_cache.return_value = True
        
        # Create cache manager with mocked DB
        with patch('api.managers.search_cache_manager.get_db_manager') as mock_get_db:
            mock_get_db.return_value = mock_db_manager
            cache_manager = SearchCacheManager()
        
        # Add some items to cache
        search_params = {"query": "test", "dir": "/photos"}
        search_response = SearchResponse(
            results=[],
            total_count=0,
            query="test",
            filters_applied=[],
            search_time_ms=10.0,
            provider_used=SearchProvider.LOCAL
        )
        
        cache_manager.cache_search_results(search_params, search_response)
        
        # Verify item is cached
        cached_item = cache_manager.get_search_results(search_params)
        assert cached_item is not None
        
        # Test specific invalidation
        cache_manager.invalidate_search_cache(search_params)
        # Note: This just deletes from memory cache, persistent cache relies on TTL
        
        # Test full invalidation
        cache_manager.invalidate_search_cache(None)
        mock_db_manager.clear_cache.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])