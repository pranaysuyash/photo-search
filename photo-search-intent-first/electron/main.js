const { app, BrowserWindow, dialog, Menu } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const { autoUpdater } = require('electron-updater')
const { loadLicense, licenseAllowsMajor } = require('./license')
const http = require('http')

let apiProc = null
let mainWindow = null

function checkAPIRunning(port = 8000) {
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
  const args = ['-m', 'uvicorn', 'api.server:app', '--host', '127.0.0.1', '--port', '8000']
  apiProc = spawn(pythonPath, args, { cwd, stdio: 'inherit' })
  
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
      contextIsolation: true
    },
    show: false // Don't show until page is loaded
  })
  
  mainWindow.loadURL('http://127.0.0.1:5173/')
  
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page finished loading')
    mainWindow.show()
    // Open DevTools immediately to see errors
    mainWindow.webContents.openDevTools()
  })
  
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load page:', errorCode, errorDescription)
  })
  
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Web ${level}] ${message}`)
  })
  
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL)
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
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (apiProc) {
      apiProc.kill()
    }
    app.quit()
  }
})

app.on('before-quit', () => {
  if (apiProc) {
    apiProc.kill()
  }
})

autoUpdater.checkForUpdatesAndNotify()
