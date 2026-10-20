export interface AdaptiveBounds { maxQuestions: number; timeLimitSeconds: number }
export interface AdaptiveConfiguration { name: string; exploration: AdaptiveBounds; roles: Record<string, AdaptiveBounds> }
export interface AdaptiveSkill { name: string; catalogVersion: string }
export interface AdaptiveRole extends AdaptiveSkill { skills: Record<string, AdaptiveSkill> }
export interface AdaptiveCapacity {
  occupationName: string
  catalogFingerprint: string
  explorationCapacity: number
  explorationMissingParameterCount: number
  roles: Record<string, { snapshot: AdaptiveRole; eligibleCapacity: number; missingParameterCount: number }>
}
export interface AdaptiveWorking { blueprintId: string; workingRevisionId: string; revision: number; configuration: AdaptiveConfiguration; updatedAt: string }
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
export interface AdaptiveWorkspace { occupationId: string; capacity: AdaptiveCapacity; working: AdaptiveWorking | null; current: AdaptiveVersion | null; activation: AdaptiveActivation | null }
export interface AdaptiveShortage { roleId: string | null; kind: 'ITEM_CAPACITY' | 'PARAMETER_COVERAGE'; required: number; available: number }
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

// Explicit request allowlists: never spread workspace, actor, pins or legacy draft DTOs into writes.
export const getAdaptiveWorkspace = (occupation: string, signal?: AbortSignal) =>
  request(occupation, '', { method: 'GET', signal }, workspace)
export const saveAdaptiveWorking = (occupation: string, expectedRevision: number, configuration: AdaptiveConfiguration, key: string, signal?: AbortSignal) =>
  request(occupation, '/working', command('PUT', { expectedRevision, configuration: config(configuration) }, key, signal), working)
export const testAdaptiveBlueprint = (occupation: string, configuration: AdaptiveConfiguration, signal?: AbortSignal) =>
  request(occupation, '/test', command('POST', { configuration: config(configuration) }, undefined, signal), preview)
export const finalizeAdaptiveBlueprint = (occupation: string, workingRevisionId: string, expectedWorkingRevision: number, expectedActivationRevision: number, key: string) =>
  request(occupation, '/finalize', command('POST', { workingRevisionId, expectedWorkingRevision, expectedActivationRevision }, key), version)
export const disableAdaptiveBlueprint = (occupation: string, expectedActivationRevision: number, reason: string, key: string) =>
  request(occupation, '/disable', command('POST', { expectedActivationRevision, reason }, key), activation)

function command(method: string, body: unknown, key?: string, signal?: AbortSignal): RequestInit {
  return { method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) }, signal }
}

async function request<T>(occupation: string, suffix: string, init: RequestInit, read: (value: unknown) => T): Promise<T> {
  if (!occupation.trim() || occupation !== occupation.trim()) throw new AdaptiveBaselineApiError(400, 'INVALID_REQUEST')
  let response: Response
  try { response = await fetch(base(occupation) + suffix, { ...init, credentials: 'same-origin', cache: 'no-store' }) }
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
    if (suffix === '' && (result as AdaptiveWorkspace).occupationId !== occupation) throw new Error('Scope mismatch')
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
const config = (value: unknown): AdaptiveConfiguration => { const v = object(value); return { name: text(v.name), exploration: bounds(v.exploration), roles: dictionary(v.roles, bounds) } }
const versionId = (value: unknown): AdaptiveVersionId => { const v = object(value); return { blueprintId: text(v.blueprintId), version: integer(v.version, 1) } }
function working(value: unknown): AdaptiveWorking {
  const v = object(value)
  return { blueprintId: text(v.blueprintId), workingRevisionId: text(v.workingRevisionId), revision: integer(v.revision, 1), configuration: config(v.configuration), updatedAt: text(v.updatedAt) }
}
function version(value: unknown): AdaptiveVersion {
  const v = object(value), pins = object(v.pins)
  return { id: versionId(v.id), configuration: config(v.configuration), occupationName: text(v.occupationName), catalogFingerprint: text(v.catalogFingerprint), roles: dictionary(v.roles, role), createdAt: text(v.createdAt),
    pins: { modelVersionId: text(pins.modelVersionId), masteryMappingVersionId: text(pins.masteryMappingVersionId), parameterSetId: text(pins.parameterSetId) } }
}
function activation(value: unknown): AdaptiveActivation {
  const v = object(value)
  return { revision: integer(v.revision, 1), current: nullable(v.current, versionId), changedAt: text(v.changedAt) }
}
function workspace(value: unknown): AdaptiveWorkspace {
  const v = object(value), c = object(v.capacity)
  const capacity = { occupationName: text(c.occupationName), catalogFingerprint: text(c.catalogFingerprint), explorationCapacity: integer(c.explorationCapacity), explorationMissingParameterCount: integer(c.explorationMissingParameterCount),
    roles: dictionary(c.roles, item => { const r = object(item); return { snapshot: role(r.snapshot), eligibleCapacity: integer(r.eligibleCapacity), missingParameterCount: integer(r.missingParameterCount) } }) }
  return { occupationId: text(v.occupationId), capacity, working: nullable(v.working, working), current: nullable(v.current, version), activation: nullable(v.activation, activation) }
}
function shortage(value: unknown): AdaptiveShortage {
  const v = object(value)
  if (v.kind !== 'ITEM_CAPACITY' && v.kind !== 'PARAMETER_COVERAGE') throw new Error('Unknown shortage')
  const result = { roleId: nullable(v.roleId, text), kind: v.kind, required: integer(v.required, 1), available: integer(v.available) }
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
