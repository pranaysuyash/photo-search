import { describe, it, expect } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'
import { SearchProvider, useSearchContext } from './SearchContext'

function Probe() {
  const { state, actions } = useSearchContext()
  return (
    <button onClick={() => { actions.setQuery('dog'); actions.setResults([{ path: '/x.jpg', score: 1 } as any]) }}>
      {state.query}:{state.results.length}
    </button>
  )
}

describe('SearchContext', () => {
  it('provides default state and allows updates', async () => {
    const { getByRole } = render(
      <SearchProvider>
        <Probe />
      </SearchProvider>
    )
    const btn = getByRole('button') as HTMLButtonElement
    // Click to update via actions
    btn.click()
    expect(btn.textContent).toContain('dog:1')
  })
})

