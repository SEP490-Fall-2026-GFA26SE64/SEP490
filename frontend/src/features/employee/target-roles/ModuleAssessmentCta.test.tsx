import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, configure, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { readRulePathway, type RulePathway } from '../../../shared/api/requirementPathway'
import type { SkillModuleSearchItem } from '../../../shared/api/skillLearningApi'
import { BaselineError, executeCommand, readContextAttempt, readModuleHistory, readSkillScope, type BaselineAttempt } from '../baseline-assessment/baselineApi'
import { SkillLevelAssessmentPanel } from './SkillLevelAssessmentPanel'
import { ModuleCatalogResults } from './ModuleCatalogResults'
import { CompletedModuleAssessmentLink } from '../baseline-assessment/CompletedModuleAssessmentLink'
vi.mock('../../../shared/api/requirementPathway', async () => ({ ...await vi.importActual('../../../shared/api/requirementPathway'), readRulePathway: vi.fn() }))
vi.mock('../baseline-assessment/baselineApi', async () => ({ ...await vi.importActual('../baseline-assessment/baselineApi'), executeCommand: vi.fn(), readContextAttempt: vi.fn(), readModuleHistory: vi.fn(), readSkillScope: vi.fn() }))
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en', t: (key: string, fallback?: string) => key === 'rulePathway.assessment' ? 'Take Skill Assessment' : key === 'employeeBaseline.errors.RETAKE_NOT_YET_AVAILABLE' ? 'Please wait before retaking.' : key === 'employeeBaseline.errors.RETAKE_LIMIT_REACHED' ? 'Retake limit reached.' : fallback ?? key }) }))
configure({ asyncUtilTimeout: 5000 })
afterEach(cleanup)
beforeEach(() => { vi.resetAllMocks(); vi.mocked(readSkillScope).mockRejectedValue(new BaselineError('REQUEST_FAILED', 404)); vi.mocked(readRulePathway).mockResolvedValue(null); vi.mocked(readContextAttempt).mockResolvedValue(null); vi.mocked(readModuleHistory).mockResolvedValue([]) })
const fixture: SkillModuleSearchItem = { skillId: 'java', skillName: 'Java', module: { moduleId: 'm', title: 'Java module', knowledgeLevel: 'FOUNDATION', skillVersion: 'v1', contentVersion: 'content-v2', moduleRevision: 7, started: true, completed: true } }
function attempt(state: 'IN_PROGRESS' | 'FINALIZED' = 'IN_PROGRESS'): BaselineAttempt { return { id: 'attempt-1', target: { selectionId: null, selectionRevision: 0, moduleId: 'm', moduleRevision: 7 }, jobPositionId: '', jobPositionName: '', roleId: '', roleName: '', levelId: '', levelName: '', purpose: 'SKILL_ASSESSMENT', state, revision: 1, startedAt: '2026-11-17T00:00:00Z', deadlineAt: '2026-11-17T00:10:00Z', observedAt: '2026-11-17T00:00:00Z', finishedAt: state === 'FINALIZED' ? '2026-11-17T00:01:00Z' : null, finishReason: state === 'FINALIZED' ? 'SUBMITTED' : null, previousAttemptId: null, expired: false, maxQuestions: 1, answeredCount: 0, items: [], groups: [], results: [] } }
function Destination() { return <h1>Assessment {useParams().id}</h1> }
function mount(module = fixture.module, reader = false, modules = [module]) { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><MemoryRouter><WorkspaceSessionContext.Provider value={{ identity: { accountId: 'employee', organizationId: 'org', fullName: 'Employee', email: 'fixture@example.test', organizationName: 'Org', roles: ['EMPLOYEE'] }, onSignOut: async () => {} }}><Routes><Route path="/" element={reader ? <CompletedModuleAssessmentLink moduleId="m" revision={7} /> : <><SkillLevelAssessmentPanel skillId="java" modules={modules} skillVersion="v1" level="FOUNDATION" levelLabel="Foundation" vi={false} /><ModuleCatalogResults items={[{ ...fixture, module }]} view="grid" vi={false} busy="" labels={{ FOUNDATION: 'Foundation', INTERMEDIATE: 'Intermediate', ADVANCED: 'Advanced' }} reasons={{ PREREQUISITE_NOT_MET: 'Complete prerequisite knowledge first.' }} onOpen={vi.fn()} /></>} /><Route path="/employee/baseline-assessment/:id" element={<Destination />} /></Routes></WorkspaceSessionContext.Provider></MemoryRouter></QueryClientProvider>) }
it('reads exact completed revision without starting an exam, then starts independent assessment on explicit click', async () => {
  vi.mocked(executeCommand).mockResolvedValue(attempt()); mount()
  const start = await screen.findByRole('button', { name: 'Take Skill Assessment' })
  await waitFor(() => expect((start as HTMLButtonElement).disabled).toBe(false))
  expect(executeCommand).not.toHaveBeenCalled()
  expect(readContextAttempt).toHaveBeenCalledWith({ selectionId: null, selectionRevision: 0, moduleId: 'm', moduleRevision: 7 }, 'SKILL_ASSESSMENT', expect.anything())
  fireEvent.click(start); await screen.findByRole('heading', { name: 'Assessment attempt-1' })
  expect(JSON.parse(vi.mocked(executeCommand).mock.calls[0][0].body)).toEqual({ purpose: 'SKILL_ASSESSMENT', expectedSelectionId: null, expectedSelectionRevision: 0, previousAttemptId: null, stepId: null, moduleId: 'm', moduleRevision: 7 })
})
it('resumes an active attempt instead of creating a second one', async () => {
  vi.mocked(readContextAttempt).mockResolvedValue(attempt()); mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Resume Skill Assessment' }))
  await screen.findByRole('heading', { name: 'Assessment attempt-1' }); expect(executeCommand).not.toHaveBeenCalled()
})
it.each(['RETAKE_NOT_YET_AVAILABLE', 'RETAKE_LIMIT_REACHED'])('retake respects server denial %s and preserves completed content', async code => {
  vi.mocked(readContextAttempt).mockResolvedValue(attempt('FINALIZED')); vi.mocked(executeCommand).mockRejectedValue(new BaselineError(code, 409)); mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Retake Skill Assessment' }))
  expect((await screen.findByRole('alert')).textContent).toContain(code === 'RETAKE_NOT_YET_AVAILABLE' ? 'Please wait before retaking.' : 'Retake limit reached.')
  expect(screen.getByText('Content completed')).toBeTruthy(); expect(screen.getByRole('button', { name: 'Review module' })).toBeTruthy()
  expect(JSON.parse(vi.mocked(executeCommand).mock.calls[0][0].body).previousAttemptId).toBe('attempt-1')
})
it('retains the same command receipt on an ambiguous network retry', async () => {
  vi.mocked(executeCommand).mockRejectedValueOnce(new BaselineError('NETWORK_ERROR')).mockResolvedValueOnce(attempt()); mount()
  const start = await screen.findByRole('button', { name: 'Take Skill Assessment' }); await waitFor(() => expect((start as HTMLButtonElement).disabled).toBe(false)); fireEvent.click(start)
  fireEvent.click(await screen.findByRole('button', { name: 'Retry' })); await screen.findByRole('heading', { name: 'Assessment attempt-1' })
  expect(vi.mocked(executeCommand).mock.calls[1][0]).toEqual(vi.mocked(executeCommand).mock.calls[0][0])
})
it('shows a policy denial without losing the module or awarding achievement', async () => {
  vi.mocked(executeCommand).mockRejectedValue(new BaselineError('ASSESSMENT_POLICY_REQUIRED', 422)); mount()
  const start = await screen.findByRole('button', { name: 'Take Skill Assessment' }); await waitFor(() => expect((start as HTMLButtonElement).disabled).toBe(false)); fireEvent.click(start)
  expect((await screen.findByRole('alert')).textContent).toContain('Assessment is unavailable')
  expect(screen.getByRole('heading', { name: 'Java module' })).toBeTruthy(); expect(executeCommand).toHaveBeenCalledTimes(1)
})
it.each([
  [{ ...fixture.module, completed: false }, 'No completed eligible module is available for this skill version. Study a compatible module below; if already completed, check its conditions or refresh the list.'],
  [{ ...fixture.module, moduleRevision: undefined }, 'No completed eligible module is available for this skill version. Study a compatible module below; if already completed, check its conditions or refresh the list.'],
  [{ ...fixture.module, unavailableReason: 'PREREQUISITE_NOT_MET' }, 'Complete prerequisite knowledge first.'],
] as const)('does not query or start assessment without trusted completion/configuration/admission', async (module, message) => {
  mount(module); expect(await screen.findByText(message)).toBeTruthy(); expect(screen.queryByRole('button', { name: /Skill Assessment/ })).toBeNull()
  expect(readRulePathway).not.toHaveBeenCalled(); expect(executeCommand).not.toHaveBeenCalled()
})
function assigned(completedAt: string | null = '2026-11-17T00:00:00Z'): RulePathway { return { requestId: 'request', selectionId: 'selection', selectionRevision: 3, roleId: 'role', roleName: 'Role', levelId: 'level', levelName: 'Level', generationStatus: 'GENERATED', reviewStatus: 'APPROVED', reasonCode: null, revision: 1, contentHash: 'hash', archived: false, targetReleased: true, steps: [{ id: 'step', requirement: { skillId: 'java', skillName: 'Java', knowledgeLevel: 'FOUNDATION', skillVersion: 'v1', outcomeCodes: [], provision: 'MODULE_ONLY' }, kind: 'REQUIRED', state: 'IN_PROGRESS', reason: 'LEARNING', fulfilledEvidenceId: null, options: [{ moduleId: 'm', moduleRevision: 7, contentVersion: 'content-v2', title: 'Java module', startedAt: '2026-11-17T00:00:00Z', completedAt }], certificate: null, learningLocked: false }], dependencies: [] } }
it('keeps assigned-pathway selection and step rather than treating it as independent', async () => {
  vi.mocked(readRulePathway).mockResolvedValue(assigned()); vi.mocked(executeCommand).mockResolvedValue(attempt()); mount()
  const start = await screen.findByRole('button', { name: 'Take Skill Assessment' }); await waitFor(() => expect((start as HTMLButtonElement).disabled).toBe(false)); fireEvent.click(start)
  await screen.findByRole('heading', { name: 'Assessment attempt-1' })
  expect(JSON.parse(vi.mocked(executeCommand).mock.calls[0][0].body)).toMatchObject({ expectedSelectionId: 'selection', expectedSelectionRevision: 3, stepId: 'step', moduleId: 'm', moduleRevision: 7 })
})
it('waits for actual pathway completion when catalog completion is stale', async () => {
  vi.mocked(readRulePathway).mockResolvedValue(assigned(null)); mount()
  expect(await screen.findByText(/Learning progress has not yet confirmed completion/)).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Take Skill Assessment' })).toBeNull(); expect(executeCommand).not.toHaveBeenCalled()
})

