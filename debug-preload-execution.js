const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

async function debugPreload() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webContents: {
      devTools: true,
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-v3/preload.js')
    }
  });

  // Debug preload execution
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Console ${level}] ${message} (${sourceId}:${line})`);
  });

  // Check if contextBridge worked
  mainWindow.webContents.on('dom-ready', async () => {
    try {
      // Test if contextBridge worked
      const hasElectronAPI = await mainWindow.webContents.executeJavaScript('!!window.electronAPI');
      console.log('window.electronAPI exists:', hasElectronAPI);

      if (!hasElectronAPI) {
        // Check if contextBridge is available
        const hasContextBridge = await mainWindow.webContents.executeJavaScript('!!window.require');
        console.log('window.require exists:', hasContextBridge);

        // Check for any global variables
        const globals = await mainWindow.webContents.executeJavaScript('Object.getOwnPropertyNames(window).filter(name => name.includes("electron") || name.includes("bridge") || name.includes("ipc"))');
        console.log('Global variables with electron/bridge/ipc:', globals);

        // Check if there are any errors in the preload execution
        console.log('Checking for preload execution errors...');
      }

      // Check root content
      const rootContent = await mainWindow.webContents.executeJavaScript(`
        const root = document.getElementById('root');
        if (!root) {
          'NO_ROOT_ELEMENT';
        } else if (root.children.length === 0) {
          'ROOT_EMPTY';
        } else {
          'ROOT_HAS_CONTENT:' + root.children.length;
        }
      `);
      console.log('Root content status:', rootContent);

    } catch (error) {
      console.error('Error during dom-ready check:', error.message);
    }
  });

  const appPath = `file://${path.join(__dirname, 'electron-v3/app/index.html')}`;
  console.log('Debugging preload execution...');

  await mainWindow.loadURL(appPath);
  console.log('Page loaded, checking preload results...');
}

app.on('ready', debugPreload);