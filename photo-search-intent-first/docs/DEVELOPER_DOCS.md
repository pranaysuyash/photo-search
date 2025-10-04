# Developer Documentation

## Overview

This document provides comprehensive guidance for developers working on the Photo Search application. It covers the architecture, code structure, development workflow, and contribution guidelines.

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Electron Application                  │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │   React     │    │   Electron  │    │   Python    │   │
│  │  Frontend   │◄──►│    Main      │◄──►│   Backend   │   │
│  │             │    │             │    │             │   │
│  └─────────────┘    └─────────────┘    └─────────────┘   │
│        │                    │                    │       │
│        ▼                    ▼                    ▼       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │    IPC      │    │   IPC       │    │   FastAPI   │   │
│  │             │    │             │    │             │   │
│  └─────────────┘    └─────────────┘    └─────────────┘   │
└─────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │   UI/UX     │    │  Services   │    │     AI      │
    │             │    │             │    │             │
    └─────────────┘    └─────────────┘    └─────────────┘
```

### Component Layers

1. **Presentation Layer**: React UI components and state management
2. **Service Layer**: Electron main process services with business logic
3. **AI Layer**: Python backend with FastAPI for AI processing
4. **Persistence Layer**: SQLite databases and file system storage

## Project Structure

```
photo-search-intent-first/
├── api/
│   ├── database/          # SQLite database schemas and managers
│   ├── managers/          # Business logic managers
│   ├── models/            # Data models and schemas
│   ├── orchestrators/     # Service orchestrators
│   ├── runtime_flags.py    # Runtime configuration
│   ├── scheduler/          # Job scheduling
│   ├── server.py          # FastAPI server entry point
│   └── v1/                # API version 1 endpoints
├── electron/
│   ├── main/              # Electron main process
│   ├── node_modules/      # Node.js dependencies
│   ├── build/            # Build configuration and scripts
│   ├── dist/             # Built distributions
│   ├── main.js           # Electron main entry point
│   ├── preload.js         # Preload script for secure IPC
│   └── package.json      # Electron package configuration
├── infra/                # Infrastructure components
├── webapp/               # React frontend application
│   ├── src/              # Source code
│   ├── public/           # Static assets
│   ├── node_modules/     # Frontend dependencies
│   └── package.json      # Frontend package configuration
├── docs/                 # Documentation
├── scripts/              # Utility scripts
├── tests/                # Test suites
├── requirements.txt       # Python dependencies
├── requirements-dev.txt   # Development dependencies
└── README.md             # Project overview
```

## Development Workflow

### Setting Up Development Environment

#### Prerequisites

1. **Node.js 16+**: Download from [nodejs.org](https://nodejs.org)
2. **Python 3.9+**: Download from [python.org](https://python.org)
3. **Git 2.20+**: Available on most systems
4. **IDE/Editor**: VS Code, IntelliJ IDEA, or preferred editor

#### Installation

```bash
# Clone repository
git clone https://github.com/yourorg/photo-search.git
cd photo-search/photo-search-intent-first

# Install Python dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Install Node.js dependencies for Electron
cd electron
npm install

# Install React frontend dependencies
cd ../webapp
npm install
cd ..
```

#### Environment Configuration

Create a `.env` file in the project root:

```bash
# .env
NODE_ENV=development
ELECTRON_LOG_LEVEL=debug
PYTHON_PATH=/usr/bin/python3
API_PORT=8000
```

### Running the Application

#### Development Mode

```bash
# Terminal 1: Start React development server
cd webapp
npm run dev

# Terminal 2: Start Electron development
cd ../electron
npm run dev

