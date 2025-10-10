# Project Organization & Folder Structure

## Root Level Structure

```
photo-search/
├── photo-search-intent-first/    # Main application (Intent-First methodology)
├── electron-v3/                  # V3 Electron desktop wrapper (CURRENT FOCUS)
├── archive/                      # Legacy implementations
├── docs/                         # Project documentation
├── landing/                      # Marketing landing page
├── e2e_data/                     # End-to-end test data
└── demo_photos/                  # Demo photo dataset
```

## Main Application Structure (`photo-search-intent-first/`)

### Backend Components
```
api/                              # FastAPI backend
├── routers/                      # API route handlers
├── models/                       # Pydantic data models
├── database/                     # Database adapters
├── managers/                     # Business logic managers
└── server.py                     # Main FastAPI application

adapters/                         # External service adapters
├── embedding_*.py                # AI model adapters (CLIP, OpenAI, etc.)
├── fs_scanner.py                 # File system scanning
└── provider_factory.py          # Provider pattern implementation

domain/                           # Core business logic
├── models.py                     # Domain models
└── smart_collection_rules.py    # Collection rule engine

services/                         # Application services
usecases/                         # Use case implementations
```

### Frontend Components
```
webapp-v3/                        # V3 React frontend (CURRENT FOCUS)
├── src/
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── layout/               # Layout components
│   │   ├── search/               # Search-related components
│   │   ├── photo/                # Photo display components
│   │   └── collections/          # Collection management
│   ├── services/                 # API clients
│   ├── store/                    # Zustand state management
│   ├── hooks/                    # Custom React hooks
│   ├── types/                    # TypeScript definitions
│   └── lib/                      # Utility functions
├── public/                       # Static assets
└── dist/                         # Build output

webapp/                           # V1 React frontend (LEGACY)
ui/                               # Streamlit prototype (LEGACY)
```

### Desktop Application
```
electron/                         # Legacy Electron wrapper
electron-v3/                      # V3 Electron wrapper (CURRENT FOCUS)
├── main.js                       # Main Electron process
├── preload.js                    # Security bridge script
├── app/                          # Built React application
├── assets/                       # Desktop app assets
├── models/                       # Bundled AI models
└── scripts/                      # Build and utility scripts
```

## Archive Structure (`archive/`)

```
archive/
├── photo-search-classic/         # Original Streamlit implementation
│   ├── webapp/                   # Classic React frontend
│   ├── api/                      # Classic FastAPI backend
│   └── tests/                    # Classic test suite
└── photo-search-intent-first/   # Archived intent-first experiments
```

## Documentation Structure (`docs/`)

```
docs/
├── analysis/                     # Technical analysis documents
├── development/                  # Development guides and standards
├── intent-first/                 # Intent-First methodology docs
├── project-overview/             # High-level project documentation
└── classic/                      # Classic version documentation
```

## Key Configuration Files

### Root Level
- `package.json` - Root package with workspace scripts
- `pyproject.toml` - Python project configuration
- `docker-compose.yml` - Container orchestration
- `.env` - Environment variables

### Frontend (V3)
- `photo-search-intent-first/webapp-v3/package.json` - V3 frontend dependencies
- `photo-search-intent-first/webapp-v3/vite.config.ts` - Vite configuration
- `photo-search-intent-first/webapp-v3/tailwind.config.js` - Tailwind CSS config
- `photo-search-intent-first/webapp-v3/tsconfig.json` - TypeScript configuration

### Backend
- `photo-search-intent-first/requirements.txt` - Python dependencies
- `photo-search-intent-first/.venv/` - Python virtual environment (USE THIS)
- `photo-search-intent-first/api/server.py` - FastAPI application entry point

### Desktop
- `electron-v3/package.json` - Electron app configuration
- `electron-v3/main.js` - Electron main process
- `electron-v3/preload.js` - Secure IPC bridge

## Development Focus Areas

### Primary Development (V3)
- `photo-search-intent-first/webapp-v3/` - Modern React frontend
- `electron-v3/` - Desktop application wrapper
- `photo-search-intent-first/api/` - Backend API (shared)

### Legacy/Maintenance Only
- `photo-search-intent-first/webapp/` - V1 React frontend
- `photo-search-intent-first/electron/` - Legacy Electron wrapper
- `archive/photo-search-classic/` - Original implementation

## Data Storage Locations

### Development
- `.photo_index/` - Photo embeddings and metadata (in photo directories)
- `photo-search-intent-first/.venv/` - Python virtual environment
- `logs/` - Application logs

### Production (Electron)
- `{appData}/photo-search/models/` - Bundled AI models
- `{userData}/photo-search/` - User settings and cache
- User-selected photo directories - Photo indexes and thumbnails

## Import Patterns

### Frontend (V3)
```typescript
// UI components
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/search/SearchBar'

// Services and stores
import { usePhotoStore } from '@/store/photoStore'
import { apiClient } from '@/services/api'

// Types
import type { Photo, SearchResult } from '@/types'
```

### Backend
```python
# Domain models
from domain.models import Photo, Collection

# Adapters
from adapters.embedding_clip import CLIPEmbeddingAdapter
from adapters.fs_scanner import FileSystemScanner

# API components
from api.routers.search import router as search_router
```

## Testing Structure

```
tests/                            # Python tests
test-results/                     # Playwright test results
photo-search-intent-first/webapp-v3/__tests__/  # Frontend unit tests
```

## Build Outputs

```
photo-search-intent-first/webapp-v3/dist/  # V3 frontend build
electron-v3/app/                           # Electron app bundle
electron-v3/dist/                          # Electron installers
```