export interface AdaptiveBounds { maxQuestions: number; timeLimitSeconds: number }
export interface AdaptiveCommonConfiguration { name: string; occupationBounds: AdaptiveBounds; exploration?: never; roles?: never }
export interface AdaptiveLegacyConfiguration { name: string; exploration: AdaptiveBounds; roles: Record<string, AdaptiveBounds>; occupationBounds?: never }
export type AdaptiveConfiguration = AdaptiveCommonConfiguration | AdaptiveLegacyConfiguration
export const isCommonConfiguration = (value: AdaptiveConfiguration): value is AdaptiveCommonConfiguration => value.occupationBounds !== undefined
export type AdaptiveStatus = 'DRAFT' | 'ACTIVE' | 'RETIRING' | 'INACTIVE'
export interface AdaptiveListQuery { search: string; status: AdaptiveStatus | ''; direction: 'NEWEST' | 'OLDEST'; page: number; size: number }
export interface AdaptiveListRow {
  blueprintId: string; workingRevisionId: string | null; version: number | null; name: string
  occupationId: string; occupationName: string; type: 'DRAFT' | 'VERSION'; status: AdaptiveStatus
  dateLabel: 'UPDATED' | 'ACTIVATED'; date: string; inProgressCount: number; configurationUpdateRequired: boolean
  revision: number; current: AdaptiveVersionId | null
}
export interface AdaptiveListPage { rows: AdaptiveListRow[]; total: number; page: number; size: number }
export interface AdaptiveSkill { name: string; catalogVersion: string }
export interface AdaptiveRole extends AdaptiveSkill { skills: Record<string, AdaptiveSkill> }
export interface AdaptiveCapacity {
  occupationName: string
  catalogFingerprint: string
  explorationCapacity: number
  explorationMissingParameterCount: number
  occupation: { eligibleCapacity: number; skillCount: number; minimumPerSkill: number; minimumQuestions: number; modelMaxQuestions: number } | null
  roles: Record<string, { snapshot: AdaptiveRole; eligibleCapacity: number; missingParameterCount: number }>
}
export interface AdaptiveWorking { blueprintId: string; workingRevisionId: string; revision: number; configuration: AdaptiveConfiguration; updatedAt: string; noOp: boolean }
export interface AdaptiveVersionId { blueprintId: string; version: number }
export interface AdaptiveVersion {
  id: AdaptiveVersionId
  configuration: AdaptiveConfiguration
  occupationName: string
  catalogFingerprint: string
  pins: { modelVersionId: string; masteryMappingVersionId: string; parameterSetId: string }
  roles: Record<string, AdaptiveRole>
  createdAt: string
}
export interface AdaptiveActivation { revision: number; current: AdaptiveVersionId | null; changedAt: string }
export interface AdaptiveWorkspace { occupationId: string; capacity: AdaptiveCapacity; working: AdaptiveWorking | null; current: AdaptiveVersion | null; activation: AdaptiveActivation | null; admissionReadiness: 'NO_ACTIVE' | 'CONFIGURATION_UPDATE_REQUIRED' | 'BLUEPRINT_STALE' | 'INFEASIBLE' | 'READY' }
export interface AdaptiveShortage { roleId: string | null; kind: 'ITEM_CAPACITY' | 'PARAMETER_COVERAGE' | 'SKILL_COVERAGE' | 'MINIMUM_QUESTIONS' | 'MODEL_LIMIT'; required: number; available: number; microSkillId: string | null }
export interface AdaptiveSample { itemVersionId: string; microSkillId: string; prompt: string; options: Record<string, string>; reason: 'SKILL_COVERAGE' | 'ITEM_INFORMATION' }
export interface AdaptivePreview { feasible: boolean; shortages: AdaptiveShortage[]; sample: AdaptiveSample[] }

export class AdaptiveBaselineApiError extends Error {
  readonly status: number
  readonly code: string
  readonly shortages: AdaptiveShortage[]
  constructor(status: number, code: string, shortages: AdaptiveShortage[] = []) {
    super(code)
    this.name = 'AdaptiveBaselineApiError'
    this.status = status
    this.code = code
    this.shortages = shortages
  }
}

const base = (occupation: string) => `/api/v1/ld/adaptive-baseline-blueprints/occupations/${encodeURIComponent(occupation)}`

