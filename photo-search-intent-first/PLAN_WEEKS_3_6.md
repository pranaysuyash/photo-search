# Plan — Weeks 3–6 (Adoption‑First)

Focus: share/export/backup trust; mobile/pwa and reliability polish; organization and health; pro controls and packaging.

## Week 3 — Sharing, Backup, Trust
- Sharing v1 (expiring links + presets)
- Export Presets+ (batch & metadata controls)
- Backup v1 (Local + S3; incremental)
- Explainability Chips (Faces/OCR/Caption/Time/Geo)
Metrics: share open rate; export ≥ 99%; backup ≥ 99.5%; grid FPS unchanged with chips.

## Week 4 — Mobile, Reliability, Jobs+
- PWA/Mobile polish (gestures, offline badges; Lighthouse pass)
- Jobs Center v1.1 (logs, details drawer, deep links; pause/resume/cancel)
- Error/Retry UX (standard banners; backoff retries; no uncaught rejections)
Metrics: Silent‑wait reports = 0; mobile Lightbox TTI < 1.5s.

## Week 5 — Organization That Scales
- Smart Collections v1 (Events/Places/Best of Year)
- Auto‑Tagging v1 (scenes/objects + review queue)
- Index Health & Drift Dashboard (coverage, drift, CTAs)
Metrics: ANN P95 < 500ms @10k; coverage visible at a glance.

## Week 6 — Pro Controls & Packaging
- Metadata Pro (IPTC/XMP batch via sidecars)
- Sharing v1.1 (watermarking; gallery theme; download on/off)
- Watch Folders & Differential Indexing
- Packaging baseline (signed dmg/nsis; auto‑update stub)
Metrics: Batch metadata ≥ 99%; watcher latency < 60s (JPEGs).

## Guardrails
- Feature flags per module; non‑destructive first.
- Performance budgets (grid ≥ 55 FPS); minimal telemetry (TTFV, edits, job failures, PWA installs, share opens).

## Suggested Sequencing
1. Sharing v1 → Export+
2. Backup v1 → Explain Chips
3. PWA/Mobile → Jobs v1.1 → Error UX
4. Smart Collections → Auto‑Tagging → Index Health
5. Metadata Pro → Sharing v1.1 → Watch Folders → Packaging

