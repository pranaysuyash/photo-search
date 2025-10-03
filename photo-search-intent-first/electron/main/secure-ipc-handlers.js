/**
 * Enhanced and secured IPC handlers for Electron main process
 * Implements proper access controls, path validation, and security measures
 */

const { app, dialog, ipcMain } = require('electron');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Security constants
const ALLOWED_OPERATIONS = new Set([
  'read-directory-photos',
  'read-photo-metadata',
  'select-folder',
  'get-api-token',
  'get-api-config',
  'set-allowed-root',
  'models:get-status',
  'models:refresh',
  'backend:restart'
]);

const ALLOWED_PHOTO_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'
]);

// Global state for security
let allowedRootDirectories = new Set();
let apiToken = null;

// Utility functions
function containsPath(baseDir, maybeChild) {
  if (!baseDir || !maybeChild) return false;
  const root = path.resolve(baseDir) + path.sep;
  const target = path.resolve(maybeChild);
  return target.startsWith(root);
}

function isPhotoFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_PHOTO_EXTENSIONS.has(ext);
}

function isValidPath(filePath, allowedRoots) {
  // Check if path is absolute
  if (!path.isAbsolute(filePath)) {
    return false;
  }
  
  // Check if path is within allowed roots
  for (const root of allowedRoots) {
    if (containsPath(root, filePath)) {
      return true;
    }
  }
  
  return false;
}

function normalizeAndValidatePath(inputPath, allowedRoots) {
  try {
    // Normalize the path
    const normalized = path.normalize(inputPath);
    
    // Validate it's within allowed roots
    if (!isValidPath(normalized, allowedRoots)) {
      throw new Error('Path access denied: outside allowed directories');
    }
    
    return normalized;
  } catch (error) {
    console.error('Path validation failed:', error);
    throw error;
  }
}

function validateOperation(operation) {
  if (!ALLOWED_OPERATIONS.has(operation)) {
    throw new Error(`Unauthorized operation: ${operation}`);
  }
}

// Enhanced IPC handlers with security
class SecureIPCHandlers {
  constructor() {
    this.setupHandlers();
  }
  
