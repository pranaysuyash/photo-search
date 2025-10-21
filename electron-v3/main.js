const { app, BrowserWindow, Menu, dialog, ipcMain, shell, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const fsSync = require('fs');
const { spawn } = require('child_process');
const Store = require('electron-store');
const windowStateKeeper = require('electron-window-state');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

// Import our custom managers
const FileSystemManager = require('./lib/FileSystemManager');
const ThumbnailGenerator = require('./lib/ThumbnailGenerator');
const SettingsEnhancer = require('./lib/SettingsEnhancer');
const StateManager = require('./lib/StateManager');
const ErrorHandler = require('./lib/ErrorHandler');

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

// Initialize enhanced settings store
const store = new Store({
    defaults: {
        // Version tracking
        version: '1.0.0',
        
        // Photo directories and workspace
        photoDirectories: [],
        lastPhotoDirectory: null,
        
        // Application preferences
        theme: 'system',
        language: 'en',
        autoStartBackend: true, // Auto-start backend for AI features in production
        
        // Search and AI settings
        searchProvider: 'local',
        enableSemanticSearch: true,
        enableFaceRecognition: true,
        enableOCR: true,
        searchResultLimit: 100,
        
        // Performance settings
        thumbnailQuality: 'medium',
        thumbnailSize: 300,
        maxConcurrentOperations: 4,
        cacheSize: 1024 * 1024 * 1024, // 1GB
        
        // Privacy settings
        allowTelemetry: false,
        allowCrashReports: false,
        
        // Advanced settings
        apiTimeout: 30000,
        retryAttempts: 3,
        debugMode: false,
        
        // Model and backend settings
        modelDownloadPath: path.join(__dirname, 'models'),
        backendPort: 8000,
        
        // Recent activity
        lastSearch: '',
        recentSearches: [],
        recentDirectories: [],
        bookmarkedDirectories: [],
        
        // First-time setup
        hasCompletedOnboarding: false,
        
        // Internal tracking
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
    },
    schema: {
        version: { type: 'string' },
        photoDirectories: { type: 'array', items: { type: 'string' } },
        theme: { type: 'string', enum: ['light', 'dark', 'system'] },
        language: { type: 'string' },
        autoStartBackend: { type: 'boolean' },
        searchProvider: { type: 'string', enum: ['local', 'openai', 'huggingface'] },
        enableSemanticSearch: { type: 'boolean' },
        enableFaceRecognition: { type: 'boolean' },
        enableOCR: { type: 'boolean' },
        searchResultLimit: { type: 'number', minimum: 10, maximum: 1000 },
        thumbnailQuality: { type: 'string', enum: ['low', 'medium', 'high'] },
        thumbnailSize: { type: 'number', minimum: 100, maximum: 800 },
        maxConcurrentOperations: { type: 'number', minimum: 1, maximum: 16 },
        cacheSize: { type: 'number', minimum: 100 * 1024 * 1024 }, // Min 100MB
        allowTelemetry: { type: 'boolean' },
        allowCrashReports: { type: 'boolean' },
        apiTimeout: { type: 'number', minimum: 5000, maximum: 120000 },
        retryAttempts: { type: 'number', minimum: 0, maximum: 10 },
        debugMode: { type: 'boolean' },
        backendPort: { type: 'number', minimum: 1024, maximum: 65535 },
        hasCompletedOnboarding: { type: 'boolean' }
    },
    clearInvalidConfig: true
});

class PhotoSearchApp {
    constructor() {
        this.mainWindow = null;
        this.backendProcess = null;
        this.isBackendRunning = false;
        this.isDev = process.env.NODE_ENV === 'development';

        // Initialize settings enhancer with the main store
        this.settingsEnhancer = new SettingsEnhancer(store);
        this.stateManager = new StateManager(this.settingsEnhancer);
        this.errorHandler = new ErrorHandler(this.settingsEnhancer, this.stateManager);
        this.backendPort = store.get('backendPort', 8000);

        // Initialize file system and thumbnail managers
        this.fileSystemManager = new FileSystemManager();
        this.thumbnailGenerator = new ThumbnailGenerator({
            cacheDir: path.join(app.getPath('userData'), 'thumbnails'),
            maxCacheSize: store.get('cacheSize', 1024 * 1024 * 1024),
            concurrency: store.get('maxConcurrentOperations', 3)
        });

        // Setup manager event listeners
        this.setupManagerEventListeners();

        this.initializeApp();
    }

    setupManagerEventListeners() {
        // File system manager events
        this.fileSystemManager.on('scan-progress', (progress) => {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('scan-progress', progress);
            }
        });

        this.fileSystemManager.on('allowed-roots-updated', (roots) => {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('photo-directories-updated', roots);
            }
        });

        // Thumbnail generator events
        this.thumbnailGenerator.on('thumbnail-generated', (data) => {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('thumbnail-generated', data);
            }
        });

        this.thumbnailGenerator.on('thumbnail-error', (error) => {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('file-system-error', error);
            }
        });

        this.thumbnailGenerator.on('cache-cleaned', (info) => {
            log.info('Thumbnail cache cleaned:', info);
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('thumbnail-cache-cleaned', info);
            }
        });

        this.thumbnailGenerator.on('queue-started', (info) => {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('thumbnail-queue-started', info);
            }
        });

        this.thumbnailGenerator.on('queue-progress', (progress) => {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('thumbnail-queue-progress', progress);
            }
        });

        this.thumbnailGenerator.on('queue-completed', (stats) => {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('thumbnail-queue-completed', stats);
            }
        });

        this.thumbnailGenerator.on('processing-paused', (info) => {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('thumbnail-processing-paused', info);
            }
        });

        this.thumbnailGenerator.on('processing-resumed', (info) => {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('thumbnail-processing-resumed', info);
            }
        });

        this.thumbnailGenerator.on('resource-monitor', (resourceInfo) => {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('thumbnail-resource-monitor', resourceInfo);
            }
        });

        this.thumbnailGenerator.on('batch-progress', (progress) => {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('thumbnail-batch-progress', progress);
            }
        });

        this.thumbnailGenerator.on('video-extraction-failed', (error) => {
            log.warn('Video thumbnail extraction failed:', error);
        });
    }

    initializeApp() {
        // Handle app events
        app.whenReady().then(() => {
            this.registerCustomProtocols();
            this.createWindow();
        });
        app.on('window-all-closed', () => this.handleWindowAllClosed());
        app.on('activate', () => this.handleActivate());
        app.on('before-quit', () => this.handleBeforeQuit());

        // Handle auto-updater events
        autoUpdater.checkForUpdatesAndNotify();
        autoUpdater.on('update-downloaded', () => {
            log.info('Update downloaded');
            this.showUpdateNotification();
        });

        // Setup IPC handlers
        this.setupIpcHandlers();
    }

    /**
     * Register custom protocols for secure file serving
     */
    registerCustomProtocols() {
        // Register photo-thumbnail protocol for serving thumbnail files
        protocol.registerFileProtocol('photo-thumbnail', (request, callback) => {
            try {
                // Decode the file path from the URL
                const url = request.url.substr('photo-thumbnail://'.length);
                const filePath = decodeURIComponent(url);
                
                // Validate that the file exists and is in the thumbnail cache directory
                if (!filePath.includes(this.thumbnailGenerator.cacheDir)) {
                    log.error('Attempted to access file outside thumbnail cache:', filePath);
                    callback({ error: -6 }); // FILE_NOT_FOUND
                    return;
                }
                
                // Check if file exists
                if (!fsSync.existsSync(filePath)) {
                    log.warn('Thumbnail file not found:', filePath);
                    callback({ error: -6 }); // FILE_NOT_FOUND
                    return;
                }
                
                callback({ path: filePath });
            } catch (error) {
                log.error('Error serving thumbnail:', error);
                callback({ error: -2 }); // GENERIC_FAILURE
            }
        });

        // Register photo-file protocol for serving original photo files
        protocol.registerFileProtocol('photo-file', (request, callback) => {
            try {
                // Decode the file path from the URL
                const url = request.url.substr('photo-file://'.length);
                const filePath = decodeURIComponent(url);
                
                // Validate that the file path is allowed (in one of the photo directories)
                const allowedRoots = this.fileSystemManager.getAllowedRoots();
                const isAllowed = allowedRoots.some(root => filePath.startsWith(root));
                
                if (!isAllowed) {
                    log.error('Attempted to access file outside allowed directories:', filePath);
                    callback({ error: -6 }); // FILE_NOT_FOUND
                    return;
                }
                
                // Check if file exists
                if (!fsSync.existsSync(filePath)) {
                    log.warn('Photo file not found:', filePath);
                    callback({ error: -6 }); // FILE_NOT_FOUND
                    return;
                }
                
                callback({ path: filePath });
            } catch (error) {
                log.error('Error serving photo file:', error);
                callback({ error: -2 }); // GENERIC_FAILURE
            }
        });

        log.info('Custom protocols registered successfully');
    }

    async createWindow() {
        // Start new session
        this.stateManager.startSession();
        
        // Restore window state
        const windowState = this.settingsEnhancer.getWindowState();
        const mainWindowState = windowStateKeeper({
            defaultWidth: windowState.bounds?.width || 1200,
            defaultHeight: windowState.bounds?.height || 800
        });

        // Create the browser window
        this.mainWindow = new BrowserWindow({
            x: mainWindowState.x,
            y: mainWindowState.y,
            width: mainWindowState.width,
            height: mainWindowState.height,
            minWidth: 800,
            minHeight: 600,
            show: false,
            titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                preload: path.join(__dirname, 'preload.js'),
                webSecurity: true
            }
        });

        // Let windowStateKeeper manage the window
        mainWindowState.manage(this.mainWindow);

        // Load the app
        const appPath = this.isDev
            ? 'http://localhost:5174'
            : `file://${path.join(__dirname, 'app', 'index.html')}`;

        this.mainWindow.webContents.once('did-finish-load', () => {
            this.notifyBackendStatus();
        });
        await this.mainWindow.loadURL(appPath);

        // Show window when ready
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();

            if (this.isDev) {
                this.mainWindow.webContents.openDevTools();
            }
            
            // Perform health check and corruption detection
            this.performStartupHealthCheck();
            
            // Restore complete application state
            const restoredState = this.stateManager.performCompleteRestore();
            if (restoredState) {
                this.mainWindow.webContents.send('state-restored', restoredState);
            }
        });

        // Initialize file system manager with existing directories
        const existingDirectories = store.get('photoDirectories', []);
        for (const dirPath of existingDirectories) {
            this.fileSystemManager.addAllowedRoot(dirPath);
        }

        // Create application menu
        this.createMenu();

        // Start backend automatically for AI features (can be disabled in settings)
        const shouldAutoStart = store.get('autoStartBackend', true);
        log.info(`Backend auto-start setting: ${shouldAutoStart}`);
        if (shouldAutoStart) {
            log.info('Starting backend for AI features (local-first with AI enhancement)');
            this.startBackend(false);
        } else {
            log.info('Running as local-first photo app - backend disabled (enable in menu for AI features)');
            this.notifyBackendStatus();
        }

        // Handle external links
        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: 'deny' };
        });

        // Set up window state tracking
        this.setupWindowStateTracking();

        log.info('Main window created successfully');
    }

    setupWindowStateTracking() {
        if (!this.mainWindow) return;

        // Save window state periodically and on events
        const saveState = () => {
            this.stateManager.saveWindowState(this.mainWindow);
        };

        // Save state on window events
        this.mainWindow.on('resize', saveState);
        this.mainWindow.on('move', saveState);
        this.mainWindow.on('maximize', saveState);
        this.mainWindow.on('unmaximize', saveState);
        this.mainWindow.on('enter-full-screen', saveState);
        this.mainWindow.on('leave-full-screen', saveState);
        this.mainWindow.on('minimize', saveState);
        this.mainWindow.on('restore', saveState);

        // Save state periodically (every 30 seconds)
        this.windowStateInterval = setInterval(saveState, 30000);
    }

    async performStartupHealthCheck() {
        try {
            log.info('Performing startup health check...');
            
            // Check for data corruption
            const corruptionResults = await this.errorHandler.detectAndRepairCorruption();
            
            // Perform general health check
            const healthResults = await this.errorHandler.performHealthCheck();
            
            // If there are issues, notify the renderer
            if (healthResults.status !== 'healthy') {
                this.mainWindow.webContents.send('health-check-warning', {
                    corruption: corruptionResults,
                    health: healthResults
                });
            }
            
            log.info('Startup health check completed');
        } catch (error) {
            log.error('Startup health check failed:', error);
            // Don't block startup for health check failures
        }
    }

    createMenu() {
        const template = [
            {
                label: 'File',
                submenu: [
                    {
                        label: 'Add Photo Directory',
                        accelerator: 'CmdOrCtrl+O',
                        click: () => this.selectPhotoDirectory()
                    },
                    {
                        label: 'Index Photos',
                        accelerator: 'CmdOrCtrl+I',
                        click: () => this.indexPhotos()
                    },
                    { type: 'separator' },
                    {
                        label: 'Settings',
                        accelerator: 'CmdOrCtrl+,',
                        click: () => this.showSettings()
                    },
                    { type: 'separator' },
                    {
                        label: 'Quit',
                        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                        click: () => app.quit()
                    }
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    { role: 'undo' },
                    { role: 'redo' },
                    { type: 'separator' },
                    { role: 'cut' },
                    { role: 'copy' },
                    { role: 'paste' },
                    { role: 'selectall' }
                ]
            },
            {
                label: 'View',
                submenu: [
                    { role: 'reload' },
                    { role: 'forceReload' },
                    { role: 'toggleDevTools' },
                    { type: 'separator' },
                    { role: 'resetZoom' },
                    { role: 'zoomIn' },
                    { role: 'zoomOut' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' }
                ]
            },
            {
                label: 'Backend',
                submenu: [
                    {
                        label: 'Start Backend',
                        click: () => this.startBackend(true),
                        enabled: !this.isBackendRunning
                    },
                    {
                        label: 'Stop Backend',
                        click: () => this.stopBackend(),
                        enabled: this.isBackendRunning
                    },
                    { type: 'separator' },
                    {
                        label: 'Toggle Auto-Start Backend',
                        type: 'checkbox',
                        checked: store.get('autoStartBackend', true),
                        click: (menuItem) => {
                            this.settingsEnhancer.safeSet('autoStartBackend', menuItem.checked);
                            log.info(`Auto-start backend ${menuItem.checked ? 'enabled' : 'disabled'}`);
                        }
                    },
                    {
                        label: 'Backend Status',
                        click: () => this.showBackendStatus()
                    }
                ]
            },
            {
                label: 'Help',
                submenu: [
                    {
                        label: 'About Photo Search',
                        click: () => this.showAbout()
                    },
                    {
                        label: 'Check for Updates',
                        click: () => autoUpdater.checkForUpdatesAndNotify()
                    }
                ]
            }
        ];

        // macOS specific menu adjustments
        if (process.platform === 'darwin') {
            template.unshift({
                label: app.getName(),
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services', submenu: [] },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideothers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' }
                ]
            });
        }

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    setupIpcHandlers() {
        // Enhanced Settings handlers with error handling
        ipcMain.handle('get-setting', (event, key) => {
            try {
                return this.settingsEnhancer.safeGet(key);
            } catch (error) {
                log.error(`Failed to get setting ${key}:`, error);
                this.errorHandler.handleStorageWriteFailure('settings', error);
                throw error;
            }
        });

        ipcMain.handle('set-setting', async (event, key, value) => {
            try {
                const result = this.settingsEnhancer.safeSet(key, value);
                if (!result) {
                    throw new Error(`Failed to set setting ${key}`);
                }
                return result;
            } catch (error) {
                log.error(`Failed to set setting ${key}:`, error);
                const recovered = await this.errorHandler.handleStorageWriteFailure('settings', error, { [key]: value });
                if (!recovered) {
                    throw error;
                }
                return true;
            }
        });

        ipcMain.handle('get-all-settings', () => {
            return store.store;
        });

        ipcMain.handle('reset-settings', () => {
            return this.settingsEnhancer.restoreDefaults();
        });

        // Additional settings handlers
        ipcMain.handle('get-preference', (event, key, defaultValue) => {
            return this.settingsEnhancer.getPreference(key, defaultValue);
        });

        ipcMain.handle('set-preference', (event, key, value) => {
            return this.settingsEnhancer.setPreference(key, value);
        });

        ipcMain.handle('get-all-preferences', () => {
            return this.settingsEnhancer.getAllPreferences();
        });

        ipcMain.handle('export-settings', () => {
            try {
                return this.settingsEnhancer.exportSettings();
            } catch (error) {
                log.error('Failed to export settings:', error);
                throw error;
            }
        });

        ipcMain.handle('import-settings', (event, jsonData) => {
            try {
                return this.settingsEnhancer.importSettings(jsonData);
            } catch (error) {
                log.error('Failed to import settings:', error);
                throw error;
            }
        });

        ipcMain.handle('get-backup-list', () => {
            return this.settingsEnhancer.getBackupList();
        });

        ipcMain.handle('restore-from-backup', (event, backupId) => {
            try {
                return this.settingsEnhancer.restoreFromBackup(backupId);
            } catch (error) {
                log.error('Failed to restore from backup:', error);
                throw error;
            }
        });

        ipcMain.handle('settings-health-check', () => {
            return this.settingsEnhancer.healthCheck();
        });

        // State Management handlers
        ipcMain.handle('save-application-state', (event, state) => {
            this.stateManager.saveApplicationState(state);
            return true;
        });

        ipcMain.handle('restore-application-state', () => {
            return this.stateManager.restoreApplicationState();
        });

        ipcMain.handle('get-recent-activity', () => {
            return this.stateManager.getRecentActivity();
        });

        ipcMain.handle('add-recent-directory', (event, dirPath) => {
            this.stateManager.addRecentDirectory(dirPath);
            return true;
        });

        ipcMain.handle('add-recent-search', (event, query) => {
            this.stateManager.addRecentSearch(query);
            return true;
        });

        ipcMain.handle('add-recent-file', (event, filePath, metadata) => {
            this.stateManager.addRecentFile(filePath, metadata);
            return true;
        });

        ipcMain.handle('add-bookmark', (event, path, name) => {
            return this.stateManager.addBookmark(path, name);
        });

        ipcMain.handle('remove-bookmark', (event, path) => {
            return this.stateManager.removeBookmark(path);
        });

        ipcMain.handle('get-bookmarks', () => {
            return this.stateManager.getBookmarks();
        });

        ipcMain.handle('export-state', () => {
            try {
                return this.stateManager.exportState();
            } catch (error) {
                log.error('Failed to export state:', error);
                throw error;
            }
        });

        ipcMain.handle('import-state', (event, stateData) => {
            try {
                return this.stateManager.importState(stateData);
            } catch (error) {
                log.error('Failed to import state:', error);
                throw error;
            }
        });

        // Error handling and recovery handlers
        ipcMain.handle('detect-corruption', async () => {
            try {
                return await this.errorHandler.detectAndRepairCorruption();
            } catch (error) {
                log.error('Failed to detect corruption:', error);
                throw error;
            }
        });

        ipcMain.handle('create-emergency-backup', async () => {
            try {
                return await this.errorHandler.createEmergencyBackup();
            } catch (error) {
                log.error('Failed to create emergency backup:', error);
                throw error;
            }
        });

        ipcMain.handle('perform-health-check', async () => {
            try {
                return await this.errorHandler.performHealthCheck();
            } catch (error) {
                log.error('Failed to perform health check:', error);
                throw error;
            }
        });

        ipcMain.handle('get-error-log', () => {
            return this.errorHandler.getErrorLog();
        });

        ipcMain.handle('clear-error-log', () => {
            this.errorHandler.clearErrorLog();
            return true;
        });

        ipcMain.handle('get-recovery-stats', () => {
            return this.errorHandler.getRecoveryStats();
        });

        // Enhanced Directory Management
        ipcMain.handle('select-photo-directories', async () => {
            const result = await dialog.showOpenDialog(this.mainWindow, {
                properties: ['openDirectory', 'multiSelections'],
                title: 'Select Photo Directories'
            });

            if (!result.canceled && result.filePaths.length > 0) {
                // Add to file system manager
                for (const dirPath of result.filePaths) {
                    this.fileSystemManager.addAllowedRoot(dirPath);
                }

                // Update settings
                const directories = store.get('photoDirectories', []);
                const newDirectories = [...new Set([...directories, ...result.filePaths])];
                this.settingsEnhancer.safeSet('photoDirectories', newDirectories);

                return result.filePaths;
            }
            return null;
        });

        ipcMain.handle('get-photo-directories', () => {
            return store.get('photoDirectories', []);
        });

        ipcMain.handle('add-photo-directory', (event, dirPath) => {
            try {
                this.fileSystemManager.addAllowedRoot(dirPath);
                const directories = store.get('photoDirectories', []);
                const newDirectories = [...new Set([...directories, dirPath])];
                this.settingsEnhancer.safeSet('photoDirectories', newDirectories);
                return true;
            } catch (error) {
                log.error('Failed to add photo directory:', error);
                return false;
            }
        });

        ipcMain.handle('remove-photo-directory', (event, dirPath) => {
            try {
                this.fileSystemManager.removeAllowedRoot(dirPath);
                const directories = store.get('photoDirectories', []);
                const newDirectories = directories.filter(dir => dir !== dirPath);
                this.settingsEnhancer.safeSet('photoDirectories', newDirectories);
                return true;
            } catch (error) {
                log.error('Failed to remove photo directory:', error);
                return false;
            }
        });

        ipcMain.handle('validate-directory-access', (event, dirPath) => {
            const validation = this.fileSystemManager.validatePath(dirPath);
            return validation;
        });

        // File System Operations
        ipcMain.handle('scan-directory', async (event, dirPath, options) => {
            try {
                return await this.fileSystemManager.scanDirectory(dirPath, options);
            } catch (error) {
                log.error('Directory scan failed:', error);
                throw error;
            }
        });

        ipcMain.handle('get-file-metadata', async (event, filePath) => {
            try {
                return await this.fileSystemManager.getFileMetadata(filePath);
            } catch (error) {
                log.error('Failed to get file metadata:', error);
                throw error;
            }
        });

        ipcMain.handle('validate-file-path', (event, filePath) => {
            return this.fileSystemManager.validatePath(filePath);
        });

        ipcMain.handle('get-directory-contents', async (event, dirPath, options) => {
            try {
                return await this.fileSystemManager.getDirectoryContents(dirPath, options);
            } catch (error) {
                log.error('Failed to get directory contents:', error);
                throw error;
            }
        });

        // Thumbnail Operations
        ipcMain.handle('get-thumbnail-path', (event, filePath, size) => {
            return this.thumbnailGenerator.getThumbnailPath(filePath, size);
        });

        ipcMain.handle('generate-thumbnail', async (event, filePath, size) => {
            try {
                return await this.thumbnailGenerator.generateThumbnail(filePath, size);
            } catch (error) {
                log.error('Thumbnail generation failed:', error);
                throw error;
            }
        });

        ipcMain.handle('get-thumbnail-url', async (event, filePath, size) => {
            try {
                const thumbnailPath = await this.thumbnailGenerator.generateThumbnail(filePath, size);
                return this.thumbnailGenerator.getThumbnailUrl(filePath, size);
            } catch (error) {
                log.error('Failed to get thumbnail URL:', error);
                throw error;
            }
        });

        ipcMain.handle('clear-thumbnail-cache', async () => {
            try {
                return await this.thumbnailGenerator.clearCache();
            } catch (error) {
                log.error('Failed to clear thumbnail cache:', error);
                return false;
            }
        });

        ipcMain.handle('get-thumbnail-cache-info', () => {
            return this.thumbnailGenerator.getCacheInfo();
        });

        ipcMain.handle('preload-thumbnails', async (event, filePaths, sizes) => {
            try {
                return await this.thumbnailGenerator.preloadThumbnails(filePaths, sizes);
            } catch (error) {
                log.error('Failed to preload thumbnails:', error);
                throw error;
            }
        });

        // Enhanced thumbnail processing controls
        ipcMain.handle('pause-thumbnail-processing', () => {
            this.thumbnailGenerator.pauseProcessing();
            return true;
        });

        ipcMain.handle('resume-thumbnail-processing', () => {
            this.thumbnailGenerator.resumeProcessing();
            return true;
        });

        ipcMain.handle('set-thumbnail-concurrency', (event, concurrency) => {
            try {
                this.thumbnailGenerator.setConcurrency(concurrency);
                return true;
            } catch (error) {
                log.error('Failed to set thumbnail concurrency:', error);
                return false;
            }
        });

        ipcMain.handle('get-thumbnail-processing-stats', () => {
            return this.thumbnailGenerator.getProcessingStats();
        });

        ipcMain.handle('get-thumbnail-worker-stats', () => {
            return this.thumbnailGenerator.getWorkerStats();
        });

        ipcMain.handle('get-thumbnail-cache-health', () => {
            return this.thumbnailGenerator.getCacheHealth();
        });

        ipcMain.handle('optimize-thumbnail-queue', () => {
            return this.thumbnailGenerator.optimizeQueue();
        });

        ipcMain.handle('validate-thumbnail-cache', async () => {
            try {
                await this.thumbnailGenerator.validateCache();
                return true;
            } catch (error) {
                log.error('Failed to validate thumbnail cache:', error);
                return false;
            }
        });

        ipcMain.handle('batch-process-thumbnails', async (event, filePaths, options) => {
            try {
                return await this.thumbnailGenerator.batchProcess(filePaths, options);
            } catch (error) {
                log.error('Failed to batch process thumbnails:', error);
                throw error;
            }
        });

        ipcMain.handle('cancel-thumbnail-jobs', () => {
            return this.thumbnailGenerator.cancelAllJobs();
        });

        ipcMain.handle('start-resource-monitoring', (event, intervalMs) => {
            this.thumbnailGenerator.startResourceMonitoring(intervalMs);
            return true;
        });

        ipcMain.handle('stop-resource-monitoring', () => {
            this.thumbnailGenerator.stopResourceMonitoring();
            return true;
        });

        // File URL Generation
        ipcMain.handle('get-file-url', (event, filePath) => {
            try {
                return this.fileSystemManager.generateSecureFileUrl(filePath);
            } catch (error) {
                log.error('Failed to generate file URL:', error);
                throw error;
            }
        });

        ipcMain.handle('get-secure-file-url', (event, filePath) => {
            try {
                return this.fileSystemManager.generateSecureFileUrl(filePath);
            } catch (error) {
                log.error('Failed to generate secure file URL:', error);
                throw error;
            }
        });

        // Legacy handlers (for backward compatibility)
        ipcMain.handle('select-directory', async () => {
            const result = await dialog.showOpenDialog(this.mainWindow, {
                properties: ['openDirectory', 'multiSelections'],
                title: 'Select Photo Directories'
            });

            if (!result.canceled) {
                const directories = store.get('photoDirectories') || [];
                const newDirectories = [...new Set([...directories, ...result.filePaths])];
                store.set('photoDirectories', newDirectories);
                return result.filePaths;
            }
            return null;
        });

        // Backend control handlers
        ipcMain.handle('start-backend', () => this.startBackend(true));
        ipcMain.handle('stop-backend', () => this.stopBackend());
        ipcMain.handle('backend-status', () => ({
            running: this.isBackendRunning,
            port: this.backendPort
        }));

        // API configuration handlers
        ipcMain.handle('get-api-config', () => {
            const baseUrl = this.isBackendRunning 
                ? `http://127.0.0.1:${this.backendPort}`
                : null;
            return {
                base: baseUrl,
                token: store.get('apiToken', ''),
                available: this.isBackendRunning
            };
        });

        ipcMain.handle('get-api-token', () => {
            return store.get('apiToken', '');
        });

        ipcMain.handle('set-api-config', (event, config) => {
            try {
                if (config.token) {
                    store.set('apiToken', config.token);
                }
                if (config.port) {
                    store.set('backendPort', config.port);
                    this.backendPort = config.port;
                }
                return true;
            } catch (error) {
                log.error('Failed to set API config:', error);
                return false;
            }
        });

        // App control handlers
        ipcMain.handle('get-app-version', () => app.getVersion());
        ipcMain.handle('get-app-info', () => ({
            version: app.getVersion(),
            name: app.getName(),
            platform: process.platform,
            arch: process.arch,
            electronVersion: process.versions.electron,
            nodeVersion: process.versions.node
        }));

        ipcMain.handle('show-item-in-folder', (event, fullPath) => {
            shell.showItemInFolder(fullPath);
        });

        // Development handlers
        if (this.isDev) {
            ipcMain.handle('open-dev-tools', () => {
                if (this.mainWindow) {
                    this.mainWindow.webContents.openDevTools();
                }
            });

            ipcMain.handle('reload-app', () => {
                if (this.mainWindow) {
                    this.mainWindow.reload();
                }
            });
        }
    }

    async selectPhotoDirectory() {
        const result = await dialog.showOpenDialog(this.mainWindow, {
            properties: ['openDirectory', 'multiSelections'],
            title: 'Select Photo Directories'
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const directories = store.get('photoDirectories', []);
            const newDirectories = [...new Set([...directories, ...result.filePaths])];
            this.settingsEnhancer.safeSet('photoDirectories', newDirectories);

            // Add to file system manager
            for (const dirPath of result.filePaths) {
                this.fileSystemManager.addAllowedRoot(dirPath);
            }

            // Notify renderer about new directories
            this.mainWindow.webContents.send('photo-directories-updated', newDirectories);

            log.info('Added photo directories:', result.filePaths);
        }
    }

    async indexPhotos() {
        const directories = store.get('photoDirectories', []);
        if (directories.length === 0) {
            dialog.showMessageBox(this.mainWindow, {
                type: 'warning',
                title: 'No Photo Directories',
                message: 'Please add photo directories first.',
                buttons: ['OK', 'Add Directory']
            }).then((result) => {
                if (result.response === 1) {
                    this.selectPhotoDirectory();
                }
            });
            return;
        }

        // Show indexing dialog
        dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'Indexing Photos',
            message: 'Photo indexing will start in the background. This may take a while for large collections.',
            buttons: ['OK']
        });

        // Notify renderer to start indexing
        this.mainWindow.webContents.send('start-indexing', directories);
    }

    startBackend(manual = false) {
        if (this.isBackendRunning) {
            log.info('Backend already running');
            this.notifyBackendStatus();
            return;
        }

        const backendDir = this.isDev
            ? path.join(__dirname, '..', '..', 'photo-search-intent-first')
            : path.join(process.resourcesPath, 'backend');

        log.info('Looking for backend in directory:', backendDir);
        if (!fs.existsSync(backendDir)) {
            const message = `Backend directory not found at: ${backendDir}`;
            log.warn(message);
            if (manual) {
                this.showBackendError(message);
            }
            this.notifyBackendStatus();
            return;
        }

        const serverPath = path.join(backendDir, 'api', 'server.py');
        if (!fs.existsSync(serverPath)) {
            const message = `Backend server file not found at: ${serverPath}`;
            log.warn(message);
            if (manual) {
                this.showBackendError(message);
            }
            this.notifyBackendStatus();
            return;
        }

        let pythonExecutable = path.join(backendDir, '.venv', 'bin', 'python');
        if (process.platform === 'win32') {
            pythonExecutable = path.join(backendDir, '.venv', 'Scripts', 'python.exe');
        }

        if (!fs.existsSync(pythonExecutable)) {
            const fallback = process.platform === 'win32' ? 'python' : 'python3';
            log.warn(`Virtual environment Python not found at ${pythonExecutable}; falling back to ${fallback}`);
            pythonExecutable = fallback;
        }

        const args = [
            '-m',
            'uvicorn',
            'api.server:app',
            '--host',
            '127.0.0.1',
            '--port',
            store.get('backendPort', 8000).toString()
        ];

        if (this.isDev) {
            args.push('--reload');
        }

        try {
            this.backendProcess = spawn(pythonExecutable, args, {
                cwd: backendDir,
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    PYTHONPATH: process.env.PYTHONPATH
                        ? `${backendDir}${path.delimiter}${process.env.PYTHONPATH}`
                        : backendDir
                }
            });

            this.backendProcess.stdout.on('data', (data) => {
                log.info('Backend stdout:', data.toString());
            });

            this.backendProcess.stderr.on('data', (data) => {
                log.error('Backend stderr:', data.toString());
            });

            this.backendProcess.on('close', (code) => {
                log.info(`Backend process exited with code ${code}`);
                this.isBackendRunning = false;
                this.backendProcess = null;
                this.updateBackendMenu();
                this.notifyBackendStatus();
            });

            this.backendProcess.on('error', (error) => {
                log.error('Backend process error:', error);
            });

            this.isBackendRunning = true;
            this.updateBackendMenu();

            log.info('Backend started successfully');
            this.notifyBackendStatus();
        } catch (error) {
            log.error('Failed to start backend:', error);
            this.backendProcess = null;
            this.isBackendRunning = false;
            this.updateBackendMenu();
            this.notifyBackendStatus();
            if (manual) {
                this.showBackendError('Failed to start backend server');
            }
        }
    }

    stopBackend() {
        if (!this.isBackendRunning || !this.backendProcess) {
            return;
        }

        this.backendProcess.kill();
        this.isBackendRunning = false;
        this.backendProcess = null;
        this.updateBackendMenu();

        log.info('Backend stopped');

        this.notifyBackendStatus();
    }

    updateBackendMenu() {
        // Update menu items based on backend status
        const menu = Menu.getApplicationMenu();
        if (menu) {
            const backendMenu = menu.items.find(item => item.label === 'Backend');
            if (backendMenu) {
                backendMenu.submenu.items[0].enabled = !this.isBackendRunning; // Start
                backendMenu.submenu.items[1].enabled = this.isBackendRunning;  // Stop
            }
        }
    }

    notifyBackendStatus() {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) {
            return;
        }

        try {
            this.mainWindow.webContents.send('backend-status-changed', {
                running: this.isBackendRunning,
                port: this.backendPort
            });
        } catch (error) {
            log.warn('Unable to notify renderer about backend status:', error);
        }
    }

    showBackendError(message) {
        dialog.showErrorBox('Backend Error', message);
    }

    showBackendStatus() {
        const status = this.isBackendRunning ? 'Running' : 'Stopped';
        const port = this.isBackendRunning ? `:${this.backendPort}` : '';

        dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'Backend Status',
            message: `Backend is ${status}${port}`,
            buttons: ['OK']
        });
    }

    showSettings() {
        // Send message to renderer to show settings modal
        this.mainWindow.webContents.send('show-settings');
    }

    showAbout() {
        dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'About Photo Search',
            message: 'Photo Search Desktop',
            detail: `Version: ${app.getVersion()}\\nA powerful AI-powered photo search application.`,
            buttons: ['OK']
        });
    }

    showUpdateNotification() {
        dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'Update Available',
            message: 'A new version has been downloaded. Restart the application to apply the update.',
            buttons: ['Restart Now', 'Later']
        }).then((result) => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall();
            }
        });
    }

    handleWindowAllClosed() {
        if (process.platform !== 'darwin') {
            this.cleanup();
            app.quit();
        }
    }

    handleActivate() {
        if (BrowserWindow.getAllWindows().length === 0) {
            this.createWindow();
        }
    }

    handleBeforeQuit() {
        this.cleanup();
    }

    cleanup() {
        if (this.backendProcess) {
            this.stopBackend();
        }

        // Clear window state tracking interval
        if (this.windowStateInterval) {
            clearInterval(this.windowStateInterval);
        }

        // Save final window state and end session
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            const bounds = this.mainWindow.getBounds();
            const isMaximized = this.mainWindow.isMaximized();
            const isFullScreen = this.mainWindow.isFullScreen();
            
            const finalWindowState = {
                bounds,
                isMaximized,
                isFullScreen
            };
            
            this.settingsEnhancer.setWindowState(finalWindowState);
            this.stateManager.endSession(finalWindowState);
        }

        // Cleanup old data
        this.stateManager.cleanup();

        log.info('App cleanup completed');
    }
}

// Create app instance
new PhotoSearchApp();

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (url.startsWith('https://localhost') || url.startsWith('https://127.0.0.1')) {
        // Allow self-signed certificates for local development
        event.preventDefault();
        callback(true);
    } else {
        callback(false);
    }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
        shell.openExternal(navigationUrl);
    });
});
