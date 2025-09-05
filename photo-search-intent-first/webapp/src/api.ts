export type SearchResult = { path: string; score: number }

const API_BASE = (import.meta as any).env?.VITE_API_BASE || (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8000')

async function post<T>(path: string, body: any): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function apiIndex(dir: string, provider: string, batchSize = 32, hfToken?: string, openaiKey?: string) {
  return post<{ new: number; updated: number; total: number }>(
    '/index',
    { dir, provider, batch_size: batchSize, hf_token: hfToken, openai_key: openaiKey },
  )
}

export async function apiSearch(
  dir: string,
  query: string,
  provider: string,
  topK = 24,
  opts?: {
    hfToken?: string; openaiKey?: string;
    favoritesOnly?: boolean; tags?: string[];
    dateFrom?: number; dateTo?: number;
    useFast?: boolean; fastKind?: string; useCaptions?: boolean;
    camera?: string; isoMin?: number; isoMax?: number; fMin?: number; fMax?: number;
    flash?: 'fired'|'noflash'; wb?: 'auto'|'manual'; metering?: string;
    altMin?: number; altMax?: number; headingMin?: number; headingMax?: number;
    place?: string; useOcr?: boolean; hasText?: boolean; person?: string; persons?: string[];
    sharpOnly?: boolean; excludeUnder?: boolean; excludeOver?: boolean;
  }
) {
  return post<{ search_id: string; results: SearchResult[] }>(
    '/search',
    {
      dir, provider, query, top_k: topK,
      hf_token: opts?.hfToken, openai_key: opts?.openaiKey,
      favorites_only: opts?.favoritesOnly, tags: opts?.tags,
      date_from: opts?.dateFrom, date_to: opts?.dateTo,
      use_fast: opts?.useFast, fast_kind: opts?.fastKind, use_captions: opts?.useCaptions, use_ocr: opts?.useOcr,
      camera: opts?.camera, iso_min: opts?.isoMin, iso_max: opts?.isoMax, f_min: opts?.fMin, f_max: opts?.fMax,
      flash: opts?.flash, wb: opts?.wb, metering: opts?.metering,
      alt_min: opts?.altMin, alt_max: opts?.altMax, heading_min: opts?.headingMin, heading_max: opts?.headingMax,
      place: opts?.place, has_text: opts?.hasText, person: opts?.person, persons: opts?.persons,
      sharp_only: opts?.sharpOnly, exclude_underexp: opts?.excludeUnder, exclude_overexp: opts?.excludeOver,
    },
  )
}

export async function apiSearchLikePlus(dir: string, path: string, provider: string, topK = 24, text?: string, weight = 0.5) {
  return post<{ results: SearchResult[] }>(
    '/search_like_plus',
    { dir, path, provider, top_k: topK, text, weight },
  )
}

export async function apiBuildCaptions(dir: string, vlmModel: string, provider: string, hfToken?: string, openaiKey?: string) {
  return post<{ updated: number }>(
    '/captions/build',
    { dir, vlm_model: vlmModel, provider, hf_token: hfToken, openai_key: openaiKey },
  )
}

export async function apiFeedback(dir: string, searchId: string, query: string, positives: string[], note: string) {
  return post<{ ok: boolean }>(
    '/feedback',
    { dir, search_id: searchId, query, positives, note },
  )
}

export async function apiGetFavorites(dir: string) {
  const r = await fetch(`${API_BASE}/favorites?dir=${encodeURIComponent(dir)}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<{ favorites: string[] }>
}

export async function apiSetFavorite(dir: string, path: string, favorite: boolean) {
  return post<{ ok: boolean; favorites: string[] }>(
    '/favorites',
    { dir, path, favorite },
  )
}

export async function apiGetSaved(dir: string) {
  const r = await fetch(`${API_BASE}/saved?dir=${encodeURIComponent(dir)}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<{ saved: { name: string; query: string; top_k?: number }[] }>
}

export async function apiAddSaved(dir: string, name: string, query: string, topK: number) {
  return post<{ ok: boolean; saved: any[] }>(
    '/saved',
    { dir, name, query, top_k: topK },
  )
}

export async function apiDeleteSaved(dir: string, name: string) {
  return post<{ ok: boolean; deleted: number; saved: any[] }>(
    '/saved/delete',
    { dir, name },
  )
}

export async function apiMap(dir: string) {
  const r = await fetch(`${API_BASE}/map?dir=${encodeURIComponent(dir)}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<{ points: { lat: number; lon: number }[] }>
}

export async function apiDiagnostics(dir: string, provider?: string) {
  const qs = new URLSearchParams({ dir })
  if (provider) qs.set('provider', provider)
  const r = await fetch(`${API_BASE}/diagnostics?${qs.toString()}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<{ folder: string; engines: { key: string; index_dir: string; count: number; fast?: { annoy: boolean; faiss: boolean; hnsw: boolean } }[]; free_gb: number; os: string }>
}

export async function apiLibrary(dir: string, provider: string, limit = 120, offset = 0) {
  const qs = new URLSearchParams({ dir, provider, limit: String(limit), offset: String(offset) })
  const r = await fetch(`${API_BASE}/library?${qs.toString()}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<{ total: number; offset: number; limit: number; paths: string[] }>
}

export async function apiBuildFast(dir: string, kind: 'annoy'|'faiss'|'hnsw', provider: string, hfToken?: string, openaiKey?: string) {
  return post<{ ok: boolean; kind: string }>(
    '/fast/build',
    { dir, kind, provider, hf_token: hfToken, openai_key: openaiKey },
  )
}

export async function apiBuildOCR(dir: string, provider: string, languages?: string[], hfToken?: string, openaiKey?: string) {
  return post<{ updated: number }>(
    '/ocr/build',
    { dir, provider, languages, hf_token: hfToken, openai_key: openaiKey },
  )
}

export async function apiLookalikes(dir: string, maxDistance = 5) {
  const r = await fetch(`${API_BASE}/lookalikes?dir=${encodeURIComponent(dir)}&max_distance=${maxDistance}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<{ groups: { id: string; paths: string[]; resolved: boolean }[] }>
}

export async function apiResolveLookalike(dir: string, paths: string[]) {
  return post<{ ok: boolean; id: string }>(
    '/lookalikes/resolve',
    { dir, group_paths: paths },
  )
}

export async function apiWorkspaceList() {
  const r = await fetch(`${API_BASE}/workspace`)
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<{ folders: string[] }>
}

export async function apiWorkspaceAdd(path: string) {
  return post<{ folders: string[] }>(
    '/workspace/add',
    { path },
  )
}

export async function apiWorkspaceRemove(path: string) {
  return post<{ folders: string[] }>(
    '/workspace/remove',
    { path },
  )
}

export async function apiMetadataDetail(dir: string, path: string) {
  const r = await fetch(`${API_BASE}/metadata/detail?dir=${encodeURIComponent(dir)}&path=${encodeURIComponent(path)}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<{ meta: any }>
}

export async function apiSearchWorkspace(
  dir: string,
  query: string,
  provider: string,
  topK = 24,
  opts?: { favoritesOnly?: boolean; tags?: string[]; dateFrom?: number; dateTo?: number; place?: string; hasText?: boolean; person?: string; persons?: string[] }
) {
  return post<{ search_id: string; results: SearchResult[] }>(
    '/search_workspace',
    {
      dir, provider, query, top_k: topK,
      favorites_only: opts?.favoritesOnly, tags: opts?.tags, date_from: opts?.dateFrom, date_to: opts?.dateTo,
      place: opts?.place, has_text: opts?.hasText, person: opts?.person, persons: opts?.persons,
    },
  )
}

export async function apiGetTags(dir: string) {
  const r = await fetch(`${API_BASE}/tags?dir=${encodeURIComponent(dir)}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<{ tags: Record<string,string[]>; all: string[] }>
}

export async function apiSetTags(dir: string, path: string, tags: string[]) {
  return post<{ ok: boolean; tags: string[] }>(
    '/tags',
    { dir, path, tags },
  )
}

export function thumbUrl(dir: string, provider: string, path: string, size = 256) {
  const qs = new URLSearchParams({ dir, provider, path, size: String(size) })
  return `${API_BASE}/thumb?${qs.toString()}`
}

export function thumbFaceUrl(dir: string, provider: string, path: string, emb: number, size = 196) {
  const qs = new URLSearchParams({ dir, provider, path, emb: String(emb), size: String(size) })
  return `${API_BASE}/thumb_face?${qs.toString()}`
}

// (duplicate removed)

export async function apiOpen(dir: string, path: string) {
  return post<{ ok: boolean }>('/open', { dir, path })
}

export async function apiEditOps(dir: string, path: string, ops: { rotate?: number; flip?: 'h'|'v'; crop?: { x: number; y: number; w: number; h: number } }) {
  return post<{ out_path: string }>(
    '/edit/ops',
    { dir, path, rotate: ops.rotate || 0, flip: ops.flip, crop: ops.crop },
  )
}

export async function apiUpscale(dir: string, path: string, scale: 2|4 = 2, engine: 'pil'|'realesrgan' = 'pil') {
  return post<{ out_path: string }>(
    '/edit/upscale',
    { dir, path, scale, engine },
  )
}

export async function apiExport(dir: string, paths: string[], dest: string, mode: 'copy'|'symlink' = 'copy', stripExif = false, overwrite = false) {
  return post<{ ok: boolean; copied: number; skipped: number; errors: number; dest: string }>(
    '/export',
    { dir, paths, dest, mode, strip_exif: stripExif, overwrite },
  )
}


export async function apiBuildMetadata(dir: string, provider: string, hfToken?: string, openaiKey?: string) {
  return post<{ updated: number; cameras: string[] }>(
    '/metadata/build',
    { dir, provider, hf_token: hfToken, openai_key: openaiKey },
  )
}

export async function apiGetMetadata(dir: string) {
  const r = await fetch(`${API_BASE}/metadata?dir=${encodeURIComponent(dir)}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<{ cameras: string[]; places?: string[] }>
}


export async function apiSearchLike(dir: string, path: string, provider: string, topK = 24) {
  return post<{ results: SearchResult[] }>(
    '/search_like',
    { dir, path, provider, top_k: topK },
  )
}


export async function apiGetCollections(dir: string) {
  const r = await fetch(`${API_BASE}/collections?dir=${encodeURIComponent(dir)}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<{ collections: Record<string,string[]> }>
}

export async function apiSetCollection(dir: string, name: string, paths: string[]) {
  return post<{ ok: boolean; collections: Record<string,string[]> }>(
    '/collections',
    { dir, name, paths },
  )
}

export async function apiDeleteCollection(dir: string, name: string) {
  return post<{ ok: boolean; deleted: string|null }>(
    '/collections/delete',
    { dir, name },
  )
}

export async function apiGetSmart(dir: string) {
  const r = await fetch(`${API_BASE}/smart_collections?dir=${encodeURIComponent(dir)}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<{ smart: Record<string, any> }>
}

export async function apiSetSmart(dir: string, name: string, rules: any) {
  return post<{ ok: boolean; smart: Record<string, any> }>(
    '/smart_collections',
    { dir, name, rules },
  )
}

export async function apiDeleteSmart(dir: string, name: string) {
  return post<{ ok: boolean; deleted: string|null }>(
    '/smart_collections/delete',
    { dir, name },
  )
}

export async function apiResolveSmart(dir: string, name: string, provider: string, topK = 24) {
  return post<{ search_id: string|null; results: SearchResult[] }>(
    '/smart_collections/resolve',
    { dir, name, provider, top_k: topK },
  )
}

export async function apiOcrSnippets(dir: string, paths: string[], limit = 160) {
  return post<{ snippets: Record<string,string> }>(
    '/ocr/snippets',
    { dir, paths, limit },
  )
}

export async function apiBuildFaces(dir: string, provider: string) {
  return post<{ updated: number; faces: number; clusters: number }>(
    '/faces/build',
    { dir, provider },
  )
}

export async function apiFacesClusters(dir: string) {
  const r = await fetch(`${API_BASE}/faces/clusters?dir=${encodeURIComponent(dir)}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<{ clusters: { id: string; name?: string; size: number; examples: [string, number][] }[] }>
}

export async function apiFacesName(dir: string, clusterId: string, name: string) {
  return post<{ ok: boolean }>(
    '/faces/name',
    { dir, cluster_id: clusterId, name },
  )
}
export async function apiTripsBuild(dir: string, provider: string) {
  return post<{ trips: any[] }>(
    '/trips/build',
    { dir, provider },
  )
}
export async function apiTripsList(dir: string) {
  const r = await fetch(`${API_BASE}/trips?dir=${encodeURIComponent(dir)}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<{ trips: { id: string; count: number; place?: string; start_ts?: number; end_ts?: number; paths: string[] }[] }>
}

export async function apiTodo() {
  const r = await fetch(`${API_BASE}/todo`)
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<{ text: string }>
}

export async function apiDelete(dir: string, paths: string[], useOsTrash?: boolean) {
  const r = await fetch(`${API_BASE}/delete`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dir, paths, os_trash: !!useOsTrash }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<{ ok: boolean; moved: number; undoable?: boolean; os_trash?: boolean }>
}

export async function apiUndoDelete(dir: string) {
  const r = await fetch(`${API_BASE}/undo_delete`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dir }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<{ ok: boolean; restored: number }>
}
