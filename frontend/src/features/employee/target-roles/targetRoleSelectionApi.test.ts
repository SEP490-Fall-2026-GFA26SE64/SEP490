import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  chooseTargetRole,
  getTargetRoleSelection,
  prepareChooseTargetRoleCommand,
} from './targetRoleSelectionApi'

const ROLE_ID = '10000000-0000-0000-0000-000000000001'
const SELECTION_ID = '20000000-0000-0000-0000-000000000001'
const IDEMPOTENCY_KEY = '30000000-0000-0000-0000-000000000001'

const VALID_SELECTION = {
  selectionId: SELECTION_ID,
  roleId: ROLE_ID,
  roleSnapshot: {
    id: ROLE_ID,
    code: 'JAVA_P3',
    name: 'Java Backend Developer',
    track: 'PROFESSIONAL',
    seniority: 'P3',
  },
  selectedAt: '2026-10-02T01:00:00Z',
  targetRevision: 1,
  changed: true,
}

describe('targetRoleSelectionApi', () => {
  beforeEach(() => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(IDEMPOTENCY_KEY)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('prepares one normalized command with a generated idempotency key', () => {
    expect(prepareChooseTargetRoleCommand({
      roleId: ROLE_ID.toUpperCase(),
      expectedCurrentSelectionId: SELECTION_ID.toUpperCase(),
    })).toEqual({
      roleId: ROLE_ID,
      expectedCurrentSelectionId: SELECTION_ID,
      idempotencyKey: IDEMPOTENCY_KEY,
    })
  })

  it('maps 204 to no active selection and validates a complete response', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(response(VALID_SELECTION)))

    await expect(getTargetRoleSelection(new AbortController().signal)).resolves.toBeNull()
    await expect(getTargetRoleSelection(new AbortController().signal)).resolves.toEqual(VALID_SELECTION)
  })

  it('rejects mismatched snapshots and invalid revisions', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response({
        ...VALID_SELECTION,
        roleSnapshot: { ...VALID_SELECTION.roleSnapshot, id: SELECTION_ID },
      }))
      .mockResolvedValueOnce(response({ ...VALID_SELECTION, targetRevision: 0 })))

    await expect(getTargetRoleSelection(new AbortController().signal))
      .rejects.toMatchObject({ status: 502, code: 'INVALID_RESPONSE' })
    await expect(getTargetRoleSelection(new AbortController().signal))
      .rejects.toMatchObject({ status: 502, code: 'INVALID_RESPONSE' })
  })

  it('sends the prepared idempotency key and expected selection on PUT', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ headerName: 'X-CSRF-TOKEN', token: 'test-token' }))
      .mockResolvedValueOnce(response(VALID_SELECTION))
    vi.stubGlobal('fetch', fetchMock)

    await chooseTargetRole({
      roleId: ROLE_ID,
      expectedCurrentSelectionId: SELECTION_ID,
      idempotencyKey: IDEMPOTENCY_KEY,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/employee/target-role-selection',
      expect.objectContaining({
        method: 'PUT',
        credentials: 'same-origin',
        headers: expect.any(Headers),
        body: JSON.stringify({ roleId: ROLE_ID, expectedCurrentSelectionId: SELECTION_ID }),
      }),
    )
    const headers = fetchMock.mock.calls[1][1].headers
    expect(headers.get('Idempotency-Key')).toBe(IDEMPOTENCY_KEY)
    expect(headers.get('X-CSRF-TOKEN')).toBe('test-token')
  })

  it('preserves public errors and synthesizes malformed error responses', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response({ headerName: 'X-CSRF-TOKEN', token: 'test-token' }))
      .mockResolvedValueOnce(response({ code: 'STALE_SELECTION', message: 'stale' }, 409))
      .mockResolvedValueOnce(new Response('not-json', { status: 503 })))

    await expect(chooseTargetRole({
      roleId: ROLE_ID,
      expectedCurrentSelectionId: null,
      idempotencyKey: IDEMPOTENCY_KEY,
    })).rejects.toMatchObject({ status: 409, code: 'STALE_SELECTION', message: 'stale' })

    await expect(getTargetRoleSelection(new AbortController().signal))
      .rejects.toMatchObject({ status: 503, code: 'REQUEST_FAILED' })
  })
})

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
