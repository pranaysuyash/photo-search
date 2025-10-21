const { contextBridge, ipcRenderer } = require('electron')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const unwrapResponse = (channel, response) => {
    if (response && typeof response === 'object' && Object.hasOwn(response, 'ok')) {
        if (response.ok) {
            return response.data
        }
        const message = response.error || `IPC call failed for ${channel}`
        const error = new Error(message)
        error.channel = channel
        throw error
    }
    return response
}

const invoke = async (channel, payload) => {
    const response = await ipcRenderer.invoke(channel, payload)
    return unwrapResponse(channel, response)
}

const invokeWithRetry = async (channel, payload, { attempts = 3, baseDelayMs = 150 } = {}) => {
    let attempt = 0
    let lastError = null
    while (attempt < attempts) {
        try {
            return await invoke(channel, payload)
        } catch (error) {
            lastError = error
            attempt += 1
            if (attempt >= attempts) {
                throw error
            }
            const delay = baseDelayMs * Math.pow(2, attempt - 1)
            await sleep(delay)
        }
    }
    throw lastError || new Error(`IPC retry failed for ${channel}`)
}

const registerPayloadListener = (channel, listener) => {
    const handler = (_event, payload) => {
        listener(payload)
    }
    ipcRenderer.on(channel, handler)
    return () => {
        ipcRenderer.removeListener(channel, handler)
    }
}

const isJsonSerializable = (value) => {
    if (value === null) return true
    const valueType = typeof value
    if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
        return true
    }
    if (valueType === 'object') {
        if (Array.isArray(value)) {
            return value.every(isJsonSerializable)
        }
        return Object.values(value).every(isJsonSerializable)
    }
    return false
}

const serializeBody = (body, headers = {}) => {
    if (body === undefined || body === null) {
        return { kind: 'none' }
    }

    if (typeof FormData !== 'undefined' && body instanceof FormData) {
        const entries = []
        for (const [name, value] of body.entries()) {
            if (typeof value !== 'string') {
                throw new Error('engine.request does not yet support binary FormData entries')
            }
            entries.push({ name, value })
        }
        return { kind: 'form-data', entries }
    }

    if (typeof body === 'string') {
        return { kind: 'text', value: body }
    }

    if (body instanceof ArrayBuffer) {
        return { kind: 'array-buffer', value: Buffer.from(body) }
    }

    if (ArrayBuffer.isView(body)) {
        return { kind: 'array-buffer', value: Buffer.from(body.buffer) }
    }

    if (isJsonSerializable(body)) {
        const updatedHeaders = { ...headers }
        if (!updatedHeaders['Content-Type']) {
            updatedHeaders['Content-Type'] = 'application/json'
        }
        return { kind: 'json', value: body, headers: updatedHeaders }
    }

    throw new Error('Unsupported request body type for engine.request')
}

const deserializeEngineResponse = (payload) => {
    if (!payload || typeof payload !== 'object') {
        return {
            ok: false,
            status: 0,
            code: 'BAD_RESPONSE',
            message: 'Malformed engine response'
        }
    }
    return payload
}

