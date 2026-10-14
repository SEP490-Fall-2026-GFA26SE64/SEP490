export type DifficultyCounts = { easyQuestionCount: number; mediumQuestionCount: number; hardQuestionCount: number }

export interface BlueprintSkill extends DifficultyCounts {
  microSkillId: string
  microSkillNameSnapshot: string
}

export interface BlueprintRole {
  roleId: string
  roleNameSnapshot: string
  enabled: boolean
  totalQuestionCount?: number
  easyScoreWeight: number
  mediumScoreWeight: number
  hardScoreWeight: number
  skills: BlueprintSkill[]
}

export interface BlueprintDraft {
  name: string
  occupationId: null
  occupationNameSnapshot: null
  roles: BlueprintRole[]
}

export interface BaselineBlueprint extends BlueprintDraft {
  blueprintId: string
  version: number
  createdAt: string
}

export interface CoverageShortage {
  roleId: string
  microSkillId: string
  difficulty: string
  required: number
  available: number
  missing: number
}

export interface AssessmentItem {
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

export interface AssessmentDraft {
  assessmentVersionId: string
  assessmentId: string
  version: number
  title: string
  blueprintId: string
  blueprintVersion: number
  generationSeed: number
  createdAt: string
  contentHash: string
  publicationState: 'DRAFT' | 'PUBLISHED'
  reviewedBy: string | null
  reviewedAt: string | null
  reviewedContentHash: string | null
  items: AssessmentItem[]
}

export class BaselineBlueprintApiError extends Error {
  readonly status: number
  readonly code: string
  readonly coverageShortages: CoverageShortage[]

  constructor(
    status: number,
    code: string,
    message: string,
    coverageShortages: CoverageShortage[] = [],
  ) {
    super(message)
    this.name = 'BaselineBlueprintApiError'
    this.status = status
    this.code = code
    this.coverageShortages = coverageShortages
  }
}

const BASE_URL = '/api/v1/ld/baseline-blueprints'

export async function createBlueprint(draft: BlueprintDraft, idempotencyKey: string): Promise<BaselineBlueprint> {
  return requestBlueprint(BASE_URL, 'POST', draft, idempotencyKey)
}

export async function reviseBlueprint(
  blueprintId: string,
  expectedLatestVersion: number,
  draft: BlueprintDraft,
  idempotencyKey: string,
): Promise<BaselineBlueprint> {
  return requestBlueprint(`${BASE_URL}/${encodeURIComponent(blueprintId)}`, 'PUT', {
    expectedLatestVersion,
    ...draft,
  }, idempotencyKey)
}

export async function generateAssessment(
  blueprintId: string,
  blueprintVersion: number,
  idempotencyKey: string,
): Promise<AssessmentDraft> {
  return parseAssessment(await requestJson(
    `${BASE_URL}/${encodeURIComponent(blueprintId)}/versions/${blueprintVersion}/assessment-drafts`,
    { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey } },
  ))
}

export async function reviewAssessment(assessmentVersionId: string, contentHash: string): Promise<AssessmentDraft> {
  return changeAssessmentState(assessmentVersionId, 'review', contentHash)
}

export async function publishAssessment(assessmentVersionId: string, contentHash: string): Promise<AssessmentDraft> {
  return changeAssessmentState(assessmentVersionId, 'publish', contentHash)
}

async function requestBlueprint(
  url: string,
  method: 'POST' | 'PUT',
  body: unknown,
  idempotencyKey: string,
): Promise<BaselineBlueprint> {
  return parseBlueprint(await requestJson(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(body),
  }))
}

async function changeAssessmentState(
  assessmentVersionId: string,
  action: 'review' | 'publish',
  contentHash: string,
): Promise<AssessmentDraft> {
  return parseAssessment(await requestJson(
    `${BASE_URL}/assessment-drafts/${encodeURIComponent(assessmentVersionId)}/${action}`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentHash }) },
  ))
}

async function requestJson(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, { ...init, credentials: 'same-origin' })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error = isRecord(payload) ? payload : {}
    throw new BaselineBlueprintApiError(
      response.status,
      stringOr(error.code, 'REQUEST_FAILED'),
      stringOr(error.message, `Baseline blueprint request failed (${response.status})`),
      parseShortages(error.coverageShortages),
    )
  }
  return payload
}

function parseBlueprint(value: unknown): BaselineBlueprint {
  const item = record(value)
  return {
    blueprintId: requiredString(item.blueprintId, 'blueprintId'),
    version: positiveInteger(item.version, 'version'),
    name: requiredString(item.name, 'name'),
    occupationId: null,
    occupationNameSnapshot: null,
    createdAt: requiredString(item.createdAt, 'createdAt'),
    roles: requiredArray(item.roles, 'roles').map(parseRole),
  }
}

