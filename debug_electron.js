const { app, BrowserWindow } = require('electron');

let mainWindow;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: require('path').join(__dirname, 'electron-v3', 'preload.js'),
      webSecurity: true
    }
  });

  // Load the app
  const appPath = `file://${require('path').join(__dirname, 'electron-v3', 'app', 'index.html')}`;
  console.log('Loading URL:', appPath);

  try {
    await mainWindow.loadURL(appPath);
    console.log('URL loaded successfully');

    // Wait a bit for the page to render
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if the page loaded correctly
    const title = await mainWindow.webContents.executeJavaScript('document.title');
    console.log('Page title:', title);

    const rootElement = await mainWindow.webContents.executeJavaScript('document.getElementById("root")');
    console.log('Root element exists:', !!rootElement);

    if (rootElement) {
      const rootHtml = await mainWindow.webContents.executeJavaScript('document.getElementById("root").innerHTML');
      console.log('Root innerHTML:', rootHtml);
    }

    // Check for JavaScript errors
    const errors = [];
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`Console message [${level}]: ${message} (line ${line}, ${sourceId})`);
      if (level === 2) { // Error level
        errors.push({ level, message, line, sourceId });
      }
    });

    // Wait a bit more to catch any errors
    await new Promise(resolve => setTimeout(resolve, 3000));

    if (errors.length > 0) {
      console.log('JavaScript errors found:', errors);
    } else {
      console.log('No JavaScript errors detected');
    }

    // Try to open DevTools to see what's happening
    mainWindow.webContents.openDevTools();

  } catch (error) {
    console.error('Failed to load URL:', error);
  }
}

app.whenReady().then(createWindow);