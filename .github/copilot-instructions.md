````instructions
# Photo Search - AI Coding Assistant Instructions

## Project Overview

This is a photo search application built with an Intent-First methodology. The active implementation lives in `photo-search-intent-first/` with a layered architecture supporting multiple embedding providers (local transformers, HuggingFace, OpenAI) and advanced search features.

**Key Architecture**: FastAPI backend + React/Vite frontend + optional Electron desktop shell. Legacy prototypes exist under `archive/` and `docs/` for reference only.

**Active Codebase**: All development happens in `photo-search-intent-first/` - ignore other directories unless explicitly extending archival examples.

## Architecture Patterns

### Intent-First Layered Architecture

```
domain/     # Business models and core types
├── models.py (Photo, SearchResult, SUPPORTED_EXTS, MODEL_NAME)

usecases/   # Business logic, one file per use case
├── search_photos.py, index_photos.py
├── manage_collections.py, manage_tags.py, manage_saved.py
└── get_attention_extras.py, get_popularity.py

adapters/   # External service integrations
├── provider_factory.py (get_provider() - embedding backend factory)
├── embedding_*.py (CLIP variants, HF API, OpenAI implementations)
├── fs_scanner.py, video_scanner.py, video_processor.py
└── jobs_bridge.py, vlm_caption_hf.py

infra/      # Infrastructure and persistence
├── index_store.py (embeddings, ANN indexes with FastIndexManager)
├── fast_index.py (unified ANN backend abstraction)
├── collections.py, tags.py, saved.py, faces.py, trips.py
├── thumbs.py, analytics.py, config.py
└── video_index_store.py, shares.py, edits.py

api/        # FastAPI server with modular routers
├── server.py (main app with all router includes)
├── routers/ (analytics, auth, batch, captions, collections, etc.)
├── schemas/v1.py (API request/response models)
└── utils.py, exception_handlers.py

webapp/     # React + Vite frontend
├── src/App.tsx (main component with routing)
├── src/stores/ (Zustand state management)
├── src/components/ (reusable UI components)
├── src/services/ (API clients, telemetry)
└── tests/ (Vitest unit tests, Playwright E2E)

electron/   # Desktop shell packaging
├── main.js, package.json
├── models/ (bundled CLIP models for offline)
└── run-electron.js
```

### Key Architectural Decisions

- **Provider Factory Pattern**: `get_provider(name, **kwargs)` abstracts embedding backends with unified interface
- **FastIndexManager Pattern**: Unified ANN backend abstraction (FAISS/HNSW/Annoy) with intelligent fallback selection
- **Index Store Pattern**: Centralized embeddings storage with multiple ANN backends and exact similarity fallback
- **Workspace Pattern**: Multi-directory photo management with per-folder indexing
- **Modular API Routers**: Each feature domain gets its own router (20+ routers in `api/routers/`)
- **Lazy Loading**: Heavy React components loaded with React.lazy + Suspense

## Critical Developer Workflows

### Backend Development

```bash
# Setup Python environment (uses existing .venv)
cd photo-search-intent-first && source .venv/bin/activate  # Virtual environment already exists with all dependencies

# Run API server (FastAPI with auto-reload)
python api/server.py
# OR: uvicorn api.server:app --host 127.0.0.1 --port 8000 --reload

# CLI operations
python cli.py index --dir /path/to/photos --provider local
python cli.py search --dir /path/to/photos --query "beach sunset"
python cli.py fast build --dir /path/to/photos --kind faiss  # Optional ANN acceleration
python cli.py fast status --dir /path/to/photos

# Testing (no model downloads required)
PYTHONPATH=. python tests/smoke_dummy.py

# Linting and code quality
make lint  # Runs ruff + mypy
make parity-check  # API surface parity verification
```

### Frontend Development

```bash
# Setup Node environment
cd photo-search-intent-first/webapp
npm install

# Development server (auto-reload with API proxy)
npm run dev  # Runs on http://127.0.0.1:5173

# Build and preview
npm run build && npm run preview

# Testing suite
npm test                    # Unit tests (Vitest)
npm run test:e2e           # E2E tests (Playwright)
npm run test:visual        # Visual regression tests
npm run test:offline       # PWA/offline functionality tests
npm run analyze            # Bundle analysis

# Code quality
npm run lint:fix           # Biome formatter + ESLint fixes
```

### Electron Development

```bash
# Desktop app development
cd photo-search-intent-first/electron
npm run dev                # Quick dev mode (assumes UI built)
npm run dev:full          # Full rebuild: UI + models + electron

# Production builds
npm run build:ui          # Build React app to ../api/web/
npm run prepare:models    # Download/bundle CLIP models with hash verification
npm run pack             # Build unpacked app
npm run dist             # Create installers (DMG/NSIS/etc)
```