/** Local Catalog is discovery only. Never display a candidate before adaptive authorization. */
export async function listAdaptiveOccupations(signal?: AbortSignal): Promise<{ id: string; name: string }[]> {
  let response: Response
  try { response = await fetch('/api/v1/ld/baseline-blueprint-catalog/occupations', { credentials: 'same-origin', cache: 'no-store', signal }) }
  catch (cause) { if (signal?.aborted) throw cause; throw new AdaptiveBaselineApiError(0, 'NETWORK_ERROR') }
  if (!response.ok) throw new AdaptiveBaselineApiError(response.status, response.status === 401 ? 'UNAUTHENTICATED' : response.status === 403 ? 'FORBIDDEN' : 'DEPENDENCY_UNAVAILABLE')
  let ids: string[]
  try { ids = [...new Set(array(await response.json(), item => text(object(item).id)))] }
  catch { throw new AdaptiveBaselineApiError(response.status, 'INVALID_RESPONSE') }
  const authorized: { id: string; name: string }[] = []
  // Sequential to avoid unbounded fan-out against the provisional Catalog adapter.
  for (const id of ids) {
    try {
      const value = await getAdaptiveWorkspace(id, signal)
      authorized.push({ id, name: value.capacity.occupationName })
    } catch (cause) {
      if (cause instanceof AdaptiveBaselineApiError && (cause.status === 403 || cause.status === 404)) continue
      throw cause
    }
  }
  return authorized
}

// Explicit command allowlists: calculator, actor, policy, pins and legacy fields never enter new writes.
export const discardAdaptiveWorking = (occupation: string, workingRevisionId: string, expectedWorkingRevision: number, key: string) =>
  request(occupation, '/working/discard', command('POST', { workingRevisionId, expectedWorkingRevision }, key), working)
export const getAdaptiveVersion = (occupation: string, id: AdaptiveVersionId, signal?: AbortSignal) =>
  request(occupation, `/versions/${encodeURIComponent(id.blueprintId)}/${id.version}`, { method: 'GET', signal }, value => {
    const data = object(value), status = text(data.status)
    if (!['ACTIVE', 'RETIRING', 'INACTIVE'].includes(status)) throw new Error('Invalid version status')
    const result = version(data.version)
    if (result.id.blueprintId !== id.blueprintId || result.id.version !== id.version) throw new Error('Version mismatch')
    return { ...result, status }
  })
export const getAdaptiveWorkspace = (occupation: string, signal?: AbortSignal) =>
  request(occupation, '', { method: 'GET', signal }, value => { const result = workspace(value); if (result.occupationId !== occupation) throw new Error('Scope mismatch'); return result })
export const saveAdaptiveWorking = (occupation: string, expectedRevision: number, expectedWorkingRevisionId: string | null, configuration: AdaptiveCommonConfiguration, key: string) =>
  request(occupation, '/working', command('PUT', { expectedRevision, expectedWorkingRevisionId, configuration: commonConfig(configuration) }, key), working)
export const convertAdaptiveWorking = (occupation: string, workingRevisionId: string, expectedWorkingRevision: number, configuration: AdaptiveCommonConfiguration, key: string) =>
  request(occupation, '/working/convert', command('POST', { workingRevisionId, expectedWorkingRevision, configuration: commonConfig(configuration) }, key), working)
export const testAdaptiveBlueprint = (occupation: string, workingRevisionId: string, expectedWorkingRevision: number, signal?: AbortSignal) =>
  request(occupation, '/test', command('POST', { workingRevisionId, expectedWorkingRevision }, undefined, signal), preview)
export const finalizeAdaptiveBlueprint = (occupation: string, workingRevisionId: string, expectedWorkingRevision: number, expectedActivationRevision: number, expectedCurrent: AdaptiveVersionId | null, key: string) =>
  request(occupation, '/finalize', command('POST', { workingRevisionId, expectedWorkingRevision, expectedActivationRevision, expectedCurrent }, key), version)
export const disableAdaptiveBlueprint = (occupation: string, expectedActivationRevision: number, expectedCurrent: AdaptiveVersionId, reason: string, key: string) =>
  request(occupation, '/disable', command('POST', { expectedActivationRevision, expectedCurrent, reason }, key), activation)
export function listAdaptiveBlueprints(query: AdaptiveListQuery, signal?: AbortSignal) {
  const params = new URLSearchParams({ search: query.search, direction: query.direction, page: String(query.page), size: String(query.size) })
  if (query.status) params.set('status', query.status)
  return http('/api/v1/ld/adaptive-baseline-blueprints?' + params, { method: 'GET', signal }, value => {
    const v = object(value)
    return { rows: array(v.rows, listRow), total: integer(v.total), page: integer(v.page), size: integer(v.size, 1) }
  })
}
function commonConfig(value: AdaptiveCommonConfiguration): AdaptiveCommonConfiguration {
  return { name: value.name, occupationBounds: { maxQuestions: value.occupationBounds.maxQuestions, timeLimitSeconds: value.occupationBounds.timeLimitSeconds } }
}

