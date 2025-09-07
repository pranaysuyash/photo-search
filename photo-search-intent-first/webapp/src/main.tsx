import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import AppWrapper from './AppWrapper'
import TestApp from './debug/TestApp'
import { SimpleStoreProvider } from './stores/SimpleStore'
import './styles.css'

function selectApp() {
  const params = new URLSearchParams(window.location.search)
  const ui = params.get('ui') ?? (import.meta as any).env?.VITE_UI ?? 'modern'
  // Default to App (formerly ModernApp); allow forcing test via ?ui=test
  if (ui === 'test') return <TestApp />
  if (ui === 'new') return <AppWrapper />
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <SimpleStoreProvider>
    {selectApp()}
  </SimpleStoreProvider>
)
