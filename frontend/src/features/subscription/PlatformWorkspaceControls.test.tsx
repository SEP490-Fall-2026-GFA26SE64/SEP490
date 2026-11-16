import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../shared/i18n/LanguageContext'
import { PlatformWorkspaceControls } from './PlatformWorkspaceControls'
import type { Workspace } from './subscriptionApi'

const workspace: Workspace = {
  organizationId: 'org', name: 'Acme Organization', status: 'ACTIVE', setupState: 'READY',
  workspaceSlug: 'acme', industry: 'Data Engineering & Analytics', headcount: '21 - 50 employees', country: 'VN',
  createdAt: '2026-10-20T03:00:00Z',
  subscription: { status: 'ACTIVE', current: {
    name: 'Purchased Starter', startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-12-01T00:00:00Z',
  } },
  administrators: [{ accountId: 'admin', fullName: null, email: 'admin@example.test', active: false, accountActive: true,
    systemAdministrator: true, phone: '+84901234567' }],
}
const clients: QueryClient[] = []
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  clients.push(client)
  render(<QueryClientProvider client={client}><LanguageProvider><MemoryRouter>
    <PlatformWorkspaceControls principal="platform" />
  </MemoryRouter></LanguageProvider></QueryClientProvider>)
}
function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status }) }