## Project-Specific Conventions

### Intent-First Development Philosophy

This codebase follows **Intent-First methodology**: "Investigate Intent Before Acting" - before removing, suppressing, or "fixing" any code or feature, investigate the original intent and determine if completing it would create more value than removing it.

**Key Decision Framework**:
1. **Context Discovery**: Understand the element and search references across codebase
2. **Intent Analysis**: What user problem was this meant to solve?
3. **Impact Assessment**: User value vs technical effort vs operational risk

### CLI Patterns

```python
# Standard CLI structure (cli.py)
parser = argparse.ArgumentParser(description="Photo Search – Intent-First CLI")
sub = parser.add_subparsers(dest="cmd", required=True)
p_index = sub.add_parser("index", help="Build or update index")
p_index.add_argument("--dir", required=True, help="Photo directory")
p_index.add_argument("--provider", default="local", choices=["local", "hf", "openai"])
```

### API Patterns

```python
# FastAPI server patterns (api/server.py)
# Main app includes 20+ modular routers
from api.routers.analytics import router as analytics_router
from api.routers.collections import router as collections_router
# ... etc
app.include_router(analytics_router)

@app.post("/search")
async def search_endpoint(
    dir: str = Form(...),
    query: str = Form(...),
    provider: str = Form("local"),
    hf_token: Optional[str] = Form(None),
    openai_key: Optional[str] = Form(None),
):
    embedder = get_provider(provider, hf_token=hf_token, openai_api_key=openai_key)
    # ... business logic
```

### Error Handling

```python
# Consistent error handling pattern
try:
    result = await operation()
    return {"ok": True, "data": result}
except Exception as e:
    logger.error(f"Operation failed: {e}")
    raise HTTPException(status_code=500, detail=str(e))
```

### React Patterns

```tsx
// Route-driven navigation
const currentView = pathToView(location.pathname);
navigate(viewToPath("results"));

// Lazy loading with suspense
const MapView = lazy(() => import("./components/MapView"));
<Suspense fallback={<SuspenseFallback label="Loading map..." />}>
  <MapView />
</Suspense>;

// Centralized state management (stores/useStores.ts)
const { results, query, busy } = useSearchResults();
const { dir, setDir } = useDir();
```

### Error Handling Patterns

```typescript
// Comprehensive error handling with categorization
import { handleError, ErrorType, createAppError } from '@/utils/errors';

try {
  await riskyOperation();
} catch (error) {
  handleError(error, {
    showToast: true,
    context: { component: 'SearchBar', action: 'performSearch' }
  });
}

// Custom errors with user-friendly messages
throw createAppError(
  'Search results exceeded limit',
  ErrorType.VALIDATION,
  { userMessage: 'Please refine your search.', recoverable: true }
);
```

### Deep-Linking Patterns

```typescript
// URL structure for sharing specific views
/search?q=sunset&filter=recent
/collections/favorites
/photo/12345?from=search&q=sunset
/people/cluster-123

// Programmatic navigation with context
const handleSearch = (query: string) => {
  navigate(`/search?q=${encodeURIComponent(query)}`);
};
```

## Integration Points

### Embedding Providers

```python
# Multiple backends supported
providers = {
    "local": TransformersClipEmbedding(),  # Fast, no API keys
    "hf": HfClipAPI(token=hf_token),       # HuggingFace API
    "openai": OpenAICaptionEmbed(key),     # OpenAI API
}
```

### External Dependencies

- **ML Frameworks**: sentence-transformers, torch, PIL
- **ANN Libraries**: annoy, faiss-cpu, hnswlib (optional)
- **OCR**: easyocr (optional)
- **Video**: opencv-python (optional)

### Cross-Component Communication

- **React Context**: ResultsUIContext, LibraryContext, ModalContext
- **Custom Events**: `advanced-search-apply`, `photo-action`
- **URL State**: Query parameters for deep linking
- **Local Storage**: User preferences, onboarding state

## Testing Patterns

### Backend Testing

```python
# Dummy embedder for testing without model downloads
class DummyEmbedder:
    def embed_images(self, paths: List[Path]) -> np.ndarray:
        # Simple color-based embeddings for testing
        return np.random.rand(len(paths), 32)

# Smoke test pattern
def run(tmp_root: Path):
    store = IndexStore(img_dir)
    embedder = DummyEmbedder()
    photos = [Photo(path=p, mtime=p.stat().st_mtime) for p in paths]
    store.upsert(embedder, photos)
    results = store.search(embedder, "red", top_k=2)
```

