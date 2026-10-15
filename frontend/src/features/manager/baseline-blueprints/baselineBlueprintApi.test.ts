import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createBlueprint,
  generateAssessment,
  publishAssessment,
  reviewAssessment,
  reviseBlueprint,
  type BlueprintDraft,
} from './baselineBlueprintApi'

const DRAFT: BlueprintDraft = {
  name: 'Java baseline',
  occupationId: null,
  occupationNameSnapshot: null,
  roles: [{
    roleId: 'role-java',
    roleNameSnapshot: 'Java Backend Engineer',
    enabled: true,
    easyScoreWeight: 0.3,
    mediumScoreWeight: 0.4,
    hardScoreWeight: 0.3,
    skills: [{
      microSkillId: 'skill-java',
      microSkillNameSnapshot: 'Java Core',
      easyQuestionCount: 1,
      mediumQuestionCount: 1,
      hardQuestionCount: 1,
    }],
  }],
}

describe('baselineBlueprintApi', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends trusted idempotency headers for create and expected version for revise', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(blueprintPayload(1)))
      .mockResolvedValueOnce(response(blueprintPayload(2)))
    vi.stubGlobal('fetch', fetchMock)

    await createBlueprint(DRAFT, 'create-key')
    await reviseBlueprint('blueprint/1', 1, { ...DRAFT, name: 'Revised' }, 'revise-key')

    expect(fetchMock).toHaveBeenNthCalledWith(1,
      '/api/v1/ld/baseline-blueprints', expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        headers: expect.objectContaining({ 'Idempotency-Key': 'create-key' }),
      }))
    const second = fetchMock.mock.calls[1]
    expect(second[0]).toBe('/api/v1/ld/baseline-blueprints/blueprint%2F1')
    expect(second[1]).toEqual(expect.objectContaining({
      method: 'PUT',
      credentials: 'same-origin',
      headers: expect.objectContaining({ 'Idempotency-Key': 'revise-key' }),
    }))
    expect(JSON.parse(second[1].body)).toMatchObject({ expectedLatestVersion: 1, name: 'Revised' })
  })

  it('preserves structured coverage shortages from API errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({
      code: 'INSUFFICIENT_QUESTION_COVERAGE',
      message: 'Published question coverage is insufficient',
      coverageShortages: [{
        roleId: 'role-java', microSkillId: 'skill-java', difficulty: 'HARD',
        required: 3, available: 1, missing: 2,
      }],
    }, 422)))

    await expect(createBlueprint(DRAFT, 'shortage-key')).rejects.toMatchObject({
      status: 422,
      code: 'INSUFFICIENT_QUESTION_COVERAGE',
      coverageShortages: [expect.objectContaining({ difficulty: 'HARD', missing: 2 })],
    })
  })

  it('parses generated manifest without exposing protected answer material', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(assessmentPayload({
      protectedKey: { correctOption: 'A' },
      answerKey: 'A',
    }))))

    const assessment = await generateAssessment('blueprint-1', 2, 'generate-key')

    expect(assessment.items).toHaveLength(1)
    expect(assessment.items[0]).toEqual(expect.objectContaining({
      prompt: 'What is encapsulation?', difficulty: 'EASY',
    }))
    expect(assessment.items[0]).not.toHaveProperty('protectedKey')
    expect(assessment.items[0]).not.toHaveProperty('answerKey')
  })

  it('reviews and publishes the exact content hash through distinct endpoints', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(assessmentPayload({ reviewedContentHash: 'a'.repeat(64) })))
      .mockResolvedValueOnce(response(assessmentPayload({
        reviewedContentHash: 'a'.repeat(64), publicationState: 'PUBLISHED',
      })))
    vi.stubGlobal('fetch', fetchMock)

    await reviewAssessment('assessment/1', 'a'.repeat(64))
    await publishAssessment('assessment/1', 'a'.repeat(64))

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/ld/baseline-blueprints/assessment-drafts/assessment%2F1/review',
      '/api/v1/ld/baseline-blueprints/assessment-drafts/assessment%2F1/publish',
    ])
    for (const [, init] of fetchMock.mock.calls) {
      expect(JSON.parse(init.body)).toEqual({ contentHash: 'a'.repeat(64) })
    }
  })

  it('rejects malformed publication state instead of accepting ambiguous UI state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(
      assessmentPayload({ publicationState: 'REVIEWED' }),
    )))

    await expect(generateAssessment('blueprint-1', 1, 'key'))
      .rejects.toThrow('Invalid publicationState')
  })
})

function blueprintPayload(version: number) {
  return {
    blueprintId: 'blueprint-1', version, name: DRAFT.name,
    occupationId: null, occupationNameSnapshot: null,
    createdAt: '2026-10-14T15:00:00Z',
    roles: DRAFT.roles.map((role) => ({ ...role, totalQuestionCount: 3 })),
  }
}

function assessmentPayload(overrides: Record<string, unknown> = {}) {
  const item = {
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
    ...overrides,
  }
  return {
    assessmentVersionId: 'assessment-version-1',
    assessmentId: 'assessment-1',
    version: 1,
    title: 'Java baseline',
    blueprintId: 'blueprint-1',
    blueprintVersion: 2,
    generationSeed: 42,
    createdAt: '2026-10-14T15:00:00Z',
    contentHash: 'a'.repeat(64),
    publicationState: overrides.publicationState ?? 'DRAFT',
    reviewedBy: overrides.reviewedContentHash ? 'actor-1' : null,
    reviewedAt: overrides.reviewedContentHash ? '2026-10-14T15:05:00Z' : null,
    reviewedContentHash: overrides.reviewedContentHash ?? null,
    items: [item],
  }
}

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
