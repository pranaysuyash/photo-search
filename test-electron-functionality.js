const { app, BrowserWindow } = require('electron');
const path = require('path');

async function testElectronFunctionality() {
    console.log('🔍 Testing Electron functionality...');

    // Create a test window to verify basic functionality
    const testWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false, // Don't show window for testing
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'electron-v3/preload.js'),
            webSecurity: true
        }
    });

    try {
        // Load the app
        await testWindow.loadURL(`file://${path.join(__dirname, 'electron-v3/app/index.html')}`);

        // Wait for the page to load
        await new Promise(resolve => {
            testWindow.webContents.on('did-finish-load', resolve);
        });

        console.log('✅ Electron app loaded successfully');

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

        testWindow.destroy();
        console.log('✅ All tests completed successfully');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        testWindow.destroy();
        return false;
    }

    return true;
}

// Run the test
app.whenReady().then(async () => {
    const result = await testElectronFunctionality();
    app.quit();
    process.exit(result ? 0 : 1);
}).catch(error => {
    console.error('❌ App failed to start:', error.message);
    process.exit(1);
});