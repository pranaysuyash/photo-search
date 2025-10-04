const { app, BrowserWindow, Menu, dialog, ipcMain, shell, protocol } = require('electron')
const { autoUpdater } = require('electron-updater')
const windowStateKeeper = require('electron-window-state')
const log = require('electron-log')
const Store = require('electron-store')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

// Configure logging
log.transports.file.level = 'info'
autoUpdater.logger = log

// Initialize store for app settings
const store = new Store({
    defaults: {
        photoDirectories: [],
        lastSelectedDirectory: null,
        windowBounds: { width: 1400, height: 900 },
        theme: 'system',
        searchProvider: 'local',
        enableAnalytics: true,
        autoIndexing: true
    }
})

class PhotoSearchApp {
    constructor() {
        this.mainWindow = null
        this.backendProcess = null
        this.isQuitting = false
        this.isDevelopment = process.env.NODE_ENV === 'development'

        this.setupApp()
    }

    setupApp() {
        // Handle app ready
        app.whenReady().then(() => {
            this.createMainWindow()
            this.setupMenu()
            this.setupAutoUpdater()
            this.setupProtocols()
            this.startBackendServer()

            // macOS specific: recreate window when dock icon is clicked
            app.on('activate', () => {
                if (BrowserWindow.getAllWindows().length === 0) {
                    this.createMainWindow()
                }
            })
        })

        // Handle app closing
        app.on('before-quit', () => {
            this.isQuitting = true
            this.stopBackendServer()
        })

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit()
            }
        })

        // Security: prevent new window creation
        app.on('web-contents-created', (event, contents) => {
            contents.on('new-window', (navigationEvent, navigationUrl) => {
                navigationEvent.preventDefault()
                shell.openExternal(navigationUrl)
            })
        })
    }

    createMainWindow() {
        // Load window state
        const mainWindowState = windowStateKeeper({
            defaultWidth: store.get('windowBounds.width', 1400),
            defaultHeight: store.get('windowBounds.height', 900)
        })

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
                webSecurity: true,
                allowRunningInsecureContent: false
            },
            icon: this.getAppIcon()
        })

        // Let windowStateKeeper manage the window
        mainWindowState.manage(this.mainWindow)

        // Load the app
        this.loadApp()

        // Show window when ready
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show()

            if (this.isDevelopment) {
                this.mainWindow.webContents.openDevTools()
            }
        })

        // Handle window closed
        this.mainWindow.on('closed', () => {
            this.mainWindow = null
        })

        // Handle window minimize/restore on macOS
        this.mainWindow.on('close', (event) => {
            if (process.platform === 'darwin' && !this.isQuitting) {
                event.preventDefault()
                this.mainWindow.hide()
            }
        })

        // Save window bounds on resize/move
        this.mainWindow.on('resize', () => {
            const bounds = this.mainWindow.getBounds()
            store.set('windowBounds', bounds)
        })

        this.mainWindow.on('moved', () => {
            const bounds = this.mainWindow.getBounds()
            store.set('windowBounds', bounds)
        })
    }

    getAppIcon() {
        const iconPath = path.join(__dirname, 'assets')

        if (process.platform === 'darwin') {
            return path.join(iconPath, 'icon.icns')
        } else if (process.platform === 'win32') {
            return path.join(iconPath, 'icon.ico')
        } else {
            return path.join(iconPath, 'icon.png')
        }
    }

    loadApp() {
        const isDev = this.isDevelopment

        if (isDev) {
            // Development: load from Vite dev server
            this.mainWindow.loadURL('http://127.0.0.1:5174')
        } else {
            // Production: load from built files
            const appPath = path.join(__dirname, 'app', 'index.html')
            this.mainWindow.loadFile(appPath)
        }
    }

    setupMenu() {
        const template = [
            {
                label: 'File',
                submenu: [
                    {
                        label: 'Open Photo Library...',
                        accelerator: 'CmdOrCtrl+O',
                        click: () => this.openPhotoDirectory()
                    },
                    {
                        label: 'Import Photos...',
                        accelerator: 'CmdOrCtrl+I',
                        click: () => this.importPhotos()
                    },
                    { type: 'separator' },
                    {
                        label: 'New Search',
                        accelerator: 'CmdOrCtrl+F',
                        click: () => this.focusSearch()
                    },
                    { type: 'separator' },
                    {
                        label: 'Export Library...',
                        click: () => this.exportLibrary()
                    },
                    { type: 'separator' },
                    process.platform === 'darwin'
                        ? { role: 'close' }
                        : { role: 'quit' }
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
                    { role: 'togglefullscreen' },
                    { type: 'separator' },
                    {
                        label: 'Grid View',
                        accelerator: 'CmdOrCtrl+1',
                        click: () => this.setViewMode('grid')
                    },
                    {
                        label: 'List View',
                        accelerator: 'CmdOrCtrl+2',
                        click: () => this.setViewMode('list')
                    }
                ]
            },
            {
                label: 'Search',
                submenu: [
                    {
                        label: 'Smart Search',
                        accelerator: 'CmdOrCtrl+Shift+F',
                        click: () => this.smartSearch()
                    },
                    {
                        label: 'Search by People',
                        accelerator: 'CmdOrCtrl+P',
                        click: () => this.searchByPeople()
                    },
                    {
                        label: 'Search by Places',
                        accelerator: 'CmdOrCtrl+L',
                        click: () => this.searchByPlaces()
                    },
                    { type: 'separator' },
                    {
                        label: 'Rebuild Index',
                        click: () => this.rebuildIndex()
                    }
                ]
            },
            {
                label: 'Tools',
                submenu: [
                    {
                        label: 'Preferences...',
                        accelerator: process.platform === 'darwin' ? 'Cmd+,' : 'Ctrl+,',
                        click: () => this.openPreferences()
                    },
                    { type: 'separator' },
                    {
                        label: 'Check for Updates...',
                        click: () => this.checkForUpdates()
                    }
                ]
            },
            {
                label: 'Window',
                submenu: [
                    { role: 'minimize' },
                    { role: 'close' }
                ]
            },
            {
                role: 'help',
                submenu: [
                    {
                        label: 'About Photo Search',
                        click: () => this.showAbout()
                    },
                    {
                        label: 'Learn More',
                        click: () => shell.openExternal('https://photosearch.app')
                    }
                ]
            }
        ]

        // macOS specific menu adjustments
        if (process.platform === 'darwin') {
            template.unshift({
                label: app.getName(),
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideOthers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' }
                ]
            })

            // Window menu
            template[6].submenu = [
                { role: 'close' },
                { role: 'minimize' },
                { role: 'zoom' },
                { type: 'separator' },
                { role: 'front' }
            ]
        }

        const menu = Menu.buildFromTemplate(template)
        Menu.setApplicationMenu(menu)
    }

    setupAutoUpdater() {
        if (this.isDevelopment) return

        autoUpdater.checkForUpdatesAndNotify()

        autoUpdater.on('update-available', () => {
            dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: 'Update Available',
                message: 'A new version is available. It will be downloaded in the background.',
                buttons: ['OK']
            })
        })

        autoUpdater.on('update-downloaded', () => {
            dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: 'Update Ready',
                message: 'Update downloaded. The application will restart to apply the update.',
                buttons: ['Restart Now', 'Later']
            }).then((result) => {
                if (result.response === 0) {
                    autoUpdater.quitAndInstall()
                }
            })
        })
    }

    setupProtocols() {
        // Register custom protocol for local file access
        protocol.registerFileProtocol('photoapp', (request, callback) => {
            const url = request.url.substr(10) // Remove 'photoapp://'
            callback({ path: path.normalize(url) })
        })
    }

    startBackendServer() {
        if (this.isDevelopment) {
            // In development, assume backend is started separately
            log.info('Development mode: assuming backend server is running on port 8000')
            return
        }

        // In production, start the Python backend
        const pythonPath = this.getPythonPath()
        const serverPath = path.join(__dirname, '..', 'api', 'server.py')

        this.backendProcess = spawn(pythonPath, [serverPath], {
            cwd: path.join(__dirname, '..'),
            env: { ...process.env, PYTHONPATH: path.join(__dirname, '..') }
        })

        this.backendProcess.stdout.on('data', (data) => {
            log.info('Backend:', data.toString())
        })

        this.backendProcess.stderr.on('data', (data) => {
            log.error('Backend Error:', data.toString())
        })

        this.backendProcess.on('close', (code) => {
            log.info(`Backend process exited with code ${code}`)
        })
    }

    stopBackendServer() {
        if (this.backendProcess) {
            this.backendProcess.kill()
            this.backendProcess = null
        }
    }

    getPythonPath() {
        // Try to find Python executable
        const possiblePaths = [
            path.join(__dirname, '..', '.venv', 'bin', 'python'),
            path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe'),
            'python3',
            'python'
        ]

        for (const pythonPath of possiblePaths) {
            if (fs.existsSync(pythonPath)) {
                return pythonPath
            }
        }

        return 'python3' // Fallback
    }

    // Menu action handlers
    async openPhotoDirectory() {
        const result = await dialog.showOpenDialog(this.mainWindow, {
            properties: ['openDirectory'],
            title: 'Select Photo Library Folder'
        })

        if (!result.canceled && result.filePaths.length > 0) {
            const directory = result.filePaths[0]
            store.set('lastSelectedDirectory', directory)

            // Add to recent directories
            const recent = store.get('photoDirectories', [])
            const updated = [directory, ...recent.filter(d => d !== directory)].slice(0, 10)
            store.set('photoDirectories', updated)

            // Send to renderer
            this.mainWindow.webContents.send('directory-selected', directory)
        }
    }

    async importPhotos() {
        const result = await dialog.showOpenDialog(this.mainWindow, {
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            title: 'Import Photos'
        })

        if (!result.canceled && result.filePaths.length > 0) {
            this.mainWindow.webContents.send('photos-import', result.filePaths)
        }
    }

    focusSearch() {
        this.mainWindow.webContents.send('focus-search')
    }

    setViewMode(mode) {
        this.mainWindow.webContents.send('set-view-mode', mode)
    }

    smartSearch() {
        this.mainWindow.webContents.send('smart-search')
    }

    searchByPeople() {
        this.mainWindow.webContents.send('search-by-people')
    }

    searchByPlaces() {
        this.mainWindow.webContents.send('search-by-places')
    }

    rebuildIndex() {
        this.mainWindow.webContents.send('rebuild-index')
    }

    exportLibrary() {
        this.mainWindow.webContents.send('export-library')
    }

    openPreferences() {
        this.mainWindow.webContents.send('open-preferences')
    }

    checkForUpdates() {
        if (this.isDevelopment) {
            dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: 'Development Mode',
                message: 'Update checking is disabled in development mode.',
                buttons: ['OK']
            })
        } else {
            autoUpdater.checkForUpdatesAndNotify()
        }
    }

    showAbout() {
        dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'About Photo Search',
            message: 'Photo Search',
            detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}\nChrome: ${process.versions.chrome}`,
            buttons: ['OK']
        })
    }
}

// Create app instance
const photoSearchApp = new PhotoSearchApp()

// IPC Handlers for renderer communication
ipcMain.handle('get-app-version', () => app.getVersion())
ipcMain.handle('get-user-data-path', () => app.getPath('userData'))
ipcMain.handle('get-pictures-path', () => app.getPath('pictures'))
ipcMain.handle('get-store-value', (event, key) => store.get(key))
ipcMain.handle('set-store-value', (event, key, value) => store.set(key, value))
ipcMain.handle('show-save-dialog', async (event, options) => {
    return await dialog.showSaveDialog(photoSearchApp.mainWindow, options)
})
ipcMain.handle('show-open-dialog', async (event, options) => {
    return await dialog.showOpenDialog(photoSearchApp.mainWindow, options)
})
ipcMain.handle('show-message-box', async (event, options) => {
    return await dialog.showMessageBox(photoSearchApp.mainWindow, options)
})

// Export for external access
module.exports = photoSearchApp