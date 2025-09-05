import React from 'react'
import { thumbUrl, type SearchResult } from '../api'

export function ResultsGrid({
  dir,
  engine,
  results,
  selected,
  onToggleSelect,
  onOpen,
  showScore = true,
}: {
  dir: string;
  engine: string;
  results: SearchResult[];
  selected: Record<string, boolean>;
  onToggleSelect: (path: string) => void;
  onOpen: (path: string) => void;
  showScore?: boolean;
}) {
  if (!results || results.length === 0) {
    return <div className="text-sm text-gray-600 mt-2">No results yet. Type a description and click Search.</div>
  }
  return (
    <div className="mt-2 grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2">
      {results.map((r) => {
        const p = r.path
        const isSel = !!selected[p]
        return (
          <div key={p} className={`relative cursor-pointer border rounded ${isSel ? 'ring-2 ring-blue-600' : ''}`} onClick={() => onToggleSelect(p)} onDoubleClick={() => onOpen(p)}>
            <img src={thumbUrl(dir, engine, p, 256)} className="w-full h-24 object-cover rounded" title={p} />
            {showScore && (
              <div className="absolute top-1 left-1 bg-white/80 rounded px-1 text-xs">{(r.score || 0).toFixed(2)}</div>
            )}
            <div className="absolute top-1 right-1"><input type="checkbox" checked={isSel} onChange={() => onToggleSelect(p)} /></div>
          </div>
        )
      })}
    </div>
  )
}

