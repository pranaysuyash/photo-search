import { describe, it, expect } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'
import { SettingsProvider, useSettingsContext } from './SettingsContext'

function Probe() {
  const { state, actions } = useSettingsContext()
  return (
    <div>
      <button aria-label="engine" onClick={() => actions.setEngine('openai')}>{state.engine}</button>
      <button aria-label="fast" onClick={() => actions.setUseFast(!state.useFast)}>{String(state.useFast)}</button>
      <button aria-label="ocr" onClick={() => actions.setUseOcr(!state.useOcr)}>{String(state.useOcr)}</button>
    </div>
  )
}

describe('SettingsContext', () => {
  it('updates settings flags', () => {
    const { getByLabelText } = render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>
    )
    const engine = getByLabelText('engine') as HTMLButtonElement
    const fast = getByLabelText('fast') as HTMLButtonElement
    const ocr = getByLabelText('ocr') as HTMLButtonElement
    engine.click()
    expect(engine.textContent).toBe('openai')
    const f0 = fast.textContent
    fast.click()
    expect(fast.textContent).not.toBe(f0)
    const o0 = ocr.textContent
    ocr.click()
    expect(ocr.textContent).not.toBe(o0)
  })
})

