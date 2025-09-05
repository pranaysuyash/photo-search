import React from 'react'

interface IndexManagerProps {
  // Basic state
  dir: string
  engine: string
  busy: string
  note: string
  
  // Diagnostics data
  diag: { folder: string; engines: { key: string; index_dir: string; count: number; fast?: { annoy: boolean; faiss: boolean; hnsw: boolean } }[]; free_gb: number; os: string } | null
  
  // Actions
  onIndex: () => void
  onBuildFast: (kind: 'annoy'|'faiss'|'hnsw') => void
  onBuildOCR: () => void
  onBuildMetadata: () => void
  onAutoTag: () => void
  onLoadDiag: () => void
}

export default function IndexManager({
  dir, engine, busy, note, diag,
  onIndex, onBuildFast, onBuildOCR, onBuildMetadata, onAutoTag, onLoadDiag
}: IndexManagerProps) {
  return (
    <div className="space-y-6">
      {/* Index Building Controls */}
      <div className="bg-white border rounded p-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Index Management</h2>
          <button onClick={onIndex} disabled={!dir || busy} className="bg-gray-800 text-white rounded px-3 py-2 disabled:opacity-50">
            {busy || 'Build Index'}
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button onClick={()=>onBuildFast('faiss')} disabled={!dir || busy} className="bg-blue-600 text-white rounded px-3 py-2 text-sm disabled:opacity-50">
            Build FAISS
          </button>
          <button onClick={()=>onBuildFast('hnsw')} disabled={!dir || busy} className="bg-blue-600 text-white rounded px-3 py-2 text-sm disabled:opacity-50">
            Build HNSW
          </button>
          <button onClick={()=>onBuildFast('annoy')} disabled={!dir || busy} className="bg-blue-600 text-white rounded px-3 py-2 text-sm disabled:opacity-50">
            Build Annoy
          </button>
          <button onClick={onBuildOCR} disabled={!dir || busy} className="bg-green-600 text-white rounded px-3 py-2 text-sm disabled:opacity-50">
            Build OCR
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button onClick={onBuildMetadata} disabled={!dir || busy} className="bg-purple-600 text-white rounded px-3 py-2 text-sm disabled:opacity-50">
            Build Metadata
          </button>
          <button onClick={onAutoTag} disabled={!dir || busy} className="bg-orange-600 text-white rounded px-3 py-2 text-sm disabled:opacity-50">
            Auto Tag
          </button>
        </div>
        
        {note && (
          <div className="mt-2 text-sm text-gray-600 p-2 bg-gray-50 rounded">
            {note}
          </div>
        )}
      </div>

      {/* Diagnostics */}
      <div className="bg-white border rounded p-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Diagnostics</h2>
          <button onClick={onLoadDiag} className="bg-gray-200 rounded px-3 py-1 text-sm">Refresh</button>
        </div>
        {diag ? (
          <div className="mt-2 text-sm">
            <div>Folder: <span className="font-mono">{diag.folder}</span></div>
            <div>Free disk: {diag.free_gb} GB (OS: {diag.os})</div>
            <div className="mt-2">
              <div className="font-semibold mb-1">Indexes</div>
              {diag.engines.length === 0 ? <div className="text-gray-600">No indexes found.</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {diag.engines.map((e,i)=> (
                    <div key={i} className="border rounded p-2 flex items-center justify-between">
                      <div>
                        <div className="font-mono text-xs">{e.key}</div>
                        <div className="text-xs text-gray-600">{e.index_dir}</div>
                        {e.fast && (
                          <div className="text-xs mt-1 text-gray-700">Fast: Annoy {e.fast.annoy ? '✅' : '❌'}, FAISS {e.fast.faiss ? '✅' : '❌'}, HNSW {e.fast.hnsw ? '✅' : '❌'}</div>
                        )}
                      </div>
                      <div className="text-sm">{e.count} photos</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (<div className="text-sm text-gray-600 mt-2">Click Refresh to view.</div>)}
      </div>
    </div>
  )
}