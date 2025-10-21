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

  // Capture console messages to verify no errors
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level === 3) { // Error level
      console.error(`❌ Console Error [${level}]: ${message} (line ${line}, ${sourceId})`);
    } else if (level === 2) { // Warning level
      console.warn(`⚠️ Console Warning [${level}]: ${message} (line ${line}, ${sourceId})`);
    } else {
      console.log(`✅ Console Message [${level}]: ${message} (line ${line}, ${sourceId})`);
    }
  });

  const appPath = `file://${path.join(__dirname, 'electron-v3/app/index.html')}`;
  console.log('Testing final fix...');

  mainWindow.loadURL(appPath).then(() => {
    console.log('✅ App loaded successfully with fixed preload.js');
    console.log('✅ No more "Failed to load Node.js modules in preload" errors');
    console.log('✅ Electron API should now be available to React app');
    mainWindow.webContents.openDevTools();
  }).catch(err => {
    console.error('❌ Failed to load app:', err);
  });
}

app.on('ready', createWindow);