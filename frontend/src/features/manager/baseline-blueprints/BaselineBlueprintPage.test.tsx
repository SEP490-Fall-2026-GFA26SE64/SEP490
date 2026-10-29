import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageSwitcher } from '../../../shared/components/ui/LanguageSwitcher'
import { LanguageProvider } from '../../../shared/i18n/LanguageContext'
import { BaselineBlueprintPage } from './BaselineBlueprintPage'
import {
  BaselineBlueprintApiError,
  createBlueprint,
  generateAssessment,
  getLatestBlueprintByOccupation,
  getOccupation,
  getOccupationCapacity,
  listOccupations,
  publishAssessment,
  reviewAssessment,
  reviseBlueprint,
  type AssessmentDraft,
  type BaselineBlueprint,
  type BlueprintCapacity,
} from './baselineBlueprintApi'
import {
  developmentBaselineOccupation,
  developmentBaselineOccupations,
  developmentBaselineRoles,
} from '../../../../test-fixtures/legacyBaselineCatalog'

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
    getOccupationCapacity: vi.fn(),
    getLatestBlueprintByOccupation: vi.fn(),
    generateAssessment: vi.fn(),
    reviewAssessment: vi.fn(),
    publishAssessment: vi.fn(),
  }
})

describe('BaselineBlueprintPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('app_language', 'en')
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-0000-0000-000000000901',
    )
    vi.mocked(listOccupations).mockResolvedValue(developmentBaselineOccupations())
    vi.mocked(getOccupation).mockResolvedValue(
      developmentBaselineOccupation('10000000-0000-0000-0000-000000000001')!,
    )
    vi.mocked(getOccupationCapacity).mockResolvedValue(capacityPayload())
    vi.mocked(getLatestBlueprintByOccupation).mockRejectedValue(
      new BaselineBlueprintApiError(404, 'NOT_FOUND', 'No blueprint'),
    )
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

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

    renderPage()

    await configureFirstSkill(user)

    await user.click(screen.getByRole('button', { name: 'Save blueprint' }))
    await waitFor(() => expect(createBlueprint).toHaveBeenCalledOnce())
    expect(createBlueprint).toHaveBeenCalledWith(expect.objectContaining({
      occupationId: '10000000-0000-0000-0000-000000000001',
      occupationNameSnapshot: 'Software Engineering',
      roles: expect.arrayContaining([
        expect.objectContaining({
          roleId: '20000000-0000-0000-0000-000000000001',
          easyScoreWeight: 0.2,
          mediumScoreWeight: 0.3,
          hardScoreWeight: 0.5,
        }),
        expect.objectContaining({
          roleId: '20000000-0000-0000-0000-000000000002',
          enabled: false,
          easyScoreWeight: 0.3334,
          mediumScoreWeight: 0.3333,
          hardScoreWeight: 0.3333,
        }),
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

    renderPage()
    await configureFirstSkill(user)
    await user.click(screen.getByRole('button', { name: 'Save blueprint' }))

    expect(await screen.findByText('Question coverage shortages')).toBeTruthy()
    expect(screen.getByText('Missing: 2')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Generate assessment' }) as HTMLButtonElement).disabled)
      .toBe(true)
    expect(generateAssessment).not.toHaveBeenCalled()
  })

  it('keeps the unsaved draft while capacity loading is retried', async () => {
    const user = userEvent.setup()
    vi.mocked(getOccupationCapacity)
      .mockRejectedValueOnce(new Error('capacity offline'))
      .mockResolvedValueOnce(capacityPayload())

    renderPage()

    expect(await screen.findByRole('button', { name: 'Retry capacity' })).toBeTruthy()
    const name = screen.getByLabelText('Blueprint name')
    await user.clear(name)
    await user.type(name, 'Draft retained across retry')
    expect((screen.getByRole('button', { name: 'Save blueprint' }) as HTMLButtonElement).disabled)
      .toBe(true)

    await user.click(screen.getByRole('button', { name: 'Retry capacity' }))

    expect(await screen.findByText('Question capacity loaded')).toBeTruthy()
    expect((screen.getByLabelText('Blueprint name') as HTMLInputElement).value)
      .toBe('Draft retained across retry')
    expect(getOccupationCapacity).toHaveBeenCalledTimes(2)
  })

  it('shows every Occupation role without include checkboxes and marks zero roles excluded', async () => {
    renderPage()

    expect(await screen.findByText('Java Backend Developer P3')).toBeTruthy()
    expect(screen.getByText('Platform Engineer P4')).toBeTruthy()
    expect(screen.getAllByText('0 questions · not included')).toHaveLength(2)
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.getByText('All roles remain visible in this blueprint.')).toBeTruthy()
  })

  it('applies a total explicitly, keeps manual edits local and clears the role with total zero', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Java Backend Developer P3')
    const role = roleContainer('Java Backend Developer P3')
    const totalInput = within(role).getByLabelText('Total questions for this role')
    await user.clear(totalInput)
    await user.type(totalInput, '17')
    expect(within(role).getByText('0 questions · not included')).toBeTruthy()

    await user.click(within(role).getByRole('button', { name: 'Apply and distribute' }))
    expect(within(role).getByText('17 questions')).toBeTruthy()

    const javaCore = within(role).getByText('Java Core').closest('details')!
    const springBoot = within(role).getByText('Spring Boot').closest('details')!
    await user.click(within(javaCore).getByText('Java Core'))
    await user.click(within(springBoot).getByText('Spring Boot'))
    const springBefore = within(springBoot).getAllByRole('spinbutton')
      .map((input) => (input as HTMLInputElement).value)

    const javaEasy = within(javaCore).getAllByRole('spinbutton')[0]
    await user.clear(javaEasy)
    await user.type(javaEasy, '3')
    await user.tab()
    expect(within(role).getByText('18 questions')).toBeTruthy()
    expect(within(springBoot).getAllByRole('spinbutton')
      .map((input) => (input as HTMLInputElement).value))
      .toEqual(springBefore)

    await user.clear(totalInput)
    await user.type(totalInput, '0')
    await user.click(within(role).getByRole('button', { name: 'Apply and distribute' }))
    expect(within(role).getByText('0 questions · not included')).toBeTruthy()
    expect((within(javaCore).getAllByRole('spinbutton')[0] as HTMLInputElement).value).toBe('0')
    for (const difficulty of ['Easy', 'Medium', 'Hard']) {
      expect((within(role).getByLabelText(`${difficulty} score weight (%)`) as HTMLInputElement).value)
        .toBe('0')
    }
  })

  it('loads valid decimal weights as percentages', async () => {
    const saved = blueprintPayload()
    vi.mocked(getLatestBlueprintByOccupation).mockResolvedValue(saved)

    renderPage()

    await screen.findByText('Java Backend Developer P3')
    const role = roleContainer('Java Backend Developer P3')
    expect((within(role).getByLabelText('Easy score weight (%)') as HTMLInputElement).value)
      .toBe('20')
  })

  it('switches English and Vietnamese without losing unsaved form state or reloading catalog', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Java Backend Developer P3')
    const name = screen.getByLabelText('Blueprint name')
    await user.clear(name)
    await user.type(name, 'Unsaved custom blueprint')
    const total = within(roleContainer('Java Backend Developer P3'))
      .getByLabelText('Total questions for this role')
    await user.clear(total)
    await user.type(total, '8')

    await user.click(screen.getByRole('button', { name: 'VI' }))
    expect(screen.getByRole('heading', { name: '1. Chọn nghề nghiệp' })).toBeTruthy()
    expect((screen.getByLabelText('Tên cấu hình') as HTMLInputElement).value)
      .toBe('Unsaved custom blueprint')
    expect((within(roleContainer('Java Backend Developer P3'))
      .getByLabelText('Tổng số câu cho vai trò này') as HTMLInputElement).value).toBe('8')
    expect(vi.mocked(listOccupations)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(getOccupation)).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'EN' }))
    expect(screen.getByRole('heading', { name: '1. Select Occupation' })).toBeTruthy()
  })

  it('keeps multiple role panels open and collapses them independently', async () => {
    const user = userEvent.setup()
    renderPage()

    const javaTrigger = await screen.findByRole('button', { name: /Java Backend Developer P3/ })
    const platformTrigger = screen.getByRole('button', { name: /Platform Engineer P4/ })
    expect(javaTrigger.getAttribute('aria-expanded')).toBe('true')
    expect(platformTrigger.getAttribute('aria-expanded')).toBe('false')

    await user.click(platformTrigger)
    expect(javaTrigger.getAttribute('aria-expanded')).toBe('true')
    expect(platformTrigger.getAttribute('aria-expanded')).toBe('true')

    await user.click(javaTrigger)
    expect(javaTrigger.getAttribute('aria-expanded')).toBe('false')
    expect(platformTrigger.getAttribute('aria-expanded')).toBe('true')
  })
})

