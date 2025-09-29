# Endpoint Comparison Analysis

## Original Server Endpoints (101 total)

### Core API Endpoints
- `GET /health` - Health check
- `GET /api/health` - API health check
- `GET /api/ping` - Ping endpoint
- `GET /demo/dir` - Demo directory
- `GET /monitoring` - Monitoring endpoint
- `POST /monitoring` - Monitoring endpoint
- `GET /api/monitoring` - API monitoring
- `POST /api/monitoring` - API monitoring
- `GET /` - Root endpoint
- `POST /search` - Main search endpoint
- `GET /library/defaults` - Library defaults

### Authentication Endpoints
- `GET /auth/status` - Auth status
- `POST /auth/check` - Auth check

### Indexing Endpoints
- `POST /index` - Index build
- `POST /data/nuke` - Data nuke
- `GET /watch/status` - Watch status
- `POST /watch/start` - Start watching
- `POST /watch/stop` - Stop watching
- `GET /index/status` - Index status
- `POST /index/pause` - Pause indexing
- `POST /index/resume` - Resume indexing

### Sharing Endpoints
- `POST /share` - Create share
- `GET /share` - List shares
- `POST /share/revoke` - Revoke share
- `GET /share/detail` - Share details
- `GET /share/{token}/view` - View share

### Search Endpoints
- `POST /search/cached` - Cached search
- `POST /search_workspace` - Workspace search
- `POST /search_like` - Similar search
- `POST /search_like_plus` - Enhanced similar search
- `POST /search_paginated` - Paginated search
- `POST /search_video` - Video search
- `POST /search_video_like` - Similar video search

### Favorites Endpoints
- `GET /favorites` - Get favorites
- `POST /favorites` - Toggle favorite

### Tags Endpoints
- `GET /tags` - Get tags
- `POST /tags` - Add tags

### Saved Searches Endpoints
- `GET /saved` - Get saved searches
- `POST /saved` - Save search
- `POST /saved/delete` - Delete saved search

### Presets Endpoints
- `GET /presets` - Get presets
- `POST /presets` - Save preset
- `POST /presets/delete` - Delete preset

### Collections Endpoints
- `GET /collections` - Get collections
- `POST /collections` - Create collection
- `POST /collections/delete` - Delete collection
- `GET /smart_collections` - Get smart collections
- `POST /smart_collections` - Create smart collection
- `POST /smart_collections/delete` - Delete smart collection
- `POST /smart_collections/resolve` - Resolve smart collection

### Faces Endpoints
- `POST /faces/build` - Build faces
- `GET /faces/clusters` - Get face clusters
- `POST /faces/name` - Name face cluster
- `GET /faces/photos` - Get photos for face
- `POST /faces/merge` - Merge face clusters
- `POST /faces/split` - Split face cluster

### OCR Endpoints
- `POST /ocr/build` - Build OCR
- `GET /ocr/status` - OCR status
- `POST /ocr/snippets` - OCR snippets

### Metadata Endpoints
- `POST /metadata/build` - Build metadata
- `GET /metadata` - Get metadata
- `GET /metadata/batch` - Batch metadata

### Trips Endpoints
- `POST /trips/build` - Build trips
- `GET /trips` - Get trips

### Thumbnails Endpoints
- `POST /thumbs` - Generate thumbs
- `GET /thumb_face` - Face thumbnail
- `POST /thumb/batch` - Batch thumbnails

### Batch Operations Endpoints
- `POST /batch/delete` - Batch delete
- `POST /batch/tag` - Batch tag
- `POST /batch/collections` - Batch collections

### Video Endpoints
- `GET /videos` - Get videos
- `GET /video/metadata` - Video metadata
- `GET /video/thumbnail` - Video thumbnail
- `POST /videos/index` - Index videos

### File Operations Endpoints
- `POST /open` - Open file
- `POST /scan_count` - Scan count
- `POST /delete` - Delete file
- `POST /undo_delete` - Undo delete
- `POST /export` - Export files

### Editing Endpoints
- `POST /edit/ops` - Edit operations
- `POST /edit/upscale` - Upscale image