function parseRole(value: unknown): BlueprintRole {
  const item = record(value)
  return {
    roleId: requiredString(item.roleId, 'roleId'),
    roleNameSnapshot: requiredString(item.roleNameSnapshot, 'roleNameSnapshot'),
    enabled: requiredBoolean(item.enabled, 'enabled'),
    totalQuestionCount: nonNegativeInteger(item.totalQuestionCount, 'totalQuestionCount'),
    easyScoreWeight: requiredNumber(item.easyScoreWeight, 'easyScoreWeight'),
    mediumScoreWeight: requiredNumber(item.mediumScoreWeight, 'mediumScoreWeight'),
    hardScoreWeight: requiredNumber(item.hardScoreWeight, 'hardScoreWeight'),
    skills: requiredArray(item.skills, 'skills').map((skill) => {
      const row = record(skill)
      return {
        microSkillId: requiredString(row.microSkillId, 'microSkillId'),
        microSkillNameSnapshot: requiredString(row.microSkillNameSnapshot, 'microSkillNameSnapshot'),
        easyQuestionCount: nonNegativeInteger(row.easyQuestionCount, 'easyQuestionCount'),
        mediumQuestionCount: nonNegativeInteger(row.mediumQuestionCount, 'mediumQuestionCount'),
        hardQuestionCount: nonNegativeInteger(row.hardQuestionCount, 'hardQuestionCount'),
      }
    }),
  }
}

function parseAssessment(value: unknown): AssessmentDraft {
  const item = record(value)
  const publicationState = requiredString(item.publicationState, 'publicationState')
  if (publicationState !== 'DRAFT' && publicationState !== 'PUBLISHED') throw new Error('Invalid publicationState')
  return {
    assessmentVersionId: requiredString(item.assessmentVersionId, 'assessmentVersionId'),
    assessmentId: requiredString(item.assessmentId, 'assessmentId'),
    version: positiveInteger(item.version, 'version'),
    title: requiredString(item.title, 'title'),
    blueprintId: requiredString(item.blueprintId, 'blueprintId'),
    blueprintVersion: positiveInteger(item.blueprintVersion, 'blueprintVersion'),
    generationSeed: requiredNumber(item.generationSeed, 'generationSeed'),
    createdAt: requiredString(item.createdAt, 'createdAt'),
    contentHash: requiredString(item.contentHash, 'contentHash'),
    publicationState,
    reviewedBy: optionalString(item.reviewedBy, 'reviewedBy'),
    reviewedAt: optionalString(item.reviewedAt, 'reviewedAt'),
    reviewedContentHash: optionalString(item.reviewedContentHash, 'reviewedContentHash'),
    items: requiredArray(item.items, 'items').map((entry) => {
      const row = record(entry)
      const difficulty = requiredString(row.difficulty, 'difficulty')
      if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) throw new Error('Invalid difficulty')
      return {
        position: positiveInteger(row.position, 'position'),
        itemVersionId: requiredString(row.itemVersionId, 'itemVersionId'),
        roleId: requiredString(row.roleId, 'roleId'),
        roleNameSnapshot: requiredString(row.roleNameSnapshot, 'roleNameSnapshot'),
        microSkillId: requiredString(row.microSkillId, 'microSkillId'),
        microSkillNameSnapshot: requiredString(row.microSkillNameSnapshot, 'microSkillNameSnapshot'),
        difficulty: difficulty as AssessmentItem['difficulty'],
        scoringWeight: requiredNumber(row.scoringWeight, 'scoringWeight'),
        prompt: requiredString(row.prompt, 'prompt'),
        responseSchema: row.responseSchema,
      }
    }),
  }
}

function parseShortages(value: unknown): CoverageShortage[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => {
    const row = record(entry)
    return {
      roleId: requiredString(row.roleId, 'roleId'),
      microSkillId: requiredString(row.microSkillId, 'microSkillId'),
      difficulty: requiredString(row.difficulty, 'difficulty'),
      required: nonNegativeInteger(row.required, 'required'),
      available: nonNegativeInteger(row.available, 'available'),
      missing: nonNegativeInteger(row.missing, 'missing'),
    }
  })
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('Invalid API response')
  return value as Record<string, unknown>
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
function requiredArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Invalid ${field}`)
  return value
}
function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Invalid ${field}`)
  return value
}
function optionalString(value: unknown, field: string): string | null {
  return value === null ? null : requiredString(value, field)
}
function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Invalid ${field}`)
  return value
}
function positiveInteger(value: unknown, field: string): number {
  const number = requiredNumber(value, field)
  if (!Number.isInteger(number) || number < 1) throw new Error(`Invalid ${field}`)
  return number
}
function nonNegativeInteger(value: unknown, field: string): number {
  const number = requiredNumber(value, field)
  if (!Number.isInteger(number) || number < 0) throw new Error(`Invalid ${field}`)
  return number
}
function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`Invalid ${field}`)
  return value
}
function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback
}
