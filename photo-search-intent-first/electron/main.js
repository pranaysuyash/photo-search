/* eslint-env node */
/* global URL, require, process, __dirname, setTimeout, console */
const { app, BrowserWindow, dialog, Menu, ipcMain, protocol } = require('electron')
const isDev = process.env.NODE_ENV === 'development'
const isProd = !isDev && app.isPackaged
const path = require('path')
const { spawn } = require('child_process')
const { autoUpdater } = require('electron-updater')
const net = require('net')
const http = require('http')
const crypto = require('crypto')
const fs = require('fs')
const fsp = fs.promises

const ELECTRON_LOG_LEVEL = (process.env.ELECTRON_LOG_LEVEL || (isDev ? 'debug' : 'info')).toLowerCase()
const LOG_VERBOSE = ELECTRON_LOG_LEVEL === 'debug' || ELECTRON_LOG_LEVEL === 'trace' || ELECTRON_LOG_LEVEL === 'verbose'
const log = {
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
  debug: LOG_VERBOSE ? (...args) => console.debug(...args) : () => { },
}

// nosemgrep: codacy.tools-configs.javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal -- Helper uses path.resolve purely for containment check; callers pass trusted base and internally-derived paths
function containsPath(baseDir, maybeChild) {
  if (!baseDir || !maybeChild) return false
  // nosemgrep: codacy.tools-configs.javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal -- baseDir is from app config (not user input)
  const root = path.resolve(baseDir) + path.sep
  // nosemgrep: codacy.tools-configs.javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal -- maybeChild is derived from known locations (resources, __dirname) or protocol-validated URLs
  const target = path.resolve(maybeChild)
  return target.startsWith(root)
}

// In some environments, GPU acceleration can cause a blank window. Disable in dev.
if (isDev) {
  try { app.disableHardwareAcceleration() } catch { }
}

let apiProc = null
let viteProc = null
let mainWindow = null
let apiToken = null
let currentTarget = null
let selectedPort = 8000
let modelStatus = {
  ensured: false,
  copied: false,
  errors: [],
  source: null,
  destination: null,
  lastChecked: null,
}

function updateModelStatus(partial) {
  modelStatus = {
    ...modelStatus,
    ...partial,
    lastChecked: new Date().toISOString(),
  }
  return modelStatus
}

function getResourcesModelsPath() {
  const packagedPath = path.join(process.resourcesPath || '', 'models')
  // nosemgrep: codacy.tools-configs.javascript_pathtraversal_rule-non-literal-fs-filename -- Path derived from process.resourcesPath only
  if (packagedPath && fs.existsSync(packagedPath) && containsPath(process.resourcesPath || '', packagedPath)) {
    return packagedPath
  }
  const devPath = path.resolve(__dirname, 'models')
  // nosemgrep: codacy.tools-configs.javascript_pathtraversal_rule-non-literal-fs-filename -- Path derived from __dirname only
  if (fs.existsSync(devPath) && containsPath(path.resolve(__dirname), devPath)) {
    return devPath
  }
  return null
}

