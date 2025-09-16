# Photo Search - AI Coding Assistant Instructions

## Project Overview

This is a photo search application built with an Intent-First methodology, featuring two implementations:

- **Intent-First**: Layered architecture with explicit intent documentation (recommended)
- **Classic**: Straightforward Streamlit app

The Intent-First version uses a clean architecture with domain/usecases/adapters/infra layers, supporting multiple embedding providers (local transformers, HuggingFace, OpenAI) and advanced search features.

## Architecture Patterns

### Intent-First Layered Architecture

```
domain/     # Business models and core types
├── models.py (Photo, SearchResult, SUPPORTED_EXTS)

usecases/   # Business logic, one file per use case
├── search_photos.py
├── index_photos.py
├── manage_collections.py
└── ...

adapters/   # External service integrations
├── provider_factory.py (get_provider() for embedding backends)
├── embedding_*.py (CLIP, OpenAI, HuggingFace implementations)
├── fs_scanner.py (file system operations)
└── ...

infra/      # Infrastructure and persistence
├── index_store.py (embeddings, ANN indexes)
├── collections.py, tags.py, saved.py
├── thumbs.py, faces.py, trips.py
└── ...
```

### Key Architectural Decisions

- **Provider Factory Pattern**: `get_provider(name, **kwargs)` abstracts embedding backends
- **Index Store Pattern**: Centralized storage for embeddings with multiple ANN backends (Annoy, FAISS, HNSW)
- **Workspace Pattern**: User can manage multiple photo directories
- **Lazy Loading**: Heavy components loaded with React.lazy + Suspense

## Critical Developer Workflows

### Backend Development

```bash
# Setup Python environment
cd photo-search-intent-first
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Run API server
python api/server.py

# CLI operations
python cli.py index --dir /path/to/photos --provider local
python cli.py search --dir /path/to/photos --query "beach sunset"

# Testing (no model downloads required)
PYTHONPATH=. python tests/smoke_dummy.py
```

### Frontend Development

```bash
# Setup Node environment
cd photo-search-intent-first/webapp
npm install

# Development server
npm run dev

# Build and preview
npm run build && npm run preview

# Testing
npm test                    # Unit tests (Vitest)
npm run test:e2e           # E2E tests (Playwright)
npm run test:visual        # Visual regression tests
npm run analyze            # Bundle analysis
```

### Cross-Platform Development

- **Electron Support**: File protocol handling, native dialogs
- **PWA Features**: Service workers, offline capabilities
- **Mobile Optimization**: Touch gestures, responsive design

## Project-Specific Conventions

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

// Centralized state management
const { results, query, busy } = useSearchStore();
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
