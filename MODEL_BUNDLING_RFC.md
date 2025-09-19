# Model Bundling Strategy RFC

## Problem Statement

Users need CLIP model weights for offline photo search functionality. Currently, the app downloads models on first use, which requires network connectivity and can be slow/large downloads. We need a strategy to make models available offline.

## Options

### Option A: Bundle Models with Electron Installer

**Pros:**

- Seamless offline experience from day one
- No additional user steps required
- Predictable download/install size
- Works in air-gapped environments immediately

**Cons:**

- Increases installer size significantly (~500MB+ for CLIP models)
- Users download models even if they don't need offline functionality
- Updates require full app reinstall to get new model versions
- Platform-specific bundling complexity (different models for different architectures)
- Storage waste for users who prefer online-only usage

**Implementation:**

- Add model assets to Electron builder config as extraResources
- Set app data path for model storage
- Copy models to user-writable location on first run
- Handle model updates via app updates

### Option B: First-Run Import Models UX

**Pros:**

- Smaller installer size (~50MB vs ~500MB+)
- Users only download what they need
- Flexible model location (can use existing downloads)
- Easier updates (models can be updated independently)
- Better for users who prefer online-only usage

**Cons:**

- Requires user interaction on first run
- Potential confusion about where to get models
- Offline functionality not available until models are imported
- Additional UI complexity for model management

**Implementation:**

- Add "Import Models" step to FirstRunSetup modal
- Allow directory selection for existing model downloads
- Set environment variables: `PHOTOVAULT_MODEL_DIR`, `TRANSFORMERS_OFFLINE=1`
- Add validation to confirm models are found and working
- Provide clear instructions for downloading models

## Recommendation: Option A (Bundle Models with Electron Installer)

**Rationale:**

- Aligns with intent-first handbook's offline-first architecture and provider factory pattern
- Provides seamless offline experience from installation, supporting air-gapped environments
- Eliminates user friction for local provider functionality
- Ensures consistent model versions across installations
- Final implementation perspective prioritizes complete offline capability over minimal installer size

## Implementation Plan

1. **Electron Builder Configuration:**

   - Add CLIP model weights to `extraResources` in electron-builder config
   - Target models: `clip-vit-base-patch32` for SentenceTransformers and Transformers providers
   - Platform-specific builds for different architectures (x64, arm64)

2. **App Data Management:**

   - Set default model directory: `{appData}/photo-search/models/`
   - Copy bundled models to user-writable location on first run
   - Handle model updates through app version updates

3. **Backend Integration:**

   - Honor `PHOTOVAULT_MODEL_DIR` environment variable (defaults to app data path)
   - Set `TRANSFORMERS_OFFLINE=1` and `SENTENCE_TRANSFORMERS_HOME` automatically
   - Add model validation on startup to ensure integrity

4. **UI/UX Considerations:**

   - No additional setup steps required for offline functionality
   - Clear indication in provider selection that local is fully offline
   - Optional advanced settings to override model directory

5. **Documentation:**

   - Update README with offline capabilities and model storage details
   - Document default model directory and override options
   - Include troubleshooting for model-related issues

6. **Validation:**
   - Test offline indexing/search immediately after installation
   - Verify no network calls when using local provider
   - Confirm model integrity and loading performance

## Success Criteria

- Offline photo search works immediately after installation without network connectivity
- Local provider available and functional in air-gapped environments
- Clear documentation of model storage location and override options
- Seamless user experience with no additional setup for offline functionality
- Model integrity validation and automatic updates through app releases

## Migration Path

For existing users:

- App updates will include bundled models automatically
- Existing downloaded models can be migrated to app data directory
- Backward compatibility maintained during transition period
- Clear upgrade path with model validation

## Risks & Mitigations

- **Installer Size:** Accept larger download for complete offline experience; provide clear size information
- **Platform Complexity:** Use electron-builder's cross-platform resource handling; test on all supported platforms
- **Model Updates:** Tie model updates to app releases; provide version checking and migration
- **Storage Management:** Allow users to override model directory if needed; provide cleanup utilities
- **Performance:** Optimize model loading and caching; provide progress indicators for first-run setup

---

_Decision: Proceed with Option A (Bundle Models with Electron Installer)_
_Date: 2025-09-19_
_Status: Ready for Implementation_
