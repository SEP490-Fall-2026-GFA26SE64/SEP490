import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { SharedSkillAssessmentEntry } from './SharedSkillAssessmentEntry'
import { BaselineError, executeCommand, readSkillScope, type BaselineAttempt, type SkillAttemptSummary, type SkillScopeHistory } from './baselineApi'
vi.mock('./baselineApi', async () => ({ ...await vi.importActual('./baselineApi'), executeCommand: vi.fn(), readSkillScope: vi.fn() }))
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en', t: (key: string, fallback?: string) => fallback ?? key }) }))
configure({ asyncUtilTimeout: 5000 })
afterEach(cleanup)
const locator = { skillId: 'java', knowledgeLevel: 'FOUNDATION' as const, skillVersion: 'v1' }
const paper = (id = 'old-A', state: 'IN_PROGRESS' | 'FINALIZED' = 'FINALIZED'): SkillAttemptSummary => ({ id, state, startedAt: '2026-11-17T00:00:00Z', deadlineAt: '2026-11-17T00:20:00Z', finishedAt: state === 'FINALIZED' ? '2026-11-17T00:01:00Z' : null, finishReason: state === 'FINALIZED' ? 'SUBMITTED' : null, previousAttemptId: null, target: { selectionId: null, selectionRevision: 0, moduleId: id, moduleRevision: 1, roleName: '' } })
const meta = (changes: Partial<SkillScopeHistory> = {}): SkillScopeHistory => ({ scope: locator, items: [paper()], activeAttempts: [], totalAttempts: 2, unresolvedAttempts: 0, page: 0, pageSize: 20, hasMore: false, previousAttemptId: 'old-A', maxAttempts: 10, retakeAvailableAt: null, policyIssue: null, observedAt: '2026-11-17T00:10:00Z', ...changes })
const accepted: BaselineAttempt = { id: 'new-paper', target: { selectionId: null, selectionRevision: 0, moduleId: 'module-B', moduleRevision: 2 }, purpose: 'SKILL_ASSESSMENT', state: 'IN_PROGRESS', revision: 1, startedAt: '2026-11-17T00:10:00Z', deadlineAt: '2026-11-17T00:20:00Z', observedAt: '2026-11-17T00:10:00Z', finishedAt: null, finishReason: null, previousAttemptId: 'old-A', expired: false, maxQuestions: 1, answeredCount: 0, items: [{ position: 1, itemVersionId: 'item', groupId: 'g', prompt: 'Question', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], selectedOptionId: null }], groups: [{ id: 'g', skillName: 'Java', requirement: { skillId: 'java', knowledgeLevel: 'FOUNDATION', outcomeCodes: [] }, role: 'MAIN', totalCount: 1, requiredCorrectCount: 1, mandatoryRequired: false }], results: [], jobPositionId: '', jobPositionName: '', roleId: '', roleName: '', levelId: '', levelName: '' }
const target = vi.fn(async () => ({ selectionId: null, selectionRevision: 0, moduleId: 'module-B', moduleRevision: 2 }))
function Destination() { return <h1>Paper {useParams().id}</h1> }
function mount(disabled = false, roles = ['EMPLOYEE']) { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><MemoryRouter><WorkspaceSessionContext.Provider value={{ identity: { accountId: 'learner', organizationId: 'org', fullName: 'Learner', email: 'learner@example.test', organizationName: 'Org', roles }, onSignOut: async () => {} }}><Routes><Route path="/" element={<SharedSkillAssessmentEntry locator={locator} getNewTarget={target} disabled={disabled} legacy={<p>Legacy module entry</p>} />} /><Route path="/employee/baseline-assessment/:id" element={<Destination />} /></Routes></WorkspaceSessionContext.Provider></MemoryRouter></QueryClientProvider>) }
beforeEach(() => { vi.resetAllMocks(); target.mockResolvedValue({ selectionId: null, selectionRevision: 0, moduleId: 'module-B', moduleRevision: 2 }); vi.mocked(readSkillScope).mockResolvedValue(meta()); vi.mocked(executeCommand).mockResolvedValue(accepted) })
it('reads shared counts without creating a paper and uses the actual cross-module parent on explicit retake', async () => {
  mount(); const start = await screen.findByRole('button', { name: 'Retake Skill Assessment' })
  expect(executeCommand).not.toHaveBeenCalled(); expect(target).not.toHaveBeenCalled()
  fireEvent.click(start); await screen.findByRole('heading', { name: 'Paper new-paper' })
  expect(JSON.parse(vi.mocked(executeCommand).mock.calls[0][0].body)).toMatchObject({ previousAttemptId: 'old-A', moduleId: 'module-B', moduleRevision: 2 })
})
it('retains all legacy active papers and allows resume even without a newly completed module', async () => {
  vi.mocked(readSkillScope).mockResolvedValue(meta({ totalAttempts: 3, activeAttempts: [paper('A', 'IN_PROGRESS'), paper('B', 'IN_PROGRESS')] }))
  mount(true); const list = await screen.findByRole('list', { name: 'Active skill assessments' })
  expect(within(list).getAllByRole('button', { name: 'Resume Skill Assessment' })).toHaveLength(2)
  expect(screen.queryByRole('button', { name: 'Retake Skill Assessment' })).toBeNull()
  fireEvent.click(within(list).getAllByRole('button')[1]); await screen.findByRole('heading', { name: 'Paper B' })
  expect(executeCommand).not.toHaveBeenCalled(); expect(target).not.toHaveBeenCalled()
})
it.each([
  { totalAttempts: 10 },
  { retakeAvailableAt: '2026-11-17T00:30:00Z' },
  { unresolvedAttempts: 1 },
  { policyIssue: 'ASSESSMENT_POLICY_REQUIRED', maxAttempts: null },
])('blocks a new paper for limit/cooldown/unresolved/configuration conditions', async changes => {
  vi.mocked(readSkillScope).mockResolvedValue(meta(changes)); mount()
  expect((await screen.findByRole('button', { name: 'Retake Skill Assessment' }) as HTMLButtonElement).disabled).toBe(true)
  expect(executeCommand).not.toHaveBeenCalled()
})
it('checks a newly appeared active paper before starting and never creates a duplicate', async () => {
  const active = meta({ activeAttempts: [paper('race-winner', 'IN_PROGRESS')] })
  vi.mocked(readSkillScope).mockResolvedValueOnce(meta()).mockResolvedValue(active)
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Retake Skill Assessment' }))
  await screen.findByRole('button', { name: 'Resume Skill Assessment' }); expect(executeCommand).not.toHaveBeenCalled(); expect(target).not.toHaveBeenCalled()
})
it('replays the exact same command receipt after an ambiguous network failure', async () => {
  vi.mocked(executeCommand).mockRejectedValueOnce(new BaselineError('NETWORK_ERROR')).mockResolvedValueOnce(accepted)
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Retake Skill Assessment' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Retry' }))
  await screen.findByRole('heading', { name: 'Paper new-paper' })
  expect(vi.mocked(executeCommand).mock.calls[0][0]).toEqual(vi.mocked(executeCommand).mock.calls[1][0]); expect(target).toHaveBeenCalledTimes(1)
})
it('loads older group history without filtering it by the currently selected module', async () => {
  vi.mocked(readSkillScope).mockImplementation(async (_scope, _signal, p = 0) => p === 0 ? meta({ hasMore: true }) : meta({ page: 1, items: [paper('old-B')] }))
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Assessment history' }))
  const dialog = screen.getByRole('dialog', { name: 'Shared assessment history' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Load more history' }))
  await waitFor(() => expect(within(dialog).getAllByRole('link', { name: 'View result' })).toHaveLength(2))
  expect(readSkillScope).toHaveBeenCalledWith(locator, expect.anything(), 1); expect(executeCommand).not.toHaveBeenCalled()
})
it('falls back only when the scoped API is absent, preserving existing module behavior', async () => {
  vi.mocked(readSkillScope).mockRejectedValue(new BaselineError('REQUEST_FAILED', 404)); mount()
  await screen.findByText('Legacy module entry'); expect(executeCommand).not.toHaveBeenCalled()
})
it.each([401, 403, 503])('does not fall back or start when a real scope read fails with %s', async status => {
  vi.mocked(readSkillScope).mockRejectedValue(new BaselineError('DEPENDENCY_UNAVAILABLE', status)); mount()
  await screen.findByRole('alert'); expect(screen.queryByText('Legacy module entry')).toBeNull(); expect(executeCommand).not.toHaveBeenCalled()
})
it('does not query learner history for a staff actor', () => {
  mount(false, ['DOMAIN_EXPERT']); expect(readSkillScope).not.toHaveBeenCalled(); expect(screen.getByRole('alert')).toBeTruthy()
})
