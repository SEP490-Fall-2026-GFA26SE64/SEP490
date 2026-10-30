import { afterEach, describe, expect, it, vi } from 'vitest'
import { getStatus, parsePlan, parseStatus, request, SubscriptionApiError } from './subscriptionApi'

const terms = { name: 'Starter', description: 'Description', priceVnd: 4900000, currency: 'VND', durationMonths: 1, employeeSeats: 20 }
describe('Subscription API contracts', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('loads an administrator receipt through the existing owner-authorized order endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ order: null, applicationState: 'NOT_APPLIED', workspace: null })))
    vi.stubGlobal('fetch', fetcher)
    await getStatus('/api/v1/organizations/organization/subscription', 'order')
    expect(fetcher.mock.calls[0][0]).toBe('/api/v1/subscription/orders/order')
  })
  it('retains every commercial field and rejects malformed required values', () => {
    expect(parsePlan({ planId: 'plan', versionId: 'version', code: 'starter', revision: 1, terms }).terms).toEqual(terms)
    expect(() => parsePlan({ planId: 'plan', versionId: 'version', code: 'starter', revision: 1, terms: { ...terms, priceVnd: '4900000' } })).toThrow()
  })
  it('keeps unknown payment fields null and separates payment from readiness', () => {
    const status = parseStatus({ order: { orderId: 'order', terms, paymentStatus: 'PENDING', checkoutUrl: null, createdAt: '2026-10-23T00:00:00Z',
      providerOrderCode: 123456, confirmedAt: null, expiresAt: '2026-10-23T00:30:00Z', failureCode: null, observedPaidAmount: null }, applicationState: 'NOT_APPLIED',
    workspace: { organizationId: null, state: 'NOT_STARTED', failureCode: null } })
    expect(status.order?.observedPaidAmount).toBeNull()
    expect(status.order?.confirmedAt).toBeNull()
    expect(status.order?.providerOrderCode).toBe(123456)
    expect(status.workspace?.organizationId).toBeNull()
    expect(status.applicationState).toBe('NOT_APPLIED')
  })
  it('requires a scoped CSRF request before mutations and surfaces server failure', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ headerName: 'X-CSRF-TOKEN', token: 'fixture' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'CONFLICT', message: 'Review changed terms.' }), { status: 409 }))
    vi.stubGlobal('fetch', fetcher)
    await expect(request('/api/v1/registration/subscription/orders', 'POST', {})).rejects.toBeInstanceOf(SubscriptionApiError)
    expect(fetcher.mock.calls[0][0]).toBe('/api/v1/registration/csrf')
    expect(fetcher.mock.calls[1][1].headers['X-CSRF-TOKEN']).toBe('fixture')
  })
})