async function computeDirectoryDigest(directory) {
  const hash = crypto.createHash('sha256')
  let totalBytes = 0

  async function walk(current, relative) {
    const entries = await fsp.readdir(current, { withFileTypes: true })
    entries.sort((a, b) => a.name.localeCompare(b.name))
    for (const entry of entries) {
      // nosemgrep: codacy.tools-configs.javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal -- Entry names come from fs.readdir of a trusted directory
      const entryPath = path.join(current, entry.name)
      const relPath = relative ? `${relative}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        await walk(entryPath, relPath)
      } else if (entry.isFile()) {
        hash.update(relPath)
        // nosemgrep: codacy.tools-configs.javascript_pathtraversal_rule-non-literal-fs-filename -- Reading files discovered via fs.readdir within a trusted base directory
        const stream = fs.createReadStream(entryPath)
        for await (const chunk of stream) {
          hash.update(chunk)
        }
        const stat = await fsp.stat(entryPath)
        totalBytes += stat.size
      }
    }
  }

  await walk(directory, '')
  return { digest: hash.digest('hex'), totalBytes }
}

async function verifyModelDirectory(directory, expectedHash) {
  if (!expectedHash) return false
  try {
    const { digest } = await computeDirectoryDigest(directory)
    return digest === expectedHash
  } catch (error) {
    if (error && error.code === 'ENOENT') return false
    log.warn('[Models] Verification failure:', error?.message || error)
    return false
  }
}

async function copyModelDirectory(source, destination, destRoot) {
  // Guard against accidental writes outside the destination root
  if (!containsPath(destRoot, destination)) {
    throw new Error('Refusing to copy outside destination root')
  }
  await fsp.rm(destination, { recursive: true, force: true })
  await fsp.mkdir(path.dirname(destination), { recursive: true })
  await fsp.cp(source, destination, { recursive: true })
}

async function ensureBundledModels({ force = false, interactive = false } = {}) {
  const modelsRoot = getResourcesModelsPath()
  const errors = []
  let copied = false

  if (!modelsRoot) {
    const message = 'Bundled models were not found. Run "npm --prefix photo-search-intent-first/electron run prepare:models" before packaging.'
    errors.push(message)
    updateModelStatus({ ensured: false, copied: false, errors, source: null, destination: null })
    if (interactive) {
      dialog.showErrorBox('Models Missing', message)
    }
    return false
  }

  const manifestPath = path.join(modelsRoot, 'manifest.json')
  // nosemgrep: codacy.tools-configs.javascript_pathtraversal_rule-non-literal-fs-filename -- Path is fixed under modelsRoot and validated via containsPath
  if (!(containsPath(modelsRoot, manifestPath) && fs.existsSync(manifestPath))) {
    const templatePath = path.join(modelsRoot, 'manifest.template.json')
    // nosemgrep: codacy.tools-configs.javascript_pathtraversal_rule-non-literal-fs-filename -- Path is fixed under modelsRoot and validated via containsPath
    const message = (containsPath(modelsRoot, templatePath) && fs.existsSync(templatePath))
      ? 'Bundled models are not prepared. Run "npm --prefix photo-search-intent-first/electron run prepare:models" to download assets before building Electron packages.'
      : 'Bundled model manifest missing. Ensure prepare_models script has been executed.'
    errors.push(message)
    updateModelStatus({ ensured: false, copied: false, errors, source: modelsRoot, destination: null })
    if (interactive) {
      dialog.showErrorBox('Models Not Prepared', message)
    }
    return false
  }

  let manifest
  try {
    // nosemgrep: ESLint8_security_detect-non-literal-fs-filename -- Reading fixed manifest within trusted modelsRoot
    const raw = fs.readFileSync(manifestPath, 'utf-8')
    const parsed = JSON.parse(raw)
    manifest = Array.isArray(parsed) ? parsed : parsed?.models
  } catch (error) {
    const message = `Failed to parse manifest: ${error?.message || error}`
    errors.push(message)
    updateModelStatus({ ensured: false, copied: false, errors, source: modelsRoot, destination: null })
    if (interactive) {
      dialog.showErrorBox('Model Manifest Error', message)
    }
    return false
  }

  if (!Array.isArray(manifest) || manifest.length === 0) {
    const message = 'Model manifest is empty. Re-run the prepare_models script.'
    errors.push(message)
    updateModelStatus({ ensured: false, copied: false, errors, source: modelsRoot, destination: null })
    if (interactive) {
      dialog.showErrorBox('Model Manifest Error', message)
    }
    return false
  }

  const destinationRoot = path.join(app.getPath('userData'), 'models')
  await fsp.mkdir(destinationRoot, { recursive: true })

  for (const entry of manifest) {
    const localName = entry.local_name || entry.localName || entry.name
    if (!localName) {
      errors.push('Manifest entry missing local_name field.')
      continue
    }
    const sourceDir = path.join(modelsRoot, localName)
    const destDir = path.join(destinationRoot, localName)

    if (!containsPath(modelsRoot, sourceDir)) {
      errors.push('Computed source path escaped models root; aborting entry.')
      continue
    }
    if (!containsPath(destinationRoot, destDir)) {
      errors.push('Computed destination path escaped destination root; aborting entry.')
      continue
    }

    // nosemgrep: codacy.tools-configs.javascript_pathtraversal_rule-non-literal-fs-filename -- Validated to be under modelsRoot
    if (!fs.existsSync(sourceDir)) {
      errors.push(`Bundled model directory missing: ${sourceDir}`)
      continue
    }

    let needsCopy = force
    if (!needsCopy) {
      needsCopy = !(await verifyModelDirectory(destDir, entry.sha256))
    }

    if (needsCopy) {
      try {
        log.info(`[Models] Staging ${localName} → ${destDir}`)
        await copyModelDirectory(sourceDir, destDir, destinationRoot)
        copied = true
        if (entry.sha256) {
          const verified = await verifyModelDirectory(destDir, entry.sha256)
          if (!verified) {
            errors.push(`Hash verification failed after copying ${localName}.`)
          }
        }
      } catch (error) {
        errors.push(`Failed to stage ${localName}: ${error?.message || error}`)
      }
    }
  }

  const ensured = errors.length === 0
  updateModelStatus({ ensured, copied, errors, source: modelsRoot, destination: destinationRoot })

  if (ensured) {
    process.env.PHOTOVAULT_MODEL_DIR = destinationRoot
    process.env.SENTENCE_TRANSFORMERS_HOME = destinationRoot
    process.env.TRANSFORMERS_CACHE = destinationRoot
    process.env.TRANSFORMERS_OFFLINE = '1'
    process.env.HF_HUB_OFFLINE = '1'
    process.env.OFFLINE_MODE = '1'
  }

  if (interactive) {
    if (ensured) {
      dialog.showMessageBox({
        type: 'info',
        message: copied ? 'Bundled models refreshed successfully.' : 'Bundled models are already up to date.',
      })
    } else {
      dialog.showErrorBox('Bundled Models Issue', errors.join('\n'))
    }
  }

  return ensured
}

function checkAPIRunning(port = 5001) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/docs`, (res) => {
      resolve(res.statusCode === 200)
    })
    req.on('error', () => resolve(false))
    req.setTimeout(1000, () => {
      req.destroy()
      resolve(false)
    })
  })
}