# Or use the full setup script
cd ..
npm run dev:full  # Build UI and prepare models, then start Electron
```

#### Hot Reloading

The development environment supports hot reloading for:
- React components (frontend changes)
- Electron main process (backend changes)
- Python FastAPI server (API changes)

### Code Organization

#### Python Backend

```python
# api/
├── database/          # Database schemas and managers
│   ├── local_db.py    # SQLite database manager
│   ├── manager.py     # Database manager
│   └── daos.py        # Data Access Objects
├── managers/          # Business logic managers
│   ├── ann_manager.py  # Approximate Nearest Neighbor search
│   ├── caption_manager.py  # Image caption generation
│   ├── face_manager.py  # Face detection and recognition
│   ├── ocr_manager.py   # Optical Character Recognition
│   └── search_filter_manager.py  # Search filtering logic
├── orchestrators/     # Service orchestrators
│   └── search_orchestrator.py  # Search coordination
├── models/           # Data models and schemas
│   └── search.py      # Search-related data models
├── v1/               # API version 1
│   └── endpoints/    # API endpoints
├── scheduler/        # Job scheduling
├── runtime_flags.py  # Runtime configuration
└── server.py         # FastAPI server entry point
```

#### Electron Main Process

```javascript
// electron/main/
├── main.js                    // Electron main process entry point
├── preload.js                 // Preload script for secure IPC
├── secure-ipc-handlers.js     // Secured IPC handlers
├── python-service-supervisor.js  // Python service management
├── file-watcher-service.js    // File system monitoring
└── utils/                     // Utility functions
```

#### React Frontend

```javascript
// webapp/src/
├── components/               // React components
│   ├── PhotoGrid/            // Photo grid components
│   ├── Search/               // Search components
│   └── UI/                   // General UI components
├── hooks/                    // Custom React hooks
│   ├── useOfflineFirst.js    // Offline-first hooks
│   ├── useLibraryData.ts     // Library data hooks
│   └── useSearchOperations.ts // Search operation hooks
├── services/                 // Service clients
│   ├── ApiService.js         // API service client
│   └── OfflineService.js      // Offline service client
├── stores/                   // State management
│   ├── index.ts              // Store exports
│   └── useStores.ts          // Custom store hooks
├── models/                   // Data models
├── utils/                    // Utility functions
├── api/                      // API clients
└── App.tsx                   // Main application component
```

## Key Components and APIs

### Offline-First Architecture

#### Cache Manager
```typescript
// webapp/src/hooks/useOfflineFirst.ts
export function useOfflineFirstSearch(
  dir: string | undefined,
  query: string,
  options?: {
    provider?: string;
    topK?: number;
    enabled?: boolean;
    staleTime?: number;
  }
): UseQueryResult<OfflineFirstSearchResult> & { isRefreshing: boolean }
```

#### Virtualized Photo Grid
```typescript
// webapp/src/components/VirtualizedPhotoGrid.tsx
export function VirtualizedPhotoGrid({
  photos,
  onSelectPhoto,
  onPhotoDoubleClick,
  selectedPhotos,
  gridView = 'grid',
  thumbnailSize = 200,
  gap = 8,
  containerWidth = 800,
  containerHeight = 600
}: VirtualizedPhotoGridProps)
```

### Secure IPC Layer
```javascript
// electron/main/secure-ipc-handlers.js
export function isValidPath(filePath, allowedRoots) {
  // Check if path is absolute
  if (!path.isAbsolute(filePath)) {
    return false;
  }
  
  // Check if path is within allowed roots
  for (const root of allowedRoots) {
    if (containsPath(root, filePath)) {
      return true;
    }
  }
  
  return false;
}
```

### Python Service Supervisor
```javascript
// electron/main/python-service-supervisor.js
class PythonServiceSupervisor {
  async start() {
    // Start Python process with proper error handling
  }
  
  async stop() {
    // Gracefully stop Python process
  }
  
  async restart() {
    // Restart with exponential backoff
  }
  
  async performHealthCheck() {
    // Check if service is responding
  }
}
```

### File Watcher Service
```javascript
// electron/main/file-watcher-service.js
class FileWatcherService {
  async startWatching(directoryPath) {
    // Start watching directory for changes
  }
  
  async stopWatching(directoryPath) {
    // Stop watching directory
  }
  
  async reconcileChanges(directoryPath, changes) {
    // Reconcile file system changes with cache
  }
}
```

## Development Guidelines

### Code Style and Conventions

#### Python Code Style

- **PEP 8**: Follow Python Enhancement Proposal 8
- **Type Hints**: Use type hints for all function signatures
- **Docstrings**: Use Google-style docstrings for all public functions
- **Imports**: Use absolute imports when possible, grouped logically

```python
# Good
from typing import List, Dict, Optional
from pathlib import Path

from infra.index_store import IndexStore
from api.models.search import SearchRequest, SearchResult

def process_search_results(
    request: SearchRequest,
    results: List[SearchResult]
) -> Dict[str, any]:
    """Process search results and apply transformations.
    
    Args:
        request: Search request parameters
        results: Raw search results from backend
        
    Returns:
        Dict containing processed results and metadata
        
    Raises:
        ValueError: If request parameters are invalid
    """
    # Implementation
