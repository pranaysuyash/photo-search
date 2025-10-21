# Design Document

## Overview

The Electron V3 frontend integration design focuses on creating a secure, offline-first photo management system that enables direct file system access for image and video loading without requiring the Python backend for basic operations. The architecture leverages Electron's security model with context isolation while providing seamless photo browsing capabilities through direct file:// URL access.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                    │
├─────────────────────────────────────────────────────────────┤
│  • File System Manager                                     │
│  • Directory Scanner                                       │
│  • Thumbnail Generator                                     │
│  • Security Manager (Path Validation)                     │
│  • Settings Store                                          │
│  • IPC Handlers                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   Preload Script  │
                    │   (Security Bridge)│
                    └─────────┬─────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                React V3 Frontend (Renderer)                │
├─────────────────────────────────────────────────────────────┤
│  • Photo Grid Components                                   │
│  • File System Service                                     │
│  • Offline Mode Handler                                    │
│  • Thumbnail Cache                                         │
│  • Metadata Display                                        │
│  • Video Player Components                                 │
└─────────────────────────────────────────────────────────────┘
```

### Security Model

The design implements Electron's recommended security practices:

- **Context Isolation**: Enabled to prevent renderer access to Node.js APIs
- **Node Integration**: Disabled in renderer process
- **Secure IPC**: All file system operations go through validated preload script
- **Path Validation**: Strict validation of file paths against allowed directories
- **Sandboxing**: Renderer process operates in sandboxed environment

## Components and Interfaces

### 1. Enhanced Preload Script (`preload.js`)

**Purpose**: Secure bridge between main process and renderer with comprehensive file system APIs

**Key Interfaces**:
```typescript
interface SecureElectronAPI {
  // Directory Management
  selectPhotoDirectories(): Promise<string[]>;
  getPhotoDirectories(): Promise<string[]>;
  removePhotoDirectory(path: string): Promise<boolean>;
  
  // File System Operations
  scanDirectory(path: string, options?: ScanOptions): Promise<PhotoFile[]>;
  getFileMetadata(path: string): Promise<FileMetadata>;
  validateFilePath(path: string): Promise<boolean>;
  
  // Thumbnail Operations
  getThumbnailPath(filePath: string, size: number): Promise<string>;
  generateThumbnail(filePath: string, size: number): Promise<string>;
  clearThumbnailCache(): Promise<boolean>;
  
  // Settings Management
  getSetting<T>(key: string): Promise<T>;
  setSetting<T>(key: string, value: T): Promise<boolean>;
  
  // Event Listeners
  onDirectoriesChanged(callback: (directories: string[]) => void): void;
  onScanProgress(callback: (progress: ScanProgress) => void): void;
  onThumbnailGenerated(callback: (path: string, thumbnailPath: string) => void): void;
}
```

### 2. File System Manager (Main Process)

**Purpose**: Centralized file system operations with security validation

**Key Features**:
- Directory scanning with file type filtering
- Recursive traversal with depth limits
- File metadata extraction (EXIF, basic file stats)
- Path validation against allowed roots
- Error handling and logging

**Implementation**:
```javascript
class FileSystemManager {
  constructor() {
    this.allowedRoots = new Set();
    this.scanCache = new Map();
  }
  
  async scanDirectory(rootPath, options = {}) {
    // Validate path against allowed roots
    // Recursively scan for image/video files
    // Extract metadata for each file
    // Return structured file list
  }
  
  validatePath(filePath) {
    // Check if path is within allowed roots
    // Prevent directory traversal attacks
    // Return validation result
  }
}
```

### 3. Thumbnail Generator (Main Process)

**Purpose**: Efficient thumbnail generation and caching system

**Key Features**:
- On-demand thumbnail generation
- Multiple size support (150px, 300px, 600px)
- LRU cache with configurable size limits
- Video frame extraction for video thumbnails
- Background processing to avoid UI blocking

**Cache Structure**:
```
{appData}/photo-search/thumbnails/
├── 150/
│   ├── {hash-of-original-path}.jpg
│   └── ...
├── 300/
│   ├── {hash-of-original-path}.jpg
│   └── ...
└── 600/
    ├── {hash-of-original-path}.jpg
    └── ...
