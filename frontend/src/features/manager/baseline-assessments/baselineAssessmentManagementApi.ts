import {
  parseBlueprint,
  parseBlueprintRole,
  type BaselineBlueprint,
  type BlueprintDraft,
} from '../baseline-blueprints/baselineBlueprintApi'

export type PendingStage =
  | 'NONE'
  | 'WORKING_REVISION'
  | 'BLUEPRINT_CANDIDATE'
  | 'ASSESSMENT_DRAFT'
  | 'ASSESSMENT_REVIEWED'

export type OpenAssessmentState = 'DRAFT' | 'REVIEWED'

export type BaselineAssessmentStatus =
  | ''
  | PendingStage
  | OpenAssessmentState
  | 'ACTIVE'
  | 'NOT_CONFIGURED'

export interface BaselineAssessmentOccupation {
  occupationId: string
  occupationName: string
  latestBlueprintVersion: number | null
  pendingStage: PendingStage
  openAssessmentVersion: number | null
  openAssessmentState: OpenAssessmentState | null
  activeAssessmentVersion: number | null
  lastUpdatedAt: string | null
}

export interface BaselineAssessmentOccupationPage {
  items: BaselineAssessmentOccupation[]
  page: number
  size: number
  total: number
}

export interface ListBaselineAssessmentOccupationsQuery {
  search?: string
  status?: BaselineAssessmentStatus
  sort?: 'name_asc' | 'name_desc'
  page?: number
  size?: number
  signal?: AbortSignal
}

export interface BaselineAssessmentWorkspace {
  occupationId: string
  occupationName: string
  workingRevision: BlueprintWorkingRevision | null
  blueprintVersions: BlueprintVersionSummary[]
  assessmentVersions: AssessmentVersionSummary[]
}

export interface BlueprintWorkingRevision {
  workingRevisionId: string
  blueprintId: string
  baseVersion: number | null
  revision: number
  draft: BlueprintDraft
  updatedAt: string
}

export interface BlueprintVersionSummary {
  blueprintId: string
  version: number
  name: string
  projection: 'ACTIVE_SOURCE' | 'DRAFT_SOURCE' | 'CANDIDATE' | 'HISTORICAL'
  createdAt: string
}

export interface AssessmentVersionSummary {
  assessmentVersionId: string
  version: number
  blueprintVersion: number
  effectiveState: string
  contentHash: string
  createdAt: string
}

export interface ManagedAssessmentVersion {
  assessmentVersionId: string
  assessmentId: string
  version: number
  title: string
  blueprintId: string
  blueprintVersion: number
  createdAt: string
  contentHash: string
  draftRevision: number
  publicationState: 'DRAFT' | 'PUBLISHED'
  reviewedAt: string | null
  items: ManagedAssessmentItem[]
}

export interface ManagedAssessmentItem {
  position: number
  itemVersionId: string
  roleId: string
  roleNameSnapshot: string
  microSkillId: string
  microSkillNameSnapshot: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  scoringWeight: number
  prompt: string
  responseSchema: unknown
}

export interface ProtectedAssessmentAnswers {
  assessmentVersionId: string
  items: Array<{ itemVersionId: string; protectedKey: unknown }>
}

export class BaselineAssessmentManagementApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'BaselineAssessmentManagementApiError'
    this.status = status
    this.code = code
  }
}

const BASE_URL = '/api/v1/ld/baseline-assessments'

export async function listBaselineAssessmentOccupations(
  query: ListBaselineAssessmentOccupationsQuery = {},
): Promise<BaselineAssessmentOccupationPage> {
  const parameters = new URLSearchParams({
    search: query.search?.trim() ?? '',
    status: query.status ?? '',
    sort: query.sort ?? 'name_asc',
    page: String(query.page ?? 0),
    size: String(query.size ?? 20),
  })
  const response = await fetch(`${BASE_URL}?${parameters.toString()}`, {
    method: 'GET',
    credentials: 'same-origin',
    signal: query.signal,
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error = isRecord(payload) ? payload : {}
    throw new BaselineAssessmentManagementApiError(
      response.status,
      stringOr(error.code, 'REQUEST_FAILED'),
      stringOr(error.message, `Baseline assessment request failed (${response.status})`),
    )
  }
  return parsePage(payload)
}

export async function getBaselineAssessmentWorkspace(
  occupationId: string,
  signal?: AbortSignal,
): Promise<BaselineAssessmentWorkspace> {
  return parseWorkspace(await requestJson(
    `${BASE_URL}/occupations/${encodeURIComponent(occupationId)}`,
    { method: 'GET', signal },
  ))
}

export async function startBlueprintWorkingRevision(
  occupationId: string,
  idempotencyKey: string,
): Promise<BlueprintWorkingRevision> {
  return parseWorkingRevision(await requestJson(
    `${BASE_URL}/occupations/${encodeURIComponent(occupationId)}/blueprint-working-revisions`,
    { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey } },
  ))
}

