Intent‑First Additive UX Enhancements — Integration TODOs

Purpose
- Capture only the additive items worth integrating from the external proposal, framed as actionable tasks.
- Align every task with the Intent‑First handbook (primary intents, momentum/feedback, accessibility, trust/explainability, performance).

Summary (What to Integrate)
- Toast notification system (`ToastProvider` + toast components)
- Enhanced Lightbox (zoom/pan/keyboard/touch; quick actions)
- Enhanced Metadata Panel (rich EXIF/info with fast fetch)
- Tailwind micro‑animation extensions (perceived performance)
- Onboarding tour safety & markers (error boundary + stable highlights)

—

1) Toast Notification System
- Intent Alignment: Momentum & Feedback; Visibility of System State; Errors with clear actions.
- User Value: Immediate, unobtrusive confirmation/errors for actions (favorites, exports, long‑running jobs). Improves perceived responsiveness and trust.
- UX Summary:
  - Non‑blocking toasts with types: success, error, warning, info.
  - Auto‑dismiss after N seconds; manual close; optional action button.
  - Accessible (ARIA role="status/alert", focus management for action buttons, reduced motion honored).
- Technical Tasks:
  - Add `photo-search-intent-first/webapp/src/components/ui/Toast.tsx` (toast context, provider, container, hooks).
  - Wrap app root with `ToastProvider` in `photo-search-intent-first/webapp/src/AppWrapper.tsx`.
  - Provide a small adapter so `uiActions.setNote` can surface as toasts without broad refactors.
  - Respect reduced‑motion and high‑contrast settings from Accessibility Panel.
- Dependencies: None outside app; Tailwind animations (task 4) optional but recommended.
- Risks/Mitigations: Over‑notification → rate‑limit similar toasts; ensure keyboard dismissal.
- Acceptance Criteria:
  - Actions (favorite toggle, export start/completion, errors) emit appropriate toasts.
  - Toasts are keyboard and screen‑reader friendly and respect reduced motion.
  - No overlap with critical dialogs; z‑index does not obscure Lightbox controls.
- KPIs:
  - Time‑to‑feedback < 300ms for common actions.
  - Error reporting coverage: ≥ 90% of caught errors present a user‑visible toast.
- Effort: S; Priority: High.

—

2) Enhanced Lightbox
- Intent Alignment: Primary flows (Search → View); Keyboard & Power‑User Paths; Mobile ergonomics; Trust/Explainability.
- User Value: Faster, smoother photo review with intuitive gestures, keyboard controls, and quick actions.
- UX Summary:
  - Zoom/pan (wheel/pinch), double‑tap zoom, auto‑hide controls with quick reveal.
  - Keyboard: arrows/space/esc; quick favorite; open metadata; optional “more like this”.
  - Touch gestures integrated via existing `TouchGestureService`.
  - Non‑blocking info overlay and editor toggle (uses existing ImageEditor when present).
- Technical Tasks:
  - Add `photo-search-intent-first/webapp/src/components/EnhancedLightbox.tsx`.
  - Wire events to existing handlers: `onPrev/onNext/onClose/onFavorite/onReveal/onMoreLikeThis`.
  - Use `thumbUrl` and existing media loading; prefetch next/prev where feasible.
  - Integrate with `VideoLightbox` (no regression for videos).
  - Honor accessibility: focus ring, high‑contrast, reduced‑motion; keyboard trap avoidance.
- Dependencies: `TouchGestureService`, `ImageEditor` module (optional), metadata APIs for info panel.
- Risks/Mitigations: Image jank on large files → GPU transforms, debounce wheel; memory → release object URLs on unmount.
- Acceptance Criteria:
  - Smooth zoom/pan; <16ms frame budget on mid‑range hardware.
  - Keyboard and touch navigation fully functional; no broken gestures.
  - Favorites and info overlay work without blocking navigation.
- KPIs:
  - P95 time to advance photo < 100ms (warm cache).
  - Drop rate of unintended exits < 1% in navigation tests.
- Effort: M; Priority: High.

—

