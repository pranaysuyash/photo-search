import React, { useEffect, useMemo, useRef, useState } from 'react'
import { thumbUrl } from '../api'

type Item = { path: string; score?: number }

export default function JustifiedResults({
  dir,
  engine,
  items,
  gap = 8,
  targetRowHeight = 196,
  scrollContainerRef,
  selected,
  onToggleSelect,
  onOpen,
  focusIndex = null,
  onLayout,
  ratingMap,
  showInfoOverlay,
}: {
  dir: string
  engine: string
  items: Item[]
  gap?: number
  targetRowHeight?: number
  scrollContainerRef: React.RefObject<HTMLDivElement>
  selected: Set<string>
  onToggleSelect: (path: string) => void
  onOpen: (path: string) => void
  focusIndex?: number | null
  onLayout?: (rows: number[][]) => void
  ratingMap?: Record<string, number>
  showInfoOverlay?: boolean
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number>(0)
  const [ratios, setRatios] = useState<Record<string, number>>({})
  const defaultRatio = 4 / 3

  // Observe container width
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [scrollContainerRef])

  // Preload naturalWidth/Height lazily
  useEffect(() => {
    let cancelled = false
    const toLoad = items.slice(0, 200) // load first 200 for ratios
    toLoad.forEach(({ path }) => {
      if (ratios[path]) return
      const img = new Image()
      img.onload = () => {
        if (!cancelled && img.naturalWidth && img.naturalHeight) {
          setRatios((m) => ({ ...m, [path]: img.naturalWidth / img.naturalHeight }))
        }
      }
      img.src = thumbUrl(dir, engine, path, 256)
    })
    return () => { cancelled = true }
  }, [items, dir, engine])

  // Build justified rows
  const rows = useMemo(() => {
    if (!width || items.length === 0) return [] as { items: Item[]; height: number }[]
    const rows: { items: Item[]; height: number }[] = []
    let row: Item[] = []
    let sumRatios = 0
    const innerWidth = Math.max(0, width - 2 * 16) // account for page padding if any
    const maxW = innerWidth
    items.forEach((it, idx) => {
      const r = ratios[it.path] || defaultRatio
      row.push(it)
      sumRatios += r
      const rowW = sumRatios * targetRowHeight + gap * (row.length - 1)
      if (rowW >= maxW) {
        const h = Math.max(120, Math.floor((maxW - gap * (row.length - 1)) / sumRatios))
        rows.push({ items: row, height: h })
        row = []
        sumRatios = 0
      }
    })
    if (row.length > 0) {
      const h = Math.min(targetRowHeight, Math.floor((maxW - gap * (row.length - 1)) / Math.max(1, sumRatios)))
      rows.push({ items: row, height: h })
    }
    return rows
  }, [items, ratios, width, gap, targetRowHeight])

  // Build index rows (global indices for each row) for keyboard navigation
  const rowIndices = useMemo(() => {
    const out: number[][] = []
    if (!items.length || rows.length === 0) return out
    let i = 0
    for (const r of rows) {
      const arr: number[] = []
      for (let j = 0; j < r.items.length; j++) arr.push(i++)
      out.push(arr)
    }
    return out
  }, [rows, items.length])

  useEffect(() => {
    if (onLayout) onLayout(rowIndices)
  }, [rowIndices, onLayout])

  // Virtualize rows based on scroll position
  const [scrollTop, setScrollTop] = useState(0)
  const viewportH = scrollContainerRef.current?.clientHeight || 0
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const onScroll = () => setScrollTop(el.scrollTop)
    el.addEventListener('scroll', onScroll, { passive: true })
    setScrollTop(el.scrollTop)
    return () => el.removeEventListener('scroll', onScroll)
  }, [scrollContainerRef])

  const { totalH, offsets } = useMemo(() => {
    let y = 0
    const offs: number[] = []
    for (const r of rows) {
      offs.push(y)
      y += r.height + gap
    }
    return { totalH: y, offsets: offs }
  }, [rows, gap])

  const overscan = 600
  const start = useMemo(() => {
    const y = Math.max(0, scrollTop - overscan)
    let i = 0
    while (i < offsets.length && offsets[i] + rows[i].height < y) i++
    return i
  }, [offsets, rows, scrollTop])
  const end = useMemo(() => {
    const y = (scrollTop + viewportH) + overscan
    let i = start
    while (i < offsets.length && offsets[i] < y) i++
    return Math.min(i + 5, rows.length)
  }, [offsets, rows, scrollTop, viewportH, start])

  const activeId = focusIndex !== null ? `photo-${focusIndex}` : undefined
  return (
    <div
      id="modern-results-grid"
      ref={contentRef}
      className="relative"
      style={{ height: totalH }}
      role="grid"
      aria-multiselectable="true"
      aria-activedescendant={activeId}
      tabIndex={0}
    >
      {rows.slice(start, end).map((row, localIdx) => {
        const rowIndex = start + localIdx
        const top = offsets[rowIndex]
        const innerWidth = Math.max(0, width - 2 * 16)
        const sumR = row.items.reduce((s, it) => s + (ratios[it.path] || defaultRatio), 0)
        // recompute height for current ratios to minimize gaps
        const h = Math.max(120, Math.floor((innerWidth - gap * (row.items.length - 1)) / Math.max(0.01, sumR)))
        return (
          <div key={rowIndex} className="absolute left-0 right-0" style={{ top }}>
            <div className="flex" style={{ gap }}>
              {row.items.map((it, j) => {
                const globalIdx = rowIndices[rowIndex]?.[j]
                const r = ratios[it.path] || defaultRatio
                const w = Math.floor(h * r)
                const isSel = selected.has(it.path)
                const isFocus = focusIndex !== null && globalIdx === focusIndex
                const base = it.path.split('/').pop() || it.path
                return (
                  <div
                    key={it.path}
                    className={`relative group cursor-pointer rounded-lg overflow-hidden transition-all duration-200 hover:shadow ${isSel ? 'ring-2 ring-blue-500' : ''} ${isFocus ? 'outline outline-2 outline-indigo-500' : ''}`}
                    style={{ width: w, height: h }}
                    onClick={() => onToggleSelect(it.path)}
                    onDoubleClick={() => onOpen(it.path)}
                    title={it.path}
                    data-photo-idx={globalIdx}
                    id={`photo-${globalIdx}`}
                    role="gridcell"
                    aria-selected={isSel}
                    tabIndex={isFocus ? 0 : -1}
                  >
                    <img
                      src={thumbUrl(dir, engine, it.path, 256)}
                      alt={it.path}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                    />
                    {showInfoOverlay && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent text-white px-1.5 py-1 text-[10px] flex items-center justify-between">
                        <span className="truncate mr-2" title={base}>{base}</span>
                        {typeof it.score === 'number' && (
                          <span className="bg-white/20 rounded px-1">{it.score.toFixed(2)}</span>
                        )}
                      </div>
                    )}
                    {/* Rating overlay */}
                    {ratingMap && typeof ratingMap[it.path] === 'number' && ratingMap[it.path]! > 0 && (
                      <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-black/50 text-yellow-300 text-[10px] flex items-center gap-0.5">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d="M12 .587l3.668 7.431 8.2 1.193-5.934 5.787 1.401 8.168L12 18.896l-7.335 3.87 1.401-8.168L.132 9.211l8.2-1.193z"/>
                        </svg>
                        <span>{ratingMap[it.path]}</span>
                      </div>
                    )}
                    {typeof it.score === 'number' && (
                      <div className="absolute top-2 left-2 text-xs bg-white/80 rounded px-1">{it.score.toFixed(2)}</div>
                    )}
                    {isSel && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
