import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TargetRoleBrowsePanel } from './TargetRoleBrowsePanel'
import { useTargetRole, useTargetRoles } from './targetRoleQueries'
import { TargetRoleSelectionApiError } from './targetRoleSelectionApi'
import {
  useChooseTargetRoleMutation,
  useTargetRoleSelection,
} from './targetRoleSelectionQueries'
import type { TargetRoleSelection } from './targetRoleSelectionTypes'

vi.mock('./targetRoleQueries', () => ({
  useTargetRoles: vi.fn(),
  useTargetRole: vi.fn(),
}))

vi.mock('./targetRoleSelectionQueries', () => ({
  useTargetRoleSelection: vi.fn(),
  useChooseTargetRoleMutation: vi.fn(),
}))

const ROLE_ID = '10000000-0000-0000-0000-000000000001'
const OTHER_ROLE_ID = '10000000-0000-0000-0000-000000000002'
const SELECTION_ID = '20000000-0000-0000-0000-000000000001'
const IDEMPOTENCY_KEY = '30000000-0000-0000-0000-000000000001'

const ROLE = {
  id: ROLE_ID,
  code: 'JAVA_P3',
  name: 'Java Backend Developer',
  track: 'PROFESSIONAL' as const,
  seniority: 'P3' as const,
  description: 'Builds backend services',
  requirementCount: 2,
}

const CURRENT_SELECTION: TargetRoleSelection = {
  selectionId: SELECTION_ID,
  roleId: OTHER_ROLE_ID,
  roleSnapshot: {
    id: OTHER_ROLE_ID,
    code: 'DATA_P3',
    name: 'Data Engineer',
    track: 'PROFESSIONAL',
    seniority: 'P3',
  },
  selectedAt: '2026-10-02T01:00:00Z',
  targetRevision: 1,
  changed: false,
}

describe('TargetRoleBrowsePanel selection flow', () => {
  const mutate = vi.fn()
  const resetMutation = vi.fn()
  const refetchSelection = vi.fn()

  beforeEach(() => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(IDEMPOTENCY_KEY)
    vi.mocked(useTargetRoles).mockReturnValue(queryResult({ data: [ROLE] }))
    vi.mocked(useTargetRole).mockReturnValue(queryResult({ data: undefined }))
    vi.mocked(useTargetRoleSelection).mockReturnValue(queryResult({
      data: null,
      refetch: refetchSelection,
    }))
    vi.mocked(useChooseTargetRoleMutation).mockReturnValue(mutationResult({
      mutate,
      reset: resetMutation,
    }))
  })

  afterEach(cleanup)

  it('cancels an initial choice without mutating', async () => {
    const user = userEvent.setup()
    render(<TargetRoleBrowsePanel />)

    await user.click(screen.getByRole('button', { name: 'Choose' }))
    expect(screen.getByText('Choose target role')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mutate).not.toHaveBeenCalled()
    expect(screen.queryByText('Choose target role')).toBeNull()
  })

  it('reuses the prepared key for retry and locks synchronous double submit', async () => {
    const user = userEvent.setup()
    render(<TargetRoleBrowsePanel />)

    await user.click(screen.getByRole('button', { name: 'Choose' }))
    const confirm = screen.getByRole('button', { name: 'Confirm target role' })
    await user.dblClick(confirm)

    expect(mutate).toHaveBeenCalledOnce()
    const [firstCommand, firstOptions] = mutate.mock.calls[0]
    expect(firstCommand).toEqual({
      roleId: ROLE_ID,
      expectedCurrentSelectionId: null,
      idempotencyKey: IDEMPOTENCY_KEY,
    })

    act(() => firstOptions.onSettled())
    await user.click(confirm)

    expect(mutate).toHaveBeenCalledTimes(2)
    expect(mutate.mock.calls[1][0]).toBe(firstCommand)
  })

  it('prepares a change against the current selection', async () => {
    const user = userEvent.setup()
    vi.mocked(useTargetRoleSelection).mockReturnValue(queryResult({
      data: CURRENT_SELECTION,
      refetch: refetchSelection,
    }))
    render(<TargetRoleBrowsePanel />)

    await user.click(screen.getByRole('button', { name: 'Choose' }))
    expect(screen.getByText('Change target role')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Confirm role change' }))

    expect(mutate.mock.calls[0][0]).toMatchObject({
      roleId: ROLE_ID,
      expectedCurrentSelectionId: SELECTION_ID,
    })
  })

  it('refreshes the current selection after a stale mutation response', async () => {
    const user = userEvent.setup()
    render(<TargetRoleBrowsePanel />)

    await user.click(screen.getByRole('button', { name: 'Choose' }))
    await user.click(screen.getByRole('button', { name: 'Confirm target role' }))
    const mutationOptions = mutate.mock.calls[0][1]
    act(() => mutationOptions.onError(
      new TargetRoleSelectionApiError(409, 'STALE_SELECTION', 'stale'),
    ))

    expect(refetchSelection).toHaveBeenCalledOnce()
  })

  it('marks the same role active and prevents another selection action', () => {
    vi.mocked(useTargetRoleSelection).mockReturnValue(queryResult({
      data: {
        ...CURRENT_SELECTION,
        roleId: ROLE_ID,
        roleSnapshot: { ...CURRENT_SELECTION.roleSnapshot, id: ROLE_ID },
      },
    }))
    render(<TargetRoleBrowsePanel />)

    expect(screen.getByText('Active role')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Active' }) as HTMLButtonElement).disabled).toBe(true)
    expect(mutate).not.toHaveBeenCalled()
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

function mutationResult(overrides: Record<string, unknown> = {}) {
  return {
    error: null,
    isPending: false,
    mutate: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  } as never
}
