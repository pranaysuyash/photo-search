import React, { useEffect } from 'react'
import {
  apiIndex, apiSearch, apiSearchWorkspace, apiFeedback,
  apiGetFavorites, apiSetFavorite,
  apiGetSaved, apiAddSaved, apiDeleteSaved,
  apiMap, apiDiagnostics, apiBuildFast, apiBuildOCR, apiLookalikes, apiResolveLookalike,
  apiGetTags, apiSetTags, thumbUrl, apiOpen, apiWorkspaceList, apiLibrary,
  apiFacesClusters,
  type SearchResult,
} from './api'

// Components
import SearchControls from './components/SearchControls'
import IndexManager from './components/IndexManager'
import LibraryBrowser from './components/LibraryBrowser'
import ResultsPanel from './components/ResultsPanel'
import Collections from './components/Collections'
import Workspace from './components/Workspace'
import PeopleView from './components/PeopleView'
import MapView from './components/MapView'
import SmartCollections from './components/SmartCollections'
import LookAlikesView from './components/LookAlikesView'
import TripsView from './components/TripsView'

// Unified store hooks to prevent re-renders
import {
  useSettings,
  usePhoto,
  useUI,
  useWorkspace,
  useSettingsActions,
  usePhotoActions,
  useUIActions,
  useWorkspaceActions
} from './stores/useStores'

const basename = (p: string) => p.split('/').pop() || p

