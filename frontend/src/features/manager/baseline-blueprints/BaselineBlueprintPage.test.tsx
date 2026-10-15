import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BaselineBlueprintPage } from './BaselineBlueprintPage'
import {
  BaselineBlueprintApiError,
  createBlueprint,
  generateAssessment,
  publishAssessment,
  reviewAssessment,
  reviseBlueprint,
  type AssessmentDraft,
  type BaselineBlueprint,
} from './baselineBlueprintApi'
import { developmentBaselineRoles } from './developmentBaselineCatalog'

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
    generateAssessment: vi.fn(),
    reviewAssessment: vi.fn(),
    publishAssessment: vi.fn(),
  }
})

describe('BaselineBlueprintPage', () => {
  beforeEach(() => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-0000-0000-000000000901',
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

    await user.click(screen.getByRole('button', { name: 'Save blueprint' }))
    await waitFor(() => expect(createBlueprint).toHaveBeenCalledOnce())
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
    await user.click(screen.getByRole('button', { name: 'Save blueprint' }))

    expect(await screen.findByText('Question coverage shortages')).toBeTruthy()
    expect(screen.getByText('Missing: 2')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Generate assessment' }) as HTMLButtonElement).disabled)
      .toBe(true)
    expect(generateAssessment).not.toHaveBeenCalled()
  })
})

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
    occupationId: null,
    occupationNameSnapshot: null,
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