async function configureFirstSkill(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText('Java Backend Developer P3')
  const role = roleContainer('Java Backend Developer P3')
  const total = within(role).getByLabelText('Total questions for this role')
  await user.clear(total)
  await user.type(total, '15')
  await user.click(within(role).getByRole('button', { name: 'Apply and distribute' }))
}

function renderPage() {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <LanguageSwitcher />
        <BaselineBlueprintPage />
      </LanguageProvider>
    </MemoryRouter>,
  )
}

function roleContainer(roleName: string) {
  const role = screen.getByRole('button', { name: new RegExp(roleName) }).closest('[data-value]')
  expect(role).not.toBeNull()
  return role as HTMLElement
}

function blueprintPayload(): BaselineBlueprint {
  const roles = developmentBaselineRoles().map((role, roleIndex) => ({
    ...role,
    enabled: roleIndex === 0,
    totalQuestionCount: roleIndex === 0 ? role.skills.length * 3 : 0,
    easyScoreWeight: roleIndex === 0 ? 0.2 : 0.3334,
    mediumScoreWeight: roleIndex === 0 ? 0.3 : 0.3333,
    hardScoreWeight: roleIndex === 0 ? 0.5 : 0.3333,
    skills: role.skills.map((skill) => ({
      ...skill,
      easyQuestionCount: roleIndex === 0 ? 1 : 0,
      mediumQuestionCount: roleIndex === 0 ? 1 : 0,
      hardQuestionCount: roleIndex === 0 ? 1 : 0,
    })),
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

function capacityPayload(): BlueprintCapacity {
  const occupation = developmentBaselineOccupation('10000000-0000-0000-0000-000000000001')!
  return {
    occupationId: occupation.id,
    catalogVersion: occupation.catalogVersion,
    coverageAsOf: '2026-10-16T08:00:00Z',
    roles: occupation.roles.map((role) => ({
      roleId: role.id,
      skills: role.skills.map((skill) => ({
        microSkillId: skill.id,
        availableEasy: 10,
        availableMedium: 10,
        availableHard: 10,
      })),
    })),
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
