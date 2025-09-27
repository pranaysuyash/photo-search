# Developer Guide - Photo Search Application

## Table of Contents
1. [Error Logging](#error-logging)
2. [Deep-Linking](#deep-linking)
3. [Context Patterns](#context-patterns)
4. [Architectural Patterns](#architectural-patterns)
5. [Testing Strategies](#testing-strategies)
6. [Performance Optimization](#performance-optimization)

---

## Error Logging

### Overview
The application uses a comprehensive error handling system with categorized errors, user-friendly messages, and optional server-side logging.

### Error Types
```typescript
enum ErrorType {
  NETWORK = "NETWORK",       // Network connectivity issues
  VALIDATION = "VALIDATION",  // Input validation failures
  PERMISSION = "PERMISSION",  // Authorization failures
  NOT_FOUND = "NOT_FOUND",   // Resource not found
  TIMEOUT = "TIMEOUT",       // Operation timeouts
  RATE_LIMIT = "RATE_LIMIT", // API rate limiting
  SERVER = "SERVER",         // Server-side errors
  UNKNOWN = "UNKNOWN"        // Unclassified errors
}
```

### Basic Error Handling

#### Simple Error Handling
```typescript
import { handleError } from '@/utils/errors';

try {
  await riskyOperation();
} catch (error) {
  handleError(error, {
    showToast: true,
    logToConsole: true,
    context: {
      component: 'SearchBar',
      action: 'performSearch'
    }
  });
}
```

#### Creating Custom Errors
```typescript
import { createAppError, ErrorType } from '@/utils/errors';

throw createAppError(
  'Search results exceeded limit',
  ErrorType.VALIDATION,
  {
    userMessage: 'Too many results. Please refine your search.',
    recoverable: true,
    details: { resultCount: 10000 }
  }
);
```

### Advanced Error Patterns

#### Server-Side Error Logging
```typescript
import { logServerError } from '@/utils/errors';

// Manual server logging with context
await logServerError(error, {
  component: 'PhotoGrid',
  action: 'loadPhotos',
  dir: currentLibraryDir,
  metadata: {
    page: currentPage,
    filters: activeFilters
  }
});
```

#### Async Operations with Error Handling
```typescript
import { withErrorHandling } from '@/utils/errors';

const result = await withErrorHandling(
  async () => await fetchPhotos(query),
  {
    showToast: true,
    retryable: true,
    fallbackMessage: 'Failed to load photos'
  }
);
```

#### Retry Logic for Failed Operations
```typescript
import { retryOperation } from '@/utils/errors';

const data = await retryOperation(
  () => apiCall(),
  3,    // max retries
  1000, // initial delay (ms)
  1.5   // backoff multiplier
);
```

### Error Boundaries

#### Component-Level Error Boundaries
```typescript
import { withErrorBoundary } from '@/utils/errors';

const SafeComponent = withErrorBoundary(
  MyComponent,
  CustomErrorFallback // optional custom fallback
);
```

#### Custom Error Fallback
```typescript
const CustomErrorFallback: React.FC<{
  error: Error;
  reset: () => void;
}> = ({ error, reset }) => (
  <div className="error-container">
    <h2>Oops! Something went wrong</h2>
    <p>{getUserErrorMessage(error)}</p>
    <button onClick={reset}>Try Again</button>
  </div>
);
```

### Toast Notifications

#### Showing Toast Messages
```typescript
import { showToast } from '@/utils/errors';

// Success toast
showToast({
  message: 'Photos uploaded successfully',
  type: 'success',
  duration: 3000
});

// Error toast with action
showToast({
  message: 'Upload failed',
  type: 'error',
  actionLabel: 'Retry',
  onAction: () => retryUpload()
});
```

### Network Error Handling

#### Offline Detection
```typescript
import { networkErrors } from '@/utils/errors';

if (networkErrors.isOffline()) {
  // Handle offline state
  showOfflineUI();
}

// Or use the handler
networkErrors.handleOffline(() => {
  // Callback when offline
  pauseBackgroundSync();
});
```

#### Request Timeouts
```typescript
const signal = networkErrors.createTimeout(5000); // 5 second timeout

fetch(url, { signal })
  .catch(error => {
    if (error.name === 'AbortError') {
      handleError(error, {
        context: { action: 'fetchTimeout' }
      });
    }
  });
```

---

## Deep-Linking

### Overview
The application supports deep-linking for sharing specific views, searches, and photo collections across different contexts (web, Electron).

### URL Structure

#### Basic Search Links
```
/search?q=sunset
/search?q=beach&filter=recent&sort=date
```

#### Collection Links
```
/collections/favorites
/collections/shared/abc123
/collections/smart/recent-uploads
```

#### Photo Detail Links
```
/photo/12345
/photo/12345?from=search&q=sunset
```

#### Face Clusters
```
/people/cluster-123
/people/search?name=John
```

### Implementation

#### Setting Up Routes
```typescript
// In App.tsx or router configuration
import { Routes, Route } from 'react-router-dom';

<Routes>
  <Route path="/search" element={<SearchView />} />
  <Route path="/collections/:id" element={<CollectionView />} />
  <Route path="/photo/:id" element={<PhotoDetail />} />
  <Route path="/people/:clusterId" element={<FaceClusterView />} />
</Routes>
```

#### Reading URL Parameters
```typescript
import { useSearchParams, useParams } from 'react-router-dom';

function SearchView() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  const filter = searchParams.get('filter');

  useEffect(() => {
    if (query) {
      performSearch(query, { filter });
    }
  }, [query, filter]);
}
```

#### Programmatic Navigation
```typescript
import { useNavigate } from 'react-router-dom';

function SearchBar() {
  const navigate = useNavigate();

  const handleSearch = (query: string) => {
    // Update URL with search
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const openPhoto = (photoId: string, context?: string) => {
    const params = new URLSearchParams();
    if (context) params.set('from', context);
    navigate(`/photo/${photoId}?${params}`);
  };
}
```

### Sharing Links

#### Generate Shareable Links
```typescript
function generateShareLink(type: string, id: string, params?: Record<string, string>) {
  const baseUrl = window.location.origin;
  const path = `/${type}/${id}`;
  const searchParams = new URLSearchParams(params);

  return `${baseUrl}${path}${searchParams.toString() ? '?' + searchParams : ''}`;
}

// Usage
const shareUrl = generateShareLink('photo', photoId, {
  collection: collectionId,
  index: photoIndex.toString()
});
```

#### Copy to Clipboard
```typescript
async function copyShareLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    showToast({
      message: 'Link copied to clipboard',
      type: 'success'
    });
  } catch (error) {
    handleError(error, {
      fallbackMessage: 'Failed to copy link'
    });
  }
}
```

### Electron Deep-Linking

#### Register Protocol Handler
```javascript
// In electron/main.js
app.setAsDefaultProtocolClient('photo-search');

app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

function handleDeepLink(url) {
  const parsed = new URL(url);
  mainWindow.webContents.send('deep-link', {
    path: parsed.pathname,
    params: Object.fromEntries(parsed.searchParams)
  });
}
```

#### Handle in Renderer
```typescript
// In React app
useEffect(() => {
  const handleDeepLink = (event, { path, params }) => {
    navigate(path + '?' + new URLSearchParams(params));
  };

  if (window.electron) {
    window.electron.on('deep-link', handleDeepLink);
    return () => window.electron.off('deep-link', handleDeepLink);
  }
}, []);
```

---

## Context Patterns

### Overview
The application uses React Context for state management, following a provider-based architecture with custom hooks for consumption.

### Core Contexts

#### 1. SearchContext
Manages search state, results, and search operations.

```typescript
// contexts/SearchContext.tsx
interface SearchContextValue {
  // State
  searchText: string;
  results: Photo[];
  isSearching: boolean;
  filters: SearchFilters;

  // Actions
  performSearch: (query: string) => Promise<void>;
  clearSearch: () => void;
  applyFilter: (filter: Partial<SearchFilters>) => void;

  // Helpers
  hasResults: boolean;
  resultCount: number;
}
```

#### 2. LibraryContext
Manages photo library, indexing, and folder operations.

```typescript
interface LibraryContextValue {
  // State
  currentDir: string;
  indexStatus: IndexStatus;
  stats: LibraryStats;

  // Actions
  selectFolder: (path: string) => Promise<void>;
  startIndexing: () => Promise<void>;
  pauseIndexing: () => void;

  // Computed
  isIndexing: boolean;
  progress: number;
}
```

#### 3. UIContext
Manages UI state, preferences, and layout.

```typescript
interface UIContextValue {
  // State
  isMobile: boolean;
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'auto';
  viewMode: 'grid' | 'list' | 'timeline';

  // Actions
  toggleSidebar: () => void;
  setViewMode: (mode: ViewMode) => void;
  setTheme: (theme: Theme) => void;
}
```

### Creating Contexts

#### Basic Context Setup
```typescript
import { createContext, useContext, useState, ReactNode } from 'react';

// 1. Define the context shape
interface MyContextValue {
  data: string;
  updateData: (value: string) => void;
}

// 2. Create context with undefined default
const MyContext = createContext<MyContextValue | undefined>(undefined);

// 3. Create provider component
export function MyProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState('');

  const value: MyContextValue = {
    data,
    updateData: setData
  };

  return (
    <MyContext.Provider value={value}>
      {children}
    </MyContext.Provider>
  );
}

// 4. Create custom hook with error checking
export function useMyContext() {
  const context = useContext(MyContext);
  if (!context) {
    throw new Error('useMyContext must be used within MyProvider');
  }
  return context;
}
```

#### Advanced Context with Reducer
```typescript
import { useReducer } from 'react';

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DATA'; payload: Photo[] }
  | { type: 'ADD_PHOTO'; payload: Photo };

interface State {
  loading: boolean;
  photos: Photo[];
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_DATA':
      return { ...state, photos: action.payload, loading: false };
    case 'ADD_PHOTO':
      return { ...state, photos: [...state.photos, action.payload] };
    default:
      return state;
  }
}

export function PhotoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    loading: false,
    photos: []
  });

  const loadPhotos = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const photos = await fetchPhotos();
    dispatch({ type: 'SET_DATA', payload: photos });
  };

  return (
    <PhotoContext.Provider value={{ ...state, loadPhotos, dispatch }}>
      {children}
    </PhotoContext.Provider>
  );
}
```

### Context Composition

#### Combining Multiple Providers
```typescript
// RootProviders.tsx
export function RootProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <LibraryProvider>
          <SearchProvider>
            <UIProvider>
              <ModalProvider>
                {children}
              </ModalProvider>
            </UIProvider>
          </SearchProvider>
        </LibraryProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}

// Usage in App.tsx
function App() {
  return (
    <RootProviders>
      <Router>
        <MainApplication />
      </Router>
    </RootProviders>
  );
}
```

#### Context Dependencies
```typescript
// SearchProvider depends on LibraryContext
export function SearchProvider({ children }: { children: ReactNode }) {
  const { currentDir } = useLibraryContext(); // Uses library context
  const [results, setResults] = useState<Photo[]>([]);

  const performSearch = async (query: string) => {
    if (!currentDir) {
      throw new Error('No library selected');
    }
    const searchResults = await searchPhotos(currentDir, query);
    setResults(searchResults);
  };

  return (
    <SearchContext.Provider value={{ results, performSearch }}>
      {children}
    </SearchContext.Provider>
  );
}
```

### Performance Optimization

#### Memoizing Context Values
```typescript
import { useMemo, useCallback } from 'react';

export function OptimizedProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState);

  // Memoize callbacks to prevent recreating on every render
  const updateState = useCallback((newState: State) => {
    setState(prev => ({ ...prev, ...newState }));
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    ...state,
    updateState
  }), [state, updateState]);

  return (
    <MyContext.Provider value={value}>
      {children}
    </MyContext.Provider>
  );
}
```

#### Splitting Contexts
```typescript
// Instead of one large context, split into focused contexts
// Bad: Single monolithic context
const AppContext = { user, photos, settings, ui, ... };

// Good: Multiple focused contexts
const UserContext = { user, login, logout };
const PhotoContext = { photos, loadPhotos, deletePhoto };
const SettingsContext = { settings, updateSettings };
const UIContext = { theme, layout, toggleSidebar };
```

### Testing Contexts

#### Test Provider Wrapper
```typescript
// test-utils.tsx
import { ReactNode } from 'react';
import { render } from '@testing-library/react';

export function renderWithProviders(
  ui: ReactNode,
  { initialState = {}, ...options } = {}
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SearchProvider initialState={initialState.search}>
        <UIProvider initialState={initialState.ui}>
          {children}
        </UIProvider>
      </SearchProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
```

#### Testing Context Consumers
```typescript
import { renderWithProviders } from './test-utils';
import { screen, fireEvent } from '@testing-library/react';

test('search updates results', async () => {
  const { getByRole } = renderWithProviders(<SearchBar />);

  const input = getByRole('searchbox');
  fireEvent.change(input, { target: { value: 'sunset' } });
  fireEvent.submit(input.closest('form'));

  await screen.findByText(/Found \d+ results/);
});
```

### Best Practices

1. **Keep Contexts Focused**: Each context should have a single responsibility
2. **Use Custom Hooks**: Always provide custom hooks for consuming contexts
3. **Memoize Values**: Use useMemo for context values to prevent unnecessary re-renders
4. **Handle Loading States**: Include loading/error states in context
5. **Type Safety**: Use TypeScript for full type safety
6. **Error Boundaries**: Wrap providers in error boundaries
7. **Lazy Initialization**: Use lazy initial state for expensive computations

---

## Architectural Patterns

### Component Structure
```
src/
├── components/          # Presentational components
│   ├── common/         # Reusable UI components
│   ├── modals/         # Modal components
│   └── layouts/        # Layout components
├── contexts/           # React contexts and providers
├── hooks/              # Custom React hooks
├── services/           # Business logic and API calls
├── stores/             # State management (Zustand)
├── utils/              # Utility functions
└── types/              # TypeScript type definitions
```

### Data Flow
1. **User Action** → Component
2. **Component** → Context/Store Action
3. **Action** → Service/API Call
4. **Service** → Backend/Storage
5. **Response** → State Update
6. **State** → Component Re-render

---

## Testing Strategies

### Unit Testing
```typescript
// Component testing with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';

test('SearchBar performs search on submit', async () => {
  const onSearch = jest.fn();
  render(<SearchBar onSearch={onSearch} />);

  const input = screen.getByRole('searchbox');
  fireEvent.change(input, { target: { value: 'test' } });
  fireEvent.submit(input.closest('form'));

  expect(onSearch).toHaveBeenCalledWith('test');
});
```

### Integration Testing
```typescript
// Testing with providers and API mocks
import { renderWithProviders } from './test-utils';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('full search flow', async () => {
  renderWithProviders(<App />);

  // Perform search
  const searchInput = screen.getByRole('searchbox');
  fireEvent.change(searchInput, { target: { value: 'sunset' } });
  fireEvent.submit(searchInput.closest('form'));

  // Wait for results
  await screen.findByText(/10 results found/);

  // Verify photo grid
  const photos = screen.getAllByRole('img');
  expect(photos).toHaveLength(10);
});
```

---

## Performance Optimization

### Code Splitting
```typescript
// Lazy load heavy components
const ImageEditor = lazy(() => import('./modules/ImageEditor'));
const FaceDetection = lazy(() => import('./modules/FaceDetection'));

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <ImageEditor photo={selectedPhoto} />
</Suspense>
```

### Virtualization
```typescript
// Use react-window for large lists
import { FixedSizeGrid } from 'react-window';

<FixedSizeGrid
  columnCount={columns}
  rowCount={Math.ceil(photos.length / columns)}
  width={width}
  height={height}
  itemSize={200}
>
  {PhotoCell}
</FixedSizeGrid>
```

### Memoization
```typescript
// Memoize expensive computations
const sortedPhotos = useMemo(
  () => photos.sort((a, b) => b.date - a.date),
  [photos]
);

// Memoize components
const PhotoCard = memo(({ photo }) => {
  return <div>{photo.name}</div>;
});
```

### Image Optimization
```typescript
// Progressive image loading
function LazyImage({ src, placeholder }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && <img src={placeholder} />}
      <img
        src={src}
        onLoad={() => setLoaded(true)}
        style={{ display: loaded ? 'block' : 'none' }}
      />
    </>
  );
}
```

---

## Conclusion

This guide covers the essential patterns and practices for developing the Photo Search application. For specific implementation details, refer to the source code and inline documentation. Always prioritize code quality, user experience, and maintainability when implementing new features.
## Lazy Loading, Suspense, and Manual Chunking

This codebase uses route-driven lazy-loading and code-splitting to keep initial loads fast and improve long‑term caching.

Why
- Heavy or rarely used views and modals do not need to ship in the first paint.
- Chunking stable dependencies (vendor/UI libs) improves browser caching across releases.

Patterns
- Routes: Use `React.lazy` for infrequently used views like Map, Smart, Trips, and Videos.
- Modals/Drawers: Lazy‑load AdvancedSearch, EnhancedSharing, ThemeSettings, Jobs, Diagnostics, and SearchOverlay.
- Suspense: Wrap the lazy region with a unified fallback for consistent UX.

Example: Route lazy‑loading with fallback
```tsx
// App.tsx
import { lazy, Suspense } from 'react';
import { SuspenseFallback } from './components/SuspenseFallback';

const MapView = lazy(() => import('./components/MapView'));
// ... other lazy routes

<Suspense fallback={<SuspenseFallback label="Loading…" /> }>
  <Routes>
    <Route path="/map" element={<MapView />} />
    {/* ... */}
  </Routes>
  </Suspense>
```

Example: Modal lazy‑loading with fallback
```tsx
// ModalManager.tsx
const AdvancedSearchModal = lazy(() => import('./modals/AdvancedSearchModal'));

{modalState.advanced && (
  <Suspense fallback={<SuspenseFallback label="Loading advanced search…" /> }>
    <AdvancedSearchModal /* ...props */ />
  </Suspense>
)}
```

Unified Suspense Fallback
- Reusable spinner + label for all lazy regions.
- File: `src/components/SuspenseFallback.tsx` (`data-testid="suspense-fallback"`).

Manual Chunking (Vite)
- Configured in `vite.config.ts`:
```ts
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
```
- This creates stable vendor/UI chunks for better browser caching.

Testing Lazy Components
- Use an async `vi.mock` to intentionally delay a lazy import, assert the fallback appears, then assert the loaded component.
```tsx
// Example
vi.mock('./components/MapView', async () => {
  await new Promise(r => setTimeout(r, 50));
  return { default: () => <div data-testid="route-map">Map</div> };
});

window.history.pushState({}, '', '/map');
render(<App />);
expect(screen.getByTestId('suspense-fallback')).toBeInTheDocument();
expect(await screen.findByTestId('route-map')).toBeInTheDocument();
expect(screen.queryByTestId('suspense-fallback')).toBeNull();
```

Bundle Analysis
- Run `npm run analyze` to build and print a summary of chunk sizes.
- Optional: install `rollup-plugin-visualizer` for a treemap report and add it to Vite if deeper insights are needed.
