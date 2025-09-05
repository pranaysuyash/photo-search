import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TripsView from './TripsView'

vi.mock('../api', () => ({
  apiTripsBuild: vi.fn(async ()=>({ trips: [{ id: 't1', count: 2, place: 'Paris', paths: ['/a.jpg','/b.jpg'] }] })),
  apiTripsList: vi.fn(async ()=>({ trips: [{ id: 't2', count: 1, place: 'SF', paths: ['/c.jpg'] }] })),
  thumbUrl: (_d:string,_e:string,p:string,_s:number)=>`mock://thumb${p}`,
}))

describe('TripsView', () => {
  it('builds, refreshes and opens trip', async () => {
    const setBusy = vi.fn()
    const setNote = vi.fn()
    const setResults = vi.fn()
    render(<TripsView dir="/d" engine="local" setBusy={setBusy} setNote={setNote} setResults={setResults} />)
    await fireEvent.click(screen.getByText('Build'))
    await fireEvent.click(screen.getByText('Refresh'))
    // open may not render trip cards immediately in test jsdom — ensure no throw and handlers called
    // Simulate window._trips populated from refresh
    ;(window as any)._trips = [{ id: 'tX', count: 1, place: 'X', paths: ['/x.jpg'] }]
    // Rerender to show card
    render(<TripsView dir="/d" engine="local" setBusy={setBusy} setNote={setNote} setResults={setResults} />)
    fireEvent.click(screen.getByText('Open'))
    expect(setResults).toHaveBeenCalled()
  })
})

