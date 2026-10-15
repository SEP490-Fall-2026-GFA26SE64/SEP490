import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BaselineBlueprintPage } from './BaselineBlueprintPage'
import {
  BaselineBlueprintApiError,
  createBlueprint,
  generateAssessment,
  getLatestBlueprintByOccupation,
  getOccupation,
  listOccupations,
  publishAssessment,
  reviewAssessment,
  reviseBlueprint,
  type AssessmentDraft,
  type BaselineBlueprint,
} from './baselineBlueprintApi'
import {
  developmentBaselineOccupation,
  developmentBaselineOccupations,
  developmentBaselineRoles,
} from './developmentBaselineCatalog'

const toast = vi.fn()

vi.mock('../../../shared/layouts/WorkspaceLayout', () => ({
  WorkspaceLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('../../../shared/hooks/useToast', () => ({
  useToast: () => ({ toast }),
}))

vi.mock('./baselineBlueprintApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('./baselineBlueprintApi')>()
  return {
    ...original,
    createBlueprint: vi.fn(),
    reviseBlueprint: vi.fn(),
    listOccupations: vi.fn(),
    getOccupation: vi.fn(),
    getLatestBlueprintByOccupation: vi.fn(),
    generateAssessment: vi.fn(),
    reviewAssessment: vi.fn(),
    publishAssessment: vi.fn(),
  }
})

describe('BaselineBlueprintPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-0000-0000-000000000901',
    )
    vi.mocked(listOccupations).mockResolvedValue(developmentBaselineOccupations())
    vi.mocked(getOccupation).mockResolvedValue(
      developmentBaselineOccupation('10000000-0000-0000-0000-000000000001')!,
    )
    vi.mocked(getLatestBlueprintByOccupation).mockRejectedValue(
      new BaselineBlueprintApiError(404, 'NOT_FOUND', 'No blueprint'),
    )
  })

  afterEach(cleanup)

  it('drives save, generate, exact-hash review and publish in order', async () => {
    const user = userEvent.setup()
    const blueprint = blueprintPayload()
    const draft = assessmentPayload()
    vi.mocked(createBlueprint).mockResolvedValue(blueprint)
    vi.mocked(generateAssessment).mockResolvedValue(draft)
    vi.mocked(reviewAssessment).mockResolvedValue({
      ...draft,
      reviewedBy: 'actor-1',
      reviewedAt: '2026-10-14T15:05:00Z',
      reviewedContentHash: draft.contentHash,
    })
    vi.mocked(publishAssessment).mockResolvedValue({
      ...draft,
      reviewedBy: 'actor-1',
      reviewedAt: '2026-10-14T15:05:00Z',
      reviewedContentHash: draft.contentHash,
      publicationState: 'PUBLISHED',
    })

    render(<BaselineBlueprintPage />)

    await configureFirstSkill(user)

    await user.click(screen.getByRole('button', { name: 'Save blueprint' }))
    await waitFor(() => expect(createBlueprint).toHaveBeenCalledOnce())
    expect(createBlueprint).toHaveBeenCalledWith(expect.objectContaining({
      occupationId: '10000000-0000-0000-0000-000000000001',
      occupationNameSnapshot: 'Software Engineering',
      roles: expect.arrayContaining([
        expect.objectContaining({ roleId: '20000000-0000-0000-0000-000000000002', enabled: false }),
      ]),
    }), expect.any(String))
    expect(screen.getByText('Catalog and coverage validated')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Generate assessment' }))
    await screen.findByText('Assessment draft v1')
    expect(screen.getByText('What is encapsulation?')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Review this hash' }))
    await waitFor(() => expect(reviewAssessment).toHaveBeenCalledWith(
      draft.assessmentVersionId, draft.contentHash,
    ))
    expect(screen.getByText('REVIEWED')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Publish' }))
    await waitFor(() => expect(publishAssessment).toHaveBeenCalledWith(
      draft.assessmentVersionId, draft.contentHash,
    ))
    expect(screen.getAllByText('PUBLISHED').length).toBeGreaterThan(0)
    expect(reviseBlueprint).not.toHaveBeenCalled()
  })

  it('shows actionable coverage shortage and leaves generation disabled', async () => {
    const user = userEvent.setup()
    vi.mocked(createBlueprint).mockRejectedValue(new BaselineBlueprintApiError(
      422,
      'INSUFFICIENT_QUESTION_COVERAGE',
      'Published question coverage is insufficient',
      [{
        roleId: 'role-java',
        microSkillId: 'skill-java',
        difficulty: 'HARD',
        required: 3,
        available: 1,
        missing: 2,
      }],
    ))

    render(<BaselineBlueprintPage />)
    await configureFirstSkill(user)
    await user.click(screen.getByRole('button', { name: 'Save blueprint' }))

    expect(await screen.findByText('Question coverage shortages')).toBeTruthy()
    expect(screen.getByText('Missing: 2')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Generate assessment' }) as HTMLButtonElement).disabled)
      .toBe(true)
    expect(generateAssessment).not.toHaveBeenCalled()
  })

  it('shows every Occupation role without include checkboxes and marks zero roles excluded', async () => {
    render(<BaselineBlueprintPage />)

    expect(await screen.findByText('Java Backend Developer P3')).toBeTruthy()
    expect(screen.getByText('Platform Engineer P4')).toBeTruthy()
    expect(screen.getAllByText('0 questions · not included')).toHaveLength(2)
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.getByText('All roles remain visible in this blueprint.')).toBeTruthy()
  })
})

async function configureFirstSkill(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText('Java Backend Developer P3')
  const skillDetails = screen.getByText('Java Core').closest('details')
  expect(skillDetails).not.toBeNull()
  await user.click(within(skillDetails!).getByText('Java Core'))
  for (const difficulty of ['Easy', 'Medium', 'Hard']) {
    const input = within(skillDetails!).getByLabelText(new RegExp(`^${difficulty} questions`, 'i'))
    await user.clear(input)
    await user.type(input, '1')
  }
}

function blueprintPayload(): BaselineBlueprint {
  const roles = developmentBaselineRoles().map((role) => ({
    ...role,
    totalQuestionCount: role.skills.reduce((sum, skill) => sum
      + skill.easyQuestionCount + skill.mediumQuestionCount + skill.hardQuestionCount, 0),
  }))
  return {
    blueprintId: 'blueprint-1',
    version: 1,
    name: 'Development baseline assessment',
    occupationId: '10000000-0000-0000-0000-000000000001',
    occupationNameSnapshot: 'Software Engineering',
    createdAt: '2026-10-14T15:00:00Z',
    roles,
  }
}

function assessmentPayload(): AssessmentDraft {
  return {
    assessmentVersionId: 'assessment-version-1',
    assessmentId: 'assessment-1',
    version: 1,
    title: 'Development baseline assessment',
    blueprintId: 'blueprint-1',
    blueprintVersion: 1,
    generationSeed: 42,
    createdAt: '2026-10-14T15:01:00Z',
    contentHash: 'a'.repeat(64),
    publicationState: 'DRAFT',
    reviewedBy: null,
    reviewedAt: null,
    reviewedContentHash: null,
    items: [{
      position: 1,
      itemVersionId: 'item-version-1',
      roleId: 'role-java',
      roleNameSnapshot: 'Java Backend Engineer',
      microSkillId: 'skill-java',
      microSkillNameSnapshot: 'Java Core',
      difficulty: 'EASY',
      scoringWeight: 0.3,
      prompt: 'What is encapsulation?',
      responseSchema: { options: ['A', 'B'] },
    }],
  }
}
