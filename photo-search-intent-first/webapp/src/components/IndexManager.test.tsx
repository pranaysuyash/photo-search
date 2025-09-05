import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import IndexManager from './IndexManager'

describe('IndexManager', () => {
  const baseProps = {
    dir: '/d', engine: 'local', busy: '', note: 'Done', diag: null,
    onIndex: vi.fn(), onBuildFast: vi.fn(), onBuildOCR: vi.fn(), onBuildMetadata: vi.fn(), onAutoTag: vi.fn(), onLoadDiag: vi.fn(),
  }
  it('disables actions when busy or dir missing', () => {
    const { rerender } = render(<IndexManager {...baseProps} />)
    fireEvent.click(screen.getByText('Build Index'))
    expect(baseProps.onIndex).toHaveBeenCalled()
    rerender(<IndexManager {...baseProps} dir="" busy="Working…" />)
    expect((screen.getByText('Working…').closest('button') as HTMLButtonElement).disabled).toBe(true)
  })
  it('renders diagnostics and triggers Refresh', () => {
    const props = {
      ...baseProps,
      diag: { folder: '/d', engines: [{ key: 'local', index_dir: '/idx', count: 12, fast: { annoy: true, faiss: false, hnsw: true } }], free_gb: 100, os: 'macOS' },
    }
    render(<IndexManager {...props} />)
    expect(screen.getByText('Indexes')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Refresh'))
    expect(baseProps.onLoadDiag).toHaveBeenCalled()
  })
})

