/**
 * OfflineModeHandler - Manages local-first functionality with optional AI enhancement
 * Provides seamless transition between local-only and AI-enhanced modes
 */

import { fileSystemService, type FileMetadata } from './fileSystemService';
import type { Photo } from '../types/photo';

export interface OfflineCapabilities {
  canScanDirectories: boolean;
  canDisplayPhotos: boolean;
  canGenerateThumbnails: boolean;
  canAccessMetadata: boolean;
  hasFileSystemAccess: boolean;
}

export interface OfflineMode {
  isOffline: boolean; // Legacy name - actually means "local-only mode"
  capabilities: OfflineCapabilities;
  lastBackendCheck: Date | null;
  backendAvailable: boolean;
}

class OfflineModeHandler {
  private isOfflineMode: boolean = false;
  private backendAvailable: boolean = false;
  private lastBackendCheck: Date | null = null;
  private backendCheckInterval: number | null = null;
  private listeners: Array<(mode: OfflineMode) => void> = [];

  constructor() {
    this.detectInitialMode();
    this.startBackendMonitoring();
  }

  /**
   * Get current offline mode status
   */
  getOfflineMode(): OfflineMode {
    return {
      isOffline: this.isOfflineMode,
      capabilities: this.getCapabilities(),
      lastBackendCheck: this.lastBackendCheck,
      backendAvailable: this.backendAvailable
    };
  }

  /**
   * Get offline capabilities based on current environment
   */
  getCapabilities(): OfflineCapabilities {
    const hasFileSystemAccess = fileSystemService.isAvailable();

    return {
      canScanDirectories: hasFileSystemAccess,
      canDisplayPhotos: hasFileSystemAccess,
      canGenerateThumbnails: hasFileSystemAccess,
      canAccessMetadata: hasFileSystemAccess,
      hasFileSystemAccess
    };
  }

  /**
   * Check if running in offline-capable environment (Electron)
   */
  isOfflineCapable(): boolean {
    return fileSystemService.isAvailable();
  }

  /**
   * Force local-only mode (disable backend usage)
   * Note: This is primarily for development/testing - production should use AI enhancement
   */
  setOfflineMode(offline: boolean): void {
    const wasOffline = this.isOfflineMode;
    this.isOfflineMode = offline;

    if (wasOffline !== offline) {
      this.notifyListeners();
    }
  }

  /**
   * Check if backend is available
   */
  async checkBackendAvailability(): Promise<boolean> {
    try {
      // Try to reach the backend API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch('/api/health', {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const available = response.ok;
      this.backendAvailable = available;
      this.lastBackendCheck = new Date();

      // In local-first mode, backend availability doesn't change our mode
      // Backend is just for enhanced features like AI search
      this.notifyListeners();

      return available;
    } catch (error) {
      console.log('Backend not available - running in local-first mode with offline AI capabilities');
      this.backendAvailable = false;
      this.lastBackendCheck = new Date();

      // In local-first mode, this is expected during startup - backend may still be starting
      this.notifyListeners();

      return false;
    }
  }

  /**
   * Convert FileMetadata to Photo format for compatibility
   */
  convertFileMetadataToPhoto(metadata: FileMetadata): Photo {
    return {
      id: metadata.path, // Use file path as ID in offline mode
      filename: metadata.name,
      path: metadata.path,
      size: metadata.size,
      dateModified: metadata.dateModified.toISOString(),
      dateCreated: metadata.dateCreated.toISOString(),
      width: metadata.dimensions?.width || 0,
      height: metadata.dimensions?.height || 0,
      isImage: metadata.isImage,
      isVideo: metadata.isVideo,
      exifData: metadata.exifData || {},
      thumbnailUrl: '', // Will be populated by thumbnail service
      fileUrl: metadata.path, // Direct file path for offline access
      tags: [],
      collections: [],
      favorite: false,
      rating: 0,
      metadata: {
        path: metadata.path,
        filename: metadata.name,
        size: metadata.size,
        mimeType: 'image/jpeg', // Default, should be determined from file
        createdAt: metadata.dateCreated,
        modifiedAt: metadata.dateModified,
        exif: {
          camera: metadata.exifData?.camera,
          lens: metadata.exifData?.lens,
          iso: metadata.exifData?.iso,
          aperture: metadata.exifData?.aperture,
          shutterSpeed: metadata.exifData?.shutterSpeed,
          focalLength: metadata.exifData?.focalLength,
          flash: metadata.exifData?.flash,
          whiteBalance: metadata.exifData?.whiteBalance,
          orientation: metadata.exifData?.orientation,
        },
        ai: {
          embeddings: [],
          faces: [],
          text: '',
          captions: [],
          tags: [],
          confidence: 0,
        },
        user: {
          favorite: false,
          tags: [],
          collections: [],
          rating: 0,
        }
      }
    };
  }

