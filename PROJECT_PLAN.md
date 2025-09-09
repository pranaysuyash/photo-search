# Photo Search – Parity, UX, and Backlog

This document aligns the two implementations (Classic vs Intent‑First), captures best‑in‑class UX guidance, and lists an actionable backlog to reach and maintain feature parity while allowing intentional differences guided by the Intent‑First methodology.


## Parity Baseline (Must Match in Both)
- Index: Build/update per folder; per‑provider index namespace under `.photo_index/<provider-id>`
- Search: Natural language query; Top‑K; favorites‑only filter; tag filter; optional date range
- Favorites: Toggle and filter; persisted in `.photo_index`
- Tags: Per‑photo tags; filter and inline editor
- Saved searches: List, run, delete, save current
- Thumbnails: Cached thumbnails and /thumb endpoint
- Reveal in OS: Open/reveal file in Finder/Explorer
- Map: EXIF GPS points listing
- Diagnostics: Index counts, OS, free disk
- Analytics/Feedback: Log searches and positive feedback, apply small ranking boosts

References
- Classic API: `archive/photo-search-classic/api/server.py:1`
- Intent‑First API: `photo-search-intent-first/api/server.py:1`
- Classic React app: `archive/photo-search-classic/webapp/src/App.tsx:1`
- Intent‑First React app: `photo-search-intent-first/webapp/src/App.tsx:1`


## Intent‑Driven Differences (Architecture Only)
- Feature parity is the goal. Both apps expose the same capabilities; differences are in structure (layered intent‑first vs straightforward classic) and internal implementation choices.
- When implementation complexity is high in Classic, hide behind optional flags but keep API/UI parity.

Advanced Features (to land in both)
- Fast search engines (Annoy/FAISS/HNSW) + build endpoints and toggles
- OCR build + OCR‑aware search boosting
- Look‑alikes (perceptual hash groups, resolve flow)
- Workspace: manage multiple folders + cross‑folder search
- Diagnostics: show fast‑index availability per provider


## UX Best Practices (Shared Targets)
- Navigation: Tabbed layout for Search, Saved, Map, Diagnostics; slide‑over details drawer for photo info
- Responsiveness: Grid that adapts to screen size; keyboard shortcuts (navigate results, favorite, reveal)
- Feedback: Non‑blocking operations with inline spinners, progress notes, and toasts
- Tag UX: Chip selectors with quick add/remove; autocomplete for existing tags; bulk edit selected
- Selection: Bulk select/clear; export selected; add selected to Favorites or a Collection
- Accessibility: Semantic headings/labels; focus order; keyboard operability; color contrast and visible focus
- Performance: Virtualized grids for large result sets; prefetch thumbnails in idle; debounce search inputs; background thumbnail precache for small libraries
- Empty states: Clear guidance and next actions when no results, no index, or no GPS points
- Copy: Friendly, plain language; explain engine trade‑offs; privacy notes for cloud engines
- Settings: Progressive disclosure; keep advanced options discoverable but unobtrusive


## Backlog (Actionable Tasks)

### A. Parity & Consistency
- API Contract doc for both apps; list shared endpoints and accepted params (checked in) → acceptance: docs in repo, reviewed
- CI parity check script to diff shared endpoints (import both apps, enumerate routes, allowlist intent‑first extras) → acceptance: CI fails on drift
- Ensure React UIs expose the same baseline filters and actions (favorites, tags, saved, date range, CSV export) → acceptance: manual QA parity checklist
- Align default engine labels and provider keys across apps → acceptance: engine dropdowns match terminology

### B. Fast Search, OCR, Look‑alikes (Intent‑First)
- Surface “Use fast index” with Auto/FAISS/HNSW/Annoy; disable when not available → acceptance: diagnostics shows flags; UI respects availability
- OCR build flow with language picker and progress; boost search with OCR text → acceptance: OCR endpoints called; updated counts visible; recall improves on text‑in‑image
- Look‑alikes UI polish: side‑by‑side compare, keep/discard flow, add all to Favorites → acceptance: resolve state persisted; batch actions confirmed

