# Enhanced Electron APIs for Photo Search V3

This document describes the comprehensive file system APIs that have been added to the Electron V3 frontend integration.

## Overview

The enhanced APIs provide secure, offline-first photo management capabilities with direct file system access, thumbnail generation, and comprehensive metadata extraction. These APIs enable the React V3 frontend to work seamlessly with local photo collections without requiring the Python backend for basic operations.

## Architecture

### Security Model
- **Context Isolation**: Enabled to prevent renderer access to Node.js APIs
- **Path Validation**: Strict validation of file paths against allowed directories
- **Secure IPC**: All file system operations go through validated preload script
- **No Direct File Access**: Renderer process cannot access files outside allowed roots

### Components
1. **FileSystemManager**: Handles directory scanning, file metadata extraction, and path validation
2. **ThumbnailGenerator**: Creates and manages thumbnail cache with LRU eviction
3. **Enhanced Preload Script**: Secure bridge exposing comprehensive APIs to renderer

## API Reference

### Directory Management

#### `selectPhotoDirectories(): Promise<string[] | null>`
Opens native directory selection dialog for adding photo directories.

#### `getPhotoDirectories(): Promise<string[]>`
Returns all configured photo directories.

#### `addPhotoDirectory(path: string): Promise<boolean>`
Adds a single directory to the allowed photo directories.

#### `removePhotoDirectory(path: string): Promise<boolean>`
Removes a directory from the allowed photo directories.

### File System Operations

#### `scanDirectory(path: string, options?: ScanOptions): Promise<ScanResult>`
Recursively scans a directory for image and video files.

**Options:**
```typescript
interface ScanOptions {
  recursive?: boolean;        // Default: true
  maxDepth?: number;         // Default: 10
  includeHidden?: boolean;   // Default: false
  fileTypes?: Array<'image' | 'video'>; // Default: ['image', 'video']
}
```

#### `getFileMetadata(filePath: string): Promise<PhotoFile>`
Returns comprehensive metadata for a specific file.

#### `validateFilePath(filePath: string): Promise<PathValidation>`
Validates if a file path is within allowed directories.

### Thumbnail Operations

#### `generateThumbnail(filePath: string, size?: number): Promise<string>`
Generates a thumbnail for an image or video file.

**Supported sizes:** 150px, 300px, 600px

#### `getThumbnailUrl(filePath: string, size?: number): Promise<string>`
Returns a file:// URL for the thumbnail, generating it if necessary.

#### `preloadThumbnails(filePaths: string[], sizes?: number[]): Promise<ThumbnailPreloadResult>`
Queues multiple thumbnails for background generation.

#### `clearThumbnailCache(): Promise<boolean>`
Clears the entire thumbnail cache.

#### `getThumbnailCacheInfo(): Promise<ThumbnailCacheInfo>`
Returns information about the thumbnail cache (size, entries, etc.).

### File URL Generation

#### `getSecureFileUrl(filePath: string): Promise<string>`
Returns a secure file:// URL for direct file access in the renderer.

### Utility APIs

#### File System API (`window.fsAPI`)
- `exists(filePath: string): boolean`
- `isDirectory(filePath: string): boolean`
- `isFile(filePath: string): boolean`
- `getStats(filePath: string): FileStats | null`
- `isImageFile(filePath: string): boolean`
- `isVideoFile(filePath: string): boolean`
- `formatFileSize(bytes: number): string`

#### Media API (`window.mediaAPI`)
- `getSupportedImageExtensions(): string[]`
- `getSupportedVideoExtensions(): string[]`
- `getThumbnailSizes(): ThumbnailSizes`
- `getMimeType(filePath: string): string`

#### Path API (`window.pathAPI`)
- Standard Node.js path utilities exposed securely

#### Platform API (`window.platform`)
- Platform detection and system information

## Event System

The APIs emit various events that the React frontend can listen to:

### `onScanProgress(callback: (progress: ScanProgress) => void)`
Fired during directory scanning with progress updates.

### `onThumbnailGenerated(callback: (data: ThumbnailGeneratedEvent) => void)`
Fired when a thumbnail is successfully generated.

### `onPhotoDirectoriesUpdated(callback: (directories: string[]) => void)`
Fired when the list of photo directories changes.

### `onFileSystemError(callback: (error: FileSystemError) => void)`
Fired when file system operations encounter errors.

## Usage Examples

### Basic Directory Scanning

