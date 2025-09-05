import React, { useEffect, useRef, useState } from 'react'
import { thumbUrl, apiMetadataDetail } from '../api'

export function Lightbox({
  dir,
  engine,
  path,
  onPrev,
  onNext,
  onClose,
  onReveal,
  onFavorite,
  onMoreLikeThis,
}: {
  dir: string; engine: string; path: string;
  onPrev: () => void; onNext: () => void; onClose: () => void;
  onReveal: () => void; onFavorite: () => void; onMoreLikeThis?: () => void;
}) {
  if (!path) return null
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [panning, setPanning] = useState(false)
  const panOrigin = useRef<{x:number;y:number;tx:number;ty:number}>({x:0,y:0,tx:0,ty:0})
  const [showInfo, setShowInfo] = useState(false)
  const [infoLoading, setInfoLoading] = useState(false)
  const [info, setInfo] = useState<any>(null)

  function zoom(delta: number, cx?: number, cy?: number) {
    const prev = scale
    const next = Math.min(5, Math.max(1, +(prev + delta).toFixed(2)))
    if (next === prev) return
    // Zoom towards cursor point
    const img = imgRef.current
    if (img && cx !== undefined && cy !== undefined) {
      const rect = img.getBoundingClientRect()
      const px = cx - rect.left
      const py = cy - rect.top
      const k = next / prev
      setTx(tx + (px - px * k))
      setTy(ty + (py - py * k))
    }
    setScale(next)
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.1 : -0.1
    zoom(delta, e.clientX, e.clientY)
  }

  function onMouseDown(e: React.MouseEvent) {
    if (scale === 1) return
    setPanning(true)
    panOrigin.current = { x: e.clientX, y: e.clientY, tx, ty }
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!panning) return
    const dx = e.clientX - panOrigin.current.x
    const dy = e.clientY - panOrigin.current.y
    setTx(panOrigin.current.tx + dx)
    setTy(panOrigin.current.ty + dy)
  }
  function onMouseUp() { setPanning(false) }
  function onMouseLeave() { setPanning(false) }

  function resetZoom() { setScale(1); setTx(0); setTy(0) }
  function zoomIn() { zoom(0.2) }
  function zoomOut() { zoom(-0.2) }

  function onDblClick(e: React.MouseEvent) {
    if (scale === 1) zoom(1, e.clientX, e.clientY)
    else resetZoom()
  }

  // Focus the dialog on open for accessibility
  useEffect(() => {
    containerRef.current?.focus()
  }, [path])

  // Load metadata when info opens or path changes
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!showInfo || !path) return
      try {
        setInfoLoading(true)
        const r = await apiMetadataDetail(dir, path)
        if (!cancelled) setInfo(r.meta || {})
      } catch {
        if (!cancelled) setInfo(null)
      } finally {
        if (!cancelled) setInfoLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [showInfo, dir, path])

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
      onClick={onClose}
      onKeyDown={(e)=>{ if(e.key==='Escape'){ e.stopPropagation(); onClose() } }}
    >
      <div
        className="relative max-w-6xl w-full p-4"
        onClick={e=>e.stopPropagation()}
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={path}
        tabIndex={-1}
      >
        <div className="flex items-center justify-between mb-2 text-white">
          <div className="truncate text-sm">{path}</div>
          <div className="flex gap-2">
            <button type="button" onClick={onPrev} className="bg-white/20 rounded px-2 py-1">◀</button>
            <button type="button" onClick={onNext} className="bg-white/20 rounded px-2 py-1">▶</button>
            <button type="button" onClick={()=> setShowInfo(v=>!v)} className={`rounded px-2 py-1 ${showInfo ? 'bg-blue-600 text-white' : 'bg-white/20'}`}>Info</button>
            <button type="button" onClick={onClose} className="bg-white text-black rounded px-2 py-1">Close</button>
          </div>
        </div>
        <div
          className="relative bg-black/40 rounded overflow-hidden"
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onDoubleClick={onDblClick}
          style={{ cursor: scale>1 && panning ? 'grabbing' : scale>1 ? 'grab' : 'default' }}
        >
          <img
            ref={imgRef}
            src={thumbUrl(dir, engine, path, 1024)}
            className="w-full h-auto select-none"
            style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transformOrigin: '0 0' }}
            alt={path}
            draggable={false}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 bg-white/10 rounded p-1">
            <button type="button" onClick={zoomOut} className="px-2 py-1 bg-white/20 text-white rounded">−</button>
            <div className="text-white text-sm w-12 text-center">{Math.round(scale*100)}%</div>
            <button type="button" onClick={zoomIn} className="px-2 py-1 bg-white/20 text-white rounded">+</button>
            <button type="button" onClick={resetZoom} className="px-2 py-1 bg-white/20 text-white rounded">Reset</button>
          </div>
          <button type="button" onClick={onReveal} className="px-3 py-1 bg-gray-200 rounded">Reveal in Finder/Explorer</button>
          <button type="button" onClick={onFavorite} className="px-3 py-1 bg-pink-600 text-white rounded">♥ Favorite</button>
          {onMoreLikeThis && (
            <button type="button" onClick={onMoreLikeThis} className="px-3 py-1 bg-blue-600 text-white rounded">More like this</button>
          )}
        </div>

        {showInfo && (
          <div className="mt-3 bg-white text-gray-900 rounded p-3 max-h-72 overflow-auto">
            {infoLoading ? (
              <div className="text-sm text-gray-600">Loading EXIF…</div>
            ) : info ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                {info.camera && (<div><div className="text-gray-500">Camera</div><div className="font-medium">{info.camera}</div></div>)}
                {info.lens && (<div><div className="text-gray-500">Lens</div><div className="font-medium">{info.lens}</div></div>)}
                {info.iso && (<div><div className="text-gray-500">ISO</div><div className="font-medium">{info.iso}</div></div>)}
                {info.fnumber && (<div><div className="text-gray-500">Aperture</div><div className="font-medium">f/{info.fnumber}</div></div>)}
                {info.shutter && (<div><div className="text-gray-500">Shutter</div><div className="font-medium">{info.shutter}</div></div>)}
                {info.datetime && (<div><div className="text-gray-500">Date</div><div className="font-medium">{new Date(info.datetime*1000).toLocaleString()}</div></div>)}
                {info.place && (<div className="col-span-2"><div className="text-gray-500">Place</div><div className="font-medium">{info.place}</div></div>)}
                {Array.isArray(info.tags) && info.tags.length>0 && (
                  <div className="col-span-2">
                    <div className="text-gray-500">Tags</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {info.tags.map((t: string) => (<span key={t} className="px-2 py-0.5 bg-gray-100 rounded text-xs">{t}</span>))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-600">No metadata.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
