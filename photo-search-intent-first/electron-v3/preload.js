const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // App info
    getVersion: () => ipcRenderer.invoke('get-app-version'),
    getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
    getPicturesPath: () => ipcRenderer.invoke('get-pictures-path'),

    // Settings store
    getStoreSetting: (key) => ipcRenderer.invoke('get-store-value', key),
    setStoreSetting: (key, value) => ipcRenderer.invoke('set-store-value', key, value),

    // File dialogs
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
    selectDirectory: () => ipcRenderer.invoke('select-photo-directory'),

    // Menu action listeners
    onDirectorySelected: (callback) => ipcRenderer.on('directory-selected', callback),
    onPhotosImport: (callback) => ipcRenderer.on('photos-import', callback),
    onFocusSearch: (callback) => ipcRenderer.on('focus-search', callback),
    onSetViewMode: (callback) => ipcRenderer.on('set-view-mode', callback),
    onSmartSearch: (callback) => ipcRenderer.on('smart-search', callback),
    onSearchByPeople: (callback) => ipcRenderer.on('search-by-people', callback),
    onSearchByPlaces: (callback) => ipcRenderer.on('search-by-places', callback),
    onRebuildIndex: (callback) => ipcRenderer.on('rebuild-index', callback),
    onExportLibrary: (callback) => ipcRenderer.on('export-library', callback),
    onOpenPreferences: (callback) => ipcRenderer.on('open-preferences', callback),

    // Remove listeners
    removeListener: (channel, callback) => ipcRenderer.removeListener(channel, callback),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

    // Platform detection
    platform: process.platform,
    isWindows: process.platform === 'win32',
    isMac: process.platform === 'darwin',
    isLinux: process.platform === 'linux',

    // Development mode
    isDevelopment: process.env.NODE_ENV === 'development'
})

// Expose Node.js path utilities for file handling
contextBridge.exposeInMainWorld('pathAPI', {
    join: (...args) => require('path').join(...args),
    dirname: (path) => require('path').dirname(path),
    basename: (path) => require('path').basename(path),
    extname: (path) => require('path').extname(path),
    resolve: (...args) => require('path').resolve(...args),
    normalize: (path) => require('path').normalize(path),
    sep: require('path').sep
})

// Expose file system utilities (read-only for security)
contextBridge.exposeInMainWorld('fsAPI', {
    exists: async (path) => {
        try {
            await require('fs').promises.access(path)
            return true
        } catch {
            return false
        }
    },
    stat: async (path) => {
        try {
            return await require('fs').promises.stat(path)
        } catch (error) {
            throw error
        }
    },
    readdir: async (path) => {
        try {
            return await require('fs').promises.readdir(path)
        } catch (error) {
            throw error
        }
    }
})

// Security: prevent access to Node.js globals
delete window.require
delete window.exports
delete window.module
