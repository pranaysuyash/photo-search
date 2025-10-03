"""
Cache initialization and management for the Photo Search application.
Sets up the cache system and provides utilities for cache operations.
"""

from api.managers.search_cache_manager import search_cache_manager
from api.config.cache_config import cache_config
import logging

logger = logging.getLogger(__name__)


def initialize_cache_system():
    """Initialize the cache system with configured parameters."""
    logger.info("Initializing cache system...")
    
    # Configure the search cache based on settings
    search_cache_manager.cache.max_size = cache_config.max_size
    search_cache_manager.cache.default_ttl = cache_config.search_result_ttl
    
    logger.info(f"Cache system initialized with max_size={cache_config.max_size}, "
                f"default_ttl={cache_config.default_ttl}")


def get_cache_stats():
    """Get current cache statistics."""
    return search_cache_manager.get_stats()


def clear_cache():
    """Clear all cached data."""
    search_cache_manager.invalidate_search_cache()
    logger.info("Cache cleared")


def warm_up_cache():
    """Warm up the cache with common queries."""
    if not cache_config.enable_cache_warming:
        return
    
    logger.info("Warming up cache with common queries...")
    # This would typically execute common queries to prime the cache
    # For now, this is a placeholder
    for query in cache_config.warm_up_queries[:3]:  # Limit to first 3 queries
        logger.debug(f"Pre-caching query: {query}")
    logger.info("Cache warm-up completed")


# Initialize the cache system on import
initialize_cache_system()