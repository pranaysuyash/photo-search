# Adaptive Attention & Popularity Features Plan

_Last updated: 2025-09-29_

## 1. Executive Summary

We will evolve the photo experience from static search + browse into a **living, attention‑aware library**. The system will locally track lightweight interaction signals (views, favorites, edits, shares, co-views) and transform them into:

- Popularity‑weighted adaptive grids ("word cloud" sizing for photos)
- Serendipity resurfacing (forgotten gems, seasonal callbacks)
- Journey & related-photo discovery (session-based co-view graph)
- Action & status overlays (badges, interaction density, dedupe stacks)
- Offline analytics micro‑dashboard (“engagement for memories”)

All features must preserve: offline-first operation, privacy (events are local & user-clearable), graceful degradation (no ML models required for v1), incremental adoption (schema migrations isolated), and minimal runtime overhead.

## 2. Current State (Gap Analysis)

| Capability                     | Exists Today                           | Location / Notes                                     | Gap for Vision                                                              |
| ------------------------------ | -------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------- |
| Embedding search (CLIP)        | Yes                                    | `infra/index_store.py`                               | Need interaction-aware re-ranking (popularity, feedback boost merging)      |
| OCR / Caption blending         | Yes (optional)                         | `IndexStore.search_with_ocr`, `search_with_captions` | Integrate popularity & feedback weighting into combined score pipeline      |
| Feedback boost                 | Yes (per-query votes)                  | `infra/analytics.py` (`apply_feedback_boost`)        | Generalize to unified scoring function; merge with decay popularity         |
| Interaction logging (opens)    | Minimal (open events, searches)        | `infra/analytics.py` (JSONL)                         | Need structured interaction table (typed events, fast aggregation)          |
| Dedupe (perceptual hash)       | Basic aHash groups                     | `infra/dupes.py`                                     | Integrate into UI as “stacks” + resolution state in scoring (avoid clutter) |
| Favorites / Tags / Collections | Yes                                    | `usecases/manage_*`, infra modules                   | Feed favorites into weight formula; expose counts for badges                |
| Faces / Trips                  | Partial/Optional                       | `infra/faces.py`, `infra/trips.py`                   | Use for journey clustering / storyline later                                |
| Fast search (ANN)              | Yes (Annoy/FAISS/HNSW)                 | `IndexStore` fast functions                          | Extend scoring overlay—ANN retrieval then popularity re-rank                |
| UI dynamic layouts             | Not implemented (static grid variants) | Webapp                                               | Need adaptive span algorithm & deterministic layout caching                 |
| Seasonal resurfacing           | No                                     | —                                                    | Add date-based query + surfaced section                                     |
| Forgotten gems                 | No                                     | —                                                    | Compute stale photos with low recent interaction                            |
| Co-view journeys               | No                                     | —                                                    | Track session adjacency with rolling window                                 |
| Heatmaps / zoom                | No                                     | —                                                    | Out-of-scope v1 (defer instrumentation)                                     |
| Offline insights dashboard     | No                                     | —                                                    | Add minimalist charts fed by aggregated views                               |

## 3. Data Model Extensions (Planned)

We will avoid introducing a full RDBMS initially; continue leveraging **append-only JSONL + periodic aggregation cache**. If performance degrades for >250K events we introduce SQLite (migration path included below).

### 3.1 Event Envelope

```
{
  "type": "interaction",      // or search|feedback|system
  "kind": "view|favorite|share|edit",
  "path": "/abs/path/to/photo.jpg",
  "t": 1738192345123,         // epoch ms
  "session": "sess_8char",    // rolling session id (reset after inactivity >15m)
  "meta": {"source": "grid|lightbox|search_results"}
}
```

### 3.2 Aggregation Cache File (Derived)

`aggregates.json` (regenerated on demand or if stale > 6h):

```
{
  "photos": {
    "<path>": {
      "views": 12,
      "favorites": 2,
      "shares": 1,
      "edits": 0,
      "last_view": 1738192345123,
      "last_action": 1738192345123,
      "popularity": 14.72
    },
    ...
  },
  "co_view": [
    ["/a.jpg","/b.jpg", 5],   // weight counts co-occurrences within session window
    ...
  ],
  "generated_at": 1738200000000
}
```

### 3.3 Future SQLite Path (Deferred)

If JSONL parsing latency > 50ms for dashboard queries or library > ~30K photos:

1. Introduce `infra/activity_store.py` w/ SQLite (better-sqlite3 in Electron).
2. Migrate by replaying JSONL events into normalized tables (idempotent replay).
3. Keep JSONL for audit + portability; SQLite purely for acceleration.

## 4. Core Algorithms

### 4.1 Popularity Score (v1)

```
score(p) = Σ ( w(action) * exp(-λ * Δdays) )
weights: view=1, favorite=5, share=3, edit=4
λ (decay/day): 0.02 (half-life ≈ 34.7 days)
```

Implementation: streaming fold while scanning recent events; cache per photo.

### 4.2 Size Mapping for Adaptive Grid

