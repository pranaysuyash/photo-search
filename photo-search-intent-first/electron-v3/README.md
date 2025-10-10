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

IMPORTANT: Python venv location

- The backend virtual environment is inside the intent-first tree:
  - `/Users/pranay/Projects/adhoc_projects/photo-search/photo-search-intent-first/.venv`
- Prefer calling its Python directly rather than `source` in npm scripts.

### One-terminal dev flow (recommended)

Run these in one terminal, in order:

1. Start backend (uses the project venv directly)

```bash
cd /Users/pranay/Projects/adhoc_projects/photo-search/photo-search-intent-first
PYTHONPATH=. .venv/bin/python run_server.py
```

1. Start the React dev server on port 5174

```bash
cd /Users/pranay/Projects/adhoc_projects/photo-search/photo-search-intent-first/webapp-v3
npx vite --port 5174
```

1. Launch Electron (loads UI from 127.0.0.1:5174)

```bash
cd /Users/pranay/Projects/adhoc_projects/photo-search/photo-search-intent-first/electron-v3
npx electron .
```

That’s it—one terminal, three steps. The Electron app will talk to the backend on `127.0.0.1:8000` and load the UI from `127.0.0.1:5174`.

Alternatively, use the orchestrated launcher:

```bash
cd /Users/pranay/Projects/adhoc_projects/photo-search/photo-search-intent-first
bash scripts/dev.sh
```

The script will:

- Start the backend via the venv Python and wait for :8000
- Start Vite on :5174 and wait for the UI
- Launch Electron and handle clean shutdown on Ctrl+C

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
   # Option 1: Full development (starts backend + UI, then Electron)
   # Requires node deps installed and Python venv present
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

```text
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

### Blank/white window in Electron

- Ensure Vite is running on port 5174 (`http://127.0.0.1:5174`).
- Ensure backend is running on port 8000 (`http://127.0.0.1:8000/docs`).
- Open Electron DevTools (View → Toggle DevTools) and check for errors.
- The preload now exposes `window.electronAPI.on`/`off` so IPC listener setup in the renderer won’t crash.
- Menu event channels emitted by main:
  - `menu:import`
  - `menu:export-library`

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

### Memory usage in development

If Electron memory spikes (e.g., due to heavy CSS gradients or GPU surfaces):

- We disable hardware acceleration in development to avoid runaway GPU memory.
- We cap V8 old space via `--max-old-space-size=4096`.
- To re-enable GPU if needed, remove or guard `app.disableHardwareAcceleration()` in `main.js`.

### Notes on scripts

- `electron-v3/package.json` uses `PYTHONPATH=. .venv/bin/python run_server.py` for `dev:backend` to avoid shell-specific `source` semantics.
- If `npm install` errors due to `postinstall` (electron-builder) on dev machines, you can run:

```bash
cd electron-v3
npm install --ignore-scripts
```

Then start processes manually with the one-terminal steps above.

#### Orchestrated dev launcher

The `scripts/dev.sh` utility is provided to streamline development. Requirements:

- Python venv at `photo-search-intent-first/.venv`
- Node/npm installed
- Network availability for localhost ports 8000 and 5174

Usage:

```bash
bash scripts/dev.sh
```

It waits for the backend and UI to be ready before launching Electron, and shuts everything down on Ctrl+C.

## Contributing

1. Use the existing React components from `webapp-v3`
2. Follow Electron security best practices
3. Test on all target platforms
4. Update this README with any new features

## License

MIT License - see LICENSE file for details
