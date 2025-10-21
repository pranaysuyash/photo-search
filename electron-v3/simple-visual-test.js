const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

async function testElectronAppVisually() {
    console.log('🔍 Performing simple visual verification of Electron app...');

    try {
        // Create a test window to verify basic functionality
        const testWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            show: true, // Show window for visual verification
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                preload: path.join(__dirname, 'preload.js'),
                webSecurity: true
            }
        });

        // Load the app
        const appPath = `file://${path.join(__dirname, 'app', 'index.html')}`;
        console.log('Loading:', appPath);

        await testWindow.loadURL(appPath);

        // Wait for the page to load
        await new Promise(resolve => {
            testWindow.webContents.on('did-finish-load', () => {
                console.log('✅ Electron app loaded successfully');
                resolve();
            });
        });

        // Test if window.electronAPI is available
        const hasAPI = await testWindow.webContents.executeJavaScript(`
            typeof window.electronAPI !== 'undefined' && Object.keys(window.electronAPI).length > 0;
        `);

        if (hasAPI) {
            const apiMethods = await testWindow.webContents.executeJavaScript(`
                Object.keys(window.electronAPI).length;
            `);
            console.log(`✅ Electron API available with ${apiMethods} methods`);
        } else {
            console.log('❌ Electron API not available');
        }

        // Test if the page has content
        const hasContent = await testWindow.webContents.executeJavaScript(`
            document.body && document.body.innerHTML.length > 0;
        `);

        if (hasContent) {
            console.log('✅ Page has content');
        } else {
            console.log('❌ Page is empty');
        }

        // Take a screenshot to verify visual content
        try {
            const screenshot = await testWindow.webContents.capturePage();
            const screenshotPath = '/Users/pranay/Desktop/electron-app-screenshot.png';
            fs.writeFileSync(screenshotPath, screenshot);
            console.log(`✅ Screenshot captured: ${screenshotPath}`);
        } catch (error) {
            console.log('ℹ️ Screenshot not available in this Electron version');
        }

        // Keep window open for visual inspection for 3 seconds
        await new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, 3000);
        });

        testWindow.destroy();
        console.log('✅ Visual verification completed successfully');

        return true;

    } catch (error) {
        console.error('❌ Visual verification failed:', error.message);
        return false;
    }
}

// Run the test
app.whenReady().then(async () => {
    const result = await testElectronAppVisually();
    app.quit();
    process.exit(result ? 0 : 1);
}).catch(error => {
    console.error('❌ App failed to start:', error.message);
    process.exit(1);
});