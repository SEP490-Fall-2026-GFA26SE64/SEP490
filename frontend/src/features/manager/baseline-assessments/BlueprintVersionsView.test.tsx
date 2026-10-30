import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../../shared/i18n/LanguageContext'
import { getBlueprintVersion, type BaselineBlueprint } from '../baseline-blueprints/baselineBlueprintApi'
import { BlueprintVersionsView } from './BlueprintVersionsView'
import { generateAssessmentCandidate, getBaselineAssessmentWorkspace,
  type BaselineAssessmentWorkspace, type ManagedAssessmentVersion } from './baselineAssessmentManagementApi'

vi.mock('../../../shared/layouts/WorkspaceLayout', () => ({
  WorkspaceLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}))
vi.mock('../../../shared/hooks/useToast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('../baseline-blueprints/baselineBlueprintApi', async (importOriginal) => ({
  ...await importOriginal<typeof import('../baseline-blueprints/baselineBlueprintApi')>(),
  getBlueprintVersion: vi.fn(),
}))
vi.mock('./baselineAssessmentManagementApi', async (importOriginal) => ({
  ...await importOriginal<typeof import('./baselineAssessmentManagementApi')>(),
  getBaselineAssessmentWorkspace: vi.fn(), generateAssessmentCandidate: vi.fn(),
}))

const root = '/ld-manager/baseline-assessments/occ-java'
const role = { roleId: 'role-1', roleNameSnapshot: 'Java Developer', enabled: true,
  easyScoreWeight: 0.25, mediumScoreWeight: 0.35, hardScoreWeight: 0.4,
  skills: [{ microSkillId: 'skill-1', microSkillNameSnapshot: 'Java Core',
    easyQuestionCount: 1, mediumQuestionCount: 1, hardQuestionCount: 1 }] }
const blueprint: BaselineBlueprint = { blueprintId: 'blueprint-1', version: 1,
  name: 'Java baseline', occupationId: 'occ-java', occupationNameSnapshot: 'Java Engineer',
  createdAt: '2026-10-19T08:00:00Z', roles: [role] }
const baseWorkspace: BaselineAssessmentWorkspace = { occupationId: 'occ-java',
  occupationName: 'Java Engineer', workingRevision: null, blueprintVersions: [], assessmentVersions: [] }

describe('BlueprintVersionsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('app_language', 'en')
    vi.mocked(getBlueprintVersion).mockResolvedValue(blueprint)
  })
  afterEach(() => { cleanup(); localStorage.clear() })

  it('opens directly on the two-tab list and resumes the saved working revision', async () => {
    vi.mocked(getBaselineAssessmentWorkspace).mockResolvedValue({ ...baseWorkspace,
      workingRevision: { workingRevisionId: 'working-1', blueprintId: 'blueprint-1',
        baseVersion: null, revision: 2, updatedAt: '2026-10-19T08:00:00Z',
        draft: { name: 'Java baseline', occupationId: 'occ-java',
          occupationNameSnapshot: 'Java Engineer', roles: [role] } },
    })
    renderRoute(`${root}/blueprints`)
    expect(await screen.findByText('Saved revision #2', { exact: false })).toBeTruthy()
    expect(screen.getByText('Saved')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Overview' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Blueprint Versions' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Assessment Versions' })).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: /View and edit/ }))
    expect((await screen.findByTestId('location')).textContent).toBe(`${root}/blueprints/revision`)
  })

  it('shows finalized role, skill, weights and difficulty counts as read-only detail', async () => {
    vi.mocked(getBaselineAssessmentWorkspace).mockResolvedValue({ ...baseWorkspace,
      blueprintVersions: [{ blueprintId: 'blueprint-1', version: 1, name: 'Java baseline',
        projection: 'CANDIDATE', createdAt: '2026-10-19T08:00:00Z' }],
    })
    renderRoute(`${root}/blueprints/blueprint-1/versions/1`)
    expect(await screen.findByText('Java Developer')).toBeTruthy()
    expect(screen.getByText(/Weights: Easy 25%/)).toBeTruthy()
    expect(screen.getByText('Java Core')).toBeTruthy()
    expect(screen.getByText('Easy: 1')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Save working revision' })).toBeNull()
  })

  it('keeps Create assessment available on a candidate and navigates to the created version', async () => {
    vi.mocked(getBaselineAssessmentWorkspace).mockResolvedValue({ ...baseWorkspace,
      blueprintVersions: [{ blueprintId: 'blueprint-1', version: 1, name: 'Java baseline',
        projection: 'CANDIDATE', createdAt: '2026-10-19T08:00:00Z' }],
    })
    vi.mocked(generateAssessmentCandidate).mockResolvedValue({
      assessmentVersionId: 'assessment-1', version: 1,
    } as ManagedAssessmentVersion)
    renderRoute(`${root}/blueprints`)
    const button = await screen.findByRole('button', { name: 'Create assessment now' })
    await userEvent.setup().click(button)
    await waitFor(() => expect(generateAssessmentCandidate).toHaveBeenCalledWith('occ-java', expect.any(String)))
    expect((await screen.findByTestId('location')).textContent).toBe(`${root}/assessments/assessment-1`)
  })
})

function renderRoute(path: string) {
  render(<LanguageProvider><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/ld-manager/baseline-assessments/:occupationId/blueprints" element={<BlueprintVersionsView />} />
    <Route path="/ld-manager/baseline-assessments/:occupationId/blueprints/:blueprintId/versions/:version" element={<BlueprintVersionsView />} />
    <Route path="*" element={<LocationProbe />} />
  </Routes></MemoryRouter></LanguageProvider>)
}

function LocationProbe() { return <span data-testid="location">{useLocation().pathname}</span> }
