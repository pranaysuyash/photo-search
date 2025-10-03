# Photo Search API Documentation

## Overview

This document describes the APIs for the Photo Search application's Electron-based services. These APIs enable communication between the frontend React application and the backend Electron main process.

## Architecture

The Photo Search application uses Electron's IPC (Inter-Process Communication) system for communication between:

1. **Renderer Process**: React frontend running in Chromium
2. **Main Process**: Node.js backend with Python service supervisor
3. **Python Process**: FastAPI backend for AI operations

## IPC API Reference

### Secure Electron API (`secureElectronAPI`)

Exposed globally in the renderer process for secure IPC communication.

#### Folder Selection

```javascript
// Select a photo folder
const folderPath = await secureElectronAPI.selectFolder();
```

**Parameters**: None
**Returns**: `Promise<string|null>` - Selected folder path or null if cancelled

#### Directory Photo Reading

```javascript
// Read photos from a directory
const photos = await secureElectronAPI.readDirectoryPhotos('/path/to/photos');
```

**Parameters**:
- `directoryPath` (string): Path to the photo directory

**Returns**: `Promise<Array<Object>>` - Array of photo objects with metadata

#### Photo Metadata Reading

```javascript
// Read metadata for a specific photo
const metadata = await secureElectronAPI.readPhotoMetadata('/path/to/photo.jpg');
```

**Parameters**:
- `photoPath` (string): Path to the photo file

**Returns**: `Promise<Object>` - Photo metadata object

#### API Token Retrieval

```javascript
// Get the current API token
const token = await secureElectronAPI.getApiToken();
```

**Parameters**: None
**Returns**: `Promise<string>` - API token for authenticating with Python backend

#### API Configuration

```javascript
// Get API configuration
const config = await secureElectronAPI.getApiConfig();
```

**Parameters**: None
**Returns**: `Promise<Object>` - API configuration object
```json
{
  "base": "http://127.0.0.1:8000",
  "token": "api-token-string"
}
```

#### Allowed Root Management

```javascript
// Set allowed root directory
await secureElectronAPI.setAllowedRoot('/path/to/photos');

// Get all allowed roots
const roots = await secureElectronAPI.getAllowedRoots();

// Remove allowed root
await secureElectronAPI.removeAllowedRoot('/path/to/photos');
```

#### Backend Management

```javascript
// Restart backend services
await secureElectronAPI.restartBackend();

// Get model status
const status = await secureElectronAPI.models.getStatus();

// Refresh models
const result = await secureElectronAPI.models.refresh();
```

#### File Watching

```javascript
// Start watching a directory
const result = await secureElectronAPI.fileWatcher.start('/path/to/photos');

// Stop watching a directory
const result = await secureElectronAPI.fileWatcher.stop('/path/to/photos');

// Get watcher status
const status = await secureElectronAPI.fileWatcher.getStatus();

// Manually reconcile changes
const result = await secureElectronAPI.fileWatcher.reconcile('/path/to/photos');
```

## Python Service Supervisor API

### Service Status

```javascript
// Get current service status
const status = pythonServiceSupervisor.getStatus();
```

**Returns**: `Object` - Service status information
```json
{
  "status": "running|stopped|starting|stopping|crashed|unhealthy",
  "restartCount": 0,
  "lastHealthCheck": "2023-01-01T00:00:00.000Z",
  "healthCheckFailures": 0,
  "isRunning": true,
  "isHealthy": true,
  "apiToken": "token-string",
  "port": 8000,
  "host": "127.0.0.1"
}
```

### Service Control

```javascript
// Start the service
const success = await pythonServiceSupervisor.start();

// Stop the service
const success = await pythonServiceSupervisor.stop();

// Restart the service
const success = await pythonServiceSupervisor.restart();

// Wait for healthy status
const isHealthy = await pythonServiceSupervisor.waitForHealthy(30000);
```

### Configuration