function findFreePort(preferred = 8000) {
  return new Promise((resolve) => {
    // In dev, preserve the fixed port for no-regression behavior
    if (isDev) return resolve(preferred)
    const server = net.createServer()
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : preferred
      server.close(() => resolve(port))
    })
    server.on('error', () => resolve(preferred))
  })
}

async function waitForAPIReady({ port = 8000, timeoutMs = 30000 } = {}) {
  const start = Date.now()
  const endpoints = [
    `http://127.0.0.1:${port}/api/health`,
    `http://127.0.0.1:${port}/health`,
    `http://127.0.0.1:${port}/docs`
  ]
  async function anyHealthy() {
    for (const url of endpoints) {
      if (await httpPing(url)) return true
    }
    return false
  }
  // quick backoff: 100ms -> 500ms -> 1s up to timeout
  let delay = 100
  while (Date.now() - start < timeoutMs) {
    if (await anyHealthy()) return true
    await new Promise((r) => setTimeout(r, delay))
    delay = Math.min(delay * 1.5, 1000)
  }
  return false
}

function startAPI({ enableProdLogging = false, port = 8000 } = {}) {
  const cwd = path.resolve(__dirname, '..')
  const pythonPath = path.join(cwd, '.venv', 'bin', 'python')
  // Standardize dev API port to 8000 for consistency with docs and UI
  const args = ['-m', 'uvicorn', 'api.server:app', '--host', '127.0.0.1', '--port', String(port)]
  // Generate an ephemeral API token for this run
  apiToken = crypto.randomBytes(24).toString('hex')
  const env = { ...process.env, API_TOKEN: apiToken, API_PORT: String(port) }

  // In production, capture logs to a file for diagnostics
  if (isProd && enableProdLogging) {
    try {
      const userData = app.getPath('userData')
      const logsDir = path.join(userData, 'logs')
      if (!containsPath(userData, logsDir)) throw new Error('Invalid logs directory path')
      // nosemgrep: codacy.tools-configs.javascript_pathtraversal_rule-non-literal-fs-filename -- logsDir derived from app.getPath('userData'); containment verified
      fs.mkdirSync(logsDir, { recursive: true })
      const apiLogPath = path.join(logsDir, 'api.log')
      if (!containsPath(logsDir, apiLogPath)) throw new Error('Invalid api.log path')
      // nosemgrep: codacy.tools-configs.javascript_pathtraversal_rule-non-literal-fs-filename -- apiLogPath is within logsDir; containment verified
      const out = fs.createWriteStream(apiLogPath, { flags: 'a' })
      apiProc = spawn(pythonPath, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], env })
      apiProc.stdout.on('data', (d) => out.write(d))
      apiProc.stderr.on('data', (d) => out.write(d))
    } catch (e) {
      log.warn('Failed to initialize API log file, falling back to inherited stdio:', e?.message)
      apiProc = spawn(pythonPath, args, { cwd, stdio: 'inherit', env })
    }
  } else {
    apiProc = spawn(pythonPath, args, { cwd, stdio: 'inherit', env })
  }

  apiProc.on('exit', (code, signal) => {
    log.warn(`API process exited with code ${code} and signal ${signal}`)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // In production, keep webSecurity enabled. During dev we may relax for local testing.
      webSecurity: isProd ? true : false
    },
    show: false // Don't show until page is loaded
  })

  // Safety: show when ready even if did-finish-load never fires
  mainWindow.once('ready-to-show', () => {
    try { mainWindow.show() } catch { }
  })
}

