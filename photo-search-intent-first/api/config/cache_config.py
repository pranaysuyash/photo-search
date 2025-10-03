"""
Cache configuration for the Photo Search application.
Defines cache settings and initialization parameters.
"""

from typing import Optional
from dataclasses import dataclass
import os


@dataclass
class CacheConfig:
    """Configuration for cache system."""
    # Cache settings
    max_size: int = 1000
    default_ttl: int = 600  # 10 minutes
    search_result_ttl: int = 600  # 10 minutes
    metadata_ttl: int = 3600  # 1 hour
    thumbnail_ttl: int = 86400  # 24 hours
    
    # Redis configuration (if available)
    redis_host: Optional[str] = os.getenv("REDIS_HOST")
    redis_port: int = int(os.getenv("REDIS_PORT", "6379"))
    redis_db: int = int(os.getenv("REDIS_DB", "0"))
    redis_password: Optional[str] = os.getenv("REDIS_PASSWORD")
    redis_enabled: bool = bool(os.getenv("REDIS_HOST"))
    
    # Memory cache settings
    in_memory_enabled: bool = True
    in_memory_size_limit: int = 100 * 1024 * 1024  # 100 MB in bytes
    
    # Cache warming settings
    enable_cache_warming: bool = True
    warm_up_queries: list = None  # type: ignore
    
    def __post_init__(self):
        if self.warm_up_queries is None:
            self.warm_up_queries = [
                "selfie",
                "landscape", 
                "sunset",
                "food",
                "portrait",
                "nature",
                "travel",
                "family",
                "pet"
            ]


# Global cache configuration instance
cache_config = CacheConfig()