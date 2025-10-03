/**
 * Test suite for file watcher service
 */

const { FileWatcherService } = require('../electron/main/file-watcher-service');
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');

// Mock chokidar
jest.mock('chokidar', () => {
  const mockWatcher = {
    on: jest.fn().mockReturnThis(),
    close: jest.fn().mockResolvedValue(),
    add: jest.fn(),
    unwatch: jest.fn()
  };
  
  return {
    watch: jest.fn().mockReturnValue(mockWatcher)
  };
});

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  statSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn()
}));

// Mock electron ipcMain
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn()
  }
}));

describe('FileWatcherService', () => {
  let fileWatcherService;
  let mockWatcher;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock watcher
    mockWatcher = {
      on: jest.fn().mockReturnThis(),
      close: jest.fn().mockResolvedValue(),
      add: jest.fn(),
      unwatch: jest.fn()
    };
    
    chokidar.watch.mockReturnValue(mockWatcher);
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValue({ isDirectory: () => true });
    
    // Create fresh service for each test
    fileWatcherService = new FileWatcherService();
  });

  afterEach(() => {
    // Clean up any timers
    fileWatcherService.debounceTimers.forEach(timer => {
      clearTimeout(timer);
    });
    fileWatcherService.debounceTimers.clear();
  });

  describe('Service Initialization', () => {
    test('should initialize with IPC handlers', () => {
      const { ipcMain } = require('electron');
      
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'file-watcher:start',
        expect.any(Function)
      );
      
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'file-watcher:stop',
        expect.any(Function)
      );
      
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'file-watcher:get-status',
        expect.any(Function)
      );
      
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'file-watcher:reconcile',
        expect.any(Function)
      );
    });

    test('should identify photo files correctly', () => {
      const photoFiles = [
        '/home/user/photos/image.jpg',
        '/home/user/photos/photo.jpeg',
        '/home/user/photos/snapshot.png',
        '/home/user/photos/graphic.gif',
        '/home/user/photos/drawing.webp',
        '/home/user/photos/scan.bmp',
        '/home/user/photos/picture.tiff',
        '/home/user/photos/image.tif'
      ];
      
      const nonPhotoFiles = [
        '/home/user/documents/document.pdf',
        '/home/user/spreadsheets/data.xlsx',
        '/home/user/text/notes.txt',
        '/home/user/programs/script.js',
        '/home/user/photos/config.json'
      ];
      
      photoFiles.forEach(file => {
        expect(fileWatcherService.isPhotoFile(file)).toBe(true);
      });
      
      nonPhotoFiles.forEach(file => {
        expect(fileWatcherService.isPhotoFile(file)).toBe(false);
      });
    });

    test('should identify metadata files correctly', () => {
      const metadataFiles = [
        '/home/user/photos/metadata.json',
        '/home/user/photos/index.db',
        '/home/user/photos/photos.sqlite',
        '/home/user/photos/search.index'
      ];
      
      const nonMetadataFiles = [
        '/home/user/photos/image.jpg',
        '/home/user/photos/document.pdf',
        '/home/user/photos/script.js'
      ];
      
      metadataFiles.forEach(file => {
        expect(fileWatcherService.isMetadataFile(file)).toBe(true);
      });
      
      nonMetadataFiles.forEach(file => {
        expect(fileWatcherService.isMetadataFile(file)).toBe(false);
      });
    });
  });

  describe('File Watching', () => {
    test('should start watching valid directories', async () => {
      const directoryPath = '/home/user/photos';
      
      // Mock event handlers
      const eventHandlers = {};
      mockWatcher.on.mockImplementation((event, handler) => {
        eventHandlers[event] = handler;
        return mockWatcher;
      });
      
      const result = await fileWatcherService.startWatching(directoryPath);
      
      expect(result).toBe(true);
      expect(chokidar.watch).toHaveBeenCalledWith(
        path.resolve(directoryPath),
        expect.objectContaining({
          ignored: /(^|[\/\\])\../,
          persistent: true,
          ignoreInitial: true,
          awaitWriteFinish: expect.any(Object)
        })
      );
      
      expect(fileWatcherService.isWatching(directoryPath)).toBe(true);
      expect(fileWatcherService.getWatchedDirectories()).toContain(path.resolve(directoryPath));
    });

    test('should reject non-existent directories', async () => {
      const directoryPath = '/non/existent/directory';
      fs.existsSync.mockReturnValue(false);
      
      const result = await fileWatcherService.startWatching(directoryPath);
      
      expect(result).toBe(false);
      expect(fileWatcherService.isWatching(directoryPath)).toBe(false);
    });

    test('should handle duplicate watch requests gracefully', async () => {
      const directoryPath = '/home/user/photos';
      
      // Mock event handlers
      const eventHandlers = {};
      mockWatcher.on.mockImplementation((event, handler) => {
        eventHandlers[event] = handler;
        return mockWatcher;
      });
      
      // Start watching first time
      const result1 = await fileWatcherService.startWatching(directoryPath);
      
      // Start watching second time (should not create duplicate)
      const result2 = await fileWatcherService.startWatching(directoryPath);
      
      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(chokidar.watch).toHaveBeenCalledTimes(1); // Should only be called once
    });
  });

  describe('File Change Handling', () => {
    test('should handle file additions', async () => {
      const directoryPath = '/home/user/photos';
      const filePath = '/home/user/photos/new-image.jpg';
      
      // Mock event handlers
      let addHandler;
      mockWatcher.on.mockImplementation((event, handler) => {
        if (event === 'add') {
          addHandler = handler;
        }
        return mockWatcher;
      });
      
      // Start watching
      await fileWatcherService.startWatching(directoryPath);
      
      // Simulate file addition
      addHandler(filePath);
      
      // Should be in pending changes
      const pendingChanges = fileWatcherService.getPendingChanges(directoryPath);
      expect(pendingChanges).toContain(filePath);
    });

    test('should handle file modifications', async () => {
      const directoryPath = '/home/user/photos';
      const filePath = '/home/user/photos/existing-image.jpg';
      
      // Mock event handlers
      let changeHandler;
      mockWatcher.on.mockImplementation((event, handler) => {
        if (event === 'change') {
          changeHandler = handler;
        }
        return mockWatcher;
      });
      
      // Start watching
      await fileWatcherService.startWatching(directoryPath);
      
      // Simulate file modification
      changeHandler(filePath);
      
      // Should be in pending changes
      const pendingChanges = fileWatcherService.getPendingChanges(directoryPath);
      expect(pendingChanges).toContain(filePath);
    });

    test('should handle file deletions', async () => {
      const directoryPath = '/home/user/photos';
      const filePath = '/home/user/photos/deleted-image.jpg';
      
      // Mock event handlers
      let unlinkHandler;
      mockWatcher.on.mockImplementation((event, handler) => {
        if (event === 'unlink') {
          unlinkHandler = handler;
        }
        return mockWatcher;
      });
      
      // Start watching
      await fileWatcherService.startWatching(directoryPath);
      
      // Simulate file deletion
      unlinkHandler(filePath);
      
      // Should be in pending changes
      const pendingChanges = fileWatcherService.getPendingChanges(directoryPath);
      expect(pendingChanges).toContain(filePath);
    });

    test('should debounce multiple changes', async () => {
      jest.useFakeTimers();
      
      const directoryPath = '/home/user/photos';
      const filePath1 = '/home/user/photos/image1.jpg';
      const filePath2 = '/home/user/photos/image2.jpg';
      
      // Mock event handlers
      const eventHandlers = {};
      mockWatcher.on.mockImplementation((event, handler) => {
        eventHandlers[event] = handler;
        return mockWatcher;
      });
      
      // Mock reconcile function
      const reconcileSpy = jest.spyOn(fileWatcherService, 'reconcileChanges')
        .mockResolvedValue(2);
      
      const emitSpy = jest.spyOn(fileWatcherService, 'emitReconciliation');
      
      // Start watching
      await fileWatcherService.startWatching(directoryPath);
      
      // Simulate rapid file changes
      eventHandlers['add'](filePath1);
      eventHandlers['add'](filePath2);
      
      // Advance timer partially
      jest.advanceTimersByTime(500);
      
      // Should not have processed yet (still debouncing)
      expect(reconcileSpy).not.toHaveBeenCalled();
      
      // Advance timer to complete debounce
      jest.advanceTimersByTime(1500);
      
      // Wait for async operations
      await Promise.resolve();
      
      // Should have processed changes
      expect(reconcileSpy).toHaveBeenCalledWith(
        path.resolve(directoryPath),
        [filePath1, filePath2]
      );
      
      expect(emitSpy).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('Change Reconciliation', () => {
    test('should reconcile photo changes', async () => {
      const directoryPath = '/home/user/photos';
      const photoPaths = [
        '/home/user/photos/image1.jpg',
        '/home/user/photos/image2.png'
      ];
      
      const reconciled = await fileWatcherService.reconcilePhotoChanges(
        directoryPath,
        photoPaths
      );
      
      expect(reconciled).toBe(2);
    });

    test('should reconcile metadata changes', async () => {
      const directoryPath = '/home/user/photos';
      const metadataPaths = [
        '/home/user/photos/metadata.json',
        '/home/user/photos/index.db'
      ];
      
      const reconciled = await fileWatcherService.reconcileMetadataChanges(
        directoryPath,
        metadataPaths
      );
      
      expect(reconciled).toBe(2);
    });

    test('should invalidate caches when changes occur', async () => {
      const directoryPath = '/home/user/photos';
      const changes = [
        '/home/user/photos/new-image.jpg',
        '/home/user/photos/metadata.json'
      ];
      
      const invalidated = await fileWatcherService.invalidateCaches(
        directoryPath,
        changes
      );
      
      expect(invalidated).toBe(true);
    });

    test('should process pending changes', async () => {
      jest.useFakeTimers();
      
      const directoryPath = '/home/user/photos';
      const filePath = '/home/user/photos/image.jpg';
      
      // Mock event handlers
      let addHandler;
      mockWatcher.on.mockImplementation((event, handler) => {
        if (event === 'add') {
          addHandler = handler;
        }
        return mockWatcher;
      });
      
      // Mock reconcile function
      const reconcileSpy = jest.spyOn(fileWatcherService, 'reconcileChanges')
        .mockResolvedValue(1);
      
      // Start watching
      await fileWatcherService.startWatching(directoryPath);
      
      // Add file change
      addHandler(filePath);
      
      // Process pending changes directly
      await fileWatcherService.processPendingChanges(directoryPath);
      
      // Should have reconciled changes
      expect(reconcileSpy).toHaveBeenCalledWith(
        path.resolve(directoryPath),
        [filePath]
      );
      
      // Pending changes should be cleared
      const pendingChanges = fileWatcherService.getPendingChanges(directoryPath);
      expect(pendingChanges).toHaveLength(0);
      
      jest.useRealTimers();
    });
  });

  describe('Service Management', () => {
    test('should stop watching directories', async () => {
      const directoryPath = '/home/user/photos';
      
      // Mock event handlers
      mockWatcher.on.mockImplementation((event, handler) => {
        return mockWatcher;
      });
      
      // Start watching
      await fileWatcherService.startWatching(directoryPath);
      
      // Stop watching
      const result = await fileWatcherService.stopWatching(directoryPath);
      
      expect(result).toBe(true);
      expect(mockWatcher.close).toHaveBeenCalled();
      expect(fileWatcherService.isWatching(directoryPath)).toBe(false);
    });

    test('should handle stop on non-watched directory gracefully', async () => {
      const directoryPath = '/non/monitored/directory';
      
      const result = await fileWatcherService.stopWatching(directoryPath);
      
      expect(result).toBe(true); // Should succeed even if not watching
    });

    test('should watch all previously watched directories', async () => {
      const directory1 = '/home/user/photos';
      const directory2 = '/Users/test/Pictures';
      
      // Mock event handlers
      mockWatcher.on.mockImplementation((event, handler) => {
        return mockWatcher;
      });
      
      // Start watching multiple directories
      await fileWatcherService.startWatching(directory1);
      await fileWatcherService.startWatching(directory2);
      
      // Stop all watching
      await fileWatcherService.stopAllWatching();
      
      // Restart all
      const result = await fileWatcherService.watchAllActiveDirectories();
      
      expect(result).toBe(true);
      // Note: This would actually restart the watches, but we're mocking chokidar
      // so it won't actually create new watchers
    });
  });

  describe('IPC Integration', () => {
    test('should handle IPC start request', async () => {
      const { ipcMain } = require('electron');
      
      // Find the start handler
      const startHandlerCall = ipcMain.handle.mock.calls.find(
        call => call[0] === 'file-watcher:start'
      );
      
      expect(startHandlerCall).toBeDefined();
      
      const startHandler = startHandlerCall[1];
      const mockEvent = {};
      const result = await startHandler(mockEvent, '/home/user/photos');
      
      expect(result).toEqual({
        success: expect.any(Boolean),
        error: expect.any(String) || null
      });
    });

    test('should handle IPC stop request', async () => {
      const { ipcMain } = require('electron');
      
      // Find the stop handler
      const stopHandlerCall = ipcMain.handle.mock.calls.find(
        call => call[0] === 'file-watcher:stop'
      );
      
      expect(stopHandlerCall).toBeDefined();
      
      const stopHandler = stopHandlerCall[1];
      const mockEvent = {};
      const result = await stopHandler(mockEvent, '/home/user/photos');
      
      expect(result).toEqual({
        success: expect.any(Boolean),
        error: expect.any(String) || null
      });
    });

    test('should handle IPC status request', async () => {
      const { ipcMain } = require('electron');
      
      // Find the status handler
      const statusHandlerCall = ipcMain.handle.mock.calls.find(
        call => call[0] === 'file-watcher:get-status'
      );
      
      expect(statusHandlerCall).toBeDefined();
      
      const statusHandler = statusHandlerCall[1];
      const mockEvent = {};
      const result = await statusHandler(mockEvent);
      
      expect(result).toEqual({
        watching: expect.any(Array),
        pendingChanges: expect.any(Object)
      });
    });
  });
});