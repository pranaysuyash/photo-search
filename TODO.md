# Photo Search – Comprehensive TODO (Local‑Only)

This is the canonical backlog. It consolidates everything shared so far into a local‑only plan (no cloud features). The in‑app Tasks view renders this file.

Legend: [x] done • [>] in progress • [ ] planned • (opt) optional

## Top Priorities (Now)
- [>] Long‑ops progress UI (index/OCR/metadata/fast) with indeterminate bar + notes
- [ ] Safe delete to OS trash + Undo (session)
- [ ] Move to collection (add/remove)
- [x] Ratings (⭐1–5) + rating filters
- [x] Keyboard shortcut help overlay (cheat sheet)
- [ ] Timeline view (date clusters + quick scrubbing)

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
- [ ] Search history (recent)
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
- [ ] Grid overlay info (score/EXIF chips toggle)
- [ ] Grid micro‑animations
- [ ] Mosaic/Woven variants (opt)
- [ ] Timeline view with auto clustering by date

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
- [ ] Crop/rotate/flip + basic adjustments (exposure/contrast/temperature)
- [ ] Sidecars for edits, reset to original
- [ ] Upscale 2×/4× (Real‑ESRGAN) with preview
- [ ] Denoise/deblur presets
- [ ] Background removal (Rembg) + PNG export

## AI Tagging (Local‑Only)
- [ ] Auto‑tagging (broad concepts) with accept/reject UI
- [ ] Culling metrics: sharpness/brightness; filters (sharp only, exclude under/over)

## Maps & Place
- [x] Map view with points
- [ ] Tile provider + clustering; hover preview
- [ ] Reverse geocoding (offline) → place chips

## Performance & Tech
- [x] Virtualized results
- [x] Fast index engines (Annoy/FAISS/HNSW)
- [ ] Progressive image loading tiers (thumb/med/full)
- [ ] Cache controls (limits, clear)

## UX & Accessibility
- [x] Keyboard navigation (arrows/Home/End/PageUp/PageDown; A/C/Space/F/Enter; “/” focus)
- [ ] Shortcut overlay (cheat sheet)
- [ ] Focus trapping in modals; improved tab order
- [ ] High‑contrast mode; larger text presets

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
- [ ] Grid overlay info toggle
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
