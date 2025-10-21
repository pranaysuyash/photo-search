/**
 * Example React hook for using the enhanced file system APIs
 * This demonstrates how to integrate with React V3 frontend
 */

import { useState, useEffect, useCallback } from 'react';
import type { PhotoFile, ScanProgress, ThumbnailCacheInfo } from '../types/electron-api';
import { fileSystemService } from './FileSystemService.example';

export interface UseFileSystemReturn {
  // State
  photoDirectories: string[];
  isScanning: boolean;
  scanProgress: ScanProgress | null;
  photos: PhotoFile[];
  thumbnailCacheInfo: ThumbnailCacheInfo | null;
  error: string | null;

  // Actions
  addPhotoDirectory: () => Promise<void>;
  removePhotoDirectory: (path: string) => Promise<void>;
  scanAllDirectories: () => Promise<void>;
  scanDirectory: (path: string) => Promise<PhotoFile[]>;
  getThumbnailUrl: (filePath: string, size?: number) => Promise<string>;
  preloadThumbnails: (filePaths: string[], sizes?: number[]) => Promise<void>;
  clearThumbnailCache: () => Promise<void>;
  refreshCacheInfo: () => Promise<void>;
}

export function useFileSystem(): UseFileSystemReturn {
  // State
  const [photoDirectories, setPhotoDirectories] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [thumbnailCacheInfo, setThumbnailCacheInfo] = useState<ThumbnailCacheInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize and setup event listeners
  useEffect(() => {
    if (!fileSystemService.isElectronEnvironment()) {
      setError('Not running in Electron environment');
      return;
    }

    // Load initial data
    const loadInitialData = async () => {
      try {
        const directories = await fileSystemService.getPhotoDirectories();
        setPhotoDirectories(directories);

        const cacheInfo = await fileSystemService.getThumbnailCacheInfo();
        setThumbnailCacheInfo(cacheInfo);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load initial data');
      }
    };

    loadInitialData();

    // Setup event listeners
    fileSystemService.setupEventListeners({
      onScanProgress: (progress) => {
        setScanProgress(progress);
      },
      onThumbnailGenerated: (data) => {
        console.log('Thumbnail generated:', data);
        // Optionally refresh cache info
        refreshCacheInfo();
      },
      onDirectoriesUpdated: (directories) => {
        setPhotoDirectories(directories);
      },
      onFileSystemError: (error) => {
        console.error('File system error:', error);
        setError(error.error);
      }
    });

    // Cleanup event listeners on unmount
    return () => {
      fileSystemService.removeEventListeners();
    };
  }, []);

  // Add photo directory
  const addPhotoDirectory = useCallback(async () => {
    try {
      setError(null);
      const newDirectories = await fileSystemService.addPhotoDirectory();
      if (newDirectories) {
        const allDirectories = await fileSystemService.getPhotoDirectories();
        setPhotoDirectories(allDirectories);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add photo directory');
    }
  }, []);

  // Remove photo directory
  const removePhotoDirectory = useCallback(async (path: string) => {
    try {
      setError(null);
      const success = await fileSystemService.removePhotoDirectory(path);
      if (success) {
        const updatedDirectories = await fileSystemService.getPhotoDirectories();
        setPhotoDirectories(updatedDirectories);
        
        // Remove photos from this directory
        setPhotos(prevPhotos => 
          prevPhotos.filter(photo => !photo.path.startsWith(path))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove photo directory');
    }
  }, []);

  // Scan all directories
  const scanAllDirectories = useCallback(async () => {
    if (photoDirectories.length === 0) {
      setError('No photo directories configured');
      return;
    }

    try {
      setError(null);
      setIsScanning(true);
      setScanProgress(null);
      
      const allPhotos: PhotoFile[] = [];
      
      for (const directory of photoDirectories) {
        const directoryPhotos = await fileSystemService.scanDirectory(directory, {
          recursive: true,
          fileTypes: ['image', 'video']
        });
        allPhotos.push(...directoryPhotos);
      }
      
      setPhotos(allPhotos);
      
      // Preload thumbnails for first 50 photos
      const firstPhotos = allPhotos.slice(0, 50);
      if (firstPhotos.length > 0) {
        await fileSystemService.preloadThumbnails(
          firstPhotos.map(photo => photo.path),
          [150, 300]
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan directories');
    } finally {
      setIsScanning(false);
      setScanProgress(null);
    }
  }, [photoDirectories]);

  // Scan specific directory
  const scanDirectory = useCallback(async (path: string): Promise<PhotoFile[]> => {
    try {
      setError(null);
      return await fileSystemService.scanDirectory(path, {
        recursive: true,
        fileTypes: ['image', 'video']
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan directory');
      return [];
    }
  }, []);

  // Get thumbnail URL
  const getThumbnailUrl = useCallback(async (filePath: string, size: number = 300): Promise<string> => {
    try {
      return await fileSystemService.getThumbnailUrl(filePath, size);
    } catch (err) {
      console.error('Failed to get thumbnail URL:', err);
      // Return original file URL as fallback
      return await fileSystemService.getFileUrl(filePath);
    }
  }, []);

  // Preload thumbnails
  const preloadThumbnails = useCallback(async (filePaths: string[], sizes: number[] = [300]) => {
    try {
      await fileSystemService.preloadThumbnails(filePaths, sizes);
    } catch (err) {
      console.error('Failed to preload thumbnails:', err);
    }
  }, []);

  // Clear thumbnail cache
  const clearThumbnailCache = useCallback(async () => {
    try {
      setError(null);
      const success = await fileSystemService.clearThumbnailCache();
      if (success) {
        await refreshCacheInfo();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear thumbnail cache');
    }
  }, []);

  // Refresh cache info
  const refreshCacheInfo = useCallback(async () => {
    try {
      const cacheInfo = await fileSystemService.getThumbnailCacheInfo();
      setThumbnailCacheInfo(cacheInfo);
    } catch (err) {
      console.error('Failed to refresh cache info:', err);
    }
  }, []);

  return {
    // State
    photoDirectories,
    isScanning,
    scanProgress,
    photos,
    thumbnailCacheInfo,
    error,

    // Actions
    addPhotoDirectory,
    removePhotoDirectory,
    scanAllDirectories,
    scanDirectory,
    getThumbnailUrl,
    preloadThumbnails,
    clearThumbnailCache,
    refreshCacheInfo
  };
}

// Example usage in a React component
export function PhotoLibraryExample() {
  const {
    photoDirectories,
    isScanning,
    scanProgress,
    photos,
    error,
    addPhotoDirectory,
    removePhotoDirectory,
    scanAllDirectories,
    getThumbnailUrl
  } = useFileSystem();

  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});

  // Load thumbnail URLs for visible photos
  useEffect(() => {
    const loadThumbnails = async () => {
      const urls: Record<string, string> = {};
      
      // Load thumbnails for first 20 photos
      const visiblePhotos = photos.slice(0, 20);
      
      for (const photo of visiblePhotos) {
        try {
          const url = await getThumbnailUrl(photo.path, 300);
          urls[photo.path] = url;
        } catch (err) {
          console.error('Failed to load thumbnail for', photo.path, err);
        }
      }
      
      setThumbnailUrls(urls);
    };

    if (photos.length > 0) {
      loadThumbnails();
    }
  }, [photos, getThumbnailUrl]);

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="photo-library">
      <div className="controls">
        <button onClick={addPhotoDirectory}>
          Add Photo Directory
        </button>
        <button onClick={scanAllDirectories} disabled={isScanning}>
          {isScanning ? 'Scanning...' : 'Scan Photos'}
        </button>
      </div>

      {scanProgress && (
        <div className="scan-progress">
          Scanning: {scanProgress.currentFile} 
          ({scanProgress.totalFound} photos found)
        </div>
      )}

      <div className="directories">
        <h3>Photo Directories:</h3>
        {photoDirectories.map(dir => (
          <div key={dir} className="directory-item">
            <span>{dir}</span>
            <button onClick={() => removePhotoDirectory(dir)}>
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="photo-grid">
        {photos.map(photo => (
          <div key={photo.path} className="photo-item">
            {thumbnailUrls[photo.path] ? (
              <img 
                src={thumbnailUrls[photo.path]} 
                alt={photo.name}
                loading="lazy"
              />
            ) : (
              <div className="photo-placeholder">Loading...</div>
            )}
            <div className="photo-info">
              <div className="photo-name">{photo.name}</div>
              <div className="photo-size">
                {fileSystemService.formatFileSize(photo.size)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}