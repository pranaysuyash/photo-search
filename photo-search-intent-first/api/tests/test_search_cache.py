"""
Tests for the search result caching functionality.
"""
import pytest
from api.managers.search_cache_manager import SearchCacheManager, search_cache_manager
from api.models.search import SearchRequest, SearchProvider, SearchFeatures, SearchFilters
from pathlib import Path


def test_cache_initialization():
    """Test that cache manager is properly initialized."""
    assert search_cache_manager is not None
    assert isinstance(search_cache_manager, SearchCacheManager)
    assert search_cache_manager.cache.max_size == 1000  # Default value


def test_cache_operations():
    """Test basic cache get/set operations."""
    # Create a test search parameter
    search_params = {
        'dir': '/test/dir',
        'query': 'test query',
        'provider': 'local',
        'top_k': 10
    }
    
    # Define test results
    test_results = {
        'results': [
            {'id': 'photo1.jpg', 'score': 0.95},
            {'id': 'photo2.jpg', 'score': 0.87}
        ],
        'total_count': 2,
        'query': 'test query'
    }
    
    # Test setting a value
    search_cache_manager.cache_search_results(search_params, test_results, ttl=60)
    
    # Test getting the value back
    retrieved_results = search_cache_manager.get_search_results(search_params)
    
    assert retrieved_results is not None
    assert retrieved_results['total_count'] == 2
    assert len(retrieved_results['results']) == 2


def test_cache_key_generation():
    """Test that cache keys are generated consistently."""
    params1 = {
        'dir': '/test/dir',
        'query': 'test query',
        'provider': 'local',
        'top_k': 10
    }
    
    params2 = {
        'dir': '/test/dir',
        'query': 'test query',
        'provider': 'local',
        'top_k': 10
    }
    
    # Both parameter sets should generate the same key
    key1 = search_cache_manager._generate_cache_key(params1)
    key2 = search_cache_manager._generate_cache_key(params2)
    
    assert key1 == key2


def test_different_cache_keys():
    """Test that different parameters generate different keys."""
    params1 = {
        'dir': '/test/dir',
        'query': 'test query',
        'provider': 'local',
        'top_k': 10
    }
    
    params2 = {
        'dir': '/test/dir',
        'query': 'different query',  # Different query
        'provider': 'local',
        'top_k': 10
    }
    
    key1 = search_cache_manager._generate_cache_key(params1)
    key2 = search_cache_manager._generate_cache_key(params2)
    
    assert key1 != key2


def test_cache_expiration():
    """Test that cache values expire properly."""
    import time
    
    search_params = {
        'dir': '/test/dir',
        'query': 'expiring query',
        'provider': 'local',
        'top_k': 10
    }
    
    # Set with a short TTL of 1 second
    test_results = {'results': [], 'total_count': 0, 'query': 'expiring query'}
    search_cache_manager.cache_search_results(search_params, test_results, ttl=1)
    
    # Verify it exists immediately
    assert search_cache_manager.get_search_results(search_params) is not None
    
    # Wait for expiration
    time.sleep(1.1)
    
    # Should be expired now
    assert search_cache_manager.get_search_results(search_params) is None


def test_cache_stats():
    """Test cache statistics tracking."""
    initial_stats = search_cache_manager.get_stats()
    
    search_params = {
        'dir': '/test/dir',
        'query': 'stats query',
        'provider': 'local',
        'top_k': 10
    }
    
    # Miss
    _ = search_cache_manager.get_search_results(search_params)
    
    # Add value
    test_results = {'results': [], 'total_count': 0, 'query': 'stats query'}
    search_cache_manager.cache_search_results(search_params, test_results, ttl=60)
    
    # Hit
    _ = search_cache_manager.get_search_results(search_params)
    
    final_stats = search_cache_manager.get_stats()
    
    # Should have one miss and one hit
    assert final_stats['misses'] == initial_stats['misses'] + 1
    assert final_stats['hits'] == initial_stats['hits'] + 1


def test_cache_clear():
    """Test cache clearing functionality."""
    search_params = {
        'dir': '/test/dir',
        'query': 'clear query',
        'provider': 'local',
        'top_k': 10
    }
    
    test_results = {'results': [], 'total_count': 0, 'query': 'clear query'}
    search_cache_manager.cache_search_results(search_params, test_results, ttl=60)
    
    # Verify it's there
    assert search_cache_manager.get_search_results(search_params) is not None
    
    # Clear the cache
    search_cache_manager.invalidate_search_cache()
    
    # Should be gone now
    assert search_cache_manager.get_search_results(search_params) is None