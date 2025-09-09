import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { thumbUrl } from '../api'

type ShareDetail = {
  ok: boolean
  error?: 'password_required' | 'expired' | string
  token?: string
  created?: string
  expires?: string | null
  dir?: string
  provider?: string
  paths?: string[]
  view_only?: boolean
  has_password?: boolean
}

export default function ShareViewer() {
  const location = useLocation()
  const navigate = useNavigate()
  const token = useMemo(() => (location.pathname.split('/').filter(Boolean)[1] || ''), [location.pathname])
  const [detail, setDetail] = useState<ShareDetail | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true); setError('')
    try {
      const qs = new URLSearchParams({ token })
      if (password.trim()) qs.set('password', password.trim())
      const r = await fetch(`/share/detail?${qs.toString()}`)
      const js: ShareDetail = await r.json()
      setDetail(js)
      if (!js.ok) {
        if (js.error === 'expired') setError('This link has expired')
        else if (js.error === 'password_required') setError('Password required or incorrect')
        else setError('Unable to open share')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load share')
    } finally { setLoading(false) }
  }

  useEffect(() => { if (token) load() }, [token])

  if (!token) {
    return (
      <div className="h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-2">Invalid share link</div>
          <button className="px-3 py-1 rounded bg-gray-800 border border-gray-700" onClick={()=> navigate('/')}>Back</button>
        </div>
      </div>
    )
  }

  const canRender = detail?.ok && detail?.paths && detail?.dir

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="text-sm">Shared Photos</div>
        <div className="flex items-center gap-2">
          {detail?.expires && <span className="text-xs text-gray-400">Expires {new Date(detail.expires).toLocaleString()}</span>}
          <button className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-sm" onClick={()=> navigate('/')}>Back</button>
        </div>
      </header>
      <main className="p-4">
        {(!detail || (!detail.ok && detail.error === 'password_required')) && (
          <div className="max-w-md mx-auto">
            {error && <div className="mb-2 text-red-400 text-sm">{error}</div>}
            <label className="block text-sm mb-1">Password</label>
            <input className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded" value={password} onChange={(e)=> setPassword(e.target.value)} placeholder="Enter password (if required)" type="password" />
            <div className="mt-3">
              <button className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500" onClick={load} disabled={loading}>{loading ? 'Opening…' : 'Open'}</button>
            </div>
          </div>
        )}
        {detail && !detail.ok && detail.error === 'expired' && (
          <div className="text-center text-gray-300">This link has expired.</div>
        )}
        {canRender && (
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
            {detail!.paths!.map((p) => (
              <div key={p} className="border border-gray-800 rounded overflow-hidden bg-gray-900">
                <img src={thumbUrl(detail!.dir!, detail!.provider || 'local', p, 256)} alt="photo" className="w-full h-[140px] object-cover" />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

