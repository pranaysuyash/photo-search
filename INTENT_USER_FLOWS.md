# Intent‑First User Flows (Electron App)

This document enumerates end‑to‑end user flows from first download to closing the app, framed by Intent‑First principles: reduce time‑to‑first‑value (TTFV), keep strong user agency, and maintain transparency with reversibility.

Legend
- Trigger: What brings the user into the flow
- Goal (Intent): What the user is trying to achieve
- Steps: Minimal actions to get to value
- Feedback: What the app shows to build confidence
- Exit: How the flow ends successfully (or safely fails)
- Metrics: What we track locally to improve (no cloud)

---

## 0. Download and Launch
- Trigger
  - User downloads installer from landing, runs Electron bundle.
- Goal (Intent)
  - Open the app quickly with no surprises; confirm local‑only.
- Steps
  - Install app → Launch icon → App loads to First‑Run.
- Feedback
  - Splash shows “Local‑only. Nothing leaves your device.”
  - Basic hardware checks (disk free, GPU optional) happen silently; warn only if relevant.
- Exit
  - First‑Run modal appears with Quick Start, Custom, Demo; app ready for input.
- Metrics
  - appLaunchOk, firstRunShown, hardwareWarnings.

## 1. First‑Run: Quick Start (Recommended)
- Trigger
  - First‑Run modal appears on first launch or when no library configured.
- Goal (Intent)
  - Start finding photos with minimal decisions; local‑only.
- Steps
  - Select Quick Start → Review pre‑scan counts (files, bytes) for default folders → Toggle “Include videos” → Press “Start indexing (X • Y GB)”.
- Feedback
  - Indexed chip appears with an indeterminate bar, then shows determinate progress + ETA as available.
  - Toast: “Indexing runs in the background; you can start searching.”
- Exit
  - App navigates to Library view; user can search immediately as results populate.
- Metrics
  - quickStartConversion, ttfvSeconds (first search or first open photo), includeVideosRate.

## 2. First‑Run: Custom Setup
- Trigger
  - User chooses “Custom Setup” from First‑Run.
- Goal (Intent)
  - Choose specific folders for indexing.
- Steps
  - OS picker to select folders → Optional per‑path include toggles → Start indexing.
- Feedback
  - Pre‑scan totals for selected paths; privacy line remains visible.
- Exit
  - Same as Quick Start: background indexing + Library.
- Metrics
  - customStartConversion, pathCountSelected, totalBytesSelected.

## 3. First‑Run: Demo Mode
- Trigger
  - User chooses “Try Demo”.
- Goal (Intent)
  - See value without committing personal folders.
- Steps
  - Load demo library; index quickly (or ship precomputed demo index).
- Feedback
  - Context chips and “Try these searches” appear.
- Exit
  - User can search, open photos, explore.
- Metrics
  - demoVsRealLibrary, ttfvDemo.

## 4. Return Visit (Cold Start)
- Trigger
  - App relaunches later.
- Goal (Intent)
  - Resume quickly; show library health.
- Steps
  - Load last dir; auto‑refresh diagnostics; if drift detected, suggest reindex.
- Feedback
  - Indexed chip shows “Indexed X” + coverage/health tooltip; Jobs pill if active tasks.
- Exit
  - User searches or browses.
- Metrics
  - sessionResumeOk, driftDetected, reindexClicked.

## 5. Search: Natural Language (TTFV)
- Trigger
  - User types in SearchBar and hits Enter.
- Goal (Intent)
  - Find a specific photo now.
- Steps
  - Type “kids at the beach” → Enter.
- Feedback
  - Busy note → Results grid with progressive thumbs; top matches first.
  - Empty‑state shows smart suggestions if nothing found.
- Exit
  - Open photo (Lightbox), export, or refine.
- Metrics
  - querySuccessRate, firstResultClickTime, resultsLatency.

## 6. Search: Fielded / Boolean
- Trigger
  - User adds filters or uses suggestions (person:, camera:, has_text:, filetype:, iso:, etc.).
- Goal (Intent)
  - Narrow results precisely.
- Steps
  - Use chips (People/Tags/Cameras/Places/Text/Video) or Advanced Search builder.
  - Enter boolean: person:"Alice" AND has_text:true AND camera:"iPhone".
