import { adaptiveHttp } from './adaptiveBaselineApi'
import { rulePolicy, type AssessmentPurpose, type KnowledgeLevel, type RulePolicy } from './assessmentRulePolicyApi'

export interface ScopeChoice { key: string; ownerId: string; ownerName: string; levelId: string; levelName: string; rank: number; ready: boolean }
export interface ScopeGroup { requirement: { skillId: string; knowledgeLevel: KnowledgeLevel; outcomeCodes: string[] }; skillName: string; skillVersion: string | null; provisionMode?: 'MODULE_ONLY' | 'CERTIFICATE_ONLY' | null; readinessIssues: string[] }
export interface PolicyScope extends ScopeChoice { purpose: AssessmentPurpose; catalogHash: string; groups: ScopeGroup[]; readinessIssues: string[] }
export interface ScopedVersion { id: string; version: number; configuration: RulePolicy; catalogHash: string; createdAt: string }
export interface BaselineLevelRule { knowledgeLevel: KnowledgeLevel; totalCount: number | null; requiredCorrectCount: number | null }
export interface BaselineEditorState { step: number; completed: boolean; levels: BaselineLevelRule[]; timeLimitSeconds: number | null; retakeWaitSeconds: number | null; maxAttempts: number | null }
export interface LevelCapacity { knowledgeLevel: KnowledgeLevel; skillCount: number; maxQuestions: number; limitingSkills: string[] }
export interface ScopedDraft { id: string; revision: number; configuration: RulePolicy | null; catalogHash: string; updatedAt: string; editorState: BaselineEditorState | null }
export interface AbandonedDraft extends ScopedDraft { abandonedAt: string }
export interface GroupCapacity { skillId: string; knowledgeLevel: KnowledgeLevel; minQuestions: number; maxQuestions: number; mandatoryQuestions: number }
export interface PolicyWorkspace { scope: PolicyScope; draft: ScopedDraft | null; active: ScopedVersion | null; activationRevision: number; versions: ScopedVersion[]; totalVersions: number; capacities: LevelCapacity[]; maxPaperItems: number; abandonedDrafts: AbandonedDraft[]; totalAbandonedDrafts: number; groupCapacities: GroupCapacity[] }
export type ConfigStatus = 'UNCONFIGURED' | 'DRAFT' | 'ACTIVE' | 'HISTORY'
export interface PolicyDirectory { rows: { scope: ScopeChoice; status: ConfigStatus; hasDraft: boolean; activeVersion: number | null; versionCount: number; draftIncomplete: boolean; archivedCount: number }[]; total: number; choices: ScopeChoice[]; issues: { ownerId: string; ownerName: string; levelName: string; code: string }[] }
export type ScopedCommand = { purpose: AssessmentPurpose; scopeKey: string; commandKey: string } & (
  { kind: 'create'; expectedActivationRevision: number } |
  { kind: 'save'; draftId: string; expectedRevision: number; expectedCatalogHash: string; configuration: RulePolicy } |
  { kind: 'progress'; draftId: string; expectedRevision: number; expectedCatalogHash: string; editorState: BaselineEditorState } |
  { kind: 'complete'; draftId: string; expectedRevision: number; expectedActivationRevision: number; expectedCatalogHash: string; editorState: BaselineEditorState } |
  { kind: 'abandon'; draftId: string; expectedRevision: number } |
  { kind: 'activate'; draftId: string; expectedRevision: number; expectedActivationRevision: number; expectedCatalogHash: string })
