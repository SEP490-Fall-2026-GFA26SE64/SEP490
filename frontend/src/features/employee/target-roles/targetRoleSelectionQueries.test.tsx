import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { chooseTargetRole, getTargetRoleSelection } from './targetRoleSelectionApi'
import {
  targetRoleSelectionQueryKey,
  useChooseTargetRoleMutation,
  useTargetRoleSelection,
} from './targetRoleSelectionQueries'

vi.mock('./targetRoleSelectionApi', () => ({
  chooseTargetRole: vi.fn(),
  getTargetRoleSelection: vi.fn(),
}))

const SELECTION = {
  selectionId: '20000000-0000-0000-0000-000000000001',
  roleId: '10000000-0000-0000-0000-000000000001',
  roleSnapshot: {
    id: '10000000-0000-0000-0000-000000000001',
    code: 'JAVA_P3',
    name: 'Java Backend Developer',
    track: 'PROFESSIONAL' as const,
    seniority: 'P3' as const,
  },
  selectedAt: '2026-10-02T01:00:00Z',
  targetRevision: 1,
  changed: true,
}

describe('targetRoleSelectionQueries', () => {
  afterEach(cleanup)

  it('loads the current selection through the canonical query key', async () => {
    vi.mocked(getTargetRoleSelection).mockResolvedValue(SELECTION)
    const { client, wrapper } = queryFixture()
    const { result } = renderHook(() => useTargetRoleSelection(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(SELECTION)
    expect(client.getQueryData(targetRoleSelectionQueryKey)).toEqual(SELECTION)
    expect(getTargetRoleSelection).toHaveBeenCalledOnce()
  })

  it('forwards the prepared command and invalidates current selection after success', async () => {
    vi.mocked(chooseTargetRole).mockResolvedValue(SELECTION)
    const { client, wrapper } = queryFixture()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useChooseTargetRoleMutation(), { wrapper })
    const command = {
      roleId: SELECTION.roleId,
      expectedCurrentSelectionId: null,
      idempotencyKey: '30000000-0000-0000-0000-000000000001',
    }

    await act(async () => {
      await result.current.mutateAsync(command)
    })

    expect(chooseTargetRole).toHaveBeenCalledWith(command)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: targetRoleSelectionQueryKey })
  })
})

function queryFixture() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return {
    client,
    wrapper: ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  }
}