function command(method: string, body: unknown, key?: string, signal?: AbortSignal): RequestInit {
  return { method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) }, signal }
}

async function request<T>(occupation: string, suffix: string, init: RequestInit, read: (value: unknown) => T): Promise<T> {
  if (!occupation.trim() || occupation !== occupation.trim()) throw new AdaptiveBaselineApiError(400, 'INVALID_REQUEST')
  return http(base(occupation) + suffix, init, read)
}

async function http<T>(url: string, init: RequestInit, read: (value: unknown) => T): Promise<T> {
  let response: Response
  try { response = await workspaceFetch(url, init) }
  catch (cause) {
    if (init.signal?.aborted) throw cause
    throw new AdaptiveBaselineApiError(0, 'NETWORK_ERROR')
  }
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const failure = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}
    let details: AdaptiveShortage[] = []
    try { details = array(failure.shortages, shortage) } catch { /* Invalid error details are not capacity data. */ }
    throw new AdaptiveBaselineApiError(response.status, typeof failure.code === 'string' ? failure.code : 'REQUEST_FAILED', details)
  }
  try {
    const result = read(payload)
    return result
  } catch { throw new AdaptiveBaselineApiError(response.status, 'INVALID_RESPONSE') }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected object')
  return value as Record<string, unknown>
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Expected text')
  return value
}
function date(value: unknown): string { const result = text(value); if (!Number.isFinite(Date.parse(result))) throw new Error('Expected date'); return result }
function integer(value: unknown, minimum = 0): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) throw new Error('Expected safe integer')
  return value
}
function dictionary<T>(value: unknown, read: (item: unknown) => T): Record<string, T> {
  return Object.fromEntries(Object.entries(object(value)).map(([key, item]) => {
    if (!key.trim() || key !== key.trim()) throw new Error('Expected canonical key')
    return [key, read(item)]
  }))
}
function array<T>(value: unknown, read: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) throw new Error('Expected array')
  return value.map(read)
}
const nullable = <T,>(value: unknown, read: (item: unknown) => T): T | null => value === null ? null : read(value)
const skill = (value: unknown): AdaptiveSkill => { const v = object(value); return { name: text(v.name), catalogVersion: text(v.catalogVersion) } }
const role = (value: unknown): AdaptiveRole => ({ ...skill(value), skills: dictionary(object(value).skills, skill) })
const bounds = (value: unknown): AdaptiveBounds => {
  const v = object(value)
  const result = { maxQuestions: integer(v.maxQuestions, 1), timeLimitSeconds: integer(v.timeLimitSeconds, 1) }
  if (Math.max(result.maxQuestions, result.timeLimitSeconds) > 2_147_483_647) throw new Error('Bounds outside server range')
  return result
}
const config = (value: unknown): AdaptiveConfiguration => {
  const v = object(value)
  if ('occupationBounds' in v) {
    if ('exploration' in v || 'roles' in v) throw new Error('Mixed configuration')
    return { name: text(v.name), occupationBounds: bounds(v.occupationBounds) }
  }
  return { name: text(v.name), exploration: bounds(v.exploration), roles: dictionary(v.roles, bounds) }
}
const versionId = (value: unknown): AdaptiveVersionId => { const v = object(value); return { blueprintId: text(v.blueprintId), version: integer(v.version, 1) } }
function working(value: unknown): AdaptiveWorking {
  const v = object(value)
  return { blueprintId: text(v.blueprintId), workingRevisionId: text(v.workingRevisionId), revision: integer(v.revision, 1), configuration: config(v.configuration), updatedAt: date(v.updatedAt), noOp: boolean(v.noOp) }
}
function version(value: unknown): AdaptiveVersion {
  const v = object(value), pins = object(v.pins)
  return { id: versionId(v.id), configuration: config(v.configuration), occupationName: text(v.occupationName), catalogFingerprint: text(v.catalogFingerprint), roles: dictionary(v.roles, role), createdAt: date(v.createdAt),
    pins: { modelVersionId: text(pins.modelVersionId), masteryMappingVersionId: text(pins.masteryMappingVersionId), parameterSetId: text(pins.parameterSetId) } }
}
function activation(value: unknown): AdaptiveActivation {
  const v = object(value)
  return { revision: integer(v.revision, 1), current: nullable(v.current, versionId), changedAt: date(v.changedAt) }
}
function workspace(value: unknown): AdaptiveWorkspace {
  const v = object(value), c = object(v.capacity)
  const capacity = { occupationName: text(c.occupationName), catalogFingerprint: text(c.catalogFingerprint), explorationCapacity: integer(c.explorationCapacity), explorationMissingParameterCount: integer(c.explorationMissingParameterCount),
    occupation: nullable(c.occupation, item => { const o = object(item); return { eligibleCapacity: integer(o.eligibleCapacity), skillCount: integer(o.skillCount, 1), minimumPerSkill: integer(o.minimumPerSkill, 1), minimumQuestions: integer(o.minimumQuestions, 1), modelMaxQuestions: integer(o.modelMaxQuestions, 1) } }),
    roles: dictionary(c.roles, item => { const r = object(item); return { snapshot: role(r.snapshot), eligibleCapacity: integer(r.eligibleCapacity), missingParameterCount: integer(r.missingParameterCount) } }) }
  return { occupationId: text(v.occupationId), capacity, working: nullable(v.working, working), current: nullable(v.current, version), activation: nullable(v.activation, activation), admissionReadiness: choice(v.admissionReadiness, ['NO_ACTIVE', 'CONFIGURATION_UPDATE_REQUIRED', 'BLUEPRINT_STALE', 'INFEASIBLE', 'READY'] as const) }
}
function shortage(value: unknown): AdaptiveShortage {
  const v = object(value)
  const kind = choice(v.kind, ['ITEM_CAPACITY', 'PARAMETER_COVERAGE', 'SKILL_COVERAGE', 'MINIMUM_QUESTIONS', 'MODEL_LIMIT'] as const)
  const result = { roleId: nullable(v.roleId, text), kind, required: integer(v.required, 1), available: integer(v.available), microSkillId: nullable(v.microSkillId, text) }
  if (result.available >= result.required) throw new Error('Invalid shortage')
  return result as AdaptiveShortage
}
function preview(value: unknown): AdaptivePreview {
  const v = object(value)
  if (typeof v.feasible !== 'boolean') throw new Error('Expected feasibility')
  const shortages = array(v.shortages, shortage)
  const sample = array(v.sample, item => {
    const s = object(item)
    if (s.reason !== 'SKILL_COVERAGE' && s.reason !== 'ITEM_INFORMATION') throw new Error('Unknown selection reason')
    return { itemVersionId: text(s.itemVersionId), microSkillId: text(s.microSkillId), prompt: text(s.prompt), options: dictionary(s.options, text), reason: s.reason } as AdaptiveSample
  })
  if (v.feasible !== (shortages.length === 0) || (!v.feasible && sample.length > 0) || new Set(sample.map(item => item.itemVersionId)).size !== sample.length) throw new Error('Invalid preview')
  return { feasible: v.feasible, shortages, sample }
}

