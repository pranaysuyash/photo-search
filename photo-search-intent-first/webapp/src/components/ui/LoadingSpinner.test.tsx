import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingSpinner, LoadingButton } from './LoadingSpinner'

describe('LoadingSpinner UI', () => {
  it('renders different sizes', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />)
    expect(document.querySelector('.spinner-sm')).toBeTruthy()
    rerender(<LoadingSpinner size="lg" />)
    expect(document.querySelector('.spinner-lg')).toBeTruthy()
  })

  it('LoadingButton disables when loading', () => {
    render(<LoadingButton isLoading={true}>Go</LoadingButton>)
    const btn = screen.getByRole('button') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })
})

