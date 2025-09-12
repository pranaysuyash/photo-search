# Frontend Demo Guide

This guide equips you to demo the Intent‑First web app to users, partners, or investors. It explains the mental model, what to show first, and how to handle common questions — in 3–5 minutes.

## Who This Is For
- Product demos to prospects or leadership
- Investor overviews (vision + traction)
- New users onboarding sessions

## One‑Sentence Pitch
Search your photos by intent — start with what you remember, then add power filters only when you want to.

## Core Principles (What to Message)
- Search‑first: A command‑center overlay focuses on the “Find” intent.
- Progressive power: Filters and advanced grammar are there, but optional.
- Transparent state: Indexing, jobs, and OCR readiness are obvious.
- Keyboard‑first and accessible: “/” to open search, Esc to close, visible focus, labels.

## Pre‑Demo Checklist
- Backend API running (default http://localhost:8000). If auth is enabled, set `VITE_API_TOKEN` in `.env` or in `localStorage` as `api_token`.
- Some library indexed, or use “Try Demo Photos”.
- Feature flag: The Search Command Center is enabled by default. To toggle, update `photo-search-settings` in localStorage (`searchCommandCenter: true|false`).

## 3‑Minute Quick Demo Script
1. Open the app. Briefly point to the top bar and the “Search” button.
2. Press `/` to open Search. Type: `kids at the park` and hit Enter.
3. Re‑open Search → tap a People or Tag suggestion → press Enter.
4. Open Filters → choose “Text in Image”. Notice the token appears under the input.
5. Switch to Timeline and select “Week”; scroll briefly to show time buckets.

## 5‑Minute Extended Demo Script
1. Intent in plain language: “beach at sunset with family”. Run it.
2. Add a suggestion: person “Alex” → token forms (removable with ×).
3. Filters Drawer: choose “Sharp Only” and “Large”. Tokens update.
4. Advanced popover: `(rating:>=4 OR sharpness:>=60) AND camera:"iPhone"`. Explain Boolean only appears on demand; syntax help lives here.
5. Select one photo → “Similar” (show results); then “Similar + Text” to combine.
6. Save search as “Family Sunset” and show it in Saved.
7. Share (optional): create a view‑only link; copy to clipboard.
8. Call out status: Indexed chip, Jobs count, OCR chip; pause/resume indexing.

## Key UI Elements (What You’ll Show)
- Search Overlay: Input, suggestions (People/Tags/Cameras/History), applied tokens, Filters, Advanced.
- Results: Grid and Timeline (Day/Week/Month). Grid size controls.
- Selection actions: Tag, Add/Remove Collection, Delete, Similar, Similar+Text.
- System state: Indexed count, Jobs, OCR readiness, Diagnostics.

## Shortcuts (Say These Out Loud)
- Open Search: `/`  •  Close: `Esc`  •  Filters: `f`  •  Help: `?`  •  Save Search: `s`
- Timeline jumps (when in Timeline): `t` today, `m` this month, `l` last month, `o` oldest

## What “Progressive Power” Means
- New users see a single, calm Search field with guiding suggestions.
- Power users opt‑in to Filters (quality, filetype, size) and Advanced grammar.
- Everything you add becomes a token you can remove — no hidden state.

## Investor Talking Points
- Time‑to‑value: users find photos in seconds; demo works with sample data.
- Differentiation: intent‑first overlay, contextual suggestions, and tokenized filters.
- Extensibility: modular overlay — easy to add new sources and models.
- Reliability: clear background processing (Jobs), observable indexing, and graceful errors.

## Common Questions & Answers
**Q: Where did filters go?**
They’re in the Search overlay under “Filters”. We keep the main UI clean by default.

**Q: Can it search text inside images?**
Yes. Build OCR once; the small “OCR” chip confirms it’s ready.

**Q: Does it work offline?**
Basic browsing does. Network operations show non‑blocking toasts and keep the UI usable.

**Q: Can you undo delete?**
Yes when using the app Trash; OS Trash is system‑owned (no in‑app undo).

## Troubleshooting (Live Demo)
- If API requires a token: set `localStorage.setItem('api_token','<value>')` to match backend `API_TOKEN`.
- If suggestions don’t appear: ensure at least one index pass has completed.
- If the overlay isn’t visible: check `photo-search-settings` → `searchCommandCenter`.

## Appendix: Feature Map → Files
- Top bar launcher: `src/components/TopBar.tsx`
- Search overlay: `src/components/SearchOverlay.tsx`
- Search field + suggestions: `src/components/SearchBar.tsx`
- Jobs/Index chip: `src/components/TopBar.tsx`
- Keyboard: handled in `src/App.tsx` (global `/`, Esc)
- Styles: `src/styles-modern.css`

## Appendix: Example Phrases to Try
- “birthday cake at home”
- “city skyline at night”
- “text in image” + “invoice”
- “Alice and Bob at beach last summer”

