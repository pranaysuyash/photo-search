# Offline Mode Implementation – October 2025

## Overview

This document describes the implementation and verification of true offline mode for the Photo Search application, enabling full air-gapped operation using bundled CLIP models. Offline mode can now be set at startup via environment variable, and all model inference is performed using local assets with no network calls.

---

## Features & Workflow


### 1. Offline Mode Startup Flag

- **Environment Variable:** Set `OFFLINE_MODE=1` before starting the server or CLI.
- **Effect:** The application disables all network/model downloads and uses only local resources.
- **Location:** Startup check in `api/server.py` sets the runtime offline flag if the env var is present.


### 2. Bundled Model Usage

- **Bundled Models:** CLIP models (`clip-vit-base-patch32`, `clip-vit-b-32`) are pre-packaged in `electron/models/`.
- **Provider Factory:** `adapters/provider_factory.py` detects offline mode and maps model names to bundled directories.
- **No Downloads:** When offline, the provider never attempts to fetch from HuggingFace or other remote sources.


### 3. CLI & API Support

- **CLI:** Both `index` and `search` commands work fully offline when `OFFLINE_MODE=1` is set.
- **API:** FastAPI server respects the offline flag at startup and via the `/admin/flags/offline` endpoint.

---

## Usage Examples


**Indexing Photos Offline:**

```bash
OFFLINE_MODE=1 python cli.py index --dir /path/to/photos --provider local
```

**Searching Photos Offline:**

```bash
OFFLINE_MODE=1 python cli.py search --dir /path/to/photos --query "beach sunset"
```

**Starting Server in Offline Mode:**

```bash
OFFLINE_MODE=1 python api/server.py
```

**Runtime Toggle (Admin Endpoint):**

```bash
curl -X POST 'http://127.0.0.1:8000/admin/flags/offline' -H 'Content-Type: application/json' -d '{"offline": true}'
```

---


## Implementation Details

- **api/server.py:**
  - Checks `OFFLINE_MODE` env var at startup and sets offline flag accordingly.
- **adapters/provider_factory.py:**
  - Detects offline mode and uses bundled model directories for CLIP.
  - `_find_bundled_model_dir()` locates `electron/models/`.
- **Bundled Models:**
  - Located in `electron/models/clip-vit-base-patch32/` and `electron/models/clip-vit-b-32/`.
- **No Network Calls:**
  - All model inference and embedding generation is performed locally.

---


## Verification

- **Indexing:**
  - Ran `OFFLINE_MODE=1 ...cli.py index --dir e2e_data --provider local`.
  - Output: `Index complete. New: 14, Updated: 0, Total: 14` (no network activity).
- **Searching:**
  - Ran `OFFLINE_MODE=1 ...cli.py search --dir e2e_data --query "beach sunset"`.
  - Output: Ranked results with no external calls.
- **Admin Endpoint:**
  - POST to `/admin/flags/offline` sets offline mode at runtime.

---


## Security & Best Practices

- **No model downloads** in offline mode; all assets must be pre-bundled.
- **Environment variable** is the recommended way to enable offline mode for air-gapped deployments.
- **Admin endpoint** allows runtime toggling for flexibility in dev/test.

---


## Summary

This implementation enables robust, verifiable offline operation for Photo Search, supporting both CLI and API workflows with bundled models and no network dependencies. All changes follow the Intent-First methodology and maintain clean separation of concerns in the codebase.
