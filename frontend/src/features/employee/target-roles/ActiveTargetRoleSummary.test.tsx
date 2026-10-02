import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ActiveTargetRoleSummary } from './ActiveTargetRoleSummary'
import { useTargetRoleSelection } from './targetRoleSelectionQueries'

vi.mock('./targetRoleSelectionQueries', () => ({ useTargetRoleSelection: vi.fn() }))

describe('ActiveTargetRoleSummary', () => {
  afterEach(cleanup)

  it('renders loading, empty, and current selection states', () => {
    vi.mocked(useTargetRoleSelection).mockReturnValue(queryResult({ isPending: true }))
    const { rerender } = render(<ActiveTargetRoleSummary />)
    expect(screen.getByRole('status').textContent).toContain('Loading active target role')

    vi.mocked(useTargetRoleSelection).mockReturnValue(queryResult({ data: null }))
    rerender(<ActiveTargetRoleSummary />)
    expect(screen.getByText('No active target role')).toBeTruthy()

    vi.mocked(useTargetRoleSelection).mockReturnValue(queryResult({ data: {
      selectionId: '20000000-0000-0000-0000-000000000001',
      roleId: '10000000-0000-0000-0000-000000000001',
      roleSnapshot: {
        id: '10000000-0000-0000-0000-000000000001',
        code: 'JAVA_P3',
        name: 'Java Backend Developer',
        track: 'PROFESSIONAL',
        seniority: 'P3',
      },
      selectedAt: '2026-10-02T01:00:00Z',
      targetRevision: 2,
      changed: false,
    } }))
    rerender(<ActiveTargetRoleSummary />)
    expect(screen.getByText('Java Backend Developer')).toBeTruthy()
    expect(screen.getByText('Revision 2')).toBeTruthy()
    expect(screen.getByText('JAVA_P3')).toBeTruthy()
  })

  it('presents one retry action for selection loading errors', () => {
    const refetch = vi.fn()
    vi.mocked(useTargetRoleSelection).mockReturnValue(queryResult({
      isError: true,
      error: new Error('down'),
      refetch,
    }))
    render(<ActiveTargetRoleSummary />)

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(screen.getByRole('alert').textContent).toContain('Active target role unavailable')
    expect(refetch).toHaveBeenCalledOnce()
  })
})

function queryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    error: null,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as never
}