```typescript
import { fileSystemService } from './services/FileSystemService';

// Add photo directories
const directories = await fileSystemService.addPhotoDirectory();

// Scan for photos
const photos = await fileSystemService.scanDirectory('/path/to/photos', {
  recursive: true,
  fileTypes: ['image', 'video']
});

// Get thumbnail URLs
for (const photo of photos) {
  const thumbnailUrl = await fileSystemService.getThumbnailUrl(photo.path, 300);
  console.log(`Thumbnail for ${photo.name}: ${thumbnailUrl}`);
}
```

### React Hook Integration

```typescript
import { useFileSystem } from './hooks/useFileSystem';

function PhotoLibrary() {
  const {
    photos,
    isScanning,
    scanProgress,
    addPhotoDirectory,
    scanAllDirectories
  } = useFileSystem();

  return (
    <div>
      <button onClick={addPhotoDirectory}>Add Directory</button>
      <button onClick={scanAllDirectories} disabled={isScanning}>
        {isScanning ? 'Scanning...' : 'Scan Photos'}
      </button>
      
      {scanProgress && (
        <div>Scanning: {scanProgress.currentFile}</div>
      )}
      
      <div className="photo-grid">
        {photos.map(photo => (
          <PhotoThumbnail key={photo.path} photo={photo} />
        ))}
      </div>
    </div>
  );
}
```

## Performance Considerations

### Thumbnail Generation
- **Background Processing**: Thumbnails are generated in background queues
- **LRU Cache**: Automatic cache cleanup when size limits are exceeded
- **Multiple Sizes**: Support for 150px, 300px, and 600px thumbnails
- **Concurrent Generation**: Configurable concurrency limits

### Directory Scanning
- **Incremental Updates**: Only scan changed directories
- **Progress Reporting**: Real-time progress updates during scanning
- **Error Handling**: Graceful handling of permission errors and corrupted files
- **Memory Efficient**: Streaming approach for large directories

### File Access
- **Direct URLs**: Use file:// URLs for optimal performance
- **Path Validation**: Minimal overhead security validation
- **Caching**: Intelligent caching of file metadata

## Security Features

### Path Validation
- All file paths are validated against allowed root directories
- Directory traversal attacks are prevented
- Invalid operations are logged and blocked

### Sandboxing
- Renderer process operates in sandboxed environment
- No direct Node.js API access from renderer
- All file operations go through secure IPC bridge

### Error Handling
- Comprehensive error handling with user-friendly messages
- Security violations are logged and reported
- Graceful degradation when files are inaccessible

## File Format Support

### Images
- JPEG, PNG, GIF, BMP, WebP
- TIFF, HEIC, HEIF
- RAW formats (CR2, NEF, ARW, DNG)

### Videos
- MP4, AVI, MOV, WMV
- WebM, MKV, FLV
- 3GP, OGV, MTS, M2TS

## Cache Management

### Thumbnail Cache
- **Location**: `{userData}/thumbnails/`
- **Structure**: Organized by size (150/, 300/, 600/)
- **Naming**: MD5 hash of original file path
- **Cleanup**: Automatic LRU eviction when size limits exceeded

### Cache Operations
- **Clear Cache**: Remove all cached thumbnails
- **Cache Info**: Get current cache size and statistics
- **Selective Cleanup**: Remove thumbnails for specific files

## Error Handling

### Common Error Types
- **Permission Denied**: File or directory access denied
- **File Not Found**: File has been moved or deleted
- **Unsupported Format**: File format not supported for thumbnails
- **Path Validation**: File path outside allowed directories
- **Cache Full**: Thumbnail cache has reached size limits

### Error Recovery
- **Graceful Degradation**: Continue operation when individual files fail
- **User Feedback**: Clear error messages with suggested actions
- **Automatic Retry**: Retry failed operations with exponential backoff
- **Cache Cleanup**: Automatic cleanup of invalid cache entries

## Development and Testing

### Type Safety
- Full TypeScript definitions provided
- Comprehensive interfaces for all API responses
- Type-safe event handling

### Testing
- Unit tests for file system operations
- Integration tests for IPC communication
- Performance tests for large directories
- Security tests for path validation

### Development Mode
- Additional debugging APIs available
- Enhanced logging and error reporting
- Hot reload support for preload script changes

## Migration from Legacy APIs

### Backward Compatibility
- Legacy APIs are maintained for compatibility
- Gradual migration path provided
- No breaking changes to existing functionality

### New Features
- Enhanced error handling and validation
- Comprehensive event system
- Performance optimizations
- Security improvements

This enhanced API system provides a solid foundation for building a world-class offline-first photo management application with Electron and React V3.