// Expose protected methods
contextBridge.exposeInMainWorld('electronAPI', {
    // App info
    getVersion: () => invoke('get-app-version'),
    getUserDataPath: () => invoke('get-user-data-path'),
    getPicturesPath: () => invoke('get-pictures-path'),

    // Settings store
    getStoreSetting: (key) => invoke('get-store-value', { key }),
    setStoreSetting: (key, value) => invoke('set-store-value', { key, value }),

    // Theme management
    getTheme: () => invoke('get-theme'),
    setTheme: (theme) => invoke('set-theme', { theme }),
    onThemeChange: (callback) => registerPayloadListener('theme-changed', callback),

    // File dialogs
    showSaveDialog: (options) => invoke('show-save-dialog', options),
    showOpenDialog: (options) => invoke('show-open-dialog', options),
    showMessageBox: (options) => invoke('show-message-box', options),
    selectDirectory: () => invoke('select-photo-directory'),

    // Index operations
    rebuildIndex: (directory, provider) => invoke('rebuild-index', { directory, provider }),
    getIndexStatus: (directory) => invoke('get-index-status', { directory }),
    exportLibrary: (directory, format, options) => invoke('export-library', { directory, format, options }),
    buildFaces: (directory, provider) => invoke('build-faces', { directory, provider }),
    buildTrips: (directory, provider) => invoke('build-trips', { directory, provider }),

    // Backend lifecycle
    backend: {
        start: () => invoke('backend:start'),
        stop: () => invoke('backend:stop')
    },

    // Health supervisor access
    health: {
        getStatus: () => invoke('backend:health:get'),
        forceCheck: () => invoke('backend:health:force-check'),
        onStatusChange: (callback) => registerPayloadListener('backend-health:status', callback)
    },

    // Logs viewer
    logs: {
        getRecent: (limit = 200) => invoke('logs:get-recent', { limit }),
        onAppend: (callback) => registerPayloadListener('logs:append', callback)
    },

    // Job queue skeleton
    queue: {
        enqueue: (job) => invoke('queue:enqueue', job),
        list: (filters) => invoke('queue:list', filters),
        updateStatus: ({ id, status, error }) => invoke('queue:update-status', { id, status, error }),
        metrics: () => invoke('queue:metrics'),
        onChange: (callback) => registerPayloadListener('queue:changed', callback)
    },

    // Menu action listeners (legacy helpers)
    onDirectorySelected: (callback) => ipcRenderer.on('directory-selected', callback),
    onPhotosImport: (callback) => ipcRenderer.on('photos-import', callback),
    onFocusSearch: (callback) => ipcRenderer.on('focus-search', callback),
    onSetViewMode: (callback) => ipcRenderer.on('set-view-mode', callback),
    onSmartSearch: (callback) => ipcRenderer.on('smart-search', callback),
    onSearchByPeople: (callback) => ipcRenderer.on('search-by-people', callback),
    onSearchByPlaces: (callback) => ipcRenderer.on('search-by-places', callback),
    onRebuildIndex: (callback) => ipcRenderer.on('rebuild-index', callback),
    onExportLibrary: (callback) => ipcRenderer.on('export-library', callback),
    onOpenPreferences: (callback) => ipcRenderer.on('open-preferences', callback),

    // Generic listeners
    on: (channel, listener) => ipcRenderer.on(channel, listener),
    off: (channel, listener) => ipcRenderer.removeListener(channel, listener),
    removeListener: (channel, callback) => ipcRenderer.removeListener(channel, callback),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

    // Advanced invocation helper
    invokeWithRetry,

    // Platform detection
    platform: process.platform,
    isWindows: process.platform === 'win32',
    isMac: process.platform === 'darwin',
    isLinux: process.platform === 'linux',

    // Development mode
    isDevelopment: process.env.NODE_ENV === 'development'
})

// Expose Node.js path utilities for file handling
contextBridge.exposeInMainWorld('pathAPI', {
    join: (...args) => require('path').join(...args),
    dirname: (path) => require('path').dirname(path),
    basename: (path) => require('path').basename(path),
    extname: (path) => require('path').extname(path),
    resolve: (...args) => require('path').resolve(...args),
    normalize: (path) => require('path').normalize(path),
    sep: require('path').sep
})

// Expose file system utilities (read-only for security)
contextBridge.exposeInMainWorld('fsAPI', {
    exists: async (path) => {
        try {
            await require('fs').promises.access(path)
            return true
        } catch {
            return false
        }
    },
    stat: async (path) => {
        try {
            return await require('fs').promises.stat(path)
        } catch (error) {
            throw error
        }
    },
    readdir: async (path) => {
        try {
            return await require('fs').promises.readdir(path)
        } catch (error) {
            throw error
        }
    }
})

const engineBridge = {
    async request({ path, method = 'GET', headers = {}, body, timeoutMs = 12000 } = {}) {
        if (typeof path !== 'string' || !path.startsWith('/')) {
            return {
                ok: false,
                status: 400,
                code: 'BAD_REQUEST',
                message: 'Requests must include an absolute path (e.g. /search)'
            }
        }

        let serialized
        try {
            serialized = serializeBody(body, headers)
        } catch (error) {
            return {
                ok: false,
                status: 0,
                code: 'BAD_REQUEST',
                message: error instanceof Error ? error.message : 'Unsupported request body'
            }
        }

        const payload = {
            path,
            method,
            headers,
            body: serialized,
            timeoutMs
        }

        try {
            const response = await ipcRenderer.invoke('engine:request', payload)
            return deserializeEngineResponse(response)
        } catch (error) {
            return {
                ok: false,
                status: 0,
                code: 'IPC_FAILURE',
                message: error instanceof Error ? error.message : 'Engine request failed'
            }
        }
    },
    start() {
        return invokeWithRetry('backend:start')
    },
    stop() {
        return invokeWithRetry('backend:stop')
    },
    onStatus(callback) {
        return registerPayloadListener('backend-health:status', callback)
    },
    logs: {
        subscribe(callback) {
            return registerPayloadListener('logs:append', callback)
        },
        recent(limit = 200) {
            return invokeWithRetry('logs:get-recent', { limit })
        }
    }
}

contextBridge.exposeInMainWorld('engine', engineBridge)

// Security: prevent access to Node.js globals
delete window.require
delete window.exports
delete window.module
