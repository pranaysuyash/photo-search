# Photo Search – Intent-First Issues Backlog

This backlog groups lightweight issues by milestone with clear acceptance criteria and suggested labels. Use it to open tracker tickets verbatim.

## Labels
- `milestone:M1 Onboarding`
- `milestone:M2 Jobs`
- `milestone:M3 Explainability`
- `milestone:M4 Power-User`
- `milestone:M5 Packaging`
- `milestone:W3 Sharing+Backup`
- `milestone:W4 Mobile+Reliability`
- `milestone:W5 Organization+Health`
- `milestone:W6 Pro+Packaging`
- `area:UI`, `area:API`, `area:Electron`, `area:Search`, `area:Indexing`, `area:Jobs`, `area:ErrorUX`, `area:PWA`, `area:Export`, `area:Backup`, `area:Metadata`, `area:Packaging`
- `type:feature`, `type:bug`, `type:ux`, `type:docs`, `type:techdebt`
- `intent:quick-start`, `intent:visibility`, `intent:trust`, `intent:keyboard`, `intent:resilience`

---

## M1 — Onboarding & Empty States

### 1) First‑Run Onboarding screen
- Labels: `milestone:M1 Onboarding`, `area:UI`, `type:feature`, `intent:quick-start`
- Acceptance:
  - On fresh state, show welcome with “Pick Folder” and “Use Demo” CTAs.
  - Selecting a folder persists to `/workspace` and becomes active workspace.
  - “Quick Index” CTA triggers `/index` and shows progress until complete.
  - After index completes, user is guided to run a first search.

### 2) Intentful Empty States per view
- Labels: `milestone:M1 Onboarding`, `area:UI`, `type:ux`, `intent:quick-start`
- Acceptance:
  - Results/People/Map/Trips show helpful copy + next action when data missing.
  - CTAs trigger relevant jobs: `/index`, `/faces/build`, `/ocr/build`, `/trips/build`.
  - State auto-updates on job completion; no manual reload needed.

### 3) Demo Library toggle
- Labels: `milestone:M1 Onboarding`, `area:UI`, `type:feature`, `intent:quick-start`
- Acceptance:
  - “Use Demo” switches to `e2e_data` read‑only workspace.
  - Search returns > 0 results; easy switch back to user library.

### 4) Header Status Bar
- Labels: `milestone:M1 Onboarding`, `area:UI`, `type:feature`, `intent:visibility`
- Acceptance:
  - Shows API status (green/amber/red), active workspace, Index Ready/Empty, Fast index availability.
  - Reflects live connectivity; degrades gracefully if API restarts.

---

## M2 — Jobs Center (Progress, History, Control)

### 5) Unified Jobs Panel
- Labels: `milestone:M2 Jobs`, `area:UI`, `type:feature`, `intent:visibility`
- Acceptance:
  - Starting `/index|/ocr/build|/captions/build|/faces/build|/fast/build|/trips/build` creates a job row.
  - Shows progress, step/ETA, status; persists across reloads.

### 6) Pause/Cancel/Resume (where applicable)
- Labels: `milestone:M2 Jobs`, `area:API`, `type:feature`, `intent:visibility`
- Acceptance:
  - Jobs can cancel; UI updates to “cancelled”.
  - For resumable tasks, resume continues without redoing completed work.

### 7) Notifications with deep links
- Labels: `milestone:M2 Jobs`, `area:UI`, `type:ux`, `intent:quick-start`
- Acceptance:
  - Completion toasts include “View Results/Open View”.
  - Errors surface details and Retry; clicking toast focuses related view.

### 8) Session Persistence of jobs
- Labels: `milestone:M2 Jobs`, `area:UI`, `type:feature`, `intent:resilience`
- Acceptance:
  - On reload, in‑flight jobs rehydrate from server; last view/query is restored.

---

## M3 — Explainability & Resilience

### 9) “Why This Matched” chips
- Labels: `milestone:M3 Explainability`, `area:UI`, `type:feature`, `intent:trust`
- Acceptance:
  - Optional chips on results (objects, faces, OCR, time/place) without clutter.
  - Toggle to show/hide; no noticeable perf hit with 200 results.

### 10) API Base Autodetect + Health
- Labels: `milestone:M3 Explainability`, `area:UI`, `type:techdebt`, `intent:resilience`
- Acceptance:
  - Web uses `window.location.origin` when available; `VITE_API_BASE` only as override.
  - Header shows live API health; retries with backoff are user‑visible.

### 11) Search error experience
- Labels: `milestone:M3 Explainability`, `area:UI`, `type:ux`, `intent:resilience`
- Acceptance:
  - Friendly messages for 4xx/5xx; actionable recovery; no uncaught banners.

---

## M4 — Sidebar & Power‑User Quality