- Feedback
  - Inline “!” warnings for syntax; query preview in advanced modal.
  - Results update; tooltip lists query warnings (if any).
- Exit
  - Save as Smart Collection (optional); continue exploring.
- Metrics
  - advancedSearchUsage, warningsShown, savedPresetRate.

## 7. Timeline View
- Trigger
  - Toggle Results → Timeline; switch Bucket (day/week/month) or jump (T/M/L/O keys).
- Goal (Intent)
  - Browse by time quickly.
- Steps
  - Use month scrubber; click section headers; open photo.
- Feedback
  - Sticky headers show counts; lazy EXIF/mtime chips on overlay.
- Exit
  - Open photo or switch back to grid.
- Metrics
  - timelineUsage, scrubberClicks, timeToOpenPhoto.

## 8. People (Faces)
- Trigger
  - Open People view (or use person: chips).
- Goal (Intent)
  - Find photos of specific people/pets.
- Steps
  - Build Faces (background) → Name clusters → Filter by person.
- Feedback
  - Progress in Jobs; cluster thumbnails; “Name saved” toasts.
- Exit
  - person:"Name" added to query or open cluster.
- Metrics
  - facesBuildCount, clusterNamedRate, peopleFilterUsage.

## 9. OCR (Text‑in‑Image)
- Trigger
  - “Text” chip; has_text:true; OCR pill hover.
- Goal (Intent)
  - Find images with text (receipts, slides, documents).
- Steps
  - If OCR not ready: build OCR from chip or settings; otherwise search has_text:true or quoted terms.
- Feedback
  - OCR pill “ready”; snippets API shows previews; progress/ETA in Jobs.
- Exit
  - Results filtered; user opens/exports.
- Metrics
  - ocrBuildCount, textSearchUsage, snippetFetches.

## 10. Captions (VLM) [Optional]
- Trigger
  - User opts into captions build (local model) for stronger descriptions.
- Goal (Intent)
  - Improve semantic search for complex scenes.
- Steps
  - Start Captions build in background; continue working.
- Feedback
  - Jobs shows build; chip tooltip includes updates.
- Exit
  - Search quality improves; Advanced filters can include captions toggle.
- Metrics
  - captionsBuildCount, captionsSearchUsage.

## 11. Collections & Smart Collections
- Trigger
  - From results or sidebar.
- Goal (Intent)
  - Organize sets; save dynamic rules.
- Steps
  - Save as Collection (static) or Smart (rules); open/run Smart.
- Feedback
  - Toasts for save/open/delete; rules preview.
- Exit
  - Quick access via sidebar.
- Metrics
  - collectionCreateRate, smartCreateRate, smartOpenRate.

## 12. Favorites & Ratings
- Trigger
  - Star/rate from grid or lightbox.
- Goal (Intent)
  - Triage quality quickly.
- Steps
  - Assign rating 1–5; filter by min rating; add Favorites.
- Feedback
  - Overlay shows rating; filter chip highlights.
- Exit
  - Results reflect rating filters.
- Metrics
  - ratingUsage, favoriteUsage.

## 13. Export / Share (Local)
- Trigger
  - Select photos → Export or Share (local).
- Goal (Intent)
  - Get photos out safely.
- Steps
  - Export to folder (copy/symlink; EXIF strip optional) or Create local share link (if feature gated).
- Feedback
  - Toast: “Exported N, skipped M” or “Share link copied”.
- Exit
  - Finder/Explorer opens or link on clipboard.
- Metrics
  - exportUseRate, shareCreateRate.

## 14. Delete (Safe)
- Trigger
  - Select photos → Delete.
- Goal (Intent)
  - Remove unwanted items safely.
- Steps
  - Confirm → Move to OS Trash (or app trash with Undo).
- Feedback
  - Toast with Undo (10s) when app trash used; note for OS trash.
- Exit
  - Selection cleared; Undo optional.
- Metrics
  - deleteRate, undoRate.

## 15. Duplicates (Lookalikes)
- Trigger
  - Open Lookalikes view.
- Goal (Intent)
  - Find and resolve duplicate/near‑duplicate shots.
- Steps
  - Scan (background); group and resolve; tag or delete.
