import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { readEmployeeDevelopment, type EmployeeDevelopmentDetail } from './developmentApi'
import { EmployeeDevelopmentPage } from './EmployeeDevelopmentPage'

vi.mock('../../../shared/layouts/WorkspaceLayout', () => ({ WorkspaceLayout: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en', t: (key: string) => key.replace('knowledgeLevel.', '') }) }))
vi.mock('./developmentApi', async original => ({ ...(await original<typeof import('./developmentApi')>()), readEmployeeDevelopment: vi.fn() }))

const requirement = (skillId: string, skillName: string) => ({ skillId, skillName, knowledgeLevel: 'FOUNDATION' as const, skillVersion: '1', outcomeCodes: [], provision: 'MODULE_ONLY' as const })
const detail: EmployeeDevelopmentDetail = {
  generatedAt: '2026-11-16T00:00:00Z',
  employee: { accountId: 'emp-1', fullName: 'Ana Pham', email: 'ana@example.test', active: true, departmentId: 'd1', departmentName: 'Engineering', jobPositionId: 'j1', jobPositionName: 'Developer',
    target: { roleId: 'role-1', roleName: 'Security Analyst', levelId: 'lvl-1', levelName: 'Junior', selectedAt: '2026-10-01T00:00:00Z' },
    pathway: { requestId: 'req-1', roleName: 'Security Analyst', levelName: 'Junior', generationStatus: 'SUCCEEDED', reviewStatus: 'APPROVED', timingState: 'IN_PROGRESS', startedAt: '2026-10-02T00:00:00Z',
      deadlineAt: '2027-04-02T00:00:00Z', completedAt: null, requiredSteps: 2, fulfilledSteps: 1, bypassedSteps: 0, inProgressSteps: 1, expertSteps: 0, supplementSteps: 0 },
    assessments: { attempts: 1, finalized: 1, inProgress: 0, baselineFinalized: 0, passedGroups: 0, totalGroups: 1, lastAssessmentAt: '2026-11-01T00:00:00Z' },
    evidence: { achievedLevels: 1, needReview: 0, completedModules: 2, lastAchievedAt: '2026-10-20T00:00:00Z' }, lastActivityAt: '2026-11-01T00:00:00Z' },
  competency: { data: { selectionId: 'sel-1', selectionRevision: 1, target: [requirement('skill-a', 'Threat modeling'), requirement('skill-b', 'Incident response')], achievedKeys: ['skill-a\nFOUNDATION'], baselinePassedKeys: [] }, unavailableCode: null },
  pathway: { data: { requestId: 'req-1', selectionId: 'sel-1', selectionRevision: 1, roleId: 'role-1', roleName: 'Security Analyst', levelId: 'lvl-1', levelName: 'Junior', generationStatus: 'SUCCEEDED',
    reviewStatus: 'APPROVED', reasonCode: null, revision: 1, contentHash: 'hash', archived: false, targetReleased: true,
    timing: { state: 'IN_PROGRESS', durationMonths: 6, startedAt: '2026-10-02T00:00:00Z', deadlineAt: '2027-04-02T00:00:00Z', completedAt: null, onTime: null, observedAt: '2026-11-16T00:00:00Z' },
    steps: [
      { id: 'step-a', requirement: requirement('skill-a', 'Threat modeling'), kind: 'REQUIRED', state: 'FULFILLED', reason: 'TARGET', fulfilledEvidenceId: 'ev-1', certificate: null, learningLocked: false,
        options: [{ moduleId: 'mod-a', moduleRevision: 1, contentVersion: '1', title: 'Threat modeling basics', startedAt: '2026-10-03T00:00:00Z', completedAt: '2026-10-10T00:00:00Z' }] },
      { id: 'step-b', requirement: requirement('skill-b', 'Incident response'), kind: 'REQUIRED', state: 'IN_PROGRESS', reason: 'TARGET', fulfilledEvidenceId: null, certificate: null, learningLocked: false,
        options: [{ moduleId: 'mod-b', moduleRevision: 2, contentVersion: '1', title: 'Incident response drills', startedAt: '2026-10-21T00:00:00Z', completedAt: '2026-10-30T00:00:00Z' }] },
    ], dependencies: [] }, unavailableCode: null },
  assessments: [{ attemptId: 'att-1', purpose: 'SKILL_ASSESSMENT', state: 'FINALIZED', selectionId: 'sel-1', selectionRevision: 1, roleName: 'Security Analyst', levelName: 'Junior', stepId: 'step-b',
    moduleId: 'mod-b', moduleRevision: 2, startedAt: '2026-11-01T00:00:00Z', deadlineAt: '2026-11-01T01:00:00Z', finishedAt: '2026-11-01T00:30:00Z', finishReason: 'SUBMITTED',
    groups: [{ groupId: 'g-1', skillId: 'skill-b', skillName: 'Incident response', knowledgeLevel: 'FOUNDATION', role: 'MAIN', correctCount: 2, totalCount: 5, passed: false, vetoTriggered: false }] }],
  achievements: [{ skillId: 'skill-a', skillName: 'Threat modeling', knowledgeLevel: 'FOUNDATION', skillVersion: '1', sourceKind: 'MODULE_ASSESSMENT', achievedAt: '2026-10-20T00:00:00Z' }],
}

function show() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <WorkspaceSessionContext.Provider value={{ identity: { accountId: 'ld-1', fullName: 'L&D', email: 'ld@example.test', organizationId: 'org-1', organizationName: 'Org', roles: ['LD_MANAGER'] }, onSignOut: async () => undefined }}>
      <MemoryRouter initialEntries={['/ld-manager/employees/emp-1']}><Routes><Route path="/ld-manager/employees/:accountId" element={<EmployeeDevelopmentPage />} /></Routes></MemoryRouter>
    </WorkspaceSessionContext.Provider></QueryClientProvider>)
}

describe('FR-04.07 employee development profile', () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver
    window.matchMedia ??= (() => ({ matches: true, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
  })
  afterEach(cleanup)

  it('composes competency, gaps, read-only pathway and assessment outcomes from the L&D report', async () => {
    vi.mocked(readEmployeeDevelopment).mockResolvedValue(detail)
    show()
    expect(await screen.findByRole('heading', { name: 'Ana Pham', level: 1 })).toBeTruthy()
    expect(vi.mocked(readEmployeeDevelopment).mock.calls[0][0]).toBe('emp-1')
    const stats = screen.getByRole('region', { name: 'Competency statistics' })
    expect(within(stats).getAllByText('1 / 2')).toHaveLength(2)

    fireEvent.click(screen.getByRole('tab', { name: /Skill gaps/ }))
    const gaps = await screen.findByTestId('ld-skill-gaps')
    expect(within(gaps).getByText(/Incident response/)).toBeTruthy()
    // The failed module assessment is classified exactly as on the employee Overview.
    expect(within(gaps).getByText('Assessment not passed')).toBeTruthy()
    expect(within(gaps).queryByText(/Threat modeling/)).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: /Learning pathway/ }))
    const pathway = await screen.findByTestId('ld-employee-pathway')
    expect(within(pathway).getAllByText(/Incident response/).length).toBeGreaterThan(0)
    expect(within(pathway).queryByRole('link', { name: /learn/i })).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: /Assessment outcomes/ }))
    const outcomes = await screen.findByTestId('ld-assessments')
    expect(within(outcomes).getByText('0/1 passed')).toBeTruthy()
    expect(within(outcomes).getByText('2/5')).toBeTruthy()
  })

  it('explains an unavailable section instead of inventing data', async () => {
    vi.mocked(readEmployeeDevelopment).mockResolvedValue({ ...detail, competency: { data: null, unavailableCode: 'TARGET_NOT_SELECTED' }, pathway: { data: null, unavailableCode: 'PATHWAY_NOT_STARTED' }, assessments: [], achievements: [] })
    show()
    expect((await screen.findAllByText(/has not selected a target role yet/)).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('tab', { name: /Learning pathway/ }))
    expect(await screen.findByText(/No learning pathway has been requested/)).toBeTruthy()
  })
})
