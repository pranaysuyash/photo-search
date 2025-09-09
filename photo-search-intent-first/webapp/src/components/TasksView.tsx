import React, { useEffect, useState } from 'react'
import { apiTodo, apiAnalytics, apiAutotag } from '../api'
import { useDir, useEngine } from '../stores/settingsStore'

function renderMarkdown(text: string) {
  // Minimal markdown render: headings + bullets (+ checkboxes)
  const lines = text.split(/\r?\n/)
  const out: JSX.Element[] = []
  let list: JSX.Element[] = []
  function flushList() {
    if (list.length) {
      out.push(
        <ul className="list-disc ml-6 space-y-1" key={`ul-${out.length}`}>
          {list.map((node, i) => <li key={i}>{node}</li>)}
        </ul>
      )
      list = []
    }
  }
  lines.forEach((ln, idx) => {
    const h = ln.match(/^(#+)\s+(.*)$/)
    if (h) {
      flushList()
      const level = h[1].length
      const content = h[2]
      const Tag = (level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3') as any
      out.push(<Tag className="font-semibold mt-4" key={`h-${idx}`}>{content}</Tag>)
      return
    }
    const bullet = ln.match(/^[-*]\s+(.*)$/)
    if (bullet) {
      const raw = bullet[1]
      const cb = raw.match(/^\[( |x|X)\]\s+(.*)$/)
      if (cb) {
        const checked = cb[1].toLowerCase() === 'x'
        const txt = cb[2]
        list.push(
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" disabled checked={checked} />
            <span>{txt}</span>
          </label>
        )
      } else {
        list.push(<span>{raw}</span>)
      }
      return
    }
    if (ln.trim() === '') {
      flushList()
      out.push(<div className="h-2" key={`sp-${idx}`}></div>)
      return
    }
    flushList()
    out.push(<p key={`p-${idx}`}>{ln}</p>)
  })
  flushList()
  return out
}

export default function TasksView() {
  const dir = useDir()
  const engine = useEngine()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [events, setEvents] = useState<{ type: string; time: string; [k: string]: any }[]>([])
  const [autotagLoading, setAutotagLoading] = useState(false)
  const [autotagResult, setAutotagResult] = useState<string | null>(null)
  const [evtLoading, setEvtLoading] = useState(false)

  const refreshTodo = async () => {
    try {
      setLoading(true)
      const r = await apiTodo()
      setText(r.text || '')
    } catch (e: any) {
      setErr(String(e))
    } finally {
      setLoading(false)
    }
  }

  const refreshEvents = async () => {
    if (!dir) { setEvents([]); return }
    try {
      setEvtLoading(true)
      const r = await apiAnalytics(dir, 200)
      setEvents(r.events || [])
    } catch {
      // ignore
    } finally {
      setEvtLoading(false)
    }
  }

  const fmtRel = (iso: string) => {
    try {
      const t = new Date(iso).getTime()
      const now = Date.now()
      const d = Math.max(0, now - t)
      const s = Math.floor(d/1000)
      if (s < 60) return `${s}s ago`
      const m = Math.floor(s/60)
      if (m < 60) return `${m}m ago`
      const h = Math.floor(m/60)
      if (h < 24) return `${h}h ago`
      const days = Math.floor(h/24)
      return `${days}d ago`
    } catch { return iso }
  }

  useEffect(() => {
    let cancelled = false
    apiTodo().then(r => { if(!cancelled){ setText(r.text||''); setLoading(false) } }).catch(e=>{ if(!cancelled){ setErr(String(e)); setLoading(false)} })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!dir) { setEvents([]); return }
    apiAnalytics(dir, 200).then(r => { if(!cancelled){ setEvents(r.events || []) } }).catch(()=>{})
    const id = window.setInterval(() => { if (!cancelled) refreshEvents() }, 30000)
    return () => { cancelled = true; window.clearInterval(id) }
  }, [dir])

  const handleAutotag = async () => {
    if (!dir) return
    try {
      setAutotagLoading(true)
      setAutotagResult(null)
      const result: any = await apiAutotag(dir, engine)
      const updated = typeof result.updated === 'number' ? result.updated : 0
      if (updated > 0) {
        setAutotagResult(`Updated tags for ${updated} photo${updated===1?'':'s'}`)
      } else if (result.tags) {
        const totalPhotos = Object.keys(result.tags || {}).length
        setAutotagResult(`Generated tags for ${totalPhotos} photo${totalPhotos===1?'':'s'}`)
      } else {
        setAutotagResult('No changes')
      }
    } catch (e: any) {
      setAutotagResult(`Error: ${e.message}`)
    } finally {
      setAutotagLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Project Tasks (TODO.md)</div>
        <button
          className="text-sm px-2 py-1 border rounded"
          onClick={refreshTodo}
          disabled={loading}
          title="Refresh TODO.md"
        >
          Refresh
        </button>
      </div>
      {loading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : err ? (
        <div className="text-sm text-red-600">{err}</div>
      ) : (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {renderMarkdown(text)}
        </div>
      )}
      <div className="mt-6">
        <div className="font-semibold mb-2">Auto-tag Photos</div>
        <div className="bg-gray-50 dark:bg-gray-800 border rounded p-3 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Generate smart tags for your photos using AI analysis. This will analyze photo content and automatically assign relevant tags.
          </p>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleAutotag}
              disabled={autotagLoading || !dir}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {autotagLoading ? 'Generating Tags...' : 'Generate Auto Tags'}
            </button>
          </div>
          
          {autotagResult && (
            <div className={`p-2 rounded text-sm ${autotagResult.startsWith('Error:') 
              ? 'bg-red-100 text-red-700 border border-red-200' 
              : 'bg-green-100 text-green-700 border border-green-200'
            }`}>
              {autotagResult}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Recent Events</div>
          <button
            className="text-sm px-2 py-1 border rounded disabled:opacity-50"
            onClick={refreshEvents}
            disabled={evtLoading || !dir}
            title="Refresh events"
          >
            {evtLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        <div className="border rounded divide-y">
          {events.length === 0 ? (
            <div className="p-2 text-sm text-gray-600">No recent events.</div>
          ) : events.map((e, i) => (
            <div key={i} className="p-2 text-sm flex items-center justify-between">
              <div>
                <span className="font-mono text-xs bg-gray-100 rounded px-1 py-0.5 mr-2">{e.type}</span>
                <span>{e.query ? `"${e.query}"` : e.token ? `share:${e.token.slice(0,6)}…` : ''}</span>
              </div>
              <div className="text-gray-500" title={new Date(e.time).toLocaleString()}>{fmtRel(e.time)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
