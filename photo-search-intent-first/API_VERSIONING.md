# API Versioning Documentation

## Overview
The photo search API now supports versioning to ensure backward compatibility as new features are added. The current API structure supports both legacy endpoints and versioned endpoints.

## Versioning Strategy
- **URL Prefix**: API versions are implemented using URL prefixes (e.g., `/api/v1/`)
- **Backward Compatibility**: All existing endpoints remain accessible at their original paths
- **New Development**: New features and changes should be implemented in versioned endpoints

## Current Structure
- **Legacy Endpoints**: Available at original paths (e.g., `/search`, `/index`)
- **Version 1 Endpoints**: Available under `/api/v1/` prefix (e.g., `/api/v1/search/`)

## Available Versions
### v1 (Current)
- **Base Path**: `/api/v1/`
- **Implemented Endpoints by Category**:

#### Search Endpoints
  - `POST /api/v1/search/` - Main search functionality
  - `POST /api/v1/search/cached` - Cached search with result caching
  - `POST /api/v1/search/paginated` - Paginated search

#### Indexing Endpoints
  - `POST /api/v1/indexing/` - Build/update photo index
  - `GET /api/v1/indexing/status` - Get indexing status
  - `POST /api/v1/indexing/pause` - Pause indexing operations
  - `POST /api/v1/indexing/resume` - Resume indexing operations

#### Sharing Endpoints
  - `POST /api/v1/sharing/` - Create photo shares
  - `POST /api/v1/sharing/list` - List existing shares
  - `POST /api/v1/sharing/detail` - Get details of a share
  - `POST /api/v1/sharing/revoke` - Revoke a share

#### Face Recognition Endpoints
  - `GET /api/v1/faces/` - Get faces in directory
  - `POST /api/v1/faces/merge` - Merge face clusters
  - `POST /api/v1/faces/train` - Train face recognition model

#### Metadata Endpoints
  - `GET /api/v1/metadata/` - Get photo metadata
  - `POST /api/v1/metadata/batch` - Get metadata for multiple photos

#### Tagging Endpoints
  - `GET /api/v1/tags/` - Get all tags for directory
  - `POST /api/v1/tags/` - Set tags for a photo
  - `POST /api/v1/tags/autotag` - Auto-generate tags from captions

#### Collections Endpoints
  - `GET /api/v1/collections/` - Get all collections
  - `POST /api/v1/collections/` - Create/update collection
  - `POST /api/v1/collections/delete` - Delete collection
  - `GET /api/v1/collections/smart` - Get smart collections
  - `POST /api/v1/collections/smart` - Create/update smart collection
  - `POST /api/v1/collections/smart/delete` - Delete smart collection
  - `POST /api/v1/collections/smart/resolve` - Resolve smart collection rules

#### OCR Endpoints
  - `POST /api/v1/ocr/` - Extract text from images
  - `POST /api/v1/ocr/batch` - Extract text from multiple images

#### Video Endpoints
  - `POST /api/v1/video/search` - Search in videos
  - `POST /api/v1/video/search_like` - Find similar videos

#### Authentication Endpoints
  - `POST /api/v1/auth/login` - User login
  - `POST /api/v1/auth/logout` - User logout
  - `GET /api/v1/auth/status` - Get authentication status

#### Favorites Endpoints
  - `GET /api/v1/favorites/` - Get favorite photos
  - `POST /api/v1/favorites/` - Set favorite status for photo

#### Batch Operations Endpoints
  - `POST /api/v1/batch/apply` - Apply operations to multiple photos
  - `POST /api/v1/batch/status` - Get status of batch operations

#### Saved Searches Endpoints
  - `GET /api/v1/saved/` - Get saved searches
  - `POST /api/v1/saved/` - Save a search
  - `POST /api/v1/saved/delete` - Delete a saved search

#### Presets Endpoints
  - `GET /api/v1/presets/` - Get all presets
  - `POST /api/v1/presets/` - Create/update preset
  - `POST /api/v1/presets/delete` - Delete preset

