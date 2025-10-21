const { app, ipcMain } = require('electron')
const { EventEmitter } = require('events')

class IpcFacade extends EventEmitter {
    constructor({ logger } = {}) {
        super()
        this.log = logger || console
        this.windowProvider = null
        this.handlers = new Map()
    }

    setWindowProvider(provider) {
        this.windowProvider = provider
    }

    register(channel, handler) {
        if (this.handlers.has(channel)) {
            throw new Error(`IPC channel already registered: ${channel}`)
        }
        this.handlers.set(channel, handler)
        ipcMain.handle(channel, async (event, payload) => {
            try {
                const result = await handler({ event, payload })
                return { ok: true, data: result }
            } catch (error) {
                this.log.error(`[IPC] Handler failure (${channel}):`, error)
                return { ok: false, error: error ? error.message : 'Unknown error' }
            }
        })
    }

    send(channel, payload) {
        const win = this.windowProvider ? this.windowProvider() : null
        if (win?.webContents) {
            win.webContents.send(channel, payload)
        }
    }
}

function setupIpcFacade({
    logger,
    windowProvider,
    photoSearchApp,
    store,
    healthSupervisor,
    logManager,
    jobQueue
}) {
    const facade = new IpcFacade({ logger })
    facade.setWindowProvider(windowProvider)

    // Basic app info
    facade.register('get-app-version', () => app.getVersion())
    facade.register('get-user-data-path', () => app.getPath('userData'))
    facade.register('get-pictures-path', () => app.getPath('pictures'))

    // Store access
    facade.register('get-store-value', ({ payload }) => {
        const { key } = payload || {}
        return store.get(key)
    })
    facade.register('set-store-value', ({ payload }) => {
        const { key, value } = payload || {}
        store.set(key, value)
        return true
    })

    // Theme management
    facade.register('get-theme', () => store.get('theme') || 'system')
    facade.register('set-theme', ({ payload }) => {
        const { theme } = payload || {}
        store.set('theme', theme)
        photoSearchApp.mainWindow?.webContents.send('theme-changed', theme)
        return theme
    })

    // Dialog helpers are routed through main App for context
    facade.register('show-save-dialog', async ({ payload }) => {
        return await photoSearchApp.showSaveDialog(payload)
    })
    facade.register('show-open-dialog', async ({ payload }) => {
        return await photoSearchApp.showOpenDialog(payload)
    })
    facade.register('show-message-box', async ({ payload }) => {
        return await photoSearchApp.showMessageBox(payload)
    })
    facade.register('select-photo-directory', async () => {
        return await photoSearchApp.selectPhotoDirectory()
    })

    // Indexing actions
    facade.register('rebuild-index', async ({ payload }) => {
        const { directory, provider } = payload || {}
        return await photoSearchApp.rebuildIndexWithProgress(directory, provider)
    })
    facade.register('get-index-status', async ({ payload }) => {
        const { directory } = payload || {}
        return await photoSearchApp.getIndexStatus(directory)
    })
    facade.register('export-library', async ({ payload }) => {
        const { directory, format, options } = payload || {}
        return await photoSearchApp.exportLibraryWithDialog(directory, format, options)
    })
    facade.register('build-faces', async ({ payload }) => {
        const { directory, provider } = payload || {}
        return await photoSearchApp.buildFacesWithProgress(directory, provider)
    })
    facade.register('build-trips', async ({ payload }) => {
        const { directory, provider } = payload || {}
        return await photoSearchApp.buildTripsWithProgress(directory, provider)
    })

    // Backend lifecycle shortcuts
    facade.register('backend:start', async () => {
        await photoSearchApp.ensureBackendServer({ reason: 'renderer-request', manual: true })
        return healthSupervisor.getSnapshot()
    })
    facade.register('backend:stop', async () => {
        photoSearchApp.stopBackendServer()
        healthSupervisor.markBackendRunning(false)
        return true
    })
    facade.register('backend:health:get', () => healthSupervisor.getSnapshot())
    facade.register('backend:health:force-check', async () => await healthSupervisor.forceCheck())

    // Logs
    facade.register('logs:get-recent', ({ payload }) => {
        const { limit } = payload || {}
        return logManager.getRecent(limit || 200)
    })

    // Unified engine request channel
    facade.register('engine:request', async ({ payload }) => {
        return await photoSearchApp.engineRequest(payload)
    })

    // Queue operations
    facade.register('queue:enqueue', ({ payload }) => {
        return jobQueue.enqueue(payload || {})
    })
    facade.register('queue:list', ({ payload }) => {
        return jobQueue.list(payload || {})
    })
    facade.register('queue:update-status', ({ payload }) => {
        const { id, status, error } = payload || {}
        return jobQueue.updateStatus(id, status, error)
    })
    facade.register('queue:metrics', () => jobQueue.metrics())

    // Keep facade around for event emission
    return facade
}

module.exports = {
    setupIpcFacade
}
