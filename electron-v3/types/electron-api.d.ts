/**
 * TypeScript definitions for enhanced Electron APIs
 * These types correspond to the APIs exposed in preload.js
 */

export interface PhotoFile {
  path: string;
  name: string;
  size: number;
  mtime: Date;
  ctime: Date;
  atime: Date;
  birthtime: Date;
  extension: string;
  type: 'image' | 'video' | 'other';
  isDirectory: boolean;
  isFile: boolean;
  mimeType: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

export interface ScanProgress {
  currentFile: string;
  totalFound: number;
  directory: string;
}

export interface ScanResult {
  files: PhotoFile[];
  errors: Array<{
    path: string;
    error: string;
  }>;
  totalFiles: number;
  scannedPath: string;
}

export interface ScanOptions {
  recursive?: boolean;
  maxDepth?: number;
  includeHidden?: boolean;
  fileTypes?: Array<'image' | 'video'>;
}

export interface DirectoryContentsOptions {
  includeHidden?: boolean;
  sortBy?: 'name' | 'size' | 'mtime';
}

export interface PathValidation {
  valid: boolean;
  error?: string;
  normalizedPath?: string;
}

export interface ThumbnailCacheInfo {
  cacheDir: string;
  totalSize: number;
  maxSize: number;
  entryCount: number;
  supportedSizes: number[];
  queueLength: number;
  activeJobs: number;
}

export interface ThumbnailPreloadResult {
  queued: number;
  totalQueue: number;
}

export interface ThumbnailGeneratedEvent {
  filePath: string;
  size: number;
  thumbnailPath: string;
}

export interface ThumbnailErrorEvent {
  filePath: string;
  size: number;
  error: string;
}

export interface BackendStatus {
  running: boolean;
  port: number;
}

export interface AppInfo {
  version: string;
  name: string;
  platform: string;
  arch: string;
  electronVersion: string;
  nodeVersion: string;
}

export interface ThumbnailSizes {
  SMALL: 150;
  MEDIUM: 300;
  LARGE: 600;
}

// Main Electron API interface
export interface ElectronAPI {
  // Settings management
  getSetting<T = any>(key: string): Promise<T>;
  setSetting<T = any>(key: string, value: T): Promise<boolean>;
  getAllSettings(): Promise<Record<string, any>>;
  resetSettings(): Promise<boolean>;

  // Directory Management
  selectPhotoDirectories(): Promise<string[] | null>;
  getPhotoDirectories(): Promise<string[]>;
  addPhotoDirectory(path: string): Promise<boolean>;
  removePhotoDirectory(path: string): Promise<boolean>;
  validateDirectoryAccess(path: string): Promise<PathValidation>;

  // File System Operations
  scanDirectory(path: string, options?: ScanOptions): Promise<ScanResult>;
  getFileMetadata(filePath: string): Promise<PhotoFile>;
  validateFilePath(filePath: string): Promise<PathValidation>;
  getDirectoryContents(dirPath: string, options?: DirectoryContentsOptions): Promise<PhotoFile[]>;
  watchDirectory(dirPath: string): Promise<boolean>;
  unwatchDirectory(dirPath: string): Promise<boolean>;

  // Thumbnail Operations
  getThumbnailPath(filePath: string, size?: number): Promise<string>;
  generateThumbnail(filePath: string, size?: number): Promise<string>;
  getThumbnailUrl(filePath: string, size?: number): Promise<string>;
  clearThumbnailCache(): Promise<boolean>;
  getThumbnailCacheInfo(): Promise<ThumbnailCacheInfo>;
  preloadThumbnails(filePaths: string[], sizes?: number[]): Promise<ThumbnailPreloadResult>;

  // File URL Generation
  getFileUrl(filePath: string): Promise<string>;
  getSecureFileUrl(filePath: string): Promise<string>;

  // Legacy operations (for backward compatibility)
  selectDirectory(): Promise<string[] | null>;
  showItemInFolder(fullPath: string): Promise<void>;

  // Backend control
  startBackend(): Promise<void>;
  stopBackend(): Promise<void>;
  getBackendStatus(): Promise<BackendStatus>;

  // App information
  getAppVersion(): Promise<string>;
  getAppInfo(): Promise<AppInfo>;

  // Event listeners
  onPhotoDirectoriesUpdated(callback: (directories: string[]) => void): void;
  onBackendStatusChanged(callback: (status: BackendStatus) => void): void;
  onStartIndexing(callback: (directories: string[]) => void): void;
  onShowSettings(callback: () => void): void;
  onScanProgress(callback: (progress: ScanProgress) => void): void;
  onThumbnailGenerated(callback: (data: ThumbnailGeneratedEvent) => void): void;
  onDirectoryChanged(callback: (path: string) => void): void;
  onFileSystemError(callback: (error: ThumbnailErrorEvent) => void): void;

  // Remove event listeners
  removeAllListeners(channel: string): void;
}

// File System API interface
export interface FileSystemAPI {
  exists(filePath: string): boolean;
  isDirectory(filePath: string): boolean;
  isFile(filePath: string): boolean;
  getStats(filePath: string): {
    size: number;
    mtime: Date;
    ctime: Date;
    atime: Date;
    birthtime: Date;
    isDirectory: boolean;
    isFile: boolean;
    isSymbolicLink: boolean;
    mode: number;
    uid: number;
    gid: number;
  } | null;
  getFileExtension(filePath: string): string;
  getFileName(filePath: string): string;
  getFileNameWithoutExtension(filePath: string): string;
  isImageFile(filePath: string): boolean;
  isVideoFile(filePath: string): boolean;
  isMediaFile(filePath: string): boolean;
  readDirectory(dirPath: string): string[];
  formatFileSize(bytes: number): string;
}

// Path API interface
export interface PathAPI {
  join(...args: string[]): string;
  dirname(p: string): string;
  basename(p: string, ext?: string): string;
  extname(p: string): string;
  resolve(...args: string[]): string;
  isAbsolute(p: string): boolean;
  sep: string;
  delimiter: string;
}

// Media API interface
export interface MediaAPI {
  getSupportedImageExtensions(): string[];
  getSupportedVideoExtensions(): string[];
  isImageFile(filePath: string): boolean;
  isVideoFile(filePath: string): boolean;
  isMediaFile(filePath: string): boolean;
  getThumbnailSizes(): ThumbnailSizes;
  getMimeType(filePath: string): string;
}

// Security API interface
export interface SecurityAPI {
  isPathSafe(filePath: string): boolean;
  generatePathHash(filePath: string): string;
}

// Platform API interface
export interface PlatformAPI {
  os: string;
  arch: string;
  version: string;
  versions: NodeJS.ProcessVersions;
  isWindows(): boolean;
  isMacOS(): boolean;
  isLinux(): boolean;
  pathSeparator: string;
  pathDelimiter: string;
}

// Development API interface (only available in development)
export interface DevAPI {
  openDevTools(): Promise<void>;
  reload(): Promise<void>;
}

// Global window interface extensions
declare global {
  interface Window {
    electronAPI: ElectronAPI;
    fsAPI: FileSystemAPI;
    pathAPI: PathAPI;
    mediaAPI: MediaAPI;
    securityAPI: SecurityAPI;
    platform: PlatformAPI;
    dev?: DevAPI;
  }
}

export {};