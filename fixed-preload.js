// Fixed test preload script
const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script started');

// More specific error handling
let path, fs;
try {
  console.log('Attempting to require path...');
  path = require('path');
  console.log('path module loaded successfully');
} catch (error) {
  console.error('Failed to load path module:', error.message);
  console.error('Error type:', error.constructor.name);
  console.error('Stack:', error.stack);
  // Provide fallback
  path = {
    join: (...args) => args.join('/'),
    dirname: (p) => p.split('/').slice(0, -1).join('/'),
    basename: (p, ext) => {
      const name = p.split('/').pop() || '';
      return ext ? name.replace(ext, '') : name;
    },
    extname: (p) => {
      const parts = p.split('.');
      return parts.length > 1 ? '.' + parts.pop() : '';
    },
    resolve: (...args) => args.join('/'),
    isAbsolute: (p) => p.startsWith('/'),
    sep: '/',
    delimiter: ':'
  };
}

try {
  console.log('Attempting to require fs...');
  fs = require('fs');
  console.log('fs module loaded successfully');
} catch (error) {
  console.error('Failed to load fs module:', error.message);
  console.error('Error type:', error.constructor.name);
  fs = {
    existsSync: () => false,
    statSync: () => ({ isDirectory: () => false, isFile: () => false }),
    readdirSync: () => []
  };
}

contextBridge.exposeInMainWorld('electronAPI', {
  test: () => 'preload working'
});

console.log('Preload script completed');