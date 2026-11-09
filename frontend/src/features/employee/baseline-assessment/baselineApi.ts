import { workspaceFetch } from '../../../shared/api/workspaceFetch'
export type AssessmentPurpose = 'BASELINE' | 'SKILL_ASSESSMENT'
export type AttemptState = 'IN_PROGRESS' | 'FINALIZED'
export interface AssessmentTarget { selectionId: string; selectionRevision: number; stepId?: string | null; moduleId?: string | null; moduleRevision?: number | null }
export interface Requirement { skillId: string; knowledgeLevel: string; outcomeCodes: string[] }
export interface AssessmentGroup { id: string; skillName: string; requirement: Requirement; role: 'TARGET' | 'MAIN' | 'PREREQUISITE'; totalCount: number; requiredCorrectCount: number; mandatoryRequired: boolean }
export interface GroupResult { groupId: string; correctCount: number; totalCount: number; mandatorySatisfied: boolean; passed: boolean; vetoTriggered: boolean; reasons: string[] }
export interface PresentedItem { position: number; itemVersionId: string; groupId: string; prompt: string; options: { id: string; text: string }[]; selectedOptionId: string | null }
export interface BaselineAttempt {
  id: string; target: AssessmentTarget; jobPositionId: string; jobPositionName: string; roleId: string; roleName: string; levelId: string; levelName: string; purpose: AssessmentPurpose
  state: AttemptState; revision: number; startedAt: string; deadlineAt: string; observedAt: string; finishedAt: string | null; finishReason: string | null; previousAttemptId: string | null
  expired: boolean; maxQuestions: number; answeredCount: number; items: PresentedItem[]; groups: AssessmentGroup[]; results: GroupResult[]
}
export type BaselineResult = BaselineAttempt & { state: 'FINALIZED'; finishedAt: string; finishReason: string }
export interface BaselineCommand { path: string; body: string; key: string }
export class BaselineError extends Error {
  readonly code: string
  readonly status: number
  constructor(code: string, status = 0) { super(code); this.code = code; this.status = status }
  get ambiguous() { return this.status === 0 || this.status >= 500 || this.code === 'INVALID_RESPONSE' }
}
const base = '/api/v1/employee/baseline-attempts'
export const employeeBaselineEnabled = import.meta.env.VITE_EMPLOYEE_ADAPTIVE_BASELINE_ENABLED === 'true'
export const attemptPath = (id: string) => '/employee/baseline-assessment/' + encodeURIComponent(id)
export function startCommand(target: AssessmentTarget, purpose: AssessmentPurpose = 'BASELINE', previousAttemptId: string | null = null): BaselineCommand {
  return command('', { purpose, expectedSelectionId: target.selectionId, expectedSelectionRevision: target.selectionRevision, previousAttemptId,
    stepId: target.stepId ?? null, moduleId: target.moduleId ?? null, moduleRevision: target.moduleRevision ?? null })
}
export function answerCommand(attempt: BaselineAttempt, item: PresentedItem, selectedOptionId: string) {
  return command('/' + encodeURIComponent(attempt.id) + '/answers', { expectedRevision: attempt.revision, position: item.position, itemVersionId: item.itemVersionId, selectedOptionId })
}
export const submitCommand = (attempt: BaselineAttempt) => command('/' + encodeURIComponent(attempt.id) + '/submit', { expectedRevision: attempt.revision })
function command(path: string, body: unknown): BaselineCommand { return { path, body: JSON.stringify(body), key: crypto.randomUUID() } }
export const executeCommand = (value: BaselineCommand) => request(value.path, parseAttempt, { method: 'POST', body: value.body, headers: { 'Content-Type': 'application/json', 'Idempotency-Key': value.key } })
export const readAttempt = (id: string, signal?: AbortSignal) => request('/' + encodeURIComponent(id), value => { const result = parseAttempt(value); if (result.id !== id) throw Error(); return result }, { signal })
export const readResult = (id: string, signal?: AbortSignal) => request('/' + encodeURIComponent(id) + '/result', value => {
  const result = parseAttempt(value)
  if (result.id !== id || result.state !== 'FINALIZED' || !result.finishedAt || !result.finishReason) throw Error()
  return result as BaselineResult
}, { signal })
export const readHistory = (signal?: AbortSignal, page = 0) => request('/history?page=' + page + '&size=20', value => list(value, parseAttempt), { signal })
export const readModuleHistory = (moduleId: string, moduleRevision: number, signal?: AbortSignal, page = 0) =>
  request('/history?' + new URLSearchParams({ moduleId, moduleRevision: String(moduleRevision), page: String(page), size: '20' }), value => {
    const attempts = list(value, parseAttempt)
    if (attempts.some(attempt => attempt.purpose !== 'SKILL_ASSESSMENT' || attempt.target.moduleId !== moduleId || attempt.target.moduleRevision !== moduleRevision)) throw Error()
    return attempts
  }, { signal })