describe('Platform provisioned organization directory', () => {
  beforeEach(() => localStorage.setItem('app_language', 'en'))
  afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.unstubAllGlobals() })

  it('shows loading without fabricated organization data', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))
    show()
    expect(screen.getByRole('status').textContent).toContain('Loading')
    expect(screen.queryByRole('group')).toBeNull()
  })

  it('shows an explicit empty directory', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([])))
    show()
    expect(await screen.findByText('No provisioned workspaces.')).toBeTruthy()
  })

  it('surfaces directory failure and allows a deliberate refetch', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json({ message: 'Directory unavailable.' }, 503))
      .mockResolvedValueOnce(json([]))
    vi.stubGlobal('fetch', fetcher)
    show()
    expect(await screen.findByText('Directory unavailable.')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('No provisioned workspaces.')).toBeTruthy()
  })

  it('renders independent status, real purchased period and nullable inactive administrator without edit controls', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([workspace])))
    show()
    const card = await screen.findByRole('row', { name: workspace.name })
    expect(within(card).getByText('Purchased Starter')).toBeTruthy()
    expect(within(card).getByText('Name unavailable')).toBeTruthy()
    expect(within(card).getByText('admin@example.test')).toBeTruthy()
    expect(within(card).getByText('Inactive administrator')).toBeTruthy()
    expect(card.querySelectorAll('time')).toHaveLength(3)
    expect(within(card).getByText('/workspace/acme')).toBeTruthy()
    expect(within(card).getByText('Data & analytics · Vietnam')).toBeTruthy()
    expect(within(card).getByText('+84901234567')).toBeTruthy()
    expect(within(card).getByText('System Administrator')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /edit/i })).toBeNull()
    expect(screen.getByRole('searchbox', { name: 'Search organizations' })).toBeTruthy()
  })

  it('explicitly renders absent subscription and administrator assignments', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([{ ...workspace,
      subscription: { status: 'NONE', current: null }, administrators: [] }])))
    show()
    expect(await screen.findByText('No subscription')).toBeTruthy()
    expect(screen.getByText('No current subscription period.')).toBeTruthy()
    expect(screen.getByText('No administrator assigned.')).toBeTruthy()
  })

  it('shows Not provided for a missing System Administrator phone and counts other administrators without phones', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([{ ...workspace, industry: null, country: null,
      administrators: [{ ...workspace.administrators[0], phone: null },
        { accountId: 'other', fullName: 'Other Admin', email: 'other@example.test', active: true, accountActive: true,
          systemAdministrator: false, phone: null }] }])))
    show()
    const card = await screen.findByRole('row', { name: workspace.name })
    expect(within(card).getByText('Not provided')).toBeTruthy()
    expect(within(card).getByText('+1 more administrator')).toBeTruthy()
    expect(within(card).getByText('Profile details not provided')).toBeTruthy()
    expect(within(card).queryByText('Other Admin')).toBeNull()
  })

  it('accepts legacy directory rows without profile fields', async () => {
    const legacy: Record<string, unknown> = { ...workspace,
      administrators: [{ accountId: 'admin', fullName: 'Legacy', email: 'legacy@example.test', active: true, accountActive: true }] }
    for (const key of ['workspaceSlug', 'industry', 'headcount', 'country', 'createdAt']) delete legacy[key]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([legacy])))
    show()
    const card = await screen.findByRole('row', { name: workspace.name })
    expect(within(card).getByText('Legacy')).toBeTruthy()
    expect(within(card).queryByText('System Administrator')).toBeNull()
  })

  it('opens full organization details and routes the action through the existing confirmation', async () => {
    const fetcher = vi.fn().mockResolvedValue(json([{ ...workspace, administrators: [...workspace.administrators,
      { accountId: 'other', fullName: 'Other Admin', email: 'other@example.test', active: true, accountActive: true,
        systemAdministrator: false, phone: null }] }]))
    vi.stubGlobal('fetch', fetcher)
    show()
    await userEvent.click(await screen.findByRole('button', { name: 'View details' }))
    const dialog = screen.getByRole('dialog', { name: 'Organization details' })
    expect(within(dialog).getByText('org')).toBeTruthy()
    expect(within(dialog).getByText('Data & analytics')).toBeTruthy()
    expect(within(dialog).getByText('21 - 50 employees')).toBeTruthy()
    expect(within(dialog).getByText('Vietnam')).toBeTruthy()
    expect(within(dialog).getByText('+84901234567')).toBeTruthy()
    expect(within(dialog).getByText('Other Admin')).toBeTruthy()
    expect(within(dialog).getAllByText('+84901234567')).toHaveLength(1)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Suspend workspace' }))
    expect(screen.queryByRole('dialog', { name: 'Organization details' })).toBeNull()
    expect(screen.getByRole('dialog', { name: 'Confirm workspace suspension' })).toBeTruthy()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('searches workspace slug and System Administrator phone', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([workspace, { ...workspace, organizationId: 'other', name: 'Beta',
      workspaceSlug: 'beta', administrators: [] }])))
    show()
    await screen.findByRole('row', { name: workspace.name })
    const search = screen.getByRole('searchbox', { name: 'Search organizations' })
    await userEvent.type(search, '84901234')
    expect(screen.getByRole('row', { name: workspace.name })).toBeTruthy()
    expect(screen.queryByRole('row', { name: 'Beta' })).toBeNull()
    await userEvent.clear(search)
    await userEvent.type(search, 'BETA')
    expect(screen.getByRole('row', { name: 'Beta' })).toBeTruthy()
    expect(screen.queryByRole('row', { name: workspace.name })).toBeNull()
  })

  it('searches real organization and administrator fields and distinguishes no matches from an empty directory', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([workspace])))
    show()
    await screen.findByRole('row', { name: workspace.name })
    const search = screen.getByRole('searchbox', { name: 'Search organizations' })
    await userEvent.type(search, 'ADMIN@EXAMPLE.TEST')
    expect(screen.getByRole('row', { name: workspace.name })).toBeTruthy()
    await userEvent.clear(search)
    await userEvent.type(search, 'missing')
    expect(screen.getByText('No organizations match your search or filter.')).toBeTruthy()
    expect(screen.queryByText('No provisioned workspaces.')).toBeNull()
    await userEvent.clear(search)
    expect(screen.getByRole('row', { name: workspace.name })).toBeTruthy()
  })

  it('paginates and resets the page when filtering without changing global API-derived metrics', async () => {
    const rows = Array.from({ length: 11 }, (_, i) => ({
      ...workspace, organizationId: `org-${i}`, name: `Organization ${i}`,
      status: i === 10 ? 'SUSPENDED' : 'ACTIVE',
      subscription: { status: 'NONE', current: null },
    }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(rows)))
    show()
    await screen.findByRole('row', { name: 'Organization 0' })
    expect(screen.queryByRole('row', { name: 'Organization 10' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByRole('row', { name: 'Organization 10' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Active' }))
    expect(screen.getByRole('row', { name: 'Organization 0' })).toBeTruthy()
    expect(screen.queryByRole('row', { name: 'Organization 10' })).toBeNull()
    const stats = screen.getByRole('region', { name: 'Organization overview' })
    expect(within(stats).getByText('11')).toBeTruthy()
    expect(within(stats).getByText('10')).toBeTruthy()
    expect(within(stats).getByText('1')).toBeTruthy()
    expect(within(stats).getByText('0')).toBeTruthy()
  })

  it('clamps pagination when a confirmed action removes the final filtered row', async () => {
    const rows = Array.from({ length: 11 }, (_, i) => ({
      ...workspace, organizationId: `org-${i}`, name: `Organization ${i}`,
    }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(rows))
      .mockResolvedValueOnce(json({ headerName: 'X-CSRF-TOKEN', token: 'test-token' }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(json(rows.map((row, i) => ({ ...row, status: i === 10 ? 'SUSPENDED' : 'ACTIVE' })))))
    show()
    await screen.findByRole('row', { name: 'Organization 0' })
    await userEvent.click(screen.getByRole('button', { name: 'Active' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    await userEvent.click(screen.getByRole('button', { name: 'Suspend workspace' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm suspension' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('row', { name: 'Organization 0' })).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('cancels a named suspension confirmation without any mutation', async () => {
    const fetcher = vi.fn().mockResolvedValue(json([workspace]))
    vi.stubGlobal('fetch', fetcher)
    show()
    await userEvent.click(await screen.findByRole('button', { name: 'Suspend workspace' }))
    const dialog = screen.getByRole('dialog', { name: 'Confirm workspace suspension' })
    expect(within(dialog).getByText(workspace.name)).toBeTruthy()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('confirms with CSRF, prevents duplicate pending actions and refetches persisted status', async () => {
    let finish: ((response: Response) => void) | undefined
    const fetcher = vi.fn().mockResolvedValueOnce(json([workspace]))
      .mockResolvedValueOnce(json({ headerName: 'X-CSRF-TOKEN', token: 'test-token' }))
      .mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve }))
      .mockResolvedValueOnce(json([{ ...workspace, status: 'SUSPENDED' }]))
    vi.stubGlobal('fetch', fetcher)
    show()
    await userEvent.click(await screen.findByRole('button', { name: 'Suspend workspace' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm suspension' }))
    expect((await screen.findByRole('button', { name: 'Saving…' }) as HTMLButtonElement).disabled).toBe(true)
    await waitFor(() => expect(finish).toBeDefined())
    finish?.(new Response(null, { status: 200 }))
    expect(await screen.findByRole('button', { name: 'Reactivate' })).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(fetcher.mock.calls[2][0]).toBe('/api/v1/platform/workspaces/org/suspension')
    expect(fetcher.mock.calls[2][1].body).toBe('{"suspended":true}')
    expect(fetcher.mock.calls[2][1].headers['X-CSRF-TOKEN']).toBe('test-token')
    expect(screen.getByText('Purchased Starter')).toBeTruthy()
  })

  it('retains a failed reactivation dialog for retry without showing false success', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json([{ ...workspace, status: 'SUSPENDED' }]))
      .mockResolvedValueOnce(json({ headerName: 'X-CSRF-TOKEN', token: 'test-token' }))
      .mockResolvedValueOnce(json({ message: 'Storage unavailable.' }, 503))
    vi.stubGlobal('fetch', fetcher)
    show()
    await userEvent.click(await screen.findByRole('button', { name: 'Reactivate' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm reactivation' }))
    expect(await screen.findByText('Storage unavailable.')).toBeTruthy()
    expect(screen.getByRole('dialog', { name: 'Confirm workspace reactivation' })).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Confirm reactivation' }) as HTMLButtonElement).disabled).toBe(false)
    expect(fetcher).toHaveBeenCalledTimes(3)
  })
})
