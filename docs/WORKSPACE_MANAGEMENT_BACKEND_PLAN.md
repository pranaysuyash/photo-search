# Workspace Management Backend API Plan

## Overview
This document outlines the plan for enhancing the backend to support comprehensive workspace management, including system-wide scanning capabilities and improved directory management features.

## Current State Analysis
The backend currently supports:
- Basic workspace management (add/remove directories)
- Default directory suggestions via `DirectoryScanner`
- Library browsing and indexing for individual directories
- Media file scanning and counting

## Requirements for Enhancement

### 1. System-wide Scanning for Photo Directories
Implement a comprehensive system scan that can:
- Efficiently scan the entire file system for photo/video directories
- Support multiple file extensions with configurable filters
- Handle large-scale scans without blocking the server
- Provide progress tracking and cancellation capability
- Support background job processing for long scans

### 2. Advanced Directory Information
Enhance directory information to include:
- Detailed media statistics (photos by type, videos by type)
- Quality indicators for directories (resolution, file size)
- Date range coverage (oldest/newest photos)
- Duplicate detection within directories

### 3. Workspace Management Enhancements
Add features to workspace management:
- Bulk operations (add/remove multiple directories)
- Directory metadata and tagging
- Workspace export/import functionality
- Directory grouping and organization

## API Endpoints Design

### 1. Enhanced Workspace Management
```
GET /api/v1/workspace/detail
- Returns detailed information about all workspace directories
- Includes media counts, file types, date ranges, quality metrics
- Response: {ok: true, directories: [{path, label, source, stats, metadata}]}

POST /api/v1/workspace/bulk-add
- Add multiple directories to workspace in one operation
- Request: {directories: [{path, label?}]}
- Response: {ok: true, added: number, errors: [{path, error}]}

POST /api/v1/workspace/bulk-remove
- Remove multiple directories from workspace
- Request: {directories: [path]}
- Response: {ok: true, removed: number, errors: [{path, error}]}

POST /api/v1/workspace/reorder
- Reorder directories in workspace
- Request: {order: [path]}
- Response: {ok: true, order: [path]}

POST /api/v1/workspace/metadata
- Update metadata for a directory
- Request: {path, metadata: {tags: [], favorite: boolean, ...}}
- Response: {ok: true, path, metadata}
```

### 2. System-wide Directory Scanning
```
POST /api/v1/system-scan
- Start a system scan for photo directories
- Request: {root_paths?: [string], extensions?: [string], max_depth?: number, scan_photos?: boolean, scan_videos?: boolean}
- Response: {ok: true, scan_id: string, status: "started|running|completed|cancelled"}

GET /api/v1/system-scan/{scan_id}
- Get current status of a scan
- Response: {ok: true, scan_id: string, status: "running|completed|cancelled|failed", progress: number, total_directories: number, found_directories: number, current_path: string}

GET /api/v1/system-scan/{scan_id}/results
- Get results of completed scan
- Response: {ok: true, directories: [{path, media_count, photo_count, video_count, total_bytes, avg_resolution, date_range, quality_score, is_suitable}]}

DELETE /api/v1/system-scan/{scan_id}
- Cancel a running scan
- Response: {ok: true, scan_id, cancelled: boolean}
```

### 3. Advanced Directory Analysis
```
POST /api/v1/directory/analyze
- Perform detailed analysis of a directory
- Request: {path: string, deep_analysis?: boolean}
- Response: {ok: true, path: string, stats: {media_count, file_types, date_range, quality_metrics, duplicates, recommendations}}

POST /api/v1/directory/quick-scan
- Quick scan of a directory for media files
- Request: {path: string, extensions?: [string]}
- Response: {ok: true, path: string, media_count: number, total_size: number, first_files: [string]}
```

### 4. Smart Directory Suggestions
```
GET /api/v1/directory/suggestions
- Get intelligent suggestions for photo directories
- Request params: {include_default?: boolean, system_scan?: boolean, last_scan_date?: string}
- Response: {ok: true, suggestions: [{path, label, source, stats, confidence}]}

POST /api/v1/directory/suggest-from-photos
- Suggest directories based on provided photo paths
- Request: {photos: [string]}
- Response: {ok: true, suggestions: [{path, commonality_count, confidence}]}
```

## Implementation Plan

### Phase 1: Infrastructure Setup
1. Create a scan job manager to handle background scanning
2. Implement a job queue system for long-running operations
3. Set up progress tracking for scanning operations
4. Create data models for scan results and directory metadata

### Phase 2: System Scanning Implementation
1. Develop efficient directory scanning algorithm
2. Implement file type filtering and media detection
3. Add progress reporting and cancellation capability
4. Create the system-scan endpoints with proper error handling

### Phase 3: Enhanced Directory Analysis
1. Create detailed analysis functions for directories
2. Implement quality metrics calculation
3. Add duplicate detection functionality
4. Create directory/analyze and directory/quick-scan endpoints