const base = (purpose: AssessmentPurpose) => `/api/v1/assessment-policies/${purpose}/scopes`
function obj(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid configuration response'); return value as Record<string, unknown> }
function str(value: unknown): string { if (typeof value !== 'string' || !value.trim()) throw new Error('Missing configuration value'); return value }
function num(value: unknown, min = 0): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min) throw new Error('Invalid configuration count'); return value }
function bool(value: unknown): boolean { if (typeof value !== 'boolean') throw new Error('Invalid configuration state'); return value }
function list<T>(value: unknown, parse: (v: unknown) => T): T[] { if (!Array.isArray(value)) throw new Error('Invalid configuration list'); return value.map(parse) }
function hash(value: unknown): string { const result = str(value); if (!/^[0-9a-f]{64}$/.test(result)) throw new Error('Invalid configuration scope'); return result }
function date(value: unknown): string { const result = str(value); if (!Number.isFinite(Date.parse(result))) throw new Error('Invalid configuration date'); return result }
function knowledge(value: unknown): KnowledgeLevel { if (value !== 'FOUNDATION' && value !== 'INTERMEDIATE' && value !== 'ADVANCED') throw new Error('Invalid knowledge level'); return value }
function editorState(value: unknown): BaselineEditorState | null {
  if (value === undefined || value === null) return null
  const v = obj(value), step = num(v.step, 1)
  if (step > 3) throw new Error('Invalid editor step')
  const optional = (n: unknown, min: number) => n === null ? null : num(n, min)
  return { step, completed: bool(v.completed), levels: list(v.levels, raw => { const row = obj(raw); return { knowledgeLevel: knowledge(row.knowledgeLevel), totalCount: optional(row.totalCount, 1), requiredCorrectCount: optional(row.requiredCorrectCount, 1) } }), timeLimitSeconds: optional(v.timeLimitSeconds, 1), retakeWaitSeconds: optional(v.retakeWaitSeconds, 0), maxAttempts: optional(v.maxAttempts, 1) }
}
function choice(value: unknown): ScopeChoice { const v = obj(value); return { key: hash(v.key), ownerId: str(v.ownerId), ownerName: str(v.ownerName), levelId: str(v.levelId), levelName: str(v.levelName), rank: num(v.rank), ready: bool(v.ready) } }
function version(value: unknown): ScopedVersion { const v = obj(value); return { id: str(v.id), version: num(v.version, 1), configuration: rulePolicy(v.configuration), catalogHash: hash(v.catalogHash), createdAt: date(v.createdAt) } }
function workspace(value: unknown, purpose: AssessmentPurpose, key: string): PolicyWorkspace {
  const v = obj(value), s = obj(v.scope), scope = choice(s)
  if (s.purpose !== purpose || scope.key !== key) throw new Error('Configuration scope mismatch')
  const groups = list<ScopeGroup>(s.groups, raw => {
    const g = obj(raw), r = obj(g.requirement), level = r.knowledgeLevel
    if (!['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'].includes(str(level))) throw new Error('Invalid knowledge level')
    const mode = g.provisionMode
    if (mode !== undefined && mode !== null && mode !== 'MODULE_ONLY' && mode !== 'CERTIFICATE_ONLY') throw new Error('Invalid provision mode')
    return { requirement: { skillId: str(r.skillId), knowledgeLevel: level as KnowledgeLevel, outcomeCodes: [] }, skillName: str(g.skillName), skillVersion: g.skillVersion === null ? null : str(g.skillVersion), provisionMode: mode, readinessIssues: g.readinessIssues === undefined ? [] : list(g.readinessIssues, str) }
  })
  const d = v.draft === null ? null : obj(v.draft)
  return { scope: { ...scope, purpose, catalogHash: hash(s.catalogHash), groups, readinessIssues: s.readinessIssues === undefined ? [] : list(s.readinessIssues, str) },
    draft: d && { id: str(d.id), revision: num(d.revision, 1), configuration: d.configuration === null ? null : rulePolicy(d.configuration), catalogHash: hash(d.catalogHash), updatedAt: date(d.updatedAt), editorState: editorState(d.editorState) },
    active: v.active === null ? null : version(v.active), activationRevision: num(v.activationRevision), versions: list(v.versions, version), totalVersions: num(v.totalVersions),
    groupCapacities: v.groupCapacities == null ? [] : list(v.groupCapacities, raw => { const c = obj(raw); return { skillId: str(c.skillId), knowledgeLevel: knowledge(c.knowledgeLevel), minQuestions: num(c.minQuestions, 1), maxQuestions: num(c.maxQuestions), mandatoryQuestions: num(c.mandatoryQuestions) } }),
    capacities: v.capacities === undefined ? [] : list(v.capacities, raw => { const c = obj(raw); return { knowledgeLevel: knowledge(c.knowledgeLevel), skillCount: num(c.skillCount, 1), maxQuestions: num(c.maxQuestions), limitingSkills: list(c.limitingSkills, str) } }), maxPaperItems: v.maxPaperItems === undefined ? 0 : num(v.maxPaperItems),
    abandonedDrafts: list(v.abandonedDrafts, raw => { const d = obj(raw); return { id: str(d.id), revision: num(d.revision, 1), configuration: d.configuration === null ? null : rulePolicy(d.configuration), catalogHash: hash(d.catalogHash), updatedAt: date(d.updatedAt), editorState: editorState(d.editorState), abandonedAt: date(d.abandonedAt) } }), totalAbandonedDrafts: num(v.totalAbandonedDrafts) }
}
export function getPolicyDirectory(purpose: AssessmentPurpose, query: URLSearchParams, signal: AbortSignal) {
  return adaptiveHttp(base(purpose) + '?' + query, { signal }, raw => {
    const v = obj(raw)
    return { rows: list(v.rows, raw => { const r = obj(raw), status = str(r.status); if (!['UNCONFIGURED', 'DRAFT', 'ACTIVE', 'HISTORY'].includes(status)) throw new Error('Invalid configuration status');
      return { scope: choice(r.scope), status: status as ConfigStatus, hasDraft: bool(r.hasDraft), activeVersion: r.activeVersion === null ? null : num(r.activeVersion, 1), versionCount: num(r.versionCount), draftIncomplete: r.draftIncomplete === undefined ? false : bool(r.draftIncomplete), archivedCount: num(r.archivedCount) } }), total: num(v.total), choices: list(v.choices, choice),
      issues: v.issues === undefined ? [] : list(v.issues, raw => { const issue = obj(raw); return { ownerId: str(issue.ownerId), ownerName: str(issue.ownerName), levelName: str(issue.levelName), code: str(issue.code) } }) } satisfies PolicyDirectory
  })
}
export const getPolicyWorkspace = (purpose: AssessmentPurpose, key: string, page: number, signal: AbortSignal) =>
  adaptiveHttp(`${base(purpose)}/${encodeURIComponent(key)}?page=${page}&size=20`, { signal }, raw => workspace(raw, purpose, key))
export function runScopedCommand(command: ScopedCommand) {
  const { purpose, scopeKey, kind, ...body } = command
  return adaptiveHttp(`${base(purpose)}/${encodeURIComponent(scopeKey)}/${kind === 'activate' ? 'activation' : kind === 'complete' ? 'completion' : kind === 'abandon' ? 'abandonment' : kind === 'progress' ? 'draft/editor' : 'draft'}`, {
    method: kind === 'save' || kind === 'progress' ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }, raw => workspace(raw, purpose, scopeKey))
}
