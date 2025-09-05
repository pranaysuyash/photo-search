import React from 'react'
import { apiSetFavorite, apiResolveLookalike, thumbUrl } from '../api'

const basename = (p: string) => p.split('/').pop() || p

interface LookAlikesViewProps {
  dir: string
  engine: string
  groups: { id: string; paths: string[]; resolved: boolean }[]
  onLoadLookalikes: () => void
}

export default function LookAlikesView({
  dir, engine, groups, onLoadLookalikes
}: LookAlikesViewProps) {
  
  const handleResolveGroup = async (paths: string[]) => {
    try { 
      await apiResolveLookalike(dir, paths); 
      await onLoadLookalikes() 
    } catch {} 
  }
  
  const handleAddGroupToFavorites = async (paths: string[]) => {
    for (const p of paths) { 
      try { 
        await apiSetFavorite(dir, p, true) 
      } catch {} 
    } 
    alert('Added group to Favorites')
  }
  
  return (
    <div className="bg-white border rounded p-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Look‑alikes</h2>
        <button onClick={onLoadLookalikes} className="bg-gray-200 rounded px-3 py-1 text-sm">Scan</button>
      </div>
      {groups.length === 0 ? (
        <div className="text-sm text-gray-600 mt-2">No groups yet.</div>
      ) : (
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          {groups.map((g,gi)=> (
            <div key={g.id} className="border rounded p-2 text-xs">
              <div className="mb-1 flex items-center justify-between">
                <div className="font-semibold">Group {gi+1}</div>
                <div>{g.resolved ? '✅' : ''}</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {g.paths.map((p,pi)=> (
                  <div key={pi} className="border rounded p-1">
                    <div className="truncate" title={p}>{basename(p)}</div>
                    <img src={thumbUrl(dir, engine, p, 196)} className="w-full h-24 object-cover rounded mt-1" />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={()=>handleResolveGroup(g.paths)} className="bg-gray-200 rounded px-3 py-1">Mark resolved</button>
                <button onClick={()=>handleAddGroupToFavorites(g.paths)} className="bg-gray-200 rounded px-3 py-1">Add all to Favorites</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}