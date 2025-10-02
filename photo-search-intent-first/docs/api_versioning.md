# API Versioning Documentation

This document describes the API versioning strategy implemented in the photo search application.

## Overview

The application implements API versioning using URL prefixes (e.g., `/api/v1/`) to ensure backward compatibility while providing access to new functionality. Both legacy and versioned endpoints are available to maintain compatibility with existing clients.

## Versioned Endpoints

All new API endpoints are available under the `/api/v1/` prefix. The following endpoints have been versioned:

### Search Endpoints
- `POST /api/v1/search/` - Main search functionality
- `POST /api/v1/search/cached` - Cached search with result caching

### Indexing Endpoints
- `POST /api/v1/indexing/` - Build/update photo index
- `GET /api/v1/indexing/status` - Get indexing status
- `POST /api/v1/indexing/pause` - Pause indexing operations
- `POST /api/v1/indexing/resume` - Resume indexing operations

### Sharing Endpoints
- `POST /api/v1/sharing/` - Create photo shares
- `POST /api/v1/sharing/list` - List existing shares
- `POST /api/v1/sharing/detail` - Get details of a share
- `POST /api/v1/sharing/revoke` - Revoke a share

### Face Recognition Endpoints
- `GET /api/v1/faces/` - Get faces in directory
- `POST /api/v1/faces/merge` - Merge face clusters
- `POST /api/v1/faces/train` - Train face recognition model

### Metadata Endpoints
- `GET /api/v1/metadata/` - Get photo metadata
- `POST /api/v1/metadata/batch` - Get metadata for multiple photos

### Tagging Endpoints
- `GET /api/v1/tags/` - Get all tags for directory
- `POST /api/v1/tags/` - Set tags for a photo
- `POST /api/v1/tags/autotag` - Auto-generate tags from captions

### Collections Endpoints
- `GET /api/v1/collections/` - Get all collections
- `POST /api/v1/collections/` - Create/update collection
- `POST /api/v1/collections/delete` - Delete collection
- `GET /api/v1/collections/smart` - Get smart collections
- `POST /api/v1/collections/smart` - Create/update smart collection
- `POST /api/v1/collections/smart/delete` - Delete smart collection
- `POST /api/v1/collections/smart/resolve` - Resolve smart collection rules

### OCR Endpoints
- `POST /api/v1/ocr/` - Extract text from images
- `POST /api/v1/ocr/batch` - Extract text from multiple images

### Video Endpoints
- `POST /api/v1/video/search` - Search in videos
- `POST /api/v1/video/search_like` - Find similar videos

### Authentication Endpoints
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/status` - Get authentication status

### Favorites Endpoints
- `GET /api/v1/favorites/` - Get favorite photos
- `POST /api/v1/favorites/` - Set favorite status for photo

### Batch Operations Endpoints
- `POST /api/v1/batch/apply` - Apply operations to multiple photos
- `POST /api/v1/batch/status` - Get status of batch operations

### Saved Searches Endpoints
- `GET /api/v1/saved/` - Get saved searches
- `POST /api/v1/saved/` - Save a search
- `POST /api/v1/saved/delete` - Delete a saved search

### Presets Endpoints
- `GET /api/v1/presets/` - Get all presets
- `POST /api/v1/presets/` - Create/update preset
- `POST /api/v1/presets/delete` - Delete preset

### Configuration Endpoints
- `POST /api/v1/config/settings/excludes` - Set exclude patterns
- `POST /api/v1/config/set` - Set configuration key-value

### Library Browsing Endpoints
- `GET /api/v1/library/defaults` - Get default photo directories
- `GET /api/v1/library/` - Browse library paths

### Photo Editing Endpoints
- `POST /api/v1/editing/ops` - Apply basic editing operations
- `POST /api/v1/editing/upscale` - Upscale a photo

### Model Status Endpoints
- `GET /api/v1/models/status` - Get model status and availability

### Data Management Endpoints
- `POST /api/v1/data/nuke` - Clear photo index data

### Utilities Endpoints
- `POST /api/v1/utilities/export` - Export/copy photos
- `GET /api/v1/utilities/map` - Extract GPS coordinates for map visualization
- `GET /api/v1/utilities/tech.json` - Get tech manifest
- `POST /api/v1/utilities/search/paginated` - Paginated search
- `POST /api/v1/utilities/search/cached` - Cached search
- `POST /api/v1/utilities/thumbs` - Build thumbnails for all photos
- `POST /api/v1/utilities/thumb/batch` - Generate thumbnails in batch
- `GET /api/v1/utilities/thumb_face` - Get face thumbnail
- `POST /api/v1/utilities/search_like` - Find similar photos
- `POST /api/v1/utilities/search_like_plus` - Enhanced similarity search

### File Management Endpoints
- `POST /api/v1/files/delete` - Delete files to trash
- `POST /api/v1/files/undo_delete` - Undo last delete

### Fast Index Endpoints
- `POST /api/v1/fast_index/build` - Build fast ANN indexes
- `GET /api/v1/fast_index/status` - Get fast index status

### Caption Generation Endpoints
- `POST /api/v1/captions/generate` - Generate captions for images
- `GET /api/v1/captions/status` - Get caption generation status
- `GET /api/v1/captions/list` - List available captions

### Admin Endpoints
- `POST /api/v1/admin/flags/offline` - Toggle offline mode
- `GET /api/v1/admin/flags` - Get runtime flags

### File Watching Endpoints
- `GET /api/v1/watch/status` - Check file system watching availability
- `POST /api/v1/watch/start` - Start watching directory
- `POST /api/v1/watch/stop` - Stop watching directory

### Workspace Management Endpoints
- `GET /api/v1/workspace/` - List workspace directories
- `POST /api/v1/workspace/add` - Add directory to workspace
- `POST /api/v1/workspace/remove` - Remove directory from workspace

### Smart Collections Endpoints
- `GET /api/v1/smart_collections/` - Get all smart collections
- `POST /api/v1/smart_collections/` - Create/update smart collection
- `POST /api/v1/smart_collections/delete` - Delete smart collection
- `POST /api/v1/smart_collections/resolve` - Resolve smart collection rules

### Trips and Events Endpoints
- `POST /api/v1/trips/build` - Build trips from photos
- `GET /api/v1/trips/` - List existing trips

## Legacy Endpoints

All existing endpoints remain available without the `/api/v1/` prefix to ensure backward compatibility with existing clients.

## Response Format

All versioned endpoints return consistent response formats using the v1 schema models:
- `BaseResponse` - Base response model
- `SuccessResponse` - For successful operations
- `ErrorResponse` - For error conditions
- Specialized response models for specific operations

## Authentication

Version 1 endpoints require authentication using the `require_auth` dependency for endpoints that modify data or access protected resources.