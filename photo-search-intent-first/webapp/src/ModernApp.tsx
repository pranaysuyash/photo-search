import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Search as IconSearch,
  Filter,
  Grid as IconGrid,
  List as IconList,
  Calendar,
  Map as IconMap,
  Star,
  Heart,
  Users,
  Camera,
  Settings,
  Upload,
  Download,
  Trash2,
  Tag as IconTag,
  Clock,
  MapPin,
  FolderOpen,
  BookmarkPlus,
  Bookmark,
  ClipboardList,
} from 'lucide-react'

import {
  apiSearch,
  apiSearchWorkspace,
  apiIndex,
  apiGetFavorites,
  apiSetFavorite,
  apiGetSaved,
  apiGetTags,
  apiExport,
  apiFacesClusters,
  apiMap,
  apiDiagnostics,
  apiBuildFast,
  apiBuildOCR,
  apiBuildMetadata,
  thumbUrl,
  type SearchResult,
} from './api'
import { apiDelete, apiUndoDelete } from './api'

import {
  // Individual settings hooks
  useDir,
  useEngine,
  useHfToken,
  useOpenaiKey,
  useFastIndexEnabled,
  useFastKind,
  useCaptionsEnabled,
  useOcrEnabled,
  useHasText,
  usePlace,
  useCamera,
  useIsoMin,
  useIsoMax,
  useFMin,
  useFMax,
  useNeedsHf,
  useNeedsOAI,
  // Individual photo hooks
  useSearchResults,
  useSearchQuery,
  useSearchId,
  useFavorites,
  useFavOnly,
  useTopK,
  useTags,
  useSavedSearches,
  useCollections,
  useSmartCollections,
  useLibrary,
  // Individual UI hooks
  useBusy,
  useNote,
  useViewMode,
  useShowWelcome,
  useShowHelp,
  // Individual workspace hooks
  useWorkspace,
  useWsToggle,
  usePersons,
  useClusters,
  useGroups,
  usePoints,
  useDiag,
  // Actions
  useSettingsActions,
  usePhotoActions,
  useUIActions,
  useWorkspaceActions,
} from './stores/useStores'

// Reuse existing feature components
import ResultsPanel from './components/ResultsPanel'
import JustifiedResults from './components/JustifiedResults'
import { Lightbox } from './components/Lightbox'
import LibraryBrowser from './components/LibraryBrowser'
import PeopleView from './components/PeopleView'
import MapView from './components/MapView'
import Collections from './components/Collections'
import SmartCollections from './components/SmartCollections'
import TripsView from './components/TripsView'
import SavedSearches from './components/SavedSearches'
import TasksView from './components/TasksView'
import type { PhotoActions, SettingsActions, UIActions, WorkspaceActions } from './stores/types'

const basename = (p: string) => p.split('/').pop() || p

type GridSize = 'small' | 'medium' | 'large'