function boolean(value: unknown): boolean { if (typeof value !== 'boolean') throw new Error('Expected boolean'); return value }
function choice<T extends string>(value: unknown, options: readonly T[]): T {
  if (typeof value !== 'string' || !options.includes(value as T)) throw new Error('Unexpected value')
  return value as T
}
function listRow(value: unknown): AdaptiveListRow {
  const v = object(value)
  const row: AdaptiveListRow = {
    blueprintId: text(v.blueprintId), workingRevisionId: nullable(v.workingRevisionId, text), version: nullable(v.version, item => integer(item, 1)),
    name: text(v.name), occupationId: text(v.occupationId), occupationName: text(v.occupationName),
    type: choice(v.type, ['DRAFT', 'VERSION'] as const), status: choice(v.status, ['DRAFT', 'ACTIVE', 'RETIRING', 'INACTIVE'] as const),
    dateLabel: choice(v.dateLabel, ['UPDATED', 'ACTIVATED'] as const), date: date(v.date), inProgressCount: integer(v.inProgressCount),
    configurationUpdateRequired: boolean(v.configurationUpdateRequired), revision: integer(v.revision), current: nullable(v.current, versionId),
  }
  if (row.status === 'ACTIVE' && (!row.current || row.current.blueprintId !== row.blueprintId || row.current.version !== row.version)) throw new Error('Invalid active pointer')
  if ((row.status === 'DRAFT') !== (row.type === 'DRAFT')) throw new Error('Invalid row status')
  if ((row.type === 'DRAFT') !== (row.workingRevisionId !== null) || (row.type === 'VERSION') !== (row.version !== null)) throw new Error('Invalid row identity')
  return row
}
import { workspaceFetch } from '../../../shared/api/workspaceFetch'
