# Photo Search – Comprehensive TODO (Local‑Only)

This is the canonical backlog. It consolidates everything shared so far into a local‑only plan (no cloud features). The in‑app Tasks view renders this file.

Legend: [x] done • [>] in progress • [ ] planned • (opt) optional

## Top Priorities (Now)
- [x] Index progress UI (determinate + ETA + tooltip)
- [>] Long‑ops progress UI parity for OCR/Metadata/Fast (determinate where available + notes)
- [x] Index chip: show indexed count + coverage inline under count (use diagnostics + library totals)
- [x] Index chip hover: multi‑line card (processed N/D • indexed X • target T • coverage P% • drift D • ETA • last index time)
- [x] Humanized ETA in tooltip (e.g., 2m 30s) + show rate (items/s)
- [ ] OCR pill hover: show OCR text count and CTA to build/update OCR when not ready
- [ ] One‑click “Extract text (OCR)” from OCR hover (calls /ocr/build and updates status)
- [x] OCR pill hover: show OCR text count and CTA to build/update OCR when not ready
- [x] One‑click “Extract text (OCR)” from OCR hover (calls /ocr/build and updates status)
- [ ] Quick video filters: preset dropdown (e.g., Videos > 30s, slow‑mo, timelapse)
- [x] Safe delete to OS trash + Undo (session)
- [x] Move to collection (add/remove)
- [x] Ratings (⭐1–5) + rating filters
- [x] Keyboard shortcut help overlay (cheat sheet)
- [x] Timeline view (date clusters + quick scrubbing)
 - [>] API/Client contract alignment (JSON body for POST endpoints)

## Recently Delivered
- [x] Modern UI shell + sidebar + multi‑views (Library/Results/People/Map/Collections/Smart/Trips/Saved/Memories/Tasks)
- [x] Semantic search + EXIF/date filters (local engines)
- [x] Suggestions (People/Tags/Cameras/Places)
- [x] Saved searches (save/run/delete)
- [x] Similar & Similar+Text (weight slider)
- [x] Justified grid + virtualization + keyboard nav
- [x] Library infinite scroll
- [x] Lightbox zoom/pan, EXIF/info panel, “More like this”
- [x] Export + bulk tag modals
- [x] Dark mode toggle (persisted)
- [x] Busy indicator in top bar
- [x] Tasks view (renders this file)

## Search & Discovery
- [x] Text/semantic search (content/OCR/captions toggles)
- [x] People filtering (named clusters, multi‑select)
- [x] Date range (From/To)
- [x] Search history (recent)
- [ ] Boolean operators (AND/OR/NOT)
- [ ] Color‑based search (dominant colors)
- [ ] Fuzzy search (typo tolerance)
- [ ] Search within results (refine)
- [ ] Related searches (local suggestions)

## Filters & Organization
- [x] Camera / ISO / f‑number / place / favorites
- [x] Tag filtering (comma list)
- [ ] Smart filters: aspect ratio, orientation, dominant color
- [ ] Filter presets (save/apply)
- [ ] Negative filters (exclude tags/people)
- [ ] Geofencing (lat/lon box) — local only

## Grid & Views
- [x] Justified rows + virtualization
 - [x] Grid overlay info (toggle: filename + score + EXIF chips)
- [ ] Grid micro-animations
- [ ] Mosaic/Woven variants (opt)
- [ ] Timeline view with auto clustering by date
  - [x] Basic timeline view added (group by day, lazy EXIF load)

## Lightbox
- [x] Zoom/pan + double‑click zoom
- [x] EXIF/info panel (apiMetadataDetail)
- [x] Favorite, reveal, similar
- [ ] Zoom cursor + pan bounds polish
- [ ] Slideshow mode (auto‑advance)
- [ ] Compare view (A/B split)
- [ ] Rotate in viewer (non‑destructive)

## Bulk Actions
- [x] Export, Tag
- [x] Similar / Similar+Text on selection
- [ ] Delete to OS trash + Undo
- [ ] Move to collection
- [ ] Bulk rename (patterns)
- [ ] Bulk rotate
- [ ] Bulk rating

