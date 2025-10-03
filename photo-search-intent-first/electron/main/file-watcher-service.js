/**
 * File Watcher Service for Electron Main Process
 * Monitors file system changes and reconciles SQLite/index with cache invalidation
 */

const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const { ipcMain } = require('electron');

// Supported photo file extensions
const SUPPORTED_PHOTO_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'
]);

// Supported metadata/index files that affect caches
const SUPPORTED_METADATA_EXTENSIONS = new Set([
  '.json', '.db', '.sqlite', '.index'
]);

class FileWatcherService {
  constructor() {
    this.watchers = new Map(); // Map of directory paths to chokidar watchers
    this.pendingChanges = new Map(); // Map of directory paths to pending changes
    this.changeCallbacks = new Map(); // Map of directory paths to callback functions
    this.debounceTimers = new Map(); // Map of directory paths to debounce timers
    this.debounceDelay = 1500; // 1.5 seconds debounce for batch processing
    
    this.setupIPC();
  }
  
  setupIPC() {
    // IPC handler to start watching a directory
    ipcMain.handle('file-watcher:start', async (event, directoryPath) => {
      try {
        const success = await this.startWatching(directoryPath);
        return { success, error: success ? null : 'Failed to start watching' };
      } catch (error) {
        console.error('[FileWatcher] Failed to start watching:', error);
        return { success: false, error: error.message };
      }
    });
    
    // IPC handler to stop watching a directory
    ipcMain.handle('file-watcher:stop', async (event, directoryPath) => {
      try {
        const success = await this.stopWatching(directoryPath);
        return { success, error: success ? null : 'Failed to stop watching' };
      } catch (error) {
        console.error('[FileWatcher] Failed to stop watching:', error);
        return { success: false, error: error.message };
      }
    });
    
    // IPC handler to get watcher status
    ipcMain.handle('file-watcher:get-status', async (event) => {
      return {
        watching: Array.from(this.watchers.keys()),
        pendingChanges: Object.fromEntries(
          Array.from(this.pendingChanges.entries()).map(([dir, changes]) => [dir, Array.from(changes)])
        )
      };
    });
    
    // IPC handler to manually trigger reconciliation
    ipcMain.handle('file-watcher:reconcile', async (event, directoryPath) => {
      try {
        const changes = this.pendingChanges.get(directoryPath) || new Set();
        const reconciled = await this.reconcileChanges(directoryPath, Array.from(changes));
        this.pendingChanges.delete(directoryPath);
        return { success: true, reconciled, changes: Array.from(changes) };
      } catch (error) {
        console.error('[FileWatcher] Failed to reconcile:', error);
        return { success: false, error: error.message, changes: [] };
      }
    });
  }
  
  isPhotoFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return SUPPORTED_PHOTO_EXTENSIONS.has(ext);
  }
  
  isMetadataFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return SUPPORTED_METADATA_EXTENSIONS.has(ext);
  }
  
  isRelevantFile(filePath) {
    return this.isPhotoFile(filePath) || this.isMetadataFile(filePath);
  }
  
  async startWatching(directoryPath) {
    try {
      // Normalize and validate directory path
      const normalizedPath = path.resolve(directoryPath);
      
      // Check if already watching
      if (this.watchers.has(normalizedPath)) {
        console.log(`[FileWatcher] Already watching: ${normalizedPath}`);
        return true;
      }
      
      // Check if directory exists
      if (!fs.existsSync(normalizedPath)) {
        throw new Error(`Directory does not exist: ${normalizedPath}`);
      }
      
      // Create watcher
      const watcher = chokidar.watch(normalizedPath, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 2000,
          pollInterval: 100
        }
      });
      
      // Initialize pending changes set
      this.pendingChanges.set(normalizedPath, new Set());
      
      // Setup event handlers
      watcher
        .on('add', (filePath) => this.handleChange('add', normalizedPath, filePath))
        .on('change', (filePath) => this.handleChange('change', normalizedPath, filePath))
        .on('unlink', (filePath) => this.handleChange('unlink', normalizedPath, filePath))
        .on('addDir', (dirPath) => this.handleChange('addDir', normalizedPath, dirPath))
        .on('unlinkDir', (dirPath) => this.handleChange('unlinkDir', normalizedPath, dirPath))
        .on('error', (error) => {
          console.error(`[FileWatcher] Error watching ${normalizedPath}:`, error);
          this.emitError(normalizedPath, error);
        })
        .on('ready', () => {
          console.log(`[FileWatcher] Ready to watch: ${normalizedPath}`);
          this.emitStatusChange(normalizedPath, 'ready');
        });
      
      // Store watcher
      this.watchers.set(normalizedPath, watcher);
      
      console.log(`[FileWatcher] Started watching: ${normalizedPath}`);
      return true;
      
    } catch (error) {
      console.error('[FileWatcher] Failed to start watching:', error);
      return false;
    }
  }
  
  async stopWatching(directoryPath) {
    try {
      const normalizedPath = path.resolve(directoryPath);
      const watcher = this.watchers.get(normalizedPath);
      
      if (watcher) {
        await watcher.close();
        this.watchers.delete(normalizedPath);
        
        // Clear pending changes and debounce timer
        this.pendingChanges.delete(normalizedPath);
        const timer = this.debounceTimers.get(normalizedPath);
        if (timer) {
          clearTimeout(timer);
          this.debounceTimers.delete(normalizedPath);
        }
        
        console.log(`[FileWatcher] Stopped watching: ${normalizedPath}`);
      }
      
      return true;
      
    } catch (error) {
      console.error('[FileWatcher] Failed to stop watching:', error);
      return false;
    }
  }
  
  handleChange(changeType, watchDirectory, filePath) {
    try {
      // Only process relevant files
      if (!this.isRelevantFile(filePath)) {
        return;
      }
      
      console.log(`[FileWatcher] Detected ${changeType}: ${filePath}`);
      
      // Add to pending changes
      let pending = this.pendingChanges.get(watchDirectory);
      if (!pending) {
        pending = new Set();
        this.pendingChanges.set(watchDirectory, pending);
      }
      
      pending.add(filePath);
      
      // Debounce the reconciliation process
      const existingTimer = this.debounceTimers.get(watchDirectory);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      
      const newTimer = setTimeout(() => {
        this.processPendingChanges(watchDirectory);
        this.debounceTimers.delete(watchDirectory);
      }, this.debounceDelay);
      
      this.debounceTimers.set(watchDirectory, newTimer);
      
    } catch (error) {
      console.error('[FileWatcher] Error handling change:', error);
    }
  }
  
  async processPendingChanges(watchDirectory) {
    try {
      const changes = this.pendingChanges.get(watchDirectory);
      if (!changes || changes.size === 0) {
        return;
      }
      
      console.log(`[FileWatcher] Processing ${changes.size} pending changes for: ${watchDirectory}`);
      
      // Convert Set to Array for processing
      const changesArray = Array.from(changes);
      
      // Reconcile changes
      const reconciled = await this.reconcileChanges(watchDirectory, changesArray);
      
      // Clear pending changes
      this.pendingChanges.delete(watchDirectory);
      
      console.log(`[FileWatcher] Reconciled ${reconciled} changes for: ${watchDirectory}`);
      
      // Emit reconciliation event
      this.emitReconciliation(watchDirectory, reconciled, changesArray);
      
    } catch (error) {
      console.error(`[FileWatcher] Error processing pending changes for ${watchDirectory}:`, error);
      this.emitError(watchDirectory, error);
    }
  }
  
  async reconcileChanges(watchDirectory, changes) {
    let reconciledCount = 0;
    
    try {
      // Process photo file changes
      const photoChanges = changes.filter(filePath => this.isPhotoFile(filePath));
      if (photoChanges.length > 0) {
        reconciledCount += await this.reconcilePhotoChanges(watchDirectory, photoChanges);
      }
      
      // Process metadata file changes
      const metadataChanges = changes.filter(filePath => this.isMetadataFile(filePath));
      if (metadataChanges.length > 0) {
        reconciledCount += await this.reconcileMetadataChanges(watchDirectory, metadataChanges);
      }
      
      // Invalidate caches if needed
      if (reconciledCount > 0) {
        await this.invalidateCaches(watchDirectory, changes);
      }
      
    } catch (error) {
      console.error('[FileWatcher] Error during reconciliation:', error);
      throw error;
    }
    
    return reconciledCount;
  }
  
  async reconcilePhotoChanges(watchDirectory, photoPaths) {
    try {
      console.log(`[FileWatcher] Reconciling ${photoPaths.length} photo changes in: ${watchDirectory}`);
      
      // For photo additions/changes, we might need to:
      // 1. Update SQLite database with new/changed photo metadata
      // 2. Generate embeddings for new photos
      // 3. Update search indexes
      // 4. Update thumbnails
      
      // This would typically involve calling the Python backend API
      // For now, we'll just log the changes
      console.log('[FileWatcher] Photo changes to reconcile:', photoPaths);
      
      return photoPaths.length;
      
    } catch (error) {
      console.error('[FileWatcher] Error reconciling photo changes:', error);
      return 0;
    }
  }
  
  async reconcileMetadataChanges(watchDirectory, metadataPaths) {
    try {
      console.log(`[FileWatcher] Reconciling ${metadataPaths.length} metadata changes in: ${watchDirectory}`);
      
      // For metadata changes, we might need to:
      // 1. Update SQLite database with new/changed metadata
      // 2. Update search indexes with new metadata
      // 3. Update cache invalidation markers
      
      // This would typically involve calling the Python backend API
      // For now, we'll just log the changes
      console.log('[FileWatcher] Metadata changes to reconcile:', metadataPaths);
      
      return metadataPaths.length;
      
    } catch (error) {
      console.error('[FileWatcher] Error reconciling metadata changes:', error);
      return 0;
    }
  }
  
  async invalidateCaches(watchDirectory, changes) {
    try {
      console.log(`[FileWatcher] Invalidating caches for ${changes.length} changes in: ${watchDirectory}`);
      
      // This would typically involve:
      // 1. Invalidating search cache entries that might be affected
      // 2. Clearing thumbnail caches for changed photos
      // 3. Updating any in-memory caches
      
      // For now, we'll just log the cache invalidation
      console.log('[FileWatcher] Cache invalidation triggered for:', changes);
      
      return true;
      
    } catch (error) {
      console.error('[FileWatcher] Error invalidating caches:', error);
      return false;
    }
  }
  
  // Event emitter methods
  emitStatusChange(directory, status) {
    // Emit event to renderer processes
    // This would typically use ipcMain.emit or a custom event system
    console.log(`[FileWatcher] Status change for ${directory}: ${status}`);
  }
  
  emitReconciliation(directory, count, changes) {
    // Emit reconciliation event
    console.log(`[FileWatcher] Reconciliation completed for ${directory}: ${count} changes`);
  }
  
  emitError(directory, error) {
    // Emit error event
    console.error(`[FileWatcher] Error for ${directory}:`, error.message);
  }
  
  // Public API methods
  isWatching(directoryPath) {
    const normalizedPath = path.resolve(directoryPath);
    return this.watchers.has(normalizedPath);
  }
  
  getWatchedDirectories() {
    return Array.from(this.watchers.keys());
  }
  
  getPendingChanges(directoryPath) {
    const normalizedPath = path.resolve(directoryPath);
    const changes = this.pendingChanges.get(normalizedPath);
    return changes ? Array.from(changes) : [];
  }
  
  async watchAllActiveDirectories() {
    // Restart watching for all previously watched directories
    const directories = Array.from(this.watchers.keys());
    const results = await Promise.all(
      directories.map(dir => this.startWatching(dir))
    );
    
    return results.every(result => result === true);
  }
  
  async stopAllWatching() {
    // Stop watching all directories
    const directories = Array.from(this.watchers.keys());
    const results = await Promise.all(
      directories.map(dir => this.stopWatching(dir))
    );
    
    return results.every(result => result === true);
  }
}

// Export singleton instance
const fileWatcherService = new FileWatcherService();

module.exports = {
  FileWatcherService,
  fileWatcherService
};