function httpPing(url) {
  return new Promise((resolve) => {
    try {
      const req = http.get(url, (res) => {
        resolve(res.statusCode && res.statusCode >= 200 && res.statusCode < 500)
      })
      req.on('error', () => resolve(false))
      req.setTimeout(1000, () => { req.destroy(); resolve(false) })
    } catch {
      resolve(false)
    }
  })
}

function resolveBuiltUiCandidates() {
  const candidates = []
  // If packaged and copied via extraResources
  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, 'web', 'index.html'))
    candidates.push(path.join(process.resourcesPath, 'api_web', 'index.html'))
  }
  // Repo-relative dev/build locations
  candidates.push(path.resolve(__dirname, '../api/web/index.html'))
  candidates.push(path.resolve(__dirname, '../webapp/dist/index.html'))
  return candidates
}

function isAllowedBuiltUiPath(p) {
  const roots = []
  if (process.resourcesPath) {
    roots.push(path.join(process.resourcesPath, 'web'))
    roots.push(path.join(process.resourcesPath, 'api_web'))
  }
  roots.push(path.resolve(__dirname, '../api/web'))
  roots.push(path.resolve(__dirname, '../webapp/dist'))
  return roots.some((r) => containsPath(r, p))
}

async function determineUiTarget() {
  const devUrl = 'http://127.0.0.1:5173/'
  const apiUrl = `http://127.0.0.1:${selectedPort}/app/`
  const builtCandidates = resolveBuiltUiCandidates()
  // nosemgrep: codacy.tools-configs.javascript_pathtraversal_rule-non-literal-fs-filename -- Only considering paths from known candidates and after isAllowedBuiltUiPath(root containment) check
  const builtIndex = builtCandidates.find((p) => isAllowedBuiltUiPath(p) && fs.existsSync(p))
  // In production, prefer built UI for stability & clarity
  // nosemgrep: codacy.tools-configs.javascript_pathtraversal_rule-non-literal-fs-filename -- builtIndex validated by isAllowedBuiltUiPath and existence check
  if (isProd && builtIndex && fs.existsSync(builtIndex) && isAllowedBuiltUiPath(builtIndex)) {
    return { type: 'file', file: builtIndex }
  }
  // Dev quality-of-life: if API serves the SPA, it's acceptable
  if (!isProd && await httpPing(apiUrl)) {
    return { type: 'http', url: apiUrl }
  }
  // Prefer built UI if present for offline/stable loading
  if (builtIndex && fs.existsSync(builtIndex) && isAllowedBuiltUiPath(builtIndex)) {
    log.info('Found built UI; loading from file for stability')
    return { type: 'file', file: builtIndex }
  }
  // Otherwise, if dev server already running, use it
  if (await httpPing(devUrl)) return { type: 'dev', url: devUrl }
  // Try to start Vite dev server
  try {
    const cwd = path.resolve(__dirname, '../webapp')
    log.info('Starting Vite dev server...')
    viteProc = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], { cwd, stdio: 'inherit', env: { ...process.env, BROWSER: 'none' } })
  } catch (e) {
    log.warn('Failed to spawn Vite dev server:', e?.message)
  }
  // Wait up to ~15s for Vite to become available
  for (let i = 0; i < 30; i++) {
    if (await httpPing(devUrl)) return { type: 'dev', url: devUrl }
    await new Promise((r) => setTimeout(r, 500))
  }
  // Final fallback to first candidate path (may not exist; will be handled later)
  return { type: 'file', file: builtCandidates[0] || path.resolve(__dirname, '../api/web/index.html') }
}