```

#### TypeScript/JavaScript Code Style

- **ESLint**: Use provided ESLint configuration
- **Prettier**: Use provided Prettier configuration
- **TypeScript**: Use strict mode with explicit typing
- **JSDoc**: Document all public functions and classes

```typescript
// Good
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { 
  offlineCapableSearch, 
  offlineCapableGetLibrary,
  offlineCapableGetMetadata 
} from '../api/offline';
import { 
  apiSearch, 
  apiLibrary, 
  apiGetMetadata 
} from '../api';

interface OfflineFirstSearchResult {
  results: any[];
  isCached: boolean;
  cacheHit: boolean;
  searchTimeMs?: number;
}

/**
 * Offline-first search hook
 * Returns cached results immediately, then refreshes with fresh data when available
 */
export function useOfflineFirstSearch(
  dir: string | undefined,
  query: string,
  options: {
    provider?: string;
    topK?: number;
    enabled?: boolean;
    staleTime?: number;
  } = {}
): UseQueryResult<OfflineFirstSearchResult> & { isRefreshing: boolean }
```

#### CSS/Styling
- **Tailwind CSS**: Use Tailwind utility classes
- **Atomic CSS**: Prefer atomic classes over custom CSS
- **Component Scoped**: Use CSS modules for component-specific styles
- **Responsive**: Mobile-first responsive design

### Testing

#### Test Structure
```bash
# Project test structure
tests/
├── api/                    # API tests
├── electron/              # Electron tests
├── webapp/                # Frontend tests
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
└── infra/                # Infrastructure tests
```

#### Unit Tests
```typescript
// webapp/src/__tests__/offline-first.test.ts
import { renderHook, act } from '@testing-library/react-hooks';

describe('useOfflineFirstSearch', () => {
  it('should return cached results immediately', async () => {
    const mockResults = [{ path: '/photo1.jpg', score: 0.95 }];
    offlineCapableSearch.mockResolvedValue(mockResults);
    
    const { result, waitFor } = renderHook(() =>
      useOfflineFirstSearch('/test/dir', 'test query')
    );
    
    // Should initially be loading
    expect(result.current.isLoading).toBe(true);
    
    // Wait for data
    await waitFor(() => !result.current.isLoading);
    
    // Should have cached results
    expect(result.current.data).toEqual({
      results: mockResults,
      isCached: true,
      cacheHit: true
    });
  });
});
```

#### Integration Tests
```javascript
// electron/__tests__/integration.test.js
describe('Electron Main Process Integration', () => {
  test('should initialize all services on app ready', async () => {
    const mockEvent = {};
    const result = await startHandler(mockEvent, '/home/user/photos');
    
    expect(result).toEqual({
      success: true,
      error: null
    });
  });
});
```

#### E2E Tests
```javascript
// webapp/tests/e2e/offline-mode.test.ts
import { test, expect } from '@playwright/test';

test('should work offline with cached data', async ({ page }) => {
  // Go offline
  await page.context().setOffline(true);
  
  // Navigate to app
  await page.goto('/');
  
  // Should still be able to browse photos
  await expect(page.locator('.photo-grid')).toBeVisible();
  await expect(page.locator('.photo-item')).toHaveCount(greaterThan(0));
  
  // Offline UI remains unchanged; indicator intentionally deferred
  await expect(page.locator('.offline-indicator')).toHaveCount(0);
});
```

### Git Workflow

#### Branch Naming
- `feature/feature-name` for new features
- `bugfix/issue-description` for bug fixes
- `hotfix/critical-fix` for urgent fixes
- `release/version` for release preparations

#### Commit Messages
Follow conventional commits:
```
feat: add offline-first photo browsing
fix: resolve cache invalidation issue
docs: update installation instructions
test: add offline mode tests
refactor: improve IPC security
```

#### Pull Request Process
1. Create feature branch from main
2. Make changes with comprehensive tests
3. Update documentation
4. Create pull request with clear description
5. Request review from team members
6. Address feedback and merge

### Performance Optimization

#### Lazy Loading
```typescript
// webapp/src/components/PhotoGrid/LazyPhotoCard.tsx
const LazyPhotoCard = lazy(() => import('./PhotoCard'));

