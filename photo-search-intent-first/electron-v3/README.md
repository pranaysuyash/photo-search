# Photo Search Desktop v3

A beautiful, AI-powered desktop photo management application built with Electron, React, and Python.

## Features

### 🖼️ Photo Management

- **Local Photo Library**: Browse and organize photos from any folder on your computer
- **Smart Indexing**: Automatic photo discovery and indexing
- **Fast Search**: AI-powered semantic search to find photos by content
- **Face Recognition**: Organize photos by people (coming soon)
- **Place Detection**: Group photos by location (coming soon)

### 🎨 Beautiful Interface

- **Modern Design**: Clean, intuitive interface built with shadcn/ui
- **Dark Mode**: Automatic theme switching based on system preferences
- **Responsive Layout**: Adapts to different window sizes
- **Smooth Animations**: Polished interactions and transitions

### ⚡ Performance

- **Offline First**: Works completely offline with local AI models
- **Fast Indexing**: Efficient photo processing and storage
- **Memory Optimized**: Handles large photo libraries efficiently
- **Native Performance**: Desktop-optimized with Electron

## Quick Start

### Development

1. **Install Dependencies**:

   ```bash
   cd electron-v3
   npm install
   ```

2. **Prepare Models** (for offline AI):

   ```bash
   npm run prepare:models
   ```

3. **Build UI**:

   ```bash
   npm run build:ui
   ```

4. **Start Development**:

   ```bash
   # Option 1: Full development with UI and backend auto-restart
   npm run dev:full

   # Option 2: Quick dev (assumes backend running separately)
   npm run dev
   ```

### Production Build

1. **Build for Current Platform**:

   ```bash
   npm run build
   ```

2. **Build for Specific Platforms**:

   ```bash
   npm run build:mac    # macOS (DMG + ZIP)
   npm run build:win    # Windows (NSIS + Portable)
   npm run build:linux  # Linux (AppImage + DEB)
   ```

3. **Package without Installer**:
   ```bash
   npm run pack
   ```

## Project Structure

```
electron-v3/
├── main.js              # Electron main process
├── preload.js           # Secure bridge script
├── package.json         # Electron app configuration
├── app/                 # Built React app (auto-generated)
├── assets/              # App icons and resources
├── scripts/             # Build and utility scripts
├── models/              # Downloaded AI models
└── dist/                # Built distributables
```

## Backend Integration

The desktop app integrates with the Python backend in several ways:

1. **Development**: Connects to `http://127.0.0.1:8000` (manual backend start)
2. **Production**: Bundles and auto-starts Python backend as subprocess
3. **API Client**: Uses the same API client as webapp-v3

## Native Features

### File System Access

- Native folder picker dialogs
- Direct file system access for photos
- Efficient file watching for new photos

### Desktop Integration

- System tray icon (coming soon)
- Native context menus
- Keyboard shortcuts
- OS-specific behaviors (macOS, Windows, Linux)

### Security

- Sandboxed renderer process
- Secure IPC communication
- No Node.js exposure to frontend
- Validated file access patterns

## Configuration

App settings are stored using `electron-store`:

```javascript
// Default settings
{
  photoDirectories: [],
  lastSelectedDirectory: null,
  windowBounds: { width: 1400, height: 900 },
  theme: 'system',
  searchProvider: 'local',
  enableAnalytics: true,
  autoIndexing: true
}
```

## Keyboard Shortcuts

### Global

- `Cmd/Ctrl + O`: Open Photo Library
- `Cmd/Ctrl + I`: Import Photos
- `Cmd/Ctrl + F`: New Search
- `Cmd/Ctrl + ,`: Preferences

### View

- `Cmd/Ctrl + 1`: Grid View
- `Cmd/Ctrl + 2`: List View

### Search

- `Cmd/Ctrl + Shift + F`: Smart Search
- `Cmd/Ctrl + P`: Search by People
- `Cmd/Ctrl + L`: Search by Places

## Building Notes

### macOS

- Requires macOS 10.14+ (Mojave)
- Supports both Intel and Apple Silicon
- Creates notarized DMG and ZIP files
- Hardened runtime enabled

### Windows

- Requires Windows 10+
- Creates NSIS installer and portable executable
- Code signing support (configure in CI/CD)

### Linux

- Creates AppImage and DEB packages
- Tested on Ubuntu 20.04+
- Desktop integration included

## Troubleshooting

### Model Download Issues

```bash
# Re-download models
rm -rf models/
npm run prepare:models
```

### Build Issues

```bash
# Clean rebuild
npm run clean
npm install
npm run setup
```

### Backend Connection Issues

- Ensure Python virtual environment is activated
- Check that backend server starts on port 8000
- Verify API endpoints in `../api/server.py`

## Contributing

1. Use the existing React components from `webapp-v3`
2. Follow Electron security best practices
3. Test on all target platforms
4. Update this README with any new features

## License

MIT License - see LICENSE file for details
