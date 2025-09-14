Error Logging and Deep‑Linking

Overview
- Error logging: Use `handleError` to capture user‑facing errors and optionally send them to the backend analytics log for diagnosis.
- Deep‑links: Encode active search query and filters into the URL so users can bookmark/share state. On load, the app decodes and applies those filters.

Error Logging
- Import: `import { handleError } from "../utils/errors";`
- Basic usage:
  - `handleError(error, { logToConsole: true, showToast: true })`
- Log to server analytics:
  - `handleError(error, { logToServer: true, context: { action: "index", component: "LibraryContext.index", dir } })`
  - `dir` should be the active library folder. If omitted, `handleError` attempts to read it from persisted settings.
- Explicit logging helper:
  - `await logServerError(error, { dir, action: "export", component: "usePhotoActions" })`
- Backend endpoint: `POST /analytics/log` with `{ dir, type, data }`. The client uses `apiAnalyticsLog(dir, "error", payload)`.

When to log to server
- Indexing build failures (index, pause/resume flows)
- OCR build, metadata build
- Tag/favorite/collection mutations; batch operations
- Export/delete/undo delete flows; share creation
- Search failures and demo‑setup failures
- Diagnostics load failures
- Niche services on user‑impactful failure (kept low‑noise):
  - Offline queue max‑retry reached (action type + dir)
  - Image loading (sampled)
  - Video info extraction
  - Offline photo caching and retrieval

Deep‑Link Parameters
The app encodes/decodes these into `location.search`:
- `q`: search query string
- `tags`: CSV of tags
- `fav`: "1" if favorites‑only
- `rating_min`: minimum rating (0–5)
- `date_from`, `date_to`: ISO date (yyyy-mm-dd)
- `place`: place string
- `camera`: camera model
- `iso_min`, `iso_max`: ISO bounds (number)
- `f_min`, `f_max`: aperture bounds (number)
- `has_text`: "1" when OCR text required
- `person`: single person
- `persons`: CSV of people (AND filter)
- `fast`: "1" when using fast engine
- `fast_kind`: fast engine kind (annoy|faiss|hnsw)
- `caps`: "1" when using caption search
- `ocr`: "1" when using OCR search
- `rv`: results view (grid|timeline)
- `tb`: timeline bucket (day|week|month)

Examples
- Encode before navigation:
  - `const sp = new URLSearchParams(); sp.set("q", q); if (favOnly) sp.set("fav","1"); ... navigate({ pathname: "/search", search: "?"+sp.toString() });`
- Decode on load:
  - `const sp = new URLSearchParams(location.search); const q = sp.get("q") || ""; const tagsCSV = sp.get("tags") || ""; ...`

Testing Notes
- Most unit tests do not depend on analytics logging. `handleError` is fail‑safe and won’t throw if logging fails.
- For UI tests that use lazy image loading, consider polyfilling `IntersectionObserver` in the test setup if a component requires it.
