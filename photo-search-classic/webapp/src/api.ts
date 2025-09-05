export type SearchResult = { path: string; score: number }

const API_BASE = (import.meta as any).env?.VITE_API_BASE || (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8001')

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
  hfToken?: string,
  openaiKey?: string,
  favoritesOnly?: boolean,
  tags?: string[],
  dateFrom?: number,
  dateTo?: number,
  useFast?: boolean,
  fastKind?: 'annoy' | 'faiss' | 'hnsw' | '',
  useCaptions?: boolean,
  opts?: { person?: string; persons?: string[]; hasText?: boolean }
) {
  return post<{ search_id: string; results: SearchResult[] }>(
    '/search',
    { dir, provider, query, top_k: topK, hf_token: hfToken, openai_key: openaiKey, favorites_only: !!favoritesOnly, tags, date_from: dateFrom, date_to: dateTo, use_fast: !!useFast, fast_kind: fastKind || undefined, use_caps: !!useCaptions, person: opts?.person, persons: opts?.persons, has_text: opts?.hasText },
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
  const params = new URLSearchParams({ dir })
  if (provider) params.set('provider', provider)
  const r = await fetch(`${API_BASE}/diagnostics?${params.toString()}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<{ folder: string; engines: { key: string; index_dir: string; count: number; fast?: { annoy: boolean; faiss: boolean; hnsw: boolean } }[]; free_gb: number; os: string }>
}

export function thumbUrl(dir: string, provider: string, path: string, size = 256) {
  const qs = new URLSearchParams({ dir, provider, path, size: String(size) })
  return `${API_BASE}/thumb?${qs.toString()}`
}

export function thumbFaceUrl(dir: string, provider: string, path: string, emb: number, size = 196) {
  const qs = new URLSearchParams({ dir, provider, path, emb: String(emb), size: String(size) })
  return `${API_BASE}/thumb_face?${qs.toString()}`
}

export async function apiFacesBuild(dir: string, provider: string) {
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

export async function apiOpen(dir: string, path: string) {
  return post<{ ok: boolean }>('/open', { dir, path })
}

export async function apiExif(dir: string, path: string) {
  const r = await fetch(`${API_BASE}/exif?dir=${encodeURIComponent(dir)}&path=${encodeURIComponent(path)}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<{ path: string; width: number|null; height: number|null; camera: string|null; date: string|null }>
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

export async function apiBuildCaptions(dir: string, vlmModel: string, provider: string, hfToken?: string, openaiKey?: string) {
  return post<{ updated: number }>(
    '/captions/build',
    { dir, vlm_model: vlmModel, provider, hf_token: hfToken, openai_key: openaiKey },
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
  return post<{ folders: string[] }>('/workspace/add', { path })
}

export async function apiWorkspaceRemove(path: string) {
  return post<{ folders: string[] }>('/workspace/remove', { path })
}

export async function apiSearchWorkspace(dir: string, query: string, provider: string, topK = 24, opts?: { favoritesOnly?: boolean; tags?: string[]; dateFrom?: number; dateTo?: number }) {
  return post<{ search_id: string; results: SearchResult[] }>(
    '/search_workspace',
    { dir, provider, query, top_k: topK, favorites_only: opts?.favoritesOnly, tags: opts?.tags, date_from: opts?.dateFrom, date_to: opts?.dateTo },
  )
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
  return r.json() as Promise<{ cameras: string[] }>
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
