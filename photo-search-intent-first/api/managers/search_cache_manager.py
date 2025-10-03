"""
Cache manager for search results and other frequently accessed data.
Implements LRU caching with TTL expiration and optional Redis backend.
Now enhanced with persistent storage using local database.
"""
import hashlib
import json
import time
from typing import Any, Dict, Optional, Tuple, List
from threading import Lock
from datetime import datetime, timedelta

from api.database.manager import get_db_manager
from api.models.search import SearchResponse, SearchResult, SearchProvider


class LRUCache:
    """Simple in-memory LRU cache with TTL support."""
    
    def __init__(self, max_size: int = 1000, default_ttl: int = 300):  # 5 minutes default
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.cache: Dict[str, Tuple[Any, float]] = {}  # {key: (value, expiration_time)}
        self.access_order: Dict[str, float] = {}  # {key: last_access_time}
        self.lock = Lock()
    
    def _is_expired(self, key: str) -> bool:
        """Check if a cache entry has expired."""
        if key not in self.cache:
            return True
        _, expiration_time = self.cache[key]
        return time.time() > expiration_time
    
    def _evict_expired(self):
        """Remove expired entries from cache."""
        current_time = time.time()
        expired_keys = [key for key, (_, exp_time) in self.cache.items() 
                        if current_time > exp_time]
        for key in expired_keys:
            self.cache.pop(key, None)
            self.access_order.pop(key, None)
    
    def _evict_lru(self):
        """Remove least recently used entries if cache exceeds max_size."""
        if len(self.cache) <= self.max_size:
            return
        
        # Sort by access time to find LRU entries
        sorted_items = sorted(self.access_order.items(), key=lambda x: x[1])
        excess_count = len(self.cache) - self.max_size + 10  # Keep 10% buffer
        
        for i in range(min(excess_count, len(sorted_items))):
            key = sorted_items[i][0]
            self.cache.pop(key, None)
            self.access_order.pop(key, None)
    
    def get(self, key: str) -> Optional[Any]:
        """Get a value from the cache, returning None if not found or expired."""
        with self.lock:
            if key not in self.cache or self._is_expired(key):
                return None
            
            # Update access time
            self.access_order[key] = time.time()
            value, _ = self.cache[key]
            return value
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set a value in the cache with optional TTL override."""
        with self.lock:
            self._evict_expired()
            
            expiration_time = time.time() + (ttl or self.default_ttl)
            self.cache[key] = (value, expiration_time)
            self.access_order[key] = time.time()
            
            # Evict LRU items if necessary
            self._evict_lru()
    
    def delete(self, key: str) -> bool:
        """Delete a key from the cache."""
        with self.lock:
            existed = key in self.cache
            self.cache.pop(key, None)
            self.access_order.pop(key, None)
            return existed
    
    def clear(self) -> None:
        """Clear all entries from the cache."""
        with self.lock:
            self.cache.clear()
            self.access_order.clear()
    
    def size(self) -> int:
        """Get the current size of the cache."""
        with self.lock:
            self._evict_expired()
            return len(self.cache)


def _canonicalize_params(params: Dict[str, Any]) -> Dict[str, Any]:
    """Canonicalize search parameters for consistent cache key generation."""
    # Keep only known, semantic fields
    canonical_fields = [
        "dir", "query", "provider", "top_k", "limit", "use_fast", "fast_kind", 
        "use_captions", "use_ocr", "use_metadata", "favorites_only", "date_from", 
        "date_to", "camera", "iso_min", "iso_max", "f_min", "f_max", "place", 
        "person", "persons", "has_text", "flash", "wb", "metering", "alt_min", 
        "alt_max", "heading_min", "heading_max", "sharp_only", "exclude_underexp", 
        "exclude_overexp", "tags", "exclude_tags", "collections"
    ]
    
    d = {k: params.get(k) for k in canonical_fields if k in params and params[k] is not None}
    
    # Normalize enums and datetimes
    if isinstance(d.get("provider"), str):
        pass  # Already a string
    elif d.get("provider") is not None:
        d["provider"] = getattr(d["provider"], "value", str(d["provider"]))
    
    for k in ["date_from", "date_to"]:
        v = d.get(k)
        if hasattr(v, 'date'):  # datetime object
            d[k] = v.date().isoformat() if hasattr(v, 'date') else str(v)
    
    # Sort keys for consistency
    return {k: d[k] for k in sorted(canonical_fields) if k in d}


class SearchCacheManager:
    """Manages caching for search results with appropriate key generation.
    
    Enhanced to use persistent storage via local database while maintaining
    in-memory cache for performance.
    """
    
    def __init__(self, max_size: int = 1000, default_ttl: int = 600):  # 10 minutes for search results
        self.cache = LRUCache(max_size=max_size, default_ttl=default_ttl)
        self.db_manager = get_db_manager()
        self.stats = {
            'hits': 0,
            'misses': 0,
            'requests': 0,
            'evictions': 0,
            'db_hits': 0,
            'db_misses': 0
        }
        self.stats_lock = Lock()
    
    def _generate_cache_key(self, search_params: Dict[str, Any]) -> str:
        """Generate a unique cache key based on search parameters."""
        # Canonicalize parameters to ensure consistent keys
        canonical_params = _canonicalize_params(search_params)
        
        # Convert to JSON string with consistent formatting
        params_str = json.dumps(canonical_params, sort_keys=True, separators=(',', ':'))
        return hashlib.sha256(params_str.encode()).hexdigest()
    
    def _inc_stat(self, key: str):
        """Thread-safe increment of statistics."""
        with self.stats_lock:
            self.stats[key] += 1
    
    def get_search_results(self, search_params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Get cached search results if available, returning a DTO compatible with SearchResponse."""
        self._inc_stat('requests')
        
        key = self._generate_cache_key(search_params)
        
        # First check in-memory cache
        result = self.cache.get(key)
        if result is not None:
            self._inc_stat('hits')
            return result  # This should be a full DTO now
        
        # If not in memory, check persistent storage
        persistent_result = self.db_manager.get_cached_results(key)
        if persistent_result is not None:
            # Update in-memory cache for faster subsequent access
            # Ensure we return a DTO compatible with SearchResponse
            dto = {
                "query": persistent_result.get("query", search_params.get("query", "")),
                "provider": persistent_result.get("provider", search_params.get("provider", "local")),
                "filters_applied": persistent_result.get("filters", []),
                "results": persistent_result["results"],
                "total_count": len(persistent_result["results"]) if persistent_result["results"] else 0,
                "search_time_ms": 0,  # Will be set by orchestrator
                "is_cached": True,
                "cache_hit": True
            }
            self.cache.set(key, dto)
            self._inc_stat('db_hits')
            return dto
        
        self._inc_stat('misses')
        self._inc_stat('db_misses')
        return None
    
    def cache_search_results(self, search_params: Dict[str, Any], response: SearchResponse, ttl: Optional[int] = None) -> None:
        """Cache search results in both memory and persistent storage."""
        key = self._generate_cache_key(search_params)
        
        # Create DTO from SearchResponse
        dto = {
            "query": response.query,
            "provider": getattr(response.provider_used, "value", str(response.provider_used)) if hasattr(response.provider_used, "value") else response.provider_used,
            "filters_applied": response.filters_applied,
            "results": [result.dict() for result in response.results] if hasattr(response.results[0], 'dict') else [result.__dict__ for result in response.results] if response.results else [],
            "total_count": response.total_count,
            "search_time_ms": response.search_time_ms or 0,
            "is_cached": getattr(response, 'is_cached', False),
            "cache_hit": getattr(response, 'cache_hit', False)
        }
        
        # Cache in memory for fast access
        self.cache.set(key, dto, ttl)
        
        # Also cache in persistent storage
        ttl_seconds = ttl or self.cache.default_ttl
        self.db_manager.cache_search_results(
            cache_key=key,
            query=response.query,
            provider=getattr(response.provider_used, "value", str(response.provider_used)) if hasattr(response.provider_used, "value") else response.provider_used,
            top_k=search_params.get('top_k', 12),
            filters={k: v for k, v in search_params.items() if k not in ['query', 'provider', 'top_k']},
            results=dto["results"],  # Store just the results part in persistent cache
            ttl_seconds=ttl_seconds
        )
    
    def invalidate_search_cache(self, search_params: Optional[Dict[str, Any]] = None) -> None:
        """Invalidate cache entries. If search_params is None, clear all."""
        if search_params is None:
            # Clear all cache (both in-memory and persistent)
            self.cache.clear()
            self.db_manager.clear_cache()
        else:
            # Invalidate specific entry
            key = self._generate_cache_key(search_params)
            self.cache.delete(key)
            # For persistent cache, we rely on TTL expiration
            # or could add a specific deletion method to the DAO

    def invalidate_by_paths(self, changed_paths: List[str]) -> None:
        """Invalidate cache entries that might be affected by file system changes.
        
        This is a simple implementation that clears all cache entries when paths change.
        In a more sophisticated implementation, we would maintain an index of which cache
        entries depend on which paths and invalidate selectively.
        """
        # For now, clear all cache when paths change to ensure consistency
        # A more advanced implementation would maintain path->cache_key mappings
        # for selective invalidation
        self.logger.info(f"Invalidating cache due to changes in {len(changed_paths)} paths")
        self.invalidate_search_cache(None)  # Clear all for now
    
    def get_stats(self) -> Dict[str, int]:
        """Get cache statistics."""
        with self.stats_lock:
            total_requests = (self.stats['hits'] + self.stats['misses'])
            db_total_requests = (self.stats['db_hits'] + self.stats['db_misses'])
            
            return {
                **self.stats,
                'hit_rate': total_requests > 0 and self.stats['hits'] / total_requests or 0,
                'db_hit_rate': db_total_requests > 0 and self.stats['db_hits'] / db_total_requests or 0
            }


# Global instance
search_cache_manager = SearchCacheManager()