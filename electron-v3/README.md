# Photo Search Desktop

A powerful AI-powered desktop application for searching and managing your photo collection using semantic understanding.

## ✨ Features

- **🔍 Semantic Search**: Find photos using natural language descriptions
- **🤖 AI-Powered**: Advanced image understanding with CLIP models
- **🏠 Offline-First**: All processing happens locally on your device
- **⚡ Fast Indexing**: Intelligent photo organization and tagging
- **🖥️ Native Desktop**: Cross-platform desktop application (macOS, Windows, Linux)
- **🔒 Privacy-First**: Your photos never leave your device

## 🚀 Quick Start

### Development

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Build UI Components**

   ```bash
   npm run build:ui
   ```

3. **Download AI Models**

   ```bash
   npm run prepare:models
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```

### Production Build

1. **Full Build**

   ```bash
   npm run build
   ```

2. **Create Distributables**

   ```bash
   # All platforms
   npm run dist

   # Specific platforms
   npm run dist:mac    # macOS DMG
   npm run dist:win    # Windows NSIS installer
   npm run dist:linux  # Linux AppImage/DEB
   ```

## 🏗️ Architecture

### Main Components

- **main.js**: Electron main process with window management and backend integration
- **preload.js**: Secure IPC bridge between main and renderer processes
- **app/**: Built React application (webapp-v3)
- **scripts/**: Build and utility scripts
- **assets/**: Application icons and resources
- **models/**: Downloaded AI models for offline operation

### Security Model

- **Context Isolation**: Renderer process runs in isolated context
- **No Node Integration**: Web content cannot access Node.js APIs directly
- **Preload Script**: Safe API exposure through contextBridge
- **CSP Headers**: Content Security Policy for XSS protection

## 📦 Build System

### Build Scripts

| Script                   | Description                                     |
| ------------------------ | ----------------------------------------------- |
| `npm run dev`            | Start development with hot reload               |
| `npm run dev:full`       | Full development build (UI + models + electron) |
| `npm run build`          | Complete production build                       |
| `npm run build:ui`       | Build React app and copy to electron/app/       |
| `npm run prepare:models` | Download and verify AI models                   |
| `npm run dist`           | Create platform distributables                  |

### Model Management

The app uses a sophisticated model downloading system:

```bash
# Download all required models
node scripts/download-models.js download

# Verify model integrity
node scripts/download-models.js verify

# Show model information
node scripts/download-models.js info

# Clean models directory
node scripts/download-models.js clean
```

## 🔧 Configuration

### Electron Builder Configuration

The app uses `electron-builder` for creating distributables with the following targets:

- **macOS**: DMG installer for both Intel and Apple Silicon
- **Windows**: NSIS installer for x64 and x86
- **Linux**: AppImage and DEB packages for x64

### Settings Management

User settings are managed using `electron-store`:

```javascript
// Default settings
{
  photoDirectories: [],
  lastPhotoDirectory: null,
  theme: 'system',
  searchProvider: 'local',
  autoStartBackend: true,
  modelDownloadPath: './models'
}
```

## 🎮 Usage

### Adding Photo Directories

1. **File Menu** → **Add Photo Directory**
2. **Keyboard Shortcut**: `Cmd+O` (macOS) / `Ctrl+O` (Windows/Linux)
3. **API**: `electronAPI.selectDirectory()`

### Indexing Photos

1. **File Menu** → **Index Photos**
2. **Keyboard Shortcut**: `Cmd+I` (macOS) / `Ctrl+I` (Windows/Linux)
3. **API**: Backend integration through IPC

### Backend Control

The app can automatically start and stop the Python backend:

```javascript
// Start backend
await electronAPI.startBackend();

// Stop backend
await electronAPI.stopBackend();

// Get status
const status = await electronAPI.getBackendStatus();
```

## 🔌 API Reference

### electronAPI

| Method                   | Description                         |
| ------------------------ | ----------------------------------- |
| `getSetting(key)`        | Get application setting             |
| `setSetting(key, value)` | Set application setting             |
| `selectDirectory()`      | Open directory selection dialog     |
| `showItemInFolder(path)` | Show file/folder in system explorer |
| `startBackend()`         | Start Python backend server         |
| `stopBackend()`          | Stop Python backend server          |
| `getBackendStatus()`     | Get backend running status          |
| `getAppVersion()`        | Get application version             |

### Events

| Event                       | Description                    |
| --------------------------- | ------------------------------ |
| `photo-directories-updated` | Photo directories list changed |
| `backend-status-changed`    | Backend running status changed |
| `start-indexing`            | Begin photo indexing process   |
| `show-settings`             | Show settings modal            |

## 📱 Platform-Specific Features

### macOS

- **Native Menu Bar**: Full macOS menu integration
- **Dock Integration**: Custom dock menu and badge
- **File Associations**: Register for image file types
- **Notification Center**: Native notification support

### Windows

- **System Tray**: Minimize to system tray
- **Jump Lists**: Recent photos in taskbar
- **File Explorer**: Context menu integration
- **Windows Notifications**: Toast notifications

### Linux

- **Desktop Integration**: .desktop file creation
- **MIME Types**: Image file type associations
- **System Notifications**: libnotify integration
- **Wayland/X11**: Full display server support

## 🧪 Testing

### Manual Testing

1. **Basic Functionality**

   ```bash
   npm run dev
   # Test window creation, menu functionality, settings
   ```

2. **Build Testing**

   ```bash
   npm run build
   npm start
   # Test production build functionality
   ```

3. **Distribution Testing**
   ```bash
   npm run dist:mac  # Test on macOS
   # Install and test the generated DMG
   ```

### Automated Testing

```bash
# Unit tests (when implemented)
npm test

# Integration tests with Playwright
npm run test:e2e
```

## 🔒 Security Considerations

### Content Security Policy

The app implements strict CSP headers:

```javascript
// No inline scripts or styles
"script-src 'self'";
"style-src 'self' 'unsafe-inline'";
"img-src 'self' data: file:";
```

### IPC Security

- All IPC communication goes through preload script
- No direct Node.js access from renderer
- Input validation on all IPC handlers
- Path traversal protection

### Model Security

- SHA256 verification for downloaded models
- Secure HTTPS downloads only
- Model integrity checks on startup

## 🚨 Troubleshooting

### Common Issues

1. **Backend Won't Start**

   - Check Python installation and virtual environment
   - Verify backend path in development vs production
   - Check port 8000 availability

2. **Models Won't Download**

   - Check internet connection
   - Verify disk space (models are ~200MB total)
   - Check write permissions in models directory

3. **Build Failures**

   - Ensure webapp-v3 builds successfully first
   - Check Node.js version (requires 18+)
   - Verify all dependencies are installed

4. **App Won't Start**
   - Check Electron version compatibility
   - Verify app signing (macOS)
   - Check security permissions

### Debug Mode

Enable debug logging:

```bash
# Development
DEBUG=* npm run dev

# Check logs
tail -f ~/.config/photo-search-desktop/logs/main.log
```

## 📚 Development Resources

### File Structure

```
electron-v3/
├── main.js              # Main Electron process
├── preload.js           # Security bridge
├── package.json         # Dependencies and build config
├── app/                 # Built React application
│   └── index.html       # Placeholder/built UI
├── assets/              # Application icons
├── scripts/             # Build and utility scripts
│   └── download-models.js
├── models/              # Downloaded AI models
└── README.md           # This file
```

### Dependencies

| Package                 | Purpose                       |
| ----------------------- | ----------------------------- |
| `electron`              | Desktop application framework |
| `electron-builder`      | Build and distribution        |
| `electron-store`        | Settings persistence          |
| `electron-window-state` | Window state management       |
| `electron-log`          | Logging system                |
| `electron-updater`      | Auto-update functionality     |

### Related Projects

- **webapp-v3**: Modern React frontend with shadcn/ui
- **photo-search-intent-first**: Python backend with FastAPI
- **Original webapp**: Legacy Vue.js application

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Documentation**: See `docs/` directory
- **API Reference**: Built-in help menu
