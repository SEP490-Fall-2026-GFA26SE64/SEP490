import type {
  CareerTrack,
  Seniority,
  TargetRoleDetail,
  TargetRoleFilters,
  TargetRoleRequirement,
  TargetRoleSummary,
} from './targetRoleTypes'

const TARGET_ROLES_URL = '/api/v1/employee/target-roles'
const CAREER_TRACKS: ReadonlySet<string> = new Set(['PROFESSIONAL', 'MANAGEMENT'])
const SENIORITIES: ReadonlySet<string> = new Set(['P1', 'P2', 'P3', 'P4', 'P5', 'M3', 'M4'])

export class TargetRoleApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'TargetRoleApiError'
    this.status = status
    this.code = code
  }
}

export async function getTargetRoles(
  filters: TargetRoleFilters,
  signal: AbortSignal,
): Promise<TargetRoleSummary[]> {
  const parameters = new URLSearchParams()
  const search = filters.search?.trim()
  if (search) parameters.set('search', search)
  if (filters.seniority) parameters.set('seniority', filters.seniority)
  const query = parameters.toString()
  const payload = await requestJson(query ? `${TARGET_ROLES_URL}?${query}` : TARGET_ROLES_URL, signal)
  if (!Array.isArray(payload)) throw new Error('Invalid target-role list response')
  return payload.map(parseSummary)
}

export async function getTargetRole(roleId: string, signal: AbortSignal): Promise<TargetRoleDetail> {
  const normalizedRoleId = roleId.trim()
  if (!normalizedRoleId) throw new TargetRoleApiError(400, 'INVALID_REQUEST', 'roleId must not be blank')
  return parseDetail(await requestJson(`${TARGET_ROLES_URL}/${encodeURIComponent(normalizedRoleId)}`, signal))
}

async function requestJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal, credentials: 'same-origin' })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error = isRecord(payload) ? payload : {}
    throw new TargetRoleApiError(
      response.status,
      typeof error.code === 'string' ? error.code : 'REQUEST_FAILED',
      typeof error.message === 'string' ? error.message : `Target-role request failed (${response.status})`,
    )
  }
  return payload
}

function parseSummary(value: unknown): TargetRoleSummary {
  if (!isRecord(value)) throw new Error('Invalid target-role summary')
  const requirementCount = requiredNumber(value.requirementCount, 'requirementCount')
  if (!Number.isInteger(requirementCount) || requirementCount < 1) {
    throw new Error('Invalid target-role requirementCount')
  }
  return {
    id: requiredString(value.id, 'id'),
    code: requiredString(value.code, 'code'),
    name: requiredString(value.name, 'name'),
    track: careerTrack(value.track),
    seniority: seniority(value.seniority),
    description: optionalString(value.description, 'description'),
    requirementCount,
  }
}

function parseDetail(value: unknown): TargetRoleDetail {
  if (!isRecord(value)) throw new Error('Invalid target-role detail')
  if (!Array.isArray(value.responsibilities) || !Array.isArray(value.requirements)) {
    throw new Error('Invalid target-role detail collections')
  }
  if (value.requirements.length === 0) throw new Error('Target-role detail has no requirements')
  return {
    id: requiredString(value.id, 'id'),
    code: requiredString(value.code, 'code'),
    name: requiredString(value.name, 'name'),
    familyCode: requiredString(value.familyCode, 'familyCode'),
    track: careerTrack(value.track),
    seniority: seniority(value.seniority),
    description: optionalString(value.description, 'description'),
    responsibilities: value.responsibilities.map((item) => requiredString(item, 'responsibility')),
    requirements: value.requirements.map(parseRequirement),
  }
}

function parseRequirement(value: unknown): TargetRoleRequirement {
  if (!isRecord(value)) throw new Error('Invalid target-role requirement')
  const targetMastery = requiredNumber(value.targetMastery, 'targetMastery')
  if (targetMastery < 0 || targetMastery > 1) throw new Error('Invalid targetMastery')
  return {
    skillId: requiredString(value.skillId, 'skillId'),
    skillCode: requiredString(value.skillCode, 'skillCode'),
    skillName: requiredString(value.skillName, 'skillName'),
    targetMastery,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Invalid ${field}`)
  return value
}

function optionalString(value: unknown, field: string): string | null {
  if (value === null) return null
  return requiredString(value, field)
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Invalid ${field}`)
  return value
}

function careerTrack(value: unknown): CareerTrack {
  if (typeof value !== 'string' || !CAREER_TRACKS.has(value)) throw new Error('Invalid track')
  return value as CareerTrack
}

function seniority(value: unknown): Seniority {
  if (typeof value !== 'string' || !SENIORITIES.has(value)) throw new Error('Invalid seniority')
  return value as Seniority
}