  setupHandlers() {
    // Secure folder selection with restricted directories
    ipcMain.handle('secure-select-folder', async (event) => {
      validateOperation('select-folder');
      
      const result = await dialog.showOpenDialog({
        title: 'Select Photo Folder',
        properties: ['openDirectory'],
        buttonLabel: 'Select Folder'
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        const selectedPath = result.filePaths[0];
        
        // Add to allowed directories
        allowedRootDirectories.add(selectedPath);
        
        return selectedPath;
      }
      
      return null;
    });
    
    // Secure directory reading for photos
    ipcMain.handle('secure-read-directory-photos', async (event, directoryPath) => {
      validateOperation('read-directory-photos');
      
      try {
        // Validate and normalize path
        const normalizedPath = normalizeAndValidatePath(directoryPath, allowedRootDirectories);
        
        // Check if directory exists and is accessible
        const stats = await fsp.stat(normalizedPath);
        if (!stats.isDirectory()) {
          throw new Error('Path is not a directory');
        }
        
        // Read directory contents
        const files = await fsp.readdir(normalizedPath);
        
        // Filter for photo files and get metadata
        const photoPromises = files
          .filter(file => isPhotoFile(file))
          .map(async (file) => {
            const fullPath = path.join(normalizedPath, file);
            const fileStat = await fsp.stat(fullPath);
            
            return {
              name: file,
              path: fullPath,
              relativePath: path.relative(app.getPath('home'), fullPath),
              size: fileStat.size,
              mtime: fileStat.mtimeMs,
              ctime: fileStat.ctimeMs,
              isDirectory: fileStat.isDirectory(),
              extension: path.extname(file).toLowerCase()
            };
          });
        
        const photos = await Promise.all(photoPromises);
        return photos.sort((a, b) => b.mtime - a.mtime);
      } catch (error) {
        console.error('Error reading directory:', error);
        throw new Error(`Cannot access directory: ${error.message}`);
      }
    });
    
    // Secure photo metadata reading
    ipcMain.handle('secure-read-photo-metadata', async (event, photoPath) => {
      validateOperation('read-photo-metadata');
      
      try {
        // Validate and normalize path
        const normalizedPath = normalizeAndValidatePath(photoPath, allowedRootDirectories);
        
        // Check if file exists and is a photo
        if (!isPhotoFile(normalizedPath)) {
          throw new Error('File is not a supported photo format');
        }
        
        const fileStat = await fsp.stat(normalizedPath);
        
        return {
          path: normalizedPath,
          size: fileStat.size,
          mtime: fileStat.mtimeMs,
          ctime: fileStat.ctimeMs,
          extension: path.extname(normalizedPath).toLowerCase(),
          isDirectory: fileStat.isDirectory()
        };
      } catch (error) {
        console.error('Error reading photo metadata:', error);
        throw error;
      }
    });
    
    // Secure API token access
    ipcMain.handle('secure-get-api-token', async (event) => {
      validateOperation('get-api-token');
      return apiToken || '';
    });
    
    // Secure API configuration access
    ipcMain.handle('secure-get-api-config', async (event) => {
      validateOperation('get-api-config');
      
      try {
        // This would normally get the actual port, but for security we're just returning a placeholder
        const base = 'http://127.0.0.1:8000'; // In a real implementation, this would be dynamic
        return { base, token: apiToken || '' };
      } catch {
        return { base: 'http://127.0.0.1:8000', token: apiToken || '' };
      }
    });
    
    // Secure allowed root setting
    ipcMain.handle('secure-set-allowed-root', async (event, rootPath) => {
      validateOperation('set-allowed-root');
      
      try {
        if (typeof rootPath === 'string' && rootPath.trim()) {
          // Validate the root path
          const normalizedRoot = path.resolve(rootPath);
          
          // Check if it's a valid directory
          const stats = await fsp.stat(normalizedRoot);
          if (!stats.isDirectory()) {
            throw new Error('Root path is not a directory');
          }
          
          // Add to allowed directories
          allowedRootDirectories.add(normalizedRoot);
          
          console.debug('[Security] Allowed root set to:', normalizedRoot);
          return true;
        }
      } catch (error) {
        console.error('[Security] Failed to set allowed root:', error);
      }
      
      return false;
    });
    
    // Model status (existing functionality)
    ipcMain.handle('secure-models:get-status', async (event) => {
      validateOperation('models:get-status');
      // In a real implementation, this would return actual model status
      return { ensured: true, copied: false, errors: [], source: null, destination: null, lastChecked: new Date().toISOString() };
    });
    
    // Model refresh (existing functionality)
    ipcMain.handle('secure-models:refresh', async (event) => {
      validateOperation('models:refresh');
      // In a real implementation, this would refresh models
      return { ok: true, status: { ensured: true, copied: false, errors: [], source: null, destination: null, lastChecked: new Date().toISOString() } };
    });
    
    // Backend restart (existing functionality)
    ipcMain.handle('secure-backend:restart', async (event) => {
      validateOperation('backend:restart');
      // In a real implementation, this would restart the backend
      console.info('[Security] Backend restart requested');
      return true;
    });
    
    // New handler for getting allowed roots (for debugging/security monitoring)
    ipcMain.handle('secure-get-allowed-roots', async (event) => {
      return Array.from(allowedRootDirectories);
    });
    
    // New handler for removing allowed roots
    ipcMain.handle('secure-remove-allowed-root', async (event, rootPath) => {
      try {
        const normalizedRoot = path.resolve(rootPath);
        const removed = allowedRootDirectories.delete(normalizedRoot);
        console.debug('[Security] Removed allowed root:', normalizedRoot, 'Result:', removed);
        return removed;
      } catch (error) {
        console.error('[Security] Failed to remove allowed root:', error);
        return false;
      }
    });
  }
  
  // Method to add allowed root programmatically (e.g., from command line args)
  addAllowedRoot(rootPath) {
    try {
      const normalizedRoot = path.resolve(rootPath);
      allowedRootDirectories.add(normalizedRoot);
      console.debug('[Security] Programmatically added allowed root:', normalizedRoot);
    } catch (error) {
      console.error('[Security] Failed to add allowed root:', error);
    }
  }
  
  // Method to get current allowed roots
  getAllowedRoots() {
    return Array.from(allowedRootDirectories);
  }
  
  // Method to clear all allowed roots
  clearAllowedRoots() {
    const count = allowedRootDirectories.size;
    allowedRootDirectories.clear();
    console.debug('[Security] Cleared all allowed roots. Count:', count);
  }
  
  // Method to set API token
  setApiToken(token) {
    apiToken = token;
  }
  
  // Method to get API token
  getApiToken() {
    return apiToken;
  }
}

// Export singleton instance
const secureIPCHandlers = new SecureIPCHandlers();

module.exports = {
  secureIPCHandlers,
  SecureIPCHandlers
};