#### Configuration Endpoints
  - `POST /api/v1/config/settings/excludes` - Set exclude patterns
  - `POST /api/v1/config/set` - Set configuration key-value

#### Library Browsing Endpoints
  - `GET /api/v1/library/defaults` - Get default photo directories
  - `GET /api/v1/library/` - Browse library paths

#### Photo Editing Endpoints
  - `POST /api/v1/editing/ops` - Apply basic editing operations
  - `POST /api/v1/editing/upscale` - Upscale a photo

#### Model Status Endpoints
  - `GET /api/v1/models/status` - Get model status and availability

#### Data Management Endpoints
  - `POST /api/v1/data/nuke` - Clear photo index data

#### Utilities Endpoints
  - `POST /api/v1/utilities/export` - Export/copy photos
  - `GET /api/v1/utilities/map` - Extract GPS coordinates for map visualization
  - `GET /api/v1/utilities/tech.json` - Get tech manifest
  - `POST /api/v1/utilities/search/cached` - Cached search
  - `POST /api/v1/utilities/thumbs` - Build thumbnails for all photos
  - `POST /api/v1/utilities/thumb/batch` - Generate thumbnails in batch
  - `GET /api/v1/utilities/thumb_face` - Get face thumbnail
  - `POST /api/v1/utilities/search_like` - Find similar photos
  - `POST /api/v1/utilities/search_like_plus` - Enhanced similarity search

#### File Management Endpoints
  - `POST /api/v1/files/delete` - Delete files to trash
  - `POST /api/v1/files/undo_delete` - Undo last delete

#### Fast Index Endpoints
  - `POST /api/v1/fast_index/build` - Build fast ANN indexes
  - `GET /api/v1/fast_index/status` - Get fast index status

#### Caption Generation Endpoints
  - `POST /api/v1/captions/generate` - Generate captions for images
  - `GET /api/v1/captions/status` - Get caption generation status
  - `GET /api/v1/captions/list` - List available captions

#### Admin Endpoints
  - `POST /api/v1/admin/flags/offline` - Toggle offline mode
  - `GET /api/v1/admin/flags` - Get runtime flags

#### File Watching Endpoints
  - `GET /api/v1/watch/status` - Check file system watching availability
  - `POST /api/v1/watch/start` - Start watching directory
  - `POST /api/v1/watch/stop` - Stop watching directory

#### Workspace Management Endpoints
  - `GET /api/v1/workspace/` - List workspace directories
  - `POST /api/v1/workspace/add` - Add directory to workspace
  - `POST /api/v1/workspace/remove` - Remove directory from workspace

#### Smart Collections Endpoints
  - `GET /api/v1/smart_collections/` - Get all smart collections
  - `POST /api/v1/smart_collections/` - Create/update smart collection
  - `POST /api/v1/smart_collections/delete` - Delete smart collection
  - `POST /api/v1/smart_collections/resolve` - Resolve smart collection rules

#### Trips and Events Endpoints
  - `POST /api/v1/trips/build` - Build trips from photos
  - `GET /api/v1/trips/` - List existing trips

## Migration Guide
### For Developers
1. New integrations should use versioned endpoints (`/api/v1/`)
2. Existing integrations can continue using legacy endpoints
3. Gradual migration to versioned endpoints is recommended for future-proofing

## Response Format
All versioned endpoints return consistent response formats using the v1 schema models:
- `BaseResponse` - Base response model
- `SuccessResponse` - For successful operations
- `ErrorResponse` - For error conditions
- Specialized response models for specific operations

## Error Handling
All versioned API endpoints use the consistent error response format:
```json
{
  "ok": false,
  "error": {
    "type": "error_type",
    "message": "error_message"
  }
}
```

## Future Development
- New endpoints should be added to the appropriate v1 router
- Major breaking changes should result in new API versions (e.g., v2)
- Legacy endpoints will be maintained for backward compatibility