import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  confirmRegistrationTotp, getRegistration, RegistrationApiError, registerOrganization,
  signOutRegistration,
} from './registrationApi'

const pending = {
  registrationId: null, stage: 'VERIFY_EMAIL', email: 'owner@example.test', fields: null,
  deliveryStatus: 'PENDING', resendAvailableAt: '2026-10-21T08:01:00Z',
  emailVerifiedAt: null, completedAt: null,
}

function response(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => vi.unstubAllGlobals())

describe('registration API', () => {
  it('gets fresh CSRF proof and preserves optional nulls without client verification flags', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response({ headerName: 'X-CSRF-TOKEN', token: 'test-token' }))
      .mockResolvedValueOnce(response(pending, 201))
    vi.stubGlobal('fetch', fetch)
    const input = {
      organizationName: 'Acme', subdomain: null, industry: null, headcount: null,
      adminName: 'Owner', adminEmail: 'owner@example.test', password: 'long password',
    }
    expect(await registerOrganization(input)).toEqual(pending)
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/v1/registration', expect.objectContaining({
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'test-token' },
      body: JSON.stringify(input),
    }))
  })

  it('treats only current-session 401 as signed out, not dependency failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({}, 401))
      .mockResolvedValueOnce(response({ code: 'SERVICE_UNAVAILABLE', message: 'Mail unavailable' }, 503)))
    expect(await getRegistration()).toBeNull()
    await expect(getRegistration()).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE', status: 503 })
  })

  it('rejects success-shaped malformed states and missing optional fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({ ...pending, stage: 'READY' }))
      .mockResolvedValueOnce(response({ ...pending, stage: 'COMPLETE' })))
    await expect(getRegistration()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
    await expect(getRegistration()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  })

  it('requires exactly ten unique recovery codes', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response({ headerName: 'X-CSRF-TOKEN', token: 'test' }))
      .mockResolvedValueOnce(response({ registration: pending, recoveryCodes: ['a'.repeat(32)] })))
    await expect(confirmRegistrationTotp('123456')).rejects.toBeInstanceOf(RegistrationApiError)
  })

  it('propagates field errors and retry thresholds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({
      code: 'RATE_LIMITED', message: 'Wait before retrying', retryAfterSeconds: 60, field: 'adminEmail',
    }, 429)))
    await expect(getRegistration()).rejects.toMatchObject({ retryAfterSeconds: 60, field: 'adminEmail', status: 429 })
  })

  it('accepts sign-out 204 but rejects HTML responses', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response({ headerName: 'X-CSRF-TOKEN', token: 'test' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response('<html>error</html>', { status: 502 })))
    await expect(signOutRegistration()).resolves.toBeUndefined()
    await expect(getRegistration()).rejects.toMatchObject({ code: 'REQUEST_FAILED', status: 502 })
  })
})