### C. Workspace & Cross‑Folder
- Workspace manager: add/remove folders, validate existence, dedupe → acceptance: persisted list; error states handled
- Cross‑folder search from UI; show path badges; reveal still works → acceptance: results include folder source; filters operate workspace‑wide

### D. Job Progress & Background Work
- Add SSE `/progress` for index/OCR/fast builds; job IDs returned from kick‑off → acceptance: UI shows live progress bars; retry on reconnect
- Background thumbnail precache after small builds (≤500) with throttle → acceptance: cache warms without blocking UI; cap respected

### E. React UI Polish (Both)
- Details drawer: EXIF, actions, larger preview, open in OS → acceptance: keyboard accessible; ESC to close
- Keyboard shortcuts: next/prev, favorite, reveal; hint overlay → acceptance: documented and testable
- Tag chips + autocomplete + bulk edit → acceptance: tag filter round‑trips; bulk applies to all selected
- CSV exports: current results and selected items → acceptance: files download and open in sheets apps

### F. Electron Packaging (Both Desktop Apps)
- Add electron‑builder configs for macOS/Windows; output DMG/EXE → acceptance: local build produces installers
- App icons, name, version; per‑platform branding → acceptance: correct metadata in installers
- Auto‑start backend and health‑check before loading UI; retry logic → acceptance: slow boots don’t show blank windows
- Optional auto‑update (later) → acceptance: update server stub and toggles

### G. Reliability & Providers
- HF API hardening: retries/backoff; fallback models; clear errors in UI → acceptance: simulated failures recover gracefully
- Provider selection helptext and environment variable support; never persist keys → acceptance: keys read from env/session only

### H. Testing
- Expand dummy smoke tests: tags, favorites, saved, date filter → acceptance: tests pass locally and in CI
- Unit tests per layer (intent‑first): adapters, infra, usecases → acceptance: coverage targets for changed code
- API integration tests for parity endpoints in both apps → acceptance: green CI across OS runners

### I. Docs
- Developer runbooks: one‑liners to run API/React/Electron on macOS/Windows; troubleshooting FAQ → acceptance: README sections added
- Privacy & engine guidance: clear copy for local vs cloud; links to provider policies → acceptance: linked from UIs
- Feature parity checklist (this doc + CONTRACT) kept current → acceptance: owners update per release

### J. Performance
- Measure E2E timings: time to first result; index throughput → acceptance: baseline metrics published in docs
- Vector search scaling: evaluate larger CLIP variants and SigLIP; quantization for FAISS → acceptance: findings documented; toggles guarded

### K. Future “Wow” Features (Prioritized)
- People & faces (opt‑in): local detection/embeddings; cluster + naming; filter by person → acceptance: MVP clusters; privacy notes
- Similar‑by‑example: “Find more like this” on a result → acceptance: nearest‑neighbors on click
- Smart collections: rule‑based auto‑albums (e.g., beach in 2021) → acceptance: rule editor; background refresh
- Timeline upgrades: heatmap/histogram; scroll to time ranges → acceptance: smooth interaction on large libs
- Real map tiles + clustering; hover thumb previews → acceptance: performant at 10k points
- Vector DB (optional) for huge libraries; hybrid FAISS/SQLite → acceptance: opt‑in backend with migration path


## Acceptance & Ownership Template
For each task above, track:
- Owner: @
- Target: version/sprint
- Acceptance: measurable criteria defined above
- Status: todo / in‑progress / done


## Notes & Risks
- Keep Classic lean; only uplift if a feature clearly benefits most users without heavy deps.
- For cloud providers, show explicit privacy messaging and never persist keys.
- Performance budgets: avoid regressions in index/search latency; measure before/after.
