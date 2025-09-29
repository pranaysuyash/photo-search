# Adaptive Attention Implementation Scopes

_Last updated: 2025-09-29_

This document decomposes every Phase 1–3 feature from `ADAPTIVE_ATTENTION_FEATURES_PLAN.md` into concrete engineering tasks (backend, frontend, tests, risks) so tickets/PRs can be cut directly. Each scope is intentionally thin-sliced to allow parallelization and incremental delivery.

## Legend

- Effort: S (<0.5d), M (0.5–1.5d), L (multi-day)
- Status: pending | in-progress | done
- Risk Levels: low | med | high

---

## Phase 1 (Foundation) Scopes

### 1. Structured Interaction Events (Writer)

**Goal:** Extend analytics pipeline to record typed interaction events for views, favorites, edits, shares.

| Aspect   | Details                                                                                                                                                                                                                            |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend  | Add helper `infra/attention_events.py` (or extend `analytics.py`) with `log_interaction(path, kind, session_id, source)`. Ensure rotation uses existing `AnalyticsStore`. Session id derived from monotonic inactivity >15m reset. |
| Frontend | Add IPC call in Electron preload + React hook in viewer & grid to call `/attention/event` or send batched events (deferred—Phase 1 backend only).                                                                                  |
| Data     | JSONL append; one line per event with epoch ms numeric field `t`.                                                                                                                                                                  |
| Tests    | Unit: append 5 events → parse back; ensure ordering preserved.                                                                                                                                                                     |
| Risks    | High event volume: mitigate by deferring writes w/ small in-memory buffer (flush on interval or before exit).                                                                                                                      |
| Effort   | M                                                                                                                                                                                                                                  |

### 2. Aggregation Engine

**Goal:** Compute per-photo interaction aggregates & popularity using decay.

| Aspect  | Details                                                                                                                                                                                 |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend | New module `infra/attention_aggregator.py` with `build(full: bool)` and `incremental(since_ts)` paths. Cache file: `aggregates.json`. Popularity computed as Σ(weight \* exp(-λΔdays)). |
| CLI     | Add optional command via existing CLI pattern: `cli.py attention rebuild --dir /path`.                                                                                                  |
| API     | Endpoint triggers lazy rebuild if cache stale.                                                                                                                                          |
| Tests   | Simulate events with fixed timestamps; validate expected popularity rounding tolerance ±1e-6.                                                                                           |
| Risks   | Timezone / clock drift; mitigate by using monotonic now for Δ and wall clock for storage.                                                                                               |
| Effort  | M                                                                                                                                                                                       |

### 3. Popularity Endpoint & Use Case

**Goal:** Provide top-N popularity ranked photos + size class mapping.

| Backend | `usecases/get_popularity.py`: loads aggregates, returns list of DTOs {path, score, size_class, last_view}. |
| API | `GET /attention/popularity?dir=..&limit=..` returns JSON; enforces directory existence. |
| UI | Placeholder store call (Phase 1 limited UI). |
| Tests | Unit: size class boundaries (score=0→1, high scores clamp at 4). API smoke ensures shape. |
| Effort | S |

### 4. Forgotten Gems Endpoint

**Goal:** Surface stale photos with oldest `last_view` or never viewed.

| Backend | Add helper in same use case file computing candidates where `last_view` missing OR > threshold days (default 365). |
| API | `/attention/forgotten` with optional `days` override + `limit`. |
| Tests | Inject mock aggregates; assert ordering by staleness descending. |
| Effort | S |

### 5. Seasonal Resurfacing Endpoint

**Goal:** Photos taken around same week-of-year ±N days.

| Backend | Use existing EXIF mtime (already stored) + optional future `taken_at` field. Compute week difference modulo 52. |
| API | `/attention/seasonal?dir=..&window=7&limit=..`. |
| Tests | Controlled mtime fixtures to assert selection. |
| Effort | S |

### 6. Action Badges Data

**Goal:** Provide per-photo action counts for overlay badges.

| Backend | Include counts in popularity endpoint payload (augment aggregator output). |
| Frontend | Later renders icon set (heart/share/edit). Phase 1 just passes through. |
| Tests | Aggregator returns counts; ensure zero default. |
| Effort | S |

### 7. Dedupe Stack Exposure

**Goal:** Expose existing aHash groups via attention router.

| Backend | Reuse `infra/dupes.find_lookalikes`; new endpoint `/attention/dupes?dir=..`. Optionally returns group id + representative path (first). |
| UI | Later collapse groups. |
| Tests | Provide two near-identical images, build hash file, assert grouping length >=2. |
| Effort | M |

### 8. Serendipity / Weighted Shuffle

**Goal:** Return a randomized but biased sample of photos, weighting low-score & stale items.

| Backend | Endpoint `/attention/shuffle?dir=..&limit=..` uses reservoir sampling on aggregates with weight = f(staleness, 1/(1+score)). |
| Tests | Statistical sanity: run 100 draws; ensure low-score appear > baseline proportion (chi-squared loose threshold). Mark flaky as allowed. |
| Effort | M |

