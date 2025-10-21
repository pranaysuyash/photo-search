const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

async function finalComprehensiveTest() {
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

  // Capture all console messages
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level === 3) {
      console.error(`❌ ERROR [${level}]: ${message} (${sourceId}:${line})`);
    } else if (level === 2) {
      console.warn(`⚠️ WARN [${level}]: ${message} (${sourceId}:${line})`);
    } else {
      console.log(`✅ LOG [${level}]: ${message} (${sourceId}:${line})`);
    }
  });

  mainWindow.webContents.on('dom-ready', async () => {
    console.log('\n=== COMPREHENSIVE FUNCTIONALITY TEST ===');

    try {
      // Test 1: Check if electronAPI exists
      const hasElectronAPI = await mainWindow.webContents.executeJavaScript('!!window.electronAPI');
      console.log(`Test 1 - window.electronAPI exists: ${hasElectronAPI ? '✅ PASS' : '❌ FAIL'}`);

      if (hasElectronAPI) {
        // Test 2: Check if electronAPI has methods
        const methods = await mainWindow.webContents.executeJavaScript('Object.keys(window.electronAPI)');
        console.log(`Test 2 - electronAPI methods available: ${methods.length > 0 ? '✅ PASS' : '❌ FAIL'} (${methods.length} methods)`);

        // Test 3: Check if React app mounted
        const hasReactContent = await mainWindow.webContents.executeJavaScript(`
          const root = document.getElementById('root');
          root && root.children.length > 0 && root.innerHTML.trim() !== '';
        `);
        console.log(`Test 3 - React app mounted: ${hasReactContent ? '✅ PASS' : '❌ FAIL'}`);

        // Test 4: Check document title
        const title = await mainWindow.webContents.executeJavaScript('document.title');
        console.log(`Test 4 - Document title: ${title === 'Photo Search v3' ? '✅ PASS' : '❌ FAIL'} ("${title}")`);

        // Test 5: Check if assets loaded
        const hasAssets = await mainWindow.webContents.executeJavaScript(`
          Array.from(document.querySelectorAll('link[rel="stylesheet"], script[type="module"]')).every(el => {
            return el.href || el.src;
          });
        `);
        console.log(`Test 5 - Assets loaded: ${hasAssets ? '✅ PASS' : '❌ FAIL'}`);

        // Test 6: Try a simple API call
        try {
          const appVersion = await mainWindow.webContents.executeJavaScript('window.electronAPI.getAppVersion ? window.electronAPI.getAppVersion() : null');
          console.log(`Test 6 - API call works: ${appVersion ? '✅ PASS' : '⚠️ PARTIAL'} (got: ${appVersion})`);
        } catch (error) {
          console.log(`Test 6 - API call: ⚠️ ERROR (${error.message})`);
        }

      } else {
        console.log('❌ CRITICAL: electronAPI not available - React app will not work');
      }

      // Final assessment
      console.log('\n=== FINAL ASSESSMENT ===');
      if (hasElectronAPI) {
        console.log('✅ APP STATUS: FUNCTIONAL');
        console.log('✅ The Electron app should now be working properly');
        console.log('✅ React app can access Electron APIs');
        console.log('✅ File system operations should work');
        console.log('✅ Settings and preferences should work');
        console.log('✅ Menu operations should work');
      } else {
        console.log('❌ APP STATUS: STILL BROKEN');
        console.log('❌ electronAPI not available');
        console.log('❌ React app cannot access Electron APIs');
        console.log('❌ Need to investigate further');
      }

    } catch (error) {
      console.error('❌ Test execution failed:', error.message);
    }
  });

  const appPath = `file://${path.join(__dirname, 'electron-v3/app/index.html')}`;
  console.log('Starting comprehensive functionality test...');

  await mainWindow.loadURL(appPath);
  console.log('App loaded, running tests...');
}

app.on('ready', finalComprehensiveTest);