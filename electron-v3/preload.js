const { contextBridge, ipcRenderer } = require('electron');

// Provide fallback implementations for Node.js modules
// Note: These are not used in the renderer process as all file operations
// are handled through IPC calls to the main process
const path = {
  join: (...args) => args.join('/'),
  dirname: (p) => p.split('/').slice(0, -1).join('/'),
  basename: (p, ext) => {
    const name = p.split('/').pop() || '';
    return ext ? name.replace(ext, '') : name;
  },
  extname: (p) => {
    const parts = p.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
  },
  resolve: (...args) => args.join('/'),
  isAbsolute: (p) => p.startsWith('/'),
  sep: '/',
  delimiter: ':'
};

const fs = {
  existsSync: () => false,
  statSync: () => ({ isDirectory: () => false, isFile: () => false }),
  readdirSync: () => []
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Settings management
    getSetting: (key) => ipcRenderer.invoke('get-setting', key),
    setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
    getAllSettings: () => ipcRenderer.invoke('get-all-settings'),
    resetSettings: () => ipcRenderer.invoke('reset-settings'),
    
    // Preferences management
    getPreference: (key, defaultValue) => ipcRenderer.invoke('get-preference', key, defaultValue),
    setPreference: (key, value) => ipcRenderer.invoke('set-preference', key, value),
    getAllPreferences: () => ipcRenderer.invoke('get-all-preferences'),
    
    // Settings backup and restore
    exportSettings: () => ipcRenderer.invoke('export-settings'),
    importSettings: (jsonData) => ipcRenderer.invoke('import-settings', jsonData),
    getBackupList: () => ipcRenderer.invoke('get-backup-list'),
    restoreFromBackup: (backupId) => ipcRenderer.invoke('restore-from-backup', backupId),
    settingsHealthCheck: () => ipcRenderer.invoke('settings-health-check'),

    // State management
    saveApplicationState: (state) => ipcRenderer.invoke('save-application-state', state),
    restoreApplicationState: () => ipcRenderer.invoke('restore-application-state'),
    getRecentActivity: () => ipcRenderer.invoke('get-recent-activity'),
    addRecentDirectory: (dirPath) => ipcRenderer.invoke('add-recent-directory', dirPath),
    addRecentSearch: (query) => ipcRenderer.invoke('add-recent-search', query),
    addRecentFile: (filePath, metadata) => ipcRenderer.invoke('add-recent-file', filePath, metadata),
    addBookmark: (path, name) => ipcRenderer.invoke('add-bookmark', path, name),
    removeBookmark: (path) => ipcRenderer.invoke('remove-bookmark', path),
    getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
    exportState: () => ipcRenderer.invoke('export-state'),
    importState: (stateData) => ipcRenderer.invoke('import-state', stateData),

    // Error handling and recovery
    detectCorruption: () => ipcRenderer.invoke('detect-corruption'),
    createEmergencyBackup: () => ipcRenderer.invoke('create-emergency-backup'),
    performHealthCheck: () => ipcRenderer.invoke('perform-health-check'),
    getErrorLog: () => ipcRenderer.invoke('get-error-log'),
    clearErrorLog: () => ipcRenderer.invoke('clear-error-log'),
    getRecoveryStats: () => ipcRenderer.invoke('get-recovery-stats'),

    // Directory Management
    selectPhotoDirectories: () => ipcRenderer.invoke('select-photo-directories'),
    getPhotoDirectories: () => ipcRenderer.invoke('get-photo-directories'),
    addPhotoDirectory: (path) => ipcRenderer.invoke('add-photo-directory', path),
    removePhotoDirectory: (path) => ipcRenderer.invoke('remove-photo-directory', path),
    validateDirectoryAccess: (path) => ipcRenderer.invoke('validate-directory-access', path),

    // File System Operations
    scanDirectory: (path, options) => ipcRenderer.invoke('scan-directory', path, options),
    getFileMetadata: (filePath) => ipcRenderer.invoke('get-file-metadata', filePath),
    validateFilePath: (filePath) => ipcRenderer.invoke('validate-file-path', filePath),
    getDirectoryContents: (dirPath, options) => ipcRenderer.invoke('get-directory-contents', dirPath, options),
    watchDirectory: (dirPath) => ipcRenderer.invoke('watch-directory', dirPath),
    unwatchDirectory: (dirPath) => ipcRenderer.invoke('unwatch-directory', dirPath),

    // Thumbnail Operations
    getThumbnailPath: (filePath, size) => ipcRenderer.invoke('get-thumbnail-path', filePath, size),
    generateThumbnail: (filePath, size) => ipcRenderer.invoke('generate-thumbnail', filePath, size),
    getThumbnailUrl: (filePath, size) => ipcRenderer.invoke('get-thumbnail-url', filePath, size),
    clearThumbnailCache: () => ipcRenderer.invoke('clear-thumbnail-cache'),
    getThumbnailCacheInfo: () => ipcRenderer.invoke('get-thumbnail-cache-info'),
    preloadThumbnails: (filePaths, sizes) => ipcRenderer.invoke('preload-thumbnails', filePaths, sizes),

    // Enhanced Thumbnail Processing Controls
    pauseThumbnailProcessing: () => ipcRenderer.invoke('pause-thumbnail-processing'),
    resumeThumbnailProcessing: () => ipcRenderer.invoke('resume-thumbnail-processing'),
    setThumbnailConcurrency: (concurrency) => ipcRenderer.invoke('set-thumbnail-concurrency', concurrency),
    getThumbnailProcessingStats: () => ipcRenderer.invoke('get-thumbnail-processing-stats'),
    getThumbnailWorkerStats: () => ipcRenderer.invoke('get-thumbnail-worker-stats'),
    getThumbnailCacheHealth: () => ipcRenderer.invoke('get-thumbnail-cache-health'),
    optimizeThumbnailQueue: () => ipcRenderer.invoke('optimize-thumbnail-queue'),
    validateThumbnailCache: () => ipcRenderer.invoke('validate-thumbnail-cache'),
    batchProcessThumbnails: (filePaths, options) => ipcRenderer.invoke('batch-process-thumbnails', filePaths, options),
    cancelThumbnailJobs: () => ipcRenderer.invoke('cancel-thumbnail-jobs'),
    startResourceMonitoring: (intervalMs) => ipcRenderer.invoke('start-resource-monitoring', intervalMs),
    stopResourceMonitoring: () => ipcRenderer.invoke('stop-resource-monitoring'),

    // File URL Generation
    getFileUrl: (filePath) => ipcRenderer.invoke('get-file-url', filePath),
    getSecureFileUrl: (filePath) => ipcRenderer.invoke('get-secure-file-url', filePath),

    // Legacy operations (for backward compatibility)
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    showItemInFolder: (fullPath) => ipcRenderer.invoke('show-item-in-folder', fullPath),

    // Backend control
    startBackend: () => ipcRenderer.invoke('start-backend'),
    stopBackend: () => ipcRenderer.invoke('stop-backend'),
    getBackendStatus: () => ipcRenderer.invoke('backend-status'),

    // API configuration
    getApiConfig: () => ipcRenderer.invoke('get-api-config'),
    getApiToken: () => ipcRenderer.invoke('get-api-token'),
    setApiConfig: (config) => ipcRenderer.invoke('set-api-config', config),

    // App information
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getAppInfo: () => ipcRenderer.invoke('get-app-info'),

    // Event listeners
    onPhotoDirectoriesUpdated: (callback) => {
        ipcRenderer.on('photo-directories-updated', callback);
    },
    onBackendStatusChanged: (callback) => {
        ipcRenderer.on('backend-status-changed', callback);
    },
    onStartIndexing: (callback) => {
        ipcRenderer.on('start-indexing', callback);
    },
    onShowSettings: (callback) => {
        ipcRenderer.on('show-settings', callback);
    },
    onScanProgress: (callback) => {
        ipcRenderer.on('scan-progress', callback);
    },
    onThumbnailGenerated: (callback) => {
        ipcRenderer.on('thumbnail-generated', callback);
    },
    onDirectoryChanged: (callback) => {
        ipcRenderer.on('directory-changed', callback);
    },
    onFileSystemError: (callback) => {
        ipcRenderer.on('file-system-error', callback);
    },

    // Enhanced Thumbnail Event Listeners
    onThumbnailCacheCleaned: (callback) => {
        ipcRenderer.on('thumbnail-cache-cleaned', callback);
    },
    onThumbnailQueueStarted: (callback) => {
        ipcRenderer.on('thumbnail-queue-started', callback);
    },
    onThumbnailQueueProgress: (callback) => {
        ipcRenderer.on('thumbnail-queue-progress', callback);
    },
    onThumbnailQueueCompleted: (callback) => {
        ipcRenderer.on('thumbnail-queue-completed', callback);
    },
    onThumbnailProcessingPaused: (callback) => {
        ipcRenderer.on('thumbnail-processing-paused', callback);
    },
    onThumbnailProcessingResumed: (callback) => {
        ipcRenderer.on('thumbnail-processing-resumed', callback);
    },
    onThumbnailResourceMonitor: (callback) => {
        ipcRenderer.on('thumbnail-resource-monitor', callback);
    },
    onThumbnailBatchProgress: (callback) => {
        ipcRenderer.on('thumbnail-batch-progress', callback);
    },

    // State restoration event
    onStateRestored: (callback) => {
        ipcRenderer.on('state-restored', callback);
    },

    // Health check warning event
    onHealthCheckWarning: (callback) => {
        ipcRenderer.on('health-check-warning', callback);
    },

    // Remove event listeners
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});

