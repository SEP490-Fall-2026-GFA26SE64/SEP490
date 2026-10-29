import { workspaceFetch } from './workspaceFetch'

const demoSession = import.meta.env.VITE_LOCAL_BASELINE_DEMO_ENABLED === 'true'
export class PathwayError extends Error {
  readonly code: string
  readonly status: number
  readonly diagnostics: string[]
  constructor(code: string, status = 0, diagnostics: string[] = []) { super(code); this.code = code; this.status = status; this.diagnostics = diagnostics }
  get ambiguous() { return this.status === 0 || this.status >= 500 || this.code === 'INVALID_RESPONSE' }
}
const obj = (v: unknown): Record<string, unknown> => { if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error(); return v as Record<string, unknown> }
const str = (v: unknown): string => { if (typeof v !== 'string') throw Error(); return v }
const num = (v: unknown): number => { if (typeof v !== 'number' || !Number.isFinite(v)) throw Error(); return v }
const bool = (v: unknown): boolean => { if (typeof v !== 'boolean') throw Error(); return v }
const list = <T>(v: unknown, parse: (v: unknown) => T): T[] => { if (!Array.isArray(v)) throw Error(); return v.map(parse) }
const nullable = <T>(v: unknown, parse: (v: unknown) => T): T | null => v === null ? null : parse(v)
async function request<T>(path: string, parse: (v: unknown) => T, init: RequestInit = {}): Promise<T> {
  let response: Response
  try { response = await (demoSession ? fetch : workspaceFetch)('/api/v1/' + path, { credentials: 'same-origin', cache: 'no-store', ...init }) }
  catch (cause) { if (init.signal?.aborted) throw cause; throw new PathwayError('NETWORK_ERROR') }
  let value: unknown
  try { value = await response.json() } catch { throw new PathwayError(response.ok ? 'INVALID_RESPONSE' : response.status === 401 ? 'UNAUTHENTICATED' : response.status === 403 ? 'FORBIDDEN' : 'UNAVAILABLE', response.status) }
  if (!response.ok) { const body = obj(value); throw new PathwayError(typeof body.code === 'string' ? body.code : 'UNAVAILABLE', response.status, Array.isArray(body.diagnostics) ? body.diagnostics.filter((v): v is string => typeof v === 'string') : []) }
  try { return parse(value) } catch { throw new PathwayError('INVALID_RESPONSE', response.status) }
}
export interface InitialSession { actorId: string; organizationId: string; persona: string; role: string }
export const initialSession = (signal?: AbortSignal) => request(demoSession ? 'local-baseline-demo/session' : 'workspace-auth/current', v => {
  const s = obj(v)
  if (demoSession) return { actorId: str(s.actorId), organizationId: str(s.organizationId), persona: str(s.persona), role: str(s.role) } satisfies InitialSession
  if (s.stage !== 'COMPLETE' || !Array.isArray(s.roles) || s.roles.length !== 1) throw Error('Incomplete workspace identity')
  return { actorId: str(s.accountId), organizationId: str(s.organizationId), persona: 'workspace', role: str(s.roles[0]) } satisfies InitialSession
}, { signal })
export interface GapRow { skillId: string; name: string; requiredScore: number; mandatory: boolean; mastery: number | null; confidence: string | null; gap: number | null; evidenceState: string; unknownReason: string | null }
export interface GapResult { skills: GapRow[]; need: string }
const gapResult = (v: unknown): GapResult => { const r = obj(v); return { need: str(r.need), skills: list(r.skills, v => {
  const s = obj(v); return { skillId: str(s.skillId), name: str(s.name), requiredScore: num(s.requiredScore), mandatory: bool(s.mandatory), mastery: nullable(s.mastery, num), confidence: nullable(s.confidence, str), gap: nullable(s.gap, num), evidenceState: str(s.evidenceState), unknownReason: nullable(s.unknownReason, str) }
}) } }
export interface GapPreview { businessRoleId: string; roleId: string; levelId: string; roleName: string; levelName: string; expectedSelectionId: string | null; expectedSelectionRevision: number | null; gapInputHash: string; result: GapResult }
export const readRoleGaps = (id: string, levelId: string, signal?: AbortSignal) => request('employee/role-gaps?roleId=' + encodeURIComponent(id) + '&levelId=' + encodeURIComponent(levelId), v => {
  const p = obj(v); return { businessRoleId: str(p.businessRoleId), roleId: str(p.roleId), levelId: str(p.levelId), roleName: str(p.roleName), levelName: str(p.levelName), expectedSelectionId: nullable(p.expectedSelectionId, str), expectedSelectionRevision: nullable(p.expectedSelectionRevision, num), gapInputHash: str(p.gapInputHash), result: gapResult(p.result) } satisfies GapPreview
}, { signal })
export interface PendingPathwayCommand { path: string; body: string; key: string }
export const preparePathwayConfirmation = (p: GapPreview): PendingPathwayCommand => ({ path: 'employee/initial-pathway-requests', key: crypto.randomUUID(), body: JSON.stringify({ roleId: p.roleId, levelId: p.levelId, expectedSelectionId: p.expectedSelectionId, expectedSelectionRevision: p.expectedSelectionRevision, expectedGapInputHash: p.gapInputHash }) })
export const sendPathwayCommand = (command: PendingPathwayCommand) => request(command.path, v => {
  const r = obj(v)
  // Admission and review have different retained outcome DTOs.
  return { requestId: typeof r.requestId === 'string' ? r.requestId : str(r.pathwayId) }
}, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': command.key }, body: command.body })
export interface PathwayStatus { requestId: string; generationStatus: string; reviewStatus: string; validationStatus: string | null; displayState: string; reasonCode: string | null; revision: number | null; revisionContentHash: string | null; roleName: string; levelName: string }
function status(v: unknown): PathwayStatus {
  const s = obj(v); return { requestId: str(s.requestId), generationStatus: str(s.generationStatus), reviewStatus: str(s.reviewStatus), validationStatus: nullable(s.validationStatus, str), displayState: str(s.displayState), reasonCode: nullable(s.reasonCode, str), revision: nullable(s.revision, num), revisionContentHash: nullable(s.revisionContentHash, str), roleName: str(s.roleName), levelName: str(s.levelName) }
}
export type TeachingFocus = 'PRIMARY' | 'SUPPORTING' | 'INCIDENTAL'
export type DifficultyLevel = 'LOW' | 'MEDIUM' | 'HIGH'
export interface TeachingTarget { skillId: string; instructionLevel: string | null; teachingFocus: TeachingFocus | null; difficultyLevel: DifficultyLevel | null; coverageRole: 'COVERAGE' | 'ANCILLARY' | null; expertAttention: boolean; attentionReason: string | null }
function teaching(v: unknown): TeachingTarget {
  const s = obj(v), legacy = s.instructionLevel == null ? null : str(s.instructionLevel)
  if (legacy !== null) {
    if (!['FOUNDATIONAL', 'INTERMEDIATE', 'ADVANCED'].includes(legacy) || s.teachingFocus != null || s.difficultyLevel != null) throw Error()
    return { skillId: str(s.skillId), instructionLevel: legacy, teachingFocus: null, difficultyLevel: null, coverageRole: null, expertAttention: false, attentionReason: null }
  }
  const focus = str(s.teachingFocus), difficulty = str(s.difficultyLevel), coverage = str(s.coverageRole)
  if (!['PRIMARY', 'SUPPORTING', 'INCIDENTAL'].includes(focus) || !['LOW', 'MEDIUM', 'HIGH'].includes(difficulty) || !['COVERAGE', 'ANCILLARY'].includes(coverage)) throw Error()
  const attention = bool(s.expertAttention), reason = nullable(s.attentionReason, str)
  if (attention && !reason?.trim() || coverage === 'COVERAGE' && focus === 'INCIDENTAL') throw Error()
  return { skillId: str(s.skillId), instructionLevel: null, teachingFocus: focus as TeachingFocus, difficultyLevel: difficulty as DifficultyLevel, coverageRole: coverage as 'COVERAGE' | 'ANCILLARY', expertAttention: attention, attentionReason: reason }
}
export interface PathwayModule { id: string; title: string; contentVersion: string; ordinal: number; durationMinutes: number; priceVnd: number; targets: TeachingTarget[] }
function module(v: unknown): PathwayModule {
  const m = obj(v); return { id: str(m.id), title: str(m.title), contentVersion: str(m.contentVersion), ordinal: num(m.ordinal), durationMinutes: num(m.durationMinutes), priceVnd: num(m.priceVnd), targets: list(m.targets, teaching) }
}
export interface PathwayView { status: PathwayStatus | null; archived: boolean; context?: { roleId: string; levelId: string; occupationId: string } | null; baseline?: GapResult | null; modules: { module: PathwayModule; accessState: string; reasonCode: string | null; entry: string | null }[]; dependencies: { moduleId: string; providerModuleId: string | null; dependentSkillId: string; prerequisiteSkillId: string; internal: boolean }[] }
function view(v: unknown): PathwayView {
  const r = obj(v); return { status: nullable(r.status, status), archived: bool(r.archived), context: nullable(r.context ?? null, v => { const c = obj(v); return { roleId: str(c.roleId), levelId: str(c.levelId), occupationId: str(c.occupationId) } }), baseline: nullable(r.baseline ?? null, gapResult), modules: list(r.modules, v => { const m = obj(v); return { module: module(m.module), accessState: str(m.accessState), reasonCode: nullable(m.reasonCode, str), entry: nullable(m.entry, str) } }), dependencies: list(r.dependencies, v => { const g = obj(v); return { moduleId: str(g.moduleId), providerModuleId: nullable(g.providerModuleId, str), dependentSkillId: str(g.dependentSkillId), prerequisiteSkillId: str(g.prerequisiteSkillId), internal: bool(g.internal) } }) }
}
export const readPathwayRequest = (id: string, signal?: AbortSignal) => request('employee/initial-pathway-requests/' + encodeURIComponent(id), status, { signal })
export const readInitialPathway = (signal?: AbortSignal) => request('employee/pathway', view, { signal })
export const readArchivedPathway = (id: string, signal?: AbortSignal) => request('employee/pathways/' + encodeURIComponent(id), view, { signal })
export interface ReviewSummary { id: string; revision: number; contentHash: string; reviewStatus: string; validationStatus: string; roleName: string; levelName: string; learnerId: string | null; learnerLabel: string | null }
function summary(v: unknown): ReviewSummary {
  const s = obj(v); return { id: str(s.id), revision: num(s.revision), contentHash: str(s.contentHash), reviewStatus: str(s.reviewStatus), validationStatus: str(s.validationStatus), roleName: str(s.roleName), levelName: str(s.levelName), learnerId: nullable(s.learnerId ?? null, str), learnerLabel: nullable(s.learnerLabel ?? null, str) }
}
export interface Candidate extends TeachingTarget { moduleId: string; title: string; durationMinutes: number; priceVnd: number; reason: string; preferredDifficulty: DifficultyLevel | null; preference: number }
export interface PathwayQuality { supportingFallbacks: number; secondFallbacks: number; firstFallbacks: number; durationMinutes: number; priceVnd: number; supportingBeneficiaries: string[]; moduleCount: number }
function quality(v: unknown): PathwayQuality | null {
  if (v == null) return null
  const q = obj(v); return { supportingFallbacks: num(q.supportingFallbacks), secondFallbacks: num(q.secondFallbacks), firstFallbacks: num(q.firstFallbacks), durationMinutes: num(q.durationMinutes), priceVnd: num(q.priceVnd), supportingBeneficiaries: list(q.supportingBeneficiaries, str), moduleCount: num(q.moduleCount) }
}
export interface ReviewOverride { action: 'INCLUDE' | 'EXCLUDE' | 'MOVE_UP' | 'MOVE_DOWN' | 'REMOVE'; moduleId: string; reason: string }
function override(v: unknown): ReviewOverride {
  const row = list(v, str)
  if (row.length !== 3 || !['INCLUDE', 'EXCLUDE', 'MOVE_UP', 'MOVE_DOWN', 'REMOVE'].includes(row[0] ?? '') || !row[1]) throw Error()
  return { action: row[0] as ReviewOverride['action'], moduleId: row[1], reason: row[2]! }
}
export interface ReviewDetail { summary: ReviewSummary; gaps: GapResult; revision: { revision: number; contentHash: string; selectedModules: string[]; overrides: ReviewOverride[]; plan: { modules: PathwayModule[]; diagnostics: string[]; warnings: string[]; quality: PathwayQuality | null; dependencies: { moduleId: string; dependentSkillId: string; prerequisiteSkillId: string; providerModuleId: string | null; internalGateId: string | null }[] } }; candidates: Candidate[] }
export const readReviewQueue = (offset: number, signal?: AbortSignal) => request(`expert/initial-pathways?offset=${offset}&limit=20`, v => list(v, summary), { signal })
export const readReviewDetail = (id: string, signal?: AbortSignal) => request('expert/initial-pathways/' + encodeURIComponent(id), v => {
  const d = obj(v), r = obj(d.revision), p = obj(r.plan)
  return { summary: summary(d.summary), gaps: gapResult(d.gaps), revision: { revision: num(r.revision), contentHash: str(r.contentHash), selectedModules: list(r.selectedModules, str), overrides: list(r.overrides ?? [], override), plan: { modules: list(p.modules, module), diagnostics: list(p.diagnostics, str), warnings: list(p.warnings ?? [], str), quality: quality(p.quality), dependencies: list(p.dependencies, v => { const g = obj(v); return { moduleId: str(g.moduleId), dependentSkillId: str(g.dependentSkillId), prerequisiteSkillId: str(g.prerequisiteSkillId), providerModuleId: nullable(g.providerModuleId, str), internalGateId: nullable(g.internalGateId, str) } }) } }, candidates: list(d.candidates, v => { const c = obj(v), preferred = c.preferredDifficulty == null ? null : str(c.preferredDifficulty); if (preferred !== null && !['LOW', 'MEDIUM', 'HIGH'].includes(preferred)) throw Error(); return { ...teaching(c), moduleId: str(c.moduleId), title: str(c.title), durationMinutes: num(c.durationMinutes), priceVnd: num(c.priceVnd), reason: str(c.reason), preferredDifficulty: preferred as DifficultyLevel | null, preference: num(c.preference) } }) } satisfies ReviewDetail
}, { signal })
export const checkReview = (id: string) => request('expert/initial-pathways/' + encodeURIComponent(id) + '/validation', v => { const r = obj(v); return { validationStatus: str(r.validationStatus), diagnostics: list(r.diagnostics, str), revisionContentHash: str(r.revisionContentHash), warnings: list(r.warnings ?? [], str) } })
export type ReviewAction = 'inclusions' | 'exclusions' | 'confirmation' | 'move-up' | 'move-down' | 'removals'
export function prepareReviewCommand(id: string, detail: ReviewDetail, action: ReviewAction, moduleId?: string, reason?: string): PendingPathwayCommand {
  const expected = { expectedRevision: detail.summary.revision, expectedContentHash: detail.summary.contentHash }
  const move = action === 'move-up' || action === 'move-down'
  return { path: `expert/initial-pathways/${encodeURIComponent(id)}/${move ? 'moves' : action}`, key: crypto.randomUUID(), body: JSON.stringify(action === 'confirmation' ? expected : { ...expected, moduleId, reason: reason || null, ...(move ? { direction: action === 'move-up' ? 'UP' : 'DOWN' } : {}) }) }
}
