export type AttemptState = 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED' | 'INVALIDATED'
export type BaselineScope = 'OCCUPATION' | 'EARLIER_ROLE' | 'EARLIER_OCCUPATION'
export interface PresentedItem { position: number; itemVersionId: string; prompt: string; options: { id: string; text: string }[]; selectedOptionId: string | null }
export interface BaselineAttempt {
  id: string; occupationId: string; occupationName: string; purpose: string; roleId: string | null; assessmentScope: BaselineScope
  state: AttemptState; revision: number; startedAt: string; deadlineAt: string; observedAt: string
  expired: boolean; maxQuestions: number; answeredCount: number; items: PresentedItem[]
}
export interface BaselineResult {
  attemptId: string; occupationId: string; occupationName: string; purpose: string; roleId: string | null; roleName: string | null; assessmentScope: BaselineScope
  state: Exclude<AttemptState, 'IN_PROGRESS'>; completionReason: string; startedAt: string; completedAt: string
  replacesAttemptId: string | null; replacementAttemptId: string | null; rawScore: number | null
  skills: { microSkillId: string; microSkillName: string; mastery: number; confidence: 'LOW' | 'MEDIUM' | 'HIGH' }[]
}
export interface BaselineCommand { path: string; body: string; key: string }
export class BaselineError extends Error {
  readonly code: string
  readonly status: number
  constructor(code: string, status = 0) { super(code); this.code = code; this.status = status }
  get ambiguous() { return this.status === 0 || this.status >= 500 || this.code === 'INVALID_RESPONSE' }
}
const base = '/api/v1/employee/baseline-attempts'
export const employeeBaselineEnabled = import.meta.env.VITE_EMPLOYEE_ADAPTIVE_BASELINE_ENABLED === 'true'
export const attemptPath = (id: string) => `/employee/baseline-assessment/${encodeURIComponent(id)}`
export function startCommand(occupationId?: string): BaselineCommand {
  return command('', occupationId === undefined ? { entry: 'SELECTED_ROLE' } : { entry: 'OCCUPATION_EXPLORATION', occupationId: occupationId.trim() })
}
export function answerCommand(attempt: BaselineAttempt, item: PresentedItem, selectedOptionId: string) {
  return command(`/${encodeURIComponent(attempt.id)}/answers`, {
    expectedRevision: attempt.revision, position: item.position, itemVersionId: item.itemVersionId, selectedOptionId,
  })
}
export const submitCommand = (attempt: BaselineAttempt) => command(`/${encodeURIComponent(attempt.id)}/submit`, { expectedRevision: attempt.revision })
function command(path: string, body: unknown): BaselineCommand { return { path, body: JSON.stringify(body), key: crypto.randomUUID() } }
export const executeCommand = (value: BaselineCommand) => request(value.path, parseAttempt, {
  method: 'POST', body: value.body, headers: { 'Content-Type': 'application/json', 'Idempotency-Key': value.key },
})
export const readAttempt = (id: string, signal?: AbortSignal) => request(`/${encodeURIComponent(id)}`, value => {
  const result = parseAttempt(value); if (result.id !== id) throw new Error('Scope mismatch'); return result
}, { signal })
export const readResult = (id: string, signal?: AbortSignal) => request(`/${encodeURIComponent(id)}/result`, value => {
  const result = parseResult(value); if (result.attemptId !== id) throw new Error('Scope mismatch'); return result
}, { signal })
export const readHistory = (signal?: AbortSignal) => request('/history', value => list(value, parseResult), { signal })
async function request<T>(path: string, parse: (value: unknown) => T, init: RequestInit = {}): Promise<T> {
  let response: Response
  try { response = await fetch(base + path, { ...init, credentials: 'same-origin', cache: 'no-store' }) }
  catch (cause) { if (init.signal?.aborted) throw cause; throw new BaselineError('NETWORK_ERROR') }
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const code = payload && typeof payload === 'object' && 'code' in payload && typeof payload.code === 'string' ? payload.code : 'REQUEST_FAILED'
    throw new BaselineError(code, response.status)
  }
  try { return parse(payload) } catch { throw new BaselineError('INVALID_RESPONSE', response.status) }
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid object')
  return value as Record<string, unknown>
}
function text(value: unknown): string { if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid text'); return value }
const nullable = (value: unknown) => value === null ? null : text(value)
function number(value: unknown): number { if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid number'); return value }
function integer(value: unknown, minimum = 0): number { const result = number(value); if (!Number.isSafeInteger(result) || result < minimum) throw new Error('Invalid integer'); return result }
function ratio(value: unknown): number { const result = number(value); if (result < 0 || result > 1) throw new Error('Invalid ratio'); return result }
function date(value: unknown): string { const result = text(value); if (!Number.isFinite(Date.parse(result))) throw new Error('Invalid date'); return result }
function list<T>(value: unknown, parse: (item: unknown) => T): T[] { if (!Array.isArray(value)) throw new Error('Invalid list'); return value.map(parse) }
function state(value: unknown): AttemptState {
  if (!['IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'INVALIDATED'].includes(text(value))) throw new Error('Invalid state')
  return value as AttemptState
}
function scope(value: unknown): BaselineScope {
  if (value !== 'OCCUPATION' && value !== 'EARLIER_ROLE' && value !== 'EARLIER_OCCUPATION') throw new Error('Invalid assessment scope')
  return value
}
function parseAttempt(value: unknown): BaselineAttempt {
  const v = object(value)
  if (typeof v.expired !== 'boolean') throw new Error('Invalid expiry')
  return { id: text(v.id), occupationId: text(v.occupationId), occupationName: text(v.occupationName), purpose: text(v.purpose), roleId: nullable(v.roleId), assessmentScope: scope(v.assessmentScope),
    state: state(v.state), revision: integer(v.revision, 1), startedAt: date(v.startedAt), deadlineAt: date(v.deadlineAt), observedAt: date(v.observedAt),
    expired: v.expired, maxQuestions: integer(v.maxQuestions, 1), answeredCount: integer(v.answeredCount), items: list(v.items, item => {
      const i = object(item)
      return { position: integer(i.position, 1), itemVersionId: text(i.itemVersionId), prompt: text(i.prompt), selectedOptionId: nullable(i.selectedOptionId),
        options: list(i.options, option => { const o = object(option); return { id: text(o.id), text: text(o.text) } }) }
    }) }
}
function parseResult(value: unknown): BaselineResult {
  const v = object(value), terminal = state(v.state)
  if (terminal === 'IN_PROGRESS') throw new Error('Invalid terminal state')
  const result: BaselineResult = { attemptId: text(v.attemptId), occupationId: text(v.occupationId), occupationName: text(v.occupationName), purpose: text(v.purpose),
    roleId: nullable(v.roleId), roleName: nullable(v.roleName), assessmentScope: scope(v.assessmentScope), state: terminal, completionReason: text(v.completionReason), startedAt: date(v.startedAt), completedAt: date(v.completedAt),
    replacesAttemptId: nullable(v.replacesAttemptId), replacementAttemptId: nullable(v.replacementAttemptId), rawScore: v.rawScore === null ? null : ratio(v.rawScore),
    skills: list(v.skills, skill => { const s = object(skill), confidence = text(s.confidence)
      if (!['LOW', 'MEDIUM', 'HIGH'].includes(confidence)) throw new Error('Invalid confidence')
      return { microSkillId: text(s.microSkillId), microSkillName: text(s.microSkillName), mastery: ratio(s.mastery), confidence: confidence as 'LOW' | 'MEDIUM' | 'HIGH' }
    }) }
  if (terminal === 'INVALIDATED' ? result.rawScore !== null || result.skills.length !== 0 : result.rawScore === null || result.skills.length === 0) throw new Error('Invalid result evidence')
  if (new Set(result.skills.map(skill => skill.microSkillId)).size !== result.skills.length) throw new Error('Duplicate result skill')
  return result
}
