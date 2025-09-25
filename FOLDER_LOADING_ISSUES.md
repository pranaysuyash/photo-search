# Folder Loading Issues and Fixes

## Issues Identified

1. **Incorrect Variable Reference in Indexing**: In `usecases/index_photos.py`, the `photos` variable was being referenced before it was defined, causing a NameError.

2. **Missing Directory Validation**: In `adapters/fs_scanner.py`, there was no validation to check if the root directory exists or is accessible before attempting to scan it.

3. **Inconsistent Variable Usage in Search Endpoint**: In `api/server.py`, the search endpoint was extracting variables from the request but then using undefined variables in the implementation.

4. **Duplicate Function Definition**: In `webapp/src/api.ts`, there was a duplicate function definition for `thumbUrl`.

5. **Missing Input Validation**: The React app was not properly validating directory paths before using them in API calls.

## Fixes Implemented

### 1. Fixed Variable Reference in Indexing
**File**: `usecases/index_photos.py`
- Moved the `list_photos(folder)` call before the `jobs_bridge.started()` call to ensure `photos` is defined before use.

### 2. Added Directory Validation in File Scanner
**File**: `adapters/fs_scanner.py`
- Added checks to verify that the root directory exists and is accessible before attempting to scan it.
- Added proper error handling for missing directories and permission issues.

### 3. Fixed Variable Usage in Search Endpoint
**File**: `api/server.py`
- Ensured that all variables used in the search implementation are properly defined from the request parameters.
- Added comprehensive directory validation with proper error messages.

### 4. Removed Duplicate Function
**File**: `webapp/src/api.ts`
- Removed the duplicate `thumbUrl` function definition.

### 5. Improved Frontend Validation
**Files**: `webapp/src/stores/settingsStore.ts`, `webapp/src/App.tsx`, `webapp/src/stores/uiStore.ts`
- Added validation for directory paths in the settings store.
- Improved error handling in the library loading function.
- Added input validation for search operations.
- Enhanced note handling in the UI store to prevent UI issues.

## Testing
All tests now pass, including:
- API smoke tests
- Indexing and search functionality
- Tag management
- Collections management
- Error handling
- Concurrent requests
- Large result sets
- Provider validation

## Summary
The folder loading issues were primarily caused by:
1. Variable reference errors in the Python backend
2. Missing input validation for directory paths
3. Inconsistent variable usage in API endpoints
4. Duplicate code in the frontend

These issues have been resolved by implementing proper variable handling, adding comprehensive input validation, and removing duplicate code. The application now properly handles folder loading and provides meaningful error messages when issues occur.