export async function saveBlueprintWorkingRevision(
  occupationId: string,
  workingRevisionId: string,
  expectedRevision: number,
  draft: BlueprintDraft,
  idempotencyKey: string,
): Promise<BlueprintWorkingRevision> {
  return parseWorkingRevision(await requestJson(
    `${BASE_URL}/occupations/${encodeURIComponent(occupationId)}/blueprint-working-revisions/${encodeURIComponent(workingRevisionId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ expectedRevision, ...draft }),
    },
  ))
}

export async function finalizeBlueprintWorkingRevision(
  occupationId: string,
  workingRevisionId: string,
  expectedRevision: number,
  idempotencyKey: string,
): Promise<BaselineBlueprint> {
  return parseBlueprint(await requestJson(
    `${BASE_URL}/occupations/${encodeURIComponent(occupationId)}/blueprint-working-revisions/${encodeURIComponent(workingRevisionId)}/finalize`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ expectedRevision }),
    },
  ))
}

export async function abandonPendingBlueprintChange(
  occupationId: string,
  reason: string,
): Promise<BaselineAssessmentWorkspace> {
  return parseWorkspace(await requestJson(
    `${BASE_URL}/occupations/${encodeURIComponent(occupationId)}/abandon-pending-change`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
  ))
}

export async function generateAssessmentCandidate(
  occupationId: string,
  idempotencyKey: string,
): Promise<ManagedAssessmentVersion> {
  return parseManagedAssessment(await requestJson(
    `${BASE_URL}/occupations/${encodeURIComponent(occupationId)}/assessment-drafts`,
    { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey } },
  ))
}

export async function getManagedAssessmentVersion(
  assessmentVersionId: string,
  signal?: AbortSignal,
): Promise<ManagedAssessmentVersion> {
  return parseManagedAssessment(await requestJson(
    `${BASE_URL}/assessment-versions/${encodeURIComponent(assessmentVersionId)}`,
    { method: 'GET', signal },
  ))
}

export async function revealProtectedAssessmentAnswers(
  assessmentVersionId: string,
): Promise<ProtectedAssessmentAnswers> {
  const payload = record(await requestJson(
    `${BASE_URL}/assessment-versions/${encodeURIComponent(assessmentVersionId)}/protected-answers`,
    { method: 'GET', cache: 'no-store', headers: { 'Cache-Control': 'no-store' } },
  ))
  return {
    assessmentVersionId: requiredString(payload.assessmentVersionId, 'assessmentVersionId'),
    items: array(payload.items, 'items').map((value) => {
      const item = record(value)
      return {
        itemVersionId: requiredString(item.itemVersionId, 'itemVersionId'),
        protectedKey: item.protectedKey,
      }
    }),
  }
}

export async function editAssessmentManifest(
  assessmentVersionId: string,
  expectedRevision: number,
  title: string,
  orderedItemVersionIds: string[],
  idempotencyKey: string,
): Promise<ManagedAssessmentVersion> {
  return parseManagedAssessment(await requestJson(
    `${BASE_URL}/assessment-versions/${encodeURIComponent(assessmentVersionId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ expectedRevision, title, orderedItemVersionIds }),
    },
  ))
}

export async function reviewAssessmentCandidate(
  assessmentVersionId: string,
  contentHash: string,
): Promise<ManagedAssessmentVersion> {
  return assessmentStateCommand(assessmentVersionId, 'review', contentHash)
}

export async function publishAssessmentCandidate(
  assessmentVersionId: string,
  contentHash: string,
): Promise<ManagedAssessmentVersion> {
  return assessmentStateCommand(assessmentVersionId, 'publish', contentHash)
}

export async function replaceReviewedAssessmentCandidate(
  assessmentVersionId: string,
  idempotencyKey: string,
): Promise<ManagedAssessmentVersion> {
  return cloneAssessment(assessmentVersionId, 'replacement-draft', idempotencyKey)
}