it('keeps full reader resume, latest result and history controls after extracting the shared resolver', async () => {
  vi.mocked(readContextAttempt).mockResolvedValue(attempt()); mount(fixture.module, true)
  expect(await screen.findByRole('button', { name: 'Resume Skill Assessment' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'View latest attempt' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Assessment history' })).toBeTruthy()
  expect(executeCommand).not.toHaveBeenCalled()
})
it('blocks a start on a failed completion/context read and safely retries the read', async () => {
  vi.mocked(readContextAttempt).mockRejectedValueOnce(new BaselineError('EXACT_LEARNING_COMPLETION_REQUIRED', 409)).mockResolvedValueOnce(null)
  mount(); await screen.findByRole('alert')
  expect((screen.getByRole('button', { name: 'Take Skill Assessment' }) as HTMLButtonElement).disabled).toBe(true)
  expect(executeCommand).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await waitFor(() => expect((screen.getByRole('button', { name: 'Take Skill Assessment' }) as HTMLButtonElement).disabled).toBe(false))
  expect(executeCommand).not.toHaveBeenCalled()
})

it('requires an explicit completed-module choice and switches the exact assessment context', async () => {
  mount(fixture.module, false, [fixture.module, { ...fixture.module, moduleId: 'other', title: 'Other completed module', moduleRevision: 9 }])
  expect(readContextAttempt).not.toHaveBeenCalled()
  fireEvent.click(await screen.findByRole('button', { name: 'Completed module used for assessment' }))
  fireEvent.click(screen.getByText('Other completed module'))
  await screen.findByRole('button', { name: 'Take Skill Assessment' })
  expect(readContextAttempt).toHaveBeenLastCalledWith({ selectionId: null, selectionRevision: 0, moduleId: 'other', moduleRevision: 9 }, 'SKILL_ASSESSMENT', expect.anything())
  fireEvent.click(screen.getByRole('button', { name: 'Completed module used for assessment' }))
  fireEvent.click(screen.getByText('Java module', { selector: 'span' }))
  await waitFor(() => expect(readContextAttempt).toHaveBeenLastCalledWith({ selectionId: null, selectionRevision: 0, moduleId: 'm', moduleRevision: 7 }, 'SKILL_ASSESSMENT', expect.anything()))
  expect(executeCommand).not.toHaveBeenCalled()
})
it('does not use a completed module from another Skill version', () => {
  mount({ ...fixture.module, skillVersion: 'older' })
  expect(readContextAttempt).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: 'Take Skill Assessment' })).toBeNull()
})
it('module cards keep learning actions without an assessment entry', () => {
  mount()
  const card = document.querySelector('.catalog-card')!
  expect(card.textContent).toContain('Review module')
  expect(card.textContent).not.toContain('Skill Assessment')
})
