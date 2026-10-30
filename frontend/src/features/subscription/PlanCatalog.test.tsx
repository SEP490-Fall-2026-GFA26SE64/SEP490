import { cleanup, render, screen } from '@testing-library/react'
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
})
