# Testing Plan (Week 2)

## End-to-End Scenarios (High Priority)
- Onboarding flow: first-run modal -> select demo -> first search returns results < 90s.
- Navigation: sidebar and direct deep links to `#/library`, `#/search?q=dog`, `#/people`, `#/collections`, `#/settings` work and back/forward navigation preserves state.
- Search UX: typing query, suggestions, submit updates URL and results; keyboard shortcuts (? overlay, / focus search, arrows/lightbox).
- Collections: create, open, delete; thumbnails render; persistence across reload.
- Jobs: start indexing, OCR, captions; progress visible; completion updates empty states.
- Sharing: create share token (password + expiry), open share view-only.

## API Integration Tests (Server)
- `/index` indexing behavior and idempotency.
- `/search` with filters: tags, date range, favorites, person(s), EXIF filters, OCR quoted terms, has_text.
- `/search_workspace` aggregation across multiple workspaces.
- `/faces/*`, `/trips/*`, `/captions/build` happy path and error handling.
- `/collections` CRUD, `/saved` load/save, `/tags` set/list.
- `/share` create/load/revoke; password validation; expiry enforcement.

Suggested: Use `pytest` + `httpx` or `requests` (no network calls) with temp dirs and small fixture images.

## Performance Testing (Large Libraries)
- Library sizes: 10k, 50k, 100k photos (synthetic path lists + lightweight metadata).
- Measure: indexing throughput (photos/sec), search P95 latency, memory footprint of index store, fast ANN search speed.
- Scenarios: cold cache vs warm cache; captions/OCR enabled vs disabled; ANN backends (faiss/hnsw/annoy) if available.

## Test Data Fixtures
- `e2e_data/` holds small curated set for happy paths (people, map, ocr, tags, ratings).
- Add synthetic generators for large-scale perf runs (paths only; stub metadata and embeddings where possible).
- Webapp fixtures for unit tests: mock API module and use `msw` or simple hand-rolled mocks.

## Tooling & Execution
- Webapp: Vitest + Testing Library (already configured). Add route-aware tests using `MemoryRouter`.
- API: `pytest` test suite under `photo-search-intent-first/api/tests/` (to be added).
- CI: optional GitHub Actions job to run `npm test` for web and `pytest` for API.

