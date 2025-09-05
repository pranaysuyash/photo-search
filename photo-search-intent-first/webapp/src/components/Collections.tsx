import React from 'react'

interface CollectionsProps {
  collections: Record<string,string[]>
  onLoadCollections: () => void
}

export default function Collections({
  collections, onLoadCollections
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
        <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
          {Object.keys(collections).map(name => (
            <div key={name} className="border rounded p-2 flex items-center justify-between">
              <div className="truncate" title={name}>{name}</div>
              <div className="text-xs text-gray-600">{collections[name]?.length||0}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}