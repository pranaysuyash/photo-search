# Fast ANN Indexes

This project supports optional approximate nearest neighbor (ANN) backends to accelerate semantic photo search over large libraries. They are **optional** runtime accelerators layered on top of the deterministic base (exact vector similarity) search.

## Goals

- Provide faster top‑K retrieval for large collections while preserving deterministic ordering (final scores still based on embedding similarity)
- Avoid hard runtime dependency on heavy native libraries (faiss / hnswlib) so core experience works out‑of‑the‑box
- Offer a single abstraction and uniform status surface for UI, CLI, and API

## Backends

| Kind  | Library                | Metric                            | Notes                          |
| ----- | ---------------------- | --------------------------------- | ------------------------------ |
| faiss | `faiss-cpu` (optional) | Inner Product (normalized cosine) | Highest priority if available. |
| hnsw  | `hnswlib` (optional)   | Cosine                            | Middle priority.               |
| annoy | `annoy` (optional)     | Angular (cosine)                  | Lightest dependency.           |

Priority (auto selection): `faiss > hnsw > annoy > exact`.

If none are available or built, system transparently falls back to the exact in‑memory search.

## FastIndexManager Abstraction

`infra/fast_index.py` exposes a small orchestrator over `IndexStore`:

```
class FastIndexManager:
    def build(self, kind: str) -> bool
    def status(self) -> Dict[str, Any]
    def search(self, embedder, query, top_k=12, use_fast=False, fast_kind_hint=None, subset=None) -> (results, meta)
```

Status schema:

```
{
  "backends": [
    {"kind": "faiss", "available": true,  "built": true,  "size": 10450, "dim": 512, "error": null},
    {"kind": "hnsw",  "available": false, "built": false, "size": null,  "dim": null, "error": null},
    {"kind": "annoy", "available": true,  "built": false, "size": null,  "dim": null, "error": null}
  ]
}
```

- `available`: Library import succeeded
- `built`: Index artifact present for the collection + embedding key
- `size` / `dim`: Populated only when `built` is true
- `error`: Captures backend‑specific exceptions (defensive; should normally be null)

Search metadata (`meta`) returned internally and surfaced via API:

```
{
  "backend": "faiss" | "hnsw" | "annoy" | "exact",
  "fallback": false,           # true if explicit request failed and we fell back
  "requested": "auto" | "faiss" | "...", # original user hint
  "use_fast": true
}
```

## API Endpoints

| Method | Path           | Purpose                                                                             |
| ------ | -------------- | ----------------------------------------------------------------------------------- | ---- | ----- | ------------------------------------------------------------ |
| POST   | `/fast/build`  | Build a specific backend for a directory `{dir, kind}`                              |
| GET    | `/fast/status` | Inspect status for a directory (optionally provider)                                |
| POST   | `/search`      | Existing endpoint; when form includes `use_fast=1` and optional `fast_kind` (`faiss | hnsw | annoy | auto`) response gains `fast_backend`+`fast_fallback` fields. |

### Build

```
POST /fast/build
{
  "dir": "/absolute/photo/dir",
  "kind": "annoy"   // faiss|hnsw|annoy
}
```

Response:

```
{ "ok": true, "kind": "annoy" }
```

( `ok:false` if library missing or no base embeddings yet )

### Status

```
GET /fast/status?dir=/absolute/photo/dir
```

Response: status schema above.

### Search (excerpt)

Form fields of interest:

- `use_fast=1` – opt into fast selection
- `fast_kind=auto` (default) or explicit `faiss|hnsw|annoy|exact`

Response additional keys:

```
{
  ... existing payload ...
  "fast_backend": "annoy",
  "fast_fallback": false
}
```

If no fast index was usable, `fast_backend` will be `exact` and `fast_fallback` may be true if a specific backend was requested but unavailable.

## CLI Support

```
# Build a fast index (annoy example)
python cli.py fast build --dir /photos --kind annoy

# Show status
python cli.py fast status --dir /photos
```

## Build Conditions & Lifecycle

1. You must have run a base embedding index first (`cli.py index ...`).
2. A build is specific to the combination `(directory, embedder.index_id)`.
3. Rebuilding is idempotent: subsequent builds replace or update the index; stale artifacts are overwritten.
4. If images change (added/removed) you should re-run `index` then optionally rebuild fast indexes.

## When to Use Each Backend

- Small (<5k photos): Exact is usually fine; overhead of ANN build may not pay off.
- Medium (5k–30k): Annoy or HNSW provide good speedups with modest memory.
- Large (30k+): FAISS (if available) tends to offer best performance/recall tradeoff.

## Failure & Fallback Semantics

- Missing library import: `available=false`, build returns False, search simply uses exact.
- Explicit request (e.g. `fast_kind=faiss`) when faiss not built: `backend=exact`, `fallback=true`.
- Auto selection: first priority backend that is both built and available is chosen; else exact.

## Deterministic Ordering Guarantee

Even when ANN backend picks candidate neighbors, final ordering of returned results is ranked by the underlying similarity scores produced by the standard embedding comparison path to maintain deterministic responses.

## Performance Considerations

- ANN build time grows roughly O(N log N) depending on backend.
- Memory footprint: each backend stores its own structure in the index directory; monitor disk usage if building multiple backends.

## Adding a New Backend (Future)

1. Implement build/search methods on `IndexStore` (e.g. `build_new()`, `search_new()` + `new_status`).
2. Extend `_PREF_ORDER` and `_backend_status` in `fast_index.py`.
3. Add choice to CLI + API validation sets.
4. Document in this file with priority position.
5. Provide tests mirroring the existing manager behavior.

## Troubleshooting

| Symptom                         | Cause                                      | Resolution                             |
| ------------------------------- | ------------------------------------------ | -------------------------------------- |
| `available=false` after install | Running in different venv                  | Activate venv used for indexing & API. |
| Build returns `ok=false`        | Library missing or no embeddings yet       | Install lib or run base `index` first. |
| Search always `exact`           | No built+available backend                 | Build at least one backend.            |
| `fast_fallback=true`            | Explicit backend requested but unavailable | Build it or change `fast_kind=auto`.   |

## Environment Notes

FAISS wheels may not be available for all platforms; if installation is difficult use `annoy` or `hnswlib` first. None are mandatory for correctness.

---

Maintainer Guidance: keep this document synchronized with any changes to selection logic or response metadata keys.