### Analytics Endpoints
- `GET /analytics` - Get analytics
- `POST /analytics/log` - Log analytics

### Utilities Endpoints
- `GET /diagnostics` - Diagnostics
- `GET /map` - Map view
- `POST /autotag` - Auto-tag

### Settings Endpoints
- `GET /settings/excludes` - Get excludes
- `POST /config/set` - Set config

### Models Endpoints
- `GET /models/capabilities` - Model capabilities
- `POST /models/download` - Download model
- `POST /models/validate` - Validate model

### Fast Index Endpoints
- `POST /fast/build` - Build fast index
- `GET /fast/status` - Fast index status

## Current v1 API Endpoints (37 total)

### Search Endpoints (2)
- `POST /api/v1/search/` - Photo semantic search
- `POST /api/v1/search/cached` - Cached photo search

### Authentication Endpoints (2)
- `GET /api/v1/auth/status` - Auth status
- `POST /api/v1/auth/check` - Auth check

### Faces Endpoints (6)
- `POST /api/v1/faces/build` - Build faces
- `GET /api/v1/faces/clusters` - Get face clusters
- `POST /api/v1/faces/name` - Name face cluster
- `GET /api/v1/faces/photos` - Get photos for face
- `POST /api/v1/faces/merge` - Merge face clusters
- `POST /api/v1/faces/split` - Split face cluster

### OCR Endpoints (3)
- `POST /api/v1/ocr/build` - Build OCR
- `GET /api/v1/ocr/status` - OCR status
- `POST /api/v1/ocr/snippets` - OCR snippets

### Metadata Endpoints (3)
- `POST /api/v1/metadata/build` - Build metadata
- `GET /api/v1/metadata/` - Get metadata
- `GET /api/v1/metadata/batch` - Batch metadata

### Tags Endpoints (3)
- `GET /api/v1/tags/` - Get tags
- `POST /api/v1/tags/` - Add tags
- `POST /api/v1/tags/autotag` - Auto-tag

### Collections Endpoints (7)
- `GET /api/v1/collections/` - Get collections
- `POST /api/v1/collections/` - Create collection
- `POST /api/v1/collections/delete` - Delete collection
- `GET /api/v1/collections/smart` - Get smart collections
- `POST /api/v1/collections/smart` - Create smart collection
- `POST /api/v1/collections/smart/delete` - Delete smart collection
- `POST /api/v1/collections/smart/resolve` - Resolve smart collection

### Favorites Endpoints (2)
- `GET /api/v1/favorites/` - Get favorites
- `POST /api/v1/favorites/` - Toggle favorite

### Batch Operations Endpoints (3)
- `POST /api/v1/batch/tag` - Batch tag
- `POST /api/v1/batch/collections` - Batch collections
- `POST /api/v1/batch/delete` - Batch delete

### Saved Searches Endpoints (3)
- `GET /api/v1/saved/` - Get saved searches
- `POST /api/v1/saved/` - Save search
- `POST /api/v1/saved/delete` - Delete saved search

### Presets Endpoints (3)
- `GET /api/v1/presets/` - Get presets
- `POST /api/v1/presets/` - Save preset
- `POST /api/v1/presets/delete` - Delete preset

## Missing v1 Endpoints Compared to Original Server

### Core Missing Endpoints (Priority 1)
1. **Indexing Endpoints** (7 missing)
   - `POST /api/v1/index/` - Index build
   - `POST /api/v1/data/nuke` - Data nuke
   - `GET /api/v1/watch/status` - Watch status
   - `POST /api/v1/watch/start` - Start watching
   - `POST /api/v1/watch/stop` - Stop watching
   - `GET /api/v1/index/status` - Index status
   - `POST /api/v1/index/pause` - Pause indexing
   - `POST /api/v1/index/resume` - Resume indexing

2. **Sharing Endpoints** (5 missing)
   - `POST /api/v1/share/` - Create share
   - `GET /api/v1/share/` - List shares
   - `POST /api/v1/share/revoke` - Revoke share
   - `GET /api/v1/share/detail` - Share details
   - `GET /api/v1/share/{token}/view` - View share

