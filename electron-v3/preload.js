const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Settings management
    getSetting: (key) => ipcRenderer.invoke('get-setting', key),
    setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),

    // File system operations
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    showItemInFolder: (fullPath) => ipcRenderer.invoke('show-item-in-folder', fullPath),

    // Backend control
    startBackend: () => ipcRenderer.invoke('start-backend'),
    stopBackend: () => ipcRenderer.invoke('stop-backend'),
    getBackendStatus: () => ipcRenderer.invoke('backend-status'),

    // App information
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),

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
    exists: (path) => {
        try {
            return fs.existsSync(path);
        } catch {
            return false;
        }
    },

    isDirectory: (path) => {
        try {
            return fs.statSync(path).isDirectory();
        } catch {
            return false;
        }
    },

    isFile: (path) => {
        try {
            return fs.statSync(path).isFile();
        } catch {
            return false;
        }
    },

    getStats: (path) => {
        try {
            const stats = fs.statSync(path);
            return {
                size: stats.size,
                mtime: stats.mtime,
                ctime: stats.ctime,
                isDirectory: stats.isDirectory(),
                isFile: stats.isFile()
            };
        } catch {
            return null;
        }
    }
});

// Platform information
contextBridge.exposeInMainWorld('platform', {
    os: process.platform,
    arch: process.arch,
    version: process.version,
    versions: process.versions
});

// Development helpers (only in development mode)
if (process.env.NODE_ENV === 'development') {
    contextBridge.exposeInMainWorld('dev', {
        openDevTools: () => ipcRenderer.invoke('open-dev-tools'),
        reload: () => ipcRenderer.invoke('reload-app')
    });
}