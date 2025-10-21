# Design Document

## Overview

The Folder Management System provides a comprehensive solution for configuring, monitoring, and managing photo directories within the Photo Search application. The design emphasizes local-first operation with Electron integration, efficient scanning algorithms, and a user-friendly interface that accommodates both casual users and power users with complex photo storage setups.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Photo Search Application                  │
├─────────────────────────────────────────────────────────────┤
│  Folder Management UI (React Components)                    │
│  ├── FolderManagerDialog                                    │
│  ├── DefaultLocationsSelector                               │
│  ├── CustomDirectoryPicker                                  │
│  ├── SystemScanInterface                                    │
│  └── DirectoryStatusList                                    │
├─────────────────────────────────────────────────────────────┤
│  Folder Management Services (TypeScript)                    │
│  ├── FolderConfigurationService                             │
│  ├── DirectoryScannerService                                │
│  ├── FileSystemWatcherService                               │
│  └── ExclusionRuleEngine                                    │
├─────────────────────────────────────────────────────────────┤
│  Electron Main Process (Node.js)                            │
│  ├── FileSystemManager (Enhanced)                           │
│  ├── DirectoryWatcher                                       │
│  ├── ScanProgressTracker                                    │
│  └── PermissionValidator                                    │
├─────────────────────────────────────────────────────────────┤
│  Storage Layer                                              │
│  ├── FolderConfiguration (electron-store)                   │
│  ├── PhotoIndex (SQLite/JSON)                               │
│  └── ScanCache (Local Storage)                              │
└─────────────────────────────────────────────────────────────┘
```

### Integration with Existing Systems

The Folder Management System integrates with existing Photo Search components:

- **LibraryStore**: Extends current library management with folder configuration state
- **PhotoStore**: Receives updates when directories are added/removed/scanned
- **FileSystemService**: Enhanced with folder management capabilities
- **SettingsStore**: Persists folder configurations and user preferences
- **Electron APIs**: Leverages existing file system access patterns

## Components and Interfaces

### Frontend Components

#### FolderManagerDialog
```typescript
interface FolderManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onFoldersChanged: (folders: ConfiguredFolder[]) => void;
}

interface ConfiguredFolder {
  id: string;
  path: string;
  name: string;
  type: 'default' | 'custom' | 'system-discovered';
  status: 'active' | 'scanning' | 'error' | 'offline';
  photoCount: number;
  lastScanned: Date;
  includeSubdirectories: boolean;
  watchEnabled: boolean;
}
```

#### DefaultLocationsSelector
```typescript
interface DefaultLocation {
  id: string;
  name: string;
  path: string;
  estimatedPhotoCount: number;
  exists: boolean;
  accessible: boolean;
}

interface DefaultLocationsSelectorProps {
  onLocationsSelected: (locations: DefaultLocation[]) => void;
  onCancel: () => void;
}
```

#### SystemScanInterface
```typescript
interface SystemScanProgress {
  isScanning: boolean;
  currentDirectory: string;
  directoriesScanned: number;
  totalDirectories: number;
  photosFound: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
}

interface SystemScanInterfaceProps {
  onScanComplete: (discoveredDirectories: DiscoveredDirectory[]) => void;
  onCancel: () => void;
}
```

### Backend Services

#### FolderConfigurationService
```typescript
class FolderConfigurationService {
  async getConfiguredFolders(): Promise<ConfiguredFolder[]>
  async addFolder(folderConfig: FolderConfiguration): Promise<void>
  async removeFolder(folderId: string): Promise<void>
  async updateFolderStatus(folderId: string, status: FolderStatus): Promise<void>
  async validateFolderAccess(path: string): Promise<ValidationResult>
  async getDefaultLocations(): Promise<DefaultLocation[]>
}
```

#### DirectoryScannerService
```typescript
class DirectoryScannerService {
  async scanDirectory(path: string, options: ScanOptions): Promise<ScanResult>
  async performSystemScan(exclusions: string[]): Promise<SystemScanResult>
  async pauseScan(scanId: string): Promise<void>
  async resumeScan(scanId: string): Promise<void>
  async cancelScan(scanId: string): Promise<void>
  onProgress(callback: (progress: ScanProgress) => void): void
}