3) Enhanced Metadata Panel
- Intent Alignment: Trust & Explainability; Filters visibility; Progressive disclosure.
- User Value: Understand “why this photo” and act on EXIF/derived info; faster decisions and better filter use.
- UX Summary:
  - Rich EXIF and derived fields (camera, lens, ISO, shutter, GPS, time range).
  - Tied to Lightbox info toggle; can copy fields; links to apply filters where applicable.
  - Lazy‑loads details; caches to avoid repeat requests.
- Technical Tasks:
  - Add `photo-search-intent-first/webapp/src/components/EnhancedMetadataPanel.tsx`.
  - Leverage `MetadataService` and `apiMetadataDetail`; local cache with in‑flight de‑dupe.
  - Provide “Apply filter” affordances (e.g., camera/place) via existing filter actions.
  - Accessible labels; keyboard navigation; respects high‑contrast and reduced‑motion.
- Dependencies: `MetadataService`, `apiMetadataDetail`.
- Risks/Mitigations: Large metadata payloads → trim/format; avoid blocking render; handle missing EXIF gracefully.
- Acceptance Criteria:
  - Info opens within 200ms after first fetch; subsequent opens < 50ms.
  - “Apply filter” shortcuts update results view and URL state correctly.
  - No crashes on missing/corrupt EXIF; clear empty states.
- KPIs:
  - Increase filter usage rate on Lightbox by +15%.
  - “Why this matched” discoverability improves (qualitative checks/user notes).
- Effort: M; Priority: Medium‑High.

—

4) Tailwind Micro‑Animations
- Intent Alignment: Perceived performance; Momentum & Feedback without overwhelm.
- User Value: Subtle motion improves clarity (enter/leave, toasts, panels) without distracting.
- UX Summary:
  - Add keyframes: fadeInOut, slideInRight/Left, scaleUp.
  - Use selectively for toasts, drawers, and minor UI transitions.
- Technical Tasks:
  - Extend `photo-search-intent-first/webapp/tailwind.config.js` under `theme.extend` to include animations/keyframes.
  - Audit usage to ensure reduced‑motion users see minimal/no animation.
- Dependencies: Tailwind setup in webapp.
- Risks/Mitigations: Overuse → visual noise; gate with reduced‑motion and avoid essential content shifts.
- Acceptance Criteria:
  - Animations applied to toasts and lightbox overlays feel smooth; no layout jank.
  - Reduced‑motion preference disables non‑essential motion.
- KPIs:
  - No increase in input latency; animation frame drops < 5% in stressed views.
- Effort: S; Priority: Medium.

—

5) Onboarding Tour Safety & Markers
- Intent Alignment: Primary Intent Clarity; Progressive guidance with resilience.
- User Value: Tour does not break core UX; highlights are stable and informative.
- UX Summary:
  - Wrap tour in error boundary; on failure, close tour and surface a friendly note.
  - Add stable `data-tour` markers to key regions: search bar, library area.
- Technical Tasks:
  - Add/enable `photo-search-intent-first/webapp/src/components/TourErrorBoundary.tsx`.
  - Add `data-tour="search-bar"` and `data-tour="library-area"` to existing elements.
  - Route callback from tour to app view when a step instructs navigation.
- Dependencies: `OnboardingTour` component; app routing.
- Risks/Mitigations: Marker drift → centralize selectors; include visual tests.
- Acceptance Criteria:
  - Tour completes the happy path; failures don’t leave the UI in a broken state.
  - Highlight rings remain aligned across themes and zoom levels.
- KPIs:
  - Onboarding success rate unchanged or improved; fewer tour‑related errors in logs.
- Effort: S; Priority: Medium.

—

Sequencing
- Phase 1: Toasts (1) + Tailwind micro‑animations (4)
- Phase 2: Enhanced Lightbox (2) behind a temporary flag; evaluate and promote
- Phase 3: Enhanced Metadata Panel (3)
- Phase 4: Onboarding tour safety & markers (5)

Testing Notes
- Map to existing docs: `docs/intent-first/webapp/TESTING_PLAN.md` and `docs/intent-first/AUDIT_CHECKLIST.md`.
- Add focused tests for: toasts render/dismiss; lightbox keyboard/gestures; metadata caching; reduced‑motion behavior; tour error boundary.

Sign‑Off
- DRI: Webapp maintainers
- Success: All tasks meet acceptance criteria; no regressions in onboarding/accessibility/hints/mobile ergonomics.