### Frontend Testing

```typescript
// Vitest + React Testing Library
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

test("search input updates query", () => {
  render(<SearchInput onSearch={mockFn} />);
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: "beach" } });
  expect(mockFn).toHaveBeenCalledWith("beach");
});

// Testing lazy components with async mocking
vi.mock('./components/MapView', async () => {
  await new Promise(r => setTimeout(r, 50));
  return { default: () => <div data-testid="route-map">Map</div> };
});
```

### Visual Testing

```bash
# Visual regression testing with Playwright
npm run test:visual        # Run visual tests
npm run test:visual:update # Update visual baselines
npm run test:offline       # PWA/offline functionality tests
```

## Common Development Tasks

### Adding New Features

1. **Domain**: Define types in `domain/models.py`
2. **Usecase**: Create business logic in `usecases/`
3. **Adapter**: Add external integrations in `adapters/`
4. **Infra**: Implement persistence in `infra/`
5. **API**: Add FastAPI endpoints in `api/server.py`
6. **UI**: Create React components with lazy loading

### Adding Embedding Providers

```python
# 1. Create adapter (adapters/embedding_new.py)
class NewEmbedding:
    def embed_images(self, paths: List[Path]) -> np.ndarray: ...
    def embed_text(self, query: str) -> np.ndarray: ...

# 2. Add to provider factory
def get_provider(name: str, **kwargs):
    if name == "new":
        return NewEmbedding(**kwargs)
```

### Performance Optimization

- **Lazy Loading**: Use React.lazy for heavy components
- **Search Caching**: Implement client-side result caching
- **Bundle Splitting**: Manual chunks for vendor/UI libraries
- **ANN Indexes**: Support multiple backends (Annoy/FAISS/HNSW)

### Bundle Analysis & Code Splitting

```typescript
// Manual chunking for better caching (vite.config.ts)
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom'],
        ui: ['lucide-react', 'framer-motion'],
        utils: ['zustand'],
      },
    },
  },
}

// Check bundle sizes
npm run analyze  # Build and print chunk sizes
```

## File Organization Principles

### Backend Files

- `domain/models.py`: Core business types and constants
- `usecases/*.py`: One use case per file (search, index, manage\_\*)
- `adapters/*.py`: External service integrations
- `infra/*.py`: Persistence, caching, utilities
- `api/server.py`: FastAPI endpoints and middleware

### Frontend Files

- `src/App.tsx`: Main component with routing and state
- `src/api.ts`: API client functions
- `src/components/`: Reusable UI components
- `src/views/`: Route-specific view containers
- `src/stores/`: Zustand state management
- `src/utils/`: Helper functions and utilities

## Quality Assurance

### Code Quality

- **Linting**: Biome for consistent formatting
- **TypeScript**: Strict type checking enabled
- **Python**: Ruff for fast linting and formatting
- **Testing**: Vitest for frontend, pytest for backend

### Performance Monitoring

- **Bundle Analysis**: `npm run analyze` for frontend bundles
- **Search Performance**: Response time tracking in monitoring service
- **Memory Usage**: Index store size monitoring

## Deployment Patterns

### Docker Deployment

```dockerfile
FROM python:3.9-slim
COPY photo-search-intent-first/ /app/
RUN pip install -r requirements.txt
EXPOSE 8000
CMD ["python", "api/server.py"]
```

### Build Optimization

- **Tree Shaking**: Automatic unused code elimination
- **Code Splitting**: Route-based and component-based splitting
- **Compression**: Gzip/Brotli for static assets
- **Caching**: Long-term caching for vendor bundles

## Troubleshooting Common Issues

### Backend Issues

- **Import Errors**: Check `PYTHONPATH` includes project root
- **Provider Errors**: Verify API keys and network connectivity
- **Index Errors**: Check disk space and file permissions

### Frontend Issues

- **Build Errors**: Clear node_modules and reinstall
- **Hot Reload Issues**: Hard refresh browser to clear cache
- **API Connection**: Verify backend server is running on port 8000

### Performance Issues

- **Slow Search**: Check ANN index status and rebuild if needed
- **Large Bundles**: Analyze with `npm run analyze` and optimize imports
- **Memory Usage**: Monitor index store size and implement cleanup

## Security Considerations

### API Security

- **Token Authentication**: Bearer token for mutating endpoints
- **CORS Configuration**: Proper origin validation
- **Input Validation**: Path traversal protection

### Data Privacy

- **Local Processing**: Images processed locally by default
- **API Key Management**: Secure storage of external API keys
- **Workspace Isolation**: User data isolated by directory

