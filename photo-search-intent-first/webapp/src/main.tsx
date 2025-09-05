import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import ModernApp from './ModernApp'
import TestApp from './debug/TestApp'
import './styles.css'

function selectApp() {
  const params = new URLSearchParams(window.location.search)
  const ui = params.get('ui') ?? (import.meta as any).env?.VITE_UI ?? 'modern'
  // Default to modern; allow forcing classic via ?ui=classic
  if (ui === 'test') return <TestApp />
  return ui === 'classic' ? <App /> : <ModernApp />
}

createRoot(document.getElementById('root')!).render(
  selectApp()
)
