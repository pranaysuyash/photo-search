# Persistent Storage System in Photo Search App

This document describes the persistent storage system implemented in the Photo Search application using SQLite.

## Overview

The Photo Search application now includes a comprehensive persistent storage system using SQLite to store search results, query history, photo metadata, and other application data locally. This enhances the offline capability of the application and provides faster access to frequently used data.

## Architecture

### Components

1. **LocalDatabase**: The core SQLite database manager that handles connections and table creation
2. **Data Access Objects (DAOs)**: Specialized classes for different data types:
   - PhotoDAO: Manages photo metadata and embeddings
   - SearchHistoryDAO: Handles search query history
   - ActivityLogDAO: Tracks user activities
   - CollectionDAO: Manages photo collections
   - CachedSearchDAO: Handles cached search results
3. **DatabaseManager**: High-level orchestrator that brings all DAOs together

### Database Schema

The system uses the following tables:

- **photos**: Stores photo metadata, embeddings, and user preferences
- **search_history**: Tracks search queries and their results
- **activity_log**: Logs user actions and interactions
- **collections**: Manages user-created photo collections
- **tags**: Stores tag definitions
- **photo_tags**: Junction table for photo-tag relationships
- **cached_search_results**: Stores pre-computed search results

## Implementation Details

### Two-Tier Caching

The system implements a two-tier caching approach:
1. **In-memory cache**: Fast access for frequently requested data
2. **Persistent storage**: Long-term storage using SQLite database

When data is requested:
1. First, check in-memory cache
2. If not found, check persistent storage
3. If found in persistent storage, update in-memory cache
4. If not found anywhere, compute and store in both tiers

### Data Persistence

All data is stored in a single SQLite file, typically located at:
- `~/.photo-search/photo_search.db` on Unix-like systems
- Or a configurable location

This ensures all application data is centralized and portable.

## Key Features

### Photo Management
- Store photo metadata (dimensions, EXIF data, etc.)
- Maintain favorite status and ratings
- Track access patterns

### Search History
- Keep track of user queries
- Record search performance metrics
- Enable query suggestions and auto-completion

### Activity Tracking
- Log user interactions for analytics
- Support for session-based tracking
- Flexible metadata storage for different event types

### Collections
- User-created photo collections
- Flexible photo grouping
- Collection management operations

### Cached Search Results
- Persistent storage of previously computed searches
- TTL-based expiration
- Hit counting for cache optimization

## Performance Benefits

The persistent storage system provides:
- **Faster startup**: Pre-computed results available immediately
- **Improved offline experience**: All data available without internet
- **Reduced computation**: Reuse of previously computed search results
- **Better scalability**: Efficient indexing for large photo libraries
- **Enhanced user experience**: Persistent history and preferences

## Integration

The system integrates seamlessly with existing functionality:
- Enhanced search caching with persistent storage
- Automatic migration of existing cache data
- Backward compatibility with existing APIs
- Configurable database location

## Security & Privacy

- All data stored locally on the user's device
- No external data transmission required
- Standard SQLite security features
- User-controlled data management

## Future Enhancements

Potential areas for future improvement:
- Database encryption for sensitive data
- Cloud synchronization options
- Advanced query optimization
- Compression for large embedding data
- Incremental backup capabilities

## Usage

The persistent storage system works automatically when integrated. For direct database access:

```python
from api.database.manager import get_db_manager

db_manager = get_db_manager()

# Example: Add search to history
db_manager.add_search(
    query="sunset photos",
    provider="local",
    top_k=12,
    filters={},
    result_count=8,
    search_time_ms=123.45,
    cached=False
)

# Example: Cache search results
test_results = [{'path': '/photo.jpg', 'score': 0.95}]
db_manager.cache_search_results(
    cache_key='unique_cache_key',
    query='sunset photos',
    provider='local',
    top_k=12,
    filters={},
    results=test_results,
    ttl_seconds=3600  # 1 hour
)
```

## Conclusion

The persistent storage system significantly enhances the Photo Search application by providing reliable, fast, and privacy-conscious data storage. It supports the offline-first architecture while improving performance and user experience through intelligent caching and data management.