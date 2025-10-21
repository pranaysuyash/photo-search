const { EventEmitter } = require('events')
const { performance } = require('perf_hooks')

class BackendHealthSupervisor extends EventEmitter {
    constructor({ logger, targetUrl, intervalMs = 7500, timeoutMs = 5000 } = {}) {
        super()
        this.log = logger || console
        this.targetUrl = targetUrl || 'http://127.0.0.1:8000/health'
        this.intervalMs = intervalMs
        this.timeoutMs = timeoutMs
        this.timer = null
        this.status = {
            backendRunning: false,
            lastCheckedAt: null,
            healthy: false,
            failures: 0,
            latencyMs: null,
            lastError: null
        }
    }

    attachBackendHooks({ onStart, onStop }) {
        if (typeof onStart === 'function') {
            onStart(() => this.markBackendRunning(true))
        }
        if (typeof onStop === 'function') {
            onStop(() => this.markBackendRunning(false))
        }
    }

    setTargetUrl(url) {
        if (typeof url === 'string' && url.trim()) {
            this.targetUrl = url
        }
    }

    markBackendRunning(running) {
        if (this.status.backendRunning === running) {
            return
        }
        this.status.backendRunning = running
        if (!running) {
            this.status.healthy = false
            this.status.latencyMs = null
        }
        this.emitUpdate({ reason: running ? 'backend-started' : 'backend-stopped' })
    }

    start() {
        if (this.timer) {
            return
        }
        this.timer = setInterval(() => {
            void this.check()
        }, this.intervalMs)
        void this.check()
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer)
            this.timer = null
        }
    }

    async check() {
        if (!this.status.backendRunning) {
            this.status.lastCheckedAt = new Date().toISOString()
            this.emitUpdate({ reason: 'skipped-backend-off' })
            return this.status
        }

        const start = performance.now()
        let controller
        try {
            controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), this.timeoutMs)
            const response = await fetch(this.targetUrl, {
                signal: controller.signal,
                headers: { Accept: 'application/json' }
            })
            clearTimeout(timer)
            const latencyMs = Math.round(performance.now() - start)
            const healthy = response.ok
            if (healthy) {
                this.status.failures = 0
            } else {
                this.status.failures += 1
            }
            this.status.healthy = healthy
            this.status.latencyMs = latencyMs
            this.status.lastError = healthy ? null : `${response.status} ${response.statusText}`
        } catch (error) {
            this.status.failures += 1
            this.status.healthy = false
            this.status.latencyMs = null
            this.status.lastError = error ? error.message : 'unknown-error'
        } finally {
            if (controller) {
                controller.abort()
            }
        }

        this.status.lastCheckedAt = new Date().toISOString()
        this.emitUpdate({ reason: 'poll' })
        return this.status
    }

    async forceCheck() {
        return await this.check()
    }

    getSnapshot() {
        return { ...this.status }
    }

    emitUpdate({ reason }) {
        const payload = {
            ...this.status,
            reason
        }
        this.emit('status', payload)
    }
}

module.exports = {
    BackendHealthSupervisor
}
