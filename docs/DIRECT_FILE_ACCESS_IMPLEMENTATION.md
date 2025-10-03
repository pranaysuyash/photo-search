# Direct File System Access Implementation Guide

## Current State vs. Desired State

### Current Implementation
```javascript
// Current approach: HTTP API dependency for all operations
const getPhotos = async (directory) => {
  const response = await fetch(`${API_BASE}/library?dir=${encodeURIComponent(directory)}`);
  return response.json();
};
```

### Desired Implementation
```javascript
// Desired approach: Direct file access with server fallback for AI features
const getPhotos = async (directory) => {
  // Primary: Direct file system access
  try {
    return await window.electronAPI.readDirectoryPhotos(directory);
  } catch (error) {
    console.warn('Direct file access failed, attempting API fallback:', error);
    // Fallback: HTTP API if direct access fails
    const response = await fetch(`${API_BASE}/library?dir=${encodeURIComponent(directory)}`);
    return response.json();
  }
};
```

## File System Access Architecture

### 1. Electron Main Process Implementation

```javascript
// main-process/file-access.js
const { ipcMain } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(require('fs').readdir);
const stat = promisify(require('fs').stat);

// Enhanced photo file detection
const PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];

// IPC handler for reading photo directory
ipcMain.handle('read-directory-photos', async (event, directoryPath) => {
  try {
    const files = await readdir(directoryPath);
    
    // Filter for photo files and get metadata concurrently
    const photoPromises = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return PHOTO_EXTENSIONS.includes(ext);
      })
      .map(async (file) => {
        const fullPath = path.join(directoryPath, file);
        const fileStat = await stat(fullPath);
        
        return {
          name: file,
          path: fullPath,
          relativePath: path.relative(app.getPath('home'), fullPath), // For UI display
          size: fileStat.size,
          mtime: fileStat.mtimeMs,
          ctime: fileStat.ctimeMs,
          isDirectory: fileStat.isDirectory(),
          extension: path.extname(file).toLowerCase()
        };
      });
    
    const photos = await Promise.all(photoPromises);
    return photos.sort((a, b) => b.mtime - a.mtime); // Sort by modification time, newest first
  } catch (error) {
    console.error('Error reading directory:', error);
    throw new Error(`Cannot access directory: ${error.message}`);
  }
});

// IPC handler for reading photo metadata
ipcMain.handle('read-photo-metadata', async (event, photoPath) => {
  try {
    const fileStat = await stat(photoPath);
    const buffer = await fs.readFile(photoPath);
    
    // Extract EXIF data using a library like piexifjs or exif-reader
    let exifData = null;
    try {
      // This would use an EXIF library to extract metadata
      exifData = await extractExifData(buffer);
    } catch (exifError) {
      console.warn('Could not read EXIF data:', exifError.message);
    }
    
    return {
      path: photoPath,
      size: fileStat.size,
      mtime: fileStat.mtimeMs,
      ctime: fileStat.ctimeMs,
      extension: path.extname(photoPath).toLowerCase(),
      dimensions: await getImageDimensions(buffer), // Extract image dimensions
      exif: exifData
    };
  } catch (error) {
    console.error('Error reading photo metadata:', error);
    throw error;
  }
});

// Helper function to extract image dimensions
async function getImageDimensions(buffer) {
  // This would use a library to read image dimensions
  // Implementation would depend on the chosen image processing library
  try {
    // Placeholder - would use actual image processing
    return await extractImageDimensions(buffer);
  } catch (error) {
    return { width: null, height: null };
  }
}

// Helper function to extract EXIF data
async function extractExifData(buffer) {
  // Would use an EXIF library to extract camera, date, etc.
  // Example: piexifjs, exif-reader, etc.
  return {}; // Placeholder
}
```

### 2. React Component Integration

