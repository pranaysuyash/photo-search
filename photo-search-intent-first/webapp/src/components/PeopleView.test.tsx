import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PeopleView from './PeopleView'

vi.mock('../api', () => ({
  apiBuildFaces: vi.fn(async ()=>({ faces: 10, clusters: 2 })),
  apiFacesName: vi.fn(async ()=>({ ok: true })),
  thumbFaceUrl: (_d:string,_e:string,p:string,_emb:number,_s:number)=>`mock://face${p}`,
}))

describe('PeopleView', () => {
  it('shows empty state and triggers build/refresh', async () => {
    const setBusy = vi.fn()
    const setNote = vi.fn()
    const onLoadFaces = vi.fn()
    render(
      <PeopleView
        dir="/d"
        engine="local"
        clusters={[]}
        persons={[]}
        setPersons={()=>{}}
        busy=""
        setBusy={setBusy}
        setNote={setNote}
        onLoadFaces={onLoadFaces}
      />
    )
    expect(screen.getByText(/No face clusters/)).toBeInTheDocument()
    await fireEvent.click(screen.getByText('Build/Update'))
    await waitFor(() => expect(onLoadFaces).toHaveBeenCalled())
    fireEvent.click(screen.getByText('Refresh'))
    await waitFor(() => expect(onLoadFaces).toHaveBeenCalledTimes(2))
  })
  it('allows adding person and naming', async () => {
    const setPersons = vi.fn()
    // mock prompt
    vi.spyOn(window, 'prompt').mockReturnValue('Alice')
    render(
      <PeopleView
        dir="/d"
        engine="local"
        clusters={[{ id: '1', name: 'Alice', size: 1, examples: [['/a.jpg', 0]] }]}
        persons={[]}
        setPersons={setPersons}
        busy=""
        setBusy={()=>{}}
        setNote={()=>{}}
        onLoadFaces={()=>{}}
      />
    )
    await fireEvent.click(screen.getByText('Add'))
    expect(setPersons).toHaveBeenCalled()
    await fireEvent.click(screen.getByText('Name'))
    expect(window.prompt).toHaveBeenCalled()
  })
})
