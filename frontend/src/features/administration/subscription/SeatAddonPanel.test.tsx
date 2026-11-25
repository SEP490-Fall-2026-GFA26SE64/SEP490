import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../../shared/i18n/LanguageContext'
import { changeAddonSeats, createSeatAddonOrder, getSeatAddonQuote, parseStatus, type Summary } from '../../subscription/subscriptionApi'
import { SeatAddonPanel } from './SeatAddonPanel'

function Probe() {
  const location = useLocation()
  return <p data-testid="location">{location.pathname + location.search}</p>
}

vi.mock('../../subscription/subscriptionApi', async importOriginal => ({
  ...await importOriginal<typeof import('../../subscription/subscriptionApi')>(),
  getSeatAddonQuote: vi.fn(), createSeatAddonOrder: vi.fn(), changeAddonSeats: vi.fn(),
}))

const terms = { name: 'Starter', description: '', priceVnd: 4900, currency: 'VND', durationMonths: 1, employeeSeats: 20 }
const period = (addonSeats: number, startsAt = '2026-11-01T00:00:00Z') =>
  ({ periodId: `p-${startsAt}`, startsAt, endsAt: '2026-12-01T00:00:00Z', terms, planId: 'plan', addonSeats, totalSeats: 20 + addonSeats })
function summary(overrides: Partial<Summary> = {}): Summary {
  return { organizationId: 'org', organizationName: 'Org', workspaceStatus: 'ACTIVE', subscriptionStatus: 'ACTIVE', current: period(3), scheduled: null,
    usedSeats: 5, allocatedSeats: 23, admissionLimit: 23, paymentHistory: [], desiredAddonSeats: 3, scheduledShortfall: 0, renewalPlanId: 'plan',
    seatChangeBlocked: false, ...overrides }
}
function show(value: Summary, refresh = vi.fn()) {
  render(<QueryClientProvider client={new QueryClient()}><LanguageProvider><MemoryRouter>
    <SeatAddonPanel summary={value} organization="org" refresh={refresh} />
  </MemoryRouter></LanguageProvider></QueryClientProvider>)
  return refresh
}
const quote = { target: 'CURRENT' as const, kind: 'INCREASE', periodId: 'p', planName: 'Starter', startsAt: '2026-11-01T00:00:00Z',
  endsAt: '2026-12-01T00:00:00Z', seats: 2, perSeatVnd: 245, amountVnd: 300 }

describe('Seat add-on panel', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('shows the plan, additional and total seats of the current period', () => {
    show(summary())
    const figures = screen.getByLabelText('Current period seats').textContent
    expect(figures).toContain('Included in plan20')
    expect(figures).toContain('Additional seats3')
    expect(figures).toContain('Total this period23')
  })

  it('quotes then orders the requested seats and refreshes when no checkout is needed', async () => {
    vi.mocked(getSeatAddonQuote).mockResolvedValue(quote)
    vi.mocked(createSeatAddonOrder).mockResolvedValue({ order: null, applicationState: 'APPLIED', workspace: null })
    const refresh = show(summary())
    await userEvent.click(screen.getByRole('button', { name: 'Buy extra seats' }))
    const input = screen.getByRole('spinbutton')
    await userEvent.clear(input); await userEvent.type(input, '51')
    expect(screen.getByRole('alert').textContent).toContain('1 to 50')
    expect((screen.getByRole('button', { name: 'Calculate price' }) as HTMLButtonElement).disabled).toBe(true)
    await userEvent.clear(input); await userEvent.type(input, '2')
    await userEvent.click(screen.getByRole('button', { name: 'Calculate price' }))
    expect(getSeatAddonQuote).toHaveBeenCalledWith('org', 'CURRENT', 2)
    expect((await screen.findByTestId('seat-addon-quote')).textContent).toContain('300')
    await userEvent.click(screen.getByRole('button', { name: 'Create payment order' }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(vi.mocked(createSeatAddonOrder).mock.calls[0].slice(0, 2)).toEqual(['org', quote])
  })

  it('opens the payment result for a pending order before its checkout link is attached', async () => {
    vi.mocked(getSeatAddonQuote).mockResolvedValue(quote)
    vi.mocked(createSeatAddonOrder).mockResolvedValue(parseStatus({ applicationState: 'PENDING', workspace: null,
      order: { orderId: 'o-1', terms, paymentStatus: 'PENDING', checkoutUrl: null, createdAt: '2026-11-01T00:00:00Z', expiresAt: '2026-11-01T00:30:00Z',
        providerOrderCode: 1, confirmedAt: null, observedPaidAmount: null, failureCode: null, kind: 'SEAT_ADDON', addonSeats: 2, addonAmountVnd: 300, seatAddonKind: 'INCREASE' } }))
    const refresh = vi.fn()
    render(<QueryClientProvider client={new QueryClient()}><LanguageProvider><MemoryRouter initialEntries={['/admin/subscription']}>
      <Routes>
        <Route path="/admin/subscription" element={<SeatAddonPanel summary={summary()} organization="org" refresh={refresh} />} />
        <Route path="/admin/subscription/payment-result" element={<Probe />} />
      </Routes>
    </MemoryRouter></LanguageProvider></QueryClientProvider>)
    await userEvent.click(screen.getByRole('button', { name: 'Buy extra seats' }))
    await userEvent.click(screen.getByRole('button', { name: 'Calculate price' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Create payment order' }))
    expect((await screen.findByTestId('location')).textContent).toBe('/admin/subscription/payment-result?order=o-1')
    expect(refresh).not.toHaveBeenCalled()
  })

  it('offers the scheduled-period shortfall with a fixed quantity', async () => {
    vi.mocked(getSeatAddonQuote).mockResolvedValue({ ...quote, target: 'SCHEDULED', kind: 'SHORTFALL' })
    show(summary({ scheduled: period(1, '2026-12-01T00:00:00Z'), scheduledShortfall: 2 }))
    expect(screen.getByRole('status').textContent).toContain('missing 2 additional seat(s)')
    await userEvent.click(screen.getByRole('button', { name: 'Pay for the scheduled period' }))
    expect((screen.getByRole('spinbutton') as HTMLInputElement).disabled).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'Calculate price' }))
    expect(getSeatAddonQuote).toHaveBeenCalledWith('org', 'SCHEDULED', 2)
  })

  it('disables seat changes while a payment is unresolved', () => {
    show(summary({ seatChangeBlocked: true }))
    expect((screen.getByRole('button', { name: 'Buy extra seats' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Reduce at renewal' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/Seat changes are unavailable while a renewal/)).toBeTruthy()
  })

  it('saves a lower renewal add-on with the expected current value', async () => {
    vi.mocked(changeAddonSeats).mockResolvedValue(1)
    const refresh = show(summary())
    await userEvent.click(screen.getByRole('button', { name: 'Reduce at renewal' }))
    const input = screen.getByRole('spinbutton')
    await userEvent.clear(input); await userEvent.type(input, '3')
    expect((screen.getByRole('button', { name: 'Save reduction' }) as HTMLButtonElement).disabled).toBe(true)
    await userEvent.clear(input); await userEvent.type(input, '1')
    await userEvent.click(screen.getByRole('button', { name: 'Save reduction' }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(changeAddonSeats).toHaveBeenCalledWith('org', 1, 3)
  })
})
