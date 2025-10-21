# Requirements Document

## Introduction

The Electron V3 frontend integration creates a **local-first desktop photo management application** that operates independently without requiring any backend server. The system provides direct file system access for image/video loading, local thumbnail generation, and basic photo organization. The Python backend is entirely optional and only provides enhanced AI features when explicitly enabled by the user.

## Glossary

- **Electron_V3_App**: The desktop application wrapper using Electron 27+ with React V3 frontend
- **React_V3_Frontend**: The modern React + TypeScript + Vite frontend located in webapp-v3
- **File_System_Bridge**: The secure IPC bridge between Electron main process and renderer for file operations
- **Direct_File_Access**: The ability to load images/videos using file:// URLs without HTTP server
- **Context_Isolation**: Electron security feature that separates main world and isolated world contexts
- **Preload_Script**: The secure bridge script that exposes limited APIs to the renderer process
- **Photo_Directory_Scanner**: Component that recursively scans directories for image/video files
- **Thumbnail_Generator**: System for creating and caching thumbnail images for performance
- **Local_First_Mode**: Primary operation mode where all photo management works without any backend server
- **AI_Enhanced_Mode**: Optional mode where backend provides additional AI features like semantic search

## Requirements

### Requirement 1

**User Story:** As a user, I want to select photo directories through the Electron app so that I can browse my local photo collection without needing a web server.

#### Acceptance Criteria

1. WHEN the user clicks "Add Photo Directory" in the menu, THE Electron_V3_App SHALL open a native directory selection dialog
2. WHEN the user selects one or more directories, THE File_System_Bridge SHALL validate directory access permissions
3. WHEN directories are selected, THE Electron_V3_App SHALL store the directory paths in persistent settings
4. WHEN directories are added, THE React_V3_Frontend SHALL receive notification of new photo directories
5. WHERE multiple directories are selected, THE Electron_V3_App SHALL merge them with existing directory list without duplicates

### Requirement 2

**User Story:** As a user, I want to view photos directly from my file system so that I can browse my collection without waiting for a backend server to start.

#### Acceptance Criteria

1. WHEN a photo directory is selected, THE Photo_Directory_Scanner SHALL recursively scan for image and video files
2. WHEN image files are found, THE File_System_Bridge SHALL provide secure file:// URLs for direct access
3. WHEN photos are displayed, THE React_V3_Frontend SHALL load images using direct file system access
4. WHILE scanning directories, THE Electron_V3_App SHALL show progress indicators for large collections
5. WHERE file access is denied, THE Electron_V3_App SHALL handle permission errors gracefully

### Requirement 3

**User Story:** As a user, I want fast thumbnail generation so that I can quickly browse large photo collections without performance issues.

#### Acceptance Criteria

1. WHEN photos are scanned, THE Thumbnail_Generator SHALL create cached thumbnail images
2. WHEN thumbnails are requested, THE File_System_Bridge SHALL serve cached thumbnails if available
3. WHEN thumbnails don't exist, THE Thumbnail_Generator SHALL create them on-demand with size limits
4. WHILE generating thumbnails, THE Electron_V3_App SHALL process them in background without blocking UI
5. WHERE thumbnail cache exceeds size limits, THE Thumbnail_Generator SHALL implement LRU eviction policy

### Requirement 4

**User Story:** As a user, I want secure file system access so that the application cannot access files outside my selected photo directories.

#### Acceptance Criteria

1. WHEN directories are selected, THE File_System_Bridge SHALL register them as allowed root paths
2. WHEN file access is requested, THE Preload_Script SHALL validate paths against allowed roots
3. WHEN unauthorized access is attempted, THE File_System_Bridge SHALL deny the request with error
4. WHILE maintaining security, THE Context_Isolation SHALL prevent renderer from accessing Node.js APIs directly
5. WHERE file operations are needed, THE Preload_Script SHALL expose only necessary safe operations

### Requirement 5

**User Story:** As a user, I want the app to work as a local-first desktop application so that I can manage my photos without requiring any server or internet connectivity.

#### Acceptance Criteria

1. WHEN the app starts, THE Electron_V3_App SHALL operate in local-first mode by default without requiring backend
2. WHEN managing photos, THE React_V3_Frontend SHALL use direct file system access for all basic operations
3. WHEN backend is unavailable, THE Local_First_Mode SHALL provide complete photo browsing and organization
4. WHILE in local-first mode, THE Electron_V3_App SHALL provide all core photo management features
5. WHERE backend is explicitly enabled, THE AI_Enhanced_Mode SHALL add semantic search and AI features

### Requirement 6

**User Story:** As a user, I want photo metadata extraction so that I can see basic information about my photos without the backend.

#### Acceptance Criteria

1. WHEN photos are scanned, THE File_System_Bridge SHALL extract basic file metadata (size, dates, dimensions)
2. WHEN EXIF data is available, THE Electron_V3_App SHALL read camera information and GPS coordinates
3. WHEN metadata is extracted, THE React_V3_Frontend SHALL display photo information in the UI
4. WHILE processing metadata, THE Electron_V3_App SHALL handle corrupted or missing data gracefully
5. WHERE metadata extraction fails, THE File_System_Bridge SHALL provide fallback file system information

### Requirement 7

**User Story:** As a user, I want video file support so that I can manage both photos and videos in the same application.

#### Acceptance Criteria

1. WHEN scanning directories, THE Photo_Directory_Scanner SHALL detect video files with common extensions
2. WHEN video files are found, THE File_System_Bridge SHALL provide secure access for video playback
3. WHEN videos are displayed, THE React_V3_Frontend SHALL show video thumbnails and playback controls
4. WHILE handling videos, THE Thumbnail_Generator SHALL extract video frame thumbnails
5. WHERE video formats are unsupported, THE Electron_V3_App SHALL show appropriate file type indicators

### Requirement 8

**User Story:** As a user, I want persistent application state so that my photo directories and preferences are remembered between sessions.

#### Acceptance Criteria

1. WHEN the app starts, THE Electron_V3_App SHALL restore previously selected photo directories
2. WHEN settings are changed, THE File_System_Bridge SHALL persist configuration to secure storage
3. WHEN the app closes, THE Electron_V3_App SHALL save current window state and user preferences
4. WHILE managing state, THE Electron_V3_App SHALL handle storage errors without data loss
5. WHERE settings are corrupted, THE Electron_V3_App SHALL restore safe default configuration