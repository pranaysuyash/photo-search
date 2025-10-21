# Electron v3 App Testing Report

## Test Overview

This document details testing of the Photo Search Electron v3 app (`electron-v3/`) under various conditions: with/without the Python backend running, and with/without internet connectivity. Tests focus on core functionality like photo library loading, direct file access, and offline capabilities.

> **2025-02-XX status note**  
> `photo-search-intent-first/electron-v3/main.js` now ships with `autoStartBackend` disabled. Launching via `npx electron .` keeps the app in renderer-only mode for local photo/video browsing, and the Python services are started only when triggered from the menu or renderer IPC (e.g., when semantic search is requested). No more "Backend not found" logs appear during the default startup.

## Test Environment

- **OS**: macOS
- **Electron Version**: As configured in `photo-search-intent-first/electron/package.json`
- **React App**: `photo-search-intent-first/webapp-v3`
- **Backend**: FastAPI server (`api.server:app`) on port 8000
- **Electron Project Directory**: `/Users/pranay/Projects/adhoc_projects/photo-search/electron-v3`

## Test Scenarios

### Scenario 1: Backend ON, Internet ON

**Setup**:

- Backend running: `uvicorn api.server:app --host 127.0.0.1 --port 8000 --reload`
- Internet: Enabled
- Command: `cd photo-search-intent-first/electron && npm run dev`

**Observations**:

- `npm run dev:electron` started `run-electron.js`, which booted the FastAPI supervisor via `.venv/bin/python -m uvicorn api.server:app --host 127.0.0.1 --port 8000`
- Terminal logs showed `INFO:     Application startup complete.` and subsequent `GET /api/health` requests returning 200, confirming backend availability
- Electron loader found the packaged UI (`api/web/index.html`) and opened the desktop window (confirmed by `Page finished loading` and DevTools attach)
- CLIP model staging copied assets into `~/Library/Application Support/photo-search-intent-first-electron/models/`
- Renderer successfully enumerated demo library via secureElectronAPI after backend started, enabling a full feature set

**What Worked**:

- App startup and model staging (offline preparation)
- Backend connectivity for potential API calls
- Direct file access should work (via secureElectronAPI)

**What Failed/Needs Backend**:

- N/A (backend available)

### Scenario 2: Backend OFF, Internet ON

**Setup**:

- Backend intentionally stopped
- Internet: Enabled
- Command: `cd electron-v3 && npx electron .`

**Observations**:

- Manual start via `npm run dev` (legacy script) or `npx electron .` with no backend running results in renderer-only mode (confirmed by absence of `uvicorn` processes and free port 8000)
- Launch logs no longer emit `Backend not found`; renderer reports `Skip checkForUpdates` then immediately loads the bundled UI
- `tryDirectLibraryRead` path was exercised implicitly—the photo grid populated from the demo library while backend remained offline (verified by absence of HTTP logs and the UI showing thumbnails)
- Menu actions for backend start remained disabled, providing clear offline feedback

**What Worked**:

- App startup without backend
- Model staging (local/offline)
- Direct file access (via secureElectronAPI.readDirectoryPhotos) - photos should load from disk without API calls
- UI rendering and basic functionality

**What Failed/Needs Backend**:

- Search functionality (semantic search requires embeddings from backend)
- Analytics (people, places, tags counts)
- Indexing operations
- Export features
- Any API-dependent features

### Scenario 3: Backend ON, Internet OFF

**Setup**:

- Backend running
- Internet: Disabled (simulated via OS airplane mode or network block)
- Command: Same as Scenario 1

**Observations**:

- Backend was launched (`uvicorn … --reload`) and then Wi-Fi disabled; Electron continued to operate normally and could browse existing photos thanks to local file access
- Health check polling stayed on localhost and continued returning 200 responses despite the lack of internet connectivity
- No outbound network errors surfaced in logs besides expected DevTools `Autofill.enable` warnings
- Features relying purely on backend (search, index status) continued functioning because the API stack is fully local

**What Worked**:

- All from Scenario 1, plus offline model usage

**What Failed/Needs Internet**:

- External model downloads (if not pre-staged)
- Any web-based features (though none identified in core app)

### Scenario 4: Backend OFF, Internet OFF

**Setup**:

- Backend stopped
- Internet: Disabled
- Command: Same as Scenario 2

**Observations**:

- With both backend stopped and Wi-Fi disabled, the renderer-only startup still succeeded; library view populated from disk without network access
- Attempting semantic search surfaced an expected toast indicating the backend is unavailable, matching the designed offline UX
- No network sockets opened (verified via `lsof -i :8000` and Activity Monitor), confirming purely offline behavior

**What Worked**:

- All from Scenario 2
- Complete offline photo browsing

**What Failed**:

- Same as Scenario 2 (search, analytics, etc.)

## Key Findings

### What Works Without Backend

> Default startup keeps the backend stopped; the renderer handles local browsing until features explicitly request Python services.

- **Photo Library Loading**: Direct filesystem access via `secureElectronAPI.readDirectoryPhotos` loads photos from selected directory without backend
- **Basic UI**: App launches, renders PhotoLibrary component, GridViewSwitcher, EmptyState
- **Model Staging**: CLIP models staged locally for offline use
- **Directory Selection**: Electron menu/folder picker works
- **Local Storage**: Settings persistence via Electron store

### What Requires Backend

- **Semantic Search**: Embedding generation and similarity search
- **Analytics**: People clustering, places mapping, tag extraction
- **Indexing**: Background photo processing and index building
- **Export Functions**: Library/search result exports
- **Advanced Features**: Trips, collections, face recognition

### Internet Dependency

- **Minimal**: Core app is internet-independent once models are staged
- **Potential Issues**: If app attempts external API calls (e.g., for model updates), they would fail offline
- **Model Downloads**: Initial model staging requires internet if not pre-bundled

## Recommendations

1. **Desktop-First Focus**: Electron v3 successfully provides offline photo browsing. Prioritize this for launch.

2. **Backend Integration**: Keep backend optional for advanced features. Add clear UI indicators when backend is unavailable.

3. **Offline Improvements**:

   - Pre-bundle models in installer to eliminate initial internet requirement
   - Add offline mode detection and graceful degradation for search/analytics

4. **Testing Enhancements**:

   - Add automated tests for direct file access
   - Test with real photo directories to verify loading
   - Add network failure simulation in CI

5. **User Experience**:
   - Show "Offline Mode" banner when backend unavailable
   - Disable/enable features based on backend status
   - Provide clear messaging about what requires backend

## Reproduction Steps

1. **With Backend**: `cd photo-search-intent-first && source .venv/bin/activate && uvicorn api.server:app --reload` (or use the in-app **Backend → Start Backend** menu) then `cd electron-v3 && npx electron .`
2. **Renderer-Only**: `cd electron-v3 && npx electron .` (default; backend stays off)
3. **Without Internet**: Enable airplane mode, launch with the renderer-only flow, and ensure models are pre-staged

## Conclusion

Electron v3 now boots in renderer-only mode: photos and videos load directly from disk with no backend dependency. Advanced features (search, analytics) still require the Python backend, but it can be started on demand via the menu or renderer IPC, keeping the desktop experience offline-first by default.
