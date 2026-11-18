import { act, renderHook } from '@testing-library/react'
import { expect, it } from 'vitest'
import { useResettableState } from './useResettableState'

it('preserves edits within a scope and resets them when its filters change', () => {
  const { result, rerender } = renderHook(({ filter }) => useResettableState(1, [filter]), {
    initialProps: { filter: 'all' },
  })
  act(() => result.current[1](3))
  rerender({ filter: 'all' })
  expect(result.current[0]).toBe(3)
  rerender({ filter: 'active' })
  expect(result.current[0]).toBe(1)
  act(() => result.current[1](page => page + 1))
  expect(result.current[0]).toBe(2)
})