function PhotoGrid() {
  return (
    <Suspense fallback={<PhotoCardSkeleton />}>
      <LazyPhotoCard photo={photo} />
    </Suspense>
  );
}
```

#### Code Splitting
```javascript
// webapp/src/routes/index.tsx
const PhotoLibrary = lazy(() => import('../pages/PhotoLibrary'));
const SearchPage = lazy(() => import('../pages/SearchPage'));

function AppRoutes() {
  return (
    <Routes>
      <Route 
        path="/library" 
        element={
          <Suspense fallback={<PageLoader />}>
            <PhotoLibrary />
          </Suspense>
        } 
      />
      <Route 
        path="/search" 
        element={
          <Suspense fallback={<PageLoader />}>
            <SearchPage />
          </Suspense>
        } 
      />
    </Routes>
  );
}
```

#### Virtualization
```typescript
// webapp/src/components/PhotoGrid/VirtualizedGrid.tsx
import { FixedSizeGrid as Grid } from 'react-window';

export function VirtualizedPhotoGrid({
  photos,
  containerWidth,
  containerHeight
}: VirtualizedPhotoGridProps) {
  const columns = Math.floor(containerWidth / (thumbnailSize + gap));
  const rows = Math.ceil(photos.length / columns);
  
  return (
    <Grid
      columnCount={columns}
      columnWidth={thumbnailSize + gap}
      height={containerHeight}
      rowCount={rows}
      rowHeight={thumbnailSize + gap}
      width={containerWidth}
      itemData={{ photos, columns }}
      overscanRowCount={2}
    >
      {PhotoGridCell}
    </Grid>
  );
}
```

## API Design Principles

### Consistent Error Handling
```python
# api/orchestrators/search_orchestrator.py
class SearchOrchestrator:
    def search(self, request: SearchRequest) -> SearchResponse:
        try:
            # Search logic
            pass
        except ValidationError as e:
            # Return structured error response
            return SearchResponse(
                results=[],
                total_count=0,
                query=request.query,
                filters_applied=[],
                search_time_ms=0.0,
                provider_used=request.provider,
                error=ErrorResponse(
                    code="VALIDATION_ERROR",
                    message=str(e),
                    details=e.errors()
                )
            )
        except Exception as e:
            # Log error and return generic error
            self.logger.error(f"Search failed: {e}")
            return SearchResponse(
                results=[],
                total_count=0,
                query=request.query,
                filters_applied=[],
                search_time_ms=0.0,
                provider_used=request.provider,
                error=ErrorResponse(
                    code="INTERNAL_ERROR",
                    message="An unexpected error occurred",
                    details={"error_type": type(e).__name__}
                )
            )
```

### Type Safety
```typescript
// webapp/src/models/PhotoMeta.ts
export interface PhotoMeta {
  path: string;
  filename: string;
  size_bytes: number;
  width: number;
  height: number;
  mtime: number;
  ctime: number;
  mime_type: string;
  camera?: string;
  iso?: number;
  aperture?: number;
  focal_length?: number;
  exposure_time?: number;
  gps?: {
    lat: number;
    lon: number;
    altitude?: number;
  };
  // ... other metadata fields
}
```

### Security Best Practices

#### Input Validation
```python
# api/v1/endpoints/search.py
@search_router.post("/", response_model=SearchResponse)
async def search_v1(
    request: SearchRequest = Body(...)
) -> SearchResponse:
    # Validate directory
    if not request.dir:
        raise HTTPException(400, "Directory path is required")
    
    folder = Path(request.dir).expanduser().resolve()
    
    # Check if folder exists and is accessible
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    if not folder.is_dir():
        raise HTTPException(400, "Path is not a directory")
    
    try:
        # Test if we can read the directory
        next(folder.iterdir(), None)
    except PermissionError:
        raise HTTPException(403, "Permission denied to access folder")
    except Exception as e:
        raise HTTPException(400, f"Cannot access folder: {str(e)}")
```

#### Secure IPC
```javascript
// electron/main/secure-ipc-handlers.js
function validateOperation(operation) {
  if (!ALLOWED_OPERATIONS.has(operation)) {
    throw new Error(`Unauthorized operation: ${operation}`);
  }
}

