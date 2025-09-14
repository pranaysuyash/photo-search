# Migration Guide for Contributors

## Table of Contents
1. [Getting Started](#getting-started)
2. [Codebase Overview](#codebase-overview)
3. [Development Workflow](#development-workflow)
4. [Architecture Decisions](#architecture-decisions)
5. [Key Technologies](#key-technologies)
6. [Common Patterns](#common-patterns)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Process](#deployment-process)
9. [Breaking Changes](#breaking-changes)
10. [Contributing Guidelines](#contributing-guidelines)

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** v18+ and npm v9+
- **Python** 3.9+ with pip
- **Git** with commit signing (recommended)
- **VS Code** or similar IDE with TypeScript support

### Initial Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/photo-search.git
cd photo-search

# 2. Install frontend dependencies
cd photo-search-intent-first/webapp
npm install

# 3. Install API dependencies
cd ../api
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 4. Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# 5. Run development servers
npm run dev         # Frontend (in webapp/)
python server.py    # API (in api/)
```

### Recommended IDE Setup

**VS Code Extensions:**
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- Python
- Biome

**Settings (.vscode/settings.json):**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome",
  "editor.codeActionsOnSave": {
    "source.fixAll.biome": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

## Codebase Overview

### Project Structure

```
photo-search/
├── docs/                    # Documentation
├── photo-search-intent-first/
│   ├── api/                # Python backend
│   │   ├── server.py       # Main API server
│   │   ├── indexer.py      # Photo indexing logic
│   │   ├── searcher.py     # Search implementation
│   │   └── models/         # ML models
│   ├── webapp/             # React frontend
│   │   ├── src/
│   │   │   ├── components/ # UI components
│   │   │   ├── contexts/   # React contexts
│   │   │   ├── hooks/      # Custom hooks
│   │   │   ├── services/   # API services
│   │   │   ├── stores/     # State management
│   │   │   └── utils/      # Utilities
│   │   └── tests/          # Test files
│   └── electron/           # Desktop app
└── scripts/                # Build and deployment
```

### Key Files

| File | Purpose |
|------|---------|
| `webapp/src/App.tsx` | Main application component |
| `webapp/src/api.ts` | API client configuration |
| `api/server.py` | FastAPI server setup |
| `api/indexer.py` | Photo indexing logic |
| `webapp/vite.config.ts` | Build configuration |
| `webapp/biome.json` | Linting and formatting |

---

## Development Workflow

### Branch Strategy

```
main          # Production-ready code
├── develop   # Integration branch
│   ├── feature/xxx   # New features
│   ├── fix/xxx      # Bug fixes
│   └── refactor/xxx # Code improvements
```

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add photo face clustering
fix: resolve memory leak in grid view
docs: update API documentation
refactor: optimize search algorithm
test: add unit tests for filters
chore: update dependencies
```

### Pull Request Process

1. **Create feature branch:**
```bash
git checkout -b feature/your-feature
```

2. **Make changes and test:**
```bash
npm test
npm run lint
npm run type-check
```

3. **Commit with message:**
```bash
git add .
git commit -m "feat: add new feature"
```

4. **Push and create PR:**
```bash
git push origin feature/your-feature
```

5. **PR Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Testing
- [ ] Unit tests pass
- [ ] Manual testing completed
- [ ] No console errors

## Screenshots (if UI changes)
[Add screenshots]
```

---

## Architecture Decisions

### State Management

The app uses a hybrid approach:

1. **React Context** for UI state and shared data
2. **Zustand** for persistent settings
3. **React Query** (optional) for server state

```typescript
// Context for ephemeral state
const SearchContext = createContext<SearchState>();

// Zustand for persistent state
const useSettingsStore = create(persist(
  (set) => ({
    theme: 'light',
    setTheme: (theme) => set({ theme })
  })
));
```

### Component Architecture

Follow these principles:

1. **Separation of Concerns:**
   - Presentational components (UI only)
   - Container components (logic)
   - Page components (routing)

2. **Composition over Inheritance:**
```typescript
// Compose smaller components
<PhotoCard>
  <PhotoImage src={photo.url} />
  <PhotoMetadata {...photo} />
  <PhotoActions onEdit={edit} />
</PhotoCard>
```

3. **Props Interface Pattern:**
```typescript
interface ComponentProps {
  required: string;
  optional?: number;
  children?: React.ReactNode;
  onAction?: (value: string) => void;
}
```

### API Design

RESTful endpoints with consistent patterns:

```
GET    /api/photos          # List
GET    /api/photos/:id      # Detail
POST   /api/photos          # Create
PUT    /api/photos/:id      # Update
DELETE /api/photos/:id      # Delete

# Search and filters
GET    /api/photos?q=sunset&filter=recent

# Actions
POST   /api/photos/:id/favorite
POST   /api/photos/batch/delete
```

---

## Key Technologies

### Frontend Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| React | UI Framework | 18.x |
| TypeScript | Type Safety | 5.x |
| Vite | Build Tool | 5.x |
| Tailwind CSS | Styling | 3.x |
| React Router | Routing | 6.x |
| Zustand | State Management | 4.x |
| Biome | Linting/Formatting | 1.x |

### Backend Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| Python | Runtime | 3.9+ |
| FastAPI | Web Framework | 0.100+ |
| Pillow | Image Processing | 10.x |
| NumPy | Numerical Computing | 1.24+ |
| SQLite | Database | Built-in |
| CLIP | Image Embeddings | Latest |

### Testing Tools

| Tool | Purpose |
|------|---------|
| Vitest | Unit Testing |
| React Testing Library | Component Testing |
| Playwright | E2E Testing |
| MSW | API Mocking |

---

## Common Patterns

### Loading States

```typescript
function Component() {
  const { data, loading, error } = useData();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return <EmptyState />;

  return <DataDisplay data={data} />;
}
```

### Error Handling

```typescript
import { handleError } from '@/utils/errors';

async function riskyOperation() {
  try {
    const result = await apiCall();
    return result;
  } catch (error) {
    handleError(error, {
      context: { component: 'MyComponent' },
      showToast: true
    });
  }
}
```

### Memoization

```typescript
// Memoize expensive computations
const sortedData = useMemo(
  () => data.sort((a, b) => b.date - a.date),
  [data]
);

// Memoize callbacks
const handleClick = useCallback((id: string) => {
  dispatch({ type: 'SELECT', payload: id });
}, [dispatch]);

// Memoize components
const ExpensiveComponent = memo(({ data }) => {
  return <ComplexVisualization data={data} />;
});
```

### Custom Hooks

```typescript
// Create reusable logic
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// Component test example
import { render, screen, fireEvent } from '@testing-library/react';

describe('SearchBar', () => {
  it('should trigger search on submit', () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.submit(input.closest('form'));

    expect(onSearch).toHaveBeenCalledWith('test');
  });
});
```

### Integration Tests

```typescript
// API integration test
describe('Photo API', () => {
  it('should fetch photos', async () => {
    const photos = await apiGetPhotos('/library');
    expect(photos).toHaveLength(10);
    expect(photos[0]).toHaveProperty('path');
  });
});
```

### E2E Tests

```typescript
// Playwright test
import { test, expect } from '@playwright/test';

test('search flow', async ({ page }) => {
  await page.goto('/');
  await page.fill('[role="searchbox"]', 'sunset');
  await page.press('[role="searchbox"]', 'Enter');

  await expect(page.locator('.photo-grid')).toBeVisible();
  await expect(page.locator('.photo-card')).toHaveCount(10);
});
```

---

## Deployment Process

### Development Build

```bash
# Frontend
cd webapp
npm run dev

# API
cd api
python server.py --reload
```

### Production Build

```bash
# Frontend
npm run build
npm run preview  # Test production build

# API
uvicorn server:app --host 0.0.0.0 --port 8000
```

### Electron Build

```bash
cd electron
npm run build:mac    # macOS
npm run build:win    # Windows
npm run build:linux  # Linux
```

### Environment Variables

**Development (.env.development):**
```env
VITE_API_BASE=http://localhost:8000
VITE_LOG_LEVEL=debug
```

**Production (.env.production):**
```env
VITE_API_BASE=https://api.photosearch.com
VITE_LOG_LEVEL=error
```

---

## Breaking Changes

### Version 2.0 → 3.0

1. **Context Restructure:**
```typescript
// Old
const { photos, search } = useAppContext();

// New
const { photos } = usePhotoContext();
const { search } = useSearchContext();
```

2. **API Endpoints:**
```typescript
// Old
GET /photos/search?q=query

// New
POST /api/search
{
  "query": "query",
  "filters": {}
}
```

3. **Component Props:**
```typescript
// Old
<PhotoGrid photos={photos} columns={3} />

// New
<PhotoGrid
  photos={photos}
  layout={{ columns: 3, gap: 16 }}
/>
```

---

## Contributing Guidelines

### Code Quality

1. **Type Safety:**
   - No `any` types
   - Strict null checks
   - Exhaustive switch cases

2. **Performance:**
   - Lazy load heavy components
   - Memoize expensive operations
   - Virtualize long lists

3. **Accessibility:**
   - ARIA labels on interactive elements
   - Keyboard navigation support
   - Screen reader compatibility

### Review Checklist

Before submitting PR:

- [ ] Code follows style guide
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console errors/warnings
- [ ] Performance impact considered
- [ ] Accessibility checked
- [ ] Breaking changes documented

### Getting Help

**Resources:**
- [Developer Guide](./DEVELOPER_GUIDE.md)
- [API Documentation](./API.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

**Communication:**
- GitHub Issues for bugs/features
- Discussions for questions
- Pull Requests for contributions

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Provide constructive feedback
- Focus on what's best for the community
- Show empathy towards others

---

## Advanced Topics

### Performance Optimization

1. **Bundle Splitting:**
```typescript
// Route-based splitting
const LazyRoute = lazy(() => import('./routes/Route'));

// Component-based splitting
const HeavyModal = lazy(() => import('./modals/Heavy'));
```

2. **Web Workers:**
```typescript
// Offload heavy computations
const worker = new Worker('/search.worker.js');
worker.postMessage({ query, photos });
worker.onmessage = (e) => setResults(e.data);
```

3. **Image Optimization:**
```typescript
// Progressive loading
<img
  src={thumbnail}
  loading="lazy"
  decoding="async"
  onLoad={() => loadHighRes()}
/>
```

### Security Considerations

1. **Input Sanitization:**
```typescript
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput);
```

2. **API Security:**
```typescript
// Rate limiting
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
```

3. **Content Security Policy:**
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; img-src *;">
```

---

## Conclusion

This guide provides the foundation for contributing to the Photo Search application. As the project evolves, this document will be updated to reflect new patterns and practices. Always refer to the latest version in the repository.

For questions not covered here, please open a discussion on GitHub or reach out to the maintainers.

Happy coding! 🚀