- Feedback
  - Groups list with representative thumbnails; “Resolved” status.
- Exit
  - Reduced clutter; metrics updated.
- Metrics
  - lookalikeGroupsFound, resolvedGroups.

## 16. Trips & Events
- Trigger
  - Build Trips (background) or open Trips view.
- Goal (Intent)
  - Navigate memories by trips/events.
- Steps
  - Build trips; open a trip; view highlights.
- Feedback
  - Counts; place/time labels.
- Exit
  - Open trip results; save as Collection/Smart.
- Metrics
  - tripsBuildCount, tripsOpenRate.

## 17. Jobs Center (Long tasks)
- Trigger
  - Jobs chip/link when tasks active.
- Goal (Intent)
  - See progress; pause/resume; cancel.
- Steps
  - Open Jobs; manage index/OCR/captions/fast builds.
- Feedback
  - Per‑task progress, ETA; resumable between chunks.
- Exit
  - Tasks complete or paused safely.
- Metrics
  - jobPauseRate, jobResumeRate, jobCancelRate.

## 18. Help & Shortcuts
- Trigger
  - Press “?” or click Help.
- Goal (Intent)
  - Learn just‑enough controls.
- Steps
  - View “Most Useful” shortcuts; skim full list.
- Feedback
  - Modal explains: / focus search, i overlay, a advanced, t/m/l/o timeline.
- Exit
  - Close modal; continue flow.
- Metrics
  - helpModalUsage, shortcutUseCounts.

## 19. Settings
- Trigger
  - Open Settings (folder selection, engine config, toggles).
- Goal (Intent)
  - Configure without breaking flow.
- Steps
  - Change dir; toggle OCR/captions; choose fast index engine.
- Feedback
  - Indexed chip updates; warnings on missing models or low disk.
- Exit
  - Return to previous context.
- Metrics
  - settingsChangeRate, dirChangeRate.

## 20. Workspace (Multi‑folder)
- Trigger
  - Add folders to workspace; search across all.
- Goal (Intent)
  - One search across multiple roots.
- Steps
  - Add folders; search_workspace path.
- Feedback
  - Badge indicating multi‑folder search; performance guardrails.
- Exit
  - Results unified.
- Metrics
  - workspaceAddRate, workspaceSearchUsage.

## 21. Error/Edge Cases
- Triggers & Goals
  - No photos found → Offer Demo or add folders.
  - Low disk → Warn and pause optional tasks.
  - GPU missing → Fallback to CPU; warn only if perf impacted.
  - Large libraries → Suggest Fast index build (Annoy/FAISS/HNSW) and chunk sizes.
  - Permissions → Prompt with clear “why”.
- Feedback
  - Clear error toasts; link to Help; non‑blocking where safe.
- Metrics
  - errorCounts by category; recoveryRates.

## 22. Update & Restart
- Trigger
  - App update available.
- Goal (Intent)
  - Stay current without losing context.
- Steps
  - Download in background; prompt to restart later.
- Feedback
  - Changelog highlights; safe retry.
- Exit
  - Relaunch restores last view and query.
- Metrics
  - updateInstallRate, relaunchResumeOk.

## 23. Close App
- Trigger
  - Quit from menu or window close.
- Goal (Intent)
  - Exit safely; resume next time.
- Steps
  - If long jobs active: offer “Continue in background” or “Pause and quit”.
- Feedback
  - Toast/notification confirms background work if supported.
- Exit
  - App quits; next launch resumes.
- Metrics
  - quitWithActiveJobs, backgroundContinueRate.

---

## Cross‑cutting Principles
- Local‑only by default; no network required; clear copy in First‑Run and Status bar.
- Smart defaults with transparency and reversibility (Pause/Resume, Undo, OS Trash).
- Time‑to‑first‑value prioritized: Quick Start → Search immediately while indexing.
- Accessibility: keyboard first, high contrast, readable sizes.
- Measurable (local analytics) for continuous improvement.

---

## Roadmap TODOs (Derived)
- Inline coverage/health under Indexed chip; humanized ETA and rate.
- OCR hover card with count and one‑click build.
- Video presets dropdown; more contextual chips in SearchBar.
- Richer markdown in Tasks (links, code, emphasis).
- Per‑path include toggles in First‑Run with live totals.

