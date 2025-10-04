const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const Store = require('electron-store');
const windowStateKeeper = require('electron-window-state');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

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
        autoStartBackend: true,
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

        this.initializeApp();
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
            ? 'http://localhost:5173'
            : `file://${path.join(__dirname, 'app', 'index.html')}`;

        await this.mainWindow.loadURL(appPath);

        // Show window when ready
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();

            if (this.isDev) {
                this.mainWindow.webContents.openDevTools();
            }
        });

        // Create application menu
        this.createMenu();

        // Start backend if auto-start is enabled
        if (store.get('autoStartBackend')) {
            this.startBackend();
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
                        click: () => this.startBackend(),
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
        // Settings handlers
        ipcMain.handle('get-setting', (event, key) => {
            return store.get(key);
        });

        ipcMain.handle('set-setting', (event, key, value) => {
            store.set(key, value);
            return true;
        });

        // File system handlers
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
        ipcMain.handle('start-backend', () => this.startBackend());
        ipcMain.handle('stop-backend', () => this.stopBackend());
        ipcMain.handle('backend-status', () => ({
            running: this.isBackendRunning,
            port: this.backendPort
        }));

        // App control handlers
        ipcMain.handle('get-app-version', () => app.getVersion());
        ipcMain.handle('show-item-in-folder', (event, fullPath) => {
            shell.showItemInFolder(fullPath);
        });
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

    startBackend() {
        if (this.isBackendRunning) {
            log.info('Backend already running');
            return;
        }

        const backendPath = this.isDev
            ? path.join(__dirname, '..', 'photo-search-intent-first', 'api', 'server.py')
            : path.join(process.resourcesPath, 'backend', 'server.py');

        if (!fs.existsSync(backendPath)) {
            log.error('Backend not found at:', backendPath);
            this.showBackendError('Backend server not found');
            return;
        }

        try {
            this.backendProcess = spawn('python', [backendPath], {
                cwd: path.dirname(backendPath),
                stdio: ['pipe', 'pipe', 'pipe']
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
                this.updateBackendMenu();
            });

            this.isBackendRunning = true;
            this.updateBackendMenu();

            log.info('Backend started successfully');

            // Notify renderer
            this.mainWindow.webContents.send('backend-status-changed', {
                running: true,
                port: this.backendPort
            });

        } catch (error) {
            log.error('Failed to start backend:', error);
            this.showBackendError('Failed to start backend server');
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

        // Notify renderer
        this.mainWindow.webContents.send('backend-status-changed', {
            running: false,
            port: this.backendPort
        });
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