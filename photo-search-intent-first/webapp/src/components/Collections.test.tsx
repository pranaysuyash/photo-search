import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Collections from './Collections'

describe('Collections', () => {
  it('shows empty state', () => {
    render(<Collections collections={{}} onLoadCollections={()=>{}} />)
    expect(screen.getByText(/No collections yet/)).toBeInTheDocument()
  })

  it('renders items and refresh calls handler', () => {
    const onLoad = vi.fn()
    render(<Collections collections={{ Summer: ['/a.jpg','/b.jpg'] }} onLoadCollections={onLoad} />)
    expect(screen.getByText('Summer')).toBeInTheDocument()
    expect(screen.getByText('2 items')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Refresh'))
    expect(onLoad).toHaveBeenCalled()
  })
})