  /**
   * Scan directories for photos in offline mode
   */
  async scanDirectoriesOffline(): Promise<Photo[]> {
    console.log('🔍 Starting scanDirectoriesOffline...');
    
    if (!this.isOfflineCapable()) {
      throw new Error('Offline directory scanning not available - not running in Electron');
    }

    try {
      console.log('📁 Getting photo directories...');
      const directories = await fileSystemService.getPhotoDirectories();
      console.log('📁 Found directories:', directories);
      
      const allPhotos: Photo[] = [];

      for (const directory of directories) {
        try {
          console.log(`🔍 Scanning directory: ${directory}`);
          const contents = await fileSystemService.scanDirectory(directory, {
            recursive: true,
            includeImages: true,
            includeVideos: true
          });

          console.log(`📁 Directory ${directory} contains ${contents.files.length} files`);
          
          const photos = contents.files
            .filter(file => file.isImage || file.isVideo)
            .map(file => this.convertFileMetadataToPhoto(file));

          console.log(`📸 Found ${photos.length} photos/videos in ${directory}`);
          allPhotos.push(...photos);
        } catch (error) {
          console.error(`❌ Failed to scan directory ${directory}:`, error);
        }
      }

      console.log(`📸 Total photos found: ${allPhotos.length}`);
      return allPhotos;
    } catch (error) {
      console.error('❌ Failed to scan directories in offline mode:', error);
      throw error;
    }
  }

  /**
   * Get photo with thumbnail in offline mode
   */
  async getPhotoWithThumbnail(photo: Photo, size: number = 300): Promise<Photo> {
    if (!this.isOfflineCapable()) {
      return photo;
    }

    try {
      const thumbnailUrl = await fileSystemService.getThumbnailUrl(photo.path, size);
      const secureFileUrl = await fileSystemService.getSecureFileUrl(photo.path);

      return {
        ...photo,
        thumbnailUrl,
        fileUrl: secureFileUrl
      };
    } catch (error) {
      console.error('Failed to get photo with thumbnail:', error);
      return photo;
    }
  }

  /**
   * Preload thumbnails for photos in offline mode
   */
  async preloadThumbnailsOffline(photos: Photo[], sizes: number[] = [150, 300]): Promise<void> {
    if (!this.isOfflineCapable()) {
      return;
    }

    try {
      const filePaths = photos.map(photo => photo.path);
      await fileSystemService.preloadThumbnails(filePaths, sizes);
    } catch (error) {
      console.error('Failed to preload thumbnails in offline mode:', error);
    }
  }

  /**
   * Add listener for offline mode changes
   */
  addListener(listener: (mode: OfflineMode) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove listener for offline mode changes
   */
  removeListener(listener: (mode: OfflineMode) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Detect initial mode based on environment and backend availability
   */
  private async detectInitialMode(): Promise<void> {
    // Always start in local-first mode when in Electron
    if (this.isOfflineCapable()) {
      this.isOfflineMode = false; // Local-first with backend enhancement
      this.notifyListeners();

      // Check if backend is available for AI features
      await this.checkBackendAvailability();
      return;
    }

    // If not in Electron (browser), we need the backend
    this.isOfflineMode = false;
    await this.checkBackendAvailability();
  }

  /**
   * Start monitoring backend availability
   */
  private startBackendMonitoring(): void {
    // Check backend availability every 30 seconds
    this.backendCheckInterval = window.setInterval(() => {
      this.checkBackendAvailability();
    }, 30000);
  }

  /**
   * Stop monitoring backend availability
   */
  stopBackendMonitoring(): void {
    if (this.backendCheckInterval) {
      clearInterval(this.backendCheckInterval);
      this.backendCheckInterval = null;
    }
  }

  /**
   * Notify all listeners about mode changes
   */
  private notifyListeners(): void {
    const mode = this.getOfflineMode();
    this.listeners.forEach(listener => {
      try {
        listener(mode);
      } catch (error) {
        console.error('Error in offline mode listener:', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopBackendMonitoring();
    this.listeners = [];
  }
}

// Export singleton instance
export const offlineModeHandler = new OfflineModeHandler();
export default offlineModeHandler;