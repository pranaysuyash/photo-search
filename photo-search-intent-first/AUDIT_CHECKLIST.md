# Intent-First UX Audit Checklist

Use this to verify the app aligns with the intent-first handbook. Each section has objective checks and a simple pass/fail.

## Primary Intent Clarity
- [ ] First‑run flow guides: Pick Folder → Quick Index → Try Search in < 90s (novice test)
- [ ] Demo library works out of the box; is visibly optional
- [ ] Clear next step shown after index completes

## Empty States & Next Steps
- Results view shows: reason (no index/no results) + CTA (Index/Refine) + short help
  - [ ] Results empty state present and actionable
- People view shows: build faces CTA with estimate, updates after run
  - [ ] People empty state present and actionable
- Map/Trips show: build GPS/trips CTAs, progress, and completion states
  - [ ] Map and Trips empty states present and actionable

## Visibility of System State
- [ ] Global status bar shows API health, active workspace, Index Ready/Empty, ANN fast availability
- [ ] Jobs center lists running jobs with progress/ETA/logs; persists across reloads
- [ ] Long tasks never “silently” run without user-facing progress

## Momentum & Feedback
- [ ] CTAs trigger visible progress immediately; completion toast offers deep link (View Results/Open View)
- [ ] Errors present details and clear actions (Retry/Report); no unhandled banners

## Keyboard & Power‑User Paths
- [ ] Core shortcuts implemented (focus search, next/prev, open, favorite, save search, toggle panels)
- [ ] “?” overlay lists shortcuts and is searchable
- [ ] Shortcuts work across main views; have tests for at least two

## Trust & Explainability
- [ ] Optional “Why this matched” chips convey objects/faces/OCR/time/place
- [ ] Performance budget respected for chips (no visible lag on 200 results)
- [ ] Filters applied are clearly visible and editable

## Performance & Load
- [ ] ANN index status clear; search P95 < 300ms on 10k photos (target)
- [ ] UI remains responsive during background jobs
- [ ] Diagnostics view exposes coverage, OS, disk headroom, and fast-index readiness

## Progressive Disclosure
- [ ] Advanced filters tucked behind “Show more” (no overwhelm)
- [ ] Onboarding and tooltips are opt‑out; never block expert flows

## Session & Resilience
- [ ] Session restore: last workspace, view, filters, grid settings
- [ ] API base autodetects (`window.location.origin`), `VITE_API_BASE` as override
- [ ] Reconnect/retry/backoff surfaces in UI; degrades gracefully when API restarts

## Packaging & Updates (Electron)
- [ ] Starts API or informs clearly when API unavailable; handles port conflicts
- [ ] Signed installers build successfully (macOS dmg, Windows nsis)
- [ ] No dev security warnings in packaged builds

## Metrics & Telemetry (local/anonymous)
- [ ] TTFV measured for demo and user paths
- [ ] Job completion success rate and durations tracked (local logs ok)
- [ ] Top error classes visible for triage

## Test Coverage – Critical Paths
- [ ] Onboarding flow integration test (happy path)
- [ ] Index → Search → Save search smoke
- [ ] Jobs center progress render test
- [ ] Keyboard overlay minimal test

