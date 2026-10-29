export interface CurrentSkill { id: string; code: string; name: string; requiredScore: number; mandatory: boolean }
export interface CurrentLevel { id: string; code: string; name: string; rank: number; context: string; attainmentRule: string; skills: CurrentSkill[] }
export interface CurrentRole { id: string; code: string; name: string; scope: string; occupationId: string; occupationName: string; catalogVersion: string; fingerprint: string; levels: CurrentLevel[] }
export interface CurrentSelection { selectionId: string; role: CurrentRole; revision: number; selectedAt: string; available: boolean }
export interface RoleProgress { state: string; requiredCount: number; coveredCount: number; attemptId: string | null; baselineVersion: number | null }
export interface RoleFlowView { selection: CurrentSelection | null; progress: RoleProgress }
export class RoleFlowError extends Error {
  readonly code: string
  readonly status: number
  constructor(code: string, status = 0) { super(code); this.code = code; this.status = status }
  get ambiguous() { return this.status === 0 || this.status >= 500 || this.code === 'INVALID_RESPONSE' }
}
const object = (v: unknown): Record<string, unknown> => { if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error(); return v as Record<string, unknown> }
const text = (v: unknown) => { if (typeof v !== 'string') throw Error(); return v }
const num = (v: unknown) => { if (typeof v !== 'number' || !Number.isFinite(v)) throw Error(); return v }
const bool = (v: unknown) => { if (typeof v !== 'boolean') throw Error(); return v }
const array = <T>(v: unknown, parse: (x: unknown) => T) => { if (!Array.isArray(v)) throw Error(); return v.map(parse) }
function role(value: unknown): CurrentRole {
  const r = object(value)
  return { id: text(r.id), code: text(r.code), name: text(r.name), scope: text(r.scope), occupationId: text(r.occupationId), occupationName: text(r.occupationName), catalogVersion: text(r.catalogVersion), fingerprint: text(r.fingerprint),
    levels: array(r.levels, value => { const l = object(value); return { id: text(l.id), code: text(l.code), name: text(l.name), rank: num(l.rank), context: text(l.context), attainmentRule: text(l.attainmentRule),
      skills: array(l.skills, value => { const s = object(value); return { id: text(s.id), code: text(s.code), name: text(s.name), requiredScore: num(s.requiredScore), mandatory: bool(s.mandatory) } }) } }) }
}
function selection(value: unknown): CurrentSelection {
  const s = object(value)
  return { selectionId: text(s.selectionId), role: role(s.role), revision: num(s.revision), selectedAt: text(s.selectedAt), available: bool(s.available) }
}
async function request<T>(path: string, init: RequestInit, parse: (v: unknown) => T): Promise<T> {
  let response: Response
  try { response = await workspaceFetch('/api/v1/employee/' + path, init) }
  catch (cause) { if (init.signal?.aborted) throw cause; throw new RoleFlowError('NETWORK_ERROR') }
  let value: unknown
  try { value = await response.json() } catch { throw new RoleFlowError('INVALID_RESPONSE', response.status) }
  if (!response.ok) throw new RoleFlowError(typeof object(value).code === 'string' ? String(object(value).code) : 'DEPENDENCY_UNAVAILABLE', response.status)
  try { return parse(value) } catch { throw new RoleFlowError('INVALID_RESPONSE', response.status) }
}
export const currentRoles = (signal?: AbortSignal) => request('target-roles', { method: 'GET', signal }, v => array(v, role))
export const readRoleFlow = (signal?: AbortSignal) => request('target-role-selection', { method: 'GET', signal }, v => {
  const data = object(v), p = object(data.progress)
  return { selection: data.selection === null ? null : selection(data.selection), progress: { state: text(p.state), requiredCount: num(p.requiredCount), coveredCount: num(p.coveredCount), attemptId: p.attemptId === null ? null : text(p.attemptId), baselineVersion: p.baselineVersion === null ? null : num(p.baselineVersion) } } satisfies RoleFlowView
})
export interface RoleChoiceCommand { body: string; key: string }
export interface MasteryProfile { occupationId: string; occupationName: string; attemptId: string; baselineVersion: number; initializedAt: string; skills: { id: string; name: string; mastery: number; confidence: string }[] }
export const readMyMastery = (signal?: AbortSignal) => request('target-role-selection/mastery', { method: 'GET', signal }, value => array(value, value => {
  const p = object(value)
  return { occupationId: text(p.occupationId), occupationName: text(p.occupationName), attemptId: text(p.attemptId), baselineVersion: num(p.baselineVersion), initializedAt: text(p.initializedAt),
    skills: array(p.skills, value => { const s = object(value), mastery = num(s.mastery), confidence = text(s.confidence)
      if (mastery < 0 || mastery > 1 || !['LOW', 'MEDIUM', 'HIGH'].includes(confidence)) throw Error()
      return { id: text(s.id), name: text(s.name), mastery, confidence }
    }) } satisfies MasteryProfile
}))
export const prepareRoleChoice = (id: string, expected: string | null): RoleChoiceCommand => ({ body: JSON.stringify({ roleId: id, expectedCurrentSelectionId: expected }), key: crypto.randomUUID() })
export const chooseCurrentRole = (command: RoleChoiceCommand) => request('target-role-selection', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': command.key }, body: command.body }, selection)
import { workspaceFetch } from '../../../shared/api/workspaceFetch'
