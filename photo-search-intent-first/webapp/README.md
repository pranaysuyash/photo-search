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
- See `.env.example` and `docs/error-logging-and-deeplinks.md`.

## Testing Notes

- Polyfills for jsdom in `src/test/setup.ts` (e.g., `IntersectionObserver`, `ResizeObserver`).
- Suspense tests: see `src/components/SuspenseFallback.test.tsx` and `src/App.routes.suspense.test.tsx` for delayed lazy loading assertions.
- Route rendering tests mock heavy components; use `findBy*` queries to await lazy renders.

## Documentation

- Developer Guide (lazy‑loading, SuspenseFallback, chunking, testing): `docs/DEVELOPER_GUIDE.md`
- Error logging + deep‑links: `docs/error-logging-and-deeplinks.md`