### Phase 4: Workspace Management Enhancement
1. Update workspace endpoints with additional functionality
2. Implement bulk operations for workspace management
3. Add metadata support for directories
4. Create comprehensive workspace detail endpoint

### Phase 5: Smart Suggestions
1. Enhance default directory detection
2. Create intelligent suggestion algorithms
3. Implement photo-based directory suggestions
4. Add caching for frequently accessed suggestions

## Technical Implementation Details

### 1. Job Management System
```python
class ScanJob:
    def __init__(self, job_id: str, root_paths: List[str]):
        self.job_id = job_id
        self.root_paths = root_paths
        self.status = "pending"
        self.progress = 0.0
        self.start_time = None
        self.results = []
        self.current_path = ""
        self.cancelled = False

class JobManager:
    def start_scan_job(self, root_paths: List[str], options: Dict) -> str:
        # Create and queue a new scan job
        pass
        
    def get_job_status(self, job_id: str) -> ScanJob:
        # Get current status of a job
        pass
        
    def cancel_job(self, job_id: str) -> bool:
        # Cancel a running job
        pass
```

### 2. Efficient Scanning Algorithm
- Use async/await for non-blocking file system operations
- Implement directory traversal with proper depth limits
- Cache scan results to avoid repeated scanning
- Use multiprocessing for CPU-intensive analysis tasks
- Implement file size and permission error handling

### 3. Media Analysis
- Identify file types using both extension and magic bytes
- Extract basic metadata without fully loading files
- Calculate quality metrics based on file properties
- Implement duplicate detection using file hashes

### 4. Safety Measures
- Implement maximum depth limits to avoid infinite traversal
- Skip system and hidden directories by default
- Handle permission errors gracefully
- Limit memory usage during large scans
- Respect file system access patterns to avoid performance degradation

## Data Models

### Scan Result Model
```python
class ScanResult(BaseModel):
    path: str
    label: Optional[str] = None
    source: Optional[str] = None
    media_count: int
    photo_count: int
    video_count: int
    total_bytes: int
    avg_resolution: Optional[str] = None
    date_range: Optional[Dict[str, str]] = None  # start, end dates
    quality_score: Optional[float] = None
    is_suitable: bool
    confidence: float
```

### Directory Metadata Model
```python
class DirectoryMetadata(BaseModel):
    tags: List[str] = []
    favorite: bool = False
    last_scanned: Optional[str] = None
    last_indexed: Optional[str] = None
    quality_ranking: Optional[int] = None  # 1-5 star rating
    custom_label: Optional[str] = None
    hidden: bool = False
```

## Performance Considerations

### 1. Scanning Performance
- Implement async scanning to avoid blocking the main thread
- Use efficient directory traversal algorithms
- Limit concurrent file operations to prevent I/O saturation
- Implement progress reporting to maintain UI responsiveness

### 2. Memory Management
- Use generators for large directory listings
- Implement caching strategies for frequently accessed data
- Limit the amount of data loaded in memory at any time
- Implement cleanup for completed scan jobs

### 3. Resource Usage
- Respect system resources during scanning
- Implement configurable scan intensity
- Add user controls for scan priority
- Provide cancellation options for long-running scans

## Security Considerations

### 1. Path Validation
- Validate all file paths to prevent directory traversal attacks
- Use proper path resolution and normalization
- Implement safe path handling throughout the system
- Restrict access to system directories by default

### 2. Permission Handling
- Handle permission errors gracefully without crashing
- Skip inaccessible directories with appropriate logging
- Provide clear error messages for permission issues
- Respect OS-level file access controls

## Error Handling

### 1. Scan Errors
- Log scan errors without stopping the entire process
- Continue scanning other directories when one fails
- Provide detailed error information to the frontend
- Implement retry logic for transient errors

### 2. Resource Errors
- Handle disk space limitations gracefully
- Manage memory usage during large scans
- Implement timeout mechanisms for hanging operations
- Provide fallback options when resources are limited

## Testing Strategy

### 1. Unit Tests
- Test directory scanning algorithms
- Verify media file detection
- Validate path sanitization
- Test error handling paths

### 2. Integration Tests
- Test API endpoint functionality
- Verify job management system
- Test with various directory structures
- Validate performance with large datasets

### 3. System Tests
- Test complete scan workflow
- Verify system stability during scans
- Test cancellation functionality
- Validate data integrity after scans

## Deployment Considerations

### 1. Configuration
- Make scan settings configurable (max depth, file types, etc.)
- Provide environment variables for scan behavior
- Allow user customization of scan parameters
- Implement safe defaults for all settings

### 2. Monitoring
- Add metrics for scan performance
- Monitor resource usage during scans
- Log scan progress for debugging
- Alert on scan failures

This comprehensive backend plan provides the foundation for implementing advanced workspace management and system scanning capabilities that will power the enhanced frontend UI.