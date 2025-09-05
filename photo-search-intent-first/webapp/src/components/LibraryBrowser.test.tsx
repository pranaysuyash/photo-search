import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LibraryBrowser from './LibraryBrowser'

vi.mock('../api', () => ({ thumbUrl: (_d:string,_e:string,p:string,_s:number)=>`mock://thumb${p}` }))

describe('LibraryBrowser', () => {
  it('shows empty state and loads', () => {
    const onLoad = vi.fn()
    const { rerender } = render(<LibraryBrowser dir="/d" engine="local" library={[]} onLoadLibrary={onLoad} />)
    expect(screen.getByText(/No items yet/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Load'))
    expect(onLoad).toHaveBeenCalledWith(120, 0)
    rerender(<LibraryBrowser dir="/d" engine="local" library={["/a.jpg"]} onLoadLibrary={onLoad} />)
    expect(screen.getAllByRole('img').length).toBe(1)
  })
})

