import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../shared/i18n/LanguageContext'
import { PaymentStatusPanel } from './PaymentStatusPanel'
import { enterWorkspace, type Status } from './subscriptionApi'

vi.mock('./subscriptionApi', async importOriginal => ({
  ...await importOriginal<typeof import('./subscriptionApi')>(),
  enterWorkspace: vi.fn(),
}))

const pending: Status = { order: { orderId: 'order', terms: { name: 'Starter', description: 'Description', priceVnd: 4900000, currency: 'VND', durationMonths: 1, employeeSeats: 20 },
  paymentStatus: 'PAID', checkoutUrl: null, providerOrderCode: 123456, confirmedAt: '2026-10-23T00:10:00Z', observedPaidAmount: 4900000, failureCode: null, createdAt: '2026-10-23T00:00:00Z', expiresAt: '2026-10-23T00:30:00Z' },
applicationState: 'NOT_APPLIED', workspace: { organizationId: null, state: 'NOT_STARTED', failureCode: null } }
describe('Truthful payment status', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })
  function show(status: Status) {
    render(<QueryClientProvider client={new QueryClient()}><LanguageProvider><MemoryRouter>
      <PaymentStatusPanel status={status} guest principal="owner" base="/api/v1/registration/subscription" refresh={() => {}} />
    </MemoryRouter></LanguageProvider></QueryClientProvider>)
  }
  it('paid does not imply active or workspace-ready', () => {
    show(pending)
    expect(screen.getByText('Payment confirmed')).toBeTruthy()
    expect(screen.getByText('Not activated')).toBeTruthy()
    expect(screen.getByText('Workspace not ready')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Enter workspace' })).toBeNull()
    expect(screen.getByText('123456')).toBeTruthy()
    expect(screen.getByText('System confirmation time')).toBeTruthy()
  })
  it('offers workspace handoff only after committed activation and readiness', () => {
    show({ ...pending, applicationState: 'APPLIED', workspace: { organizationId: 'organization', state: 'READY', failureCode: null } })
    expect(screen.getByRole('button', { name: 'Enter workspace' })).toBeTruthy()
  })
  it('labels development bypass without implying money was received or offering checkout', () => {
    show({ ...pending, order: { ...pending.order!, paymentStatus: 'DEV_BYPASSED',
      observedPaidAmount: null, confirmedAt: null }, applicationState: 'APPLIED',
      workspace: { organizationId: 'organization', state: 'READY', failureCode: null } })
    expect(screen.getByText('Development payment bypass')).toBeTruthy()
    expect(screen.getByText('Development bypass (not paid)')).toBeTruthy()
    expect(screen.getByText('No payment received')).toBeTruthy()
    expect(screen.queryByText('Payment confirmed')).toBeNull()
    expect(screen.queryByText('Thank you for your payment')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Open payOS checkout' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reconcile payment' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Enter workspace' })).toBeTruthy()
  })
  it('enters the provisioned workspace under its slug URL', async () => {
    vi.mocked(enterWorkspace).mockResolvedValue({ accountId: 'owner', organizationId: 'organization', email: 'owner@example.test',
      fullName: 'Owner', roles: ['ORGANIZATION_ADMINISTRATOR'], stage: 'COMPLETE', workspaceReady: true, workspaceSlug: 'acme-learning' } as never)
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    show({ ...pending, applicationState: 'APPLIED', workspace: { organizationId: 'organization', state: 'READY', failureCode: null } })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Enter workspace' }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/workspace/acme-learning/admin/subscription'))
  })
})