interface ScanOptions {
  includeSubdirectories: boolean;
  fileExtensions: string[];
  maxDepth?: number;
  batchSize: number;
  respectExclusions: boolean;
}
```

#### FileSystemWatcherService
```typescript
class FileSystemWatcherService {
  async watchDirectory(path: string): Promise<string> // Returns watcher ID
  async unwatchDirectory(watcherId: string): Promise<void>
  onFileAdded(callback: (filePath: string) => void): void
  onFileRemoved(callback: (filePath: string) => void): void
  onDirectoryMoved(callback: (oldPath: string, newPath: string) => void): void
}
```

### Electron Main Process Extensions

#### Enhanced FileSystemManager
```javascript
class FileSystemManager {
  // Existing methods...
  
  async getDefaultPhotoDirectories() {
    // Returns OS-specific default photo locations
  }
  
  async validateDirectoryAccess(path) {
    // Checks read permissions and accessibility
  }
  
  async scanDirectoryForPhotos(path, options) {
    // Recursive photo discovery with progress reporting
  }
  
  async performSystemWideScan(exclusions) {
    // Comprehensive system scan with resource management
  }
}
```

#### DirectoryWatcher
```javascript
class DirectoryWatcher {
  constructor(fileSystemManager) {
    this.watchers = new Map();
    this.fsManager = fileSystemManager;
  }
  
  async watchDirectory(path, options) {
    // Creates fs.watch instance with proper error handling
  }
  
  async handleFileSystemEvent(eventType, filename, directoryPath) {
    // Processes file system changes and notifies renderer
  }
}
```

## Data Models

### Folder Configuration Schema
```typescript
interface FolderConfiguration {
  id: string;
  path: string;
  name: string;
  type: 'default' | 'custom' | 'system-discovered';
  addedDate: Date;
  lastScanned: Date;
  settings: {
    includeSubdirectories: boolean;
    watchEnabled: boolean;
    scanInterval?: number; // For periodic rescans
    priority: 'low' | 'normal' | 'high';
  };
  statistics: {
    photoCount: number;
    totalSize: number;
    lastPhotoAdded?: Date;
    scanDuration?: number;
  };
  status: {
    current: 'active' | 'scanning' | 'error' | 'offline' | 'disabled';
    lastError?: string;
    lastErrorDate?: Date;
  };
}
```

### Exclusion Rules Schema
```typescript
interface ExclusionRule {
  id: string;
  pattern: string;
  type: 'exact' | 'wildcard' | 'regex';
  description: string;
  isSystemDefault: boolean;
  isActive: boolean;
}

// Default system exclusions
const DEFAULT_EXCLUSIONS = [
  '/System/', '/Windows/', '/Program Files/',
  '*/node_modules/*', '*/.git/*', '*/cache/*',
  '*/temp/*', '*/tmp/*', '*/.Trash/*'
];
```

### Scan Progress Schema
```typescript
interface ScanProgress {
  scanId: string;
  type: 'directory' | 'system';
  status: 'running' | 'paused' | 'completed' | 'cancelled' | 'error';
  progress: {
    currentPath: string;
    itemsProcessed: number;
    totalItems: number;
    photosFound: number;
    bytesProcessed: number;
    startTime: Date;
    estimatedCompletion?: Date;
  };
  results?: {
    directories: DiscoveredDirectory[];
    totalPhotos: number;
    errors: ScanError[];
  };
}
```

## Error Handling

### Error Categories and Responses

#### Permission Errors
- **Detection**: Check file system permissions before operations
- **User Feedback**: Clear messages about access requirements
- **Recovery**: Offer alternative paths or permission request guidance

#### Network/Storage Errors
- **Detection**: Monitor for network drives becoming unavailable
- **User Feedback**: Status indicators showing offline directories
- **Recovery**: Automatic retry with exponential backoff

#### Scan Interruption Errors
- **Detection**: Handle system sleep, low memory, or user cancellation
- **User Feedback**: Progress preservation and resume options
- **Recovery**: Graceful cleanup and state restoration

### Error Handling Patterns
```typescript
class FolderManagementError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean,
    public userAction?: string
  ) {
    super(message);
  }
}

