// React import not required with JSX runtime; keep component lean
import {
  useSettings,
  usePhoto,
  useUI,
  useWorkspaceState,
  useSettingsActions,
  usePhotoActions,
  useUIActions,
  useWorkspaceActions
} from '../stores/useStores'
import type { SettingsActions, PhotoActions, UIActions, WorkspaceActions } from '../stores/types'

const engines = [
  { key: 'local', label: 'On-device (Recommended)' },
  { key: 'local-compat', label: 'On-device (Compatible)' },
  { key: 'hf', label: 'Hugging Face (CLIP)' },
  { key: 'hf-caption', label: 'Hugging Face (Caption)' },
  { key: 'openai', label: 'OpenAI (Captions)' },
]

interface SearchControlsProps {
  onSearch: () => void
  onShowHelp: () => void
}

export default function SearchControls({ onSearch, onShowHelp }: SearchControlsProps) {
  // Use unified store hooks
  const settings = useSettings()
  const photo = usePhoto()
  const ui = useUI()
  const workspace = useWorkspaceState()
  
  // Actions
  const settingsActions = useSettingsActions() as SettingsActions
  const searchActions = usePhotoActions() as PhotoActions
  const uiActions = useUIActions() as UIActions
  const workspaceActions = useWorkspaceActions() as WorkspaceActions
  
  // Destructure for easier access
  const { dir, engine, hfToken, openaiKey, useFast, fastKind, useCaps, useOcr, hasText, place, camera, isoMin, isoMax, fMin, fMax, needsHf, needsOAI } = settings
  const { query, topK, favOnly, tags } = photo
  const { viewMode, note } = ui
  const { wsToggle, persons, diag } = workspace
  const { tagFilter, allTags } = tags

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 items-end">
        <div className="lg:col-span-2">
          <label htmlFor="ps_dir" className="block text-sm">Your photo folder</label>
          <input id="ps_dir" value={dir} onChange={e=>settingsActions.setDir(e.target.value)} placeholder="/path/to/photos" className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label htmlFor="ps_engine" className="block text-sm">Engine</label>
          <select id="ps_engine" value={engine} onChange={e=>settingsActions.setEngine(e.target.value)} className="w-full border rounded px-3 py-2">
            {engines.map(e=> <option key={e.key} value={e.key}>{e.label}</option>)}
          </select>
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="ps_camera" className="text-sm">Camera</label>
            <input id="ps_camera" value={camera} onChange={e=>settingsActions.setCamera(e.target.value)} placeholder="e.g., iPhone" className="border rounded px-2 py-1" />
            <label htmlFor="ps_iso_min" className="text-sm">ISO</label>
            <input id="ps_iso_min" value={isoMin} onChange={e=>settingsActions.setIsoMin(e.target.value)} placeholder="min" className="w-20 border rounded px-2 py-1" />
            <span>to</span>
            <input id="ps_iso_max" value={isoMax} onChange={e=>settingsActions.setIsoMax(e.target.value)} placeholder="max" className="w-20 border rounded px-2 py-1" />
            <label htmlFor="ps_fmin" className="text-sm">f/</label>
            <input id="ps_fmin" value={fMin} onChange={e=>settingsActions.setFMin(e.target.value)} placeholder="min" className="w-20 border rounded px-2 py-1" />
            <span>to</span>
            <input id="ps_fmax" value={fMax} onChange={e=>settingsActions.setFMax(e.target.value)} placeholder="max" className="w-20 border rounded px-2 py-1" />
          </div>
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="ps_query" className="block text-sm">Query</label>
          <input id="ps_query" value={query} onChange={e=>searchActions.setQuery(e.target.value)} placeholder="friends on beach" className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <button type="button" onClick={onShowHelp} className="w-full mt-2 bg-gray-200 rounded px-3 py-2">Help</button>
        </div>
      </div>

      {(needsHf || needsOAI) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          {needsHf && (
            <div>
              <label htmlFor="ps_hf" className="block text-sm">HF API token</label>
              <input id="ps_hf" value={hfToken} onChange={e=>settingsActions.setHfToken(e.target.value)} type="password" className="w-full border rounded px-3 py-2" />
            </div>
          )}
          {needsOAI && (
            <div>
              <label htmlFor="ps_oai" className="block text-sm">OpenAI API key</label>
              <input id="ps_oai" value={openaiKey} onChange={e=>settingsActions.setOpenaiKey(e.target.value)} type="password" className="w-full border rounded px-3 py-2" />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <button type="button" onClick={onSearch} className="bg-blue-600 text-white rounded px-4 py-2">Search</button>
        <div className="text-sm text-gray-700">Top‑K</div>
        <input id="ps_topk" type="number" min={1} max={200} value={topK} onChange={e=>searchActions.setTopK(parseInt(e.target.value||'24',10))} className="w-20 border rounded px-2 py-1" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={favOnly} onChange={e=>searchActions.setFavOnly(e.target.checked)} /> Favorites only</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={useCaps} onChange={e=>settingsActions.setUseCaps(e.target.checked)} /> Use captions</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={useOcr} onChange={e=>settingsActions.setUseOcr(e.target.checked)} /> Use OCR</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hasText} onChange={e=>settingsActions.setHasText(e.target.checked)} /> Has text</label>
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="ps_place" className="text-sm">Place</label>
          <input id="ps_place" value={place} onChange={e=>settingsActions.setPlace(e.target.value)} placeholder="e.g., San Francisco" className="border rounded px-2 py-1" />
        </div>
        <div className="text-sm">Filter tags (comma):</div>
        <input value={tagFilter} onChange={e=>searchActions.setTagFilter(e.target.value)} placeholder="e.g., beach,friends" className="border rounded px-2 py-1" />
        <div className="flex gap-1 flex-wrap">
          {allTags.map((t: string) => {
            const chosen = (tagFilter.split(',').map((s: string)=>s.trim()).filter(Boolean)).includes(t)
            return (
              <button key={t} onClick={()=>{
                const cur = new Set(tagFilter.split(',').map((s: string)=>s.trim()).filter(Boolean))
                if (cur.has(t)) cur.delete(t); else cur.add(t)
                searchActions.setTagFilter(Array.from(cur).join(','))
              }} className={`text-xs px-2 py-1 rounded ${chosen ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>{t}</button>
            )
          })}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={useFast} onChange={e=>settingsActions.setUseFast(e.target.checked)} /> Use fast index</label>
        {(() => {
          const st = diag?.engines?.[0]?.fast || undefined
          const fa = st?.faiss ?? true
          const hs = st?.hnsw ?? true
          const an = st?.annoy ?? true
          return (
            <select value={fastKind} onChange={e=>settingsActions.setFastKind(e.target.value as (''|'annoy'|'faiss'|'hnsw'))} className="border rounded px-2 py-1 text-sm">
              <option value="">Auto</option>
              <option value="faiss" disabled={!fa}>FAISS{st && !fa ? ' (not built)' : ''}</option>
              <option value="hnsw" disabled={!hs}>HNSW{st && !hs ? ' (not built)' : ''}</option>
              <option value="annoy" disabled={!an}>Annoy{st && !an ? ' (not built)' : ''}</option>
            </select>
          )
        })()}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={wsToggle} onChange={e=>workspaceActions.setWsToggle(e.target.checked)} /> Search across workspace</label>
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="ps_view" className="text-sm">View</label>
          <select id="ps_view" value={viewMode} onChange={e=>uiActions.setViewMode(e.target.value as ('grid'|'film'))} className="border rounded px-2 py-1 text-sm">
            <option value="grid">Grid</option>
            <option value="film">Filmstrip</option>
          </select>
        </div>
        {note && <div className="text-sm text-gray-500" aria-live="polite">{note}</div>}
        {persons.length > 0 && (
          <div className="flex items-center gap-1 text-xs">
            {persons.map(p => (
              <span key={p} className="px-2 py-1 bg-blue-600 text-white rounded flex items-center gap-2">
                {p}
                <button type="button" onClick={()=> workspaceActions.setPersons(persons.filter(x=>x!==p))} className="bg-white/20 rounded px-1" aria-label={`Remove ${p}`}>×</button>
              </span>
            ))}
            <button type="button" onClick={()=>workspaceActions.setPersons([])} className="px-2 py-1 bg-gray-200 rounded">Clear</button>
          </div>
        )}
      </div>
    </>
  )
}