### 12) Collapsible sidebar + Density presets
- Labels: `milestone:M4 Power-User`, `area:UI`, `type:feature`, `intent:quick-start`
- Acceptance:
  - Sidebar can collapse to icons; density presets persist; no layout jank.

### 13) Keyboard shortcuts + “?” overlay
- Labels: `milestone:M4 Power-User`, `area:UI`, `type:feature`, `intent:keyboard`
- Acceptance:
  - Shortcuts: focus search, next/prev, open, favorite, save search, toggle panels.
  - “?” overlay lists shortcuts; searchable; works across main views.

### 14) Session restore
- Labels: `milestone:M4 Power-User`, `area:UI`, `type:feature`, `intent:resilience`
- Acceptance:
  - Restore last workspace, view, filters, grid settings on startup; opt‑out available.

---

## M5 — Packaging & Update Polish (Electron)

### 15) Electron startup robustness
- Labels: `milestone:M5 Packaging`, `area:Electron`, `type:feature`, `intent:resilience`
- Acceptance:
  - Detect/start API if not running; handle port conflicts; clear errors and recovery.

### 16) Auto‑update and signed installers
- Labels: `milestone:M5 Packaging`, `area:Electron`, `type:feature`
- Acceptance:
  - `electron-builder` produces signed dmg/nsis; update checks/logs verified; no dev security warnings when packaged.

---

## Cross‑Cutting Quality & Metrics

### 17) TTFV (Time‑to‑First‑Value) metric
- Labels: `area:Search`, `type:docs`, `intent:quick-start`
- Acceptance:
  - Instrument and report time from app open → first successful search result (demo and user library).

### 18) Fast index UX clarity
- Labels: `area:Indexing`, `type:ux`, `intent:visibility`
- Acceptance:
  - Manage per-library ANN index with build status, readiness, and fallback messaging.

---

## WEEK 3 (Days 11–15): Sharing, Backup, Trust

### 19) Sharing v1 — Expiring links + presets
- Labels: `milestone:W3 Sharing+Backup`, `area:UI`, `area:API`, `type:feature`, `intent:trust`
- Acceptance:
  - “Share” toolbar action for current selection (single/multi).
  - Options: expiry (24h/7d/custom), optional password, view‑only toggle.
  - Public gallery page: responsive, lazy thumbs, minimal UI behind token.
  - Analytics events: `share_created`, `share_open` recorded (local/anonymous).
- DoD:
  - Link opens gallery, enforces expiry/password.
  - View‑only prevents downloads.
  - Feature flag: `ff:sharing_v1`.

### 20) Export Presets+ — Batch & metadata controls
- Labels: `milestone:W3 Sharing+Backup`, `area:UI`, `area:Export`, `type:feature`, `intent:quick-start`
- Acceptance:
  - Presets: Web, Email, Print, Custom (long edge, quality).
  - Toggles: strip GPS; strip all EXIF/IPTC; keep copyright only.
  - Per‑file status visible for batches.
- DoD:
  - Batch export N=100 succeeds with per‑file results.
  - Feature flag: `ff:export_presets_plus`.

### 21) Backup v1 — Local + one cloud (S3 first)
- Labels: `milestone:W3 Sharing+Backup`, `area:Backup`, `area:API`, `type:feature`, `intent:resilience`
- Acceptance:
  - Connectors: local folder and S3 (scope: S3 first).
  - Modes: Manual run; Daily schedule; Incremental via checksums.
  - Restore flow: pick version → restore to original or “Recovered”.
- DoD:
  - Delete a photo locally → restore from backup end‑to‑end.
  - Feature flag: `ff:backup_v1`.

### 22) Explainability Chips — “Why matched”
- Labels: `milestone:W3 Sharing+Backup`, `area:UI`, `type:feature`, `intent:trust`
- Acceptance:
  - Chips on results: Faces, OCR, Caption, Time, Geo; toolbar toggle show/hide.
  - No visible jank on a 200‑item grid (FPS unchanged vs baseline).
- DoD:
  - Chips render instantly; performance budget met.
  - Feature flag: `ff:explain_chips`.

### Week 3 Metrics
- Labels: `milestone:W3 Sharing+Backup`, `type:docs`
- Targets:
  - Share link open rate tracked; export success ≥ 99%.
  - Backup job success ≥ 99.5%.
  - Grid FPS unchanged with chips on.

---

## WEEK 4 (Days 16–20): Mobile, Reliability, Jobs+

### 23) PWA/Mobile polish
- Labels: `milestone:W4 Mobile+Reliability`, `area:PWA`, `area:UI`, `type:feature`, `intent:quick-start`
- Acceptance:
  - Gestures: pinch‑zoom; swipe next/prev in Lightbox.
  - Offline UX: “Available offline” badge on cached items; “Not cached” state.
  - Lighthouse PWA passes; install prompt shows; offline grid renders thumbs without console errors.
- DoD: All acceptance criteria met on a mid‑tier device profile.

