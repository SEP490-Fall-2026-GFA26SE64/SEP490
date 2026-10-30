import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../../shared/i18n/LanguageContext'
import { getOccupationCapacity, type BaselineBlueprint } from '../baseline-blueprints/baselineBlueprintApi'
import { BlueprintRevisionPage } from './BlueprintRevisionPage'
import { finalizeBlueprintWorkingRevision, generateAssessmentCandidate,
  getBaselineAssessmentWorkspace, saveBlueprintWorkingRevision,
  type BaselineAssessmentWorkspace, type ManagedAssessmentVersion } from './baselineAssessmentManagementApi'

vi.mock('../../../shared/layouts/WorkspaceLayout', () => ({
  WorkspaceLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}))
vi.mock('../../../shared/hooks/useToast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('../baseline-blueprints/BaselineRoleConfiguration', () => ({
  BaselineRoleConfiguration: () => <span>Role configuration</span>,
}))
vi.mock('../baseline-blueprints/baselineBlueprintApi', async (importOriginal) => ({
  ...await importOriginal<typeof import('../baseline-blueprints/baselineBlueprintApi')>(),
  getOccupationCapacity: vi.fn(),
}))
vi.mock('./baselineAssessmentManagementApi', async (importOriginal) => ({
  ...await importOriginal<typeof import('./baselineAssessmentManagementApi')>(),
  getBaselineAssessmentWorkspace: vi.fn(), saveBlueprintWorkingRevision: vi.fn(),
  finalizeBlueprintWorkingRevision: vi.fn(), generateAssessmentCandidate: vi.fn(),
}))

const root = '/ld-manager/baseline-assessments/occ-java'
const draft = { name: 'Java baseline', occupationId: 'occ-java', occupationNameSnapshot: 'Java Engineer',
  roles: [{ roleId: 'role-1', roleNameSnapshot: 'Java Developer', enabled: true,
    easyScoreWeight: 0.2, mediumScoreWeight: 0.3, hardScoreWeight: 0.5,
    skills: [{ microSkillId: 'skill-1', microSkillNameSnapshot: 'Java Core',
      easyQuestionCount: 1, mediumQuestionCount: 1, hardQuestionCount: 1 }] }] }
const working = { workingRevisionId: 'working-1', blueprintId: 'blueprint-1',
  baseVersion: null, revision: 1, draft, updatedAt: '2026-10-19T08:00:00Z' }

describe('BlueprintRevisionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('app_language', 'en')
    vi.mocked(getBaselineAssessmentWorkspace).mockResolvedValue({ occupationId: 'occ-java',
      occupationName: 'Java Engineer', workingRevision: working,
      blueprintVersions: [], assessmentVersions: [] } satisfies BaselineAssessmentWorkspace)
    vi.mocked(getOccupationCapacity).mockResolvedValue({ occupationId: 'occ-java',
      catalogVersion: 'v1', coverageAsOf: '2026-10-19T08:00:00Z',
      roles: [{ roleId: 'role-1', skills: [{ microSkillId: 'skill-1',
        availableEasy: 2, availableMedium: 2, availableHard: 2 }] }] })
  })
  afterEach(() => { cleanup(); localStorage.clear() })

  it('saves in place, then finalizes with an immediate Generate assessment action', async () => {
    const user = userEvent.setup()
    vi.mocked(saveBlueprintWorkingRevision).mockResolvedValue({ ...working, revision: 2,
      draft: { ...draft, name: 'Updated Java baseline' } })
    vi.mocked(finalizeBlueprintWorkingRevision).mockResolvedValue({
      ...draft, name: 'Updated Java baseline', blueprintId: 'blueprint-1', version: 1,
      createdAt: '2026-10-19T08:01:00Z',
    } satisfies BaselineBlueprint)
    vi.mocked(generateAssessmentCandidate).mockResolvedValue({
      assessmentVersionId: 'assessment-1', version: 1,
    } as ManagedAssessmentVersion)
    render(<LanguageProvider><MemoryRouter initialEntries={[`${root}/blueprints/revision`]}><Routes>
      <Route path="/ld-manager/baseline-assessments/:occupationId/blueprints/revision" element={<BlueprintRevisionPage />} />
      <Route path="*" element={<LocationProbe />} />
    </Routes></MemoryRouter></LanguageProvider>)

    const name = await screen.findByLabelText('Blueprint name')
    await user.clear(name)
    await user.type(name, 'Updated Java baseline')
    await user.click(screen.getByRole('button', { name: 'Save working revision' }))
    await waitFor(() => expect(saveBlueprintWorkingRevision).toHaveBeenCalledWith(
      'occ-java', 'working-1', 1, expect.objectContaining({ name: 'Updated Java baseline' }), expect.any(String),
    ))
    expect(screen.getByLabelText('Blueprint name')).toBeTruthy()
    expect(screen.queryByTestId('location')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Finalize version' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/configuration is finalized/)).toBeTruthy()
    await user.click(within(dialog).getByRole('button', { name: 'Create assessment now' }))
    await waitFor(() => expect(generateAssessmentCandidate).toHaveBeenCalledWith('occ-java', expect.any(String)))
    expect((await screen.findByTestId('location')).textContent).toBe(`${root}/assessments/assessment-1`)
  })
})

function LocationProbe() { return <span data-testid="location">{useLocation().pathname}</span> }