3. **Utilities Endpoints** (5 missing)
   - `POST /api/v1/thumbs` - Generate thumbs
   - `GET /api/v1/thumb_face` - Face thumbnail
   - `POST /api/v1/thumb/batch` - Batch thumbnails
   - `GET /api/v1/map` - Map view
   - `GET /api/v1/diagnostics` - Diagnostics

4. **Video Endpoints** (4 missing)
   - `GET /api/v1/videos` - Get videos
   - `GET /api/v1/video/metadata` - Video metadata
   - `GET /api/v1/video/thumbnail` - Video thumbnail
   - `POST /api/v1/videos/index` - Index videos

5. **File Operations Endpoints** (5 missing)
   - `POST /api/v1/open` - Open file
   - `POST /api/v1/scan_count` - Scan count
   - `POST /api/v1/delete` - Delete file
   - `POST /api/v1/undo_delete` - Undo delete
   - `POST /api/v1/export` - Export files

6. **Editing Endpoints** (2 missing)
   - `POST /api/v1/edit/ops` - Edit operations
   - `POST /api/v1/edit/upscale` - Upscale image

7. **Analytics Endpoints** (2 missing)
   - `GET /api/v1/analytics` - Get analytics
   - `POST /api/v1/analytics/log` - Log analytics

8. **Settings Endpoints** (2 missing)
   - `GET /api/v1/settings/excludes` - Get excludes
   - `POST /api/v1/config/set` - Set config

9. **Models Endpoints** (3 missing)
   - `GET /api/v1/models/capabilities` - Model capabilities
   - `POST /api/v1/models/download` - Download model
   - `POST /api/v1/models/validate` - Validate model

10. **Fast Index Endpoints** (2 missing)
    - `POST /api/v1/fast/build` - Build fast index
    - `GET /api/v1/fast/status` - Fast index status

11. **Trips Endpoints** (2 missing)
    - `POST /api/v1/trips/build` - Build trips
    - `GET /api/v1/trips` - Get trips

12. **Search Variants** (3 missing)
    - `POST /api/v1/search/workspace` - Workspace search
    - `POST /api/v1/search/like` - Similar search
    - `POST /api/v1/search/like_plus` - Enhanced similar search
    - `POST /api/v1/search/paginated` - Paginated search
    - `POST /api/v1/search_video` - Video search
    - `POST /api/v1/search_video_like` - Similar video search

## Summary

### Current State
- Original server has 101 endpoints
- Current v1 API has 37 endpoints
- Missing 64 endpoints (63% of original functionality)

### Priority Recommendations

**Tier 1 (Essential for Core Functionality)**
1. Indexing endpoints - Critical for photo library management
2. Sharing endpoints - Important for collaboration features
3. Video endpoints - Needed for multimedia support
4. File operations - Essential for basic file management

**Tier 2 (Enhanced Features)**
1. Search variants - Extended search capabilities
2. Utilities - Supporting features
3. Analytics - Usage tracking and insights
4. Editing - Photo editing functionality

**Tier 3 (Advanced Features)**
1. Models management - Model lifecycle management
2. Fast indexing - Performance optimization
3. Trips - Location-based organization
4. Settings - Configuration management

## Issues Identified

1. **Parameter Parsing Problems** - Several endpoints fail due to parameter parsing issues in the server implementation
2. **Incomplete Router Migration** - Many original endpoints haven't been migrated to v1 API structure
3. **Missing Feature Parity** - Significant functionality gap between original and v1 APIs
4. **Endpoint Duplication** - Some endpoints are duplicated in the current server implementation

## Next Steps

1. **Fix Parameter Parsing** - Address the parameter parsing issues that cause test failures
2. **Migrate Core Endpoints** - Implement Tier 1 missing endpoints for essential functionality
3. **Enhance Test Coverage** - Add tests for new endpoints as they're implemented
4. **Document Progress** - Track implementation progress against feature parity goals