export const readContextAttempt = (target: AssessmentTarget, purpose: AssessmentPurpose, signal?: AbortSignal) => {
  const params = new URLSearchParams({ selectionId: target.selectionId, selectionRevision: String(target.selectionRevision), purpose })
  if (target.stepId) params.set('stepId', target.stepId)
  if (target.moduleId) params.set('moduleId', target.moduleId)
  if (target.moduleRevision) params.set('moduleRevision', String(target.moduleRevision))
  return request('/context?' + params, value => value === null ? null : parseAttempt(value), { signal })
}
async function request<T>(path: string, parse: (value: unknown) => T, init: RequestInit = {}): Promise<T> {
  let response: Response
  try { response = await workspaceFetch(base + path, init) }
  catch (cause) { if (init.signal?.aborted) throw cause; throw new BaselineError('NETWORK_ERROR') }
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const code = payload && typeof payload === 'object' && 'code' in payload && typeof payload.code === 'string' ? payload.code : 'REQUEST_FAILED'
    throw new BaselineError(code, response.status)
  }
  try { return parse(payload) } catch { throw new BaselineError('INVALID_RESPONSE', response.status) }
}
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(); return value as Record<string, unknown> }
function text(value: unknown): string { if (typeof value !== 'string' || !value.trim()) throw Error(); return value }
function nullable(value: unknown): string | null { return value === null ? null : text(value) }
function count(value: unknown, min = 0): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min) throw Error(); return value }
function bool(value: unknown): boolean { if (typeof value !== 'boolean') throw Error(); return value }
function date(value: unknown): string { const result = text(value); if (!Number.isFinite(Date.parse(result))) throw Error(); return result }
function list<T>(value: unknown, parse: (value: unknown) => T): T[] { if (!Array.isArray(value)) throw Error(); return value.map(parse) }
function requirement(value: unknown): Requirement {
  const r = object(value), knowledgeLevel = text(r.knowledgeLevel), outcomeCodes = [] as string[]
  if (!['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'].includes(knowledgeLevel)) throw Error()
  return { skillId: text(r.skillId), knowledgeLevel, outcomeCodes }
}
function parseAttempt(value: unknown): BaselineAttempt {
  const v = object(value), target = object(v.target), purpose = text(v.purpose), state = text(v.state)
  if (!['BASELINE', 'SKILL_ASSESSMENT'].includes(purpose) || !['IN_PROGRESS', 'FINALIZED'].includes(state)) throw Error()
  const groups = list(v.groups, raw => {
    const g = object(raw), role = text(g.role), totalCount = count(g.totalCount, 1), requiredCorrectCount = count(g.requiredCorrectCount, 1)
    if (!['TARGET', 'MAIN', 'PREREQUISITE'].includes(role) || requiredCorrectCount > totalCount) throw Error()
    return { id: text(g.id), skillName: text(g.skillName), requirement: requirement(g.requirement), role: role as AssessmentGroup['role'], totalCount, requiredCorrectCount, mandatoryRequired: bool(g.mandatoryRequired) }
  })
  const items = list(v.questions, raw => {
    const i = object(raw), options = list(i.options, raw => { const o = object(raw); return { id: text(o.id), text: text(o.text) } }), selectedOptionId = nullable(i.selectedOptionId)
    if (options.length < 2 || new Set(options.map(o => o.id)).size !== options.length || selectedOptionId !== null && !options.some(o => o.id === selectedOptionId)) throw Error()
    return { position: count(i.position, 1), itemVersionId: text(i.itemVersionId), groupId: text(i.groupId), prompt: text(i.prompt), options, selectedOptionId }
  })
  const results = list(v.results, raw => {
    const r = object(raw), correctCount = count(r.correctCount), totalCount = count(r.totalCount, 1)
    if (correctCount > totalCount) throw Error()
    return { groupId: text(r.groupId), correctCount, totalCount, mandatorySatisfied: bool(r.mandatorySatisfied), passed: bool(r.passed), vetoTriggered: bool(r.vetoTriggered), reasons: list(r.reasons, text) }
  })
  const startedAt = date(v.startedAt), deadlineAt = date(v.deadlineAt), observedAt = date(v.observedAt), finishedAt = v.finishedAt === null ? null : date(v.finishedAt), finishReason = nullable(v.finishReason)
  if (!groups.length || new Set(groups.map(g => g.id)).size !== groups.length || groups.reduce((n, g) => n + g.totalCount, 0) !== items.length
    || items.some(i => !groups.some(g => g.id === i.groupId)) || new Set(items.map(i => i.itemVersionId)).size !== items.length
    || items.some((item, index) => item.position !== index + 1) || Date.parse(deadlineAt) <= Date.parse(startedAt)
    || state === 'FINALIZED' && (!finishedAt || !finishReason || results.length !== groups.length)
    || state === 'IN_PROGRESS' && (finishedAt !== null || finishReason !== null || results.length !== 0)) throw Error()
  for (const g of groups) if (items.filter(i => i.groupId === g.id).length !== g.totalCount) throw Error()
  if (new Set(results.map(r => r.groupId)).size !== results.length || results.some(r => !groups.some(g => g.id === r.groupId && g.totalCount === r.totalCount))) throw Error()
  return { id: text(v.attemptId), target: { selectionId: text(target.selectionId), selectionRevision: count(target.selectionRevision, 1),
    stepId: nullable(target.stepId), moduleId: nullable(target.moduleId), moduleRevision: target.moduleRevision === null ? null : count(target.moduleRevision, 1) },
    jobPositionId: text(target.jobPositionId), jobPositionName: text(target.jobPositionName), roleId: text(target.roleId), roleName: text(target.roleName), levelId: text(target.levelId), levelName: text(target.levelName),
    purpose: purpose as AssessmentPurpose, state: state as AttemptState, revision: count(v.revision, 1), startedAt, deadlineAt, observedAt, finishedAt, finishReason,
    previousAttemptId: nullable(v.previousAttemptId), expired: state !== 'IN_PROGRESS' || Date.parse(observedAt) >= Date.parse(deadlineAt),
    maxQuestions: items.length, answeredCount: items.filter(i => i.selectedOptionId !== null).length, items, groups, results }
}
