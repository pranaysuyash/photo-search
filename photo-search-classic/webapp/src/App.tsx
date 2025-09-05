import React, { useEffect, useMemo, useState } from 'react'
import { apiIndex, apiSearch, apiSearchWorkspace, apiGetFavorites, apiSetFavorite, apiGetSaved, apiAddSaved, apiDeleteSaved, apiMap, apiDiagnostics, apiExif, thumbUrl, thumbFaceUrl, apiOpen, apiBuildFast, apiBuildOCR, apiLookalikes, apiResolveLookalike, apiWorkspaceList, apiWorkspaceAdd, apiWorkspaceRemove, apiEditOps, apiUpscale, apiFacesBuild, apiFacesClusters, apiFacesName, apiGetSmart, apiSetSmart, apiDeleteSmart, apiResolveSmart, apiGetMetadata, apiBuildMetadata, type SearchResult } from './api'

const engines = [
  { key: 'local', label: 'On-device (Recommended)' },
  { key: 'local-compat', label: 'On-device (Compatible)' },
  { key: 'hf', label: 'Hugging Face (CLIP)' },
  { key: 'hf-caption', label: 'Hugging Face (Caption)' },
  { key: 'openai', label: 'OpenAI (Captions)' },
]

const base = (p: string) => p.split('/').pop() || p