function isValidPath(filePath, allowedRoots) {
  // Check if path is absolute
  if (!path.isAbsolute(filePath)) {
    return false;
  }
  
  // Check if path is within allowed roots
  for (const root of allowedRoots) {
    if (containsPath(root, filePath)) {
      return true;
    }
  }
  
  return false;
}
```

## Contributing Guidelines

### Code Review Process

1. **Self-Review**: Authors review their own code before submitting
2. **Peer Review**: At least one other team member reviews changes
3. **Security Review**: Security-sensitive changes require security review
4. **Performance Review**: Performance-critical changes require profiling
5. **Documentation**: All public APIs require documentation updates

### Testing Requirements

1. **Unit Tests**: 80%+ code coverage for new features
2. **Integration Tests**: Test component interactions
3. **E2E Tests**: Test complete user workflows
4. **Performance Tests**: Benchmark performance-critical code
5. **Security Tests**: Test security-sensitive functionality

### Documentation Standards

1. **API Documentation**: All public APIs documented with examples
2. **User Guides**: End-user documentation for new features
3. **Developer Guides**: Internal documentation for complex systems
4. **Architecture Docs**: High-level architecture documentation
5. **Deployment Guides**: Instructions for deployment and maintenance

## Debugging and Profiling

### Debugging Tools

#### Chrome DevTools
```bash
# Enable devtools in development
npm run dev

# Open devtools in Chrome:
# 1. View → Toggle Developer Tools
# 2. Or Cmd+Option+I (macOS) / Ctrl+Shift+I (Windows)
```

#### Python Debugging
```bash
# Run with debugging enabled
python -m debugpy --listen 5678 --wait-for-client \
    -m uvicorn api.server:app --host 127.0.0.1 --port 8000

# Connect with VS Code or PyCharm debugger
```

#### Electron Debugging
```bash
# Start with remote debugging
npm run dev -- --inspect=5858

# Connect Chrome DevTools to http://localhost:5858
```

### Performance Profiling

#### React Profiling
```bash
# Enable React DevTools Profiler
# 1. Install React DevTools browser extension
# 2. Click Profiler tab
# 3. Start recording
# 4. Interact with app
# 5. Stop recording and analyze
```

#### Python Profiling
```python
# Profile Python code
import cProfile
import pstats

# Profile a function
cProfile.run('search_function()', 'search_profile.prof')

# Analyze results
stats = pstats.Stats('search_profile.prof')
stats.sort_stats('cumulative')
stats.print_stats(20)
```

#### Electron Profiling
```bash
# Profile Electron main process
npm run dev -- --inspect-brk=5858

# Attach debugger to profile startup
```

## Release Process

### Versioning Strategy

Follow semantic versioning:
- **MAJOR**: Breaking changes to public APIs
- **MINOR**: New features and enhancements
- **PATCH**: Bug fixes and performance improvements

### Release Checklist

1. **Feature Freeze**: No new features merged
2. **Code Freeze**: No new code merged except critical fixes
3. **Testing**: Full regression testing completed
4. **Documentation**: All documentation updated and reviewed
5. **Security Audit**: Security review completed
6. **Performance Testing**: Performance benchmarks validated
7. **Release Candidate**: RC build created and tested
8. **Final Release**: Production build created and deployed

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: 3.9
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install -r requirements-dev.txt
    - name: Run tests
      run: pytest tests/
  
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    steps:
    - uses: actions/checkout@v2
    - name: Build application
      run: |
        cd electron
        npm ci
        npm run dist
```

## Community and Support

### Getting Help

1. **GitHub Discussions**: https://github.com/yourorg/photo-search/discussions
2. **Stack Overflow**: Tag questions with #photo-search
3. **Slack**: Join our developer community at https://photos.slack.com
4. **Email**: developers@yourcompany.com

### Reporting Issues

1. **Bug Reports**: Use GitHub Issues with reproduction steps
2. **Feature Requests**: Submit to GitHub Discussions
3. **Security Issues**: Email security@yourcompany.com
4. **Performance Issues**: Include profiler output and system specs

### Contributing Code

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Update documentation
5. Submit pull request
6. Address feedback
7. Merge after approval

## Future Roadmap

### Planned Features

1. **Cloud Sync**: Synchronize photos and metadata across devices
2. **Collaboration**: Share photo collections with others
3. **Advanced Search**: Natural language search with complex queries
4. **AI Enhancements**: Improved models for better accuracy
5. **Mobile Apps**: Native iOS and Android applications
6. **Web Interface**: Browser-based interface for remote access

