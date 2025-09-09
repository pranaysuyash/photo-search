import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ResultsGrid } from './ResultsGrid'
import { Lightbox } from './Lightbox'
import { NoResultsEmpty } from './ui/EmptyState'
import { useDir, useEngine, useCaptionsEnabled, useHasText, useOcrEnabled, usePlace, useShowExplain, useSettingsActions } from '../stores/settingsStore'
import { apiLogEvent } from '../api'
import { useSearchResults, useFavorites, useSearchQuery } from '../stores/photoStore'
import { useBusy } from '../stores/uiStore'
import { apiOpen, apiSetFavorite } from '../api'

export default function ResultsPanel() {
  const dir = useDir()
  const engine = useEngine()
  const busy = useBusy()
  const results = useSearchResults()
  const favorites = useFavorites()
  const query = useSearchQuery()
  const useCaps = useCaptionsEnabled()
  const hasText = useHasText()
  const useOcr = useOcrEnabled()
  const place = usePlace()
  const showExplain = useShowExplain()
  const settingsActions = useSettingsActions()

  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [detailIdx, setDetailIdx] = useState<number|null>(null)

  const hasResults = (results?.length || 0) > 0
  const openDetailByPath = useCallback((p: string) => {
    const idx = results.findIndex(r => r.path === p)
    if (idx >= 0) setDetailIdx(idx)
  }, [results])

  const toggleSelect = useCallback((p: string) => setSelected(s => ({ ...s, [p]: !s[p] })), [])
  const selectAll = useCallback(() => {
    const next: Record<string, boolean> = {}
    for (const r of results) next[r.path] = true
    setSelected(next)
  }, [results])
  const clearSelection = useCallback(() => setSelected({}), [])
  const navDetail = useCallback((delta: number) => {
    setDetailIdx(i => {
      if (i === null) return null
      const n = i + delta
      if (n < 0 || n >= results.length) return i
      return n
    })
  }, [results])

  // Keyboard shortcuts (grid context)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignore if typing in form
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || (t as any).isContentEditable)) return
      if (!hasResults) return
      if (e.key === 'Escape') { setDetailIdx(null); return }
      // If lightbox open
      if (detailIdx !== null) {
        if (e.key === 'ArrowLeft' || e.key === 'k') { e.preventDefault(); navDetail(-1) }
        if (e.key === 'ArrowRight' || e.key === 'j') { e.preventDefault(); navDetail(1) }
        if (e.key.toLowerCase() === 'f') {
          e.preventDefault();
          const p = results[detailIdx].path
          apiSetFavorite(dir, p, !favorites.includes(p)).catch(()=>{})
        }
        return
      }
      // Grid shortcuts (no focused detail)
      if (e.key.toLowerCase() === 'a') { e.preventDefault(); selectAll(); return }
      if (e.key.toLowerCase() === 'c') { e.preventDefault(); clearSelection(); return }
      if (e.key === 'Enter') {
        e.preventDefault(); if (results[0]) setDetailIdx(0)
      }
      if (e.key === ' ') {
        e.preventDefault(); if (results[0]) toggleSelect(results[0].path)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [results, hasResults, detailIdx, dir, engine, favorites, navDetail, selectAll, clearSelection, toggleSelect])

  return (
    <div className="bg-white border rounded p-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Results</h2>
        <div className="flex gap-2 text-sm">
          <div className="text-gray-700">{results.length} found</div>
          <button
            onClick={() => {
              const next = !showExplain
              settingsActions.setShowExplain(next)
              // If turning on explain chips, sample FPS for ~1s and log
              if (next) {
                try {
                  const t0 = performance.now()
                  let frames = 0
                  let raf = 0
                  const loop = () => { frames++; raf = requestAnimationFrame(() => {
                    if (performance.now() - t0 < 1000) loop();
                    else {
                      cancelAnimationFrame(raf)
                      const dt = performance.now() - t0
                      const fps = Math.round((frames / dt) * 1000)
                      if (dir) apiLogEvent(dir, 'fps_sample', { fps, frames, dt_ms: Math.round(dt), explain_on: true, results: results.length }).catch(()=>{})
                    }
                  }) }
                  loop()
                } catch {}
              }
            }}
            className={`rounded px-2 py-1 ${showExplain ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            title="Toggle explainability chips"
          >
            {showExplain ? 'Hide Explain' : 'Show Explain'}
          </button>
          <button onClick={selectAll} className="bg-gray-200 rounded px-2 py-1">Select all</button>
          <button onClick={clearSelection} className="bg-gray-200 rounded px-2 py-1">Clear</button>
          <button onClick={async()=>{ const sel = Object.entries(selected).filter(([,v])=>v).map(([p])=>p); if(sel.length===0){ alert('Select photos first'); return } let added=0; for (const p of sel) { try{ await apiSetFavorite(dir, p, !favorites.includes(p)); added++ } catch{} } }} className="bg-pink-600 text-white rounded px-2 py-1">♥ Favorite selected</button>
        </div>
      </div>

      {!hasResults ? (
        query ? <NoResultsEmpty /> : <div className="text-sm text-gray-600 mt-2">Run a search to see results here.</div>
      ) : (
        <ResultsGrid
          dir={dir}
          engine={engine}
          results={results}
          selected={selected}
          onToggleSelect={toggleSelect}
          onOpen={openDetailByPath}
          showScore
          explainChips={showExplain ? {
            caption: !!useCaps,
            ocr: !!(useOcr || hasText),
            geo: !!place,
            time: false, // placeholder (date range not globally tracked yet)
            faces: false, // placeholder (person filters not globally tracked yet)
          } : undefined}
        />
      )}

      {detailIdx !== null && results[detailIdx] && (
        <Lightbox
          dir={dir}
          engine={engine}
          path={results[detailIdx].path}
          onPrev={()=>navDetail(-1)}
          onNext={()=>navDetail(1)}
          onClose={()=>setDetailIdx(null)}
          onReveal={()=>apiOpen(dir, results[detailIdx!].path)}
          onFavorite={()=>apiSetFavorite(dir, results[detailIdx!].path, !favorites.includes(results[detailIdx!].path)).catch(()=>{})}
        />
      )}

      {busy && busy.toLowerCase().includes('search') && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-transparent rounded-full"></div>
        </div>
      )}
    </div>
  )
}
