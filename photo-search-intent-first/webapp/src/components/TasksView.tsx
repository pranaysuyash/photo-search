import React, { useEffect, useState } from 'react'
import { apiTodo } from '../api'

function renderMarkdown(text: string) {
  // Minimal markdown render: headings + bullets; fallback to pre
  const lines = text.split(/\r?\n/)
  const out: JSX.Element[] = []
  let list: string[] = []
  function flushList() {
    if (list.length) {
      out.push(
        <ul className="list-disc ml-6 space-y-1" key={`ul-${out.length}`}>
          {list.map((t, i) => <li key={i}>{t}</li>)}
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
      list.push(bullet[1])
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
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    apiTodo().then(r => { if(!cancelled){ setText(r.text||''); setLoading(false) } }).catch(e=>{ if(!cancelled){ setErr(String(e)); setLoading(false)} })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-4">
      <div className="font-semibold mb-2">Project Tasks (TODO.md)</div>
      {loading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : err ? (
        <div className="text-sm text-red-600">{err}</div>
      ) : (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {renderMarkdown(text)}
        </div>
      )}
    </div>
  )
}

