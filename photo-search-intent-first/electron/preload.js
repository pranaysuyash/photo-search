/* eslint-env node */
/* global require, module */
const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
// Legacy API for backward compatibility
contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectImportFolder: () => ipcRenderer.invoke('select-import-folder'),
  getApiToken: () => ipcRenderer.invoke('get-api-token'),
  getApiConfig: () => ipcRenderer.invoke('get-api-config'),
  setAllowedRoot: (p) => ipcRenderer.invoke('set-allowed-root', p),
  restartBackend: () => ipcRenderer.invoke('backend:restart'),
  models: {
    getStatus: () => ipcRenderer.invoke('models:get-status'),
    refresh: () => ipcRenderer.invoke('models:refresh')
  },
  // IPC event listeners for menu actions
  on: (channel, callback) => {
    ipcRenderer.on(channel, callback)
  },
  off: (channel, callback) => {
    ipcRenderer.off(channel, callback)
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
})

// Secure API for enhanced security
contextBridge.exposeInMainWorld('secureElectronAPI', {
  selectFolder: () => ipcRenderer.invoke('secure-select-folder'),
  readDirectoryPhotos: (directoryPath) => ipcRenderer.invoke('secure-read-directory-photos', directoryPath),
  readPhotoMetadata: (photoPath) => ipcRenderer.invoke('secure-read-photo-metadata', photoPath),
  getApiToken: () => ipcRenderer.invoke('secure-get-api-token'),
  getApiConfig: () => ipcRenderer.invoke('secure-get-api-config'),
  setAllowedRoot: (p) => ipcRenderer.invoke('secure-set-allowed-root', p),
  restartBackend: () => ipcRenderer.invoke('secure-backend:restart'),
  getAllowedRoots: () => ipcRenderer.invoke('secure-get-allowed-roots'),
  removeAllowedRoot: (rootPath) => ipcRenderer.invoke('secure-remove-allowed-root', rootPath),
  fileWatcher: {
    start: (directoryPath) => ipcRenderer.invoke('file-watcher:start', directoryPath),
    stop: (directoryPath) => ipcRenderer.invoke('file-watcher:stop', directoryPath),
    getStatus: () => ipcRenderer.invoke('file-watcher:get-status'),
    reconcile: (directoryPath) => ipcRenderer.invoke('file-watcher:reconcile', directoryPath)
  },
  pythonService: {
    getStatus: () => ipcRenderer.invoke('python-service:get-status'),
    getConfig: () => ipcRenderer.invoke('python-service:get-config'),
    restart: () => ipcRenderer.invoke('python-service:restart'),
    start: () => ipcRenderer.invoke('python-service:start'),
    stop: () => ipcRenderer.invoke('python-service:stop'),
    getApiToken: () => ipcRenderer.invoke('python-service:get-api-token'),
    getApiConfig: () => ipcRenderer.invoke('python-service:get-api-config')
  },
  models: {
    getStatus: () => ipcRenderer.invoke('secure-models:get-status'),
    refresh: () => ipcRenderer.invoke('secure-models:refresh')
  }
})
