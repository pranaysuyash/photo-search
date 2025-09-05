import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LookAlikesView from './LookAlikesView'

vi.mock('../api', () => ({
  apiResolveLookalike: vi.fn(async ()=>({ ok: true })),
  apiSetFavorite: vi.fn(async ()=>({ ok: true })),
  thumbUrl: (_d:string,_e:string,p:string,_s:number)=>`mock://thumb${p}`,
}))

describe('LookAlikesView', () => {
  it('shows groups and triggers actions', async () => {
    const onLoad = vi.fn()
    render(
      <LookAlikesView
        dir="/d"
        engine="local"
        groups={[{ id: 'g1', paths: ['/a.jpg','/b.jpg'], resolved: false }]}
        onLoadLookalikes={onLoad}
      />
    )
    expect(screen.getByText(/Group 1/)).toBeInTheDocument()
    await fireEvent.click(screen.getByText('Mark resolved'))
    await waitFor(() => expect(onLoad).toHaveBeenCalled())
    // Add all to Favorites shows alert — mock it
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    await fireEvent.click(screen.getByText('Add all to Favorites'))
    await waitFor(() => expect(alertSpy).toHaveBeenCalled())
    alertSpy.mockRestore()
  })
})
