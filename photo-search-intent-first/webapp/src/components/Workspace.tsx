import React from 'react'
import { apiWorkspaceAdd, apiWorkspaceRemove } from '../api'

interface WorkspaceProps {
  workspace: string[]
  setWorkspace: (workspace: string[]) => void
}

export default function Workspace({
  workspace, setWorkspace
}: WorkspaceProps) {
  return (
    <div className="bg-white border rounded p-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Workspace</h2>
      </div>
      <div className="mt-2 text-sm">
        <div className="mb-2">Folders:</div>
        {workspace.length === 0 ? (
          <div className="text-gray-600">No extra folders yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {workspace.map((p,i)=> (
              <div key={i} className="border rounded p-2 flex items-center justify-between">
                <div className="font-mono text-xs truncate" title={p}>{p}</div>
                <button onClick={async()=>{ try{ const r = await apiWorkspaceRemove(p); setWorkspace(r.folders||[]) } catch{} }} className="px-2 py-1 bg-red-600 text-white rounded">Remove</button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 flex gap-2">
          <input id="ws_add" placeholder="/path/to/folder" className="flex-1 border rounded px-2 py-1" />
          <button onClick={async()=>{ const el = document.getElementById('ws_add') as HTMLInputElement; const val = el.value.trim(); if (!val) return; try{ const r = await apiWorkspaceAdd(val); setWorkspace(r.folders||[]); el.value='' } catch{} }} className="px-3 py-1 bg-gray-200 rounded">Add</button>
        </div>
      </div>
    </div>
  )
}