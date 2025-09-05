const { app, BrowserWindow } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

let apiProc = null

function startAPI() {
  const cwd = path.resolve(__dirname, '..')
  const args = ['-m', 'uvicorn', 'photo-search-classic.api.server:app', '--host', '127.0.0.1', '--port', '8001']
  apiProc = spawn(process.platform === 'win32' ? 'python' : 'python3', args, { cwd, stdio: 'inherit' })
}

function createWindow() {
  const win = new BrowserWindow({ width: 1280, height: 800 })
  // Load the React app instead of the API directly
  // Note: Vite may use port 5174 if 5173 is occupied
  win.loadURL('http://127.0.0.1:5174/')
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