```jsx
// components/PhotoBrowser.jsx
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const PhotoBrowser = ({ directory }) => {
  const [selectedPhotos, setSelectedPhotos] = useState(new Set());
  const queryClient = useQueryClient();
  
  // Query using direct file access as primary, API as fallback
  const { data: photos, isLoading, isError, error } = useQuery({
    queryKey: ['photos', directory],
    queryFn: async () => {
      if (window.electronAPI) {
        // Use direct file access
        return await window.electronAPI.readDirectoryPhotos(directory);
      } else {
        // Fallback to API for web version
        const response = await fetch(`/api/library?dir=${encodeURIComponent(directory)}`);
        if (!response.ok) throw new Error('Failed to fetch photos');
        return response.json();
      }
    },
    // Cache for 5 minutes, but allow background refresh
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  // Function to refresh photos
  const refreshPhotos = async () => {
    await queryClient.invalidateQueries(['photos', directory]);
  };

  if (isLoading) return <div>Loading photos...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <div className="photo-browser">
      <div className="toolbar">
        <button onClick={refreshPhotos}>Refresh</button>
        <span className="status">
          {window.electronAPI ? 'Local File Access' : 'API Mode'} 
          {photos?.length > 0 && ` - ${photos.length} photos`}
        </span>
      </div>
      
      <div className="photo-grid">
        {photos?.map(photo => (
          <PhotoCard 
            key={photo.path} 
            photo={photo} 
            isSelected={selectedPhotos.has(photo.path)}
            onSelect={() => {
              const newSelection = new Set(selectedPhotos);
              if (newSelection.has(photo.path)) {
                newSelection.delete(photo.path);
              } else {
                newSelection.add(photo.path);
              }
              setSelectedPhotos(newSelection);
            }}
          />
        ))}
      </div>
    </div>
  );
};

const PhotoCard = ({ photo, isSelected, onSelect }) => {
  return (
    <div 
      className={`photo-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="thumbnail-container">
        <img 
          src={`file://${photo.path}`} 
          alt={photo.name}
          className="thumbnail"
          loading="lazy"
        />
        {isSelected && <div className="selection-indicator">✓</div>}
      </div>
      <div className="photo-info">
        <div className="filename">{photo.name}</div>
        <div className="file-info">
          {new Date(photo.mtime).toLocaleDateString()} •{' '}
          {(photo.size / 1024 / 1024).toFixed(1)} MB
        </div>
      </div>
    </div>
  );
};
```

### 3. Enhanced API Layer with Direct Access Fallback

```javascript
// api/local-file-access.js
class LocalFileAPI {
  constructor() {
    this.isElectron = Boolean(window.electronAPI);
  }

  async getPhotos(directory) {
    if (this.isElectron) {
      return await window.electronAPI.readDirectoryPhotos(directory);
    } else {
      // Web fallback
      const response = await fetch(`/api/library?dir=${encodeURIComponent(directory)}`);
      if (!response.ok) throw new Error('API request failed');
      return response.json();
    }
  }

  async getPhotoMetadata(photoPath) {
    if (this.isElectron) {
      return await window.electronAPI.readPhotoMetadata(photoPath);
    } else {
      // Web fallback
      const response = await fetch(`/api/metadata?path=${encodeURIComponent(photoPath)}`);
      if (!response.ok) throw new Error('API request failed');
      return response.json();
    }
  }

  // Other file operations...
  async getPhotoThumbnail(photoPath, size = 'medium') {
    if (this.isElectron) {
      // For thumbnails, we might want to generate them via the main process
      // or use file:// URLs directly for local files
      return `file://${photoPath}`;
    } else {
      // Web API approach
      return `/api/thumb?path=${encodeURIComponent(photoPath)}&size=${size}`;
    }
  }
}

// Export singleton instance
export const localFileAPI = new LocalFileAPI();
```

### 4. Service Worker Integration for Web Version

For the web version (when not running in Electron), we still need to make it work efficiently:

```javascript
// service-worker.js - Enhanced for offline photo browsing
const CACHE_NAME = 'photo-cache-v1';
const PHOTO_CACHE = 'photos-v1';