```
raw = score
scaled = log1p(raw)
size_class = clamp( 1 + floor( scaled / S ), 1, 4 )
S default: 0.8 (tunable by preference)
```

Deterministic layout: stable sort by `(size_class DESC, last_view DESC, path)` w/ memoized shuffle for serendipity mode.

### 4.3 Serendipity Boost

Add small epsilon to stale low-score photos:

```
if days_since_last_view > 90 and raw < threshold_low:
  raw += random_uniform(0, 0.25)
```

Expose toggle in settings.

### 4.4 Forgotten Gems Selection

Filter: `last_view IS NULL OR days_since_last_view > 365` then rank by original capture date proximity to current week-of-year.

### 4.5 Co-View Graph Updates

Maintain in-memory LRU of last N (e.g., 20) opens in a session; for each new open, increment pair weights within a 5‑minute sliding window. Persist periodically to `aggregates.json` structure.

### 4.6 Feedback + Popularity Merge

When a search query is executed:

1. Retrieve base similarity scores.
2. Apply feedback boost (existing) → `s1`.
3. Blend with normalized popularity (min‑max across candidate set):

```
final = α * s1 + (1-α) * pop_norm
α default 0.85 (feature flag)
```

## 5. Feature Matrix (Expanded v2)

| Feature                         | Purpose                  | Signals                  | UI Representation               | Status            | Effort | Phase |
| ------------------------------- | ------------------------ | ------------------------ | ------------------------------- | ----------------- | ------ | ----- |
| Popularity-weighted grid        | Surface engaging photos  | interactions decay score | Masonry / CSS grid span scaling | New               | M      | P1    |
| Favorites weight integration    | Reward deliberate intent | favorite events          | Heart badge + weight boost      | Partial           | S      | P1    |
| Forgotten gems resurfacing      | Re-expose long-neglected | last_view, score         | Horizontal carousel section     | New               | S      | P1    |
| Seasonal resurfacing            | Nostalgia                | taken_at vs current date | "On this week" tray             | New               | S      | P1    |
| Co-view journeys                | Discover related sets    | co_view edges            | Lightbox related row            | New               | M      | P2    |
| Serendipity weighted shuffle    | Prevent stagnation       | score, staleness         | Shuffle button mode             | New               | S      | P1    |
| Action badges                   | At-a-glance context      | counts per action        | Small overlay icons             | New               | S      | P1    |
| Dedupe stacks integration       | Reduce clutter           | aHash groups             | Stack UI w/ collapse            | Existing (UI gap) | M      | P1    |
| Offline insights mini-dashboard | Transparency             | aggregated events        | Modal with sparklines           | New               | M      | P2    |
| Feedback + popularity blending  | Better ranking           | votes + interactions     | Rank improvements               | Partial           | S      | P1    |
| Co-view storyline (graph view)  | Exploratory browsing     | co_view graph            | Graph/Trail panel               | New               | L      | P3    |
| Mood/color filter               | Aesthetic discovery      | dominant color           | Color chips                     | Planned           | M      | P2    |
| Embedding-based related         | Semantic neighbors       | visual embedding         | “More like this”                | Existing core     | S      | P2    |
| Heatmap attention (zoom)        | Fine-grained interest    | viewport rectangles      | Canvas overlay                  | New               | L      | P3    |

Effort scale: S (<0.5d), M (0.5–1.5d), L (multi-day).

## 6. Phased Implementation Roadmap

### Phase 1 (Shipping Foundation)

1. Event model & writer (`analytics.append_event` extension) – add structured interaction kinds.
2. Aggregation builder (`infra/attention_aggregator.py`) – produce `aggregates.json` with popularity scores.
3. API endpoint `/attention/popularity` returning top N with size classes.
4. Frontend adaptive grid: size mapping, deterministic ordering, setting toggles.
5. Forgotten gems + seasonal resurfacing queries (lightweight endpoints).
6. Dedupe stack exposure: extend existing aHash results into UI.
7. Action badges overlay (counts memoized via aggregates).

### Phase 2 (Discovery & Insights)

1. Co-view tracking + related strip in viewer.
2. Insights mini-dashboard (views over time, top rising, favorites share %).
3. Mood/color extraction (dominant color & optional palette) – integrate into filters.
4. Popularity + feedback blended ranking for search results.

### Phase 3 (Advanced Exploration)

1. Storyline / trail view (session-based + metadata chaining).
2. Heatmap of attention (opt-in instrumentation for zoom/pan events).
3. Graph-based relevance (propagate popularity through co-view edges for cold photos).
4. Optional migration to SQLite if aggregation latency > thresholds.

## 7. API & Service Design

| Endpoint                | Method | Params           | Output                           | Notes                      |
| ----------------------- | ------ | ---------------- | -------------------------------- | -------------------------- |
| `/attention/popularity` | GET    | dir, limit       | [{path, score, size, last_view}] | Backed by aggregates cache |
| `/attention/forgotten`  | GET    | dir, limit       | [{path, reason}]                 | Pull stale photos          |
| `/attention/seasonal`   | GET    | dir, limit       | [{path, taken_at}]               | Week-of-year match         |
| `/attention/related`    | GET    | dir, path, limit | [{path, weight}]                 | Co-view pairs              |
| `/analytics/insights`   | GET    | dir              | summarized metrics               | Mini-dashboard             |