export async function restoreHistoricalAssessment(
  assessmentVersionId: string,
  idempotencyKey: string,
): Promise<ManagedAssessmentVersion> {
  return cloneAssessment(assessmentVersionId, 'restore', idempotencyKey)
}

export async function disableActiveAssessment(
  assessmentVersionId: string,
  reason: string,
): Promise<BaselineAssessmentWorkspace> {
  return parseWorkspace(await requestJson(
    `${BASE_URL}/assessment-versions/${encodeURIComponent(assessmentVersionId)}/disable`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) },
  ))
}

async function assessmentStateCommand(
  assessmentVersionId: string,
  action: 'review' | 'publish',
  contentHash: string,
) {
  return parseManagedAssessment(await requestJson(
    `${BASE_URL}/assessment-versions/${encodeURIComponent(assessmentVersionId)}/${action}`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentHash }) },
  ))
}

async function cloneAssessment(
  assessmentVersionId: string,
  action: 'replacement-draft' | 'restore',
  idempotencyKey: string,
) {
  return parseManagedAssessment(await requestJson(
    `${BASE_URL}/assessment-versions/${encodeURIComponent(assessmentVersionId)}/${action}`,
    { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey } },
  ))
}

async function requestJson(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, { ...init, credentials: 'same-origin' })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error = isRecord(payload) ? payload : {}
    throw new BaselineAssessmentManagementApiError(
      response.status,
      stringOr(error.code, 'REQUEST_FAILED'),
      stringOr(error.message, `Baseline assessment request failed (${response.status})`),
    )
  }
  return payload
}

function parsePage(value: unknown): BaselineAssessmentOccupationPage {
  const page = record(value)
  return {
    items: array(page.items, 'items').map(parseOccupation),
    page: nonNegativeInteger(page.page, 'page'),
    size: positiveInteger(page.size, 'size'),
    total: nonNegativeInteger(page.total, 'total'),
  }
}

function parseWorkspace(value: unknown): BaselineAssessmentWorkspace {
  const workspace = record(value)
  return {
    occupationId: requiredString(workspace.occupationId, 'occupationId'),
    occupationName: requiredString(workspace.occupationName, 'occupationName'),
    workingRevision: workspace.workingRevision === null
      ? null
      : parseWorkingRevision(workspace.workingRevision),
    blueprintVersions: array(workspace.blueprintVersions, 'blueprintVersions').map((value) => {
      const item = record(value)
      const projection = requiredString(item.projection, 'projection')
      if (!['ACTIVE_SOURCE', 'DRAFT_SOURCE', 'CANDIDATE', 'HISTORICAL'].includes(projection)) {
        throw new Error('Invalid Blueprint projection')
      }
      return {
        blueprintId: requiredString(item.blueprintId, 'blueprintId'),
        version: positiveInteger(item.version, 'version'),
        name: requiredString(item.name, 'name'),
        projection: projection as BlueprintVersionSummary['projection'],
        createdAt: requiredInstant(item.createdAt, 'createdAt'),
      }
    }),
    assessmentVersions: array(workspace.assessmentVersions, 'assessmentVersions').map((value) => {
      const item = record(value)
      return {
        assessmentVersionId: requiredString(item.assessmentVersionId, 'assessmentVersionId'),
        version: positiveInteger(item.version, 'version'),
        blueprintVersion: positiveInteger(item.blueprintVersion, 'blueprintVersion'),
        effectiveState: requiredString(item.effectiveState, 'effectiveState'),
        contentHash: requiredString(item.contentHash, 'contentHash'),
        createdAt: requiredInstant(item.createdAt, 'createdAt'),
      }
    }),
  }
}

function parseWorkingRevision(value: unknown): BlueprintWorkingRevision {
  const working = record(value)
  const draft = record(working.draft)
  return {
    workingRevisionId: requiredString(working.workingRevisionId, 'workingRevisionId'),
    blueprintId: requiredString(working.blueprintId, 'blueprintId'),
    baseVersion: optionalPositiveInteger(working.baseVersion, 'baseVersion'),
    revision: positiveInteger(working.revision, 'revision'),
    draft: {
      name: requiredString(draft.name, 'draft.name'),
      occupationId: optionalString(draft.occupationId, 'draft.occupationId'),
      occupationNameSnapshot: optionalString(draft.occupationNameSnapshot, 'draft.occupationNameSnapshot'),
      roles: array(draft.roles, 'draft.roles').map(parseBlueprintRole),
    },
    updatedAt: requiredInstant(working.updatedAt, 'updatedAt'),
  }
}