## People & Faces (Local)
- [x] Build faces; list clusters; name clusters
- [x] Filter by people (single/multi)
- [ ] Pet grouping (local)
- [ ] Attribute filters (group vs individual)

## Trips & Memories
- [x] Build trips; list trips; open trip results
- [x] Memories view (favorites + trips)
- [ ] Auto‑events (time+geo clustering, titles)
- [ ] Year/Month timelines; “one year ago” surfacing

## Editing & Enhancement (Non‑destructive)
- [x] Rotate/flip/crop (non‑destructive, derived outputs)
- [ ] Basic adjustments (exposure/contrast/temperature)
- [ ] Sidecars for edits, reset to original
- [x] Upscale 2×/4× (engine pluggable; PIL available)
- [ ] Denoise/deblur presets
- [ ] Background removal (Rembg) + PNG export

## AI Tagging (Local‑Only)
- [ ] Auto‑tagging (broad concepts) with accept/reject UI
- [ ] Culling metrics: sharpness/brightness; filters (sharp only, exclude under/over)

## Maps & Place
- [x] Map view with points
- [ ] Tile provider + clustering; hover preview (local‑first)
- [ ] Reverse geocoding (offline) → place chips

## Performance & Tech
- [x] Virtualized results
- [x] Fast index engines (Annoy/FAISS/HNSW)
- [ ] Progressive image loading tiers (thumb/med/full)
- [ ] Cache controls (limits, clear)