self.addEventListener('fetch', (event) => {
  // Handle photo library API requests
  if (event.request.url.includes('/api/library')) {
    event.respondWith(
      caches.match(event.request)
        .then(async (cachedResponse) => {
          // Try network first
          try {
            const networkResponse = await fetch(event.request);
            // Cache the response
            await caches.open(PHOTO_CACHE).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
            return networkResponse;
          } catch (error) {
            // Fallback to cache
            return cachedResponse || new Response(
              JSON.stringify({ photos: [], error: 'Offline' }),
              { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
              }
            );
          }
        })
    );
  }
});
```

### 5. State Management Integration

Update the state management to work with direct file access:

```javascript
// stores/photoStore.js - Zustand store with direct file access
import { create } from 'zustand';
import { localFileAPI } from '../api/local-file-access';

const usePhotoStore = create((set, get) => ({
  photos: [],
  currentDirectory: null,
  isLoading: false,
  error: null,
  
  loadPhotos: async (directory) => {
    set({ isLoading: true, error: null });
    try {
      const photos = await localFileAPI.getPhotos(directory);
      set({ 
        photos, 
        currentDirectory: directory, 
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error.message, 
        isLoading: false 
      });
    }
  },
  
  refreshPhotos: async () => {
    const { currentDirectory } = get();
    if (currentDirectory) {
      await get().loadPhotos(currentDirectory);
    }
  },
  
  // Other photo management functions...
  setSelectedPhotos: (selected) => set({ selectedPhotos: new Set(selected) }),
  togglePhotoSelection: (photoPath) => set((state) => {
    const newSelection = new Set(state.selectedPhotos);
    if (newSelection.has(photoPath)) {
      newSelection.delete(photoPath);
    } else {
      newSelection.add(photoPath);
    }
    return { selectedPhotos: newSelection };
  })
}));

export default usePhotoStore;
```

## Security Considerations

### 1. File System Access Permissions
- Implement directory access validation
- Prevent directory traversal attacks
- Limit access to user's photo directories only

```javascript
// Validate and sanitize directory paths in main process
function validateDirectoryPath(directoryPath) {
  const normalizedPath = path.normalize(directoryPath);
  const userHome = app.getPath('home');
  
  // Ensure the path is within user's home directory
  if (!normalizedPath.startsWith(userHome)) {
    throw new Error('Access denied: Only home directory access allowed');
  }
  
  return normalizedPath;
}
```

### 2. Sandboxing
- Use Electron's context isolation
- Implement proper IPC validation
- Sanitize all user inputs

## Performance Optimizations

### 1. Virtual Scrolling for Large Libraries
```jsx
// Use react-window for large photo collections
import { FixedSizeGrid } from 'react-window';

const VirtualizedPhotoGrid = ({ photos }) => {
  const Cell = ({ columnIndex, rowIndex, style }) => {
    const index = rowIndex * 4 + columnIndex; // Assuming 4 columns
    const photo = photos[index];
    
    if (!photo) return <div style={style}></div>;
    
    return (
      <div style={style}>
        <img src={`file://${photo.path}`} alt={photo.name} />
      </div>
    );
  };

  return (
    <FixedSizeGrid
      columnCount={4}
      columnWidth={200}
      height={600}
      rowCount={Math.ceil(photos.length / 4)}
      rowHeight={200}
      width={800}
    >
      {Cell}
    </FixedSizeGrid>
  );
};
```

### 2. Image Preloading and Caching
```javascript
// Enhanced image loading with caching
const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

// Cache frequently accessed thumbnails
const thumbnailCache = new Map();

const getCachedThumbnail = async (photoPath, size) => {
  const cacheKey = `${photoPath}-${size}`;
  
  if (thumbnailCache.has(cacheKey)) {
    return thumbnailCache.get(cacheKey);
  }
  
  // Load image and cache it
  const thumbnail = await preloadImage(`file://${photoPath}`);
  thumbnailCache.set(cacheKey, thumbnail);
  
  return thumbnail;
};
```

This implementation provides a comprehensive approach to direct file system access while maintaining compatibility with the existing API structure and adding proper fallbacks for different environments.