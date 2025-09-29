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
- **Implemented Endpoints**:
  - `/api/v1/search/` - Photo semantic search
  - `/api/v1/search/cached` - Cached photo search

## Migration Guide
### For Developers
1. New integrations should use versioned endpoints (`/api/v1/`)
2. Existing integrations can continue using legacy endpoints
3. Gradual migration to versioned endpoints is recommended for future-proofing

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