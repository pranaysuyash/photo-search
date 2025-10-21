/**
 * FileSystemService - Electron integration for direct file system access
 * Provides photo directory management and file operations without backend dependency
 */

export interface FileMetadata {
  path: string;
  name: string;
  size: number;
  dateModified: Date;
  dateCreated: Date;
  isDirectory: boolean;
  isImage: boolean;
  isVideo: boolean;
  dimensions?: {
    width: number;
    height: number;
  };
  exifData?: Record<string, any>;
}

export interface ScanOptions {
  recursive?: boolean;
  includeImages?: boolean;
  includeVideos?: boolean;
  maxDepth?: number;
  extensions?: string[];
}

export interface DirectoryContents {
  files: FileMetadata[];
  totalCount: number;
  scannedPath: string;
  hasMore: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  isAllowed: boolean;
  error?: string;
  normalizedPath?: string;
}

class FileSystemService {
  private isElectron: boolean;
  private electronAPI: any;

  constructor() {
    this.isElectron = typeof window !== 'undefined' && !!window.electronAPI;
    this.electronAPI = this.isElectron ? window.electronAPI : null;
  }

  /**
   * Check if running in Electron environment with file system access
   */
  isAvailable(): boolean {
    return this.isElectron && this.electronAPI;
  }

  /**
   * Select photo directories using native dialog
   */
  async selectPhotoDirectories(): Promise<string[] | null> {
    if (!this.isAvailable()) {
      throw new Error('File system service not available - not running in Electron');
    }

    try {
      return await this.electronAPI.selectPhotoDirectories();
    } catch (error) {
      console.error('Failed to select photo directories:', error);
      throw error;
    }
  }

  /**
   * Get currently configured photo directories
   */
  async getPhotoDirectories(): Promise<string[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      return await this.electronAPI.getPhotoDirectories();
    } catch (error) {
      console.error('Failed to get photo directories:', error);
      return [];
    }
  }

  /**
   * Add a photo directory to the allowed list
   */
  async addPhotoDirectory(dirPath: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      return await this.electronAPI.addPhotoDirectory(dirPath);
    } catch (error) {
      console.error('Failed to add photo directory:', error);
      return false;
    }
  }

  /**
   * Remove a photo directory from the allowed list
   */
  async removePhotoDirectory(dirPath: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      return await this.electronAPI.removePhotoDirectory(dirPath);
    } catch (error) {
      console.error('Failed to remove photo directory:', error);
      return false;
    }
  }

  /**
   * Validate directory access permissions
   */
  async validateDirectoryAccess(dirPath: string): Promise<ValidationResult> {
    if (!this.isAvailable()) {
      return {
        isValid: false,
        isAllowed: false,
        error: 'File system service not available'
      };
    }

    try {
      return await this.electronAPI.validateDirectoryAccess(dirPath);
    } catch (error) {
      console.error('Failed to validate directory access:', error);
      return {
        isValid: false,
        isAllowed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Scan directory for photos and videos
   */
  async scanDirectory(dirPath: string, options: ScanOptions = {}): Promise<DirectoryContents> {
    if (!this.isAvailable()) {
      throw new Error('File system service not available - not running in Electron');
    }

    const defaultOptions: ScanOptions = {
      recursive: true,
      includeImages: true,
      includeVideos: true,
      maxDepth: 10,
      ...options
    };

    try {
      return await this.electronAPI.scanDirectory(dirPath, defaultOptions);
    } catch (error) {
      console.error('Failed to scan directory:', error);
      throw error;
    }
  }

  /**
   * Get file metadata for a specific file
   */
  async getFileMetadata(filePath: string): Promise<FileMetadata> {
    if (!this.isAvailable()) {
      throw new Error('File system service not available - not running in Electron');
    }

    try {
      return await this.electronAPI.getFileMetadata(filePath);
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      throw error;
    }
  }

  /**
   * Validate file path access
   */
  async validateFilePath(filePath: string): Promise<ValidationResult> {
    if (!this.isAvailable()) {
      return {
        isValid: false,
        isAllowed: false,
        error: 'File system service not available'
      };
    }

    try {
      return await this.electronAPI.validateFilePath(filePath);
    } catch (error) {
      console.error('Failed to validate file path:', error);
      return {
        isValid: false,
        isAllowed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get directory contents with pagination
   */
  async getDirectoryContents(dirPath: string, options: ScanOptions = {}): Promise<DirectoryContents> {
    if (!this.isAvailable()) {
      throw new Error('File system service not available - not running in Electron');
    }

    try {
      return await this.electronAPI.getDirectoryContents(dirPath, options);
    } catch (error) {
      console.error('Failed to get directory contents:', error);
      throw error;
    }
  }

  /**
   * Generate secure file URL for direct access
   */
  async getSecureFileUrl(filePath: string): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('File system service not available - not running in Electron');
    }

    try {
      return await this.electronAPI.getSecureFileUrl(filePath);
    } catch (error) {
      console.error('Failed to generate secure file URL:', error);
      throw error;
    }
  }

  /**
   * Get thumbnail URL for a file
   */
  async getThumbnailUrl(filePath: string, size: number = 300): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('File system service not available - not running in Electron');
    }

    try {
      return await this.electronAPI.getThumbnailUrl(filePath, size);
    } catch (error) {
      console.error('Failed to get thumbnail URL:', error);
      throw error;
    }
  }

  /**
   * Generate thumbnail for a file
   */
  async generateThumbnail(filePath: string, size: number = 300): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('File system service not available - not running in Electron');
    }

    try {
      return await this.electronAPI.generateThumbnail(filePath, size);
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      throw error;
    }
  }

  /**
   * Preload thumbnails for multiple files
   */
  async preloadThumbnails(filePaths: string[], sizes: number[] = [150, 300]): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      await this.electronAPI.preloadThumbnails(filePaths, sizes);
    } catch (error) {
      console.error('Failed to preload thumbnails:', error);
    }
  }

  /**
   * Clear thumbnail cache
   */
  async clearThumbnailCache(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      return await this.electronAPI.clearThumbnailCache();
    } catch (error) {
      console.error('Failed to clear thumbnail cache:', error);
      return false;
    }
  }

  /**
   * Get thumbnail cache information
   */
  async getThumbnailCacheInfo(): Promise<{ size: number; count: number; maxSize: number }> {
    if (!this.isAvailable()) {
      return { size: 0, count: 0, maxSize: 0 };
    }

    try {
      return await this.electronAPI.getThumbnailCacheInfo();
    } catch (error) {
      console.error('Failed to get thumbnail cache info:', error);
      return { size: 0, count: 0, maxSize: 0 };
    }
  }
}

// Export singleton instance
export const fileSystemService = new FileSystemService();
export default fileSystemService;