export default function ModernApp() {
  // Individual hooks for settings
  const dir = useDir()
  const engine = useEngine()
  const hfToken = useHfToken()
  const openaiKey = useOpenaiKey()
  const useFast = useFastIndexEnabled()
  const fastKind = useFastKind()
  const useCaps = useCaptionsEnabled()
  const useOcr = useOcrEnabled()
  const hasText = useHasText()
  const place = usePlace()
  const camera = useCamera()
  const isoMin = useIsoMin()
  const isoMax = useIsoMax()
  const fMin = useFMin()
  const fMax = useFMax()
  const needsHf = useNeedsHf()
  const needsOAI = useNeedsOAI()
  
  // Individual hooks for photo
  const results = useSearchResults()
  const query = useSearchQuery()
  const searchId = useSearchId()
  const fav = useFavorites()
  const favOnly = useFavOnly()
  const topK = useTopK()
  const tags = useTags() as { allTags: string[]; tagsMap: Record<string,string[]>; tagFilter: string }
  const saved = useSavedSearches()
  const collections = useCollections()
  const smart = useSmartCollections()
  const library = useLibrary()
  
  // Individual hooks for UI
  const busy = useBusy()
  const note = useNote()
  const viewMode = useViewMode()
  const showWelcome = useShowWelcome()
  const showHelp = useShowHelp()
  
  // Individual hooks for workspace
  const workspace = useWorkspace()
  const wsToggle = useWsToggle()
  const persons = usePersons()
  const clusters = useClusters()
  const groups = useGroups()
  const points = usePoints()
  const diag = useDiag()
  
  // Actions
  const settingsActions = useSettingsActions() as SettingsActions
  const photoActions = usePhotoActions() as PhotoActions
  const uiActions = useUIActions() as UIActions
  const workspaceActions = useWorkspaceActions() as WorkspaceActions

  // Local UI state
  const [selectedView, setSelectedView] = useState<'results'|'library'|'people'|'map'|'collections'|'smart'|'trips'|'saved'|'memories'|'tasks'>('library')
  const [searchText, setSearchText] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [gridSize, setGridSize] = useState<GridSize>('medium')
  const [currentFilter, setCurrentFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [modal, setModal] = useState<null | { kind: 'export' | 'tag' | 'folder' | 'likeplus' | 'save' }>(null)
  const [detailIdx, setDetailIdx] = useState<number | null>(null)
  const [focusIdx, setFocusIdx] = useState<number | null>(null)
  const [layoutRows, setLayoutRows] = useState<number[][]>([])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [meta, setMeta] = useState<{ cameras: string[]; places?: string[] }>({ cameras: [], places: [] })
  // Initialize theme from localStorage
  useEffect(() => {
    try {
      const pref = localStorage.getItem('ps_theme')
      if (pref === 'dark') document.documentElement.classList.add('dark')
    } catch {}
  }, [])
  const [libOffset, setLibOffset] = useState(0)
  const [libLoading, setLibLoading] = useState(false)
  const libLimit = 120

  // Derived list to show: search results or library
  const items: { path: string; score?: number }[] = useMemo(() => (library || []).map((p) => ({ path: p })), [library])

  // Data loading helpers
  async function loadFav() {
    if (!dir) return
    try {
      const f = await apiGetFavorites(dir)
      photoActions.setFavorites(f.favorites || [])
    } catch {}
  }

  async function loadSaved() {
    if (!dir) return
    try {
      const r = await apiGetSaved(dir)
      photoActions.setSaved(r.saved || [])
    } catch {}
  }

  async function loadTags() {
    if (!dir) return
    try {
      const r = await apiGetTags(dir)
      photoActions.setTagsMap(r.tags || {})
      photoActions.setAllTags(r.all || [])
    } catch {}
  }

  async function loadDiag() {
    if (!dir) return
    try {
      const r = await apiDiagnostics(dir, engine)
      workspaceActions.setDiag(r)
    } catch {}
  }

  async function loadFaces() {
    if (!dir) return
    try {
      const r = await apiFacesClusters(dir)
      workspaceActions.setClusters(r.clusters || [])
    } catch {}
  }

  async function loadMap() {
    if (!dir) return
    try {
      const r = await apiMap(dir)
      workspaceActions.setPoints(r.points || [])
    } catch {}
  }

  async function loadLibrary(limit = 120, offset = 0, append = false) {
    try {
      if (!dir) return
      const { apiLibrary } = await import('./api')
      const r = await apiLibrary(dir, engine, limit, offset)
      if (append) {
        const nxt = [...(library || []), ...(r.paths || [])]
        photoActions.setLibrary(nxt)
      } else {
        photoActions.setLibrary(r.paths || [])
      }
    } catch {}
  }

  async function loadMetadata() {
    try { if (!dir) return; const r = await (await import('./api')).apiGetMetadata(dir); setMeta({ cameras: r.cameras || [], places: r.places || [] }) } catch {}
  }

  // Actions
  async function doIndex() {
    uiActions.setBusy('Indexing…')
    uiActions.setNote('')
    try {
      const r = await apiIndex(dir, engine, 32, needsHf ? hfToken : undefined, needsOAI ? openaiKey : undefined)
      uiActions.setNote(`Indexed. New ${r.new}, Updated ${r.updated}, Total ${r.total}`)
      await loadLibrary(120, 0)
    } catch (e: any) {
      uiActions.setNote(e.message || 'Index failed')
    } finally {
      uiActions.setBusy('')
    }
  }

  async function doSearch(text?: string) {
    const q = (text ?? searchText ?? '').trim()
    if (!q) return
    photoActions.setQuery(q)
    uiActions.setBusy('Searching…')
    uiActions.setNote('')
    try {
      const tagList = tags.tagFilter.split(',').map((s: string) => s.trim()).filter(Boolean)
      const ppl = persons.filter(Boolean)
      let r: { results?: SearchResult[]; search_id?: string }
      const df = dateFrom ? Math.floor(new Date(dateFrom).getTime()/1000) : undefined
      const dt = dateTo ? Math.floor(new Date(dateTo).getTime()/1000) : undefined
      if (wsToggle) {
        r = await apiSearchWorkspace(dir, q, engine, topK, {
          favoritesOnly: favOnly,
          tags: tagList,
          dateFrom: df,
          dateTo: dt,
          place: place || undefined,
          hasText,
          ...(ppl.length === 1 ? { person: ppl[0] } : ppl.length > 1 ? { persons: ppl } : {}),
        })
      } else {
        r = await apiSearch(dir, q, engine, topK, {
          hfToken: needsHf ? hfToken : undefined,
          openaiKey: needsOAI ? openaiKey : undefined,
          favoritesOnly: favOnly,
          tags: tagList,
          dateFrom: df,
          dateTo: dt,
          ...(useFast ? { useFast: true, fastKind: fastKind || undefined } : {}),
          useCaptions: useCaps,
          useOcr,
          camera: camera || undefined,
          isoMin: isoMin ? parseInt(isoMin, 10) : undefined,
          isoMax: isoMax ? parseInt(isoMax, 10) : undefined,
          fMin: fMin ? parseFloat(fMin) : undefined,
          fMax: fMax ? parseFloat(fMax) : undefined,
          place: place || undefined,
          hasText: hasText || undefined,
          ...(ppl.length === 1 ? { person: ppl[0] } : ppl.length > 1 ? { persons: ppl } : {}),
        } as any)
      }
      photoActions.setResults(r.results || [])
      photoActions.setSearchId(r.search_id || '')
      uiActions.setNote(`Found ${r.results?.length || 0} results.`)
      await Promise.all([loadFav(), loadSaved(), loadTags(), loadDiag()])
      setSelectedView('results')
    } catch (e: any) {
      uiActions.setNote(e.message || 'Search failed')
    } finally {
      uiActions.setBusy('')
    }
  }

  async function prepareFast(kind: 'annoy' | 'faiss' | 'hnsw') {
    uiActions.setBusy(`Preparing ${kind.toUpperCase()}…`)
    try {
      await apiBuildFast(dir, kind, engine, needsHf ? hfToken : undefined, needsOAI ? openaiKey : undefined)
      uiActions.setNote(`${kind.toUpperCase()} ready`)
    } catch (e: any) {
      uiActions.setNote(e.message)
    } finally {
      uiActions.setBusy('')
    }
  }

  async function buildOCR() {
    uiActions.setBusy('Extracting text (OCR)…')
    try {
      const r = await apiBuildOCR(dir, engine, ['en'], needsHf ? hfToken : undefined, needsOAI ? openaiKey : undefined)
      uiActions.setNote(`OCR updated ${r.updated} images`)
      await loadTags()
    } catch (e: any) {
      uiActions.setNote(e.message)
    } finally {
      uiActions.setBusy('')
    }
  }

  async function buildMetadata() {
    uiActions.setBusy('Building metadata…')
    try {
      const r = await apiBuildMetadata(dir, engine, needsHf ? hfToken : undefined, needsOAI ? openaiKey : undefined)
      uiActions.setNote(`Metadata ready (${r.updated})`)
    } catch (e: any) {
      uiActions.setNote(e.message)
    } finally {
      uiActions.setBusy('')
    }
  }

  function toggleSelect(p: string) {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(p)) n.delete(p)
      else n.add(p)
      return n
    })
  }

  async function exportSelected(dest: string) {
    if (!dir || selected.size === 0) return
    try {
      const r = await apiExport(dir, Array.from(selected), dest, 'copy', false, false)
      uiActions.setNote(`Exported ${r.copied}, skipped ${r.skipped}, errors ${r.errors} → ${r.dest}`)
    } catch (e: any) {
      uiActions.setNote(e.message || 'Export failed')
    }
  }

  // Lightbox helpers
  const openDetailByPath = (p: string) => {
    const idx = (results || []).findIndex((r) => r.path === p)
    if (idx >= 0) setDetailIdx(idx)
  }
  const navDetail = (delta: number) => {
    setDetailIdx((i) => {
      if (i === null) return null
      const n = i + delta
      if (!results || n < 0 || n >= results.length) return i
      return n
    })
  }

  async function tagSelected(tagText: string) {
    if (!dir || selected.size === 0) return
    const tagList = tagText.split(',').map((s) => s.trim()).filter(Boolean)
    try {
      const { apiSetTags } = await import('./api')
      await Promise.all(Array.from(selected).map((p) => apiSetTags(dir, p, tagList)))
      uiActions.setNote(`Updated tags for ${selected.size} photos`)
      await loadTags()
    } catch (e: any) {
      uiActions.setNote(e.message || 'Tag update failed')
    }
  }

  // Effects
  useEffect(() => {
    const next = query || ''
    setSearchText(prev => (prev === next ? prev : next))
  }, [query])

  useEffect(() => {
    if (!dir) return
    loadFav()
    loadSaved()
    loadTags()
    loadDiag()
    loadFaces()
    setLibOffset(0)
    loadLibrary(libLimit, 0)
    loadMetadata()
  }, [dir, engine])

  // Infinite scroll sentinel for Library view
  function LoadMoreSentinel() {
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
      if (!ref.current) return
      const el = ref.current
      const io = new IntersectionObserver(async (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && selectedView === 'library' && !libLoading) {
            setLibLoading(true)
            const next = libOffset + libLimit
            await loadLibrary(libLimit, next, true)
            setLibOffset(next)
            setLibLoading(false)
          }
        }
      }, { root: scrollContainerRef.current, rootMargin: '0px', threshold: 0.1 })
      io.observe(el)
      return () => io.disconnect()
    }, [selectedView, libOffset, libLoading])
    return <div ref={ref} className="h-8 w-full flex items-center justify-center text-xs text-gray-500">{libLoading ? 'Loading…' : ''}</div>
  }

  // Reset focus when results change - depend on length only
  useEffect(() => {
    const len = results?.length ?? 0
    setFocusIdx(prev => {
      const next = len > 0 ? (prev === null ? 0 : Math.min(prev, len - 1)) : null
      return Object.is(prev, next) ? prev : next
    })
  }, [results?.length])

  // Keyboard shortcuts in modern results context
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || (t as any).isContentEditable)) return
      if (e.key === '/') { e.preventDefault(); searchInputRef.current?.focus(); return }
      if (selectedView !== 'results') return
      const hasResults = (results?.length || 0) > 0
      if (!hasResults) return

      if (e.key === 'Escape') { setDetailIdx(null); return }
      if (detailIdx !== null) {
        if (e.key === 'ArrowLeft' || e.key === 'k') { e.preventDefault(); navDetail(-1) }
        if (e.key === 'ArrowRight' || e.key === 'j') { e.preventDefault(); navDetail(1) }
        if (e.key.toLowerCase() === 'f') {
          e.preventDefault();
          const p = results![detailIdx].path
          apiSetFavorite(dir, p, !fav.includes(p)).then(loadFav).catch(()=>{})
        }
        return
      }
      // Grid context
      if (e.key.toLowerCase() === 'a') { e.preventDefault(); setSelected(new Set(results!.map(r=>r.path))); return }
      if (e.key.toLowerCase() === 'c') { e.preventDefault(); setSelected(new Set()); return }
      if (e.key.toLowerCase() === 'f' && focusIdx !== null) { e.preventDefault(); const p = results![focusIdx].path; apiSetFavorite(dir, p, !fav.includes(p)).then(loadFav).catch(()=>{}); return }
      if (e.key === 'Enter' && focusIdx !== null) { e.preventDefault(); setDetailIdx(focusIdx); return }
      if (e.key === ' ' && focusIdx !== null) { e.preventDefault(); toggleSelect(results![focusIdx].path); return }

      // Navigation across grid
      if (e.key === 'ArrowLeft') { e.preventDefault(); if (focusIdx !== null) setFocusIdx(Math.max(0, focusIdx - 1)); return }
      if (e.key === 'ArrowRight') { e.preventDefault(); if (focusIdx !== null) setFocusIdx(Math.min(results!.length - 1, focusIdx + 1)); return }
      if (e.key === 'ArrowUp' && focusIdx !== null) {
        e.preventDefault()
        // find current row and col
        let rowIdx = layoutRows.findIndex(r => r.includes(focusIdx!))
        if (rowIdx > 0) {
          const col = layoutRows[rowIdx].indexOf(focusIdx)
          const prevRow = layoutRows[rowIdx - 1]
          const target = prevRow[Math.min(col, prevRow.length - 1)]
          if (typeof target === 'number') setFocusIdx(target)
        }
        return
      }
      if (e.key === 'ArrowDown' && focusIdx !== null) {
        e.preventDefault()
        let rowIdx = layoutRows.findIndex(r => r.includes(focusIdx!))
        if (rowIdx >= 0 && rowIdx < layoutRows.length - 1) {
          const col = layoutRows[rowIdx].indexOf(focusIdx)
          const nextRow = layoutRows[rowIdx + 1]
          const target = nextRow[Math.min(col, nextRow.length - 1)]
          if (typeof target === 'number') setFocusIdx(target)
        }
        return
      }

      // Home/End jump
      if (e.key === 'Home') { e.preventDefault(); setFocusIdx(0); return }
      if (e.key === 'End') { e.preventDefault(); setFocusIdx(results!.length - 1); return }

      // PageUp/PageDown jumps by ~3 rows preserving column when possible
      if ((e.key === 'PageUp' || e.key === 'PageDown') && focusIdx !== null) {
        e.preventDefault()
        const jump = 3
        const rowIdx = layoutRows.findIndex(r => r.includes(focusIdx))
        if (rowIdx >= 0) {
          const col = layoutRows[rowIdx].indexOf(focusIdx)
          const targetRow = e.key === 'PageUp' ? Math.max(0, rowIdx - jump) : Math.min(layoutRows.length - 1, rowIdx + jump)
          const row = layoutRows[targetRow]
          const target = row[Math.min(col, row.length - 1)]
          if (typeof target === 'number') setFocusIdx(target)
        }
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedView, results, detailIdx, dir, fav, layoutRows, focusIdx])

  // Ensure focused tile is visible
  useEffect(() => {
    if (focusIdx === null) return
    const container = document.getElementById('modern-results-grid')
    const el = container?.querySelector(`[data-photo-idx="${focusIdx}"]`) as HTMLElement | null
    if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [focusIdx])

  // UI building blocks
  const LibraryView = () => (
    <div className="p-4">
      <LibraryBrowser dir={dir} engine={engine} library={library} onLoadLibrary={loadLibrary} />
      <LoadMoreSentinel />
    </div>
  )

  const Sidebar = () => (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">PhotoVault</h1>
        <p className="text-sm text-gray-500">AI-Powered Photo Management</p>
      </div>

      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Library</h3>
          <div className="space-y-1">
            {[
              { id: 'library', label: 'All Photos', icon: IconGrid as any, count: library?.length || 0 },
              { id: 'results', label: 'Search Results', icon: IconSearch as any },
              { id: 'map', label: 'Map View', icon: IconMap as any },
              { id: 'people', label: 'People', icon: Users as any },
              { id: 'collections', label: 'Collections', icon: FolderOpen as any },
              { id: 'smart', label: 'Smart Collections', icon: Star as any },
              { id: 'trips', label: 'Trips', icon: Calendar as any },
              { id: 'saved', label: 'Saved Searches', icon: Bookmark as any },
              { id: 'memories', label: 'Memories', icon: Star as any },
              { id: 'tasks', label: 'Tasks', icon: ClipboardList as any },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedView(item.id as any)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedView === (item.id as any)
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.count ? (
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      selectedView === (item.id as any) ? 'bg-white/20' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {item.count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Collections</h3>
          <div className="space-y-1">
            {Object.entries(collections || {})
              .slice(0, 5)
              .map(([name, paths]) => (
                <button
                  key={name}
                  onClick={() => setSelectedView('collections')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full bg-blue-400`} />
                    <span>{name}</span>
                  </div>
                  <span className="text-xs text-gray-500">{paths.length}</span>
                </button>
              ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">People</h3>
          <div className="space-y-1">
            {(clusters || []).slice(0, 6).map((c) => (
              <button
                key={c.id}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4" />
                  <span>{c.name || 'Unnamed'}</span>
                </div>
                <span className="text-xs text-gray-500">{c.size}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <button type="button"
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          onClick={() => {
            const p = window.prompt('Photo folder path:')
            if (p) settingsActions.setDir(p)
          }}
        >
          <Upload className="w-4 h-4" />
          <span>Select Folder</span>
        </button>
      </div>
    </div>
  )

  const TopBar = () => (
    <div className="bg-white border-b border-gray-200 p-4">
      {/* Busy progress bar */}
      {busy && (
        <div className="h-1 w-full bg-blue-100 mb-2 overflow-hidden rounded">
          <div className="h-full bg-blue-500 animate-pulse w-1/3"></div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by content, people, places…"
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setSuggestOpen(true) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') doSearch(searchText)
              }}
              onFocus={()=> setSuggestOpen(true)}
              onBlur={()=> setTimeout(()=> setSuggestOpen(false), 120)}
              ref={searchInputRef}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {suggestOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded shadow max-h-64 overflow-auto text-sm">
                {(() => {
                  const q = searchText.toLowerCase()
                  const ppl = (clusters||[]).map(c=>c.name).filter(Boolean) as string[]
                  const suggestions: {cat:string; label:string}[] = []
                  for (const p of ppl) if (!q || p.toLowerCase().includes(q)) suggestions.push({cat:'People', label:p})
                  for (const t of (tags.allTags||[])) if (!q || t.toLowerCase().includes(q)) suggestions.push({cat:'Tag', label:t})
                  for (const c of (meta.cameras||[])) if (!q || c.toLowerCase().includes(q)) suggestions.push({cat:'Camera', label:c})
                  for (const pl of (meta.places||[] as any)) if (!q || String(pl).toLowerCase().includes(q)) suggestions.push({cat:'Place', label:String(pl)})
                  const top = suggestions.slice(0, 20)
                  if (top.length === 0) return <div className="px-3 py-2 text-gray-500">No suggestions</div>
                  return top.map((s,i)=> (
                    <button key={i} className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50" onMouseDown={(e)=>{ e.preventDefault(); setSearchText(s.label); setSuggestOpen(false); setTimeout(()=> doSearch(s.label), 0) }}>
                      <span className="truncate"><span className="text-gray-500 mr-2">{s.cat}:</span>{s.label}</span>
                      <span className="text-xs text-gray-400">↵</span>
                    </button>
                  ))
                })()}
              </div>
            )}
          </div>

          <button type="button" className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" onClick={()=> setShowFilters(v=>!v)}>
            <Filter className="w-4 h-4" />
            <span className="text-sm">Filters</span>
          </button>
          <button type="button" className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" onClick={()=> setModal({kind:'save'})} title="Save search">
            <BookmarkPlus className="w-4 h-4" />
            <span className="text-sm">Save</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {(['small', 'medium', 'large'] as GridSize[]).map((s) => (
              <button type="button"
                key={s}
                onClick={() => setGridSize(s)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  gridSize === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button type="button"
              onClick={() => setSelectedView('results')}
              className={`p-2 rounded-md transition-colors ${
                selectedView === 'results' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
            >
              <IconGrid className="w-4 h-4" />
            </button>
            <button type="button"
              onClick={() => setSelectedView('library')}
              className={`p-2 rounded-md transition-colors ${
                selectedView === 'library' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
            >
              <IconList className="w-4 h-4" />
            </button>
          </div>

          <button type="button"
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Settings & Indexing"
            onClick={() => setModal({ kind: 'folder' })}
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Toggle theme"
            onClick={() => {
              try {
                const c = document.documentElement.classList
                const dark = c.toggle('dark')
                localStorage.setItem('ps_theme', dark ? 'dark' : 'light')
              } catch {}
            }}
          >
            <span aria-hidden>🌗</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        {['All', 'Today', 'This Week', 'This Month', 'Favorites', 'People', 'Screenshots'].map((f) => (
          <button type="button"
            key={f}
            onClick={() => {
              setCurrentFilter(f.toLowerCase())
              if (f === 'Favorites') {
                photoActions.setFavOnly(true)
                doSearch(searchText)
              }
            }}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              currentFilter === f.toLowerCase()
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between mt-4 p-3 bg-blue-50 rounded-lg">
          <span className="text-sm text-blue-900">
            {selected.size} photo{selected.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button type="button"
              className="flex items-center gap-1 px-3 py-1 text-sm text-blue-700 hover:bg-blue-100 rounded-md transition-colors"
              onClick={() => setModal({ kind: 'export' })}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button type="button"
              className="flex items-center gap-1 px-3 py-1 text-sm text-blue-700 hover:bg-blue-100 rounded-md transition-colors"
              onClick={() => setModal({ kind: 'tag' })}
            >
              <IconTag className="w-4 h-4" />
              Tag
            </button>
            {selected.size === 1 && (
              <button type="button" className="flex items-center gap-1 px-3 py-1 text-sm text-blue-700 hover:bg-blue-100 rounded-md transition-colors" onClick={async ()=>{ const p = Array.from(selected)[0]; const { apiSearchLike } = await import('./api'); uiActions.setBusy('Searching similar…'); try{ const r = await apiSearchLike(dir, p, engine, topK); photoActions.setResults(r.results||[]); setSelectedView('results'); } catch(e:any){ uiActions.setNote(e.message) } finally { uiActions.setBusy('') } }}>
                <IconSearch className="w-4 h-4" /> Similar
              </button>
            )}
            {selected.size === 1 && (
              <button type="button" className="flex items-center gap-1 px-3 py-1 text-sm text-blue-700 hover:bg-blue-100 rounded-md transition-colors" onClick={()=> setModal({kind:'likeplus'})}>
                <IconSearch className="w-4 h-4" /> Similar + Text
              </button>
            )}
            <button type="button"
              className="flex items-center gap-1 px-3 py-1 text-sm text-red-700 hover:bg-red-100 rounded-md transition-colors"
              onClick={async () => {
                if (selected.size === 0) return
                if (!confirm(`Move ${selected.size} item(s) to Trash?`)) return
                try {
                  uiActions.setBusy('Deleting…')
                  const r = await apiDelete(dir, Array.from(selected))
                  uiActions.setNote(`Moved ${r.moved} to Trash`)
                  setSelected(new Set())
                  setTimeout(async () => {
                    if (confirm('Undo delete?')) {
                      const u = await apiUndoDelete(dir)
                      uiActions.setNote(`Restored ${u.restored}`)
                    }
                  }, 100)
                } catch (e:any) {
                  uiActions.setNote(e.message)
                } finally {
                  uiActions.setBusy('')
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )

  const StatsBar = () => {
    const total = items.length
    const engineInfo = (diag?.engines || []).find((e: any) => e.key === engine)
    const fastReady = engineInfo?.fast && (engineInfo.fast.annoy || engineInfo.fast.faiss || engineInfo.fast.hnsw)
    return (
      <div className="bg-gray-50 border-t border-gray-200 p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-6">
            <span>{total} photos</span>
            {note ? <span className="text-gray-800">{note}</span> : null}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 ${engineInfo?.count ? 'bg-green-500' : 'bg-gray-300'} rounded-full`}></div>
              <span>AI Index {engineInfo?.count ? 'Ready' : 'Empty'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 ${fastReady ? 'bg-blue-500' : 'bg-gray-300'} rounded-full`}></div>
              <span>Fast Index {fastReady ? 'Ready' : '—'}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950 dark:text-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-auto" ref={scrollContainerRef}>
          {selectedView === 'results' && (
            <div className="p-4">
              <JustifiedResults
                dir={dir}
                engine={engine}
                items={(results||[]).map(r=>({path:r.path, score:r.score}))}
                selected={selected}
                onToggleSelect={toggleSelect}
                onOpen={(p)=> openDetailByPath(p)}
                scrollContainerRef={scrollContainerRef}
                focusIndex={focusIdx ?? undefined}
                onLayout={(rows)=> setLayoutRows(rows)}
              />
            </div>
          )}
          {selectedView === 'library' && <LibraryView />}
          {selectedView === 'people' && (
            <div className="p-4">
              <PeopleView
                dir={dir}
                engine={engine}
                clusters={clusters || []}
                persons={persons}
                setPersons={workspaceActions.setPersons}
                busy={busy}
                setBusy={uiActions.setBusy}
                setNote={uiActions.setNote}
                onLoadFaces={loadFaces}
              />
            </div>
          )}
          {selectedView === 'map' && (
            <div className="p-4">
              <MapView points={points || []} onLoadMap={loadMap} />
            </div>
          )}
          {selectedView === 'collections' && (
            <div className="p-4">
              <Collections collections={collections} onLoadCollections={async () => {
                const { apiGetCollections } = await import('./api')
                const r = await apiGetCollections(dir)
                photoActions.setCollections(r.collections || {})
              }} />
            </div>
          )}
          {selectedView === 'saved' && (
            <div className="p-4">
              <SavedSearches
                saved={saved as any}
                onRun={(name: string, q: string, k?: number)=> { setSearchText(q); if(k) photoActions.setTopK(k); doSearch(q) }}
                onDelete={async (name: string)=> { try{ const { apiDeleteSaved, apiGetSaved } = await import('./api'); await apiDeleteSaved(dir, name); const r = await apiGetSaved(dir); photoActions.setSaved(r.saved||[]) } catch(e:any){ uiActions.setNote(e.message) } }}
              />
            </div>
          )}
          {selectedView === 'memories' && (
            <div className="p-4 space-y-4">
              <div className="bg-white border rounded p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Recent Favorites</div>
                </div>
                {fav.length === 0 ? <div className="text-sm text-gray-600 mt-2">No favorites yet.</div> : (
                  <div className="mt-2 grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2">
                    {fav.slice(0, 24).map((p)=> (
                      <img key={p} src={thumbUrl(dir, engine, p, 196)} alt={basename(p)} className="w-full h-24 object-cover rounded" />
                    ))}
                  </div>
                )}
              </div>
              <div>
                <TripsView dir={dir} engine={engine} setBusy={uiActions.setBusy} setNote={uiActions.setNote} setResults={photoActions.setResults} />
              </div>
            </div>
          )}
          {selectedView === 'tasks' && (
            <div className="p-4">
              <TasksView />
            </div>
          )}
          {selectedView === 'smart' && (
            <div className="p-4">
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
          )}
          {selectedView === 'trips' && (
            <div className="p-4">
              <TripsView dir={dir} engine={engine} setBusy={uiActions.setBusy} setNote={uiActions.setNote} setResults={photoActions.setResults} />
            </div>
          )}
        </div>
        <StatsBar />

        {/* Filters panel */}
        {showFilters && (
          <div className="absolute right-6 top-20 z-50 bg-white border border-gray-200 shadow-lg rounded-lg p-4 w-96">
              <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Filters</div>
              <button type="button" className="text-sm text-gray-500" onClick={()=>setShowFilters(false)}>Close</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <label htmlFor="flt-fav">Favorites only</label>
                <input id="flt-fav" type="checkbox" checked={favOnly} onChange={(e)=> photoActions.setFavOnly(e.target.checked)} />
              </div>
              <div>
                <label className="block mb-1" htmlFor="flt-tags">Tags (comma)</label>
                <input id="flt-tags" className="w-full border rounded px-2 py-1" value={tags.tagFilter} onChange={(e)=> photoActions.setTagFilter(e.target.value)} />
              </div>
              <div>
                <label className="block mb-1" htmlFor="flt-camera">Camera</label>
                <input id="flt-camera" className="w-full border rounded px-2 py-1" value={camera} onChange={(e)=> settingsActions.setCamera(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1" htmlFor="flt-iso-min">ISO min</label>
                  <input id="flt-iso-min" className="w-full border rounded px-2 py-1" value={isoMin} onChange={(e)=> settingsActions.setIsoMin(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1" htmlFor="flt-iso-max">ISO max</label>
                  <input id="flt-iso-max" className="w-full border rounded px-2 py-1" value={isoMax} onChange={(e)=> settingsActions.setIsoMax(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1" htmlFor="flt-date-from">Date from</label>
                  <input id="flt-date-from" type="date" className="w-full border rounded px-2 py-1" value={dateFrom} onChange={(e)=> setDateFrom(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1" htmlFor="flt-date-to">Date to</label>
                  <input id="flt-date-to" type="date" className="w-full border rounded px-2 py-1" value={dateTo} onChange={(e)=> setDateTo(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1" htmlFor="flt-fmin">f/ min</label>
                  <input id="flt-fmin" className="w-full border rounded px-2 py-1" value={fMin} onChange={(e)=> settingsActions.setFMin(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1" htmlFor="flt-fmax">f/ max</label>
                  <input id="flt-fmax" className="w-full border rounded px-2 py-1" value={fMax} onChange={(e)=> settingsActions.setFMax(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block mb-1" htmlFor="flt-place">Place</label>
                <input id="flt-place" className="w-full border rounded px-2 py-1" value={place} onChange={(e)=> settingsActions.setPlace(e.target.value)} />
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="flt-caps">Use captions</label>
                <input id="flt-caps" type="checkbox" checked={useCaps} onChange={(e)=> settingsActions.setUseCaps(e.target.checked)} />
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="flt-ocr">Use OCR</label>
                <input id="flt-ocr" type="checkbox" checked={useOcr} onChange={(e)=> settingsActions.setUseOcr(e.target.checked)} />
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="flt-hastext">Has text</label>
                <input id="flt-hastext" type="checkbox" checked={hasText} onChange={(e)=> settingsActions.setHasText(e.target.checked)} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="px-3 py-1 rounded border" onClick={()=> setShowFilters(false)}>Cancel</button>
                <button type="button" className="px-3 py-1 rounded bg-blue-600 text-white" onClick={()=> { setShowFilters(false); doSearch(searchText) }}>Apply</button>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        {modal?.kind === 'export' && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
            <div className="bg-white rounded-lg p-4 w-full max-w-md">
              <div className="font-semibold mb-2">Export Selected</div>
              <div className="text-sm text-gray-600 mb-2">Choose destination folder</div>
              <form onSubmit={(e)=>{ e.preventDefault(); const form = e.target as HTMLFormElement; const dest = (form.elements.namedItem('dest') as HTMLInputElement).value.trim(); if(dest){ exportSelected(dest); setModal(null) } }}>
                <input name="dest" className="w-full border rounded px-2 py-1" placeholder="/absolute/path" />
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" className="px-3 py-1 rounded border" onClick={()=>setModal(null)}>Cancel</button>
                  <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white">Export</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {modal?.kind === 'tag' && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
            <div className="bg-white rounded-lg p-4 w-full max-w-md">
              <div className="font-semibold mb-2">Tag Selected</div>
              <div className="text-sm text-gray-600 mb-2">Enter comma-separated tags</div>
              <form onSubmit={(e)=>{ e.preventDefault(); const form = e.target as HTMLFormElement; const tags = (form.elements.namedItem('tags') as HTMLInputElement).value.trim(); if(tags){ tagSelected(tags); setModal(null) } }}>
                <input name="tags" className="w-full border rounded px-2 py-1" placeholder="family, beach, 2024" />
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" className="px-3 py-1 rounded border" onClick={()=>setModal(null)}>Cancel</button>
                  <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {modal?.kind === 'folder' && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
            <div className="bg-white rounded-lg p-4 w-full max-w-md">
              <div className="font-semibold mb-2">Set Photo Folder</div>
              <form onSubmit={(e)=>{ e.preventDefault(); const form = e.target as HTMLFormElement; const path = (form.elements.namedItem('path') as HTMLInputElement).value.trim(); if(path){ settingsActions.setDir(path); setModal(null) } }}>
                <input name="path" className="w-full border rounded px-2 py-1" placeholder="/absolute/folder" defaultValue={dir} />
                <div className="mt-3 flex justify-between gap-2">
                  <div className="flex gap-2">
                    <button type="button" className="px-3 py-1 rounded border" onClick={doIndex}>Index</button>
                    <button type="button" className="px-3 py-1 rounded border" onClick={()=>prepareFast('annoy')}>Fast</button>
                    <button type="button" className="px-3 py-1 rounded border" onClick={buildOCR}>OCR</button>
                    <button type="button" className="px-3 py-1 rounded border" onClick={buildMetadata}>Metadata</button>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="px-3 py-1 rounded border" onClick={()=>setModal(null)}>Close</button>
                    <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white">Save</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
        {modal?.kind === 'likeplus' && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
            <div className="bg-white rounded-lg p-4 w-full max-w-md">
              <div className="font-semibold mb-2">Similar + Text</div>
              <form onSubmit={async (e)=>{ e.preventDefault(); const form = e.target as HTMLFormElement; const text = (form.elements.namedItem('text') as HTMLInputElement).value.trim(); const weight = parseFloat((form.elements.namedItem('weight') as HTMLInputElement).value); if(selected.size===1){ try{ const p = Array.from(selected)[0]; const { apiSearchLikePlus } = await import('./api'); uiActions.setBusy('Searching…'); const r = await apiSearchLikePlus(dir, p, engine, topK, text || undefined, Number.isNaN(weight) ? 0.5 : weight); photoActions.setResults(r.results||[]); setSelectedView('results'); } catch(e:any){ uiActions.setNote(e.message) } finally { uiActions.setBusy('') } } setModal(null) }}>
                <label className="block text-sm mb-1">Text (optional)</label>
                <input name="text" className="w-full border rounded px-2 py-1" placeholder="e.g. beach at sunset" />
                <label className="block text-sm mt-3 mb-1">Weight (image vs text)</label>
                <input name="weight" type="range" min="0" max="1" step="0.05" defaultValue="0.5" className="w-full" />
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" className="px-3 py-1 rounded border" onClick={()=>setModal(null)}>Cancel</button>
                  <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white">Search</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {modal?.kind === 'save' && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
            <div className="bg-white rounded-lg p-4 w-full max-w-md">
              <div className="font-semibold mb-2">Save Search</div>
              <form onSubmit={async (e)=>{ e.preventDefault(); const form = e.target as HTMLFormElement; const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim(); if(!name) return; try{ const { apiAddSaved, apiGetSaved } = await import('./api'); await apiAddSaved(dir, name, searchText || query || '', topK); const r = await apiGetSaved(dir); photoActions.setSaved(r.saved||[]); setSelectedView('saved') } catch(e:any){ uiActions.setNote(e.message) } setModal(null) }}>
                <label className="block text-sm mb-1">Name</label>
                <input name="name" className="w-full border rounded px-2 py-1" placeholder="e.g. Dogs on beach" />
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" className="px-3 py-1 rounded border" onClick={()=>setModal(null)}>Cancel</button>
                  <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lightbox */}
        {detailIdx !== null && results && results[detailIdx] && (
          <Lightbox
            dir={dir}
            engine={engine}
            path={results[detailIdx].path}
            onPrev={()=> navDetail(-1)}
            onNext={()=> navDetail(1)}
            onClose={()=> setDetailIdx(null)}
            onReveal={async ()=> {
              try { const { apiOpen } = await import('./api'); const p = results && detailIdx !== null ? results[detailIdx]?.path : undefined; if (p) await apiOpen(dir, p) } catch {}
            }}
            onFavorite={async ()=> {
              try { const p = results && detailIdx !== null ? results[detailIdx]?.path : undefined; if (p) { await apiSetFavorite(dir, p, !fav.includes(p)); await loadFav() } } catch {}
            }}
            onMoreLikeThis={async ()=> { try{ const { apiSearchLike } = await import('./api'); const p = results && detailIdx !== null ? results[detailIdx]?.path : undefined; if (!p) return; uiActions.setBusy('Searching similar…'); const r = await apiSearchLike(dir, p, engine, topK); photoActions.setResults(r.results||[]); setSelectedView('results'); } catch(e:any){ uiActions.setNote(e.message) } finally { uiActions.setBusy('') } }}
          />
        )}

        {/* Global progress overlay */}
        {!!busy && (
          <div className="fixed inset-0 z-[1050] bg-black/40 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 w-full max-w-sm text-sm">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 border-2 border-gray-300 dark:border-gray-700 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{busy}</div>
                  {note && <div className="text-gray-600 dark:text-gray-300 truncate">{note}</div>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
