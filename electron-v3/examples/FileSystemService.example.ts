/**
 * Example FileSystemService for React V3 frontend
 * This demonstrates how to use the enhanced Electron APIs
 */

import type { PhotoFile, ScanOptions, ThumbnailCacheInfo } from '../types/electron-api';

export class FileSystemService {
  private static instance: FileSystemService;

  public static getInstance(): FileSystemService {
    if (!FileSystemService.instance) {
      FileSystemService.instance = new FileSystemService();
    }
    return FileSystemService.instance;
  }

  /**
   * Check if we're running in Electron environment
   */
  public isElectronEnvironment(): boolean {
    return typeof window !== 'undefined' && window.electronAPI !== undefined;
  }

  /**
   * Get all configured photo directories
   */
  public async getPhotoDirectories(): Promise<string[]> {
    if (!this.isElectronEnvironment()) {
      throw new Error('Not running in Electron environment');
    }
    return await window.electronAPI.getPhotoDirectories();
  }

  /**
   * Add a new photo directory
   */
  public async addPhotoDirectory(): Promise<string[] | null> {
    if (!this.isElectronEnvironment()) {
      throw new Error('Not running in Electron environment');
    }
    return await window.electronAPI.selectPhotoDirectories();
  }

  /**
   * Remove a photo directory
   */
  public async removePhotoDirectory(path: string): Promise<boolean> {
    if (!this.isElectronEnvironment()) {
      throw new Error('Not running in Electron environment');
    }
    return await window.electronAPI.removePhotoDirectory(path);
  }

  /**
   * Scan a directory for photos and videos
   */
  public async scanDirectory(
    path: string, 
    options: ScanOptions = {}
  ): Promise<PhotoFile[]> {
    if (!this.isElectronEnvironment()) {
      throw new Error('Not running in Electron environment');
    }

    const defaultOptions: ScanOptions = {
      recursive: true,
      maxDepth: 10,
      includeHidden: false,
      fileTypes: ['image', 'video']
    };

    const scanOptions = { ...defaultOptions, ...options };
    const result = await window.electronAPI.scanDirectory(path, scanOptions);
    return result.files;
  }

  /**
   * Get metadata for a specific file
   */
  public async getFileMetadata(filePath: string): Promise<PhotoFile> {
    if (!this.isElectronEnvironment()) {
      throw new Error('Not running in Electron environment');
    }
    return await window.electronAPI.getFileMetadata(filePath);
  }

  /**
   * Get secure file URL for displaying in the UI
   */
  public async getFileUrl(filePath: string): Promise<string> {
    if (!this.isElectronEnvironment()) {
      throw new Error('Not running in Electron environment');
    }
    return await window.electronAPI.getSecureFileUrl(filePath);
  }

  /**
   * Get thumbnail URL for a file
   */
  public async getThumbnailUrl(filePath: string, size: number = 300): Promise<string> {
    if (!this.isElectronEnvironment()) {
      throw new Error('Not running in Electron environment');
    }
    return await window.electronAPI.getThumbnailUrl(filePath, size);
  }

  /**
   * Preload thumbnails for multiple files
   */
  public async preloadThumbnails(
    filePaths: string[], 
    sizes: number[] = [150, 300]
  ): Promise<{ queued: number; totalQueue: number }> {
    if (!this.isElectronEnvironment()) {
      throw new Error('Not running in Electron environment');
    }
    return await window.electronAPI.preloadThumbnails(filePaths, sizes);
  }

  /**
   * Get thumbnail cache information
   */
  public async getThumbnailCacheInfo(): Promise<ThumbnailCacheInfo> {
    if (!this.isElectronEnvironment()) {
      throw new Error('Not running in Electron environment');
    }
    return await window.electronAPI.getThumbnailCacheInfo();
  }

  /**
   * Clear thumbnail cache
   */
  public async clearThumbnailCache(): Promise<boolean> {
    if (!this.isElectronEnvironment()) {
      throw new Error('Not running in Electron environment');
    }
    return await window.electronAPI.clearThumbnailCache();
  }

  /**
   * Check if a file is an image
   */
  public isImageFile(filePath: string): boolean {
    if (!this.isElectronEnvironment()) {
      return false;
    }
    return window.mediaAPI.isImageFile(filePath);
  }

  /**
   * Check if a file is a video
   */
  public isVideoFile(filePath: string): boolean {
    if (!this.isElectronEnvironment()) {
      return false;
    }
    return window.mediaAPI.isVideoFile(filePath);
  }

  /**
   * Get supported thumbnail sizes
   */
  public getThumbnailSizes() {
    if (!this.isElectronEnvironment()) {
      return { SMALL: 150, MEDIUM: 300, LARGE: 600 };
    }
    return window.mediaAPI.getThumbnailSizes();
  }

  /**
   * Format file size for display
   */
  public formatFileSize(bytes: number): string {
    if (!this.isElectronEnvironment()) {
      // Fallback implementation
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    return window.fsAPI.formatFileSize(bytes);
  }

  /**
   * Setup event listeners for file system events
   */
  public setupEventListeners(callbacks: {
    onScanProgress?: (progress: { currentFile: string; totalFound: number; directory: string }) => void;
    onThumbnailGenerated?: (data: { filePath: string; size: number; thumbnailPath: string }) => void;
    onDirectoriesUpdated?: (directories: string[]) => void;
    onFileSystemError?: (error: { filePath: string; size: number; error: string }) => void;
  }): void {
    if (!this.isElectronEnvironment()) {
      return;
    }

    if (callbacks.onScanProgress) {
      window.electronAPI.onScanProgress(callbacks.onScanProgress);
    }

    if (callbacks.onThumbnailGenerated) {
      window.electronAPI.onThumbnailGenerated(callbacks.onThumbnailGenerated);
    }

    if (callbacks.onDirectoriesUpdated) {
      window.electronAPI.onPhotoDirectoriesUpdated(callbacks.onDirectoriesUpdated);
    }

    if (callbacks.onFileSystemError) {
      window.electronAPI.onFileSystemError(callbacks.onFileSystemError);
    }
  }

  /**
   * Remove all event listeners
   */
  public removeEventListeners(): void {
    if (!this.isElectronEnvironment()) {
      return;
    }

    window.electronAPI.removeAllListeners('scan-progress');
    window.electronAPI.removeAllListeners('thumbnail-generated');
    window.electronAPI.removeAllListeners('photo-directories-updated');
    window.electronAPI.removeAllListeners('file-system-error');
  }
}

// Export singleton instance
export const fileSystemService = FileSystemService.getInstance();