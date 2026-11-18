import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { MySkillsPage } from './MySkillsPage'
import { readKnowledgeProfile, type KnowledgeEntry, type KnowledgePage } from './knowledgeProfileApi'
import { RoleFlowError } from '../target-roles/currentRoleFlowApi'
import { WorkspaceSessionContext, type WorkspaceLayoutIdentity } from '../../../shared/auth/workspaceSession'
vi.mock('../../../shared/layouts/WorkspaceLayout', () => ({ WorkspaceLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
vi.mock('./knowledgeProfileApi', () => ({ readKnowledgeProfile: vi.fn() }))
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en', t: (key: string) => ({ 'knowledgeLevel.FOUNDATION': 'Foundation', 'knowledgeLevel.INTERMEDIATE': 'Intermediate', 'knowledgeLevel.ADVANCED': 'Advanced' }[key] ?? key) }) }))
const row = (changes: Partial<KnowledgeEntry> = {}): KnowledgeEntry => ({ kind: 'EVIDENCE', id: 'e1', skillId: 'java', skillName: 'Java', skillVersion: 'v1', knowledgeLevel: 'FOUNDATION', outcomeCodes: [], observedAt: '2026-11-17T00:00:00Z', purpose: null, attemptId: null, correctCount: null, totalCount: null, passed: null, mandatorySatisfied: null, vetoTriggered: null, reasons: [], sourceKind: 'MODULE_ASSESSMENT', sourceId: 's1', reviewState: null, ...changes })
const page = (items: KnowledgeEntry[], page = 0, hasMore = false): KnowledgePage => ({ items, page, pageSize: 20, hasMore })
const actor: WorkspaceLayoutIdentity = { accountId: 'employee', organizationId: 'org', fullName: 'Employee', email: 'employee@example.test', organizationName: 'Org', roles: ['EMPLOYEE'] }
function mount(identity = actor) { const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); const view = (user: WorkspaceLayoutIdentity) => <QueryClientProvider client={client}><MemoryRouter><WorkspaceSessionContext.Provider value={{ identity: user, onSignOut: async () => {} }}><MySkillsPage /></WorkspaceSessionContext.Provider></MemoryRouter></QueryClientProvider>; const rendered = render(view(identity)); return { ...rendered, changeActor: (user: WorkspaceLayoutIdentity) => rendered.rerender(view(user)) } }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(readKnowledgeProfile).mockResolvedValue(page([])) })
afterEach(cleanup)
it('loads all pages and deduplicates achievements from different module contexts', async () => {
  vi.mocked(readKnowledgeProfile).mockImplementation(async p => p === 0 ? page([row()], 0, true) : page([row(), row({ id: 'e2', sourceId: 'independent-module', attemptId: 'independent-attempt' }), row({ id: 'diag', kind: 'DIAGNOSTIC', skillId: 'not-achieved', skillName: 'Diagnostic only', passed: true })], 1))
  mount(); await waitFor(() => expect(screen.getByRole('status').textContent).toContain('1 skill versions with achieved levels'))
  expect(readKnowledgeProfile).toHaveBeenCalledTimes(2)
  expect(screen.getAllByRole('heading', { name: 'Java' })).toHaveLength(1)
  expect(screen.queryByText('Diagnostic only')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Java · Foundation · v1' }))
  const dialog = screen.getByRole('dialog', { name: 'Achievement details' })
  expect(within(dialog).getAllByText('Learning and Skill Assessment')).toHaveLength(2)
  expect(within(dialog).getByRole('link', { name: 'View assessment result' }).getAttribute('href')).toContain('independent-attempt')
  expect(within(dialog).getAllByText(/17\/11\/2026/)).toHaveLength(2)
})
it('searches/filter achieved levels without inferring lower levels or mixing versions', async () => {
  vi.mocked(readKnowledgeProfile).mockResolvedValue(page([row({ knowledgeLevel: 'ADVANCED' }), row({ id: 'old', skillVersion: 'old' }), row({ id: 'other', skillId: 'git', skillName: 'Git', knowledgeLevel: 'INTERMEDIATE' })]))
  mount(); await screen.findByRole('button', { name: 'Java · Advanced · v1' })
  expect(screen.queryByRole('button', { name: 'Java · Foundation · v1' })).toBeNull()
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search skills' }), { target: { value: 'Java' } })
  expect(screen.queryByRole('heading', { name: 'Git' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Achieved level' })); fireEvent.click(screen.getByRole('option', { name: 'Advanced' }))
  expect(screen.queryByRole('button', { name: 'Java · Foundation · old' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Java · Advanced · v1' })).toBeTruthy()
})
it('retains achievement with a needs-review annotation and certificate provenance', async () => {
  vi.mocked(readKnowledgeProfile).mockResolvedValue(page([row({ sourceKind: 'CERTIFICATE' }), row({ id: 'review', kind: 'REVIEW', reviewState: 'NEED_REVIEW' })]))
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Java · Foundation · v1' }))
  expect(screen.getByText('Needs review — achievement retained')).toBeTruthy()
  expect(screen.getByText('Approved certificate')).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'View assessment result' })).toBeNull()
})
it('shows a true empty state only after history is complete', async () => {
  let finish!: (v: KnowledgePage) => void
  vi.mocked(readKnowledgeProfile).mockReturnValue(new Promise(resolve => { finish = resolve }))
  mount(); expect(screen.queryByText('No achieved skills yet')).toBeNull()
  finish(page([])); await screen.findByText('No achieved skills yet')
  expect(screen.getAllByRole('link', { name: 'Explore skills' })).toHaveLength(2)
})
it('keeps partial history explicit and retries an older page without a false empty state', async () => {
  vi.mocked(readKnowledgeProfile).mockResolvedValueOnce(page([row()], 0, true)).mockRejectedValueOnce(new RoleFlowError('NETWORK_ERROR')).mockResolvedValueOnce(page([row({ id: 'older', skillName: 'Git', skillId: 'git' })], 1))
  mount(); await screen.findByRole('alert'); expect(screen.queryByText('No achieved skills yet')).toBeNull()
  expect(screen.getByRole('button', { name: 'Java · Foundation · v1' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Retry' })); await screen.findByRole('button', { name: 'Git · Foundation · v1' })
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
})
it('hides previously loaded data when a later page denies access', async () => {
  vi.mocked(readKnowledgeProfile).mockResolvedValueOnce(page([row()], 0, true)).mockRejectedValueOnce(new RoleFlowError('FORBIDDEN', 403))
  mount(); await screen.findByText('Sign in as an Employee to view your achieved skills.')
  expect(screen.queryByText('Java')).toBeNull(); expect(screen.queryByRole('searchbox')).toBeNull()
})
it('does not request learner data for a staff actor', () => {
  mount({ ...actor, roles: ['DOMAIN_EXPERT'] }); expect(readKnowledgeProfile).not.toHaveBeenCalled(); expect(screen.getByRole('alert')).toBeTruthy()
})
it('does not reuse the previous learner achievements when account changes', async () => {
  vi.mocked(readKnowledgeProfile).mockResolvedValueOnce(page([row()])).mockResolvedValue(page([]))
  const view = mount(); await screen.findByRole('button', { name: 'Java · Foundation · v1' })
  view.changeActor({ ...actor, accountId: 'other' }); await screen.findByText('No achieved skills yet')
  expect(screen.queryByText('Java')).toBeNull()
})

it('keeps the summary incomplete at the API history limit instead of declaring missing achievements', async () => {
  vi.mocked(readKnowledgeProfile).mockImplementation(async p => page(p === 250 ? [row()] : [], p, true))
  mount()
  await screen.findByText('The history limit was reached. Search and filters cover loaded records only.', {}, { timeout: 10000 })
  expect(readKnowledgeProfile).toHaveBeenCalledTimes(251)
  expect(screen.queryByText('No achieved skills yet')).toBeNull()
  expect(screen.getByRole('button', { name: 'Java · Foundation · v1' })).toBeTruthy()
}, 15000)
