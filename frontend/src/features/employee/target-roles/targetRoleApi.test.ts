import { afterEach, describe, expect, it, vi } from 'vitest'
import { getTargetRole, getTargetRoles } from './targetRoleApi'

describe('targetRoleApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('encodes discovery filters and validates list responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response([{
      id: 'role-1',
      code: 'JAVA_P3',
      name: 'Java Developer',
      track: 'PROFESSIONAL',
      seniority: 'P3',
      description: null,
      requirementCount: 1,
    }]))
    vi.stubGlobal('fetch', fetchMock)

    const roles = await getTargetRoles(
      { search: ' java & spring ', seniority: 'P3' }, new AbortController().signal)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/employee/target-roles?search=java+%26+spring&seniority=P3',
      expect.objectContaining({ credentials: 'same-origin' }),
    )
    expect(roles[0].id).toBe('role-1')
  })

  it('preserves public API errors and rejects malformed detail payloads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      response({ code: 'ROLE_NOT_AVAILABLE', message: 'hidden' }, 404),
    ))

    await expect(getTargetRole('role-1', new AbortController().signal))
      .rejects.toMatchObject({ status: 404, code: 'ROLE_NOT_AVAILABLE' })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ id: 'broken' })))
    await expect(getTargetRole('role-1', new AbortController().signal))
      .rejects.toThrow('Invalid target-role detail collections')
  })
})

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
