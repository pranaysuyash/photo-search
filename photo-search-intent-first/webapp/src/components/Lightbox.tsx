import React from 'react'
import { thumbUrl } from '../api'

export function Lightbox({
  dir,
  engine,
  path,
  onPrev,
  onNext,
  onClose,
  onReveal,
  onFavorite,
}: {
  dir: string; engine: string; path: string;
  onPrev: () => void; onNext: () => void; onClose: () => void;
  onReveal: () => void; onFavorite: () => void;
}) {
  if (!path) return null
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="relative max-w-5xl w-full p-4" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2 text-white">
          <div className="truncate text-sm">{path}</div>
          <div className="flex gap-2">
            <button onClick={onPrev} className="bg-white/20 rounded px-2 py-1">◀</button>
            <button onClick={onNext} className="bg-white/20 rounded px-2 py-1">▶</button>
            <button onClick={onClose} className="bg-white text-black rounded px-2 py-1">Close</button>
          </div>
        </div>
        <img src={thumbUrl(dir, engine, path, 1024)} className="w-full h-auto rounded shadow" />
        <div className="mt-3 flex gap-2">
          <button onClick={onReveal} className="px-3 py-1 bg-gray-200 rounded">Reveal in Finder/Explorer</button>
          <button onClick={onFavorite} className="px-3 py-1 bg-pink-600 text-white rounded">♥ Favorite</button>
        </div>
      </div>
    </div>
  )
}