// Expose path utilities for the renderer
contextBridge.exposeInMainWorld('pathAPI', {
    join: (...args) => path.join(...args),
    dirname: (p) => path.dirname(p),
    basename: (p, ext) => path.basename(p, ext),
    extname: (p) => path.extname(p),
    resolve: (...args) => path.resolve(...args),
    isAbsolute: (p) => path.isAbsolute(p),
    sep: path.sep,
    delimiter: path.delimiter
});

// Expose safe file system operations
contextBridge.exposeInMainWorld('fsAPI', {
    // Read-only operations for security
    exists: (filePath) => {
        try {
            return fs.existsSync(filePath);
        } catch {
            return false;
        }
    },

    isDirectory: (filePath) => {
        try {
            return fs.statSync(filePath).isDirectory();
        } catch {
            return false;
        }
    },

    isFile: (filePath) => {
        try {
            return fs.statSync(filePath).isFile();
        } catch {
            return false;
        }
    },

    getStats: (filePath) => {
        try {
            const stats = fs.statSync(filePath);
            return {
                size: stats.size,
                mtime: stats.mtime,
                ctime: stats.ctime,
                atime: stats.atime,
                birthtime: stats.birthtime,
                isDirectory: stats.isDirectory(),
                isFile: stats.isFile(),
                isSymbolicLink: stats.isSymbolicLink(),
                mode: stats.mode,
                uid: stats.uid,
                gid: stats.gid
            };
        } catch {
            return null;
        }
    },

    // Enhanced file operations
    getFileExtension: (filePath) => {
        try {
            return path.extname(filePath).toLowerCase();
        } catch {
            return '';
        }
    },

    getFileName: (filePath) => {
        try {
            return path.basename(filePath);
        } catch {
            return '';
        }
    },

    getFileNameWithoutExtension: (filePath) => {
        try {
            return path.basename(filePath, path.extname(filePath));
        } catch {
            return '';
        }
    },

    // File type detection
    isImageFile: (filePath) => {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif', '.svg', '.ico', '.heic', '.heif', '.raw', '.cr2', '.nef', '.arw', '.dng'];
        const ext = path.extname(filePath).toLowerCase();
        return imageExtensions.includes(ext);
    },

    isVideoFile: (filePath) => {
        const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v', '.3gp', '.ogv', '.mts', '.m2ts'];
        const ext = path.extname(filePath).toLowerCase();
        return videoExtensions.includes(ext);
    },

    isMediaFile: (filePath) => {
        return this.isImageFile(filePath) || this.isVideoFile(filePath);
    },

    // Directory operations
    readDirectory: (dirPath) => {
        try {
            return fs.readdirSync(dirPath);
        } catch {
            return [];
        }
    },

    // File size utilities
    formatFileSize: (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
});

// Media and thumbnail utilities
contextBridge.exposeInMainWorld('mediaAPI', {
    // Supported file types
    getSupportedImageExtensions: () => ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif', '.svg', '.ico', '.heic', '.heif', '.raw', '.cr2', '.nef', '.arw', '.dng'],
    getSupportedVideoExtensions: () => ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v', '.3gp', '.ogv', '.mts', '.m2ts'],
    
    // File type checking
    isImageFile: (filePath) => {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif', '.svg', '.ico', '.heic', '.heif', '.raw', '.cr2', '.nef', '.arw', '.dng'];
        const ext = path.extname(filePath).toLowerCase();
        return imageExtensions.includes(ext);
    },
    
    isVideoFile: (filePath) => {
        const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v', '.3gp', '.ogv', '.mts', '.m2ts'];
        const ext = path.extname(filePath).toLowerCase();
        return videoExtensions.includes(ext);
    },
    
    isMediaFile: (filePath) => {
        return this.isImageFile(filePath) || this.isVideoFile(filePath);
    },

    // Thumbnail size constants
    getThumbnailSizes: () => ({
        SMALL: 150,
        MEDIUM: 300,
        LARGE: 600
    }),

    // MIME type detection
    getMimeType: (filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.webp': 'image/webp',
            '.tiff': 'image/tiff',
            '.tif': 'image/tiff',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.heic': 'image/heic',
            '.heif': 'image/heif',
            '.mp4': 'video/mp4',
            '.avi': 'video/x-msvideo',
            '.mov': 'video/quicktime',
            '.wmv': 'video/x-ms-wmv',
            '.flv': 'video/x-flv',
            '.webm': 'video/webm',
            '.mkv': 'video/x-matroska',
            '.m4v': 'video/x-m4v',
            '.3gp': 'video/3gpp',
            '.ogv': 'video/ogg'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
});

// Security utilities
contextBridge.exposeInMainWorld('securityAPI', {
    // Path validation utilities (read-only, actual validation happens in main process)
    isPathSafe: (filePath) => {
        // Basic client-side validation - real validation happens in main process
        if (!filePath || typeof filePath !== 'string') return false;
        if (filePath.includes('..')) return false;
        if (filePath.includes('~')) return false;
        return true;
    },

    // Generate secure hash for file paths (for caching)
    generatePathHash: (filePath) => {
        // Simple hash function for client-side use
        let hash = 0;
        if (filePath.length === 0) return hash.toString();
        for (let i = 0; i < filePath.length; i++) {
            const char = filePath.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }
});

// Platform information
contextBridge.exposeInMainWorld('platform', {
    os: process.platform,
    arch: process.arch,
    version: process.version,
    versions: process.versions,
    
    // Platform-specific utilities
    isWindows: () => process.platform === 'win32',
    isMacOS: () => process.platform === 'darwin',
    isLinux: () => process.platform === 'linux',
    
    // Path separators
    pathSeparator: path.sep,
    pathDelimiter: path.delimiter
});

// Development helpers (only in development mode)
if (process.env.NODE_ENV === 'development') {
    contextBridge.exposeInMainWorld('dev', {
        openDevTools: () => ipcRenderer.invoke('open-dev-tools'),
        reload: () => ipcRenderer.invoke('reload-app')
    });
}