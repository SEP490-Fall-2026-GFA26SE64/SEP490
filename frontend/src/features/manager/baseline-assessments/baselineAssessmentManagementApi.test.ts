import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BaselineAssessmentManagementApiError,
  getBaselineAssessmentWorkspace,
  saveBlueprintWorkingRevision,
  finalizeBlueprintWorkingRevision,
  generateAssessmentCandidate,
  listBaselineAssessmentOccupations,
  revealProtectedAssessmentAnswers,
} from './baselineAssessmentManagementApi'

describe('baselineAssessmentManagementApi', () => {
  afterEach(() => vi.restoreAllMocks())

  it('encodes landing filters and parses the management read model', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({
      items: [{
        occupationId: 'occ/java',
        occupationName: 'Java Engineer',
        latestBlueprintVersion: 2,
        pendingStage: 'ASSESSMENT_DRAFT',
        openAssessmentVersion: 3,
        openAssessmentState: 'DRAFT',
        activeAssessmentVersion: 2,
        lastUpdatedAt: '2026-10-17T08:00:00Z',
      }],
      page: 0,
      size: 10,
      total: 1,
    }))

    const result = await listBaselineAssessmentOccupations({
      search: ' Java ', status: 'ASSESSMENT_DRAFT', sort: 'name_desc', size: 10,
    })

    expect(result.items[0]).toMatchObject({ occupationId: 'occ/java', activeAssessmentVersion: 2 })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/ld/baseline-assessments?search=Java&status=ASSESSMENT_DRAFT&sort=name_desc&page=0&size=10',
      expect.objectContaining({ method: 'GET', credentials: 'same-origin' }),
    )
  })

  it('requests answers only through the dedicated no-store endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({
      assessmentVersionId: 'assessment/1',
      items: [{ itemVersionId: 'item-1', protectedKey: { correctOption: 1 } }],
    }))

    const revealed = await revealProtectedAssessmentAnswers('assessment/1')

    expect(revealed.items[0].protectedKey).toEqual({ correctOption: 1 })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/ld/baseline-assessments/assessment-versions/assessment%2F1/protected-answers',
      expect.objectContaining({
        method: 'GET', cache: 'no-store', credentials: 'same-origin',
        headers: { 'Cache-Control': 'no-store' },
      }),
    )
  })

  it('preserves server conflict codes for stale-command handling', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response(
      { code: 'STALE_ASSESSMENT_REVISION', message: 'Reload the draft' }, 409,
    ))

    await expect(listBaselineAssessmentOccupations()).rejects.toMatchObject({
      name: 'BaselineAssessmentManagementApiError',
      status: 409,
      code: 'STALE_ASSESSMENT_REVISION',
      message: 'Reload the draft',
    } satisfies Partial<BaselineAssessmentManagementApiError>)
  })

  it('loads a saved working revision when the server omits the derived role total', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response(workspace()))
    const loaded = await getBaselineAssessmentWorkspace('occ/java')
    expect(loaded.workingRevision?.draft.roles[0].totalQuestionCount).toBe(3)
    expect(loaded.workingRevision?.revision).toBe(2)
  })

  it('rejects a server role total that disagrees with its skill counts', async () => {
    const payload = workspace()
    Object.assign(payload.workingRevision.draft.roles[0], { totalQuestionCount: 4 })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response(payload))
    await expect(getBaselineAssessmentWorkspace('occ/java')).rejects.toThrow('Invalid totalQuestionCount')
  })

  it('sends revision and idempotency contracts through Save, Finalize and Generate', async () => {
    const current = workspace().workingRevision
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response({ ...current, revision: 3 }))
      .mockResolvedValueOnce(response({ blueprintId: 'blueprint-1', version: 1,
        name: current.draft.name, occupationId: 'occ/java', occupationNameSnapshot: 'Java Engineer',
        createdAt: '2026-10-19T08:01:00Z', roles: current.draft.roles }))
      .mockResolvedValueOnce(response({ assessmentVersionId: 'assessment-1', assessmentId: 'series-1',
        version: 1, title: 'Java assessment', blueprintId: 'blueprint-1', blueprintVersion: 1,
        createdAt: '2026-10-19T08:02:00Z', contentHash: 'a'.repeat(64), draftRevision: 1,
        publicationState: 'DRAFT', reviewedAt: null, items: [] }))
    await saveBlueprintWorkingRevision('occ/java', 'working-1', 2, current.draft, 'save-key')
    await finalizeBlueprintWorkingRevision('occ/java', 'working-1', 3, 'finalize-key')
    await generateAssessmentCandidate('occ/java', 'generate-key')
    const [, save] = fetchMock.mock.calls[0]
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/ld/baseline-assessments/occupations/occ%2Fjava/blueprint-working-revisions/working-1',
      '/api/v1/ld/baseline-assessments/occupations/occ%2Fjava/blueprint-working-revisions/working-1/finalize',
      '/api/v1/ld/baseline-assessments/occupations/occ%2Fjava/assessment-drafts',
    ])
    expect(save).toEqual(expect.objectContaining({ method: 'PUT',
      headers: expect.objectContaining({ 'Idempotency-Key': 'save-key' }) }))
    expect(JSON.parse(String(save?.body))).toMatchObject({ expectedRevision: 2, name: 'Java baseline' })
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ method: 'POST',
      headers: expect.objectContaining({ 'Idempotency-Key': 'finalize-key' }) }))
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ expectedRevision: 3 })
    expect(fetchMock.mock.calls[2][1]).toEqual(expect.objectContaining({ method: 'POST',
      headers: expect.objectContaining({ 'Idempotency-Key': 'generate-key' }) }))
  })
})

function workspace() {
  return {
    occupationId: 'occ/java', occupationName: 'Java Engineer',
    workingRevision: {
      workingRevisionId: 'working-1', blueprintId: 'blueprint-1', baseVersion: null,
      revision: 2, updatedAt: '2026-10-19T08:00:00Z',
      draft: { name: 'Java baseline', occupationId: 'occ/java', occupationNameSnapshot: 'Java Engineer', roles: [{
        roleId: 'role-1', roleNameSnapshot: 'Developer', enabled: true,
        easyScoreWeight: 0.2, mediumScoreWeight: 0.3, hardScoreWeight: 0.5,
        skills: [{ microSkillId: 'skill-1', microSkillNameSnapshot: 'Java Core',
          easyQuestionCount: 1, mediumQuestionCount: 1, hardQuestionCount: 1 }],
      }] },
    },
    blueprintVersions: [], assessmentVersions: [],
  }
}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
