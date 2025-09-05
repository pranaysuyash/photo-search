const { app, BrowserWindow, dialog, Menu } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const { autoUpdater } = require('electron-updater')
const { loadLicense, licenseAllowsMajor } = require('./license')

let apiProc = null
let mainWindow = null

function startAPI() {
  const cwd = path.resolve(__dirname, '..')
  const args = ['-m', 'uvicorn', 'api.server:app', '--host', '127.0.0.1', '--port', '8000']
  apiProc = spawn(process.platform === 'win32' ? 'python' : 'python3', args, { cwd, stdio: 'inherit' })
}

function createWindow() {
  mainWindow = new BrowserWindow({ width: 1280, height: 800 })
  mainWindow.loadURL('http://127.0.0.1:8000/')
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
      message: ok ? 'License saved and validated.' : 'License saved but could not be validated. Check key or file.'
    })
  } catch (e) {
    dialog.showErrorBox('License Error', String(e?.message || e))
  }
}

function checkForUpdates(interactive = false) {
  if (!app.isPackaged || String(process.env.PS_AUTOUPDATE || '').toLowerCase() === 'off') {
    return
  }
  // Prevent auto-install of higher major if license disallows
  autoUpdater.autoDownload = true
  autoUpdater.on('update-available', (info) => {
    const appVer = app.getVersion().split('.')
    const nextVer = String(info?.version || '').split('.')
    const appMajor = parseInt(appVer[0] || '0', 10)
    const nextMajor = parseInt(nextVer[0] || '0', 10)
    const lic = loadLicense()
    if (!licenseAllowsMajor(lic, nextMajor)) {
      autoUpdater.autoDownload = false
      if (interactive) {
        dialog.showMessageBox({
          type: 'info',
          message: `Version ${info.version} is a paid upgrade.`,
          detail: 'Your current license covers this major version. Visit the website to purchase an upgrade.',
          buttons: ['Learn More', 'Close']
        }).then(({ response }) => {
          if (response === 0 && mainWindow) mainWindow.loadURL('https://yourdomain.com/#pricing')
        })
      }
      return
    }
    if (interactive && mainWindow) {
      dialog.showMessageBox({ type: 'info', message: `Update ${info.version} available`, buttons: ['OK'] })
    }
  })
  autoUpdater.on('download-progress', (p) => {
    if (interactive && mainWindow) {
      mainWindow.setProgressBar(p.percent / 100)
    }
  })
  autoUpdater.on('update-downloaded', (info) => {
    mainWindow && mainWindow.setProgressBar(-1)
    dialog.showMessageBox({
      type: 'info',
      message: `Update ${info.version} ready to install.`,
      buttons: ['Install and Restart', 'Later']
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall()
    })
  })
  try {
    autoUpdater.checkForUpdatesAndNotify()
  } catch (e) {
    if (interactive) dialog.showMessageBox({ type: 'warning', message: 'No update feed configured.' })
  }
}

app.whenReady().then(() => {
  setupMenu()
  startAPI()
  setTimeout(() => {
    createWindow()
    // Check for updates in background
    checkForUpdates(false)
  }, 1500)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('quit', () => {
  if (apiProc) try { apiProc.kill() } catch(e) {}
})
