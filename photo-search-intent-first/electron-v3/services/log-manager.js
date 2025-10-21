const fs = require('fs')
const path = require('path')
const { EventEmitter } = require('events')

class LogManager extends EventEmitter {
    constructor({ logger, logFilePath, maxEntries = 500 } = {}) {
        super()
        this.log = logger || console
        this.logFilePath = logFilePath || null
        this.maxEntries = maxEntries
        this.buffer = []
        this.watcher = null
        this.ready = false
    }

    setLogFile(filePath) {
        if (!filePath) {
            return
        }
        this.logFilePath = filePath
        this.ready = false
        this.buffer = []
        this.startWatching()
    }

    async loadInitial() {
        if (!this.logFilePath) {
            return []
        }
        try {
            const data = await fs.promises.readFile(this.logFilePath, 'utf8')
            const lines = data.split(/\r?\n/).filter(Boolean)
            this.buffer = lines.slice(-this.maxEntries)
            this.ready = true
        } catch (error) {
            this.log.warn('[Logs] Failed to read log file:', error.message)
            this.buffer = []
            this.ready = false
        }
        return this.buffer
    }

    startWatching() {
        if (!this.logFilePath) {
            return
        }
        if (this.watcher) {
            this.watcher.close()
            this.watcher = null
        }
        const dir = path.dirname(this.logFilePath)
        const file = path.basename(this.logFilePath)
        this.loadInitial().catch(() => null)
        try {
            this.watcher = fs.watch(dir, (_eventType, filename) => {
                if (!filename || filename !== file) {
                    return
                }
                void this.tail()
            })
        } catch (error) {
            this.log.warn('[Logs] Failed to watch log directory:', error.message)
        }
    }

    stopWatching() {
        if (this.watcher) {
            this.watcher.close()
            this.watcher = null
        }
    }

    async tail() {
        if (!this.logFilePath) {
            return []
        }
        try {
            const previousLength = this.buffer.length
            const data = await fs.promises.readFile(this.logFilePath, 'utf8')
            const lines = data.split(/\r?\n/).filter(Boolean)
            const recent = lines.slice(-this.maxEntries)
            this.buffer = recent
            if (recent.length > previousLength) {
                const appended = recent.slice(previousLength)
                if (appended.length) {
                    this.emit('append', appended)
                }
            }
            return recent
        } catch (error) {
            this.log.warn('[Logs] Tail read failed:', error.message)
            return this.buffer
        }
    }

    getRecent(limit = 200) {
        if (!this.ready) {
            return []
        }
        return this.buffer.slice(Math.max(this.buffer.length - limit, 0))
    }
}

module.exports = {
    LogManager
}
