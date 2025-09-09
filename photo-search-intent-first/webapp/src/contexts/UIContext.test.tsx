import { describe, it, expect } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'
import { UIProvider, useUIContext } from './UIContext'

function Probe() {
  const { state, actions } = useUIContext()
  return (
    <div>
      <button aria-label="toggle" onClick={() => actions.toggleSidebar()}>{String(state.sidebarOpen)}</button>
      <button aria-label="theme" onClick={() => actions.setTheme(state.theme === 'light' ? 'dark' : 'light')}>{state.theme}</button>
    </div>
  )
}

describe('UIContext', () => {
  it('toggles sidebar and theme', () => {
    const { getByLabelText } = render(
      <UIProvider>
        <Probe />
      </UIProvider>
    )
    const toggle = getByLabelText('toggle') as HTMLButtonElement
    const theme = getByLabelText('theme') as HTMLButtonElement
    const initialToggle = toggle.textContent
    toggle.click()
    expect(toggle.textContent).not.toBe(initialToggle)
    const initialTheme = theme.textContent
    theme.click()
    expect(theme.textContent).not.toBe(initialTheme)
  })
})

