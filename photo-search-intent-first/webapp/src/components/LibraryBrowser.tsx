import React from 'react'
import { thumbUrl } from '../api'

interface LibraryBrowserProps {
  dir: string
  engine: string
  library: string[]
  onLoadLibrary: (limit?: number, offset?: number) => void
}

export default function LibraryBrowser({
  dir, engine, library, onLoadLibrary
}: LibraryBrowserProps) {
  return (
    <div className="bg-white border rounded p-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Library</h2>
        <div className="flex gap-2">
          <button onClick={()=> onLoadLibrary(120,0)} className="bg-gray-200 rounded px-3 py-1 text-sm">Load</button>
        </div>
      </div>
      {library.length === 0 ? (
        <div className="text-sm text-gray-600 mt-2">No items yet. Build the index, then click Load.</div>
      ) : (
        <div className="mt-2 grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2">
          {library.map((p,i)=> (
            <img key={i} src={thumbUrl(dir, engine, p, 196)} title={p} className="w-full h-24 object-cover rounded" />
          ))}
        </div>
      )}
    </div>
  )
}