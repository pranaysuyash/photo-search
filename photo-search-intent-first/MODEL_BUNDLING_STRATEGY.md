# Model Bundling Strategy

## Overview

Photo Search supports multiple strategies for model management to ensure offline functionality:

1. **Electron Bundled Models** (Default) – Installer ships CLIP weights and stages them on first launch
2. **First-Run Import UX** (Override) – Users can import alternate weights or point to removable storage
3. **Environment-based Configuration** – Automatic model directory detection for CLI/API deployments

## Decision Summary

- **Primary path**: ship bundled CLIP weights with Electron installers (via `npm --prefix photo-search-intent-first/electron run prepare:models`).
- **Override**: keep the interactive first-run import flow so operators can swap in custom weights without rebuilding the installer.
- **Documentation**: surface default lookup order and offline env vars in the First Run modal help text and in `OFFLINE_SETUP_GUIDE.md`.
- **Testing**: cover both providers with `offline_provider_test.py` using a temporary cache dir to confirm env overrides before shipping Electron updates.

## Current Implementation

### First-Run Import UX ✅

The application includes a "Import Models" button in the First Run Setup that:

- Uses Electron's native file dialog to select model directory
- Sets `PHOTOVAULT_MODEL_DIR` environment variable via API
- Persists the setting for future sessions

**Location**: `webapp/src/components/modals/FirstRunSetup.tsx`

```tsx
// Import Models button implementation
<button
  type="button"
  className="px-3 py-1 rounded border text-sm"
  onClick={async () => {
    try {
      const modelDir = await (window as unknown).electronAPI?.selectFolder?.();
      if (typeof modelDir === "string" && modelDir.trim()) {
        // Set the model directory via API
        await fetch(
          `${API_BASE}/config/set?key=PHOTOVAULT_MODEL_DIR&value=${encodeURIComponent(
            modelDir
          )}`,
          {
            method: "POST",
          }
        );
        alert(`Model directory set to: ${modelDir}`);
      }
    } catch {
      alert("Failed to import models. Please try again.");
    }
  }}
>
  Import Models…
</button>
```

### API Configuration Endpoint ✅

The `/config/set` endpoint allows runtime configuration of environment variables:

```python
@app.post("/config/set")
def api_config_set(req: ConfigSetReq) -> Dict[str, Any]:
    try:
        # Set in process environment for immediate effect
        os.environ[req.key] = req.value
        return {"ok": True, "key": req.key, "value": req.value}
    except Exception as e:
        raise HTTPException(500, f"Failed to set config: {e}")
```

## Default Model Directory Locations

### Automatic Detection Order

1. **PHOTOVAULT_MODEL_DIR** (User-configured)
2. **TRANSFORMERS_CACHE** (HuggingFace cache)
3. **SENTENCE_TRANSFORMERS_HOME** (SentenceTransformers cache)
4. **Platform-specific defaults**:
   - macOS: `~/Library/Caches/photo-search/models`
   - Linux: `~/.cache/photo-search/models`
   - Windows: `%LOCALAPPDATA%\photo-search\models`

### Provider-Specific Logic

#### Transformers CLIP Provider

```python
# In adapters/embedding_transformers_clip.py
def __init__(self, model_name: str = "openai/clip-vit-base-patch32", device: Optional[str] = None) -> None:
    # Honor offline mode and local cache directory if provided
    offline = os.getenv("OFFLINE_MODE", "").lower() in ("1", "true", "yes")
    local_dir = os.getenv("PHOTOVAULT_MODEL_DIR") or os.getenv("TRANSFORMERS_CACHE")
    if local_dir:
        os.environ.setdefault("TRANSFORMERS_CACHE", local_dir)
    if offline:
        os.environ.setdefault("HF_HUB_OFFLINE", "1")
        os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
```

#### SentenceTransformers CLIP Provider

```python
# In adapters/embedding_clip.py
def __init__(self, model_name: str = "clip-ViT-B-32", device: Optional[str] = None) -> None:
    # Honor offline mode and local cache directory if provided
    offline = os.getenv("OFFLINE_MODE", "").lower() in ("1", "true", "yes")
    local_dir = os.getenv("PHOTOVAULT_MODEL_DIR") or os.getenv("SENTENCE_TRANSFORMERS_HOME")
    if local_dir:
        os.environ.setdefault("SENTENCE_TRANSFORMERS_HOME", local_dir)
    if offline:
        # SentenceTransformers handles offline mode automatically
        pass
```

## Electron Bundled Models

- **Preparation script**: `npm --prefix photo-search-intent-first/electron run prepare:models`
  - Reads `electron/models/manifest.template.json`
  - Downloads the Hugging Face repositories (`sentence-transformers/clip-ViT-B-32`, `openai/clip-vit-base-patch32`)
  - Computes deterministic SHA-256 digests for each staged model directory
  - Writes `electron/models/manifest.json` with hashes, sizes, and metadata
- **Packaging**: `electron/package.json` runs `prepare:models` before `electron-builder`, shipping `electron/models/**` as `extraResources` inside the installer.
- **Runtime**: `ensureBundledModels()` (Electron `main.js`) verifies the manifest, copies models into `{appData}/photo-search/models`, and exports offline environment variables (`PHOTOVAULT_MODEL_DIR`, `SENTENCE_TRANSFORMERS_HOME`, `TRANSFORMERS_OFFLINE`, `HF_HUB_OFFLINE`).
- **Refresh**: menu action **Photo Search ▸ Refresh Bundled Models…** re-stages assets; renderer processes can read status via `ipcMain.handle('models:get-status')`.

```bash
npm --prefix photo-search-intent-first/electron run build:ui
npm --prefix photo-search-intent-first/electron run prepare:models
npm --prefix photo-search-intent-first/electron run dist
```

## User Experience Flow

### First-Time Setup

1. User launches Photo Search
2. First Run Setup modal appears
3. User clicks "Import Models" button
4. Native file dialog opens
5. User selects directory containing pre-downloaded models
6. Setting is saved and applied immediately

### Subsequent Launches

1. Application uses configured model directory
2. If no models found, prompts user to import
3. Offline mode works automatically

## Configuration Persistence

### Environment Variables

- Settings are stored in process environment
- Not persisted across application restarts
- Must be reconfigured on each launch (by design for security)

### Future Enhancement

Consider adding persistent configuration storage:

- Local JSON file in app data directory
- Encrypted storage for sensitive paths
- User preference synchronization

## Testing Strategy

### Offline Provider Tests ✅

```bash
# Test with local models
python offline_provider_test.py --model-dir /path/to/models

# Test Electron configuration
python electron_offline_test.py
```

### Integration Tests

- Verify model directory selection works
- Confirm offline mode activation
- Test model loading from custom directory
- Validate fallback to default locations

## Documentation

### User-Facing Documentation

- Include in OFFLINE_SETUP_GUIDE.md
- Provide clear instructions for model download
- Document supported model formats
- Explain storage requirements

### Developer Documentation

- Document provider-specific environment variables
- Explain model directory detection logic
- Provide examples for custom model integration

## Conclusion

**Recommended Strategy**: Use the existing First-Run Import UX approach with automatic directory detection. This provides the best user experience while maintaining flexibility for different deployment scenarios.

**Rationale**:

- ✅ Simple user experience
- ✅ Works across platforms
- ✅ Supports custom model locations
- ✅ No large installer bundles
- ✅ Maintains offline functionality
- ✅ Easy to extend for future enhancements
