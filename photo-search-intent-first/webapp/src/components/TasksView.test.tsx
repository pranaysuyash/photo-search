import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import TasksView from './TasksView'

vi.mock('../api', () => ({ apiTodo: vi.fn(async ()=>({ text: '# Title\n\n- One\n- Two' })) }))

describe('TasksView', () => {
  it('renders markdown from apiTodo', async () => {
    render(<TasksView />)
    expect(await screen.findByText('Title')).toBeInTheDocument()
    expect(await screen.findByText('One')).toBeInTheDocument()
    expect(await screen.findByText('Two')).toBeInTheDocument()
  })
})

