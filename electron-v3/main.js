const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const Store = require('electron-store');
const windowStateKeeper = require('electron-window-state');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

// Import our custom managers
const FileSystemManager = require('./lib/FileSystemManager');
const ThumbnailGenerator = require('./lib/ThumbnailGenerator');

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

// Initialize settings store
const store = new Store({
    defaults: {
        photoDirectories: [],
        lastPhotoDirectory: null,
        theme: 'system',
        windowBounds: { width: 1200, height: 800 },
        searchProvider: 'local',
        autoStartBackend: false,
        modelDownloadPath: path.join(__dirname, 'models'),
        lastSearch: '',
        recentSearches: []
    }
});

class PhotoSearchApp {
    constructor() {
        this.mainWindow = null;
        this.backendProcess = null;
        this.isBackendRunning = false;
        this.backendPort = 8000;
        this.isDev = process.env.NODE_ENV === 'development';

        // Initialize file system and thumbnail managers
        this.fileSystemManager = new FileSystemManager();
        this.thumbnailGenerator = new ThumbnailGenerator({
            cacheDir: path.join(app.getPath('userData'), 'thumbnails'),
            maxCacheSize: 1024 * 1024 * 1024, // 1GB
            concurrency: 3
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
        });
    }

    initializeApp() {
        // Handle app events
        app.whenReady().then(() => this.createWindow());
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

    async createWindow() {
        // Restore window state
        const mainWindowState = windowStateKeeper({
            defaultWidth: store.get('windowBounds.width'),
            defaultHeight: store.get('windowBounds.height')
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
        });

        // Initialize file system manager with existing directories
        const existingDirectories = store.get('photoDirectories') || [];
        for (const dirPath of existingDirectories) {
            this.fileSystemManager.addAllowedRoot(dirPath);
        }

        // Create application menu
        this.createMenu();

        // Start backend if auto-start is enabled
        const shouldAutoStart = Boolean(store.get('autoStartBackend'));
        if (shouldAutoStart) {
            log.info('Auto-start backend enabled; attempting to start Python service');
            this.startBackend(false);
        } else {
            log.info('Auto-start backend disabled; running in renderer-only mode');
            this.notifyBackendStatus();
        }

        // Handle external links
        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: 'deny' };
        });

        log.info('Main window created successfully');
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
        // Enhanced Settings handlers
        ipcMain.handle('get-setting', (event, key) => {
            return store.get(key);
        });

        ipcMain.handle('set-setting', (event, key, value) => {
            store.set(key, value);
            return true;
        });

        ipcMain.handle('get-all-settings', () => {
            return store.store;
        });

        ipcMain.handle('reset-settings', () => {
            store.clear();
            return true;
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

                // Update store
                const directories = store.get('photoDirectories') || [];
                const newDirectories = [...new Set([...directories, ...result.filePaths])];
                store.set('photoDirectories', newDirectories);

                return result.filePaths;
            }
            return null;
        });

        ipcMain.handle('get-photo-directories', () => {
            return store.get('photoDirectories') || [];
        });

        ipcMain.handle('add-photo-directory', (event, dirPath) => {
            try {
                this.fileSystemManager.addAllowedRoot(dirPath);
                const directories = store.get('photoDirectories') || [];
                const newDirectories = [...new Set([...directories, dirPath])];
                store.set('photoDirectories', newDirectories);
                return true;
            } catch (error) {
                log.error('Failed to add photo directory:', error);
                return false;
            }
        });

        ipcMain.handle('remove-photo-directory', (event, dirPath) => {
            try {
                this.fileSystemManager.removeAllowedRoot(dirPath);
                const directories = store.get('photoDirectories') || [];
                const newDirectories = directories.filter(dir => dir !== dirPath);
                store.set('photoDirectories', newDirectories);
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
            const directories = store.get('photoDirectories') || [];
            const newDirectories = [...new Set([...directories, ...result.filePaths])];
            store.set('photoDirectories', newDirectories);

            // Notify renderer about new directories
            this.mainWindow.webContents.send('photo-directories-updated', newDirectories);

            log.info('Added photo directories:', result.filePaths);
        }
    }

    async indexPhotos() {
        const directories = store.get('photoDirectories') || [];
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
            ? path.join(__dirname, '..')
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
            this.backendPort.toString()
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

        // Save window bounds
        if (this.mainWindow) {
            const bounds = this.mainWindow.getBounds();
            store.set('windowBounds', bounds);
        }

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