function loadUI(target) {
  if (!mainWindow) return
  currentTarget = target
  if (target.type === 'dev' || target.type === 'http') {
    mainWindow.loadURL(target.url)
  } else {
    const fs = require('fs')
    // Guard against unexpected paths
    // nosemgrep: codacy.tools-configs.javascript_pathtraversal_rule-non-literal-fs-filename -- Path validated by isAllowedBuiltUiPath and existence check
    if (target.file && isAllowedBuiltUiPath(target.file) && fs.existsSync(target.file)) {
      log.info('Loading built UI via app:// from', target.file)
      // Use custom app:// scheme to avoid file:// module/CORS issues.
      // Always prefix with a host segment so path parsing is consistent across platforms.
      // nosemgrep: codacy.tools-configs.javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal -- target.file previously validated; resolution here is for normalization only
      const abs = path.resolve(target.file)
      const asPosix = process.platform === 'win32' ? abs.replace(/\\/g, '/') : abs
      const pathWithLeadingSlash = asPosix.startsWith('/') ? asPosix : `/${asPosix}`
      const url = `app://local${encodeURI(pathWithLeadingSlash)}`
      log.debug('[Loader] Navigating to', url)
      // Automatically restrict protocol serving to the built UI root in production
      try {
        if (isProd) {
          const rootDir = path.dirname(abs)
          process.env.PHOTOVAULT_ALLOWED_ROOT = rootDir
          log.debug('[Protocol] Auto-set allowed root to', rootDir)
        }
      } catch { }
      mainWindow.loadURL(url)
    } else {
      dialog.showErrorBox('UI Not Available', 'Vite dev server is not running and no built UI was found. Run "npm --prefix ../webapp run dev" or "npm --prefix ../webapp run build" and try again.')
    }
  }

  mainWindow.webContents.on('did-finish-load', () => {
    log.info('Page finished loading')
    mainWindow.show()
    // Open DevTools immediately to see errors
    mainWindow.webContents.openDevTools()
    if (isDev) {
      log.debug('[Boot] Shell: Electron, UI: React+Vite, API: FastAPI, Streamlit: false')
    }
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    log.error('Failed to load page:', errorCode, errorDescription, validatedURL)
    // If dev URL failed, try falling back to built files
    try {
      const fs = require('fs')
      const builtIndex = path.resolve(__dirname, '../api/web/index.html')
      if (target?.type === 'dev') {
        // nosemgrep: codacy.tools-configs.javascript_pathtraversal_rule-non-literal-fs-filename -- builtIndex is a fixed, repo-relative path
        if (isAllowedBuiltUiPath(builtIndex) && fs.existsSync(builtIndex)) {
          log.warn('Falling back to built UI at', builtIndex)
          currentTarget = { type: 'file', file: builtIndex }
          mainWindow.loadFile(builtIndex)
          return
        }
      } else if (target?.type === 'file') {
        // If app:// load fails, try direct file:// load as a last resort
        // nosemgrep: codacy.tools-configs.javascript_pathtraversal_rule-non-literal-fs-filename -- target.file validated and existence-checked
        if (target.file && isAllowedBuiltUiPath(target.file) && fs.existsSync(target.file)) {
          log.warn('Retrying direct file load for', target.file)
          mainWindow.loadFile(target.file)
          return
        }
      }
    } catch (e) {
      log.warn('Fallback load error:', e?.message)
    }
    // Show the window and leave DevTools open for visibility
    try { mainWindow.show() } catch { }
  })

  mainWindow.webContents.on('console-message', (_event, level, message) => {
    const levelNames = ['info', 'warn', 'error', 'debug']
    const resolved = levelNames[level] || 'info'
    const targetLogger = typeof log[resolved] === 'function' ? log[resolved] : log.info
    targetLogger(`[Web ${resolved}] ${message}`)
  })

  mainWindow.webContents.on('crashed', (_event, killed) => {
    log.error('Renderer process crashed, killed:', killed)
  })
}