### Technical Improvements

1. **Plugin System**: Allow third-party extensions
2. **Microservices**: Split backend into microservices
3. **Database Migration**: Move to PostgreSQL for large installations
4. **Containerization**: Docker images for easy deployment
5. **Monitoring**: Built-in performance and health monitoring
6. **Internationalization**: Support for multiple languages

## Glossary

### Terms and Definitions

- **ANNOY**: Approximate Nearest Neighbors Oh Yeah - Spotify's ANN library
- **CLIP**: Contrastive Language-Image Pre-training - OpenAI's multimodal model
- **FAISS**: Facebook AI Similarity Search - Meta's similarity search library
- **HNSW**: Hierarchical Navigable Small World - ANN graph-based algorithm
- **IPC**: Inter-Process Communication - Communication between Electron processes
- **OCR**: Optical Character Recognition - Text extraction from images
- **SQLite**: Lightweight SQL database engine
- **Uvicorn**: ASGI server for Python web applications

### Abbreviations

- **API**: Application Programming Interface
- **CLI**: Command Line Interface
- **GPU**: Graphics Processing Unit
- **HTTP**: Hypertext Transfer Protocol
- **IDE**: Integrated Development Environment
- **JSON**: JavaScript Object Notation
- **ML**: Machine Learning
- **SQL**: Structured Query Language
- **SSL**: Secure Sockets Layer
- **TLS**: Transport Layer Security
- **UI**: User Interface
- **UX**: User Experience

## References

### Official Documentation

1. [Electron Documentation](https://www.electronjs.org/docs)
2. [React Documentation](https://reactjs.org/docs/getting-started.html)
3. [FastAPI Documentation](https://fastapi.tiangolo.com/)
4. [SQLite Documentation](https://www.sqlite.org/docs.html)
5. [Node.js Documentation](https://nodejs.org/api/)
6. [Python Documentation](https://docs.python.org/3/)

### Related Projects

1. [CLIP by OpenAI](https://github.com/openai/CLIP)
2. [Sentence Transformers](https://www.sbert.net/)
3. [Transformers](https://huggingface.co/transformers/)
4. [FAISS](https://github.com/facebookresearch/faiss)
5. [Hugging Face](https://huggingface.co/)

### Research Papers

1. [Learning Transferable Visual Models From Natural Language Supervision (CLIP)](https://arxiv.org/abs/2103.00020)
2. [Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks](https://arxiv.org/abs/1908.10084)
3. [Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs](https://arxiv.org/abs/1603.09320)
4. [Fast Approximate Nearest Neighbor Search with the Navigating Spreading-out Graph](https://arxiv.org/abs/1707.00143)

### Industry Standards

1. [OAuth 2.0](https://oauth.net/2/)
2. [JSON Web Tokens](https://jwt.io/)
3. [RESTful API Design](https://restfulapi.net/)
4. [Semantic Versioning](https://semver.org/)
5. [OWASP Top 10](https://owasp.org/www-project-top-ten/)

## Changelog

### Version 2.0.0 (Upcoming)
- ✨ Offline-first architecture
- 🔐 Enhanced security with secure IPC
- 🔄 Service supervision with health monitoring
- 📂 File watching with cache invalidation
- 📦 Codesigning and notarization pipeline
- 🧪 Comprehensive test coverage
- 📚 Complete documentation suite

### Version 1.2.0 (2023-XX-XX)
- 🐞 Bug fixes and performance improvements
- 🔍 Enhanced search capabilities
- 🖼️ Better photo organization tools
- 📱 Mobile-responsive UI
- 🌐 Internationalization support
- 📊 Analytics and usage tracking

### Version 1.1.0 (2023-XX-XX)
- 🤖 Initial AI-powered search capabilities
- 🗂️ Photo library management
- ⭐ Favorites and tagging system
- 🔤 OCR and caption generation
- 👤 Face detection and recognition
- 📈 Basic performance monitoring

### Version 1.0.0 (2023-XX-XX)
- 🎉 Initial release with basic photo browsing
- 🔎 Simple search functionality
- 🖼️ Grid and list view options
- ⬇️ Photo import/export capabilities
- 📁 Folder navigation
- 🛠️ Basic configuration options

## License

MIT License

Copyright (c) 2023 Your Company

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