## Navigation & Routing
- [x] HashRouter deep links (#/library, #/search, #/people, #/collections, #/settings)
- [x] URL state for search query (`q`) with back/forward integration
- [>] Encode filters in URL (tags, favOnly, dates, people, place)
- [ ] Route-aware view components (post-App.tsx refactor)
- [ ] Deep link to people/collections detail (ids in URL; open view)

## API/Client Contract Alignment Checklist
- [x] /index (already JSON model)
- [x] /search
- [x] /search_workspace
- [x] /captions/build
- [x] /faces/build
- [x] /faces/name
- [x] /trips/build
- [x] /search_like
- [x] /search_like_plus
- [x] /ocr/build
- [x] /ocr/snippets
- [x] /fast/build
- [x] /favorites (POST)
- [x] /tags (POST)
- [x] /saved (POST)
- [x] /saved/delete
- [x] /collections
- [x] /collections/delete
- [x] /smart_collections
- [x] /smart_collections/delete
- [x] /smart_collections/resolve
- [x] /feedback
- [x] /analytics/log
- [x] /lookalikes/resolve
- [x] /open
- [x] /edit/ops
- [x] /edit/upscale
- [x] /export
- [x] /share
- [x] /share/revoke
- [x] /workspace/add
- [x] /workspace/remove
- [x] /metadata/build
- [x] /autotag
- [x] /delete
- [x] /undo_delete

## Sharing & Export
- [x] Share link creation (expiry/password/view‑only)
- [x] Share list + revoke
- [x] Email share via mailto (prefill subject/body)
- [x] Social share intents (open platform share URLs)
- [x] Minimal share viewer (server HTML + React route)
- [ ] Share viewer: paging for large sets
- [ ] Share viewer: optional download/open on non‑view‑only
- [ ] Share viewer: responsive grid + captions
- [ ] Analytics: log share_created/share_open/share_revoked

## Onboarding & Help
- [x] First‑run modal with Quick Start, Custom, Demo
- [x] “Start Tour” opens Help → Getting Started
- [x] “?” shortcuts overlay available from Help
- [ ] Step‑by‑step guided tour overlays (progressive onboarding)
- [ ] Track TTFV metric (first successful search)

## Empty States (Intent‑First)
- [x] No directory: Select Folder, Demo, Start Tour, Help, sample queries
- [x] No photos: helpful copy + Help
- [x] No results: suggestions + Filters/Advanced/Clear filters + sample queries + Help
- [ ] Personalize sample queries from library (tags, cameras, places)

## Filters & Quick Actions
- [x] Filters panel: Clear all filters
- [x] Top bar: Clear filter tokens chip (query cleanup)
- [ ] Show active filters count/badge near Filters
- [ ] Encode filters in URL (tags/fav/dates/people/place) for deep‑links

## UX & Accessibility
- [x] Keyboard navigation (arrows/Home/End/PageUp/PageDown; A/C/Space/F/Enter; “/” focus)
- [ ] Shortcut overlay (cheat sheet)
- [ ] Focus trapping in modals; improved tab order
- [ ] High‑contrast mode; larger text presets
- [ ] Link Intent User Flows doc (INTENT_USER_FLOWS.md) from Tasks view and/or Sidebar

## Settings & Config (Local)
- [x] Folder selection; engine config
- [x] Index management (build/fast/ocr/metadata)
- [ ] Preferences export/import (JSON)
- [ ] Theme: dark/light/system (+ persisted)

## Packaging (Local)
- [ ] Electron packaging for macOS/Windows (classic + intent)
- [ ] Release artifacts via CI with checksums

## Optional/Deprioritized (Cloud/3rd‑party)
- (opt) Social/email sharing; link sharing
- (opt) Cloud backup/sync; cloud imports
- (opt) Printing integrations, galleries, billing

---

## Milestones & Sprints

### Sprint A (active)
- [>] Long‑ops progress UI (indeterminate + notes)
- [ ] Safe delete + Undo
- [ ] Move to collection
- [x] Shortcut help overlay

### Sprint B (next)
- [x] Ratings + filters
- [ ] Timeline view (date clusters)
 - [x] Grid overlay info toggle
- [ ] Progressive image loading tiers

### Sprint C (later)
- [ ] Reverse geocoding + place chips
- [ ] Culling metrics + filters
- [ ] Non‑destructive edits (crop/rotate + basic)

---

## Acceptance Criteria (selected)
- Safe delete: items go to OS trash; toast with Undo 10s; undo restores selection
- Move to collection: modal picker + create new; feedback; idempotent
- Long ops UI: overlay/progress while APIs run; cancel if supported; notes update
- Timeline: groups by day/week/month with headers; jump via mini‑scrubber

## Notes
- Private by default; on‑device first. Cloud items are optional and off by default.
- Maintain graceful fallbacks and clear user control for heavy features.

---

## New Tasks (Intent‑First, No Regression)

- [ ] OCR/Metadata/Fast Progress Parity
  - Acceptance: Determinate progress/ETA in JobsCenter for OCR/Metadata/Fast; analytics notes stream while running.
- [ ] Index Chip Polish (Coverage + Drift)
  - Acceptance: Chip shows “Indexed N (P%)”; hover card lists processed/target/indexed/coverage/drift/ETA/last index time.
- [ ] OCR UX Improvements
  - Acceptance: OCR pill hover lists built text count; “Extract text (OCR)” CTA updates count without reload.
- [ ] Video Quick Filters
  - Acceptance: Presets (>30s, slow‑mo, timelapse) narrow results instantly on 5k library.
- [ ] Map Clustering + Hover Preview
  - Acceptance: 5k+ GPS points cluster smoothly; hover shows 128px thumb; offline works.
- [ ] Share Viewer Paging + Download (non‑view‑only)
  - Acceptance: Large shares page correctly; optional download when permitted; share_open logged.
- [ ] URL State Completeness
  - Acceptance: Tags/favorites/dates/people/place fully round‑trip via URL across views.
- [ ] Preferences Export/Import (JSON)
  - Acceptance: Export non‑sensitive settings/theme; import preview + merge; tokens never exported.
- [ ] Progressive Image Loading Tiers
  - Acceptance: Lazy thumb→medium→full with abortable fetch; no layout jank; lower CPU/network vs baseline.
- [ ] People/Pet Filters
  - Acceptance: Pet grouping and group/individual filters correctly change result sets; persisted across sessions.
- [ ] Non‑destructive Adjustments Backend
  - Acceptance: Apply exposure/contrast/saturation server‑side to derived files; “Revert” restores original.
- [ ] Offline Error Logging
  - Acceptance: Errors posted to /analytics/log; queued via Service Worker when offline; no user regressions.
- [ ] Electron Packaging (Local)
  - Acceptance: macOS/Windows builds run offline with local API; protocol+token handoff to UI works; CI artifacts produced.
