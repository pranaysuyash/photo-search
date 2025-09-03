import React, { useEffect, useMemo, useState } from 'react'
import {
  apiIndex, apiSearch, apiSearchWorkspace, apiFeedback,
  apiGetFavorites, apiSetFavorite,
  apiGetSaved, apiAddSaved, apiDeleteSaved,
  apiMap, apiDiagnostics, apiBuildFast, apiBuildOCR, apiLookalikes, apiResolveLookalike,
  apiGetTags, apiSetTags, thumbUrl, apiOpen, apiWorkspaceList, apiWorkspaceAdd, apiWorkspaceRemove, apiEditOps, apiUpscale,
  type SearchResult,
} from './api'

const engines = [
  { key: 'local', label: 'On-device (Recommended)' },
  { key: 'local-compat', label: 'On-device (Compatible)' },
  { key: 'hf', label: 'Hugging Face (CLIP)' },
  { key: 'hf-caption', label: 'Hugging Face (Caption)' },
  { key: 'openai', label: 'OpenAI (Captions)' },
]

const basename = (p: string) => p.split('/').pop() || p

export default function App() {
  const [dir, setDir] = useState('')
  const [engine, setEngine] = useState('local')
  const [hfToken, setHfToken] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [query, setQuery] = useState('')
  const [topK, setTopK] = useState(24)
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searchId, setSearchId] = useState('')
  const [fav, setFav] = useState<string[]>([])
  const [favOnly, setFavOnly] = useState(false)
  const [allTags, setAllTags] = useState<string[]>([])
  const [tagsMap, setTagsMap] = useState<Record<string, string[]>>({})
  const [tagFilter, setTagFilter] = useState('')
  const [saved, setSaved] = useState<{ name: string; query: string; top_k?: number }[]>([])
  const [points, setPoints] = useState<{ lat: number; lon: number }[]>([])
  const [diag, setDiag] = useState<{ folder: string; engines: { key: string; index_dir: string; count: number; fast?: { annoy: boolean; faiss: boolean; hnsw: boolean } }[]; free_gb: number; os: string } | null>(null)
  const [groups, setGroups] = useState<{ id: string; paths: string[]; resolved: boolean }[]>([])
  const [useFast, setUseFast] = useState(false)
  const [fastKind, setFastKind] = useState<'annoy'|'faiss'|'hnsw'|''>('')
  const [useCaps, setUseCaps] = useState(false)
  const [vlmModel, setVlmModel] = useState('Qwen/Qwen2-VL-2B-Instruct')
  const [camera, setCamera] = useState('')
  const [isoMin, setIsoMin] = useState('')
  const [isoMax, setIsoMax] = useState('')
  const [fMin, setFMin] = useState('')
  const [fMax, setFMax] = useState('')
  const [workspace, setWorkspace] = useState<string[]>([])
  const [wsToggle, setWsToggle] = useState(false)
  const [viewMode, setViewMode] = useState<'grid'|'film'>('grid')
  const [collections, setCollections] = useState<Record<string,string[]>>({})
  const [showWelcome, setShowWelcome] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const needsHf = engine.startsWith('hf')
  const needsOAI = engine === 'openai'

  async function loadFav() { try { const f = await apiGetFavorites(dir); setFav(f.favorites || []) } catch {} }
  async function loadSaved() { try { const r = await apiGetSaved(dir); setSaved(r.saved || []) } catch {} }
  async function loadDiag() { try { const r = await apiDiagnostics(dir); setDiag(r) } catch {} }
  async function loadTags() { try { const r = await apiGetTags(dir); setTagsMap(r.tags || {}); setAllTags(r.all || []) } catch {} }
  async function loadCollectionsUI() { try { const { apiGetCollections } = await import('./api'); const r = await apiGetCollections(dir); setCollections(r.collections||{}) } catch {} }

  async function doIndex() {
    setBusy('Indexing…'); setNote('')
    try { const r = await apiIndex(dir, engine, 32, needsHf ? hfToken : undefined, needsOAI ? openaiKey : undefined); setNote(`Indexed. New ${r.new}, Updated ${r.updated}, Total ${r.total}`) } catch (e:any) { setNote(e.message || 'Index failed') } finally { setBusy('') }
  }

  async function doSearch() {
    setBusy('Searching…'); setNote('')
    try {
      const tags = tagFilter.split(',').map(s=>s.trim()).filter(Boolean)
      let r
      if (wsToggle) {
        r = await apiSearchWorkspace(dir, query, engine, topK, { favoritesOnly: favOnly, tags })
      } else {
        r = await apiSearch(dir, query, engine, topK, { hfToken: needsHf ? hfToken : undefined, openaiKey: needsOAI ? openaiKey : undefined, favoritesOnly: favOnly, tags, ...(useFast ? { useFast: true, fastKind: fastKind || undefined } : {}), useCaptions: useCaps, camera: camera || undefined, isoMin: isoMin ? parseInt(isoMin,10) : undefined, isoMax: isoMax ? parseInt(isoMax,10) : undefined, fMin: fMin ? parseFloat(fMin) : undefined, fMax: fMax ? parseFloat(fMax) : undefined } as any)
      }
      setResults(r.results || []); setSearchId(r.search_id); setNote(`Found ${r.results?.length || 0} results.`)
      await Promise.all([loadFav(), loadSaved(), loadTags(), loadDiag()])
    } catch (e:any) { setNote(e.message || 'Search failed') } finally { setBusy('') }
  }

  async function toggleFavorite(p: string) { const isFav = fav.includes(p); try { const r = await apiSetFavorite(dir, p, !isFav); setFav(r.favorites || []) } catch {} }
  async function saveCurrent() { if (!dir || !query) { setNote('Enter folder and query'); return } const name = prompt('Saved search name?', query.slice(0,40))||''; if (!name.trim()) return; try{ await apiAddSaved(dir, name.trim(), query, topK); await loadSaved(); setNote('Saved') } catch(e:any){ setNote(e.message) } }
  async function runSaved(name: string) { const it = saved.find(s=>s.name===name); if (!it) return; setQuery(it.query||''); setTopK(it.top_k||24); await doSearch() }
  async function deleteSaved(name: string) { try { await apiDeleteSaved(dir, name); await loadSaved() } catch {} }
  async function buildFast(kind: 'annoy'|'faiss'|'hnsw') { setBusy(`Preparing ${kind.toUpperCase()}…`); try { await apiBuildFast(dir, kind, engine, needsHf?hfToken:undefined, needsOAI?openaiKey:undefined); setNote(`${kind.toUpperCase()} ready`) } catch(e:any){ setNote(e.message) } finally { setBusy('') } }
  async function buildOCR() { setBusy('Extracting text (OCR)…'); try { const r = await apiBuildOCR(dir, engine, ['en'], needsHf?hfToken:undefined, needsOAI?openaiKey:undefined); setNote(`OCR updated ${r.updated} images`) } catch(e:any){ setNote(e.message) } finally { setBusy('') } }
  async function buildMetadata() { setBusy('Building metadata…'); try { const { apiBuildMetadata } = await import('./api'); const r = await apiBuildMetadata(dir, engine, needsHf?hfToken:undefined, needsOAI?openaiKey:undefined); setNote(`Metadata ready (${r.updated})`) } catch(e:any){ setNote(e.message) } finally { setBusy('') } }
  async function autoTag() { setBusy('Auto-tagging…'); try { const r = await fetch(`${(import.meta as any).env?.VITE_API_BASE || window.location.origin}/autotag`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ dir, provider: engine })}); if(!r.ok) throw new Error(await r.text()); const j = await r.json(); setNote(`Auto-tagged ${j.updated} items`); await loadTags() } catch(e:any){ setNote(e.message) } finally { setBusy('') } }
  async function loadMap() { try { const r = await apiMap(dir); setPoints(r.points||[]) } catch {} }
  async function loadLookalikes() { try { const r = await apiLookalikes(dir,5); setGroups(r.groups||[]) } catch {} }
  async function resolveGroup(paths: string[]) { try { await apiResolveLookalike(dir, paths); await loadLookalikes() } catch {} }
  async function submitFeedback() { const boxes = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="fb"]:checked')).map(x=>x.value); if(!searchId){alert('Run a search first.');return} try{ await apiFeedback(dir, searchId, query, boxes, ''); alert('Thanks!') } catch{} }

  useEffect(()=>{ if (dir) { loadFav(); loadSaved(); loadTags(); loadDiag(); loadCollectionsUI() } }, [dir])
  useEffect(()=>{ apiWorkspaceList().then(w=>setWorkspace(w.folders||[])).catch(()=>{}) }, [])
  useEffect(()=>{ try{ if(!localStorage.getItem('ps_if_welcome_done')) setShowWelcome(true) } catch{} }, [])

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-1">📸 Photo Search – Intent‑First</h1>
      <p className="text-sm text-gray-600 mb-3">Private by default; choose a cloud engine only if you want.</p>

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 items-end">
        <div className="lg:col-span-2">
          <label className="block text-sm">Your photo folder</label>
          <input value={dir} onChange={e=>setDir(e.target.value)} placeholder="/path/to/photos" className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm">Engine</label>
          <select value={engine} onChange={e=>setEngine(e.target.value)} className="w-full border rounded px-3 py-2">
            {engines.map(e=> <option key={e.key} value={e.key}>{e.label}</option>)}
          </select>
        <div className="flex items-center gap-2 text-sm">
          <div>Camera</div>
          <input value={camera} onChange={e=>setCamera(e.target.value)} placeholder="e.g., iPhone" className="border rounded px-2 py-1" />
          <div>ISO</div>
          <input value={isoMin} onChange={e=>setIsoMin(e.target.value)} placeholder="min" className="w-20 border rounded px-2 py-1" />
          <div>to</div>
          <input value={isoMax} onChange={e=>setIsoMax(e.target.value)} placeholder="max" className="w-20 border rounded px-2 py-1" />
          <div>f/</div>
          <input value={fMin} onChange={e=>setFMin(e.target.value)} placeholder="min" className="w-20 border rounded px-2 py-1" />
          <div>to</div>
          <input value={fMax} onChange={e=>setFMax(e.target.value)} placeholder="max" className="w-20 border rounded px-2 py-1" />
        </div>
        </div>
        <div className="lg:col-span-2">
          <label className="block text-sm">Query</label>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="friends on beach" className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <button onClick={doIndex} className="w-full bg-gray-800 text-white rounded px-3 py-2">{busy || 'Build Index'}</button>
          <button onClick={()=>setShowHelp(true)} className="w-full mt-2 bg-gray-200 rounded px-3 py-2">Help</button>
        </div>
      </div>

      {(needsHf || needsOAI) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          {needsHf && (
            <div>
              <label className="block text-sm">HF API token</label>
              <input value={hfToken} onChange={e=>setHfToken(e.target.value)} type="password" className="w-full border rounded px-3 py-2" />
            </div>
          )}
          {needsOAI && (
            <div>
              <label className="block text-sm">OpenAI API key</label>
              <input value={openaiKey} onChange={e=>setOpenaiKey(e.target.value)} type="password" className="w-full border rounded px-3 py-2" />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <button onClick={doSearch} className="bg-blue-600 text-white rounded px-4 py-2">Search</button>
        <div className="text-sm text-gray-700">Top‑K</div>
        <input type="number" min={1} max={200} value={topK} onChange={e=>setTopK(parseInt(e.target.value||'24',10))} className="w-20 border rounded px-2 py-1" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={favOnly} onChange={e=>setFavOnly(e.target.checked)} /> Favorites only</label>
        <div className="text-sm">Filter tags (comma):</div>
        <input value={tagFilter} onChange={e=>setTagFilter(e.target.value)} placeholder="e.g., beach,friends" className="border rounded px-2 py-1" />
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
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={useFast} onChange={e=>setUseFast(e.target.checked)} /> Use fast index</label>
        <select value={fastKind} onChange={e=>setFastKind(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
          <option value="">Auto</option>
          <option value="faiss">FAISS</option>
          <option value="hnsw">HNSW</option>
          <option value="annoy">Annoy</option>
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={wsToggle} onChange={e=>setWsToggle(e.target.checked)} /> Search across workspace</label>
        <div className="flex items-center gap-2 text-sm">
          <div>View</div>
          <select value={viewMode} onChange={e=>setViewMode(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
            <option value="grid">Grid</option>
            <option value="film">Filmstrip</option>
          </select>
        </div>
        <div className="text-sm text-gray-500">{note}</div>
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {results.map((r, i)=> (
          <div key={i} className="bg-white border rounded p-2 text-xs">
            <div className="font-semibold truncate" title={r.path}>{basename(r.path)}</div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!selected[r.path]} onChange={e=> setSelected(s=>({...s, [r.path]: e.target.checked}))} /> select</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!selected[r.path]} onChange={e=> setSelected(s=>({...s, [r.path]: e.target.checked}))} /> select</label>
            <div className="text-gray-600">score {r.score.toFixed(3)}</div>
            <img src={thumbUrl(dir, engine, r.path, 256)} alt="thumb" className="mt-2 w-full h-32 object-cover rounded" />
            <div className="flex gap-2 mt-2 flex-wrap">
              <button onClick={()=>toggleFavorite(r.path)} className={`px-2 py-1 rounded ${fav.includes(r.path) ? 'bg-pink-600 text-white' : 'bg-gray-200'}`}>♥ Favorite</button>
              <button onClick={()=>apiOpen(dir, r.path)} className="px-2 py-1 rounded bg-gray-200">Reveal</button>
              <button onClick={async()=>{ try{ const { apiSearchLike } = await import('./api'); const res = await apiSearchLike(dir, r.path, engine, topK); setResults(res.results||[]); setNote('Similar results') } catch(e:any){ setNote(e.message) } }} className="px-2 py-1 rounded bg-gray-200">More like this</button>
              <button onClick={async()=>{ try{ await apiEditOps(dir, r.path, { rotate: 90 }); setNote('Rotated 90°') } catch(e:any){ setNote(e.message) } }} className="px-2 py-1 rounded bg-gray-200">Rotate 90°</button>
              <button onClick={async()=>{ try{ await apiUpscale(dir, r.path, 2, 'pil'); setNote('Upscaled 2× (saved)') } catch(e:any){ setNote(e.message) } }} className="px-2 py-1 rounded bg-gray-200">Upscale 2×</button>
            </div>
            <div className="mt-2 text-xs">
              <div className="text-gray-600">Tags: {(tagsMap[r.path]||[]).join(', ') || '—'}</div>
              <div className="flex gap-2 mt-1">
                <input id={`tags_${i}`} defaultValue={(tagsMap[r.path]||[]).join(', ')} className="flex-1 border rounded px-2 py-1" placeholder="comma,separated" />
                <button onClick={async()=>{
                  const el = document.getElementById(`tags_${i}`) as HTMLInputElement
                  const next = (el.value||'').split(',').map(s=>s.trim()).filter(Boolean)
                  try { await apiSetTags(dir, r.path, next); await loadTags() } catch {}
                }} className="px-2 py-1 rounded bg-gray-200">Save tags</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {viewMode==='film' && (
      <div className="mt-4 overflow-x-auto">
        <div className="flex gap-3 min-w-full">
          {results.map((r,i)=> (
            <div key={i} className="w-48 shrink-0 bg-white border rounded p-2 text-xs">
              <div className="font-semibold truncate" title={r.path}>{basename(r.path)}</div>
              <img src={thumbUrl(dir, engine, r.path, 256)} alt="thumb" className="mt-2 w-full h-28 object-cover rounded" />
              <div className="flex gap-2 mt-2 flex-wrap">
                <button onClick={()=>toggleFavorite(r.path)} className={`px-2 py-1 rounded ${fav.includes(r.path) ? 'bg-pink-600 text-white' : 'bg-gray-200'}`}>♥</button>
                <button onClick={()=>apiOpen(dir, r.path)} className="px-2 py-1 rounded bg-gray-200">Reveal</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-sm">
        <div>Selected: {Object.values(selected).filter(Boolean).length}</div>
        <button onClick={()=> setSelected(Object.fromEntries(results.map(r=>[r.path, true])))} className="bg-gray-200 rounded px-2 py-1">Select all</button>
        <button onClick={()=> setSelected({})} className="bg-gray-200 rounded px-2 py-1">Clear</button>
        <button onClick={async()=>{
          const sel = Object.entries(selected).filter(([,v])=>v).map(([p])=>p)
          if (sel.length === 0) { alert('Select some photos first'); return }
          const dest = prompt('Export to folder (absolute path):', '') || ''
          if (!dest.trim()) return
          const strip = confirm('Strip EXIF metadata? OK = Yes, Cancel = No')
          setBusy('Exporting…')
          try {
            const { apiExport } = await import('./api')
            const r = await apiExport(dir, sel, dest.trim(), 'copy', strip, false)
            setNote(`Exported ${r.copied}, skipped ${r.skipped}, errors ${r.errors} → ${r.dest}`)
          } catch(e:any) { setNote(e.message) } finally { setBusy('') }
        }} className="bg-gray-200 rounded px-2 py-1">Export selected…</button>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <div>Selected: {selectedCount}</div>
        <button onClick={()=> setSelected(Object.fromEntries(results.map(r=>[r.path, true])))} className="bg-gray-200 rounded px-2 py-1">Select all</button>
        <button onClick={()=> setSelected({})} className="bg-gray-200 rounded px-2 py-1">Clear</button>
        <button onClick={async()=>{
          const sel = Object.entries(selected).filter(([,v])=>v).map(([p])=>p)
          if (sel.length === 0) { alert('Select some photos first'); return }
          const dest = prompt('Export to folder (absolute path):', '') || ''
          if (!dest.trim()) return
          const strip = confirm('Strip EXIF metadata? OK = Yes, Cancel = No')
          setBusy('Exporting…')
          try {
            const { apiExport } = await import('./api')
            const r = await apiExport(dir, sel, dest.trim(), 'copy', strip, false)
            setNote(`Exported ${r.copied}, skipped ${r.skipped}, errors ${r.errors} → ${r.dest}`)
          } catch(e:any) { setNote(e.message) } finally { setBusy('') }
        }} className="bg-gray-200 rounded px-2 py-1">Export selected…</button>
      </div>

      <div className="mt-4">
        <button onClick={submitFeedback} disabled={!searchId} className="bg-gray-800 text-white rounded px-3 py-2">Submit feedback</button>
      </div>

      {/* Saved */}
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

      {/* Speed, OCR & Captions */}
      <div className="mt-6 bg-white border rounded p-3">
        <h2 className="font-semibold mb-2">Speed, OCR & Captions</h2>
        <div className="flex gap-2 flex-wrap">
          <button onClick={()=>buildFast('annoy')} className="bg-gray-200 rounded px-3 py-1 text-sm">Prepare Annoy</button>
          <button onClick={()=>buildFast('faiss')} className="bg-gray-200 rounded px-3 py-1 text-sm">Prepare FAISS</button>
          <button onClick={()=>buildFast('hnsw')} className="bg-gray-200 rounded px-3 py-1 text-sm">Prepare HNSW</button>
          <button onClick={buildOCR} className="bg-gray-200 rounded px-3 py-1 text-sm">Build OCR</button>
          <button onClick={buildMetadata} className="bg-gray-200 rounded px-3 py-1 text-sm">Build Metadata</button>
          <button onClick={autoTag} className="bg-gray-200 rounded px-3 py-1 text-sm">Auto‑tag (from captions)</button>
          <input value={vlmModel} onChange={e=>setVlmModel(e.target.value)} placeholder="Qwen/Qwen2-VL-2B-Instruct" className="border rounded px-2 py-1 text-sm" />
          <button onClick={async()=>{ setBusy('Captioning…'); try{ const { apiBuildCaptions } = await import('./api'); const r = await apiBuildCaptions(dir, vlmModel, engine, needsHf?hfToken:undefined, needsOAI?openaiKey:undefined); setNote(`Captions updated ${r.updated}`) } catch(e:any){ setNote(e.message) } finally { setBusy('') } }} className="bg-gray-200 rounded px-3 py-1 text-sm">Build Captions</button>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={useCaps} onChange={e=>setUseCaps(e.target.checked)} /> Use captions in search</label>
          <input value={vlmModel} onChange={e=>setVlmModel(e.target.value)} placeholder="Qwen/Qwen2-VL-2B-Instruct" className="border rounded px-2 py-1 text-sm" />
          <button onClick={async()=>{ setBusy('Captioning…'); try{ const { apiBuildCaptions } = await import('./api'); const r = await apiBuildCaptions(dir, vlmModel, engine, needsHf?hfToken:undefined, needsOAI?openaiKey:undefined); setNote(`Captions updated ${r.updated}`) } catch(e:any){ setNote(e.message) } finally { setBusy('') } }} className="bg-gray-200 rounded px-3 py-1 text-sm">Build Captions</button>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={useCaps} onChange={e=>setUseCaps(e.target.checked)} /> Use captions in search</label>
        </div>
      </div>


      {/* Welcome Wizard */}
      {showWelcome && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-xl rounded shadow p-5">
            <div className="text-lg font-semibold mb-2">Welcome to Photo Search</div>
            <ol className="list-decimal ml-5 text-sm text-gray-700">
              <li>Pick your photo folder</li>
              <li>Click “Build Index”</li>
              <li>Type a description and Search</li>
            </ol>
            <div className="text-xs text-gray-600 mt-2">Tip: Prepare FAISS/HNSW/Annoy; build OCR/Captions to improve recall.</div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={()=>{ setShowWelcome(false); try{ localStorage.setItem('ps_if_welcome_done','1') } catch{} }} className="px-3 py-1 bg-blue-600 text-white rounded">Get started</button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded shadow p-5 text-sm">
            <div className="text-lg font-semibold mb-2">Quick Help</div>
            <ul className="list-disc ml-5 space-y-1 text-gray-700">
              <li>Use tag chips and EXIF filters for precision.</li>
              <li>Build Metadata to filter by camera/ISO/f-number.</li>
              <li>Build OCR/Captions and enable “Use captions in search”.</li>
              <li>Select photos to export or save as a collection.</li>
              <li>Try “More like this” on any result.</li>
            </ul>
            <div className="mt-3 flex justify-end">
              <button onClick={()=>setShowHelp(false)} className="px-3 py-1 bg-gray-200 rounded">Close</button>
            </div>
          </div>
        </div>
      )}


      {/* Look‑alikes */}
      <div className="mt-6 bg-white border rounded p-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Look‑alikes</h2>
          <button onClick={loadLookalikes} className="bg-gray-200 rounded px-3 py-1 text-sm">Scan</button>
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
                      <div className="truncate" title={p}>{basename(p)}</div>
                      <img src={thumbUrl(dir, engine, p, 196)} className="w-full h-24 object-cover rounded mt-1" />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={()=>resolveGroup(g.paths)} className="bg-gray-200 rounded px-3 py-1">Mark resolved</button>
                  <button onClick={async()=>{ for (const p of g.paths) { try { await apiSetFavorite(dir, p, true) } catch {} } alert('Added group to Favorites') }} className="bg-gray-200 rounded px-3 py-1">Add all to Favorites</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workspace */}
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
            <input id="ws_add" placeholder="/path/to/folder" className="flex-1 border rounded px-2 py-1" />
            <button onClick={async()=>{ const el = document.getElementById('ws_add') as HTMLInputElement; const val = el.value.trim(); if (!val) return; try{ const r = await apiWorkspaceAdd(val); setWorkspace(r.folders||[]); el.value='' } catch{} }} className="px-3 py-1 bg-gray-200 rounded">Add</button>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="mt-6 bg-white border rounded p-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Map (GPS)</h2>
          <button onClick={loadMap} className="bg-gray-200 rounded px-3 py-1 text-sm">Load</button>
        </div>
        {points.length === 0 ? <div className="text-sm text-gray-600 mt-2">No GPS points found.</div> : (
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
            {points.map((p,i)=> (<div key={i} className="border rounded p-2">{p.lat.toFixed(5)}, {p.lon.toFixed(5)}</div>))}
          </div>
        )}
      </div>

      {/* Diagnostics */}
      <div className="mt-6 bg-white border rounded p-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Diagnostics</h2>
          <button onClick={loadDiag} className="bg-gray-200 rounded px-3 py-1 text-sm">Refresh</button>
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
                        {e.fast && (
                          <div className="text-xs mt-1 text-gray-700">Fast: Annoy {e.fast.annoy ? '✅' : '❌'}, FAISS {e.fast.faiss ? '✅' : '❌'}, HNSW {e.fast.hnsw ? '✅' : '❌'}</div>
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
    </div>
  )
}
