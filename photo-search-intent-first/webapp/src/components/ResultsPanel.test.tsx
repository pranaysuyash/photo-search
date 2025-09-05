import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ResultsPanel from './ResultsPanel'
import { useSettingsStore } from '../stores/settingsStore'
import { usePhotoStore } from '../stores/photoStore'

vi.mock('../api', () => ({
  thumbUrl: (_d: string, _e: string, p: string, _s: number) => `mock://thumb${p}`,
  apiOpen: async () => ({ ok: true }),
  apiSetFavorite: vi.fn(async () => ({ ok: true })),
}))

describe('ResultsPanel', () => {
  it('shows empty states and renders grid when results exist', () => {
    useSettingsStore.setState({ dir: '/d', engine: 'local' } as any)
    usePhotoStore.setState({ results: [], query: '' } as any)
    const { rerender } = render(<ResultsPanel />)
    expect(screen.getByText(/Run a search/)).toBeInTheDocument()
    // With a query but no results
    usePhotoStore.setState({ query: 'foo' } as any)
    rerender(<ResultsPanel />)
    expect(screen.getByText(/No results/)).toBeInTheDocument()
    // With results
    usePhotoStore.setState({ results: [{ path: '/a.jpg', score: 0.9 }] } as any)
    rerender(<ResultsPanel />)
    expect(screen.getByText('Results')).toBeInTheDocument()
    expect(screen.getByText('1 found')).toBeInTheDocument()
  })

  it('selects all and favorites selected', async () => {
    const { apiSetFavorite } = await import('../api')
    useSettingsStore.setState({ dir: '/d', engine: 'local' } as any)
    usePhotoStore.setState({ results: [{ path: '/a.jpg', score: 0.9 }, { path: '/b.jpg', score: 0.8 }], query: 'q' } as any)
    render(<ResultsPanel />)
    fireEvent.click(screen.getByText('Select all'))
    fireEvent.click(screen.getByText('♥ Favorite selected'))
    await waitFor(() => {
      expect((apiSetFavorite as any).mock.calls.length).toBeGreaterThanOrEqual(1)
    })
  })
})
