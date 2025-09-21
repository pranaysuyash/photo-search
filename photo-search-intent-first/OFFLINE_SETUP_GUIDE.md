# Offline Setup Guide

This guide covers setting up and using Photo Search in offline mode, including model management, configuration, and troubleshooting.

## Overview

Photo Search supports full offline operation through:

- **Local AI models**: CLIP models for image/text similarity
- **PWA caching**: Service worker caches UI assets and API responses
- **Local storage**: Embeddings and indexes stored locally
- **Electron app**: Desktop app with offline file access

## Prerequisites

### System Requirements

- Python 3.8+
- Node.js 18+
- 8GB+ RAM (for model inference)
- 10GB+ disk space (for models and indexes)

### Dependencies

```bash
# Python dependencies
pip install torch transformers sentence-transformers pillow numpy

# Optional: GPU support
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

## Model Setup

### 1. Download Models

Choose your preferred provider and download models:

#### Option A: Transformers CLIP (Recommended)

```bash
# Download CLIP model
python -c "
from transformers import AutoProcessor, CLIPModel
processor = AutoProcessor.from_pretrained('openai/clip-vit-base-patch32')
model = CLIPModel.from_pretrained('openai/clip-vit-base-patch32')
"
```

#### Option B: SentenceTransformers CLIP

```bash
# Download SentenceTransformers model
python -c "
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('clip-ViT-B-32')
"
```

### 2. Configure Model Directory

Set the model storage location:

```bash
# Option 1: Environment variable
export PHOTOVAULT_MODEL_DIR=/path/to/models

# Option 2: Through the app UI
# 1. Start the app
# 2. Go to Settings > First Run Setup
# 3. Click "Import Models" and select your model directory
```

### Electron Bundled Models

When packaging the Electron app, the CLIP weights are downloaded and staged automatically so end users get a truly offline experience. Run:

```bash
# From the repository root
npm --prefix photo-search-intent-first/electron run build:ui
npm --prefix photo-search-intent-first/electron run prepare:models
npm --prefix photo-search-intent-first/electron run dist
```

`prepare:models` uses the Hugging Face Hub to download `sentence-transformers/clip-ViT-B-32` and `openai/clip-vit-base-patch32`, computes a deterministic SHA-256 digest for each staged directory, and writes `electron/models/manifest.json`. The Electron runtime verifies the manifest on launch, copies models into `{appData}/photo-search/models`, and exports the required environment variables (`PHOTOVAULT_MODEL_DIR`, `SENTENCE_TRANSFORMERS_HOME`, `TRANSFORMERS_OFFLINE`, `HF_HUB_OFFLINE`). If you ever need to replace assets manually, use the **Refresh Bundled Models…** menu item or rerun the `prepare:models` script to regenerate the manifest.

### 3. Enable Offline Mode

```bash
# Set offline environment variables
export OFFLINE_MODE=1
export TRANSFORMERS_OFFLINE=1
export HF_HUB_OFFLINE=1
export SENTENCE_TRANSFORMERS_HOME=/path/to/models
```

## Application Setup

### Backend Server

1. **Start the API server:**

```bash
cd photo-search-intent-first
python api/server.py
```

2. **Verify offline configuration:**

```bash
# Test provider offline functionality
python offline_provider_test.py --model-dir /path/to/models
```

### Web Application

1. **Install dependencies:**

```bash
cd photo-search-intent-first/webapp
npm install
```

2. **Start development server:**

```bash
npm run dev
```

3. **Build for production:**

```bash
npm run build
npm run preview
```

### Electron Desktop App (Optional)

If you have Electron set up:

1. **Test Electron configuration:**

```bash
python electron_offline_test.py
```

2. **Build the desktop app:**

```bash
# Configure Electron build (when implemented)
npm run electron:build
```

## Offline Operation

### 1. Index Photos

```bash
# Index photos with local provider
python cli.py index --dir /path/to/photos --provider local

# Or use the web interface:
# 1. Open the app at http://localhost:5173
# 2. Select your photo directory
# 3. Click "Index Photos"
```

### 2. Search Offline

Once indexed, you can search completely offline:

```bash
# CLI search
python cli.py search --dir /path/to/photos --query "beach sunset"