export default function App() {
  const [dir, setDir] = useState('')
  const [engine, setEngine] = useState('local')
  const [query, setQuery] = useState('')
  const [topK, setTopK] = useState(24)
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [fav, setFav] = useState<string[]>([])
  const [saved, setSaved] = useState<{ name: string; query: string; top_k?: number }[]>([])
  const [showMap, setShowMap] = useState(false)
  const [points, setPoints] = useState<{ lat: number; lon: number }[]>([])
  const [diag, setDiag] = useState<{ folder: string; engines: { key: string; index_dir: string; count: number }[]; free_gb: number; os: string } | null>(null)
  const [favOnly, setFavOnly] = useState(false)
  const [allTags, setAllTags] = useState<string[]>([])
  const [tagsMap, setTagsMap] = useState<Record<string, string[]>>({})
  const [tagFilter, setTagFilter] = useState('')
  const [tab, setTab] = useState<'search'|'saved'|'map'|'diag'|'look'|'ws'|'coll'|'people'|'smart'>('search')
  const [collections, setCollections] = useState<Record<string,string[]>>({})
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [detail, setDetail] = useState<{ path: string; exif?: any } | null>(null)
  const [toast, setToast] = useState('')
  const [cursorIdx, setCursorIdx] = useState(0)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [viewMode, setViewMode] = useState<'grid'|'film'>('grid')
  const [useCaps, setUseCaps] = useState(false)
  const [vlmModel, setVlmModel] = useState('Qwen/Qwen2-VL-2B-Instruct')
  const [useFast, setUseFast] = useState(false)
  const [fastKind, setFastKind] = useState<'annoy'|'faiss'|'hnsw'|''>('')
  const [wsToggle, setWsToggle] = useState(false)
  const [workspace, setWorkspace] = useState<string[]>([])
  const [groups, setGroups] = useState<{ id: string; paths: string[]; resolved: boolean }[]>([])
  const [cameras, setCameras] = useState<string[]>([])
  const [clusters, setClusters] = useState<{ id: string; name?: string; size: number; examples: [string, number][] }[]>([])
  const [persons, setPersons] = useState<string[]>([])
  const [smart, setSmart] = useState<Record<string, any>>({})
  const [camera, setCamera] = useState('')
  const [isoMin, setIsoMin] = useState('')
  const [isoMax, setIsoMax] = useState('')
  const [fMin, setFMin] = useState('')
  const [fMax, setFMax] = useState('')

  async function loadFav() {
    try { const r = await apiGetFavorites(dir); setFav(r.favorites || []) } catch {}
  }
  async function loadSaved() {
    try { const r = await apiGetSaved(dir); setSaved(r.saved || []) } catch {}
  }
  async function loadCollections() {
    try { const { apiGetCollections } = await import('./api'); const r = await apiGetCollections(dir); setCollections(r.collections||{}) } catch {}
  }
  async function loadMap() {
    try { const r = await apiMap(dir); setPoints(r.points || []); setShowMap(true) } catch {}
  }
  async function loadDiagnostics() {
    try { const r = await apiDiagnostics(dir, engine); setDiag(r as any) } catch {}
  }
  useEffect(()=>{ if (dir) { apiGetMetadata(dir).then(md=>setCameras(md.cameras||[])).catch(()=>{}) } }, [dir])
  async function loadTags() {
    try {
      const API_BASE = (import.meta as any).env?.VITE_API_BASE || (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8001')
      const r = await (await fetch(`${API_BASE}/tags?dir=${encodeURIComponent(dir)}`)).json() as { tags: Record<string,string[]>; all: string[] }
      setTagsMap(r.tags || {}); setAllTags(r.all || [])
    } catch {}
  }
  async function doIndex() {
    setBusy('Indexing…'); setNote('')
    try { const r = await apiIndex(dir, engine, 32); setNote(`Indexed. New ${r.new}, Updated ${r.updated}, Total ${r.total}`) } catch (e:any) { setNote(e.message) } finally { setBusy('') }
  }
  async function doSearch() {
    setBusy('Searching…'); setNote('')
    try {
      const selectedTags = tagFilter.split(',').map(s=>s.trim()).filter(Boolean)
      const fromTs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime()/1000 : undefined
      const toTs = dateTo ? new Date(dateTo + 'T23:59:59').getTime()/1000 : undefined
      let r
      const ppl = persons.filter(Boolean)
      if (wsToggle) {
        r = await apiSearchWorkspace(dir, query, engine, topK, { favoritesOnly: favOnly, tags: selectedTags.length ? selectedTags : undefined, dateFrom: fromTs, dateTo: toTs })
      } else {
        r = await apiSearch(
          dir, query, engine, topK,
          undefined, undefined,
          favOnly, selectedTags.length ? selectedTags : undefined, fromTs, toTs,
          useFast, fastKind || undefined, useCaps,
          { ...(ppl.length === 1 ? { person: ppl[0] } : (ppl.length > 1 ? { persons: ppl } : {})) }
        )
      }
      setResults(r.results || []);
      setNote(`Found ${r.results?.length || 0}`);
      await loadFav(); await loadSaved(); await loadTags(); setCursorIdx(0)
    } catch(e:any) { setNote(e.message) } finally { setBusy('') }
  }
  async function toggleFavorite(p: string) {
    const isFav = fav.includes(p)
    try { const r = await apiSetFavorite(dir, p, !isFav); setFav(r.favorites || []) } catch {}
  }

  async function saveCurrent() {
    if (!dir || !query) { setNote('Enter folder and query'); return }
    const name = prompt('Saved search name?', query.slice(0, 40)) || ''
    if (!name.trim()) return
    try { await apiAddSaved(dir, name.trim(), query, topK); await loadSaved(); setNote('Saved') } catch(e:any) { setNote(e.message) }
  }

  async function runSaved(name: string) {
    const it = saved.find(s => s.name === name)
    if (!it) return
    setQuery(it.query || '')
    setTopK(it.top_k || 24)
    await doSearch()
  }

  async function deleteSaved(name: string) {
    try { await apiDeleteSaved(dir, name); await loadSaved() } catch {}
  }

  useEffect(() => {
    if (dir) { loadSaved(); loadFav(); loadDiagnostics(); loadTags(); loadCollections() }
    (async()=>{ try{ const r = await apiWorkspaceList(); setWorkspace(r.folders||[]) } catch{} })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dir])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(()=>setToast(''), 1800)
  }

  const visibleResults = useMemo(()=> results, [results])
  const selectedCount = useMemo(()=> Object.values(selected).filter(Boolean).length, [selected])
  const [bulkTag, setBulkTag] = useState('')

  // Keyboard shortcuts for search tab
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (tab !== 'search') return
      if (!visibleResults.length) return
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || (t as any).isContentEditable)) return
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault(); setCursorIdx(i => Math.min(visibleResults.length - 1, i + 1))
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault(); setCursorIdx(i => Math.max(0, i - 1))
      } else if (e.key === 'Enter') {
        const cur = visibleResults[cursorIdx]; if (cur) { setDetail({ path: cur.path }); apiExif(dir, cur.path).then(ex=>setDetail({ path: cur.path, exif: ex})).catch(()=>{}) }
      } else if (e.key.toLowerCase() === 'f') {
        const cur = visibleResults[cursorIdx]; if (cur) toggleFavorite(cur.path)
      } else if (e.key.toLowerCase() === 'e') {
        const cur = visibleResults[cursorIdx]; if (cur) apiOpen(dir, cur.path).then(()=>showToast('Revealed in Finder/Explorer')).catch(()=>{})
      } else if (e.key === ' ') {
        e.preventDefault(); const cur = visibleResults[cursorIdx]; if (cur) setSelected(s=>({...s, [cur.path]: !s[cur.path]}))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tab, visibleResults, cursorIdx, dir])

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-1">📸 Photo Search – Classic</h1>
      <p className="text-sm text-gray-600 mb-3">Simple, fast, private.</p>
      {toast && (<div className="mb-2 bg-black text-white text-sm px-3 py-1 rounded inline-block">{toast}</div>)}

      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        {['search','saved','map','diag','look','ws','coll','people','smart'].map(t=> (
          <button key={t} onClick={()=>setTab(t as any)} className={`px-3 py-1 rounded ${tab===t?'bg-blue-600 text-white':'bg-gray-200'}`}>{t[0].toUpperCase()+t.slice(1)}</button>
        ))}
      </div>
      {tab==='search' && (
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 items-end">
        <div className="lg:col-span-2">
          <label className="block text-sm">Photo folder</label>
          <input value={dir} onChange={e=>setDir(e.target.value)} placeholder="/path/to/photos" className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm">Engine</label>
          <select value={engine} onChange={e=>setEngine(e.target.value)} className="w-full border rounded px-3 py-2">
            {engines.map(e=> <option key={e.key} value={e.key}>{e.label}</option>)}
          </select>
        </div>
        <div className="lg:col-span-2">
          <label className="block text-sm">Query</label>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="friends on beach" className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <button onClick={doIndex} className="w-full bg-gray-800 text-white rounded px-3 py-2">{busy || 'Build Index'}</button>
        </div>
      </div>
      )}
      {tab==='search' && (
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <button onClick={doSearch} className="bg-blue-600 text-white rounded px-4 py-2">Search</button>
        <div className="text-sm text-gray-700">Top‑K</div>
        <input type="number" min={1} max={200} value={topK} onChange={e=>setTopK(parseInt(e.target.value||'24',10))} className="w-20 border rounded px-2 py-1" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={favOnly} onChange={e=>setFavOnly(e.target.checked)} /> Favorites only</label>
        <div className="text-sm">Filter tags (comma):</div>
        <input value={tagFilter} onChange={e=>setTagFilter(e.target.value)} placeholder="e.g., beach,friends" className="border rounded px-2 py-1" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={useFast} onChange={e=>setUseFast(e.target.checked)} /> Use fast index</label>
        {(() => {
          const st = (diag as any)?.engines?.[0]?.fast || undefined
          const fa = st?.faiss ?? true
          const hs = st?.hnsw ?? true
          const an = st?.annoy ?? true
          return (
            <select value={fastKind} onChange={e=>setFastKind(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
              <option value="">Auto</option>
              <option value="faiss" disabled={!fa}>FAISS{st && !fa ? ' (not built)' : ''}</option>
              <option value="hnsw" disabled={!hs}>HNSW{st && !hs ? ' (not built)' : ''}</option>
              <option value="annoy" disabled={!an}>Annoy{st && !an ? ' (not built)' : ''}</option>
            </select>
          )
        })()}
        <div className="flex items-center gap-2 text-sm">
          <div>View</div>
          <select value={viewMode} onChange={e=>setViewMode(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
            <option value="grid">Grid</option>
            <option value="film">Filmstrip</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={useCaps} onChange={e=>setUseCaps(e.target.checked)} /> Use captions</label>
        <div className="flex items-center gap-2 text-sm">
          <div>Camera</div>
          <input value={camera} onChange={e=>setCamera(e.target.value)} list="cameras_list" placeholder="e.g., iPhone" className="border rounded px-2 py-1" />
          <div>ISO</div>
          <input value={isoMin} onChange={e=>setIsoMin(e.target.value)} placeholder="min" className="w-20 border rounded px-2 py-1" />
          <div>to</div>
          <input value={isoMax} onChange={e=>setIsoMax(e.target.value)} placeholder="max" className="w-20 border rounded px-2 py-1" />
          <div>f/</div>
          <input value={fMin} onChange={e=>setFMin(e.target.value)} placeholder="min" className="w-20 border rounded px-2 py-1" />
          <div>to</div>
          <input value={fMax} onChange={e=>setFMax(e.target.value)} placeholder="max" className="w-20 border rounded px-2 py-1" />
          <button onClick={async()=>{ setBusy('Building metadata…'); try{ const r = await apiBuildMetadata(dir, engine); setNote(`Metadata ready (${r.updated})`); const md = await apiGetMetadata(dir); setCameras(md.cameras||[]) } catch(e:any){ setNote(e.message) } finally { setBusy('') } }} className="bg-gray-200 rounded px-2 py-1">Build Metadata</button>
        </div>
        <div className="flex gap-1 flex-wrap">
          {allTags.map(t => {
            const chosen = (tagFilter.split(',').map(s=>s.trim()).filter(Boolean)).includes(t)
            return (
              <button key={t} onClick={()=>{
                const cur = new Set(tagFilter.split(',').map(s=>s.trim()).filter(Boolean))
                if (cur.has(t)) cur.delete(t); else cur.add(t)
                setTagFilter(Array.from(cur).join(','))
              }} className={`text-xs px-2 py-1 rounded ${chosen ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>{t}</button>
            )
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm">Date</div>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="border rounded px-2 py-1" />
          <div>to</div>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="border rounded px-2 py-1" />
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={wsToggle} onChange={e=>setWsToggle(e.target.checked)} /> Search across workspace</label>
        <div className="text-sm text-gray-500">{note}</div>
        <button onClick={()=>{
          const rows = results.map(r=>`${JSON.stringify(r.path)},${r.score}`)
          const csv = ['path,score', ...rows].join('\n')
          const blob = new Blob([csv], { type: 'text/csv' })
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.download = 'search_results.csv'
          a.click()
        }} className="bg-gray-200 rounded px-3 py-1 text-sm">Export CSV</button>
      </div>
      <datalist id="cameras_list">
        {cameras.map(c=> <option key={c} value={c} />)}
      </datalist>
      )}
      {tab==='people' && (
      <div className="mt-6 bg-white border rounded p-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">People</h2>
          <div className="flex gap-2">
            <button onClick={async()=>{ try{ setBusy('Scanning faces…'); const r = await apiFacesBuild(dir, engine); setBusy(''); setNote(`Faces: ${r.faces}, clusters: ${r.clusters}`); const c = await apiFacesClusters(dir); setClusters(c.clusters||[]) } catch(e:any){ setBusy(''); setNote(e.message) } }} className="bg-gray-200 rounded px-3 py-1 text-sm">Build/Update</button>
            <button onClick={async()=>{ try{ const c = await apiFacesClusters(dir); setClusters(c.clusters||[]) } catch(e:any){ setNote(e.message) } }} className="bg-gray-200 rounded px-3 py-1 text-sm">Refresh</button>
          </div>
        </div>
        {clusters.length === 0 ? (
          <div className="text-sm text-gray-600 mt-2">No face clusters yet.</div>
        ) : (
          <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
            {clusters.map((c)=> (
              <div key={c.id} className="border rounded p-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold truncate" title={c.name || `Cluster ${c.id}`}>{c.name || `Cluster ${c.id}`}</div>
                  <div className="text-xs text-gray-600">{c.size}</div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {c.examples.map(([p,emb],i)=> (
                    <img key={i} src={thumbFaceUrl(dir, engine, p, emb, 196)} className="w-full h-16 object-cover rounded" />
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={()=>{ const nm = c.name || ''; if(!nm) return; setPersons(prev=> prev.includes(nm) ? prev.filter(x=>x!==nm) : [...prev, nm]) }} disabled={!c.name} className={`px-2 py-1 rounded ${c.name && persons.includes(c.name) ? 'bg-blue-700 text-white' : (c.name ? 'bg-blue-600 text-white' : 'bg-gray-200')}`}>{c.name && persons.includes(c.name) ? 'Remove' : 'Add'}</button>
                  <button onClick={async()=>{ const n = prompt('Name this person as…', c.name||'')||''; if(!n.trim()) return; try{ await apiFacesName(dir, String(c.id), n.trim()); const c2 = await apiFacesClusters(dir); setClusters(c2.clusters||[]) } catch{} }} className="px-2 py-1 rounded bg-gray-200">Name</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {persons.length > 0 && (
          <div className="mt-2 text-sm flex items-center gap-2 flex-wrap">
            {persons.map(p => (
              <span key={p} className="px-2 py-1 bg-blue-600 text-white rounded flex items-center gap-2">{p} <button onClick={()=> setPersons(persons.filter(x=>x!==p))} className="bg-white/20 rounded px-1">×</button></span>
            ))}
            <button onClick={()=>setPersons([])} className="px-2 py-1 bg-gray-200 rounded">Clear</button>
          </div>
        )}
      </div>
      )}

      {tab==='smart' && (
      <div className="mt-6 bg-white border rounded p-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Smart Collections</h2>
          <div className="flex gap-2">
            <button onClick={async()=>{ try{ const r = await apiGetSmart(dir); setSmart(r.smart||{}) } catch(e:any){ setNote(e.message) } }} className="bg-gray-200 rounded px-3 py-1 text-sm">Refresh</button>
            <button onClick={async()=>{
              const name = (prompt('Save current search as Smart (name):')||'').trim(); if(!name) return;
              try {
                const tags = tagFilter.split(',').map(s=>s.trim()).filter(Boolean)
                const fromTs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime()/1000 : undefined
                const toTs = dateTo ? new Date(dateTo + 'T23:59:59').getTime()/1000 : undefined
                const rules: any = {
                  query, favoritesOnly: favOnly, tags,
                  useCaptions: useCaps,
                  camera: camera || undefined,
                  isoMin: isoMin ? parseInt(isoMin,10) : undefined,
                  isoMax: isoMax ? parseInt(isoMax,10) : undefined,
                  fMin: fMin ? parseFloat(fMin) : undefined,
                  fMax: fMax ? parseFloat(fMax) : undefined,
                  dateFrom: fromTs, dateTo: toTs,
                }
                const ppl = persons.filter(Boolean)
                if (ppl.length === 1) rules.person = ppl[0]; else if (ppl.length > 1) rules.persons = ppl
                await apiSetSmart(dir, name, rules)
                const r = await apiGetSmart(dir)
                setSmart(r.smart||{})
                setNote('Saved smart collection')
              } catch(e:any){ setNote(e.message||'Failed to save smart') }
            }} className="bg-blue-600 text-white rounded px-3 py-1 text-sm">Save current as Smart</button>
          </div>
        </div>
        {Object.keys(smart||{}).length === 0 ? (
          <div className="text-sm text-gray-600 mt-2">No smart collections yet.</div>
        ) : (
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
            {Object.keys(smart).map((name)=> (
              <div key={name} className="border rounded p-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold truncate" title={name}>{name}</div>
                  <div className="flex gap-2">
                    <button onClick={async()=>{ try { const r = await apiResolveSmart(dir, name, engine, topK); setResults(r.results||[]); setNote(`Opened smart: ${name}`) } catch(e:any){ setNote(e.message) } }} className="px-2 py-1 bg-blue-600 text-white rounded">Open</button>
                    <button onClick={async()=>{ if(!confirm(`Delete smart collection "${name}"?`)) return; try{ await apiDeleteSmart(dir, name); const r = await apiGetSmart(dir); setSmart(r.smart||{}) } catch(e:any){ setNote(e.message) } }} className="px-2 py-1 bg-red-600 text-white rounded">Delete</button>
                  </div>
                </div>
                <div className="mt-1 text-xs text-gray-600 truncate">{JSON.stringify(smart[name])}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}
      {tab==='search' && (
      <div className="mt-4 bg-white border rounded p-3">
        <h2 className="font-semibold mb-2">Speed</h2>
        <div className="flex gap-2 flex-wrap">
          <button onClick={async()=>{ setBusy('Preparing FAISS…'); try { await apiBuildFast(dir, 'faiss', engine); setNote('FAISS index ready') } catch(e:any){ setNote(e.message) } finally { setBusy('') } }} className="bg-gray-200 rounded px-3 py-1 text-sm">Prepare FAISS</button>
          <button onClick={async()=>{ setBusy('Preparing HNSW…'); try { await apiBuildFast(dir, 'hnsw', engine); setNote('HNSW index ready') } catch(e:any){ setNote(e.message) } finally { setBusy('') } }} className="bg-gray-200 rounded px-3 py-1 text-sm">Prepare HNSW</button>
          <button onClick={async()=>{ setBusy('Preparing Annoy…'); try { await apiBuildFast(dir, 'annoy', engine); setNote('Annoy index ready') } catch(e:any){ setNote(e.message) } finally { setBusy('') } }} className="bg-gray-200 rounded px-3 py-1 text-sm">Prepare Annoy</button>
          <button onClick={async()=>{ setBusy('Extracting text (OCR)…'); try{ const r = await apiBuildOCR(dir, engine); setNote(`OCR updated ${r.updated}`) } catch(e:any){ setNote(e.message) } finally { setBusy('') } }} className="bg-gray-200 rounded px-3 py-1 text-sm">Build OCR</button>
        </div>
      </div>
      )}

      {tab==='look' && (
      <div className="mt-6 bg-white border rounded p-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Look‑alikes</h2>
          <button onClick={async()=>{ try{ const r = await apiLookalikes(dir); setGroups(r.groups||[]) } catch{} }} className="bg-gray-200 rounded px-3 py-1 text-sm">Scan</button>
        </div>
        {groups.length === 0 ? (
          <div className="text-sm text-gray-600 mt-2">No groups yet.</div>
        ) : (
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            {groups.map((g,gi)=> (
              <div key={g.id} className="border rounded p-2 text-xs">
                <div className="mb-1 flex items-center justify-between"><div className="font-semibold">Group {gi+1}</div><div>{g.resolved ? '✅' : ''}</div></div>
                <div className="grid grid-cols-3 gap-2">
                  {g.paths.map((p,pi)=> (
                    <div key={pi} className="border rounded p-1">
                      <div className="truncate" title={p}>{base(p)}</div>
                      <img src={thumbUrl(dir, engine, p, 196)} className="w-full h-24 object-cover rounded mt-1" />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={async()=>{ try{ await apiResolveLookalike(dir, g.paths); const r = await apiLookalikes(dir); setGroups(r.groups||[]) } catch{} }} className="bg-gray-200 rounded px-3 py-1">Mark resolved</button>
                  <button onClick={async()=>{ for (const p of g.paths) { try{ await apiSetFavorite(dir, p, true) } catch{} } alert('Added group to Favorites') }} className="bg-gray-200 rounded px-3 py-1">Add all to Favorites</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {tab==='ws' && (
      <div className="mt-6 bg-white border rounded p-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Workspace</h2>
        </div>
        <div className="mt-2 text-sm">
          <div className="mb-2">Folders:</div>
          {workspace.length === 0 ? (
            <div className="text-gray-600">No extra folders yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {workspace.map((p,i)=> (
                <div key={i} className="border rounded p-2 flex items-center justify-between">
                  <div className="font-mono text-xs truncate" title={p}>{p}</div>
                  <button onClick={async()=>{ try{ const r = await apiWorkspaceRemove(p); setWorkspace(r.folders||[]) } catch{} }} className="px-2 py-1 bg-red-600 text-white rounded">Remove</button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex gap-2">
            <input id="ws_add_c" placeholder="/path/to/folder" className="flex-1 border rounded px-2 py-1" />
            <button onClick={async()=>{ const el = document.getElementById('ws_add_c') as HTMLInputElement; const val = el.value.trim(); if (!val) return; try{ const r = await apiWorkspaceAdd(val); setWorkspace(r.folders||[]); el.value='' } catch{} }} className="px-3 py-1 bg-gray-200 rounded">Add</button>
          </div>
        </div>
      </div>
      )}
      {tab==='search' && viewMode==='grid' && (
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {results.map((r, i)=> (
          <div key={i} className={`bg-white border rounded p-2 text-xs ${i===cursorIdx ? 'ring-2 ring-blue-500' : ''}`}>
            <div className="font-semibold truncate" title={r.path}>{base(r.path)}</div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!selected[r.path]} onChange={e=> setSelected(s=>({...s, [r.path]: e.target.checked}))} /> select</label>
            <div className="text-gray-600">score {r.score.toFixed(3)}</div>
            <img onClick={async()=>{ setDetail({ path: r.path }); try{ const exif = await apiExif(dir, r.path); setDetail({ path: r.path, exif }) } catch{} }} src={thumbUrl(dir, engine, r.path, 256)} alt="thumb" className="mt-2 w-full h-32 object-cover rounded cursor-pointer" />
            <div className="flex gap-2 mt-2 flex-wrap">
              <button onClick={()=>toggleFavorite(r.path)} className={`px-2 py-1 rounded ${fav.includes(r.path) ? 'bg-pink-600 text-white' : 'bg-gray-200'}`}>♥ Favorite</button>
              <button onClick={async()=>{ await apiOpen(dir, r.path); showToast('Revealed in Finder/Explorer') }} className="px-2 py-1 rounded bg-gray-200">Reveal</button>
              <button onClick={async()=>{ try{ const { apiSearchLike } = await import('./api'); const res = await apiSearchLike(dir, r.path, engine, topK); setResults(res.results||[]); setNote('Similar results') } catch(e:any){ setNote(e.message) } }} className="px-2 py-1 rounded bg-gray-200">More like this</button>
              <button onClick={async()=>{ try { const out = await apiEditOps(dir, r.path, { rotate: 90 }); showToast('Rotated 90°'); } catch(e:any){ setNote(e.message) } }} className="px-2 py-1 rounded bg-gray-200">Rotate 90°</button>
              <button onClick={async()=>{ try { const out = await apiUpscale(dir, r.path, 2, 'pil'); showToast('Upscaled 2× (saved)') } catch(e:any){ setNote(e.message) } }} className="px-2 py-1 rounded bg-gray-200">Upscale 2×</button>
            </div>
            <div className="mt-2 text-xs">
              <div className="text-gray-600">Tags: {(tagsMap[r.path]||[]).join(', ') || '—'}</div>
              <div className="flex gap-2 mt-1">
                <input id={`tags_${i}`} defaultValue={(tagsMap[r.path]||[]).join(', ')} className="flex-1 border rounded px-2 py-1" placeholder="comma,separated" />
                <button onClick={async()=>{
                  const el = document.getElementById(`tags_${i}`) as HTMLInputElement
                  const next = (el.value||'').split(',').map(s=>s.trim()).filter(Boolean)
                  try {
                    const API_BASE = (import.meta as any).env?.VITE_API_BASE || (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8001')
                    await (await fetch(`${API_BASE}/tags`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dir, path: r.path, tags: next }) })).json()
                    await loadTags()
                    showToast('Tags saved')
                  } catch {}
                }} className="px-2 py-1 rounded bg-gray-200">Save tags</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {tab==='search' && viewMode==='film' && (
      <div className="mt-4 overflow-x-auto">
        <div className="flex gap-3 min-w-full">
          {results.map((r,i)=> (
            <div key={i} className={`w-48 shrink-0 bg-white border rounded p-2 text-xs ${i===cursorIdx ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="font-semibold truncate" title={r.path}>{base(r.path)}</div>
              <img src={thumbUrl(dir, engine, r.path, 256)} alt="thumb" className="mt-2 w-full h-28 object-cover rounded" />
              <div className="flex gap-2 mt-2 flex-wrap">
                <button onClick={()=>toggleFavorite(r.path)} className={`px-2 py-1 rounded ${fav.includes(r.path) ? 'bg-pink-600 text-white' : 'bg-gray-200'}`}>♥</button>
                <button onClick={async()=>{ await apiOpen(dir, r.path); showToast('Revealed in Finder/Explorer') }} className="px-2 py-1 rounded bg-gray-200">Reveal</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {tab==='search' && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <div>Selected: {selectedCount}</div>
          <button onClick={()=> setSelected(Object.fromEntries(visibleResults.map(r=>[r.path, true])))} className="bg-gray-200 rounded px-2 py-1">Select all</button>
          <button onClick={()=> setSelected({})} className="bg-gray-200 rounded px-2 py-1">Clear</button>
          <button onClick={async()=>{
            const toAdd = Object.entries(selected).filter(([,v])=>v).map(([p])=>p)
            let added = 0
            for (const p of toAdd) { try { const r = await apiSetFavorite(dir, p, true); setFav(r.favorites||[]); added++ } catch{} }
            showToast(`Added ${added} to Favorites`)
          }} className="bg-gray-200 rounded px-2 py-1">Add selected to Favorites</button>
          <div className="flex items-center gap-2">
            <input value={bulkTag} onChange={e=>setBulkTag(e.target.value)} placeholder="tag for selected…" className="border rounded px-2 py-1" list="alltags" />
            <button onClick={async()=>{
              const tag = bulkTag.trim(); if (!tag) return
              const sel = Object.entries(selected).filter(([,v])=>v).map(([p])=>p)
              if (sel.length === 0) { showToast('Select photos first'); return }
              setBusy('Tagging…')
              try {
                for (const p of sel) {
                  const cur = new Set((tagsMap[p]||[]))
                  cur.add(tag)
                  await (await fetch(`${(import.meta as any).env?.VITE_API_BASE || (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8001')}/tags`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dir, path: p, tags: Array.from(cur) }) })).json()
                }
                await loadTags(); showToast('Tag added to selected')
              } catch(e:any) { setNote(e.message) } finally { setBusy('') }
            }} className="bg-gray-200 rounded px-2 py-1">Add tag</button>
            <button onClick={async()=>{
              const tag = bulkTag.trim(); if (!tag) return
              const sel = Object.entries(selected).filter(([,v])=>v).map(([p])=>p)
              if (sel.length === 0) { showToast('Select photos first'); return }
              setBusy('Untagging…')
              try {
                for (const p of sel) {
                  const next = (tagsMap[p]||[]).filter(t=>t!==tag)
                  await (await fetch(`${(import.meta as any).env?.VITE_API_BASE || (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8001')}/tags`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dir, path: p, tags: next }) })).json()
                }
                await loadTags(); showToast('Tag removed from selected')
              } catch(e:any) { setNote(e.message) } finally { setBusy('') }
            }} className="bg-gray-200 rounded px-2 py-1">Remove tag</button>
          </div>
          <button onClick={()=>{
            const rows = Object.entries(selected).filter(([,v])=>v).map(([p])=>`${JSON.stringify(p)}`)
            const csv = ['path', ...rows].join('\n')
            const blob = new Blob([csv], { type: 'text/csv' })
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = 'selected_paths.csv'
            a.click()
          }} className="bg-gray-200 rounded px-2 py-1">Export selected (CSV)</button>
          <button onClick={async()=>{
            const sel = Object.entries(selected).filter(([,v])=>v).map(([p])=>p)
            if (sel.length === 0) { showToast('Select some photos first'); return }
            const dest = prompt('Export to folder (absolute path):', '') || ''
            if (!dest.trim()) return
            const strip = confirm('Strip EXIF metadata? OK = Yes, Cancel = No')
            setBusy('Exporting…')
            try {
              const { apiExport } = await import('./api')
              const r = await apiExport(dir, sel, dest.trim(), 'copy', strip, false)
              setNote(`Exported ${r.copied}, skipped ${r.skipped}, errors ${r.errors} → ${r.dest}`)
              showToast('Export complete')
            } catch(e:any) {
              setNote(e.message || 'Export failed')
            } finally {
              setBusy('')
            }
          }} className="bg-gray-200 rounded px-2 py-1">Export selected…</button>
        </div>
      )}

      {/* Tag autocomplete data list */}
      <datalist id="alltags">
        {allTags.map(t=> <option key={t} value={t} />)}
      </datalist>

      {tab==='saved' && (
      <div className="mt-6 bg-white border rounded p-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Saved searches</h2>
          <div className="flex gap-2">
            <button onClick={saveCurrent} className="bg-gray-800 text-white rounded px-3 py-1 text-sm">Save current</button>
            <button onClick={loadSaved} className="bg-gray-200 rounded px-3 py-1 text-sm">Refresh</button>
          </div>
        </div>
        {saved.length === 0 ? (
          <div className="text-sm text-gray-600 mt-2">No saved searches yet.</div>
        ) : (
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {saved.map((s,i)=> (
              <div key={i} className="border rounded p-2 text-sm flex items-center justify-between gap-2">
                <div className="truncate"><span className="font-semibold">{s.name}</span> – {s.query}</div>
                <div className="flex gap-2">
                  <button onClick={()=>runSaved(s.name)} className="bg-blue-600 text-white rounded px-2 py-1">Run</button>
                  <button onClick={()=>deleteSaved(s.name)} className="bg-red-600 text-white rounded px-2 py-1">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {tab==='map' && (
      <div className="mt-6 bg-white border rounded p-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Map (GPS)</h2>
          <button onClick={loadMap} className="bg-gray-200 rounded px-3 py-1 text-sm">Load</button>
        </div>
        {showMap ? (
          points.length === 0 ? <div className="text-sm text-gray-600 mt-2">No GPS points found.</div> : (
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
              {points.map((p,i)=> (
                <div key={i} className="border rounded p-2">{p.lat.toFixed(5)}, {p.lon.toFixed(5)}</div>
              ))}
            </div>
          )
        ) : (<div className="text-sm text-gray-600 mt-2">Click Load to fetch GPS points.</div>)}
      </div>
      )}

      {tab==='diag' && (
      <div className="mt-6 bg-white border rounded p-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Diagnostics</h2>
          <button onClick={loadDiagnostics} className="bg-gray-200 rounded px-3 py-1 text-sm">Refresh</button>
        </div>
        {diag ? (
          <div className="mt-2 text-sm">
            <div>Folder: <span className="font-mono">{diag.folder}</span></div>
            <div>Free disk: {diag.free_gb} GB (OS: {diag.os})</div>
            <div className="mt-2">
              <div className="font-semibold mb-1">Indexes</div>
              {diag.engines.length === 0 ? <div className="text-gray-600">No indexes found.</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {diag.engines.map((e,i)=> (
                    <div key={i} className="border rounded p-2 flex items-center justify-between">
                      <div>
                        <div className="font-mono text-xs">{e.key}</div>
                        <div className="text-xs text-gray-600">{e.index_dir}</div>
                        {(e as any).fast && (
                          <div className="text-xs mt-1 text-gray-700">Fast: Annoy {(e as any).fast.annoy ? '✅' : '❌'}, FAISS {(e as any).fast.faiss ? '✅' : '❌'}, HNSW {(e as any).fast.hnsw ? '✅' : '❌'}</div>
                        )}
                      </div>
                      <div className="text-sm">{e.count} photos</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (<div className="text-sm text-gray-600 mt-2">Click Refresh to view.</div>)}
      </div>
      )}



      {tab==='coll' && (
      <div className="mt-6 bg-white border rounded p-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Collections</h2>
          <div className="flex gap-2">
            <button onClick={async()=>{ try{ await loadCollections() } catch{} }} className="bg-gray-200 rounded px-3 py-1 text-sm">Refresh</button>
            <button onClick={async()=>{
              const sel = Object.entries(selected).filter(([,v])=>v).map(([p])=>p)
              if (sel.length===0) { setNote('Select photos to save as collection'); return }
              const name = prompt('Collection name?','My Collection')||''
              if (!name.trim()) return
              try { const { apiSetCollection } = await import('./api'); await apiSetCollection(dir, name.trim(), sel); await loadCollections(); setNote('Collection saved') } catch(e:any){ setNote(e.message) }
            }} className="bg-gray-800 text-white rounded px-3 py-1 text-sm">Save selected as collection</button>
          </div>
        </div>
        {Object.keys(collections||{}).length===0 ? (
          <div className="text-sm text-gray-600 mt-2">No collections yet.</div>
        ) : (
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(collections).map(([name,paths])=> (
              <div key={name} className="border rounded p-2 text-sm flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{name}</div>
                  <div className="text-gray-600">{paths.length} items</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={async()=>{ try{ const { apiDeleteCollection } = await import('./api'); await apiDeleteCollection(dir, name); await loadCollections() } catch{} }} className="bg-red-600 text-white rounded px-2 py-1">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Details drawer */}
      {detail && (
        <div className="fixed top-0 right-0 w-full md:w-[420px] h-full bg-white border-l shadow-xl p-4 overflow-y-auto z-50">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold truncate" title={detail.path}>{base(detail.path)}</div>
            <button onClick={()=>setDetail(null)} className="text-sm bg-gray-200 rounded px-2 py-1">Close</button>
          </div>
          <img src={thumbUrl(dir, engine, detail.path, 720)} className="w-full h-auto rounded" />
          <div className="mt-2 text-xs">
            <div className="text-gray-700 font-mono break-all">{detail.path}</div>
            {detail.exif && (
              <div className="mt-2 text-gray-700">
                <div>Size: {detail.exif.width}×{detail.exif.height}</div>
                <div>Camera: {detail.exif.camera || '—'}</div>
                <div>Date: {detail.exif.date || '—'}</div>
              </div>
            )}
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            <button onClick={async()=>{ await apiOpen(dir, detail.path); showToast('Revealed in Finder/Explorer') }} className="px-3 py-1 bg-gray-200 rounded">Reveal</button>
            <button onClick={async()=>{ try{ const r = await apiSetFavorite(dir, detail.path, true); setFav(r.favorites||[]); showToast('Added to Favorites') } catch{} }} className="px-3 py-1 bg-pink-600 text-white rounded">♥ Favorite</button>
          </div>
        </div>
      )}
    </div>
  )
}
