# Photo Search - Architecture Overview

## Core Architecture Principle

**Photo Search is a local-first desktop application with optional AI enhancements.**

## Operational Modes (Priority Order)

### 1. 🖥️ Desktop Local App (Primary Mode)
**Target Users:** All users, default experience  
**Requirements:** None (no server, no internet needed)

**Capabilities:**
- Direct file system access via Electron APIs
- Local thumbnail generation and caching
- Photo browsing with file:// URLs
- Basic organization (folders, favorites, metadata)
- Video file support with local thumbnails
- Persistent settings and preferences
- Native OS integration (file dialogs, notifications)

**Technology Stack:**
- Electron V3 (main process)
- React V3 + TypeScript (renderer)
- Local file system APIs
- Native thumbnail generation
- SQLite for local metadata

### 2. 🤖 AI Enhanced Mode (Secondary Mode)
**Target Users:** Power users wanting AI features  
**Requirements:** Optional Python backend server

**Additional Capabilities:**
- Semantic search with natural language queries
- Face recognition and people management
- OCR text extraction from photos
- Smart collections with AI rules
- Advanced search filters and suggestions
- Content analysis and auto-tagging

**Technology Stack:**
- All local mode features PLUS:
- FastAPI backend server
- CLIP models for semantic search
- InsightFace for face recognition
- EasyOCR for text extraction
- Vector databases for search indexing

### 3. 🌐 Web App Mode (Tertiary Mode)
**Target Users:** Developers, testing, special use cases  
**Requirements:** Backend server + web browser

**Capabilities:**
- Browser-based photo management
- Limited file system access
- API-driven functionality
- Development and testing interface
- Remote access capabilities

**Technology Stack:**
- React V3 in browser environment
- Web APIs for file access
- Backend API integration
- Progressive Web App features

## Development Priority

1. **Build local-first desktop app** - Core photo management without servers
2. **Add optional AI backend** - Enhanced features for power users
3. **Maintain web compatibility** - For development and special cases

## Key Design Decisions

### Local-First Architecture
- **No server required** for basic photo management
- **Direct file access** using Electron's secure APIs
- **Local processing** for thumbnails and basic metadata
- **Offline operation** as the default mode

### Optional AI Enhancement
- **Backend is additive** - never required for core functionality
- **User-controlled** - explicitly enabled through settings
- **Graceful degradation** - app works perfectly without AI features
- **Clear value proposition** - AI features provide obvious benefits

### Security Model
- **Context isolation** prevents renderer from accessing Node.js
- **Secure IPC** for all file system operations
- **Path validation** against allowed directories only
- **No network requirements** for local mode

## File Structure Priority

```
photo-search/
├── electron-v3/                    # 🖥️ PRIMARY: Desktop app
│   ├── main.js                     # Electron main process
│   ├── preload.js                  # Secure IPC bridge
│   └── lib/                        # Local file system managers
├── photo-search-intent-first/
│   ├── webapp-v3/                  # 🖥️ PRIMARY: React frontend
│   │   └── src/                    # Local-first React components
│   └── api/                        # 🤖 SECONDARY: Optional AI backend
└── docs/                           # 🌐 TERTIARY: Web documentation
```

## Success Criteria

### Local-First Success
- ✅ App opens and displays photos without any server
- ✅ Thumbnail generation works locally
- ✅ Basic organization features work offline
- ✅ File system security is maintained
- ✅ Performance is excellent for large libraries

### AI Enhancement Success
- ✅ Backend is truly optional (app works without it)
- ✅ AI features provide clear value when enabled
- ✅ Seamless transition between local and AI modes
- ✅ No degradation of local features when AI is enabled

### Development Success
- ✅ Local mode is prioritized in all development decisions
- ✅ AI features are built as enhancements, not requirements
- ✅ Web mode remains functional for development needs
- ✅ Architecture supports all three modes efficiently

## Anti-Patterns to Avoid

❌ **Don't require backend** for basic photo viewing  
❌ **Don't build web-first** then adapt to desktop  
❌ **Don't make AI features** feel like core requirements  
❌ **Don't compromise local performance** for web compatibility  
❌ **Don't assume internet connectivity** for core features  

## Migration Path

For existing users expecting web-first or backend-required operation:

1. **Communicate clearly** that this is a desktop-first application
2. **Provide migration tools** for existing web-based workflows
3. **Maintain web compatibility** for specific use cases
4. **Emphasize benefits** of local-first operation (speed, privacy, reliability)

This architecture ensures Photo Search delivers exceptional value as a local-first desktop application while providing optional AI enhancements for users who want them.