# Web interface search
# 1. Open the app
# 2. Enter search query
# 3. Results load from local index
```

### 3. PWA Offline Mode

The web app works as a Progressive Web App:

1. **Install PWA:**

   - Open the app in Chrome/Edge
   - Click the install icon in the address bar
   - Or use the "Install App" button in the app

2. **Use offline:**
   - Close the browser
   - Open the installed PWA
   - Search works without internet connection

### Cached API Responses

The service worker keeps a lightweight cache so the library stays browseable without a network connection:

- Shell, JS, CSS, favicons, and icons are cached on install.
- Thumbnails requested from `/thumb` endpoints use a stale-while-revalidate policy.
- Read-only JSON endpoints (`/library`, `/collections`, `/trips`, `/smart_collections`, `/presets`) are cached for 5 minutes and refreshed in the background when online.
- If the network is unavailable, the service worker returns the most recent cached JSON with a `{ cached: true }` marker so the UI can indicate offline data.

## Configuration Options

### Environment Variables

| Variable                     | Description                     | Default                          |
| ---------------------------- | ------------------------------- | -------------------------------- |
| `PHOTOVAULT_MODEL_DIR`       | Model storage directory         | `~/.cache/models`                |
| `OFFLINE_MODE`               | Enable offline mode             | `0`                              |
| `TRANSFORMERS_OFFLINE`       | Disable Transformers network    | `0`                              |
| `HF_HUB_OFFLINE`             | Disable HuggingFace Hub network | `0`                              |
| `SENTENCE_TRANSFORMERS_HOME` | SentenceTransformers cache      | `~/.cache/sentence_transformers` |

### API Configuration

The `/config/set` endpoint allows runtime configuration:

```bash
# Set model directory via API
curl -X POST http://localhost:8000/config/set \
  -H "Content-Type: application/json" \
  -d '{"key": "PHOTOVAULT_MODEL_DIR", "value": "/path/to/models"}'
```

## Troubleshooting

### Common Issues

#### 1. Model Download Failures

```
Error: Model download failed
```

**Solution:**

- Check internet connection
- Verify HuggingFace token if using private models
- Pre-download models manually to local directory
- Set `HF_HUB_OFFLINE=1` for fully offline operation

#### 2. CORS Issues in Electron

```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:**

- Verify `app://local` is in API CORS allowlist
- Rebuild Electron app after API changes
- Check preload script configuration

#### 3. Service Worker Not Registering

```
Service worker registration failed
```

**Solution:**

- Ensure HTTPS or localhost
- Check browser developer tools for errors
- Clear browser cache and storage
- Verify service worker file exists at `/service-worker.js`

#### 4. Offline Search Not Working

```
No search results in offline mode
```

**Solution:**

- Verify models are downloaded and accessible
- Check `OFFLINE_MODE=1` is set
- Ensure photo index was built with local provider
- Test with `offline_provider_test.py`

#### 5. PWA Not Installing

```
Install button not showing
```

**Solution:**

- Use Chrome or Edge browser
- Ensure HTTPS (or localhost for development)
- Check web app manifest is served correctly
- Verify service worker is registered

### Performance Optimization

#### Memory Usage

- Use smaller models for limited RAM
- Process photos in smaller batches
- Enable GPU acceleration if available

#### Storage Optimization

- Clean old indexes: `python cli.py data nuke --all`
- Use external storage for large photo collections
- Compress thumbnails to reduce cache size

#### Network Optimization

- Pre-cache frequently used API responses
- Use CDN for static assets when online
- Configure appropriate cache TTL values

### Advanced Configuration

#### Custom Model Configuration

```python
# In your provider configuration
provider_config = {
    "model_name": "openai/clip-vit-base-patch32",
    "cache_dir": "/custom/model/cache",
    "device": "cuda" if torch.cuda.is_available() else "cpu"
}
```

#### Service Worker Customization

Edit `webapp/public/service-worker.js` to:

- Modify cache TTL values
- Add custom API endpoints to cache
- Configure offline fallback pages

#### Electron Integration

For custom Electron builds:

- Configure preload script for `electronAPI`
- Set up custom protocol handlers
- Implement native file dialogs

## Testing Offline Functionality

### Automated Tests

```bash
# Test providers offline
python offline_provider_test.py --model-dir /path/to/models

# Test Electron configuration
python electron_offline_test.py

# Run PWA offline tests
cd webapp && npx playwright test tests/offline-pwa.test.ts
```

### Manual Testing Checklist

- [ ] Models download successfully
- [ ] Offline mode environment variables set
- [ ] API server starts without network errors
- [ ] Photo indexing completes offline
- [ ] Search returns results offline
- [ ] PWA installs and works offline
- [ ] Electron app loads without CORS errors
- [ ] Thumbnails display offline
- [ ] Cached API responses serve offline

## Support

For issues not covered here:

1. Check the [troubleshooting section](#troubleshooting)
2. Run the automated test scripts
3. Review server logs for error details
4. Verify model and configuration setup

## Next Steps

Once offline setup is complete:

1. **Import your photo library**
2. **Build search indexes**
3. **Test search functionality**
4. **Install PWA for offline access**
5. **Configure backup and sync (optional)**
