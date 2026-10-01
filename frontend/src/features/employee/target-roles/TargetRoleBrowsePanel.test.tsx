import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TargetRoleApiError } from './targetRoleApi'
import { TargetRoleBrowsePanel } from './TargetRoleBrowsePanel'
import { useTargetRole, useTargetRoles } from './targetRoleQueries'
import type { TargetRoleDetail, TargetRoleSummary } from './targetRoleTypes'

vi.mock('./targetRoleQueries', () => ({
  useTargetRoles: vi.fn(),
  useTargetRole: vi.fn(),
}))

const SUMMARY: TargetRoleSummary = {
  id: 'role-1',
  code: 'JAVA_P3',
  name: 'Java Backend Developer',
  track: 'PROFESSIONAL',
  seniority: 'P3',
  description: 'Builds backend services',
  requirementCount: 2,
}

const DETAIL: TargetRoleDetail = {
  ...SUMMARY,
  familyCode: 'JAVA',
  responsibilities: ['Build APIs'],
  requirements: [{
    skillId: 'skill-1',
    skillCode: 'JAVA',
    skillName: 'Java',
    targetMastery: 0.7,
  }],
}

describe('TargetRoleBrowsePanel', () => {
  beforeEach(() => {
    vi.mocked(useTargetRoles).mockReturnValue(queryResult({ data: [SUMMARY] }))
    vi.mocked(useTargetRole).mockReturnValue(queryResult({ data: DETAIL }))
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('renders browse data and opens detail without exposing selection actions', async () => {
    const user = userEvent.setup()
    render(<TargetRoleBrowsePanel />)

    expect(screen.getByText('Java Backend Developer')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /select/i })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'View details' }))

    expect(useTargetRole).toHaveBeenLastCalledWith('role-1')
    expect(screen.getByText('Build APIs')).toBeTruthy()
    expect(screen.getByText('70%')).toBeTruthy()
  })

  it('debounces name search and clears combined filters', () => {
    vi.useFakeTimers()
    vi.mocked(useTargetRoles).mockReturnValue(queryResult({ data: [] }))
    render(<TargetRoleBrowsePanel />)

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: ' java ' } })
    fireEvent.change(screen.getByRole('combobox', { name: /seniority/i }), { target: { value: 'P3' } })
    act(() => vi.advanceTimersByTime(300))

    expect(useTargetRoles).toHaveBeenLastCalledWith({ search: 'java', seniority: 'P3' })
    expect(screen.getByText('No matching roles')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(useTargetRoles).toHaveBeenLastCalledWith({ search: '', seniority: null })
  })

  it('shows organization guidance when the permitted catalog is empty', () => {
    vi.mocked(useTargetRoles).mockReturnValue(queryResult({ data: [] }))

    render(<TargetRoleBrowsePanel />)

    expect(screen.getByText('No target roles available')).toBeTruthy()
    expect(screen.getByText(/contact your Organization Administrator/)).toBeTruthy()
  })

  it('shows dependency retry and unavailable-detail back action', () => {
    const listRefetch = vi.fn()
    vi.mocked(useTargetRoles).mockReturnValue(queryResult({
      isError: true,
      error: new TargetRoleApiError(503, 'CATALOG_UNAVAILABLE', 'down'),
      refetch: listRefetch,
    }))
    const { rerender } = render(<TargetRoleBrowsePanel />)

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(listRefetch).toHaveBeenCalledOnce()

    vi.mocked(useTargetRoles).mockReturnValue(queryResult({ data: [SUMMARY] }))
    vi.mocked(useTargetRole).mockReturnValue(queryResult({
      isError: true,
      error: new TargetRoleApiError(404, 'ROLE_NOT_AVAILABLE', 'hidden'),
    }))
    rerender(<TargetRoleBrowsePanel />)
    fireEvent.click(screen.getByRole('button', { name: 'View details' }))

    expect(screen.getByText('This role is no longer available')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Back to roles' }))
    expect(screen.queryByText('This role is no longer available')).toBeNull()
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
