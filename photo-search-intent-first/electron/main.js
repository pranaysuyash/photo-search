const { app, BrowserWindow } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

let apiProc = null

function startAPI() {
  const cwd = path.resolve(__dirname, '..')
  const args = ['-m', 'uvicorn', 'photo-search-intent-first.api.server:app', '--host', '127.0.0.1', '--port', '8000']
  apiProc = spawn(process.platform === 'win32' ? 'python' : 'python3', args, { cwd, stdio: 'inherit' })
}

function createWindow() {
  const win = new BrowserWindow({ width: 1280, height: 800 })
  win.loadURL('http://127.0.0.1:8000/')
}

app.whenReady().then(() => {
  startAPI()
  setTimeout(createWindow, 1500)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('quit', () => {
  if (apiProc) try { apiProc.kill() } catch(e) {}
})

