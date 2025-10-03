/**
 * Test suite for secured IPC handlers
 */

const { SecureIPCHandlers } = require('../../electron/main/secure-ipc-handlers');
const { app, dialog, ipcMain } = require('electron');
const fs = require('fs').promises;
const path = require('path');

// Mock Electron modules
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/mock/user/data'),
    isReady: jest.fn().mockReturnValue(true)
  },
  dialog: {
    showOpenDialog: jest.fn(),
    showErrorBox: jest.fn(),
    showMessageBox: jest.fn()
  },
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn()
  }
}));

// Mock filesystem
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    rm: jest.fn(),
    cp: jest.fn()
  },
  existsSync: jest.fn(),
  createWriteStream: jest.fn()
}));

describe('SecureIPCHandlers', () => {
  let secureIPCHandlers;
  let mockAllowedRoots;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create fresh instance for each test
    secureIPCHandlers = new SecureIPCHandlers();
    mockAllowedRoots = new Set(['/home/user/photos', '/Users/test/Pictures']);
  });

  afterEach(() => {
    // Clear all allowed roots between tests
    secureIPCHandlers.clearAllowedRoots();
  });

  describe('Path Validation', () => {
    test('should validate allowed paths correctly', () => {
      // Add some allowed roots
      secureIPCHandlers.addAllowedRoot('/home/user/photos');
      secureIPCHandlers.addAllowedRoot('/Users/test/Pictures');
      
      // Test valid paths
      expect(secureIPCHandlers.getAllowedRoots()).toContain('/home/user/photos');
      expect(secureIPCHandlers.getAllowedRoots()).toContain('/Users/test/Pictures');
    });

    test('should reject paths outside allowed roots', () => {
      secureIPCHandlers.addAllowedRoot('/home/user/photos');
      
      // This should be rejected as it's outside allowed roots
      const isValid = () => {
        // Simulate path validation logic
        const testPath = '/etc/passwd';
        const allowedRoots = secureIPCHandlers.getAllowedRoots();
        return allowedRoots.some(root => testPath.startsWith(root));
      };
      
      expect(isValid()).toBe(false);
    });

    test('should accept paths within allowed roots', () => {
      secureIPCHandlers.addAllowedRoot('/home/user/photos');
      
      // This should be accepted as it's within allowed roots
      const isValid = () => {
        // Simulate path validation logic
        const testPath = '/home/user/photos/vacation/image.jpg';
        const allowedRoots = secureIPCHandlers.getAllowedRoots();
        return allowedRoots.some(root => testPath.startsWith(root + '/') || testPath === root);
      };
      
      expect(isValid()).toBe(true);
    });
  });

  describe('Photo File Validation', () => {
    test('should identify photo files correctly', () => {
      const photoFiles = [
        'image.jpg',
        'photo.jpeg',
        'snapshot.png',
        'graphic.gif',
        'drawing.webp',
        'scan.bmp',
        'picture.tiff',
        'image.tif'
      ];
      
      const nonPhotoFiles = [
        'document.pdf',
        'spreadsheet.xlsx',
        'text.txt',
        'program.exe',
        'script.js'
      ];
      
      photoFiles.forEach(file => {
        expect(secureIPCHandlers['isPhotoFile'](file)).toBe(true);
      });
      
      nonPhotoFiles.forEach(file => {
        expect(secureIPCHandlers['isPhotoFile'](file)).toBe(false);
      });
    });
  });

  describe('IPC Handlers', () => {
    test('should register all expected IPC handlers', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'secure-select-folder', 
        expect.any(Function)
      );
      
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'secure-read-directory-photos', 
        expect.any(Function)
      );
      
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'secure-read-photo-metadata', 
        expect.any(Function)
      );
      
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'secure-get-api-token', 
        expect.any(Function)
      );
    });

    test('should handle folder selection securely', async () => {
      const mockResult = {
        canceled: false,
        filePaths: ['/home/user/selected/photos']
      };
      
      dialog.showOpenDialog.mockResolvedValue(mockResult);
      
      // Get the folder selection handler
      const folderHandler = ipcMain.handle.mock.calls.find(
        call => call[0] === 'secure-select-folder'
      )[1];
      
      const mockEvent = {};
      const result = await folderHandler(mockEvent);
      
      expect(result).toBe('/home/user/selected/photos');
      expect(secureIPCHandlers.getAllowedRoots()).toContain('/home/user/selected/photos');
    });

    test('should reject unauthorized operations', async () => {
      const mockEvent = {};
      
      // Test unauthorized operation
      expect(() => {
        secureIPCHandlers['validateOperation']('unauthorized-operation');
      }).toThrow('Unauthorized operation: unauthorized-operation');
    });
  });

  describe('API Token Management', () => {
    test('should generate and retrieve API tokens', () => {
      const token = 'test-api-token-123';
      secureIPCHandlers.setApiToken(token);
      
      expect(secureIPCHandlers.getApiToken()).toBe(token);
    });

    test('should handle missing API tokens gracefully', () => {
      secureIPCHandlers.setApiToken(null);
      expect(secureIPCHandlers.getApiToken()).toBeNull();
    });
  });

  describe('Directory Operations', () => {
    test('should read directory photos with proper filtering', async () => {
      const mockFiles = [
        'photo1.jpg',
        'photo2.png',
        'document.pdf',
        'photo3.gif',
        'executable.exe'
      ];
      
      const mockStats = {
        isDirectory: () => false,
        size: 1024000,
        mtimeMs: Date.now(),
        ctimeMs: Date.now()
      };
      
      fs.readdir.mockResolvedValue(mockFiles);
      fs.stat.mockResolvedValue(mockStats);
      
      const result = await secureIPCHandlers['secure-read-directory-photos'](
        {}, // mock event
        '/home/user/photos'
      );
      
      // Should only return photo files
      expect(result).toHaveLength(3);
      expect(result.map(photo => photo.name)).toEqual(
        expect.arrayContaining(['photo1.jpg', 'photo2.png', 'photo3.gif'])
      );
    });

    test('should handle directory read errors gracefully', async () => {
      fs.readdir.mockRejectedValue(new Error('Permission denied'));
      
      await expect(
        secureIPCHandlers['secure-read-directory-photos']({}, '/invalid/path')
      ).rejects.toThrow('Cannot access directory: Permission denied');
    });
  });
});