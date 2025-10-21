// Test preload script
const { contextBridge } = require('electron');

console.log('Preload script started');

try {
  const path = require('path');
  console.log('path module loaded successfully');
} catch (error) {
  console.error('Failed to load path module:', error.message);
}

try {
  const fs = require('fs');
  console.log('fs module loaded successfully');
} catch (error) {
  console.error('Failed to load fs module:', error.message);
}

contextBridge.exposeInMainWorld('electronAPI', {
  test: () => 'preload working'
});

console.log('Preload script completed');