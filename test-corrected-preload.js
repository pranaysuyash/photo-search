const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

async function testCorrectedPreload() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {  // Use webPreferences, not webContents
      devTools: true,
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'minimal-preload.js')
    }
  });

  // Debug console messages
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Console ${level}] ${message} (${sourceId}:${line})`);
  });

  // Check if contextBridge worked
  mainWindow.webContents.on('dom-ready', async () => {
    try {
      const hasTestAPI = await mainWindow.webContents.executeJavaScript('!!window.testAPI');
      console.log('window.testAPI exists:', hasTestAPI);

      if (hasTestAPI) {
        const result = await mainWindow.webContents.executeJavaScript('window.testAPI.hello()');
        console.log('window.testAPI.hello():', result);
      }

    } catch (error) {
      console.error('Error during test:', error.message);
    }
  });

  // Load a simple HTML file
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><title>Minimal Test</title></head>
    <body>
      <div id="root">Testing contextBridge...</div>
      <script>
        console.log('Page loaded, checking for testAPI...');
        console.log('window.testAPI:', window.testAPI);
      </script>
    </body>
    </html>
  `;

  const dataUrl = 'data:text/html,' + encodeURIComponent(htmlContent);
  await mainWindow.loadURL(dataUrl);
}

app.on('ready', testCorrectedPreload);