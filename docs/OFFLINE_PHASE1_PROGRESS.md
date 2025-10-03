# Offline First Implementation – Phase 1 Progress (Tasks 1–4)

Last updated: 2025-10-03

## 1. Goals (Task 1 – Completed)

Defined acceptance criteria for initial offline milestone:

| Goal                       | Acceptance Criterion                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Offline cold start gallery | App loads demo photos (or cached set) with backend unreachable / `OFFLINE_MODE=1` – no blocking spinner on `/library`. |
| Deterministic preload      | Initial photo set materializes from local manifest or cache before any network fetch attempt.                          |
| Graceful search downgrade  | Filename/token search works offline; semantic only when online.                                                        |
| Thumbnails resilient       | Placeholder or cached thumb without layout jank.                                                                       |
| Rollout safety             | Controlled by `VITE_OFFLINE_GRID` + `VITE_FORCE_OFFLINE`.                                                              |
| Minimal coupling           | UI decoupled from direct API calls post‑refactor.                                                                      |

Non‑Goals (Phase 1): Deep EXIF search, offline embedding generation, OCR search, face clustering.

## 2. Existing Data Flow Audit (Task 2 – Completed)

### Findings

- Library fetch entirely API dependent.
- UI components lack source provenance.
- Store missing preload & dedupe logic.
- Offline services not wired into gallery path.
- Search context calls online `search()` directly.

### Injection Points

1. Bootstrap: select data source + preload.
2. Store: `preloadPhotos()` with source flag.
3. Search: route through abstraction for offline fallback.
4. Thumbnails: centralized resolver (cache → file → API → placeholder).

## 3. Offline Services Assessment (Task 3 – Completed)

| Component                    | Strengths                     | Gaps (Phase 1 relevance)                              |
| ---------------------------- | ----------------------------- | ----------------------------------------------------- |
| EnhancedOfflineStorage       | Robust schema & CRUD          | No hash/version, no dedicated thumb helpers           |
| EnhancedOfflineSearchService | Keyword + embedding scaffolds | OCR/embedding generation stubs                        |
| offline/api/offline.ts       | Caches opportunistically      | No manifest ingestion, sequential slow metadata pulls |
| OfflineService               | Connectivity + queue          | Not tied to gallery preload/manifest lifecycle        |
| offline-setup.ts             | Central init                  | Does not attempt manifest load/precache               |

Key Gaps Remaining: manifest pipeline; store preload; offline search integration; thumbnail resolver; feature flags.

## 4. Data Source Abstraction (Task 4 – Completed)

Files Added:

- `PhotoDataSource.ts` – interfaces, selection logic.
- `OfflineManifestSource.ts` – manifest list + token search (filename).
- `OnlineAPISource.ts` – fetch-based list/search placeholder.

Selection Heuristic:

```text
forceOffline => offline manifest source
else if (!online && offlineGridEnabled) => offline manifest source
else => online API source
```

Benefits: testability, incremental rollout, extensibility.

## 5. Target Runtime Flow (Post Integration)

```text
Bootstrap → selectDataSource() → list() → store.preloadPhotos() → Grid render
Search → dataSource.search() (offline token or online semantic)
Thumbnails → resolver (cache/file/API/placeholder)
```

## 6. Risks & Mitigations

| Risk                          | Mitigation                             |
| ----------------------------- | -------------------------------------- |
| Manifest drift                | Include hash + regeneration path       |
| Memory pressure               | Pagination via list(offset, limit)     |
| Offline search weak relevance | Token baseline now; embeddings later   |
| Thumbnail flicker             | Placeholder-first, later queued decode |
| API drift                     | Encapsulated online source layer       |

## 7. Immediate Next Steps (Tasks 5–9 Focus)

| Task | Output                               | Priority |
| ---- | ------------------------------------ | -------- |
| 5    | `demo_manifest.json` + hash + script | P0       |
| 6    | IndexedDB manifest caching by hash   | P0       |
| 7    | Store preload + source tracking      | P0       |
| 8    | Wire OfflineManifestSource loader    | P0       |
| 9    | Thumbnail resolver & caching         | P1       |

Milestone A: Complete 5–8 + bootstrap wiring + flag gating.

## 8. Acceptance Snapshot

| Criterion             | Status                | Notes                                                      |
| --------------------- | --------------------- | ---------------------------------------------------------- |
| Offline gallery       | In progress           | Needs manifest + preload                                   |
| Deterministic preload | Interface ready       | Store wiring pending                                       |
| Search downgrade      | Partial               | Offline token search implemented in source, not integrated |
| Thumbnails resilience | Placeholder only      | Resolver pending                                           |
| Rollout flags         | Not yet               | Will add Task 23                                           |
| Decoupled UI          | Achieved structurally | Grid still to refactor                                     |

## 9. Integration Sequence (Planned)

1. Generate manifest.
2. Persist & version (hash) in IndexedDB.
3. Extend store + preload at bootstrap.
4. Refactor grid to consume store data.
5. Add feature flags & guard rails.
6. Add thumbnail resolver & caching.
7. Add tests & docs.

## 10. Open Decisions

| Topic                | Pending Choice                             |
| -------------------- | ------------------------------------------ |
| Dimension extraction | Prefer `image-size` (lighter)              |
| Manifest refresh     | Manual trigger first                       |
| Pagination default   | Initial window (e.g. 300) then lazy append |
| Hash scope           | Metadata-only Phase 1                      |

## 11. Glossary

| Term              | Definition                                   |
| ----------------- | -------------------------------------------- |
| Manifest          | JSON inventory of photos for offline preload |
| Data Source       | Swappable list/search provider abstraction   |
| Placeholder Thumb | Temporary non-final image surface            |

## 12. Next Author Action

Implement Task 5 manifest generator script -> commit -> proceed to caching (Task 6).

## 13. Changelog

| Date       | Change                                                    |
| ---------- | --------------------------------------------------------- |
| 2025-10-03 | Initial offline progress document + abstraction scaffolds |

## 14. Maintenance

Update after completing clusters: (5–8), 9, 14, 23, 26–28 for traceability.

---

End of document.
