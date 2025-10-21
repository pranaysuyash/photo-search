const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Enable debug mode
process.env.NODE_ENV = 'development';

// Keep a reference to the main window
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'electron-v3/preload.js'),
      devTools: true, // Force DevTools open
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Capture console messages from renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`Renderer Console [${level}]: ${message} (line ${line}, ${sourceId})`);
  });

  // Capture any errors
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer process gone:', details);
  });

  mainWindow.webContents.on('unresponsive', () => {
    console.error('Renderer process unresponsive');
  });

  // Load the app
  const appPath = `file://${path.join(__dirname, 'electron-v3/app/index.html')}`;
  console.log('Loading:', appPath);

  mainWindow.loadURL(appPath).then(() => {
    console.log('Page loaded successfully');
    // Open DevTools after load
    mainWindow.webContents.openDevTools();
  }).catch(err => {
    console.error('Failed to load page:', err);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});