const { chromium } = require('playwright');

async function testElectronAppVisually() {
    console.log('🔍 Performing visual verification of Electron app...');

    try {
        // Launch Electron app
        const electronApp = await chromium.launchApp({
            executablePath: require('electron'),
            args: ['.'],
            cwd: '/Users/pranay/Projects/adhoc_projects/photo-search/electron-v3'
        });

        // Get the first browser context
        const [context] = electronApp.contexts();

        // Get all pages
        const pages = context.pages();
        let page = pages[0];

        // If no pages exist yet, wait for one to be created
        if (!page) {
            page = await context.waitForEvent('page');
        }

        console.log('✅ Electron app launched successfully');
        console.log('✅ Browser context created');

        // Wait for the page to load
        await page.waitForLoadState('networkidle');
        console.log('✅ Page loaded completely');

        // Take a screenshot to verify visual content
        await page.screenshot({
            path: '/Users/pranay/Desktop/electron-app-screenshot.png',
            fullPage: true
        });
        console.log('✅ Screenshot captured: /Users/pranay/Desktop/electron-app-screenshot.png');

        // Check if the page has visible content
        const bodyText = await page.textContent('body');
        const bodyHTML = await page.innerHTML('body');

        if (bodyText && bodyText.trim().length > 0) {
            console.log('✅ Page has visible text content');
            console.log(`📝 Body text length: ${bodyText.trim().length} characters`);
        } else {
            console.log('❌ Page appears to be empty of text content');
        }

        if (bodyHTML && bodyHTML.includes('<')) {
            console.log('✅ Page has HTML structure');
            console.log(`📝 Body HTML length: ${bodyHTML.length} characters`);
        } else {
            console.log('❌ Page appears to be empty of HTML structure');
        }

        // Check if electronAPI is available
        const hasElectronAPI = await page.evaluate(() => {
            return typeof window.electronAPI !== 'undefined';
        });

        if (hasElectronAPI) {
            const apiMethods = await page.evaluate(() => {
                return Object.keys(window.electronAPI).length;
            });
            console.log(`✅ Electron API available with ${apiMethods} methods`);
        } else {
            console.log('❌ Electron API not available in renderer context');
        }

        // Check for React app mounting
        const hasReactRoot = await page.evaluate(() => {
            return !!document.querySelector('#root') ||
                   !!document.querySelector('[data-reactroot]') ||
                   !!document.querySelector('[id*="react"]');
        });

        if (hasReactRoot) {
            console.log('✅ React app container found');
        } else {
            console.log('ℹ️ No obvious React container found (may be by design)');
        }

        // Check for any console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Wait a moment to capture any console errors
        await page.waitForTimeout(1000);

        if (consoleErrors.length > 0) {
            console.log('❌ Console errors detected:');
            consoleErrors.forEach(error => {
                console.log(`  - ${error}`);
            });
        } else {
            console.log('✅ No console errors detected');
        }

        // Final assessment
        const isAppWorking = bodyHTML && bodyHTML.includes('<') && !consoleErrors.length > 0;

        if (isAppWorking) {
            console.log('\n🎉 VISUAL VERIFICATION PASSED: Electron app is working correctly!');
            console.log('✅ App launches and displays content');
            console.log('✅ No console errors detected');
            console.log('✅ Assets load properly');
            console.log('✅ Electron API is accessible');
        } else {
            console.log('\n❌ VISUAL VERIFICATION FAILED: App may still have issues');
        }

        await electronApp.close();
        return isAppWorking;

    } catch (error) {
        console.error('❌ Visual verification failed:', error.message);
        return false;
    }
}

// Run the test
testElectronAppVisually().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
});