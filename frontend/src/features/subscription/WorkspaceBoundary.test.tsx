import { useState } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../shared/i18n/LanguageContext'
import { WorkspaceBoundary } from './WorkspaceBoundary'

vi.mock('./subscriptionApi', () => ({
  getIdentity: vi.fn(async () => ({ accountId: 'expert', organizationId: 'org', roles: ['DOMAIN_EXPERT'], stage: 'COMPLETE', email: 'expert@example.test', fullName: 'Expert' })),
  getSummary: vi.fn(), request: vi.fn(async () => ({})),
}))
afterEach(cleanup)
function Editor() {
  const [value, setValue] = useState('')
  return <input aria-label="Draft title" value={value} onChange={event => setValue(event.target.value)} />
}
it('preserves an in-progress editor when trusted identity and entitlement are revalidated', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><LanguageProvider><MemoryRouter initialEntries={['/expert/modules']}>
    <WorkspaceBoundary><Editor /></WorkspaceBoundary>
  </MemoryRouter></LanguageProvider></QueryClientProvider>)
  await userEvent.setup().type(await screen.findByLabelText('Draft title'), 'Unsaved draft')
  await act(async () => { await client.refetchQueries({ queryKey: ['workspace-identity'] }); await client.refetchQueries({ queryKey: ['workspace-entitlement'] }) })
  expect(screen.getByLabelText('Draft title')).toHaveProperty('value', 'Unsaved draft')
  client.clear()
})
