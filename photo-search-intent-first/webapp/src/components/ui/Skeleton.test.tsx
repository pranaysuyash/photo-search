import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton, SkeletonText, SkeletonTitle, SkeletonAvatar, PhotoGridSkeleton } from './Skeleton'

describe('Skeleton UI', () => {
  it('renders skeleton primitives', () => {
    const { container } = render(<div>
      <Skeleton />
      <SkeletonText />
      <SkeletonTitle />
      <SkeletonAvatar />
    </div>)
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0)
  })

  it('renders photo grid skeleton items', () => {
    const { container } = render(<PhotoGridSkeleton count={5} columns={4} />)
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThanOrEqual(5)
  })
})