### 9. Clear Interaction Data

**Goal:** Purge analytics + aggregates.

| Backend | `/attention/clear?dir=..` deletes `analytics.jsonl` (rotations) + `aggregates.json`. |
| UI | Settings action (later). |
| Tests | Create files, call endpoint, assert removal. |
| Effort | S |

### 10. Adaptive Grid (Frontend Skeleton)

**Goal:** Implement size class mapping & placeholder layout.

| Frontend | Create `useAttentionStore` (Zustand) + `AdaptiveGallery` that accepts `{path,size_class}`; use CSS grid row/column span classes. |
| Backend | Already served via popularity endpoint. |
| Tests | Vitest: mapping hook returns stable order given sample data. Playwright: screenshot baseline. |
| Effort | M |

---

## Phase 2 Scopes

### 11. Co-View Tracking

| Backend | Extend interaction events: on open, update in-memory session deque; persist pair counts batch. Aggregator merges into `co_view` list. |
| API | `/attention/related?dir=..&path=..` returns top neighbor weights. |
| Tests | Sequence of open events generates expected pair weight. |
| Effort | M |

### 12. Insights Dashboard

| Backend | Summaries: total views 7d/30d, top rising (delta last 7d vs prior), favorites ratio. Endpoint `/analytics/insights` (may reuse analytics router or attention). |
| Frontend | Mini charts (Recharts / lightweight). |
| Tests | Controlled synthetic events produce expected JSON. |
| Effort | M |

### 13. Mood / Color Extraction

| Backend | Add `infra/color_index.py` computing dominant color + optional palette at import; store in `color_index.json`. |
| API | Extend popularity endpoint to filter by `color=` or add `/attention/colors`. |
| Tests | Known RGB squares map to correct hex. |
| Effort | M |

### 14. Search Re-Rank with Popularity & Feedback

| Backend | Modify search pipeline (post similarity) blending formula with α; guard by feature flag env or request param. |
| Tests | Mock similarity + popularity arrays to assert blend logic. |
| Effort | S |

### 15. Related Strip (Lightbox)

| Frontend | Component fetches `/attention/related` when viewer opens. Horizontal scroll list with fallback skeleton. |
| Tests | Vitest component mount; network mocked. |
| Effort | S |

---

## Phase 3 Scopes

### 16. Storyline / Trail View

| Backend | Build simple graph from co-view + time adjacency; export nodes/edges; endpoint `/attention/storyline?dir=..&path=..`. |
| Frontend | Force-directed / linear timeline hybrid (defer heavy libs; maybe D3-lite). |
| Tests | Graph produced for synthetic path sequence. |
| Effort | L |

### 17. Heatmap Attention (Zoom/Pan)

| Frontend | Instrument viewer to record viewport rectangles (throttled). Batch send to `/attention/heatmap` endpoint. |
| Backend | Aggregate to per-photo 2D density grid (e.g., fixed 16×16). Stored in `heatmaps/<photo>.json`. |
| Effort | L |
| Tests | Generate sample rectangles; assert normalization. |

### 18. Popularity Propagation via Graph

| Backend | Use co-view graph to spread popularity to cold nodes via one-step random walk smoothing. |
| Tests | Synthetic graph with hub node increases neighbor scores. |
| Effort | M |

### 19. Optional SQLite Migration

| Backend | `infra/activity_store.py` + replay script `scripts/replay_events.py` to seed DB. |
| Tests | Replay determinism: aggregates identical pre/post migration. |
| Effort | M |

---

## Cross-Cutting Concerns

| Concern          | Handling                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Privacy          | All local; purge endpoint; README update.                                                                                                  |
| Performance      | Incremental aggregation + file rotation; limit memory via dict of primitives only.                                                         |
| Feature Flags    | Environment variable or config entries: `ATTENTION_ENABLE_RERANK`, `ATTENTION_ENABLE_SERENDIPITY`.                                         |
| Error Handling   | Non-fatal (return empty arrays). Log only in debug mode.                                                                                   |
| Testing Strategy | Unit for pure logic, integration for endpoints, visual for adaptive layout, statistical for shuffle (allow flaky skip if improbable fail). |

---

## Initial Ticket Suggestions (Phase 1 Order)

1. FEAT: Add structured interaction event logger (backend)
2. FEAT: Implement attention aggregator + CLI command
3. FEAT: Popularity + forgotten + seasonal endpoints (router scaffold)
4. FEAT: Dedupe & badges data exposure
5. FEAT: Serendipity shuffle endpoint
6. FEAT: Clear attention data endpoint
7. FEAT: AdaptiveGallery frontend skeleton
8. CHORE: Tests & docs alignment; README privacy section update

---

## Ready For Implementation

Upon merge of scaffolding, proceed with "Ticket 1". Each ticket should update `ADAPTIVE_ATTENTION_FEATURES_PLAN.md` status table and append a short changelog note.
