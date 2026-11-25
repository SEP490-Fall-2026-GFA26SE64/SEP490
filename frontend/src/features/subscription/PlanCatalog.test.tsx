import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../shared/i18n/LanguageContext'
import { PlanCatalog } from './PlanCatalog'

function show() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <LanguageProvider><MemoryRouter><PlanCatalog base="/api/v1/registration/subscription" principal="test" /></MemoryRouter></LanguageProvider>
  </QueryClientProvider>)
}
describe('Plan catalog state handling', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })
  it('shows loading instead of fabricated plan data', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))
    show()
    expect(screen.getByRole('status').textContent).toContain('Loading')
    expect(screen.queryByText('Starter')).toBeNull()
  })
  it('shows an explicit empty catalog', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('[]')))
    show()
    expect(await screen.findByText('No plans are available. Contact the platform administrator.')).toBeTruthy()
  })
  it('surfaces provider/storage unavailability without a demo fallback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'SERVICE_UNAVAILABLE', message: 'Storage unavailable.' }), { status: 503 })))
    show()
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText('Storage unavailable.')).toBeTruthy()
    expect(screen.queryByText('Starter')).toBeNull()
  })
  it('adds kept additional seats to a same-plan renewal and resets them for another plan', async () => {
    const plan = (planId: string, name: string) => ({ planId, versionId: `${planId}-v`, code: planId, revision: 1,
      terms: { name, description: '', priceVnd: 4900, currency: 'VND', durationMonths: 1, employeeSeats: 20 } })
    const bodies: unknown[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/plans')) return new Response(JSON.stringify([plan('same', 'Starter'), plan('other', 'Growth')]))
      if (url.endsWith('/csrf')) return new Response(JSON.stringify({ headerName: 'X-CSRF', token: 't' }))
      bodies.push(JSON.parse(String(init?.body)))
      return new Response(JSON.stringify({ order: null, applicationState: 'NOT_APPLIED', workspace: null }), { status: 409 })
    }))
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <LanguageProvider><MemoryRouter><PlanCatalog base="/api/v1/organizations/o/subscription" principal="test" addon={{ planId: 'same', seats: 3 }} /></MemoryRouter></LanguageProvider>
    </QueryClientProvider>)
    await userEvent.click(await screen.findByRole('button', { name: 'Select Starter' }))
    const line = screen.getByTestId('renewal-addon').textContent
    expect(line).toContain('+3 additional seat(s)')
    expect(line).toContain((735).toLocaleString('vi-VN'))
    expect(line).toContain((5635).toLocaleString('vi-VN'))
    await userEvent.click(screen.getByRole('button', { name: 'Create payment order' }))
    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).toMatchObject({ planId: 'same', expectedAddonSeats: 3 })
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: 'Select Growth' }))
    expect(screen.queryByTestId('renewal-addon')).toBeNull()
    expect(screen.getByText('Changing plan resets your 3 additional seat(s) to 0.')).toBeTruthy()
  })
})