All endpoints read-only; no mutation. Interaction events are POSTed implicitly via existing open/view triggers (renderer emits IPC → backend writes event).

## 8. Module Additions

- `infra/attention_aggregator.py`: scan events → produce aggregates (pure functions + incremental update mode)
- `usecases/get_popularity.py`: orchestrates aggregator + returns DTOs
- `api/attention.py`: FastAPI router exposing endpoints above
- Frontend store: `useAttentionStore` (Zustand) caching responses + staleness TTL
- UI components: `AdaptiveGallery`, `ForgottenGemsCarousel`, `SeasonalTray`, `ActionBadges`, `RelatedStrip`

## 9. Performance & Scaling Considerations

| Concern                  | Strategy                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Large event file growth  | Rotate JSONL at 10k lines (already supported via `AnalyticsStore`), incremental aggregation only over new tail |
| Frequent grid recomputes | Debounce; recompute popularity at most every 30s or when event count delta > threshold                         |
| Memory overhead          | Store only numeric aggregates; discard raw recent event objects after fold                                     |
| ANN + re-rank cost       | Limit re-rank to displayed top K (≤ 200)                                                                       |

## 10. Privacy & Reset

- Provide "Clear Interaction Data" action → purge analytics JSONL + aggregates and regenerate empty state.
- Document local-only storage in README "Privacy" section update.
- No network transmission; code review check for outbound analytics.

## 11. Telemetry / Metrics (Local KPIs)

| KPI                                | Definition                             | Success Target (local, user-perceived) |
| ---------------------------------- | -------------------------------------- | -------------------------------------- |
| Grid Adaptation Latency            | Time from new view → updated tile size | < 2s (next refresh cycle)              |
| Aggregation Build Time (5k photos) | Full recompute wall time               | < 150ms                                |
| Forgotten Gems Engagement          | % of resurfaced photos opened          | > 10% (heuristic)                      |
| Popularity Score Freshness         | Age of aggregates cache on request     | < 10m                                  |

## 12. Risks & Mitigations

| Risk                            | Impact               | Mitigation                                                              |
| ------------------------------- | -------------------- | ----------------------------------------------------------------------- |
| Event JSONL parsing slowdown    | UI lag for analytics | Incremental aggregation cursor; migrate to SQLite if threshold exceeded |
| Layout thrash on re-rank        | Poor UX              | Stable ordering key; only animate size changes                          |
| Oversized tiles dominate        | Visual imbalance     | Clamp + nonlinear log scaling; preference slider                        |
| Privacy concerns about tracking | User distrust        | Clear, documented local-only storage + one-click purge                  |
| Stale aggregates due to crash   | Out-of-date scores   | On boot detect delta events >0 and rebuild lazily                       |

## 13. Verification Plan

| Item                                               | Test Type     | Tool                           |
| -------------------------------------------------- | ------------- | ------------------------------ |
| Popularity endpoint returns deterministic ordering | Unit          | pytest (mock events)           |
| Size class mapping boundaries                      | Unit          | pytest                         |
| Aggregator incremental correctness                 | Property test | hypothesis (optional)          |
| Forgotten gems selection logic                     | Unit          | pytest                         |
| Co-view graph weight accrual                       | Unit          | pytest session simulation      |
| Frontend adaptive grid visual regressions          | Visual        | Playwright screenshot diff     |
| Clear interaction data purges all derived state    | Integration   | Playwright + backend assertion |

## 14. Implementation Order (Detailed – Phase 1)

1. Extend analytics writer to accept structured interaction events.
2. Implement `attention_aggregator` (full + incremental modes, CLI hook for manual rebuild).
3. Add FastAPI router with endpoints + wire into main server import path.
4. Create use case modules for each endpoint (thin orchestration layer for consistency with architecture).
5. Frontend store + gallery component upgrade (size mapping & badges).
6. Forgotten gems + seasonal trays UI.
7. Dedupe stack integration (consume existing `dupes.py` output; add endpoint if needed).
8. Tests (backend unit) + basic Playwright scenario for adaptive grid.
9. Docs updates (README privacy & features snapshot + this plan linked from INDEX in docs folder).

## 15. Open Questions

- Should we unify feedback votes with generic interaction events? (Lean yes; treat positive feedback as `kind=feedback_positive`.)
- Expose score tuning UI (weights & decay) or hide behind advanced settings? (Start hidden; add advanced panel later.)
- Do we persist co-view edges in a normalized structure now? (Defer to Phase 2 – minimal array in aggregates first.)

## 16. Decision Log Hooks

Add entries to `docs/decisions/` when finalizing: (a) JSONL vs SQLite migration threshold, (b) popularity blending coefficient defaults, (c) privacy purge semantics.

---

**Next Action After Approval:** Implement Phase 1 step 1 (interaction event structuring) under a new branch `feature/attention-phase1` and add test scaffolding.