function parseManagedAssessment(value: unknown): ManagedAssessmentVersion {
  const assessment = record(value)
  const publicationState = requiredString(assessment.publicationState, 'publicationState')
  if (publicationState !== 'DRAFT' && publicationState !== 'PUBLISHED') {
    throw new Error('Invalid assessment publication state')
  }
  return {
    assessmentVersionId: requiredString(assessment.assessmentVersionId, 'assessmentVersionId'),
    assessmentId: requiredString(assessment.assessmentId, 'assessmentId'),
    version: positiveInteger(assessment.version, 'version'),
    title: requiredString(assessment.title, 'title'),
    blueprintId: requiredString(assessment.blueprintId, 'blueprintId'),
    blueprintVersion: positiveInteger(assessment.blueprintVersion, 'blueprintVersion'),
    createdAt: requiredInstant(assessment.createdAt, 'createdAt'),
    contentHash: requiredString(assessment.contentHash, 'contentHash'),
    draftRevision: positiveInteger(assessment.draftRevision, 'draftRevision'),
    publicationState,
    reviewedAt: optionalInstant(assessment.reviewedAt, 'reviewedAt'),
    items: array(assessment.items, 'items').map((value) => {
      const item = record(value)
      const difficulty = requiredString(item.difficulty, 'difficulty')
      if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) throw new Error('Invalid difficulty')
      return {
        position: positiveInteger(item.position, 'position'),
        itemVersionId: requiredString(item.itemVersionId, 'itemVersionId'),
        roleId: requiredString(item.roleId, 'roleId'),
        roleNameSnapshot: requiredString(item.roleNameSnapshot, 'roleNameSnapshot'),
        microSkillId: requiredString(item.microSkillId, 'microSkillId'),
        microSkillNameSnapshot: requiredString(item.microSkillNameSnapshot, 'microSkillNameSnapshot'),
        difficulty: difficulty as ManagedAssessmentItem['difficulty'],
        scoringWeight: requiredNumber(item.scoringWeight, 'scoringWeight'),
        prompt: requiredString(item.prompt, 'prompt'),
        responseSchema: item.responseSchema,
      }
    }),
  }
}

function parseOccupation(value: unknown): BaselineAssessmentOccupation {
  const item = record(value)
  const pendingStage = requiredString(item.pendingStage, 'pendingStage')
  const openAssessmentState = optionalString(item.openAssessmentState, 'openAssessmentState')
  if (!['NONE', 'WORKING_REVISION', 'BLUEPRINT_CANDIDATE', 'ASSESSMENT_DRAFT', 'ASSESSMENT_REVIEWED'].includes(pendingStage)) {
    throw new Error('Invalid pendingStage')
  }
  if (openAssessmentState !== null && openAssessmentState !== 'DRAFT' && openAssessmentState !== 'REVIEWED') {
    throw new Error('Invalid openAssessmentState')
  }
  return {
    occupationId: requiredString(item.occupationId, 'occupationId'),
    occupationName: requiredString(item.occupationName, 'occupationName'),
    latestBlueprintVersion: optionalPositiveInteger(item.latestBlueprintVersion, 'latestBlueprintVersion'),
    pendingStage: pendingStage as PendingStage,
    openAssessmentVersion: optionalPositiveInteger(item.openAssessmentVersion, 'openAssessmentVersion'),
    openAssessmentState,
    activeAssessmentVersion: optionalPositiveInteger(item.activeAssessmentVersion, 'activeAssessmentVersion'),
    lastUpdatedAt: optionalString(item.lastUpdatedAt, 'lastUpdatedAt'),
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('Invalid baseline assessment response')
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function array(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Invalid ${field}`)
  return value
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`Invalid ${field}`)
  return value
}

function optionalString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null
  return requiredString(value, field)
}

function requiredInstant(value: unknown, field: string): string {
  const instant = requiredString(value, field)
  if (Number.isNaN(Date.parse(instant))) throw new Error(`Invalid ${field}`)
  return instant
}

function optionalInstant(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null
  return requiredInstant(value, field)
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Invalid ${field}`)
  return value
}

function nonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw new Error(`Invalid ${field}`)
  return value
}

function positiveInteger(value: unknown, field: string): number {
  const parsed = nonNegativeInteger(value, field)
  if (parsed < 1) throw new Error(`Invalid ${field}`)
  return parsed
}

function optionalPositiveInteger(value: unknown, field: string): number | null {
  if (value === null || value === undefined) return null
  return positiveInteger(value, field)
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback
}
