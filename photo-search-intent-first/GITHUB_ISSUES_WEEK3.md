# Week 3 — Ready-to-Paste GitHub Issues

Copy each section into a new issue. Apply labels from the block.

---

## [Issue] Sharing v1 — Expiring links + presets
Labels: milestone:W3 Sharing+Backup, area:UI, area:API, type:feature, intent:trust

Summary
Add a “Share” flow to generate expiring, optionally password‑protected public gallery links for the current selection.

Scope
- Toolbar: “Share” for current selection.
- Options: expiry (24h/7d/custom), password (optional), view‑only (no download).
- Public gallery: minimal, responsive, lazy thumbs; tokenized URL.
- Analytics: share_created, share_open (local/anonymous).

Acceptance Criteria
- Creating a link returns a tokenized URL; opening shows gallery with thumbs.
- Expiry and password are enforced on open.
- View‑only prevents downloads (UI + appropriate headers).
- Events recorded: share_created on creation; share_open on view.

Definition of Done
- Feature flag `ff:sharing_v1` controls availability.
- Manual test covers: create, open (valid/expired), password (correct/wrong), view‑only.
- Basic E2E path documented.

---

## [Issue] Export Presets+ — Batch & metadata controls
Labels: milestone:W3 Sharing+Backup, area:UI, area:Export, type:feature, intent:quick-start

Summary
Enhance export with presets and privacy controls for metadata.

Scope
- Presets: Web, Email, Print, Custom (long edge, quality).
- Toggles: strip GPS; strip all EXIF/IPTC; keep copyright only.
- Per‑file status with progress for batches.

Acceptance Criteria
- Batch export N=100 completes; each file shows success/failure.
- Preset parameters applied as expected; metadata toggles honored.

Definition of Done
- Feature flag `ff:export_presets_plus` controls availability.
- Smoke test plan for 10/50/100 items documented.

---

## [Issue] Backup v1 — Local + S3 (incremental)
Labels: milestone:W3 Sharing+Backup, area:Backup, area:API, type:feature, intent:resilience

Summary
Introduce first backup flow with local folder target and S3 connector, supporting manual/daily schedules and incremental sync.

Scope
- Targets: local folder; S3 (first cloud connector).
- Modes: Manual run; Daily schedule; Incremental via checksums.
- Restore: pick version → restore to original path or “Recovered”.

Acceptance Criteria
- Delete a photo locally then restore from backup end‑to‑end.
- Incremental mode skips unchanged files.
- Scheduled daily job triggers at next interval when app open.

Definition of Done
- Feature flag `ff:backup_v1` controls availability.
- Logs appear in Jobs Center; failures show retry action.

---

## [Issue] Explainability Chips — “Why matched”
Labels: milestone:W3 Sharing+Backup, area:UI, type:feature, intent:trust

Summary
Show optional chips on result cards indicating why a photo matched (Faces, OCR, Caption, Time, Geo).

Scope
- Chips on result cards with a toolbar toggle: Show/Hide Explain.
- Lightweight data path to avoid perf regression.

Acceptance Criteria
- Chips render instantly on a 200‑item grid with no visible jank.
- Toggle hides/shows chips globally; state persists per session.

Definition of Done
- Feature flag `ff:explain_chips` controls availability.
- Performance snapshot recorded (FPS before/after unchanged within margin).

---

## Week 3 Metrics (Tracking)
Labels: milestone:W3 Sharing+Backup, type:docs

- Share link open rate tracked.
- Export success ≥ 99%.
- Backup job success ≥ 99.5%.
- Grid FPS unchanged with chips toggled on.

