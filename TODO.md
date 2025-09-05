# Photo Search – Feature TODOs

This backlog lists high‑value features for a best‑in‑class, private‑first photo manager across macOS, Windows, and Web (Electron + React + FastAPI). Items are grouped by area with concise acceptance criteria.

## Core Enhancements
- Search speed telemetry: record query latency; surface in Diagnostics
  - Acceptance: avg/95p latency visible per engine
- Exact/ANN switch per query with “Auto” heuristic
  - Acceptance: UI toggle + persisted preference
- Bulk operations: move/copy/delete (to OS trash), rename with templates
  - Acceptance: non‑destructive, confirmation + undo
- Preferences sync (local JSON) with export/import
  - Acceptance: export/import file round‑trip works

## Filters & Organization
- Smart filters: camera, lens, ISO, dominant color, aspect ratio, orientation
  - Acceptance: filters narrow results correctly on a seeded dataset
- People & faces (opt‑in, local): detect, cluster, and name; filter by person
  - Acceptance: face clusters view + rename; search filter “Person: <name>”
- Smart albums: rule‑based collections (e.g., “Beach in 2021, favorites”)
  - Acceptance: rule editor + background refresh updating contents
- Map upgrades: real tiles + clustering; hover thumb previews
  - Acceptance: responsive up to 10k points

## Editing (Non‑destructive)
- Inline crop/rotate/flip; exposure/contrast/temperature sliders
  - Acceptance: edits saved as sidecar; reset to original
- AI upscaling (Real‑ESRGAN) 2×/4× with preview
  - Acceptance: compare view; output saved to sibling folder
- Enhance/denoise/deblur (open‑source models)
  - Acceptance: deterministic presets with progress feedback
- Background removal (Rembg) + subject cutout export
  - Acceptance: mask preview; PNG export with transparency
- Colorize old photos (DeOldify) + intensity slider
  - Acceptance: side‑by‑side preview + export

## AI Discovery & Captioning
- Local VLM captions (e.g., Qwen‑VL, LLaVA) via Ollama/gguf
  - Acceptance: caption file per image; search boosts with captions
- Cloud caption add‑on (OpenAI, Gemini, HF) with cost prompts
  - Acceptance: per‑provider toggles; never persist keys; usage limits
- Similar‑by‑example (“More like this”) neighbors using CLIP/SigLIP
  - Acceptance: click result to open neighbors panel
- Auto‑tagging (broad concepts) locally; cloud as optional fallback
  - Acceptance: tag suggestions list + one‑click apply

## Sharing & Collaboration
- Quick share export: copy selected to a new folder; strip EXIF or watermark optional
  - Acceptance: export dialog; success toast; log action
- Static web gallery export (zip): minimal HTML with thumbs + captions
  - Acceptance: exported gallery opens locally; shareable via any host
- Direct share link (local server): ephemeral token + expiry
  - Acceptance: share recipient can open read‑only grid; no write access
- Cloud share (optional): S3/Drive uploader with pre‑signed links
  - Acceptance: progress + result links; retries/backoff

## Sync & Backup (Optional)
- Watch folders for changes; incremental index automatically
  - Acceptance: background watcher updates counts without UI blocking
- Backup index to local DB/SQLite; restore path when moving libraries
  - Acceptance: rebuild index metadata from backup mapping

## UX & Accessibility
- Virtualized grids for large results; skeleton loader; debounce inputs
  - Acceptance: smooth scroll with 25k items on mid‑range laptop
- Keyboard shortcuts everywhere (+ cheat sheet overlay)
  - Acceptance: tested shortcuts for navigate/favorite/reveal/edit
- Tag chips + autocomplete + bulk edit (both apps)
  - Acceptance: chip UX + multi‑select update in one go

## Packaging & Distribution
- Electron packaging (electron‑builder) for macOS/Windows + icons/signing
  - Acceptance: DMG/EXE artifacts; auto‑update toggle for later
- Release pipeline: CI build artifacts per tag; upload to S3/Drive
  - Acceptance: one‑click release draft with checksums

## Updates & Upgrades (Electron)
- Auto‑updates (electron‑updater) for v1.x
  - Acceptance: app checks on launch; update available/progress/ready events surface in UI; successful in‑place update on macOS/Windows
- Feed strategy for majors
  - Acceptance: v1 apps only receive 1.x; v2 apps receive 2.x; optional “v2 available” banner in v1 with link (no forced upgrade)
- Offline license validation (Ed25519) with major gating
  - Acceptance: v1 license unlocks 1.x; v2 requires new/upgrade license; app blocks auto‑install of higher major and shows upgrade CTA