This codebase follows Intent-First development principles, emphasizing clean architecture, comprehensive testing, and user-centric design. Focus on maintaining the layered architecture and provider abstraction patterns when making changes.

## Critical Developer Workflows

### CLI Patterns

```python
# Standard CLI structure (cli.py)
parser = argparse.ArgumentParser(description="Photo Search – Intent-First CLI")
sub = parser.add_subparsers(dest="cmd", required=True)
p_index = sub.add_parser("index", help="Build or update index")
p_index.add_argument("--dir", required=True, help="Photo directory")
p_index.add_argument("--provider", default="local", choices=["local", "hf", "openai"])
```

### Package Installation & Entry Points

```bash
# Install as editable package from project root
python -m pip install -e .[ann,faiss,hnsw,ocr]

# Use anywhere with entry points
ps-intent index --dir /path/to/photos --provider local
ps-intent search --dir /path/to/photos --query "friends having tea"
ps-intent-ui  # Launch Streamlit UI
```

### Fast ANN Index Management

```bash
# Build base embeddings first, then optionally accelerate with ANN
python cli.py index --dir /path/to/photos --provider local
python cli.py fast build --dir /path/to/photos --kind faiss
python cli.py fast status --dir /path/to/photos

# API endpoints for fast search
POST /fast/build  # {dir, kind}
GET  /fast/status?dir=...
POST /search with use_fast=1 and fast_kind=auto|faiss|hnsw|annoy|exact
```

### Authentication Development

```bash
# Development mode (default): no auth required
DEV_NO_AUTH=1  # Set in .env, bypasses auth even if API_TOKEN set

# Test auth locally
API_TOKEN=dev123              # Backend
VITE_API_TOKEN=dev123         # Frontend
# OR: localStorage.setItem('api_token','dev123')

# Check auth status
GET /auth/status → { auth_required: true|false }
POST /auth/check (with Authorization header) → 200 if accepted
```

## File Organization Principles

### Backend Files

- `domain/models.py`: Core business types and constants
- `usecases/*.py`: One use case per file (search, index, manage\_\*)
- `adapters/*.py`: External service integrations
- `infra/*.py`: Persistence, caching, utilities
- `api/server.py`: FastAPI endpoints and middleware

### Frontend Files

- `src/App.tsx`: Main component with routing and state
- `src/api.ts`: API client functions
- `src/components/`: Reusable UI components
- `src/views/`: Route-specific view containers
- `src/stores/`: Zustand state management
- `src/utils/`: Helper functions and utilities

## Quality Assurance

### Code Quality

- **Linting**: Biome for consistent formatting
- **TypeScript**: Strict type checking enabled
- **Python**: Ruff for fast linting and formatting
- **Testing**: Vitest for frontend, pytest for backend

### Performance Monitoring

- **Bundle Analysis**: `npm run analyze` for frontend bundles
- **Search Performance**: Response time tracking in monitoring service
- **Memory Usage**: Index store size monitoring

## Deployment Patterns

### Docker Deployment

```dockerfile
FROM python:3.9-slim
COPY photo-search-intent-first/ /app/
RUN pip install -r requirements.txt
EXPOSE 8000
CMD ["python", "api/server.py"]
```

### Build Optimization

- **Tree Shaking**: Automatic unused code elimination
- **Code Splitting**: Route-based and component-based splitting
- **Compression**: Gzip/Brotli for static assets
- **Caching**: Long-term caching for vendor bundles

## Troubleshooting Common Issues

### Backend Issues

- **Import Errors**: Check `PYTHONPATH` includes project root
- **Provider Errors**: Verify API keys and network connectivity
- **Index Errors**: Check disk space and file permissions

### Frontend Issues

- **Build Errors**: Clear node_modules and reinstall
- **Hot Reload Issues**: Hard refresh browser to clear cache
- **API Connection**: Verify backend server is running on port 8000

### Performance Issues

- **Slow Search**: Check ANN index status and rebuild if needed
- **Large Bundles**: Analyze with `npm run analyze` and optimize imports
- **Memory Usage**: Monitor index store size and implement cleanup

## Security Considerations

### API Security

- **Token Authentication**: Bearer token for mutating endpoints
- **CORS Configuration**: Proper origin validation
- **Input Validation**: Path traversal protection

### Data Privacy

- **Local Processing**: Images processed locally by default
- **API Key Management**: Secure storage of external API keys
- **Workspace Isolation**: User data isolated by directory

This codebase follows Intent-First development principles, emphasizing clean architecture, comprehensive testing, and user-centric design. Focus on maintaining the layered architecture and provider abstraction patterns when making changes.
````
