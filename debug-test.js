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
      contextIsolation: false // Disable for testing
    }
  });

  // Capture console messages
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`Test Console [${level}]: ${message} (line ${line}, ${sourceId})`);
  });

  const testPath = `file://${path.join(__dirname, 'electron-v3/app/test.html')}`;
  console.log('Loading test page:', testPath);

  mainWindow.loadURL(testPath).then(() => {
    console.log('Test page loaded successfully');
    mainWindow.webContents.openDevTools();
  }).catch(err => {
    console.error('Failed to load test page:', err);
  });
}

app.on('ready', createWindow);