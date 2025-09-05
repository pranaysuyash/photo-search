import React from 'react'
import { thumbUrl } from '../api'

interface CollectionsProps {
  dir: string
  engine: string
  collections: Record<string, string[]>
  onLoadCollections: () => void
  onOpen: (name: string) => void
  onDelete?: (name: string) => void
}

export default function Collections({
  dir, engine, collections, onLoadCollections, onOpen, onDelete
}: CollectionsProps) {
  return (
    <div className="bg-white border rounded p-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Collections</h2>
        <button onClick={onLoadCollections} className="bg-gray-200 rounded px-3 py-1 text-sm">Refresh</button>
      </div>
      {Object.keys(collections||{}).length === 0 ? (
        <div className="text-sm text-gray-600 mt-2">No collections yet.</div>
      ) : (
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {Object.keys(collections).map(name => (
            <div key={name} className="border rounded p-2 flex gap-3 items-center">
              <div className="flex gap-1 shrink-0">
                {(collections[name] || []).slice(0,3).map(p => (
                  <img key={p} src={thumbUrl(dir, engine, p, 96)} alt={p.split('/').pop()||p} className="w-14 h-14 object-cover rounded" />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium" title={name}>{name}</div>
                <div className="text-xs text-gray-600">{collections[name]?.length||0} items</div>
                <div className="mt-1 flex gap-2">
                  <button type="button" onClick={() => onOpen(name)} className="px-2 py-0.5 rounded bg-blue-600 text-white">Open</button>
                  {onDelete && (
                    <button type="button" onClick={() => onDelete(name)} className="px-2 py-0.5 rounded bg-red-600 text-white">Delete</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