export default function App() {
  // Use unified store hooks to prevent re-renders
  const settings = useSettings()
  const photo = usePhoto()
  const ui = useUI()
  const workspace = useWorkspace()
  
  // Store actions
  const settingsActions = useSettingsActions()
  const photoActions = usePhotoActions()
  const uiActions = useUIActions()
  const workspaceActions = useWorkspaceActions()
  
  // Destructure for easier access
  const { dir, engine, hfToken, openaiKey, needsHf, needsOAI, camera, isoMin, isoMax, fMin, fMax, place, useCaps, useOcr, hasText, useFast, fastKind } = settings
  const { results, searchId, query, topK, fav, favOnly, tags, saved, collections, smart, library } = photo
  const { busy, note, showWelcome, showHelp, viewMode } = ui
  const { workspace: workspaceData, wsToggle, persons, clusters, groups, points, diag } = workspace

  // Data loading functions (extracted from hooks)
  async function loadFav() { 
    try { 
      const f = await apiGetFavorites(dir)
      photoActions.setFavorites(f.favorites || []) 
    } catch {} 
  }

  async function loadSaved() { 
    try { 
      const r = await apiGetSaved(dir)
      photoActions.setSaved(r.saved || []) 
    } catch {} 
  }

  async function loadDiag() { 
    try { 
      const r = await apiDiagnostics(dir, engine)
      workspaceActions.setDiag(r) 
    } catch {} 
  }

  async function loadTags() { 
    try { 
      const r = await apiGetTags(dir)
      photoActions.setTagsMap(r.tags || {})
      photoActions.setAllTags(r.all || [])
    } catch {} 
  }

  async function loadCollectionsUI() { 
    try { 
      const { apiGetCollections } = await import('./api')
      const r = await apiGetCollections(dir)
      photoActions.setCollections(r.collections||{}) 
    } catch {} 
  }

  async function loadLibrary(limit = 120, offset = 0) { 
    try { 
      if (!dir) return
      const r = await apiLibrary(dir, engine, limit, offset)
      photoActions.setLibrary(r.paths||[]) 
    } catch {} 
  }

  async function loadFaces() { 
    try { 
      const r = await apiFacesClusters(dir)
      workspaceActions.setClusters(r.clusters||[]) 
    } catch {} 
  }

  async function loadMap() { 
    try { 
      const r = await apiMap(dir)
      workspaceActions.setPoints(r.points||[]) 
    } catch {} 
  }

  async function loadLookalikes() { 
    try { 
      const r = await apiLookalikes(dir,5)
      workspaceActions.setGroups(r.groups||[]) 
    } catch {} 
  }

  // Business logic functions
  async function doIndex() {
    uiActions.setBusy('Indexing…')
    uiActions.setNote('')
    try { 
      const r = await apiIndex(dir, engine, 32, needsHf ? hfToken : undefined, needsOAI ? openaiKey : undefined)
      uiActions.setNote(`Indexed. New ${r.new}, Updated ${r.updated}, Total ${r.total}`) 
      await loadLibrary(120,0)
    } catch (e:any) { 
      uiActions.setNote(e.message || 'Index failed') 
    } finally { 
      uiActions.setBusy('') 
    }
  }

  async function doSearch() {
    uiActions.setBusy('Searching…')
    uiActions.setNote('')
    try {
      const tagList = tags.tagFilter.split(',').map(s=>s.trim()).filter(Boolean)
      let r
      if (wsToggle) {
        const ppl = persons.filter(Boolean)
        r = await apiSearchWorkspace(dir, query, engine, topK, {
          favoritesOnly: favOnly, tags: tagList,
          place: place || undefined, hasText,
          ...(ppl.length === 1 ? { person: ppl[0] } : (ppl.length > 1 ? { persons: ppl } : {}))
        })
      } else {
        const ppl = persons.filter(Boolean)
        r = await apiSearch(dir, query, engine, topK, { 
          hfToken: needsHf ? hfToken : undefined, 
          openaiKey: needsOAI ? openaiKey : undefined, 
          favoritesOnly: favOnly, 
          tags: tagList, 
          ...(useFast ? { useFast: true, fastKind: fastKind || undefined } : {}), 
          useCaptions: useCaps, 
          useOcr,
          camera: camera || undefined, 
          isoMin: isoMin ? parseInt(isoMin,10) : undefined, 
          isoMax: isoMax ? parseInt(isoMax,10) : undefined, 
          fMin: fMin ? parseFloat(fMin) : undefined, 
          fMax: fMax ? parseFloat(fMax) : undefined,
          place: place || undefined, 
          hasText: hasText || undefined, 
          ...(ppl.length === 1 ? { person: ppl[0] } : (ppl.length > 1 ? { persons: ppl } : {})) 
        } as any)
      }
      photoActions.setResults(r.results || [])
      photoActions.setSearchId(r.search_id)
      uiActions.setNote(`Found ${r.results?.length || 0} results.`)
      await Promise.all([loadFav(), loadSaved(), loadTags(), loadDiag()])
    } catch (e:any) { 
      uiActions.setNote(e.message || 'Search failed') 
    } finally { 
      uiActions.setBusy('') 
    }
  }

  async function toggleFavorite(p: string) { 
    const isFav = fav.includes(p)
    try { 
      const r = await apiSetFavorite(dir, p, !isFav)
      photoActions.setFavorites(r.favorites || []) 
    } catch {} 
  }

  async function buildFast(kind: 'annoy'|'faiss'|'hnsw') { 
    uiActions.setBusy(`Preparing ${kind.toUpperCase()}…`)
    try { 
      await apiBuildFast(dir, kind, engine, needsHf?hfToken:undefined, needsOAI?openaiKey:undefined)
      uiActions.setNote(`${kind.toUpperCase()} ready`) 
    } catch(e:any){ 
      uiActions.setNote(e.message) 
    } finally { 
      uiActions.setBusy('') 
    }
  }

  async function buildOCR() { 
    uiActions.setBusy('Extracting text (OCR)…')
    try { 
      const r = await apiBuildOCR(dir, engine, ['en'], needsHf?hfToken:undefined, needsOAI?openaiKey:undefined)
      uiActions.setNote(`OCR updated ${r.updated} images`) 
    } catch(e:any){ 
      uiActions.setNote(e.message) 
    } finally { 
      uiActions.setBusy('') 
    }
  }

  async function buildMetadata() { 
    uiActions.setBusy('Building metadata…')
    try { 
      const { apiBuildMetadata } = await import('./api')
      const r = await apiBuildMetadata(dir, engine, needsHf?hfToken:undefined, needsOAI?openaiKey:undefined)
      uiActions.setNote(`Metadata ready (${r.updated})`) 
    } catch(e:any){ 
      uiActions.setNote(e.message) 
    } finally { 
      uiActions.setBusy('') 
    }
  }

  async function autoTag() { 
    uiActions.setBusy('Auto-tagging…')
    try { 
      const r = await fetch(`${(import.meta as any).env?.VITE_API_BASE || window.location.origin}/autotag`, { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({ dir, provider: engine })
      })
      if(!r.ok) throw new Error(await r.text())
      const j = await r.json()
      uiActions.setNote(`Auto-tagged ${j.updated} items`)
      await loadTags() 
    } catch(e:any){ 
      uiActions.setNote(e.message) 
    } finally { 
      uiActions.setBusy('') 
    }
  }

  async function submitFeedback() { 
    const boxes = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="fb"]:checked')).map(x=>x.value)
    if(!searchId){alert('Run a search first.');return} 
    try{ 
      await apiFeedback(dir, searchId, query, boxes, '')
      alert('Thanks!') 
    } catch{} 
  }

  // Effects - load data when directory changes
  useEffect(()=>{ 
    if (dir) { 
      loadFav()
      loadSaved() 
      loadTags()
      loadDiag()
      loadCollectionsUI()
      loadFaces() 
    } 
  }, [dir])

  useEffect(()=>{ 
    apiWorkspaceList().then(w=>workspaceActions.setWorkspace(w.folders||[])).catch(()=>{}) 
  }, [])

  useEffect(()=>{ 
    try{ 
      if(!localStorage.getItem('ps_if_welcome_done')) uiActions.setShowWelcome(true) 
    } catch{} 
  }, [])

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-1">📸 Photo Search – Intent‑First</h1>
      <p className="text-sm text-gray-600 mb-3">Private by default; choose a cloud engine only if you want.</p>

      {/* Search Controls - Refactored Component */}
      <SearchControls onSearch={doSearch} onShowHelp={() => uiActions.setShowHelp(true)} />

      {/* Index Management - Refactored Component */}
      <div className="mt-6">
        <IndexManager 
          dir={dir}
          engine={engine}
          busy={busy}
          note={note}
          diag={diag}
          onIndex={doIndex}
          onBuildFast={buildFast}
          onBuildOCR={buildOCR}
          onBuildMetadata={buildMetadata}
          onAutoTag={autoTag}
          onLoadDiag={loadDiag}
        />
      </div>

      {/* Results - Component with keyboard shortcuts & lightbox */}
      <div className="mt-6">
        <ResultsPanel />
      </div>

      {/* Library Browser - Refactored Component */}
      <div className="mt-6">
        <LibraryBrowser 
          dir={dir}
          engine={engine}
          library={library}
          onLoadLibrary={loadLibrary}
        />
      </div>

      {/* Look-alikes - Refactored Component */}
      <div className="mt-6">
        <LookAlikesView 
          dir={dir}
          engine={engine}
          groups={groups}
          onLoadLookalikes={loadLookalikes}
        />
      </div>

      {/* Workspace - Refactored Component */}
      <div className="mt-6">
        <Workspace 
          workspace={workspaceData}
          setWorkspace={workspaceActions.setWorkspace}
        />
      </div>

      {/* Map - Refactored Component */}
      <div className="mt-6">
        <MapView 
          points={points}
          onLoadMap={loadMap}
        />
      </div>

      {/* People - Refactored Component */}
      <div className="mt-6">
        <PeopleView 
          dir={dir}
          engine={engine}
          clusters={clusters}
          persons={persons}
          setPersons={workspaceActions.setPersons}
          busy={busy}
          setBusy={uiActions.setBusy}
          setNote={uiActions.setNote}
          onLoadFaces={loadFaces}
        />
      </div>

      {/* Collections - Refactored Component */}
      <div className="mt-6">
        <Collections 
          collections={collections}
          onLoadCollections={loadCollectionsUI}
        />
      </div>

      {/* Smart Collections - Refactored Component */}
      <div className="mt-6">
        <SmartCollections 
          dir={dir}
          engine={engine}
          topK={topK}
          smart={smart}
          setSmart={photoActions.setSmart}
          setResults={photoActions.setResults}
          setSearchId={photoActions.setSearchId}
          setNote={uiActions.setNote}
          query={query}
          favOnly={favOnly}
          tagFilter={tags.tagFilter}
          useCaps={useCaps}
          useOcr={useOcr}
          hasText={hasText}
          camera={camera}
          isoMin={isoMin}
          isoMax={isoMax}
          fMin={fMin}
          fMax={fMax}
          place={place}
          persons={persons}
        />
      </div>

      {/* Trips - Refactored Component */}
      <div className="mt-6">
        <TripsView 
          dir={dir}
          engine={engine}
          setBusy={uiActions.setBusy}
          setNote={uiActions.setNote}
          setResults={photoActions.setResults}
        />
      </div>

      {/* Welcome Modal */}
      {showWelcome && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-xl rounded shadow p-5">
            <div className="text-lg font-semibold mb-2">Welcome to Photo Search</div>
            <ol className="list-decimal ml-5 text-sm text-gray-700">
              <li>Pick your photo folder</li>
              <li>Click "Build Index"</li>
              <li>Type a description and Search</li>
            </ol>
            <div className="text-xs text-gray-600 mt-2">Tip: Prepare FAISS/HNSW/Annoy; build OCR/Captions to improve recall.</div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={()=>{ 
                uiActions.setShowWelcome(false)
                try{ localStorage.setItem('ps_if_welcome_done','1') } catch{} 
              }} className="px-3 py-1 bg-blue-600 text-white rounded">Get started</button>
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
              <li>Build OCR/Captions and enable "Use captions in search".</li>
              <li>Select photos to export or save as a collection.</li>
              <li>Try "More like this" on any result.</li>
            </ul>
            <div className="mt-3 flex justify-end">
              <button onClick={()=>uiActions.setShowHelp(false)} className="px-3 py-1 bg-gray-200 rounded">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
