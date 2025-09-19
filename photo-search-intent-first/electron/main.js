const { app, BrowserWindow, dialog, Menu, ipcMain, protocol } = require('electron')
const isDev = process.env.NODE_ENV === 'development'
const isProd = !isDev && app.isPackaged
const path = require('path')
const { spawn } = require('child_process')
const { autoUpdater } = require('electron-updater')
const { loadLicense, licenseAllowsMajor } = require('./license')
const http = require('http')
const crypto = require('crypto')

// In some environments, GPU acceleration can cause a blank window. Disable in dev.
if (isDev) {
  try { app.disableHardwareAcceleration() } catch {}
}

let apiProc = null
let viteProc = null
let mainWindow = null
let apiToken = null
let currentTarget = null

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

function startAPI() {
  const cwd = path.resolve(__dirname, '..')
  const pythonPath = path.join(cwd, '.venv', 'bin', 'python')
  // Standardize dev API port to 8000 for consistency with docs and UI
  const args = ['-m', 'uvicorn', 'api.server:app', '--host', '127.0.0.1', '--port', '8000']
  // Generate an ephemeral API token for this run
  apiToken = crypto.randomBytes(24).toString('hex')
  const env = { ...process.env, API_TOKEN: apiToken }
  apiProc = spawn(pythonPath, args, { cwd, stdio: 'inherit', env })
  
  apiProc.on('exit', (code, signal) => {
    console.log(`API process exited with code ${code} and signal ${signal}`)
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
    try { mainWindow.show() } catch {}
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

async function determineUiTarget() {
  const devUrl = 'http://127.0.0.1:5173/'
  const apiUrl = 'http://127.0.0.1:8000/app/'
  const builtIndex = path.resolve(__dirname, '../api/web/index.html')
  const fs = require('fs')
  // If API HTTP UI is available, prefer it (most reliable)
  if (await httpPing(apiUrl)) {
    return { type: 'http', url: apiUrl }
  }
  // Prefer built UI if present for offline/stable loading
  if (fs.existsSync(builtIndex)) {
    console.log('Found built UI; loading from file for stability')
    return { type: 'file', file: builtIndex }
  }
  // Otherwise, if dev server already running, use it
  if (await httpPing(devUrl)) return { type: 'dev', url: devUrl }
  // Try to start Vite dev server
  try {
    const cwd = path.resolve(__dirname, '../webapp')
    console.log('Starting Vite dev server...')
    viteProc = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], { cwd, stdio: 'inherit', env: { ...process.env, BROWSER: 'none' } })
  } catch (e) {
    console.warn('Failed to spawn Vite dev server:', e?.message)
  }
  // Wait up to ~15s for Vite to become available
  for (let i = 0; i < 30; i++) {
    if (await httpPing(devUrl)) return { type: 'dev', url: devUrl }
    await new Promise((r) => setTimeout(r, 500))
  }
  // Final fallback to built index (even if not present we handle later)
  return { type: 'file', file: builtIndex }
}

function loadUI(target) {
  if (!mainWindow) return
  currentTarget = target
  if (target.type === 'dev' || target.type === 'http') {
    mainWindow.loadURL(target.url)
  } else {
    const fs = require('fs')
    if (fs.existsSync(target.file)) {
      console.log('Loading built UI via app:// from', target.file)
      // Use custom app:// scheme to avoid file:// module/CORS issues.
      // Always prefix with a host segment so path parsing is consistent across platforms.
      const abs = path.resolve(target.file)
      const asPosix = process.platform === 'win32' ? abs.replace(/\\/g, '/') : abs
      const pathWithLeadingSlash = asPosix.startsWith('/') ? asPosix : `/${asPosix}`
      const url = `app://local${encodeURI(pathWithLeadingSlash)}`
      console.log('[Loader] Navigating to', url)
      mainWindow.loadURL(url)
    } else {
      dialog.showErrorBox('UI Not Available', 'Vite dev server is not running and no built UI was found. Run "npm --prefix ../webapp run dev" or "npm --prefix ../webapp run build" and try again.')
    }
  }

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page finished loading')
    mainWindow.show()
    // Open DevTools immediately to see errors
    mainWindow.webContents.openDevTools()
  })
  
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load page:', errorCode, errorDescription, validatedURL)
    // If dev URL failed, try falling back to built files
    try {
      const fs = require('fs')
      const builtIndex = path.resolve(__dirname, '../api/web/index.html')
      if (target?.type === 'dev') {
        if (fs.existsSync(builtIndex)) {
          console.log('Falling back to built UI at', builtIndex)
          currentTarget = { type: 'file', file: builtIndex }
          mainWindow.loadFile(builtIndex)
          return
        }
      } else if (target?.type === 'file') {
        // If app:// load fails, try direct file:// load as a last resort
        if (fs.existsSync(target.file)) {
          console.log('Retrying direct file load for', target.file)
          mainWindow.loadFile(target.file)
          return
        }
      }
    } catch (e) {
      console.warn('Fallback load error:', e?.message)
    }
    // Show the window and leave DevTools open for visibility
    try { mainWindow.show() } catch {}
  })
  
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Web ${level}] ${message}`)
  })
  
  mainWindow.webContents.on('crashed', (event, killed) => {
    console.error('Renderer process crashed, killed:', killed)
  })
}

function setupMenu() {
  const template = [
    {
      label: 'Photo Search',
      submenu: [
        { label: 'Check for Updates…', click: () => checkForUpdates(true) },
        { label: 'Manage License…', click: manageLicense },
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

// IPC to set allowed root for app:// protocol restriction (production)
ipcMain.handle('set-allowed-root', async (_e, p) => {
  try {
    if (typeof p === 'string' && p.trim()) {
      process.env.PHOTOVAULT_ALLOWED_ROOT = p
      console.log('[Protocol] Allowed root set to:', p)
      return true
    }
  } catch {}
  return false
})

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
  // Register custom file protocol handler with basic root restriction
  protocol.registerFileProtocol('app', (request, callback) => {
    try {
      console.log('[Protocol Handler] Received request:', request.url)
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
      console.log('[Protocol Handler] Resolved file path:', filePath)
      const fs = require('fs')
      if (!fs.existsSync(filePath) && currentTarget?.type === 'file') {
        const rootDir = path.dirname(path.resolve(currentTarget.file))
        const trimmed = filePath.replace(/^[/\\]+/, '')
        const candidate = path.join(rootDir, trimmed)
        if (fs.existsSync(candidate)) {
          filePath = candidate
          console.log('[Protocol Handler] Re-mapped relative path to:', filePath)
        }
      }
      // Restrict served files to an allowed root in production
      const allowedRoot = process.env.PHOTOVAULT_ALLOWED_ROOT
      if (isProd && allowedRoot) {
        const root = path.resolve(allowedRoot) + path.sep
        const target = path.resolve(filePath)
        if (!target.startsWith(root)) {
          console.warn('[Protocol Handler] Blocked path outside allowed root:', target)
          callback({ error: -10 }) // net::ERR_ACCESS_DENIED
          return
        }
      }

      // Check if file exists
      if (fs.existsSync(filePath)) {
        console.log('[Protocol Handler] File exists, serving:', filePath)
        callback({ path: filePath })
      } else {
        console.log('[Protocol Handler] File NOT found:', filePath)
        callback({ error: -6 }) // net::ERR_FILE_NOT_FOUND
      }
    } catch (error) {
      console.error('[Protocol Handler] Error processing request:', error)
      callback({ error: -2 }) // net::ERR_FAILED
    }
  })
  
  const isApiRunning = await checkAPIRunning(8000)
  if (!isApiRunning) {
    console.log('Starting API server...')
    startAPI()
    // Wait a moment for API to start
    await new Promise(resolve => setTimeout(resolve, 3000))
  } else {
    console.log('API server already running on port 8000')
  }
  
  setupMenu()
  createWindow()
  // Show a quick splash while resolving UI target
  try { mainWindow.loadFile(path.join(__dirname, 'splash.html')) } catch {}
  const uiTarget = await determineUiTarget()
  currentTarget = uiTarget
  loadUI(uiTarget)
  
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      try {
        // Reuse last target; if not present, re-evaluate
        if (!currentTarget) currentTarget = await ensureViteDevServer()
        loadUI(currentTarget)
      } catch (e) {
        console.error('Failed to load UI on activate:', e)
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
      try { viteProc.kill() } catch {}
    }
    app.quit()
  }
})

app.on('before-quit', () => {
  if (apiProc) {
    apiProc.kill()
  }
  if (viteProc) {
    try { viteProc.kill() } catch {}
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