### 24) Jobs Center v1.1
- Labels: `milestone:W4 Mobile+Reliability`, `area:Jobs`, `type:feature`, `intent:visibility`
- Acceptance:
  - Persist logs per task; “View details” drawer; deep link from toasts.
  - Pause/Resume where supported; Cancel everywhere.
  - Start two jobs, reload: jobs rehydrate; pause one, cancel the other → correct outcomes.

### 25) Error/Retry UX
- Labels: `milestone:W4 Mobile+Reliability`, `area:ErrorUX`, `type:ux`, `intent:resilience`
- Acceptance:
  - Standardized banners for API down, network fail, permission errors.
  - Automatic retries with backoff for reads; explicit retry for writes.
  - No uncaught promise rejections; every long task failure shows actionable retry.

### Week 4 Metrics
- Labels: `milestone:W4 Mobile+Reliability`, `type:docs`
- Targets:
  - “Silent wait” reports = 0.
  - Mobile Lightbox TTI < 1.5s on mid‑tier device.

---

## WEEK 5 (Days 21–25): Organization That Scales

### 26) Smart Collections v1
- Labels: `milestone:W5 Organization+Health`, `area:UI`, `area:API`, `type:feature`, `intent:quick-start`
- Acceptance:
  - Auto‑albums: Events (weekend clusters), Places, “Best of [Year]”.
  - Controls: enable/disable category; confidence threshold slider.
  - Running “Build Smart Collections” yields ≥ 3 meaningful auto‑albums on sample library.

### 27) Auto‑Tagging v1 (scenes/objects)
- Labels: `milestone:W5 Organization+Health`, `area:API`, `area:UI`, `type:feature`, `intent:trust`
- Acceptance:
  - Lightweight model path using existing inference stack.
  - Tags with confidence; “New tags” review queue for accept/reject.
  - Batch tag N=2000 images; tags become searchable.

### 28) Index Health & Drift Dashboard
- Labels: `milestone:W5 Organization+Health`, `area:UI`, `area:Indexing`, `type:feature`, `intent:visibility`
- Acceptance:
  - Coverage % per capability (captions/OCR/faces/fast); last build time; drift indicators (files added since last build).
  - CTAs: “Rebuild Fast Index”, “Resume OCR”, etc. trigger jobs and reflect in Jobs Center.

### Week 5 Metrics
- Labels: `milestone:W5 Organization+Health`, `type:docs`
- Targets:
  - Search P95 with ANN < 500ms on 10k set; % coverage visible at a glance.

---

## WEEK 6 (Days 26–30): Pro‑grade Controls & Packaging

### 29) Metadata Pro (IPTC/XMP batch)
- Labels: `milestone:W6 Pro+Packaging`, `area:Metadata`, `type:feature`, `intent:trust`
- Acceptance:
  - Panel: Title, Description, Copyright, Keywords, People.
  - Batch edit and write XMP sidecars first (non‑destructive).
  - Edit 50 photos’ keywords; search reflects new tags.

### 30) Sharing v1.1 (Access & Branding)
- Labels: `milestone:W6 Pro+Packaging`, `area:UI`, `area:API`, `type:feature`, `intent:trust`
- Acceptance:
  - Optional watermarking; simple theme toggle for gallery; per‑link download on/off.
  - Create a no‑download link; downloading blocked in UI and via header control.

### 31) Watch Folders & Differential Indexing
- Labels: `milestone:W6 Pro+Packaging`, `area:Indexing`, `area:Jobs`, `type:feature`, `intent:visibility`
- Acceptance:
  - Background watcher enqueues diffs only.
  - Drop 500 new photos into watched folder → auto‑indexed; progress visible in Jobs Center.

### 32) Packaging baseline
- Labels: `milestone:W6 Pro+Packaging`, `area:Packaging`, `area:Electron`, `type:feature`, `intent:resilience`
- Acceptance:
  - CI produces dmg/nsis without warnings; auto‑update stub wired.
  - First‑run opens onboarding; no dev security warnings in packaged builds.

### Week 6 Metrics
- Labels: `milestone:W6 Pro+Packaging`, `type:docs`
- Targets:
  - Batch metadata success ≥ 99%.
  - Watcher latency from file add → searchable < 60s for JPEGs.

---

## Guardrails (apply to all new work)
- Labels: `type:docs`
- Feature flags per module for safe rollouts.
- Non‑destructive first; destructive later with explicit confirmations.
- Performance budgets: grid render ≥ 55 FPS on test rig.
- Minimal telemetry: TTFV, edit success, job failures, PWA installs, share opens (local/anonymous OK).

## Suggested Sequencing (pull order)
1. Sharing v1 → Export+
2. Backup v1 → Explainability Chips
3. PWA/Mobile polish → Jobs Center v1.1 → Error UX
4. Smart Collections → Auto‑Tagging → Index Health
5. Metadata Pro → Sharing v1.1 → Watch Folders → Packaging
