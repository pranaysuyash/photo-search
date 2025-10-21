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
      // No preload for now to test
    }
  });

  // Capture console messages
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`Simple Console [${level}]: ${message} (line ${line}, ${sourceId})`);
  });

  const appPath = `file://${path.join(__dirname, 'electron-v3/app/index.html')}`;
  console.log('Loading app without preload:', appPath);

  mainWindow.loadURL(appPath).then(() => {
    console.log('App loaded without preload');
    mainWindow.webContents.openDevTools();
  }).catch(err => {
    console.error('Failed to load app:', err);
  });
}

app.on('ready', createWindow);