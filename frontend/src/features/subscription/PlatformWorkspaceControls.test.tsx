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
  subscription: { status: 'ACTIVE', current: {
    name: 'Purchased Starter', startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-12-01T00:00:00Z',
  } },
  administrators: [{ accountId: 'admin', fullName: null, email: 'admin@example.test', active: false, accountActive: true }],
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
    const card = await screen.findByRole('group', { name: workspace.name })
    expect(within(card).getByText('Purchased Starter')).toBeTruthy()
    expect(within(card).getByText('Name unavailable')).toBeTruthy()
    expect(within(card).getByText('admin@example.test')).toBeTruthy()
    expect(within(card).getByText('Inactive administrator')).toBeTruthy()
    expect(card.querySelectorAll('time')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /edit/i })).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('explicitly renders absent subscription and administrator assignments', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([{ ...workspace,
      subscription: { status: 'NONE', current: null }, administrators: [] }])))
    show()
    expect(await screen.findByText('No subscription')).toBeTruthy()
    expect(screen.getByText('No current subscription period.')).toBeTruthy()
    expect(screen.getByText('No administrator assigned.')).toBeTruthy()
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
