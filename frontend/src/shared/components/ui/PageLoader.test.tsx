import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PAGE_LOADER_SLOW_MS, PageLoader } from './PageLoader'

describe('PageLoader slow state', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => { cleanup(); vi.useRealTimers() })

  it('explains a long fullscreen wait and offers a reload instead of looking frozen', () => {
    render(<PageLoader variant="fullscreen" label="Opening your workspace…" />)
    expect(screen.queryByText(/Still loading/)).toBeNull()
    act(() => { vi.advanceTimersByTime(PAGE_LOADER_SLOW_MS) })
    expect(screen.getByRole('status').textContent).toContain('Still loading')
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeTruthy()
  })

  it('keeps inline loaders inside the shell without a page reload action', () => {
    render(<PageLoader label="Loading job positions…" />)
    act(() => { vi.advanceTimersByTime(PAGE_LOADER_SLOW_MS) })
    expect(screen.getByText(/Still loading/)).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
