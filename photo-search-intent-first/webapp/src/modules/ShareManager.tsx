import React, { useEffect, useState } from 'react'
import { apiListShares, apiRevokeShare } from '../api'

type ShareRow = { token: string; created: string; expires?: string; dir: string; provider: string; count: number; view_only: boolean; expired?: boolean; has_password?: boolean }

export function ShareManager({ dir }: { dir: string }) {
  const [items, setItems] = useState<ShareRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const r = await apiListShares(dir || undefined)
      setItems(r.shares || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load shares')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [dir])

  return (
    <div>
      {error && <div className="text-red-700 text-sm mb-2">{error}</div>}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-600">{items.length} link{items.length !== 1 ? 's' : ''}</div>
        <button onClick={load} className="px-2 py-1 border rounded text-sm">Refresh</button>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-1 pr-2">Token</th>
              <th className="py-1 pr-2">Created</th>
              <th className="py-1 pr-2">Expires</th>
              <th className="py-1 pr-2">Count</th>
              <th className="py-1 pr-2">Access</th>
              <th className="py-1 pr-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.token} className="border-b hover:bg-gray-50">
                <td className="py-1 pr-2 font-mono text-xs">{it.token}</td>
                <td className="py-1 pr-2">{new Date(it.created).toLocaleString()}</td>
                <td className="py-1 pr-2">
                  {it.expires ? new Date(it.expires).toLocaleString() : '—'}
                  {it.expired ? <span className="ml-1 text-red-700">(expired)</span> : null}
                  {!it.expired && it.expires && (() => {
                    const ms = new Date(it.expires).getTime() - Date.now()
                    if (ms > 0 && ms < 24*3600*1000) return <span className="ml-1 text-amber-700">(expires soon)</span>
                    return null
                  })()}
                </td>
                <td className="py-1 pr-2">{it.count}</td>
                <td className="py-1 pr-2">
                  <div className="flex items-center gap-1">
                    <span>{it.view_only ? 'View-only' : 'Downloadable'}</span>
                    {it.has_password ? <span className="text-xs bg-gray-200 rounded px-1">Protected</span> : null}
                  </div>
                </td>
                <td className="py-1 pr-2">
                  <div className="flex gap-2">
                    <button className="px-2 py-0.5 border rounded" onClick={async ()=>{
                      const url = `${window.location.origin}/share/${it.token}/view`
                      window.open(url, '_blank')
                    }}>Open</button>
                    <button className="px-2 py-0.5 border rounded" onClick={async ()=>{
                      const url = `${window.location.origin}/share/${it.token}/view`
                      await navigator.clipboard.writeText(url)
                      alert('Copied link to clipboard')
                    }}>Copy Link</button>
                    <button className="px-2 py-0.5 border rounded text-red-700" onClick={async ()=>{
                      if (!confirm('Revoke this share link?')) return
                      try { await apiRevokeShare(it.token); await load() } catch {}
                    }}>Revoke</button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr><td colSpan={6} className="py-4 text-center text-gray-500">No share links yet.</td></tr>
            )}
            {loading && (
              <tr><td colSpan={6} className="py-4 text-center text-gray-500">Loading…</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ShareManager
