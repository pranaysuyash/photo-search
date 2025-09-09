// Debug script to test offline image loading
const path = require('path');

// Mock window object for testing
const mockWindow = {
    electronAPI: undefined,
    process: { type: 'renderer' },
    location: { origin: 'http://127.0.0.1:5173' }
};

// Mock navigator
const mockNavigator = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) photo-search-intent-first/1.0.0 Chrome/114.0.5735.134 Electron/25.2.0 Safari/537.36'
};

// Test isElectron function
function isElectron() {
    return (
        typeof window !== "undefined" &&
        ((window).electronAPI !== undefined ||
        (window).process?.type === "renderer" ||
        navigator.userAgent.toLowerCase().includes("electron"))
    );
}

// Test thumbUrl function
function thumbUrl(dir, provider, photoPath, size = 256) {
    const API_BASE = 'http://127.0.0.1:8000';
    
    // In Electron, use direct file access for offline capability
    if (isElectron()) {
        // Convert path to absolute file:// URL for direct file access
        const absolutePath = photoPath.startsWith("/") ? photoPath : `${dir}/${photoPath}`;
        return `file://${absolutePath}`;
    }
    
    // For web app, use HTTP API
    const qs = new URLSearchParams({ dir, provider, path: photoPath, size: String(size) });
    return `${API_BASE}/thumb?${qs.toString()}`;
}

// Test with mock environment
global.window = mockWindow;
global.navigator = mockNavigator;

console.log('=== OFFLINE IMAGE LOADING DEBUG ===');
console.log('isElectron():', isElectron());
console.log('User Agent:', mockNavigator.userAgent);
console.log('window.process?.type:', mockWindow.process?.type);

// Test with your specific image
const testDir = '/Users/pranay/Desktop';
const testPhoto = 'Screenshot 2025-09-09 at 6.32.09 PM.png';
const provider = 'local';

console.log('\n=== URL GENERATION TEST ===');
const generatedUrl = thumbUrl(testDir, provider, testPhoto, 256);
console.log('Generated URL:', generatedUrl);

// Check if file exists
const fs = require('fs');
const fullPath = path.join(testDir, testPhoto);
console.log('Full file path:', fullPath);
console.log('File exists:', fs.existsSync(fullPath));

// Test app:// protocol URL
const appUrl = `app://${encodeURIComponent(fullPath)}`;
console.log('App protocol URL:', appUrl);

// Test file:// protocol URL
const fileUrl = `file://${fullPath}`;
console.log('File protocol URL:', fileUrl);

console.log('\n=== PROTOCOL ANALYSIS ===');
console.log('URL starts with app://:', generatedUrl.startsWith('app://'));
console.log('URL contains encoded path:', generatedUrl.includes(encodeURIComponent(fullPath)));

// Test URL decoding
const decodedPath = decodeURIComponent(generatedUrl.replace('app://', ''));
console.log('Decoded path from URL:', decodedPath);
console.log('Decoded path exists:', fs.existsSync(decodedPath));