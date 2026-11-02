import { useState } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../shared/i18n/LanguageContext'
import { WorkspaceSlugContext } from '../../shared/auth/workspacePaths'
import { WorkspaceBoundary } from './WorkspaceBoundary'
import { getIdentity, request } from './subscriptionApi'

const expert = { accountId: 'expert', organizationId: 'org', roles: ['DOMAIN_EXPERT'], stage: 'COMPLETE', email: 'expert@example.test', fullName: 'Expert', workspaceSlug: 'acme' }
vi.mock('./subscriptionApi', () => ({
  getIdentity: vi.fn(),
  getSummary: vi.fn(), request: vi.fn(async () => ({})),
}))
const replace = vi.fn()
beforeEach(() => {
  vi.mocked(getIdentity).mockResolvedValue(expert as never)
  vi.mocked(request).mockClear()
  replace.mockClear()
  vi.stubGlobal('location', { ...window.location, replace })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
function Editor() {
  const [value, setValue] = useState('')
  return <input aria-label="Draft title" value={value} onChange={event => setValue(event.target.value)} />
}
function show(path: string, slug: string | null, client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  render(<QueryClientProvider client={client}><LanguageProvider><WorkspaceSlugContext.Provider value={slug}>
    <MemoryRouter initialEntries={[path]}><WorkspaceBoundary><Editor /></WorkspaceBoundary></MemoryRouter>
  </WorkspaceSlugContext.Provider></LanguageProvider></QueryClientProvider>)
  return client
}
it('preserves an in-progress editor when trusted identity and entitlement are revalidated', async () => {
  const client = show('/expert/modules', 'acme')
  await userEvent.setup().type(await screen.findByLabelText('Draft title'), 'Unsaved draft')
  await act(async () => { await client.refetchQueries({ queryKey: ['workspace-identity'] }); await client.refetchQueries({ queryKey: ['workspace-entitlement'] }) })
  expect(screen.getByLabelText('Draft title')).toHaveProperty('value', 'Unsaved draft')
  client.clear()
})
it('reports another organization workspace as not found without requesting its tenant data', async () => {
  show('/expert/modules', 'other-org')
  expect(await screen.findByText('Workspace not found')).toBeTruthy()
  expect(screen.queryByLabelText('Draft title')).toBeNull()
  expect(screen.getByRole('link', { name: 'Go to your workspace' }).getAttribute('href')).toBe('/workspace/acme/expert/target-roles')
  expect(request).not.toHaveBeenCalled()
})
it('redirects a legacy organization path to the member workspace preserving query and hash', async () => {
  show('/expert/modules?tab=draft#top', null)
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/workspace/acme/expert/modules?tab=draft#top'))
  expect(screen.queryByLabelText('Draft title')).toBeNull()
})
it('sends a signed-out deep link to sign-in with a same-workspace return path', async () => {
  vi.mocked(getIdentity).mockResolvedValue(null as never)
  show('/expert/modules?tab=draft', 'acme')
  await waitFor(() => expect(replace).toHaveBeenCalledWith(`/login?next=${encodeURIComponent('/workspace/acme/expert/modules?tab=draft')}`))
  expect(request).not.toHaveBeenCalled()
})
it('denies a role-mismatched area inside the own workspace', async () => {
  show('/admin/users', 'acme')
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(screen.queryByLabelText('Draft title')).toBeNull()
})
it('keeps the shared system status page inside the member workspace', async () => {
  show('/system-status?portal=expert', 'acme')
  expect(await screen.findByLabelText('Draft title')).toBeTruthy()
  expect(replace).not.toHaveBeenCalled()
})
