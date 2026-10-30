import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import * as api from '../../../shared/api/initialPathway'
import { en } from '../../../shared/i18n/translations/en'
import { ExpertPathwayReviewPage } from './ExpertPathwayReviewPage'
import { reviewFixture } from './reviewTestFixtures'
const session = vi.hoisted(() => ({ role: 'DOMAIN_EXPERT' }))
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en', t: (key: string) => key.split('.').reduce<unknown>((v, k) => (v as Record<string, unknown>)?.[k], en) ?? key }) }))
vi.mock('../../../shared/hooks/useInitialPathwaySession', () => ({ useInitialPathwaySession: () => ({ scope: 'ORG-A:expert-a:' + session.role, data: { role: session.role }, refetch: vi.fn() }) }))
vi.mock('../../../shared/layouts/WorkspaceLayout', () => ({ WorkspaceLayout: ({ children }: { children: ReactNode }) => <main>{children}</main> }))
vi.mock('../../../shared/api/initialPathway', async original => ({ ...await original<typeof api>(), readReviewQueue: vi.fn(), readReviewDetail: vi.fn() }))
beforeEach(() => { session.role = 'DOMAIN_EXPERT'; vi.mocked(api.readReviewQueue).mockResolvedValue([]); vi.mocked(api.readReviewDetail).mockResolvedValue(reviewFixture()) })
afterEach(() => { cleanup(); vi.resetAllMocks() })
function mount() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><ExpertPathwayReviewPage /></MemoryRouter></QueryClientProvider>) }
it('R01 unassigned empty queue reads no detail and shows empty state without fabricated rows', async () => {
  mount(); await waitFor(() => expect(api.readReviewQueue).toHaveBeenCalledTimes(1))
  await screen.findByRole('table')
  expect(screen.getAllByRole('row')).toHaveLength(2); expect(screen.queryByRole('link', { name: 'Review' })).toBeNull()
  expect(api.readReviewDetail).not.toHaveBeenCalled()
})
it('R01 wrong actor cannot issue queue or detail reads', async () => {
  session.role = 'EMPLOYEE'; mount()
  expect(api.readReviewQueue).not.toHaveBeenCalled(); expect(api.readReviewDetail).not.toHaveBeenCalled()
  expect(screen.queryByRole('table')).toBeNull()
})
it('R02 local search never invents server-side filters and preserves assigned row target', async () => {
  vi.mocked(api.readReviewQueue).mockResolvedValue([reviewFixture().summary]); mount()
  const link = await screen.findByRole('link', { name: 'Review' })
  expect(link.getAttribute('href')).toBe('/expert/pathway-review/' + reviewFixture().summary.id)
  const search = screen.getByRole('textbox')
  await userEvent.type(search, 'unmatched-other-tenant')
  expect(screen.queryByRole('link', { name: 'Review' })).toBeNull()
  expect(api.readReviewQueue).toHaveBeenCalledTimes(1)
  await userEvent.clear(search); expect(await screen.findByRole('link', { name: 'Review' })).toBeTruthy()
})
it('R02 dependency detail outage retains authorized queue row with unavailable metrics', async () => {
  vi.mocked(api.readReviewQueue).mockResolvedValue([reviewFixture().summary]); vi.mocked(api.readReviewDetail).mockRejectedValue(new api.PathwayError('DEPENDENCY_UNAVAILABLE', 503))
  mount(); const table = await screen.findByRole('table'); await waitFor(() => expect(api.readReviewDetail).toHaveBeenCalledTimes(1))
  expect(within(table).getByRole('link', { name: 'Review' })).toBeTruthy()
  expect(within(table).getAllByText('—').length).toBeGreaterThan(0)
})
it('R01 queue outage is distinct from a successful empty queue and renders no table', async () => {
  vi.mocked(api.readReviewQueue).mockRejectedValue(new api.PathwayError('DEPENDENCY_UNAVAILABLE', 503)); mount()
  await screen.findByRole('button', { name: 'Retry' })
  expect(screen.queryByRole('table')).toBeNull(); expect(api.readReviewDetail).not.toHaveBeenCalled()
})
it('R01 paging requests the next bounded offset and can return to the assigned page', async () => {
  const items = Array.from({ length: 20 }, (_, index) => ({ ...reviewFixture().summary, id: '00000000-0000-0000-0000-' + String(index + 1).padStart(12, '0') }))
  vi.mocked(api.readReviewQueue).mockImplementation(async offset => offset === 0 ? items : [])
  mount(); await waitFor(() => expect(screen.getAllByRole('link', { name: 'Review' })).toHaveLength(20))
  expect((screen.getByRole('button', { name: 'Previous' }) as HTMLButtonElement).disabled).toBe(true)
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
  await waitFor(() => expect(vi.mocked(api.readReviewQueue).mock.calls.map(([offset]) => offset)).toContain(20))
  await waitFor(() => expect(screen.queryAllByRole('link', { name: 'Review' })).toHaveLength(0))
  expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(true)
  await userEvent.click(screen.getByRole('button', { name: 'Previous' }))
  await waitFor(() => expect(screen.getAllByRole('link', { name: 'Review' })).toHaveLength(20))
  expect(vi.mocked(api.readReviewQueue).mock.calls.every(([offset]) => offset === 0 || offset === 20)).toBe(true)
})
