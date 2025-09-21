# Photo Search Webapp (Intent‑First)

React + Vite web UI for Photo Search (intent‑first). Route‑driven navigation, lazy‑loaded routes/modals, centralized path helpers, and robust error logging.

## Getting Started

- Dev server: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`
- Unit tests: `npm test`
- Visual tests (Playwright): `npm run test:visual`
- Bundle analysis: `npm run analyze` (summary) or `npm run build:analyze` (with visualizer if configured)

## Key Concepts

- Route‑driven app: Active view derives from URL via `pathToView(pathname)` and `viewToPath(view)` (`src/utils/router.ts`).
- Centralized path helpers: `isSharePath`, `shareTokenFromPath`, `isMobileTestPath` standardize non‑view routes.
- Lazy‑loading: Heavy views and modals are loaded with `React.lazy` + `Suspense` for faster initial loads.
- Unified fallback: `SuspenseFallback` shows a spinner/label while lazy chunks load.
- Manual chunking: Vite splits vendor/UI libs for better caching.

## Lazy Loading & Suspense

- Routes lazy‑loaded: MapView, SmartCollections, TripsView, VideoManager.
- Modals/Drawers lazy‑loaded: AdvancedSearchModal, EnhancedSharingModal, ThemeSettingsModal, JobsDrawer, DiagnosticsDrawer, SearchOverlay.
- Fallback component: `src/components/SuspenseFallback.tsx` (used across routes and modals).

## Error Logging & Sampling

- Use `handleError(error, { showToast, logToConsole, logToServer, context })` (`src/utils/errors.ts`).
- Server logging is env‑gated and sampled:
  - `VITE_LOG_ERRORS_TO_SERVER` (1|0)
  - `VITE_LOG_ERRORS_ENV` (`prod`|`all`)
  - `VITE_ERROR_LOG_SAMPLE` (0..1)
- Image‑load failures sampled via `VITE_IMAGE_ERROR_SAMPLE` (default ~0.02).
- See `.env.example`, `.env.staging`, and `docs/error-logging-and-deeplinks.md`. Helpers live in `src/config/logging.ts`.

## Testing Notes

- Polyfills for jsdom in `src/test/setup.ts` (e.g., `IntersectionObserver`, `ResizeObserver`).
- Suspense tests: see `src/components/SuspenseFallback.test.tsx` and `src/App.routes.suspense.test.tsx` for delayed lazy loading assertions.
- Route rendering tests mock heavy components; use `findBy*` queries to await lazy renders.

## Visual Testing

The application includes comprehensive visual testing with Playwright:

### Quick Start
```bash
# Run all visual tests
npm run test:visual

# Run specific browser
npx playwright test --project=chromium

# Update screenshot baselines
npx playwright test --update-snapshots

# View HTML report
npx playwright show-report
```

### Test Coverage (80+ tests)
- **Responsive Design**: Desktop, tablet, mobile layouts
- **Performance Benchmarks**: Load times, memory usage, search performance
- **Accessibility**: WCAG 2.1 compliance, screen reader navigation
- **Error States**: Network errors, file system issues, user input errors
- **Component States**: Modal systems, status indicators, empty states
- **Mobile Features**: PWA functionality, touch interactions

### Key Features
- **Cross-Browser**: Chromium, Firefox, WebKit, Mobile Chrome/Safari
- **Performance Monitoring**: Real-time metrics and threshold validation
- **Accessibility Compliance**: Comprehensive WCAG and ARIA testing
- **Error Resilience**: Robust error handling and recovery testing
- **Enhanced Utilities**: Stable helpers for reliable test execution

### Documentation
- [Visual Testing Guide](./VISUAL_TESTING_GUIDE.md) - Complete testing documentation
- [Visual Testing Analysis](./VISUAL_TESTING_ANALYSIS_REPORT.md) - Test coverage and findings
- [Coverage Analysis](./tests/visual/coverage-analysis.md) - Gap analysis and enhancements

## Documentation

- Developer Guide (lazy‑loading, SuspenseFallback, chunking, testing): `docs/DEVELOPER_GUIDE.md`
- Error logging + deep‑links: `docs/error-logging-and-deeplinks.md`
