/**
 * Integration test suite for Electron main process integration
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const { PythonServiceSupervisor } = require('../electron/main/python-service-supervisor');
const { FileWatcherService } = require('../electron/main/file-watcher-service');
const { SecureIPCHandlers } = require('../electron/main/secure-ipc-handlers');

// Mock electron modules
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/mock/user/data'),
    getVersion: jest.fn().mockReturnValue('1.0.0'),
    isPackaged: false,
    whenReady: jest.fn().mockResolvedValue(),
    on: jest.fn(),
    quit: jest.fn()
  },
  BrowserWindow: jest.fn(),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn()
  },
  dialog: {
    showOpenDialog: jest.fn(),
    showErrorBox: jest.fn()
  },
  protocol: {
    registerFileProtocol: jest.fn(),
    registerSchemesAsPrivileged: jest.fn()
  }
}));

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  statSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  createWriteStream: jest.fn()
}));

describe('Electron Main Process Integration', () => {
  let pythonServiceSupervisor;
  let fileWatcherService;
  let secureIPCHandlers;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create service instances
    pythonServiceSupervisor = new PythonServiceSupervisor();
    fileWatcherService = new FileWatcherService();
    secureIPCHandlers = new SecureIPCHandlers();
  });

  afterEach(() => {
    // Clean up any timers or resources
    if (pythonServiceSupervisor.healthCheckTimer) {
      clearInterval(pythonServiceSupervisor.healthCheckTimer);
    }
    
    fileWatcherService.debounceTimers.forEach(timer => {
      clearTimeout(timer);
    });
    fileWatcherService.debounceTimers.clear();
  });

  describe('Service Initialization', () => {
    test('should initialize all services on app ready', async () => {
      const { app } = require('electron');
      
      // Mock app ready event
      app.whenReady.mockResolvedValue();
      
      // Import and execute main process setup
      jest.isolateModules(() => {
        require('../electron/main.js');
      });
      
      // Should register all expected IPC handlers
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'secure-select-folder',
        expect.any(Function)
      );
      
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'secure-read-directory-photos',
        expect.any(Function)
      );
      
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'secure-get-api-token',
        expect.any(Function)
      );
      
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'file-watcher:start',
        expect.any(Function)
      );
      
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'file-watcher:stop',
        expect.any(Function)
      );
    });

    test('should start Python service supervisor', async () => {
      jest.isolateModules(async () => {
        const mainModule = require('../electron/main.js');
        
        // Mock spawn to simulate successful service start
        const spawn = require('child_process').spawn;
        const mockProcess = {
          on: jest.fn((event, callback) => {
            if (event === 'exit') {
              // Don't call exit callback unless explicitly triggered
            }
          }),
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          kill: jest.fn()
        };
        spawn.mockReturnValue(mockProcess);
        
        // Start Python service
        const started = await pythonServiceSupervisor.start();
        
        expect(started).toBe(true);
        expect(pythonServiceSupervisor.getStatus().status).toBe('running');
      });
    });

    test('should initialize secure IPC handlers', () => {
      // Should create secure IPC handlers
      expect(secureIPCHandlers).toBeDefined();
      
      // Should register secure IPC handlers
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'secure-select-folder',
        expect.any(Function)
      );
    });
  });

  describe('IPC Communication', () => {
    test('should handle secure folder selection', async () => {
      const { dialog } = require('electron');
      
      // Mock dialog response
      const mockResult = {
        canceled: false,
        filePaths: ['/home/user/photos']
      };
      dialog.showOpenDialog.mockResolvedValue(mockResult);
      
      // Find the folder selection handler
      const folderHandlerCall = ipcMain.handle.mock.calls.find(
        call => call[0] === 'secure-select-folder'
      );
      
      expect(folderHandlerCall).toBeDefined();
      
      const folderHandler = folderHandlerCall[1];
      const mockEvent = {};
      const result = await folderHandler(mockEvent);
      
      expect(result).toBe('/home/user/photos');
      expect(dialog.showOpenDialog).toHaveBeenCalledWith(
        expect.any(Object), // mainWindow
        {
          title: 'Select Photo Folder',
          properties: ['openDirectory'],
          buttonLabel: 'Select Folder'
        }
      );
    });

    test('should handle API configuration requests', async () => {
      // Find the API config handler
      const apiConfigHandlerCall = ipcMain.handle.mock.calls.find(
        call => call[0] === 'secure-get-api-config'
      );
      
      expect(apiConfigHandlerCall).toBeDefined();
      
      const apiConfigHandler = apiConfigHandlerCall[1];
      const mockEvent = {};
      const result = await apiConfigHandler(mockEvent);
      
      expect(result).toEqual({
        base: 'http://127.0.0.1:8000',
        token: expect.any(String)
      });
    });

    test('should handle file watcher requests', async () => {
      // Find the file watcher start handler
      const fileWatcherStartCall = ipcMain.handle.mock.calls.find(
        call => call[0] === 'file-watcher:start'
      );
      
      expect(fileWatcherStartCall).toBeDefined();
      
      const fileWatcherStartHandler = fileWatcherStartCall[1];
      const mockEvent = {};
      const result = await fileWatcherStartHandler(mockEvent, '/home/user/photos');
      
      expect(result).toEqual({
        success: expect.any(Boolean),
        error: expect.any(String) || null
      });
    });
  });

  describe('Service Coordination', () => {
    test('should coordinate Python service and file watching', async () => {
      jest.useFakeTimers();
      
      // Mock the services to work together
      const mockProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'exit') {
            // Don't call exit callback unless explicitly triggered
          }
        }),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn()
      };
      
      const spawn = require('child_process').spawn;
      spawn.mockReturnValue(mockProcess);
      
      // Start Python service
      await pythonServiceSupervisor.start();
      
      // Start watching a directory
      await fileWatcherService.startWatching('/home/user/photos');
      
      // Both services should be running
      expect(pythonServiceSupervisor.getStatus().status).toBe('running');
      expect(fileWatcherService.isWatching('/home/user/photos')).toBe(true);
      
      jest.useRealTimers();
    });

    test('should handle service failures gracefully', async () => {
      jest.useFakeTimers();
      
      // Mock service that fails immediately
      const spawn = require('child_process').spawn;
      spawn.mockImplementation(() => {
        throw new Error('Failed to spawn process');
      });
      
      // Try to start Python service (should fail)
      const started = await pythonServiceSupervisor.start();
      
      expect(started).toBe(false);
      expect(pythonServiceSupervisor.getStatus().status).toBe('crashed');
      
      // File watcher should still work independently
      const watchStarted = await fileWatcherService.startWatching('/home/user/photos');
      expect(watchStarted).toBe(true);
      expect(fileWatcherService.isWatching('/home/user/photos')).toBe(true);
      
      jest.useRealTimers();
    });
  });

  describe('Security Integration', () => {
    test('should enforce secure IPC access', async () => {
      // Test that unauthorized operations are rejected
      expect(() => {
        secureIPCHandlers['validateOperation']('unauthorized-operation');
      }).toThrow('Unauthorized operation: unauthorized-operation');
      
      // Test that authorized operations proceed
      expect(() => {
        secureIPCHandlers['validateOperation']('select-folder');
      }).not.toThrow();
    });

    test('should validate file paths against allowed roots', () => {
      // Add an allowed root
      secureIPCHandlers.addAllowedRoot('/home/user/photos');
      
      // Test path validation
      const validPath = '/home/user/photos/vacation/image.jpg';
      const invalidPath = '/etc/passwd';
      
      // Should accept paths within allowed roots
      expect(() => {
        const normalizedPath = secureIPCHandlers['normalizeAndValidatePath'](validPath, ['/home/user/photos']);
        expect(normalizedPath).toBe(validPath);
      }).not.toThrow();
      
      // Should reject paths outside allowed roots
      expect(() => {
        secureIPCHandlers['normalizeAndValidatePath'](invalidPath, ['/home/user/photos']);
      }).toThrow('Path access denied: outside allowed directories');
    });
  });

  describe('Shutdown Handling', () => {
    test('should gracefully shut down all services', async () => {
      jest.useFakeTimers();
      
      // Mock services
      const mockProcess = {
        kill: jest.fn(),
        on: jest.fn(),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        killed: false
      };
      
      const spawn = require('child_process').spawn;
      spawn.mockReturnValue(mockProcess);
      
      // Start services
      await pythonServiceSupervisor.start();
      await fileWatcherService.startWatching('/home/user/photos');
      
      // Mock window all closed event
      const windowAllClosedHandler = app.on.mock.calls.find(
        call => call[0] === 'window-all-closed'
      );
      
      if (windowAllClosedHandler) {
        const windowAllClosedCallback = windowAllClosedHandler[1];
        windowAllClosedCallback();
      }
      
      // Should stop all services
      expect(mockProcess.kill).toHaveBeenCalledWith(expect.any(String));
      
      jest.useRealTimers();
    });

    test('should handle forced shutdowns', async () => {
      jest.useFakeTimers();
      
      // Mock services
      const mockProcess = {
        kill: jest.fn(),
        on: jest.fn(),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        killed: false
      };
      
      const spawn = require('child_process').spawn;
      spawn.mockReturnValue(mockProcess);
      
      // Start services
      await pythonServiceSupervisor.start();
      await fileWatcherService.startWatching('/home/user/photos');
      
      // Mock before quit event
      const beforeQuitHandler = app.on.mock.calls.find(
        call => call[0] === 'before-quit'
      );
      
      if (beforeQuitHandler) {
        const beforeQuitCallback = beforeQuitHandler[1];
        beforeQuitCallback();
      }
      
      // Should force kill all processes
      expect(mockProcess.kill).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });
});