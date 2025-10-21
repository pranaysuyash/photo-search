const { app, BrowserWindow, Menu, dialog, shell, protocol, session } = require('electron')
const fs = require('fs')
const { autoUpdater } = require('electron-updater')
const windowStateKeeper = require('electron-window-state')
const log = require('electron-log')
const Store = require('electron-store')
const path = require('path')
const { spawn } = require('child_process')
const { BackendHealthSupervisor } = require('./services/backend-health-supervisor')
const { LogManager } = require('./services/log-manager')
const { createJobQueue } = require('./services/job-queue')
const { setupIpcFacade } = require('./services/ipc-facade')

// Register secure custom protocol prior to app readiness (required for privilege elevation)
protocol.registerSchemesAsPrivileged([
    {
        scheme: 'photoapp',
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            stream: true,
            corsEnabled: false,
            bypassCSP: false
        }
    }
])

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
        enableAnalytics: false,
        autoIndexing: true,
        autoStartBackend: false
    }
})

class PhotoSearchApp {
    constructor() {
        this.mainWindow = null
        this.backendProcess = null
        this.backendStarting = false
        this.isQuitting = false
        this.isDevelopment = process.env.NODE_ENV === 'development'
        this.healthSupervisor = null
        this.logManager = null
        this.jobQueue = null
        this.ipcFacade = null
        this.backendBaseUrl = process.env.PHOTO_BACKEND_BASE || 'http://127.0.0.1:8000'

        // Align GPU policy with environment: keep dev safer, enable prod performance
        if (this.isDevelopment) {
            // Disable HA in dev to avoid GPU surface blow-ups while debugging
            app.disableHardwareAcceleration()
        }

        // Cap V8 old space to avoid runaway allocations
        app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096')

        this.setupApp()
    }

    async bootstrapServices() {
        const userDataPath = app.getPath('userData')

        this.jobQueue = createJobQueue({ logger: log, dbPath: path.join(userDataPath, 'jobs.sqlite') })
        await this.jobQueue.initialize()
        this.jobQueue.on('change', (payload) => {
            this.broadcast('queue:changed', payload)
        })

        this.healthSupervisor = new BackendHealthSupervisor({ logger: log })
        this.healthSupervisor.on('status', (snapshot) => {
            this.broadcast('backend-health:status', snapshot)
        })
        this.healthSupervisor.markBackendRunning(false)

        this.logManager = new LogManager({ logger: log })
        try {
            const logFile = log?.transports?.file?.getFile?.().path
            if (logFile) {
                this.logManager.setLogFile(logFile)
            }
        } catch (error) {
            log.warn('[Logs] Unable to configure log manager:', error.message)
        }
        this.logManager.on('append', (entries) => {
            this.broadcast('logs:append', entries)
        })
        await this.logManager.loadInitial()

        this.healthSupervisor.start()
    }

    broadcast(channel, payload) {
        if (this.ipcFacade) {
            this.ipcFacade.send(channel, payload)
        } else if (this.mainWindow?.webContents) {
            this.mainWindow.webContents.send(channel, payload)
        }
    }