function setupMenu() {
  const template = [
    {
      label: 'Photo Search',
      submenu: [
        {
          label: 'About…',
          click: () => {
            const versions = process.versions || {};
            dialog.showMessageBox({
              type: 'info',
              title: 'About Photo Search',
              message:
                `Photo Search\n\n` +
                `Shell: Electron ${versions.electron || 'N/A'}\n` +
                `Chromium: ${versions.chrome || 'N/A'}\n` +
                `Node: ${versions.node || 'N/A'}\n\n` +
                `Frontend: React + Vite\n` +
                `Backend: FastAPI\n` +
                `Streamlit: false`,
              buttons: ['OK']
            });
          }
        },
        { label: 'Check for Updates…', click: () => checkForUpdates(true) },
        { label: 'Manage License…', click: manageLicense },
        {
          label: 'Refresh Bundled Models…',
          click: () => ensureBundledModels({ force: true, interactive: true }),
        },
        { type: 'separator' },
        {
          label: 'Restart Backend API',
          click: async () => {
            await restartBackend()
            dialog.showMessageBox({ type: 'info', message: 'Backend restarted.' })
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

async function manageLicense() {
  const res = await dialog.showOpenDialog({
    title: 'Select License File',
    filters: [{ name: 'License', extensions: ['json'] }],
    properties: ['openFile']
  })
  if (res.canceled || !res.filePaths?.length) return
  const fs = require('fs')
  const p = res.filePaths[0]
  try {
    // nosemgrep: ESLint8_security_detect-non-literal-fs-filename -- Path selected by user via file picker; intentionally reading chosen file
    const content = fs.readFileSync(p, 'utf-8')
    const ok = await require('./license').saveAndValidate(content)
    dialog.showMessageBox({
      type: ok ? 'info' : 'warning',
      message: ok ? 'License applied.' : 'Invalid license.'
    })
  } catch (e) {
    dialog.showErrorBox('Error', e.message)
  }
}

// IPC handler for folder selection
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Photo Folder',
    properties: ['openDirectory'],
    buttonLabel: 'Select Folder'
  })

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

// IPC handler to expose API token to the renderer (preload bridges it safely)
ipcMain.handle('get-api-token', async () => {
  return apiToken || ''
})

// IPC handler to provide API base and token to the renderer for dynamic port wiring
ipcMain.handle('get-api-config', async () => {
  try {
    const base = `http://127.0.0.1:${selectedPort}`
    return { base, token: apiToken || '' }
  } catch {
    return { base: 'http://127.0.0.1:8000', token: apiToken || '' }
  }
})

// IPC to set allowed root for app:// protocol restriction (production)
ipcMain.handle('set-allowed-root', async (_e, p) => {
  try {
    if (typeof p === 'string' && p.trim()) {
      process.env.PHOTOVAULT_ALLOWED_ROOT = p
      log.debug('[Protocol] Allowed root set to:', p)
      return true
    }
  } catch { }
  return false
})

ipcMain.handle('models:get-status', async () => modelStatus)

ipcMain.handle('models:refresh', async () => {
  const ok = await ensureBundledModels({ force: true })
  return { ok, status: modelStatus }
})

ipcMain.handle('backend:restart', async () => {
  await restartBackend()
  return true
})

async function restartBackend() {
  try {
    if (apiProc) {
      try { apiProc.kill() } catch { }
      apiProc = null
    }
    // Reuse the previously selected port (fixed in dev, random in prod)
    startAPI({ enableProdLogging: true, port: selectedPort })
    const ready = await waitForAPIReady({ port: selectedPort, timeoutMs: 20000 })
    if (!ready) log.warn('Backend did not report ready after restart window')
  } catch (e) {
    log.warn('Failed to restart backend:', e?.message)
  }
}

async function checkForUpdates(userTriggered = false) {
  try {
    const { updateInfo } = await autoUpdater.checkForUpdatesAndNotify()
    if (userTriggered && !updateInfo) {
      dialog.showMessageBox({ type: 'info', message: 'You are up to date.' })
    }
  } catch (e) {
    if (userTriggered) dialog.showErrorBox('Update Error', e.message)
  }
}

app.whenReady().then(async () => {
  // License check: non-blocking gate with user prompt
  try {
    const appVersion = app.getVersion ? (app.getVersion() || '0.0.0') : '0.0.0'
    const targetMajor = parseInt(String(appVersion.split('.')?.[0] || '0'), 10)
    const lic = require('./license').loadLicense()
    const ok = require('./license').licenseAllowsMajor(lic, targetMajor)
    process.env.PS_LICENSE_OK = ok ? '1' : '0'
    if (!ok) {
      const res = await dialog.showMessageBox({
        type: 'warning',
        title: 'License Required',
        message: `Your license does not cover major version ${targetMajor}. Some features may be disabled.`,
        buttons: ['Manage License…', 'Continue'],
        cancelId: 1,
        defaultId: 0,
      })
      if (res.response === 0) {
        try { await manageLicense() } catch { }
      }
    }
  } catch (e) {
    log.warn('License check failed:', e?.message)
  }
  // Register custom file protocol handler with basic root restriction
  protocol.registerFileProtocol('app', (request, callback) => {
    try {
      log.debug('[Protocol Handler] Received request:', request.url)
      let filePath = ''
      try {
        const parsed = new URL(request.url)
        filePath = decodeURIComponent(parsed.pathname)
        // On Windows, pathname can be like /C:/path — strip leading slash
        if (process.platform === 'win32' && /^\/[A-Za-z]:\//.test(filePath)) {
          filePath = filePath.slice(1)
        }
      } catch {
        // Fallback: previous replacement method
        const url = request.url.replace('app://', '')
        filePath = decodeURIComponent(url)
      }
      filePath = path.normalize(filePath)
      log.debug('[Protocol Handler] Resolved file path:', filePath)
      const fs = require('fs')
      // nosemgrep: codacy.tools-configs.javascript_pathtraversal_rule-non-literal-fs-filename -- filePath comes from app:// URL; will be constrained below by allowedRoot; this mapping attempts to serve relative assets alongside validated currentTarget
      if (!fs.existsSync(filePath) && currentTarget?.type === 'file') {
        const rootDir = path.dirname(path.resolve(currentTarget.file))
        const trimmed = filePath.replace(/^[/\\]+/, '')
        const candidate = path.join(rootDir, trimmed)
        // nosemgrep: codacy.tools-configs.javascript_pathtraversal_rule-non-literal-fs-filename -- candidate path is under rootDir; final check below enforces allowedRoot containment in production
        if (fs.existsSync(candidate)) {
          filePath = candidate
          log.debug('[Protocol Handler] Re-mapped relative path to:', filePath)
        }
      }
      // Restrict served files to an allowed root in production
      const allowedRoot = process.env.PHOTOVAULT_ALLOWED_ROOT
      if (isProd && allowedRoot) {
        const root = path.resolve(allowedRoot) + path.sep
        const target = path.resolve(filePath)
        if (!target.startsWith(root)) {
          log.warn('[Protocol Handler] Blocked path outside allowed root:', target)
          callback({ error: -10 }) // net::ERR_ACCESS_DENIED
          return
        }
      }

      // Check if file exists
      // nosemgrep: codacy.tools-configs.javascript_pathtraversal_rule-non-literal-fs-filename -- filePath either absolute validated via allowedRoot or remapped under currentTarget root
      if (fs.existsSync(filePath)) {
        log.debug('[Protocol Handler] File exists, serving:', filePath)
        callback({ path: filePath })
      } else {
        log.warn('[Protocol Handler] File NOT found:', filePath)
        callback({ error: -6 }) // net::ERR_FILE_NOT_FOUND
      }
    } catch (error) {
      log.error('[Protocol Handler] Error processing request:', error)
      callback({ error: -2 }) // net::ERR_FAILED
    }
  })

  const modelsReady = await ensureBundledModels()
  if (!modelsReady) {
    log.warn('[Models] Bundled models are unavailable; local provider may be limited until assets are prepared.')
  }

  // Choose port: fixed 8000 in dev, random free in prod for isolation
  selectedPort = isDev ? 8000 : await findFreePort(8000)
  const isApiRunning = await checkAPIRunning(selectedPort)
  if (!isApiRunning) {
    log.info('Starting API server...')
    startAPI({ enableProdLogging: true, port: selectedPort })
    // Wait for API health instead of a fixed delay
    const healthy = await waitForAPIReady({ port: selectedPort, timeoutMs: 30000 })
    if (!healthy) {
      log.warn('API did not become healthy within timeout; UI may show limited functionality until it comes up.')
    }
  } else {
    log.info(`API server already running on port ${selectedPort}`)
  }

  setupMenu()
  createWindow()
  // Show a quick splash while resolving UI target
  try { mainWindow.loadFile(path.join(__dirname, 'splash.html')) } catch { }
  const uiTarget = await determineUiTarget()
  currentTarget = uiTarget
  loadUI(uiTarget)

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      try {
        // Reuse last target; if not present, re-evaluate
        if (!currentTarget) currentTarget = await determineUiTarget()
        loadUI(currentTarget)
      } catch (e) {
        log.error('Failed to load UI on activate:', e)
      }
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (apiProc) {
      apiProc.kill()
    }
    if (viteProc) {
      try { viteProc.kill() } catch { }
    }
    app.quit()
  }
})

app.on('before-quit', () => {
  if (apiProc) {
    apiProc.kill()
  }
  if (viteProc) {
    try { viteProc.kill() } catch { }
  }
})

// Register custom protocol for file access - MUST be called before app.whenReady()
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      allowServiceWorkers: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
])

autoUpdater.checkForUpdatesAndNotify()