```

### 4. Enhanced React V3 Frontend Integration

**Purpose**: Seamless integration with Electron APIs for offline photo management

**New Services**:

#### FileSystemService
```typescript
class FileSystemService {
  async getPhotoDirectories(): Promise<string[]>;
  async scanDirectories(): Promise<PhotoFile[]>;
  async getFileMetadata(path: string): Promise<FileMetadata>;
  getPhotoUrl(path: string): string; // Returns file:// URL
  getThumbnailUrl(path: string, size?: number): Promise<string>;
}
```

#### OfflineModeHandler
```typescript
class OfflineModeHandler {
  isOfflineMode(): boolean;
  getAvailableFeatures(): FeatureSet;
  handleOfflineOperation<T>(operation: () => Promise<T>): Promise<T>;
}
```

### 5. Photo Grid Components Enhancement

**Purpose**: Optimized photo display with direct file access

**Key Enhancements**:
- Virtual scrolling for large collections
- Progressive thumbnail loading
- Lazy loading with intersection observer
- Error handling for missing files
- Video thumbnail support with play indicators

## Data Models

### PhotoFile Interface
```typescript
interface PhotoFile {
  path: string;
  name: string;
  size: number;
  mtime: number;
  ctime: number;
  extension: string;
  type: 'image' | 'video';
  dimensions?: { width: number; height: number };
  metadata?: {
    camera?: string;
    dateTaken?: string;
    gps?: { lat: number; lon: number };
    orientation?: number;
  };
  thumbnailPath?: string;
}
```

### ScanProgress Interface
```typescript
interface ScanProgress {
  directory: string;
  processed: number;
  total: number;
  currentFile: string;
  errors: string[];
}
```

### FileMetadata Interface
```typescript
interface FileMetadata {
  path: string;
  size: number;
  mtime: number;
  ctime: number;
  isDirectory: boolean;
  isFile: boolean;
  extension: string;
  mimeType?: string;
  exif?: Record<string, any>;
}
```

## Error Handling

### File System Errors
- **Permission Denied**: Show user-friendly message with instructions
- **File Not Found**: Remove from cache and update UI
- **Corrupted Files**: Skip with logging, continue processing
- **Network Drives**: Handle timeout and disconnection scenarios

### Thumbnail Generation Errors
- **Unsupported Format**: Show file type icon instead
- **Memory Limits**: Implement queue with concurrency limits
- **Disk Space**: Implement cache cleanup with user notification

### Security Violations
- **Path Traversal**: Log security event, deny access
- **Unauthorized Access**: Show error dialog, audit log
- **Invalid Operations**: Graceful degradation with user feedback

## Testing Strategy

### Unit Tests
- File system operations with mock file system
- Path validation logic with edge cases
- Thumbnail generation with various image formats
- Metadata extraction with sample files

### Integration Tests
- Electron main/renderer communication
- File system scanning with test directories
- Thumbnail cache operations
- Settings persistence

### End-to-End Tests
- Complete photo directory selection workflow
- Photo browsing with large collections
- Offline mode functionality
- Error recovery scenarios

### Performance Tests
- Large directory scanning (10k+ files)
- Thumbnail generation performance
- Memory usage with large collections
- UI responsiveness during operations

## Security Considerations

### Path Validation
- Strict whitelist of allowed directories
- Prevention of directory traversal attacks
- Validation of file extensions and MIME types
- Logging of security violations

### Data Protection
- No sensitive data in renderer process
- Secure storage of user preferences
- Minimal data exposure through IPC
- Regular security audit of exposed APIs

### File System Access
- Read-only access to photo directories
- No write operations outside app data
- Validation of all file operations
- Graceful handling of permission changes

## Performance Optimization

### Scanning Optimization
- Incremental scanning with change detection
- Parallel processing with worker threads
- Efficient file filtering at OS level
- Smart caching of directory contents

### Thumbnail Optimization
- Progressive JPEG generation
- WebP format support for smaller sizes
- Background generation queue
- Intelligent cache warming

### Memory Management
- Lazy loading of photo metadata
- Efficient data structures for large collections
- Garbage collection optimization
- Memory usage monitoring

### UI Performance
- Virtual scrolling for photo grids
- Image lazy loading with intersection observer
- Debounced search and filtering
- Optimized re-rendering with React.memo

## Deployment Considerations

### Build Process
1. Build React V3 frontend with Vite
2. Copy built assets to electron-v3/app/
3. Bundle Electron application with electron-builder
4. Include native dependencies for thumbnail generation
5. Code signing for distribution

### Platform-Specific Features
- **macOS**: Native file dialogs, Spotlight integration
- **Windows**: File associations, thumbnail shell extensions
- **Linux**: Desktop file integration, file manager plugins

### Update Strategy
- Electron auto-updater for application updates
- Incremental updates for frontend assets
- Backward compatibility for settings format
- Migration scripts for data format changes

## Future Enhancements

### Phase 2 Features
- Background indexing with search capabilities
- Basic photo editing (rotate, crop)
- Simple tagging and organization
- Export and sharing functionality

### Phase 3 Features
- AI-powered features when backend available
- Cloud storage integration
- Advanced search and filtering
- Collaborative features

### Extensibility
- Plugin architecture for custom features
- API for third-party integrations
- Customizable UI themes
- Advanced user preferences