```javascript
// Get service configuration
const config = pythonServiceSupervisor.getConfig();

// Get API base URL
const baseUrl = pythonServiceSupervisor.getApiBaseUrl();

// Get API configuration
const apiConfig = pythonServiceSupervisor.getApiConfig();
```

## File Watcher Service API

### Watching Control

```javascript
// Start watching a directory
const success = await fileWatcherService.startWatching('/path/to/photos');

// Stop watching a directory
const success = await fileWatcherService.stopWatching('/path/to/photos');

// Check if watching a directory
const isWatching = fileWatcherService.isWatching('/path/to/photos');

// Get all watched directories
const directories = fileWatcherService.getWatchedDirectories();
```

### Change Management

```javascript
// Get pending changes for a directory
const changes = fileWatcherService.getPendingChanges('/path/to/photos');

// Process pending changes
await fileWatcherService.processPendingChanges('/path/to/photos');

// Watch all previously watched directories
const success = await fileWatcherService.watchAllActiveDirectories();

// Stop watching all directories
const success = await fileWatcherService.stopAllWatching();
```

## Events

### Service Supervisor Events

```javascript
// Listen for status changes
pythonServiceSupervisor.on('statusChange', (data) => {
  console.log('Status changed:', data.from, '→', data.to);
});

// Listen for health changes
pythonServiceSupervisor.on('healthChange', (data) => {
  console.log('Health changed:', data.healthy);
});

// Listen for restarts
pythonServiceSupervisor.on('restart', (data) => {
  console.log('Service restarted:', data.attempt, '/', data.maxAttempts);
});

// Listen for errors
pythonServiceSupervisor.on('error', (data) => {
  console.error('Service error:', data.type, data.error);
});
```

### File Watcher Events

```javascript
// Listen for reconciliation events
fileWatcherService.on('reconciliation', (data) => {
  console.log('Reconciliation completed:', data.directory, data.count, 'changes');
});

// Listen for status changes
fileWatcherService.on('statusChange', (data) => {
  console.log('Watcher status changed:', data.directory, data.status);
});

// Listen for errors
fileWatcherService.on('error', (data) => {
  console.error('Watcher error:', data.directory, data.error);
});
```

## Security Considerations

### Path Validation
All file system operations validate paths against allowed root directories to prevent directory traversal attacks.

### API Authentication
All communication with the Python backend uses temporary API tokens generated for each session.

### Process Isolation
Electron's context isolation prevents renderer processes from directly accessing Node.js APIs.

## Error Handling

### Common Error Patterns

```javascript
try {
  const result = await secureElectronAPI.selectFolder();
  if (result === null) {
    console.log('Folder selection cancelled');
  } else {
    console.log('Selected folder:', result);
  }
} catch (error) {
  console.error('Failed to select folder:', error.message);
}

try {
  const photos = await secureElectronAPI.readDirectoryPhotos('/invalid/path');
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('Directory not found');
  } else if (error.code === 'EACCES') {
    console.error('Permission denied');
  } else {
    console.error('Failed to read directory:', error.message);
  }
}
```

### Service Supervisor Errors

```javascript
pythonServiceSupervisor.on('error', (data) => {
  switch (data.type) {
    case 'start-failed':
      console.error('Failed to start service:', data.error.message);
      break;
    case 'spawn-failed':
      console.error('Failed to spawn process:', data.error.message);
      break;
    case 'max-restarts-reached':
      console.error('Maximum restart attempts reached');
      break;
    case 'health-failed':
      console.error('Service health check failed');
      break;
    case 'health-check-error':
      console.error('Health check error:', data.error.message);
      break;
    default:
      console.error('Unknown error:', data.type, data.error.message);
  }
});
```

## Best Practices

### Performance Optimization

1. **Batch Operations**: Use batch APIs when possible to reduce IPC overhead
2. **Caching**: Leverage client-side caching for frequently accessed data
3. **Pagination**: Implement pagination for large result sets
4. **Debouncing**: Debounce rapid UI changes to reduce backend load

### Error Resilience

