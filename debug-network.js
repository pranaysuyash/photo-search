const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      devTools: true,
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-v3/preload.js')
    }
  });

  // Capture console messages
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`App Console [${level}]: ${message} (line ${line}, ${sourceId})`);
  });

  // Capture network requests
  mainWindow.webContents.session.webRequest.onBeforeRequest((details, callback) => {
    console.log('Network request:', details.method, details.url);
    callback({});
  });

  // Capture failed requests
  mainWindow.webContents.session.webRequest.onCompleted((details) => {
    if (details.statusCode >= 400) {
      console.error('Network error:', details.statusCode, details.url);
    }
  });

  const appPath = `file://${path.join(__dirname, 'electron-v3/app/index.html')}`;
  console.log('Loading app:', appPath);

  mainWindow.loadURL(appPath).then(() => {
    console.log('App loaded successfully');
    mainWindow.webContents.openDevTools();
  }).catch(err => {
    console.error('Failed to load app:', err);
  });
}

app.on('ready', createWindow);