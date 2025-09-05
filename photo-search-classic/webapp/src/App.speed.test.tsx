import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'

vi.mock('./api', () => ({
  apiBuildFast: vi.fn(async () => ({ ok: true, kind: 'faiss' })),
  apiBuildOCR: vi.fn(async () => ({ updated: 0 })),
  apiSearch: vi.fn(async () => ({ search_id: 's', results: [] })),
  apiGetFavorites: vi.fn(async () => ({ favorites: [] })),
  apiGetSaved: vi.fn(async () => ({ saved: [] })),
  apiDiagnostics: vi.fn(async () => ({ folder: '/d', engines: [], free_gb: 100, os: 'macOS' })),
  apiGetMetadata: vi.fn(async () => ({ cameras: [] })),
  thumbUrl: (_d: string, _e: string, p: string, _s: number) => `mock://thumb${p}`,
}))

describe('Classic App Speed controls', () => {
  it('triggers FAISS/HNSW/Annoy and OCR build', async () => {
    const { apiBuildFast, apiBuildOCR } = await import('./api')
    render(<App />)
    fireEvent.change(screen.getByPlaceholderText('/path/to/photos'), { target: { value: '/d' } })
    // Click speed buttons
    fireEvent.click(screen.getByText('Prepare FAISS'))
    fireEvent.click(screen.getByText('Prepare HNSW'))
    fireEvent.click(screen.getByText('Prepare Annoy'))
    fireEvent.click(screen.getByText('Build OCR'))
    expect((apiBuildFast as any).mock.calls.length).toBeGreaterThanOrEqual(3)
    expect((apiBuildOCR as any).mock.calls.length).toBeGreaterThanOrEqual(1)
  })
})