- License UI
  - Acceptance: “Manage License” dialog (paste/load), validation result, store to app‑data
- Release notes & channels
  - Acceptance: stable channel; optional beta with pre‑releases; notes visible in Updates dialog
- Code signing & notarization
  - Acceptance: macOS builds notarized and stapled; Windows builds signed; SmartScreen/macOS warnings minimized
- Differential updates & checksums
  - Acceptance: blockmap enabled; SHA256 checksums generated and attached to releases
- Rollback & deferral UX
  - Acceptance: "Revert to previous" available; update banner supports Snooze (24h/7d)
- Maintenance & EOL policy
  - Acceptance: documented v1 maintenance window (e.g., 12 months); final v1 installers archived and linkable

## Electron (Classic App) Parity
- Port updater + license modules to Classic electron app
  - Acceptance: classic `electron/main.js` wired with electron-updater events, menu items, and license gating identical to intent-first
- Add publish config in Classic `electron/package.json`
  - Acceptance: GitHub/S3 provider set; build artifacts publish successfully in CI

## Monetization & Add‑ons
- Add‑on marketplace UI: list optional AI engines (OpenAI, Gemini, HF)
  - Acceptance: install switches per provider; usage caps; per‑feature paywall friendly copy
- Billing: Gumroad link embed (MVP) + optional Razorpay checkout
  - Acceptance: purchase opens in modal/new tab; app unlock key captured locally (file) without servers

## Compliance & Legal (for Razorpay or similar)
- Public pages: Terms of Service, Privacy Policy, Refund Policy (no refunds)
  - Acceptance: pages linked in footer; copy reviewed; versioned

## Research Queue (Evaluate and choose)
- Upscaling: Real‑ESRGAN vs. SwinIR
- Denoise/deblur: GFPGAN, DeblurGAN‑v2
- Segmentation: Rembg vs. MODNet
- Local VLMs: Qwen‑VL, LLaVA, MiniCPM‑V, Phi‑3‑vision; via Ollama
- Text OCR: EasyOCR vs. Tesseract + language packs
- Vector DB: FAISS+SQLite hybrid vs. Milvus/pgvector (optional)

## Implementor Notes
- Keep Classic minimal in deps; gate heavy features with optional extras and graceful fallbacks. Intent‑First can host layered integrations first, then uplift to Classic once stable.
- Maintain private‑by‑default posture: local models first; cloud add‑ons explicit and never persisted.
## From Research: New TODOs (2024–2025 Landscape)
- Smart Albums (dynamic saved searches)
  - Store rule JSON (text, tags, EXIF, dates, favorites) and resolve to items on open/refresh
  - UI: mark collection as Smart; show rule summary; manual “Refresh” button
- Reverse Geocoding & Place Chips
  - Enrich GPS with city/region names (offline lib); add place chips for filters and display
  - Batch task: backfill for existing libraries
- Culling Metrics & Filters
  - Compute sharpness (Laplacian var), brightness, contrast during EXIF build
  - Filters: “Sharp only”, “Exclude under/over‑exposed”; surface in details
- Multi‑modal Similarity
  - “Like this + text” blending with weight slider; API route and UI action
- OCR UX Enhancements
  - “Has text” filter; exact‑match quotes; show OCR snippets in details
- Collections Utilities
  - Copy paths, Export CSV, Pin as Smart, “Open in Files” for all
- People & Pets (local‑first)
  - Face detection + clustering (InsightFace); name clusters; search by person; pet grouping
- Trips/Events Auto‑Collections
  - Cluster by time + geo; generate titled trips; optional calendar correlation
- Aesthetic/Best‑Shot Picker
  - Heuristic MVP (sharpness/exposure/faces‑open) → later ML aesthetic score
- Global Shortcuts + Cheat Sheet
  - “/” focus search, g/c switch tabs, j/k grid, f favorite, o reveal
- Theme Support
  - Dark/light toggle with persistence

### Sprint Plan
- Sprint A (now)
  - Smart Albums (Saved → Smart Collections)
  - Reverse Geocoding + Place chips
  - Culling metrics + filters (sharp/under/over)
- Sprint B
  - Multi‑modal Like+Text; OCR chips + exact match; Collections utilities
- Sprint C
  - People/Pets clustering; Trips/Events; Aesthetic picker (heuristics)

### Notes
- Keep on‑device, privacy‑first; gate heavy models; degrade gracefully.
- Workspace search EXIF parity: optionally extend cross‑folder filters.