// Error codes
enum ErrorCodes {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DIRECTORY_NOT_FOUND = 'DIRECTORY_NOT_FOUND',
  SCAN_INTERRUPTED = 'SCAN_INTERRUPTED',
  STORAGE_FULL = 'STORAGE_FULL',
  NETWORK_UNAVAILABLE = 'NETWORK_UNAVAILABLE'
}
```

## Testing Strategy

### Unit Testing
- **Service Layer**: Mock file system operations, test business logic
- **Component Testing**: React Testing Library for UI interactions
- **Electron APIs**: Mock IPC communications and file system calls

### Integration Testing
- **End-to-End Workflows**: Complete folder addition and scanning processes
- **File System Integration**: Real directory operations with test data
- **Performance Testing**: Large directory scanning with resource monitoring

### Test Scenarios
1. **Default Location Selection**: Verify OS-specific default directories
2. **Custom Directory Addition**: Test directory picker and validation
3. **System Scan**: Mock comprehensive system scanning
4. **File System Watching**: Simulate file additions/removals
5. **Error Recovery**: Test permission errors and network failures
6. **Performance**: Large directory handling and memory usage

### Mock Data Strategy
```typescript
// Test fixtures for different scenarios
const TEST_SCENARIOS = {
  emptyDirectory: '/test/empty',
  smallPhotoCollection: '/test/small-collection', // ~100 photos
  largePhotoCollection: '/test/large-collection', // ~10,000 photos
  mixedFileTypes: '/test/mixed-files',
  nestedDirectories: '/test/deep-nesting',
  permissionDenied: '/test/no-access',
  networkDrive: '/test/network-mount'
};
```

## Performance Considerations

### Scanning Optimization
- **Batch Processing**: Process directories in configurable batch sizes
- **Worker Threads**: Use Electron's worker threads for CPU-intensive operations
- **Memory Management**: Stream processing for large directories
- **Caching**: Cache directory metadata to avoid repeated scans

### Resource Management
```typescript
interface ScanResourceLimits {
  maxConcurrentScans: number;
  batchSize: number;
  memoryThreshold: number; // MB
  cpuThrottling: boolean;
  pauseOnLowBattery: boolean;
}

const DEFAULT_LIMITS: ScanResourceLimits = {
  maxConcurrentScans: 2,
  batchSize: 1000,
  memoryThreshold: 512,
  cpuThrottling: true,
  pauseOnLowBattery: true
};
```

### UI Performance
- **Virtual Scrolling**: For large directory lists
- **Debounced Updates**: Throttle progress updates to prevent UI blocking
- **Progressive Loading**: Load directory statistics on demand
- **Background Processing**: Keep UI responsive during scans

## Security Considerations

### File System Access
- **Path Validation**: Sanitize and validate all directory paths
- **Permission Checking**: Verify read access before operations
- **Sandboxing**: Respect Electron's security model and context isolation

### Privacy Protection
- **Exclusion Enforcement**: Strictly respect user-defined exclusions
- **Metadata Handling**: Secure storage of directory configurations
- **Error Logging**: Avoid logging sensitive path information

### Security Patterns
```typescript
class SecurityValidator {
  static validatePath(path: string): ValidationResult {
    // Check for path traversal attacks
    // Verify path is within allowed boundaries
    // Ensure no access to system-critical directories
  }
  
  static sanitizePath(path: string): string {
    // Remove dangerous characters
    // Normalize path separators
    // Resolve symbolic links safely
  }
}
```

## Future Enhancements

### Phase 2 Features
- **Cloud Integration**: Support for cloud storage directories (Google Drive, Dropbox)
- **Network Shares**: Enhanced support for SMB/NFS network directories
- **Scheduled Scanning**: Automatic periodic rescans with user-defined schedules
- **Advanced Filtering**: Content-based exclusions (file size, date ranges)

### Performance Improvements
- **Incremental Scanning**: Only scan changed portions of directories
- **Parallel Processing**: Multi-threaded scanning for better performance
- **Smart Caching**: Intelligent cache invalidation and updates
- **Background Indexing**: Continuous background photo discovery

### User Experience Enhancements
- **Drag-and-Drop**: Direct folder addition via drag-and-drop
- **Quick Actions**: Right-click context menus for folder operations
- **Visual Indicators**: Rich status displays with progress animations
- **Keyboard Shortcuts**: Power user keyboard navigation and actions