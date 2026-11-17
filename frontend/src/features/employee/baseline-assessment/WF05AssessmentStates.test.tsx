import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import type { RulePathway, RuleStep } from '../../../shared/api/requirementPathway'
import type { BaselineAttempt } from './baselineApi'
import { readModuleHistory } from './baselineApi'
import { usePathwayAssessmentStates } from './usePathwayAssessmentStates'
vi.mock('./baselineApi', async original => ({ ...await original<typeof import('./baselineApi')>(), readModuleHistory: vi.fn() }))
afterEach(cleanup)
it('TC-WF05-F10: a fulfilled requirement does not transfer A1 assessment pass to completed A2', async () => {
  const step: RuleStep = { id: 'STEP-A', requirement: { skillId: 'A', skillName: 'A', knowledgeLevel: 'FOUNDATION', skillVersion: 'v1', outcomeCodes: [], provision: 'MODULE_ONLY' }, kind: 'REQUIRED', state: 'FULFILLED', reason: 'OFFICIAL_EVIDENCE_ACCEPTED', fulfilledEvidenceId: 'EVIDENCE', certificate: null, learningLocked: false,
    options: ['A1', 'A2'].map(moduleId => ({ moduleId, moduleRevision: 1, contentVersion: 'v1', title: moduleId, startedAt: '2026-11-16T00:00:00Z', completedAt: '2026-11-16T00:01:00Z' })) }
  const pathway: RulePathway = { requestId: 'REQUEST', selectionId: 'SELECTION', selectionRevision: 1, roleId: 'R', roleName: 'R', levelId: 'L', levelName: 'L', generationStatus: 'SUCCEEDED', reviewStatus: 'APPROVED', reasonCode: null, revision: 1, contentHash: 'a'.repeat(64), archived: false, targetReleased: true, steps: [step], dependencies: [] }
  const passed: BaselineAttempt = { id: 'ATTEMPT-A1', target: { selectionId: 'SELECTION', selectionRevision: 1, stepId: step.id, moduleId: 'A1', moduleRevision: 1 }, jobPositionId: 'J', jobPositionName: 'J', roleId: 'R', roleName: 'R', levelId: 'L', levelName: 'L', purpose: 'SKILL_ASSESSMENT', state: 'FINALIZED', revision: 3, startedAt: '2026-11-16T00:00:00Z', deadlineAt: '2026-11-16T00:01:00Z', observedAt: '2026-11-16T00:01:00Z', finishedAt: '2026-11-16T00:01:00Z', finishReason: 'SUBMITTED', previousAttemptId: null, expired: false, maxQuestions: 2, answeredCount: 2, items: [], groups: [], results: [{ groupId: 'G', correctCount: 2, totalCount: 2, mandatorySatisfied: true, passed: true, vetoTriggered: false, reasons: [] }] }
  vi.mocked(readModuleHistory).mockImplementation(async moduleId => moduleId === 'A1' ? [passed] : [])
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <WorkspaceSessionContext.Provider value={{ identity: { accountId: 'EMPLOYEE', organizationId: 'ORG', email: 'employee@wf05.test', fullName: 'Fixture', organizationName: 'WF05' }, onSignOut: async () => {} }}><QueryClientProvider client={client}>{children}</QueryClientProvider></WorkspaceSessionContext.Provider>
  const { result, unmount } = renderHook(() => usePathwayAssessmentStates(pathway, false), { wrapper })
  await waitFor(() => expect(result.current(step, step.options[0])).toBe('passed'))
  await waitFor(() => expect(result.current(step, step.options[1])).toBe('notStarted'))
  expect(readModuleHistory).toHaveBeenCalledWith('A1', 1, expect.any(AbortSignal))
  expect(readModuleHistory).toHaveBeenCalledWith('A2', 1, expect.any(AbortSignal))
  unmount(); client.clear()
})
