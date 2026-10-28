import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { LanguageProvider } from '../../shared/i18n/LanguageContext'
import { PaymentStatusPanel } from './PaymentStatusPanel'
import type { Status } from './subscriptionApi'

const pending: Status = { order: { orderId: 'order', terms: { name: 'Starter', description: 'Description', priceVnd: 4900000, currency: 'VND', durationMonths: 1, employeeSeats: 20 },
  paymentStatus: 'PAID', checkoutUrl: null, providerOrderCode: 123456, confirmedAt: '2026-10-23T00:10:00Z', observedPaidAmount: 4900000, failureCode: null, createdAt: '2026-10-23T00:00:00Z', expiresAt: '2026-10-23T00:30:00Z' },
applicationState: 'NOT_APPLIED', workspace: { organizationId: null, state: 'NOT_STARTED', failureCode: null } }
describe('Truthful payment status', () => {
  afterEach(cleanup)
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
})
