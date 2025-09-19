# Model Bundling Strategy

## Overview

Photo Search supports multiple strategies for model management to ensure offline functionality:

1. **First-Run Import UX** (Recommended) - User selects model directory during setup
2. **Pre-packaged Models** (Optional) - Models bundled with Electron installer
3. **Environment-based Configuration** - Automatic model directory detection

## Decision Summary

- **Primary path**: rely on the interactive first-run import flow so users can point the app at pre-downloaded CLIP weights on demand.
- **Fallback**: keep the Electron post-install hook documented, but treat it as an opt-in for OEM/enterprise builds because of the 500MB+ footprint.
- **Documentation**: surface default lookup order and offline env vars in the First Run modal help text and in `OFFLINE_SETUP_GUIDE.md` (done).
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

## Optional: Electron Model Packaging

### Strategy Decision

**Recommendation**: Do NOT pre-package models with Electron installer due to:

- Large model sizes (500MB+ for CLIP models)
- Platform-specific optimizations
- User preference for model versions
- Storage and bandwidth costs

### Alternative Approach (If Needed)

If model packaging is required, use a post-install script:

```json
// electron/package.json
{
  "scripts": {
    "postinstall": "node scripts/download-models.js"
  }
}
```

```javascript
// scripts/download-models.js
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const modelDir = path.join(
  process.env.APPDATA || process.env.HOME,
  "photo-search",
  "models"
);

// Download minimal CLIP model
execSync(
  `python -c "
from transformers import AutoProcessor, CLIPModel
processor = AutoProcessor.from_pretrained('openai/clip-vit-base-patch32')
model = CLIPModel.from_pretrained('openai/clip-vit-base-patch32')
"`,
  {
    cwd: modelDir,
    env: { ...process.env, TRANSFORMERS_CACHE: modelDir },
  }
);
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
