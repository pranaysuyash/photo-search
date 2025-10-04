# Project TODO Plan (2025-09-19)

The following roadmap captures the long-term, intent-first initiatives required to deliver a seamless offline-first Photo Search experience across web and Electron. Each item includes scope, concrete deliverables, verification, and success criteria. Status updates should continue to flow into `agents.md` after focused work sessions.

---

## Phase 1 – Offline Foundations

### 1) Model Bundling & Distribution (Electron + Web)
- **Scope:** Ship CLIP weights with Electron installers while retaining the import UX as an override for advanced users.
- **Deliverables:**
  - [x] Add CLIP weights (`clip-vit-base-patch32`) to Electron builder `extraResources`; stage into `{appData}/photo-search/models/` on first launch.
  - [x] Implement integrity verification (hash manifest) before first use and surface failure in Diagnostics drawer.
  - [x] Auto-set `PHOTOVAULT_MODEL_DIR`, `TRANSFORMERS_OFFLINE=1`, `SENTENCE_TRANSFORMERS_HOME` on Electron boot; document override path in settings.
  - [x] Provide “Refresh Bundled Models” command (CLI + Electron menu) that pulls updated weights without full reinstall; reuse import flow for custom dirs.
  - [x] Update docs (`MODEL_BUNDLING_STRATEGY.md`, `OFFLINE_SETUP_GUIDE.md`, README) with default storage paths, footprint estimates, and override instructions.
- **Verification:**
  - Fresh offline install indexes & searches without prompts (CI smoke + manual).
  - Integrity check failure reproduces recoverable error and guidance.
  - Import/override flow continues to work after bundling.
- **Success Criteria:** Seamless offline usage out of the box; user can opt-in to alternate locations without edits.

### 2) Electron Offline Hardening & Health Surface
- **Scope:** Make the Electron app resilient and transparent in air-gapped environments.
- **Deliverables:**
  1. Upgrade `OfflineService` to exponential backoff; defer status LED UI until online cues return.
  2. Extend Diagnostics drawer with connection history, last successful `/api/health` timestamp, and bundled model status check.
  3. Ensure backend CORS includes `app://local`; add automated Spectron/Playwright-lite test that packages assets, forces offline, and verifies UI boot + zero console noise.
  4. Document Electron-specific offline behaviours in `ELECTRON_INTEGRATION_TEST_PLAN.md` and troubleshooting flow.
- **Verification:**
  - Automated offline boot test runs in CI for release builds.
  - Manual run logs no fetch noise when disconnected.
- **Success Criteria:** Electron clearly communicates state, survives network flaps, and requires no manual config for offline.

### 3) End-to-End Offline Regression Suite
- **Scope:** Institutionalize offline regression for web, Electron, and CLI.
- **Deliverables:**
  1. Finalize Playwright `offline-pwa.test.ts` to rely on stubbed backend responses; add CI job gating SW changes.
  2. Create CLI script covering indexing/search with `OFFLINE_MODE=1` and bundled models (report to `agents.md`).
  3. Bundle results into a nightly “offline smoke” pipeline storing artifacts/logs.
- **Success Criteria:** Offline smoke runs automatically; failures block release.

### Phase 0 – AppChrome Foundations (Owner: AI assistant)
- **Scope:** Prepare modernization work by securing offline resilience, shared design primitives, and baseline regression artifacts.
- **Deliverables:**
  1. Draft implementation spec for `OfflineService` exponential backoff + status emitters. — ✅ Implemented Oct 2025 (backoff + scheduling live; status emitters still TBD).
  2. Define diagnostics telemetry schema (connection history, model health) and surface plan for upcoming ActivityTray. — **TODO**
  3. Outline CI offline smoke strategy (CLI script + Playwright runner) with tooling requirements. — **TODO**
  4. Catalog legacy components requiring shadcn migration (StatusBar, StatsBar, LibrarySwitcher, Collections, BottomNavigation, SearchBar). — ✅ Completed Oct 2025.
  5. Produce baseline UX capture plan (screenshots or Playwright visuals) for library/search/collections/onboarding journeys. — **TODO**
  6. Schedule design/dev workshop to lock shared visual spec; circulate agenda + attendees. — ✅ Calendar invite requested Oct 2025.
  7. Draft RFC outline for `LayoutShell` extraction covering routing/context impacts. — **TODO**
- **Success Criteria:** All TODO items have owners/dates before Phase 1 kicks off; migration candidates documented for design system roll-out.

---

## Phase 2 – UX & Layout Excellence

### 4) Modal Architecture & Layout Stabilization
- **Scope:** Keep AppShell mounted, centralize modal state, and eliminate responsive regressions.
- **Deliverables:**
  1. Refactor `ModalManager` to consume `useModalControls`/`useModalStatus` exclusively; drop legacy prop plumbing.
  2. Normalize AppShell spacing via design tokens; add responsive Percy (or Playwright screenshot) coverage for SmartAlbumSuggestions and primary views.
  3. Add Playwright smoke that opens Folder/Tag/Share modals, asserting focus trap, Escape handling, and no layout flicker.
- **Success Criteria:** No visible shell re-layout during modal operations; automated visual diff stays green.

### 5) Onboarding & Empty-State Funnel
- **Scope:** Ensure the first-run experience guides every persona—demo, import, or enterprise offline.
- **Deliverables:**
  1. Connect `EnhancedEmptyState` CTAs to onboarding flags (demo library, folder picker, model import) and ensure state persistence across reloads.
  2. Expand `FirstRunSetup` with bundled-model status indicator and guidance for manual imports (including file sizes and expected paths).
  3. Add Vitest coverage asserting CTA handlers trigger, plus a manual QA checklist for the three entry paths.
- **Success Criteria:** Every empty state provides an actionable path; onboarding can resume after app restart.

### 6) Search History & Keyboard Shortcut Refinement
- **Scope:** Polish power-user affordances and accessibility references.
- **Deliverables:**
  1. Wire `SearchHistoryService` into SearchBar suggestions with privacy toggle and purge button; cover with unit tests for ordering/navigation.
  2. Rebuild `KeyboardShortcutsPanel` with category metadata, ensure Help modal launches it with focus trap, and ship a static reference (markdown/pdf) for documentation.
  3. Localize shortcut labels via JSON so future translations avoid code churn.
- **Success Criteria:** History suggestions are reliable and accessible; shortcuts are discoverable both in-app and docs.

---

## Governance & Reporting
- Maintain `agents.md` status entries per task/milestone.
- Update documentation alongside each deliverable to comply with the intent-first “document what developers actually need” principle.
- Gate releases on completion of Phase 1 items; begin Phase 2 once offline foundation is stable.
