````instructions
# Photo Search - AI Coding Assistant Instructions

## Project Overview

**Active Codebase**: `photo-search-intent-first/` - Intent-First methodology with layered architecture supporting multiple embedding providers (local transformers, HuggingFace, OpenAI) and advanced search features.

**Tech Stack**: FastAPI backend + React/Vite frontend + Electron desktop shell. Legacy prototypes under `archive/` are reference-only.

## Architecture: Intent-First Layers

```
domain/     → Business models (Photo, SearchResult, SUPPORTED_EXTS)
usecases/   → Business logic, one use case per file (search_photos.py, index_photos.py)
adapters/   → External integrations (provider_factory.py, embedding_*.py, fs_scanner.py)
infra/      → Persistence (index_store.py, fast_index.py, collections.py, tags.py)
api/        → FastAPI server with 20+ modular routers in api/routers/
webapp/     → React + Vite (src/App.tsx, stores/, components/, tests/)
electron/   → Desktop packaging (main.js, models/, bundled CLIP for offline)
```

**Key Patterns**: Provider Factory (`get_provider(name, **kwargs)`), FastIndexManager (unified ANN: FAISS/HNSW/Annoy), Workspace (multi-directory photo management), Lazy Loading (React.lazy + Suspense for heavy components).

## Critical Workflows

### Backend (ALWAYS activate venv first!)

```bash
cd photo-search-intent-first && source .venv/bin/activate

# Run API server
uvicorn api.server:app --host 127.0.0.1 --port 8000 --reload

# CLI operations
python cli.py index --dir /path/to/photos --provider local
python cli.py search --dir /path/to/photos --query "beach sunset"
python cli.py fast build --dir /path/to/photos --kind faiss  # Optional ANN

# Testing & Quality
PYTHONPATH=. python tests/smoke_dummy.py  # No model downloads
make lint         # Ruff + mypy
make parity-check # API surface verification
```

### Frontend

```bash
cd photo-search-intent-first/webapp
npm install
npm run dev           # Dev server on http://127.0.0.1:5173
npm run build         # Production build
npm test              # Vitest unit tests
npm run test:visual   # Playwright visual regression
npm run lint:fix      # Biome formatter + ESLint
```

### Electron

```bash
cd photo-search-intent-first/electron
npm run dev           # Quick dev (assumes UI built)
npm run build:ui      # Build React to ../api/web/
npm run prepare:models # Download/bundle CLIP with hash verification
npm run dist          # Create installers (DMG/NSIS)
```

## Intent-First Methodology

**Core Principle**: "Investigate Intent Before Acting" - before removing/fixing code, investigate original intent and determine if completing it creates more value than removal.

**Decision Framework**:
1. **Context Discovery**: Search references, check history, review docs
2. **Intent Analysis**: What user problem was this solving?
3. **Impact Assessment**: User value vs effort vs risk

## Code Patterns

### Python API

```python
# FastAPI router pattern (api/routers/*.py)
from fastapi import APIRouter, HTTPException
router = APIRouter()

@router.post("/search")
async def search_endpoint(dir: str = Form(...), query: str = Form(...)):
    try:
        embedder = get_provider("local")
        results = store.search(embedder, query)
        return {"ok": True, "data": results}
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

### React Components

```tsx
// Route-driven navigation + lazy loading
import { lazy, Suspense } from 'react';
import { pathToView, viewToPath } from '@/utils/router';

const MapView = lazy(() => import('./components/MapView'));

function App() {
  const currentView = pathToView(location.pathname);
  return (
    <Suspense fallback={<SuspenseFallback label="Loading..." />}>
      {currentView === 'map' && <MapView />}
    </Suspense>
  );
}

// State management with Zustand
const { results, query } = useSearchResults();
```

### Error Handling

```typescript
// Comprehensive error handling (webapp/src/utils/errors.ts)
import { handleError, ErrorType, createAppError } from '@/utils/errors';

try {
  await riskyOperation();
} catch (error) {
  handleError(error, {
    showToast: true,
    context: { component: 'SearchBar', action: 'performSearch' }
  });
}
```

## Testing Patterns

```python
# Backend: Dummy embedder for tests (no model downloads)
class DummyEmbedder:
    def embed_images(self, paths: List[Path]) -> np.ndarray:
        return np.random.rand(len(paths), 32)
```

```typescript
// Frontend: Lazy component tests with async mocking
vi.mock('./components/MapView', async () => {
  await new Promise(r => setTimeout(r, 50));
  return { default: () => <div data-testid="route-map">Map</div> };
});
```

## Development Auth

```bash
# Default: no auth in dev (DEV_NO_AUTH=1 in .env)
# To test auth locally:
API_TOKEN=dev123              # Backend .env
VITE_API_TOKEN=dev123         # Frontend .env
# Check: GET /auth/status → { auth_required: true|false }
```

## Adding Features

1. **Domain**: Define types in `domain/models.py`
2. **Usecase**: Business logic in `usecases/*.py`
3. **Adapter**: External integrations in `adapters/*.py`
4. **Infra**: Persistence in `infra/*.py`
5. **API**: Add router in `api/routers/`, include in `api/server.py`
6. **UI**: React component with lazy loading if heavy

## Integration Points

- **Embedding Providers**: local (transformers), hf (HuggingFace API), openai (OpenAI API)
- **ANN Libraries**: annoy, faiss-cpu, hnswlib (optional, fallback to exact)
- **State**: Zustand stores, URL params for deep linking, localStorage for preferences
- **Communication**: React Context, custom events (`advanced-search-apply`), URL state

## Troubleshooting

- **Import Errors**: Check `PYTHONPATH=.` and venv activated
- **401 Auth Errors**: Verify `DEV_NO_AUTH=1` or token pairing (API_TOKEN / VITE_API_TOKEN)
- **HMR Issues**: Hard refresh browser, verify API on http://localhost:8000
- **Slow Search**: Check ANN index status (`python cli.py fast status`)

## Key Commands Summary

```bash
# Backend
source .venv/bin/activate  # ALWAYS FIRST!
uvicorn api.server:app --reload
make lint && make parity-check

# Frontend
npm run dev && npm test && npm run lint:fix

# Electron
npm run dev:full  # Full rebuild
npm run prepare:models && npm run dist  # Production

# Package Install
python -m pip install -e .[ann,faiss,hnsw,ocr]
ps-intent search --dir /path --query "sunset"
```

Focus on layered architecture, provider abstractions, and Intent-First decision-making when making changes.
````
