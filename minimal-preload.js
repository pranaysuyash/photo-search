// Minimal test preload
const { contextBridge } = require('electron');

console.log('Minimal preload started');

try {
  contextBridge.exposeInMainWorld('testAPI', {
    hello: () => 'world',
    getVersion: () => '1.0.0'
  });
  console.log('contextBridge.exposeInMainWorld succeeded');
} catch (error) {
  console.error('contextBridge failed:', error.message);
  console.error('Error stack:', error.stack);
}

console.log('Minimal preload completed');