1. **Graceful Degradation**: Provide fallback behavior when services are unavailable
2. **Retry Logic**: Implement exponential backoff for transient failures
3. **User Feedback**: Show appropriate loading states and error messages
4. **Logging**: Log errors with sufficient context for debugging

### Security

1. **Path Validation**: Always validate file paths against allowed roots
2. **Input Sanitization**: Sanitize all user inputs before processing
3. **API Tokens**: Use temporary tokens and rotate them regularly
4. **Privilege Separation**: Run with minimal required privileges

## Example Usage

### Basic Photo Browser

```javascript
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

function PhotoBrowser() {
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [photos, setPhotos] = useState([]);

  // Select folder
  const handleSelectFolder = async () => {
    try {
      const folderPath = await secureElectronAPI.selectFolder();
      if (folderPath) {
        setSelectedFolder(folderPath);
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
    }
  };

  // Load photos when folder is selected
  useEffect(() => {
    if (selectedFolder) {
      loadPhotos(selectedFolder);
    }
  }, [selectedFolder]);

  const loadPhotos = async (folderPath) => {
    try {
      const photoList = await secureElectronAPI.readDirectoryPhotos(folderPath);
      setPhotos(photoList);
    } catch (error) {
      console.error('Failed to load photos:', error);
    }
  };

  return (
    <div>
      <button onClick={handleSelectFolder}>Select Folder</button>
      {selectedFolder && (
        <div>
          <h2>{selectedFolder}</h2>
          <div className="photo-grid">
            {photos.map(photo => (
              <img 
                key={photo.path} 
                src={`file://${photo.path}`} 
                alt={photo.name} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Service Health Monitoring

```javascript
import { useEffect, useState } from 'react';
import { pythonServiceSupervisor } from '../electron/main/python-service-supervisor';

function ServiceStatus() {
  const [status, setStatus] = useState(pythonServiceSupervisor.getStatus());

  useEffect(() => {
    const handleStatusChange = (data) => {
      setStatus(pythonServiceSupervisor.getStatus());
    };

    const handleHealthChange = (data) => {
      setStatus(pythonServiceSupervisor.getStatus());
    };

    pythonServiceSupervisor.on('statusChange', handleStatusChange);
    pythonServiceSupervisor.on('healthChange', handleHealthChange);

    return () => {
      pythonServiceSupervisor.off('statusChange', handleStatusChange);
      pythonServiceSupervisor.off('healthChange', handleHealthChange);
    };
  }, []);

  return (
    <div className={`service-status ${status.isHealthy ? 'healthy' : 'unhealthy'}`}>
      <span className="status-indicator"></span>
      <span className="status-text">
        {status.isHealthy ? 'Service Healthy' : 'Service Unhealthy'}
      </span>
      {status.restartCount > 0 && (
        <span className="restart-count">
          Restarts: {status.restartCount}
        </span>
      )}
    </div>
  );
}
```

## Troubleshooting

### Common Issues

1. **Service Not Starting**: Check logs in user data directory
2. **API Unreachable**: Verify service is running and port is available
3. **Permission Denied**: Ensure proper file system permissions
4. **High Resource Usage**: Adjust service configuration in settings

### Debugging Tips

1. **Enable Logging**: Set `ELECTRON_LOG_LEVEL=debug` for verbose output
2. **Check Logs**: Review logs in user data directory (`~/Library/Application Support/Photo Search/logs`)
3. **Restart Services**: Use service supervisor to restart backend when needed
4. **Validate Paths**: Ensure all file paths are within allowed roots

## Version Compatibility

### API Versioning
The IPC API follows semantic versioning:
- **Major**: Breaking changes to IPC methods or parameters
- **Minor**: New features and backward-compatible additions
- **Patch**: Bug fixes and performance improvements

### Compatibility Matrix
| Electron API | Python Backend | Compatible |
|--------------|----------------|------------|
| 1.0.x        | 1.0.x          | ✅         |
| 1.1.x        | 1.0.x          | ✅         |
| 2.0.x        | 1.0.x          | ❌         |

Always check compatibility before upgrading components.