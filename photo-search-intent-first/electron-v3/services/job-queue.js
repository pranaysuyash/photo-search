const { EventEmitter } = require('events')
const path = require('path')
let Database = null
try {
    // eslint-disable-next-line global-require
    Database = require('better-sqlite3')
} catch (_error) {
    Database = null
}

const STATUSES = ['pending', 'running', 'completed', 'failed', 'cancelled']

class InMemoryQueue extends EventEmitter {
    constructor({ logger } = {}) {
        super()
        this.log = logger || console
        this.jobs = new Map()
    }

    async initialize() {
        return true
    }

    enqueue({ type, payload = {}, priority = 0, runAt = null }) {
        const job = this.buildJob({ type, payload, priority, runAt })
        this.jobs.set(job.id, job)
        this.emitChange('enqueue', job)
        return job
    }

    list({ status, limit = 50 } = {}) {
        const all = Array.from(this.jobs.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        const filtered = status ? all.filter(job => job.status === status) : all
        return filtered.slice(0, limit)
    }

    updateStatus(id, status, error = null) {
        if (!this.jobs.has(id)) {
            return null
        }
        const job = this.jobs.get(id)
        job.status = status
        job.updatedAt = new Date().toISOString()
        job.error = error
        this.emitChange('status', job)
        return job
    }

    metrics() {
        const counts = {}
        for (const key of STATUSES) {
            counts[key] = 0
        }
        for (const job of this.jobs.values()) {
            counts[job.status] = (counts[job.status] || 0) + 1
        }
        return {
            counts,
            total: this.jobs.size
        }
    }

    buildJob({ type, payload, priority, runAt }) {
        return {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            type,
            payload,
            priority,
            status: 'pending',
            attempts: 0,
            error: null,
            runAt: runAt || new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    }

    emitChange(reason, job) {
        this.emit('change', {
            reason,
            job,
            metrics: this.metrics()
        })
    }
}

class SQLiteJobQueue extends EventEmitter {
    constructor({ logger, dbPath }) {
        super()
        this.log = logger || console
        this.dbPath = dbPath
        this.db = null
    }

    async initialize() {
        const resolved = path.resolve(this.dbPath)
        this.db = new Database(resolved)
        this.db.pragma('journal_mode = WAL')
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                payload TEXT,
                priority INTEGER DEFAULT 0,
                status TEXT NOT NULL,
                attempts INTEGER DEFAULT 0,
                error TEXT,
                run_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        `)
        this.insertStmt = this.db.prepare(`
            INSERT INTO jobs (id, type, payload, priority, status, attempts, error, run_at, created_at, updated_at)
            VALUES (@id, @type, @payload, @priority, @status, @attempts, @error, @runAt, @createdAt, @updatedAt);
        `)
        this.listStmt = this.db.prepare(`
            SELECT * FROM jobs
            WHERE (@status IS NULL OR status = @status)
            ORDER BY created_at ASC
            LIMIT @limit;
        `)
        this.updateStatusStmt = this.db.prepare(`
            UPDATE jobs
            SET status = @status, error = @error, updated_at = @updatedAt
            WHERE id = @id;
        `)
        this.metricsStmt = this.db.prepare(`
            SELECT status, COUNT(*) as count FROM jobs GROUP BY status;
        `)
        this.selectByIdStmt = this.db.prepare('SELECT * FROM jobs WHERE id = ? LIMIT 1;')
        return true
    }

    enqueue({ type, payload = {}, priority = 0, runAt = null }) {
        const job = this.buildJob({ type, payload, priority, runAt })
        this.insertStmt.run(job)
        const hydrated = this.inflateRow({
            id: job.id,
            type: job.type,
            payload: job.payload,
            priority: job.priority,
            status: job.status,
            attempts: job.attempts,
            error: job.error,
            run_at: job.runAt,
            created_at: job.createdAt,
            updated_at: job.updatedAt
        })
        this.emitChange('enqueue', hydrated)
        return hydrated
    }

    list({ status = null, limit = 50 } = {}) {
        const rows = this.listStmt.all({ status, limit })
        return rows.map(this.inflateRow)
    }

    updateStatus(id, status, error = null) {
        const updatedAt = new Date().toISOString()
        const result = this.updateStatusStmt.run({ id, status, error, updatedAt })
        if (!result.changes) {
            return null
        }
        const row = this.selectByIdStmt.get(id)
        const job = row ? this.inflateRow(row) : null
        if (job) {
            this.emitChange('status', job)
        }
        return job
    }

    metrics() {
        const rows = this.metricsStmt.all()
        const counts = {}
        for (const key of STATUSES) {
            counts[key] = 0
        }
        for (const row of rows) {
            counts[row.status] = row.count
        }
        return {
            counts,
            total: Object.values(counts).reduce((acc, value) => acc + value, 0)
        }
    }

    buildJob({ type, payload, priority, runAt }) {
        const now = new Date().toISOString()
        return {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            type,
            payload: JSON.stringify(payload || {}),
            priority,
            status: 'pending',
            attempts: 0,
            error: null,
            runAt: runAt || now,
            createdAt: now,
            updatedAt: now
        }
    }

    inflateRow(row) {
        return {
            id: row.id,
            type: row.type,
            payload: row.payload ? JSON.parse(row.payload) : {},
            priority: row.priority,
            status: row.status,
            attempts: row.attempts,
            error: row.error,
            runAt: row.run_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }
    }

    emitChange(reason, job) {
        this.emit('change', {
            reason,
            job,
            metrics: this.metrics()
        })
    }
}

function createJobQueue({ logger, dbPath }) {
    if (Database) {
        return new SQLiteJobQueue({ logger, dbPath })
    }
    const queue = new InMemoryQueue({ logger })
    if (logger) {
        logger.warn('[Queue] Fallback to in-memory queue (SQLite unavailable)')
    }
    return queue
}

module.exports = {
    createJobQueue,
    STATUSES
}