    setupApp() {
        // Handle app ready
        app.whenReady().then(async () => {
            try {
                await this.bootstrapServices()
            } catch (error) {
                log.error('[App] Failed to bootstrap services:', error)
            }

            this.ipcFacade = setupIpcFacade({
                logger: log,
                windowProvider: () => this.mainWindow,
                photoSearchApp: this,
                store,
                healthSupervisor: this.healthSupervisor,
                logManager: this.logManager,
                jobQueue: this.jobQueue
            })

            this.createMainWindow()
            this.setupMenu()
            this.setupAutoUpdater()
            this.setupProtocols()
            // Production-only CSP hardening for file:// and photoapp:// resources
            if (!this.isDevelopment && session && session.defaultSession) {
                const csp = "default-src 'self' photoapp:; img-src 'self' data: photoapp:; media-src 'self' photoapp:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' http://127.0.0.1:8000";
                session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
                    const headers = details.responseHeaders || {};
                    headers['Content-Security-Policy'] = [csp];
                    callback({ responseHeaders: headers });
                });
            }
            const shouldAutoStart = Boolean(store.get('autoStartBackend'))
            if (shouldAutoStart) {
                log.info('[Backend] Auto-start enabled; attempting to launch backend')
                this.ensureBackendServer({ reason: 'app-start' }).catch((error) => {
                    log.error('[Backend] Auto-start failed:', error)
                })
            } else {
                log.info('[Backend] Auto-start disabled; backend will remain idle until requested')
            }

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
            this.healthSupervisor?.stop()
            this.logManager?.stopWatching()
        })

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit()
            }
        })

        // Security: prevent untrusted navigation and secondary windows
        app.on('web-contents-created', (_event, contents) => {
            contents.setWindowOpenHandler(({ url }) => {
                if (this.isSafeExternalUrl(url)) {
                    shell.openExternal(url)
                }
                return { action: 'deny' }
            })

            contents.on('will-navigate', (navigationEvent, navigationUrl) => {
                const currentUrl = contents.getURL()
                if (navigationUrl !== currentUrl) {
                    navigationEvent.preventDefault()
                    if (this.isSafeExternalUrl(navigationUrl)) {
                        shell.openExternal(navigationUrl)
                    }
                }
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
            titleBarStyle: process.platform === 'darwin' ? 'hidden' : 'hiddenInset',
            trafficLightPosition: process.platform === 'darwin' ? { x: 12, y: 14 } : undefined,
            titleBarOverlay: process.platform === 'darwin'
                ? { color: '#00000000', symbolColor: '#888888', height: 44 }
                : undefined,
            webPreferences: {
                sandbox: true,
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

            const healthSnapshot = this.healthSupervisor?.getSnapshot()
            if (healthSnapshot) {
                this.broadcast('backend-health:status', { ...healthSnapshot, reason: 'initial' })
            }

            const queueMetrics = this.jobQueue?.metrics?.()
            if (queueMetrics) {
                this.broadcast('queue:changed', {
                    reason: 'snapshot',
                    job: null,
                    metrics: queueMetrics
                })
            }

            const recentLogs = this.logManager?.getRecent?.(100) || []
            if (recentLogs.length) {
                this.broadcast('logs:append', recentLogs)
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
        if (this.isDevelopment) {
            const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5174'
            this.mainWindow.loadURL(devUrl)
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
                        // Renderer will open a folder picker via preload hook
                        click: () => this.mainWindow?.webContents.send('menu:import')
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
                        click: () => this.mainWindow?.webContents.send('menu:export-library')
                    },
                    {
                        label: 'Recent',
                        submenu: this.buildRecentDirectoriesMenu()
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
                    },
                    { type: 'separator' },
                    {
                        label: 'Themes',
                        submenu: [
                            {
                                label: 'Light',
                                type: 'radio',
                                checked: store.get('theme') === 'light',
                                click: () => this.setTheme('light')
                            },
                            {
                                label: 'Dark',
                                type: 'radio',
                                checked: store.get('theme') === 'dark',
                                click: () => this.setTheme('dark')
                            },
                            {
                                label: 'System',
                                type: 'radio',
                                checked: store.get('theme') === 'system',
                                click: () => this.setTheme('system')
                            }
                        ]
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
                    },
                    { type: 'separator' },
                    {
                        label: 'Start Backend',
                        click: () => {
                            this.ensureBackendServer({ reason: 'menu-start', manual: true }).catch((error) => {
                                log.error('[Backend] Manual start failed:', error)
                                dialog.showMessageBox(this.mainWindow, {
                                    type: 'error',
                                    title: 'Backend Start Failed',
                                    message: 'Unable to start the backend service.',
                                    detail: error.message,
                                    buttons: ['OK']
                                })
                            })
                        }
                    },
                    {
                        label: 'Stop Backend',
                        click: () => this.stopBackendServer()
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
                        click: () => {
                            const url = 'https://photosearch.app'
                            if (this.isSafeExternalUrl(url)) {
                                shell.openExternal(url)
                            }
                        }
                    }
                ]
            }
        ]

        // macOS specific menu adjustments
        if (process.platform === 'darwin') {
            template.unshift({
                label: app.getName(),
                submenu: [
                    {
                        label: 'About Photo Search',
                        click: () => this.showEnhancedAboutDialog()
                    },
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

    async showSaveDialog(options = {}) {
        return await dialog.showSaveDialog(this.mainWindow ?? undefined, options)
    }

    async showOpenDialog(options = {}) {
        return await dialog.showOpenDialog(this.mainWindow ?? undefined, options)
    }

    async showMessageBox(options = {}) {
        return await dialog.showMessageBox(this.mainWindow ?? undefined, options)
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
        // Register custom protocol for local file access with allowlist enforcement
        protocol.registerFileProtocol('photoapp', (request, callback) => {
            try {
                const stripped = request.url.replace('photoapp://', '')
                const decoded = decodeURIComponent(stripped)
                const normalized = path.normalize(decoded)
                if (!this.isPathAllowedForProtocol(normalized)) {
                    log.warn('[Protocol] Blocked disallowed path request:', normalized)
                    callback({ error: -10 }) // net::ERR_ACCESS_DENIED
                    return
                }
                callback({ path: normalized })
            } catch (error) {
                log.error('[Protocol] Failed to resolve photoapp path:', error)
                callback({ error: -324 }) // net::ERR_INVALID_URL
            }
        })
    }

    getProtocolRoots() {
        const roots = new Set()
        roots.add(path.join(__dirname, 'app'))
        roots.add(app.getPath('userData'))
        roots.add(app.getPath('temp'))
        roots.add(app.getPath('cache'))
        roots.add(app.getPath('pictures'))
        roots.add(app.getPath('documents'))
        const configured = store.get('photoDirectories', [])
        if (Array.isArray(configured)) {
            configured.forEach((dir) => {
                if (typeof dir === 'string' && dir.trim()) {
                    roots.add(path.resolve(dir))
                }
            })
        }
        const lastSelected = store.get('lastSelectedDirectory')
        if (typeof lastSelected === 'string' && lastSelected.trim()) {
            roots.add(path.resolve(lastSelected))
        }
        return Array.from(roots)
    }

    isPathAllowedForProtocol(candidate) {
        try {
            const resolved = path.resolve(candidate)
            const roots = this.getProtocolRoots().map((dir) => path.resolve(dir))
            return roots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`))
        } catch (error) {
            log.warn('[Protocol] Allowlist evaluation failed:', error?.message)
            return false
        }
    }

    normalizeEnginePath(rawPath) {
        if (typeof rawPath !== 'string' || !rawPath.startsWith('/')) {
            return { ok: false, code: 'BAD_PATH', message: 'Path must start with /' }
        }
        if (rawPath.includes('..')) {
            return { ok: false, code: 'PATH_TRAVERSAL', message: 'Parent segments are not allowed' }
        }
        return { ok: true, path: rawPath }
    }

    async engineRequest({ path: requestPath, method = 'GET', headers = {}, body, timeoutMs = 12000 } = {}) {
        const normalized = this.normalizeEnginePath(requestPath)
        if (!normalized.ok) {
            return {
                ok: false,
                status: 400,
                code: normalized.code,
                message: normalized.message
            }
        }

        const allowedMethods = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'])
        const upperMethod = String(method || 'GET').toUpperCase()
        if (!allowedMethods.has(upperMethod)) {
            return {
                ok: false,
                status: 405,
                code: 'METHOD_NOT_ALLOWED',
                message: `Method ${upperMethod} is not permitted`
            }
        }

        await this.ensureBackendServer({ reason: 'engine-request' })

        const targetUrl = new URL(normalized.path, `${this.backendBaseUrl}/`).toString()
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), timeoutMs)

        const headerBag = new Headers()
        Object.entries(headers || {}).forEach(([key, value]) => {
            if (typeof value === 'string') {
                headerBag.set(key, value)
            }
        })

        let requestBody
        const bodyKind = body?.kind || 'none'
        try {
            if (bodyKind === 'json') {
                if (!headerBag.has('Content-Type')) {
                    headerBag.set('Content-Type', 'application/json')
                }
                requestBody = JSON.stringify(body.value ?? null)
            } else if (bodyKind === 'text') {
                requestBody = body.value ?? ''
            } else if (bodyKind === 'form-data') {
                const form = new FormData()
                for (const entry of body.entries || []) {
                    form.append(entry.name, entry.value)
                }
                requestBody = form
            } else if (bodyKind === 'none') {
                requestBody = undefined
            } else {
                throw new Error(`Unsupported body kind: ${bodyKind}`)
            }
        } catch (error) {
            clearTimeout(timeout)
            return {
                ok: false,
                status: 0,
                code: 'BODY_SERIALIZATION_FAILED',
                message: error instanceof Error ? error.message : 'Failed to serialize request body'
            }
        }

        try {
            const response = await fetch(targetUrl, {
                method: upperMethod,
                headers: headerBag,
                body: requestBody,
                signal: controller.signal
            })
            clearTimeout(timeout)

            const contentType = response.headers.get('content-type') || ''
            let bodyKindOut = 'text'
            let bodyValue = ''
            if (contentType.includes('application/json')) {
                bodyKindOut = 'json'
                bodyValue = await response.json()
            } else if (contentType.startsWith('text/')) {
                bodyKindOut = 'text'
                bodyValue = await response.text()
            } else if (response.status === 204 || upperMethod === 'HEAD') {
                bodyKindOut = 'none'
                bodyValue = null
            } else {
                bodyKindOut = 'text'
                bodyValue = await response.text()
            }

            return {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                bodyKind: bodyKindOut,
                body: bodyValue
            }
        } catch (error) {
            clearTimeout(timeout)
            const message = error instanceof Error ? error.message : 'Engine request failed'
            const code = message.includes('AbortError') ? 'TIMEOUT' : 'NETWORK_ERROR'
            return {
                ok: false,
                status: 0,
                code,
                message
            }
        }
    }

    async ensureBackendServer({ reason = 'operation', manual = false } = {}) {
        if (this.isDevelopment) {
            log.debug(`[Backend] Dev mode: skipping ensure for ${reason}; run uvicorn manually if needed`)
            return
        }

        if (this.backendProcess) {
            log.debug(`[Backend] Already running for ${reason}`)
            this.healthSupervisor?.markBackendRunning(true)
            await this.waitForBackendReady()
            return
        }

        if (this.backendStarting) {
            log.debug(`[Backend] Startup already in progress for ${reason}`)
            this.healthSupervisor?.markBackendRunning(true)
            await this.waitForBackendReady()
            return
        }

        try {
            this.startBackendServer({ reason, manual })
            await this.waitForBackendReady()
            this.healthSupervisor?.markBackendRunning(true)
        } catch (error) {
            log.error(`[Backend] Failed to ensure backend (${reason}):`, error)
            this.healthSupervisor?.markBackendRunning(false)
            throw error
        }
    }

    isSafeExternalUrl(candidate) {
        try {
            const parsed = new URL(candidate)
            return ['http:', 'https:'].includes(parsed.protocol)
        } catch (_error) {
            return false
        }
    }

    startBackendServer({ reason = 'manual', manual = false } = {}) {
        if (this.isDevelopment) {
            log.info(`[Backend] Dev mode: not spawning backend (reason: ${reason})`)
            return
        }

        if (this.backendProcess || this.backendStarting) {
            log.info('[Backend] Start requested but backend is already running or starting')
            return
        }

        const pythonPath = this.getPythonPath()
        const serverPath = path.join(__dirname, '..', 'api', 'server.py')

        log.info(`[Backend] Starting backend (${pythonPath}) for ${reason}${manual ? ' (manual)' : ''}`)

        this.backendStarting = true

        try {
            this.backendProcess = spawn(pythonPath, [serverPath], {
                cwd: path.join(__dirname, '..'),
                env: {
                    ...process.env,
                    PYTHONPATH: path.join(__dirname, '..')
                },
                stdio: ['ignore', 'pipe', 'pipe']
            })
        } catch (error) {
            this.backendStarting = false
            this.backendProcess = null
            throw error
        }

        this.backendProcess.stdout.on('data', (data) => {
            log.info('[Backend stdout]', data.toString().trim())
        })

        this.backendProcess.stderr.on('data', (data) => {
            log.error('[Backend stderr]', data.toString().trim())
        })

        this.backendProcess.on('spawn', () => {
            log.info('[Backend] Process spawned')
            this.healthSupervisor?.markBackendRunning(true)
        })

        this.backendProcess.on('close', (code) => {
            log.info(`[Backend] Process exited with code ${code}`)
            this.backendProcess = null
            this.backendStarting = false
            this.healthSupervisor?.markBackendRunning(false)
        })

        this.backendProcess.on('error', (error) => {
            log.error('[Backend] Process error:', error)
            this.backendProcess = null
            this.backendStarting = false
            this.healthSupervisor?.markBackendRunning(false)
        })

        // Reset starting flag once we are reasonably sure spawn succeeded
        setTimeout(() => {
            if (this.backendProcess) {
                this.backendStarting = false
            }
        }, 2000)
    }

    async waitForBackendReady(timeout = 15000) {
        if (this.isDevelopment) {
            return
        }

        const start = Date.now()
        const deadline = start + timeout
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

        while (Date.now() < deadline) {
            if (!this.backendProcess && !this.backendStarting) {
                // Process not running; allow a final ping attempt before failing
                const reachable = await this.pingBackend()
                if (reachable) {
                    return
                }
                break
            }

            const reachable = await this.pingBackend()
            if (reachable) {
                this.backendStarting = false
                return
            }

            await delay(500)
        }

        this.backendStarting = false
        throw new Error('Backend did not respond within expected time')
    }

    async pingBackend() {
        try {
            const response = await fetch('http://127.0.0.1:8000/health')
            return response.ok
        } catch (error) {
            log.debug('[Backend] Health check failed:', error.message)
            return false
        }
    }

    stopBackendServer() {
        if (this.backendProcess) {
            log.info('[Backend] Stopping backend process')
            this.backendProcess.kill()
            this.backendProcess = null
            this.backendStarting = false
            this.healthSupervisor?.markBackendRunning(false)
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
    async promptForPhotoDirectory() {
        const windowRef = this.mainWindow
        if (!windowRef) {
            return null
        }

        const result = await dialog.showOpenDialog(windowRef, {
            properties: ['openDirectory'],
            title: 'Select Photo Library Folder'
        })

        if (result.canceled || result.filePaths.length === 0) {
            return null
        }

        const directory = result.filePaths[0]
        store.set('lastSelectedDirectory', directory)

        // Add to recent directories
        const recent = store.get('photoDirectories', [])
        const updated = [directory, ...recent.filter(d => d !== directory)].slice(0, 10)
        store.set('photoDirectories', updated)

        return directory
    }

    async openPhotoDirectory() {
        await this.selectPhotoDirectory()
    }

    async selectPhotoDirectory() {
        const directory = await this.promptForPhotoDirectory()
        if (directory && this.mainWindow?.webContents) {
            this.mainWindow.webContents.send('directory-selected', directory)
        }
        return directory
    }

    getRecentDirectories() {
        return store.get('photoDirectories', []).slice(0, 5)
    }

    buildRecentDirectoriesMenu() {
        const recent = this.getRecentDirectories();

        if (recent.length === 0) {
            return [
                { label: 'No recent directories', enabled: false }
            ];
        }

        const revealLabel = process.platform === 'win32' ? 'Open in Explorer' : (process.platform === 'darwin' ? 'Open in Finder' : 'Open Folder');

        return recent.map((directory) => ({
            label: this.formatDirectoryLabel(directory),
            submenu: [
                {
                    label: 'Open',
                    click: () => {
                        if (this.mainWindow) {
                            this.mainWindow.webContents.send('directory-selected', directory);
                        }
                    }
                },
                {
                    label: revealLabel,
                    click: async () => {
                        try {
                            await shell.openPath(directory);
                        } catch (e) {
                            log.error('Failed to open folder:', e);
                        }
                    }
                },
                {
                    label: 'Forget this',
                    click: () => {
                        const list = store.get('photoDirectories', []);
                        const updated = list.filter(d => d !== directory);
                        store.set('photoDirectories', updated);
                        // Rebuild menu to reflect removal
                        this.setupMenu();
                    }
                }
            ]
        }));
    }

    formatDirectoryLabel(directory) {
        // Show only the last 2 path segments for readability
        const parts = directory.split(/[\\/]/)
        const displayParts = parts.slice(-2)
        let label = displayParts.join('/')

        // Truncate long paths
        if (label.length > 40) {
            label = label.substring(0, 37) + '...'
        }

        return label
    }

    showEnhancedAboutDialog() {
        const appVersion = app.getVersion()
        const features = [
            '• Intent-First Design: Clean, focused interface',
            '• Masonry Grid: Dynamic layout with recency weighting',
            '• Film Strip View: Horizontal scrolling photo browser',
            '• Timeline View: Chronological date grouping',
            '• Face Recognition: Auto-detect and cluster faces',
            '• Trip Detection: Group photos by location and time',
            '• Smart Search: Advanced search with captions and OCR',
            '• Keyboard Shortcuts: 1/2/3 for view switching',
            '• Recent Directories: Quick access to recent libraries',
            '• Export Library: Backup and analyze your photo data'
        ]

        const message = `Photo Search v${appVersion}

A modern photo management application built with intent-first principles.

${features.join('\n')}

Built with React, Electron, and AI-powered backend.

© 2024 Photo Search. All rights reserved.`

        dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'About Photo Search',
            message: 'Photo Search',
            detail: message,
            buttons: ['OK', 'Keyboard Shortcuts'],
            defaultId: 0,
            cancelId: 0
        }).then((result) => {
            // If "Keyboard Shortcuts" button was clicked
            if (result.response === 1) {
                this.showKeyboardShortcutsDialog()
            }
        })
    }

    showKeyboardShortcutsDialog() {
        const shortcuts = [
            'File Menu:',
            '  Ctrl+O: Open Photo Library',
            '  Ctrl+I: Import Photos',
            '  Ctrl+E: Export Library',
            '',
            'Edit Menu:',
            '  Ctrl+Z: Undo',
            '  Ctrl+Y: Redo',
            '  Ctrl+X: Cut',
            '  Ctrl+C: Copy',
            '  Ctrl+V: Paste',
            '',
            'View Menu:',
            '  Ctrl+1: Grid View (Masonry)',
            '  Ctrl+2: List View (Film Strip)',
            '',
            'Search Menu:',
            '  Ctrl+F: New Search',
            '  Ctrl+Shift+F: Smart Search',
            '  Ctrl+P: Search by People (Face Recognition)',
            '  Ctrl+L: Search by Places (Trip Detection)',
            '',
            'Grid Shortcuts:',
            '  1: Masonry View',
            '  2: Film Strip View',
            '  3: Timeline View'
        ]

        dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'Keyboard Shortcuts',
            message: 'Photo Search Keyboard Shortcuts',
            detail: shortcuts.join('\n'),
            buttons: ['OK'],
            defaultId: 0
        })
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

    setTheme(theme) {
        store.set('theme', theme)
        this.mainWindow.webContents.send('theme-changed', theme)
        this.updateThemeRadioButtons()
    }

    updateThemeRadioButtons() {
        // Rebuild menu to update radio button states
        this.setupMenu()
    }

    smartSearch() {
        this.mainWindow.webContents.send('smart-search')
    }

    searchByPeople() {
        const lastDirectory = store.get('lastSelectedDirectory')
        if (!lastDirectory) {
            dialog.showMessageBox(this.mainWindow, {
                type: 'warning',
                title: 'No Directory Selected',
                message: 'Please select a photo directory first.',
                buttons: ['OK']
            })
            return
        }

        dialog.showMessageBox(this.mainWindow, {
            type: 'question',
            title: 'Build Face Recognition',
            message: 'Build face recognition for your library?',
            detail: 'This will analyze all photos to detect and cluster faces.',
            buttons: ['Build Faces', 'Cancel'],
            defaultId: 0,
            cancelId: 1
        }).then(result => {
            if (result.response === 0) {
                this.buildFacesWithProgress(lastDirectory)
            }
        })
    }

    searchByPlaces() {
        const lastDirectory = store.get('lastSelectedDirectory')
        if (!lastDirectory) {
            dialog.showMessageBox(this.mainWindow, {
                type: 'warning',
                title: 'No Directory Selected',
                message: 'Please select a photo directory first.',
                buttons: ['OK']
            })
            return
        }

        dialog.showMessageBox(this.mainWindow, {
            type: 'question',
            title: 'Build Trip Detection',
            message: 'Build trip detection for your library?',
            detail: 'This will analyze photos to group them by trips/locations.',
            buttons: ['Build Trips', 'Cancel'],
            defaultId: 0,
            cancelId: 1
        }).then(result => {
            if (result.response === 0) {
                this.buildTripsWithProgress(lastDirectory)
            }
        })
    }

    rebuildIndex() {
        const lastDirectory = store.get('lastSelectedDirectory')
        if (!lastDirectory) {
            dialog.showMessageBox(this.mainWindow, {
                type: 'warning',
                title: 'No Directory Selected',
                message: 'Please select a photo directory first.',
                buttons: ['OK']
            })
            return
        }

        dialog.showMessageBox(this.mainWindow, {
            type: 'question',
            title: 'Rebuild Index',
            message: `Rebuild index for ${lastDirectory}?`,
            detail: 'This will reprocess all photos and may take several minutes.',
            buttons: ['Rebuild', 'Cancel'],
            defaultId: 0,
            cancelId: 1
        }).then(result => {
            if (result.response === 0) {
                this.rebuildIndexWithProgress(lastDirectory)
            }
        })
    }

    async rebuildIndexWithProgress(directory, provider = 'local') {
        await this.ensureBackendServer({ reason: 'rebuild-index' })
        try {
            const response = await fetch('http://127.0.0.1:8000/index', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dir: directory, provider, batch_size: 32 })
            })

            if (!response.ok) {
                throw new Error(`Index rebuild failed: ${response.statusText}`)
            }

            const result = await response.json()

            dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: 'Index Rebuild Started',
                message: `Index rebuild started for ${directory}`,
                detail: `Job ID: ${result.job_id || 'N/A'}\nTotal photos: ${result.total || 'unknown'}`,
                buttons: ['OK']
            })

            return result

        } catch (error) {
            log.error('Index rebuild failed:', error)
            dialog.showMessageBox(this.mainWindow, {
                type: 'error',
                title: 'Index Rebuild Failed',
                message: 'Failed to start index rebuild',
                detail: error.message,
                buttons: ['OK']
            })
            throw error
        }
    }

    async getIndexStatus(directory) {
        await this.ensureBackendServer({ reason: 'get-index-status' })
        try {
            const response = await fetch(`http://127.0.0.1:8000/index/status?dir=${encodeURIComponent(directory)}`)
            if (!response.ok) {
                throw new Error(`Get index status failed: ${response.statusText}`)
            }
            return await response.json()
        } catch (error) {
            log.error('Get index status failed:', error)
            throw error
        }
    }

    exportLibrary() {
        const lastDirectory = store.get('lastSelectedDirectory')
        if (!lastDirectory) {
            dialog.showMessageBox(this.mainWindow, {
                type: 'warning',
                title: 'No Directory Selected',
                message: 'Please select a photo directory first.',
                buttons: ['OK']
            })
            return
        }

        dialog.showMessageBox(this.mainWindow, {
            type: 'question',
            title: 'Export Library',
            message: 'Export your photo library?',
            detail: 'Choose export format and options.',
            buttons: ['Export', 'Cancel'],
            defaultId: 0,
            cancelId: 1
        }).then(async (result) => {
            if (result.response === 0) {
                const format = await this.promptForExportFormat()
                if (format) {
                    this.exportLibraryWithDialog(lastDirectory, format)
                }
            }
        })
    }

    async promptForExportFormat() {
        const result = await dialog.showMessageBox(this.mainWindow, {
            type: 'question',
            title: 'Export Format',
            message: 'Choose export format:',
            buttons: ['JSON', 'CSV', 'Cancel'],
            defaultId: 0,
            cancelId: 2
        })

        if (result.response === 2) return null // Cancel
        return result.response === 0 ? 'json' : 'csv'
    }

    async exportLibraryWithDialog(directory, format = 'json', options = {}) {
        await this.ensureBackendServer({ reason: 'export-library' })
        try {
            const fileExtension = format === 'csv' ? 'csv' : 'json'
            const filters = format === 'csv' ? [{ name: 'CSV', extensions: ['csv'] }] : [{ name: 'JSON', extensions: ['json'] }]

            const { filePath } = await dialog.showSaveDialog(this.mainWindow, {
                title: 'Save Export File',
                defaultPath: `photo-library-export.${fileExtension}`,
                filters: filters
            })

            if (!filePath) return // User cancelled

            const formData = new FormData()
            formData.append('dir', directory)
            formData.append('format', format)
            if (options.include_metadata) {
                formData.append('include_metadata', 'true')
            }
            if (options.filter) {
                formData.append('filter', options.filter)
            }

            const response = await fetch('http://127.0.0.1:8000/export/library', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                throw new Error(`Export failed: ${response.statusText}`)
            }

            const blob = await response.blob()
            const buffer = Buffer.from(await blob.arrayBuffer())

            fs.writeFileSync(filePath, buffer)

            dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: 'Export Complete',
                message: `Library exported successfully to ${filePath}`,
                buttons: ['OK']
            })

            return { success: true, filePath }

        } catch (error) {
            log.error('Export failed:', error)
            dialog.showMessageBox(this.mainWindow, {
                type: 'error',
                title: 'Export Failed',
                message: 'Failed to export library',
                detail: error.message,
                buttons: ['OK']
            })
            throw error
        }
    }

    async buildFacesWithProgress(directory, provider = 'local') {
        await this.ensureBackendServer({ reason: 'build-faces' })
        try {
            const response = await fetch('http://127.0.0.1:8000/faces/build', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dir: directory, provider })
            })

            if (!response.ok) {
                throw new Error(`Face building failed: ${response.statusText}`)
            }

            const result = await response.json()

            dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: 'Face Recognition Complete',
                message: `Face recognition completed for ${directory}`,
                detail: `Found ${result.clusters?.length || 0} face clusters`,
                buttons: ['OK']
            })

            return result

        } catch (error) {
            log.error('Face building failed:', error)
            dialog.showMessageBox(this.mainWindow, {
                type: 'error',
                title: 'Face Recognition Failed',
                message: 'Failed to build face recognition',
                detail: error.message,
                buttons: ['OK']
            })
            throw error
        }
    }

    async buildTripsWithProgress(directory, provider = 'local') {
        await this.ensureBackendServer({ reason: 'build-trips' })
        try {
            const response = await fetch('http://127.0.0.1:8000/trips/build', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dir: directory, provider })
            })

            if (!response.ok) {
                throw new Error(`Trip building failed: ${response.statusText}`)
            }

            const result = await response.json()

            dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: 'Trip Detection Complete',
                message: `Trip detection completed for ${directory}`,
                detail: `Found ${result.trips?.length || 0} trips`,
                buttons: ['OK']
            })

            return result

        } catch (error) {
            log.error('Trip building failed:', error)
            dialog.showMessageBox(this.mainWindow, {
                type: 'error',
                title: 'Trip Detection Failed',
                message: 'Failed to build trip detection',
                detail: error.message,
                buttons: ['OK']
            })
            throw error
        }
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

// Export for external access
module.exports = photoSearchApp
