import { request, type PendingPathwayCommand } from './initialPathway'
export const rulePathwaysEnabled = import.meta.env.VITE_LOCAL_BASELINE_DEMO_ENABLED !== 'true'
export type KnowledgeLevel = 'FOUNDATION' | 'INTERMEDIATE' | 'ADVANCED'
export interface RuleRequirement { skillId: string; skillName: string; knowledgeLevel: KnowledgeLevel; skillVersion: string | null; outcomeCodes: string[]; provision: 'MODULE_ONLY' | 'CERTIFICATE_ONLY' | 'UNCONFIGURED' }
export interface RuleModuleOption { moduleId: string; moduleRevision: number; contentVersion: string; title: string; startedAt: string | null; completedAt: string | null }
export interface RuleCertificate { id: string; version: string; name: string; referenceUrl: string }
export interface RuleStep { id: string; requirement: RuleRequirement; kind: 'REQUIRED' | 'PARALLEL_SUPPLEMENT'; state: 'NEEDS_SUPPLEMENTATION' | 'NEEDS_EXPERT_ACTION' | 'IN_PROGRESS' | 'FULFILLED' | 'BYPASSED'; reason: string; fulfilledEvidenceId: string | null; options: RuleModuleOption[]; certificate: RuleCertificate | null; learningLocked: boolean }
export interface RuleDependency { prerequisiteStepId: string; dependentStepId: string; attemptId: string; groupId: string }
export interface RulePathway { requestId: string; selectionId: string; selectionRevision: number; roleId: string; roleName: string; levelId: string; levelName: string; generationStatus: string; reviewStatus: string; reasonCode: string | null; revision: number | null; contentHash: string | null; archived: boolean; targetReleased: boolean; steps: RuleStep[]; dependencies: RuleDependency[] }
export interface RulePreview { selectionId: string; selectionRevision: number; roleId: string; levelId: string; inputHash: string; baselineRequired: boolean; required: RuleRequirement[]; parallelCount: number; currentRequestId: string | null }
export interface RuleReviewSummary { requestId: string; learnerId: string; learnerName: string; roleName: string; levelName: string; generationStatus: string; reviewStatus: string; reasonCode: string | null; revision: number | null; contentHash: string | null }
export interface RuleValidation { revision: number; contentHash: string | null; valid: boolean; issues: { stepId: string | null; reason: string; blocking: boolean }[] }
export interface RuleCandidate { stepId: string; module: RuleModuleOption & { outcomeCodes: string[]; skillVersion: string } }
export interface RuleRelatedModule { skillId: string; knowledgeLevel: KnowledgeLevel; module: RuleCandidate['module'] }
export interface RuleModuleSelection { stepId: string; options: { moduleId: string; moduleRevision: number; contentVersion: string }[] }
export interface RuleReviewDetail { status: RuleReviewSummary; plan: { steps: RuleStep[]; dependencies: RuleDependency[] }; validation: RuleValidation; archived: boolean; candidates: RuleCandidate[]; related: RuleRelatedModule[]; reorderableStepIds: string[] }
function object(v: unknown): Record<string, unknown> { if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error(); return v as Record<string, unknown> }
function text(v: unknown): string { if (typeof v !== 'string' || !v.trim()) throw Error(); return v }
function count(v: unknown): number { if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0) throw Error(); return v }
function bool(v: unknown): boolean { if (typeof v !== 'boolean') throw Error(); return v }
function nullable<T>(v: unknown, parse: (v: unknown) => T): T | null { return v === null ? null : parse(v) }
function list<T>(v: unknown, parse: (v: unknown) => T): T[] { if (!Array.isArray(v) || v.length > 100000) throw Error(); return v.map(parse) }
function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T { const value = text(v); if (!allowed.includes(value as T)) throw Error(); return value as T }
function timestamp(v: unknown): string { const value = text(v); if (!Number.isFinite(Date.parse(value))) throw Error(); return value }
function requirement(v: unknown): RuleRequirement {
  const r = object(v), provision = oneOf(r.provision, ['MODULE_ONLY', 'CERTIFICATE_ONLY', 'UNCONFIGURED'] as const)
  const skillVersion = nullable(r.skillVersion, text), outcomeCodes = list(r.outcomeCodes, text)
  if (new Set(outcomeCodes).size !== outcomeCodes.length || provision !== 'UNCONFIGURED' && (!skillVersion || !outcomeCodes.length)) throw Error()
  return { skillId: text(r.skillId), skillName: text(r.skillName), knowledgeLevel: oneOf(r.knowledgeLevel, ['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'] as const), skillVersion, outcomeCodes, provision }
}
function certificate(v: unknown): RuleCertificate { const c = object(v), url = new URL(text(c.referenceUrl)); if (url.protocol !== 'https:' || url.username || url.password) throw Error(); return { id: text(c.id), version: text(c.version), name: text(c.name), referenceUrl: url.href } }
export const parseRuleRequirement = requirement
export const parseRuleCertificate = certificate
function step(v: unknown, review = false): RuleStep {
  const s = object(v)
  return { id: text(s.id), requirement: requirement(s.requirement), kind: oneOf(s.kind, ['REQUIRED', 'PARALLEL_SUPPLEMENT'] as const), state: oneOf(s.state, ['NEEDS_SUPPLEMENTATION', 'NEEDS_EXPERT_ACTION', 'IN_PROGRESS', 'FULFILLED', 'BYPASSED'] as const), reason: text(s.reason), fulfilledEvidenceId: nullable(s.fulfilledEvidenceId, text),
    options: list(s.options, v => { const o = object(v), revision = count(o.moduleRevision); if (!revision) throw Error(); return { moduleId: text(o.moduleId), moduleRevision: revision, contentVersion: text(o.contentVersion), title: text(o.title), startedAt: nullable(o.startedAt ?? null, timestamp), completedAt: nullable(o.completedAt ?? null, timestamp) } }),
    certificate: nullable(s.certificate, certificate), learningLocked: review || bool(s.learningLocked) }
}
function dependency(v: unknown): RuleDependency { const d = object(v); return { prerequisiteStepId: text(d.prerequisiteStepId), dependentStepId: text(d.dependentStepId), attemptId: text(d.attemptId), groupId: text(d.groupId) } }
function pathway(v: unknown): RulePathway | null {
  if (v === null) return null
  const p = object(v)
  return { requestId: text(p.requestId), selectionId: text(p.selectionId), selectionRevision: count(p.selectionRevision), roleId: text(p.roleId), roleName: text(p.roleName), levelId: text(p.levelId), levelName: text(p.levelName), generationStatus: text(p.generationStatus), reviewStatus: text(p.reviewStatus), reasonCode: nullable(p.reasonCode, text), revision: nullable(p.revision, count), contentHash: nullable(p.contentHash, text), archived: bool(p.archived), targetReleased: bool(p.targetReleased), steps: list(p.steps, v => step(v)), dependencies: list(p.dependencies, dependency) }
}
export const readRulePathway = (id?: string | null, signal?: AbortSignal) => request(id ? 'employee/pathways/' + encodeURIComponent(id) : 'employee/pathway', pathway, { signal })
export const readRulePreview = (roleId: string, levelId: string, signal?: AbortSignal) => request('employee/role-gaps?roleId=' + encodeURIComponent(roleId) + '&levelId=' + encodeURIComponent(levelId), v => { const p = object(v); return { selectionId: text(p.selectionId), selectionRevision: count(p.selectionRevision), roleId: text(p.roleId), levelId: text(p.levelId), inputHash: text(p.inputHash), baselineRequired: bool(p.baselineRequired), required: list(p.required, requirement), parallelCount: count(p.parallelCount), currentRequestId: nullable(p.currentRequestId, text) } satisfies RulePreview }, { signal })
export const ruleConfirmation = (p: RulePreview): PendingPathwayCommand => ({ path: 'employee/initial-pathway-requests', key: crypto.randomUUID(), body: JSON.stringify({ roleId: p.roleId, levelId: p.levelId, expectedSelectionId: p.selectionId, expectedSelectionRevision: p.selectionRevision, expectedInputHash: p.inputHash }) })
function summary(v: unknown): RuleReviewSummary { const s = object(v); return { requestId: text(s.requestId), learnerId: text(s.learnerId), learnerName: text(s.learnerName), roleName: text(s.roleName), levelName: text(s.levelName), generationStatus: text(s.generationStatus), reviewStatus: text(s.reviewStatus), reasonCode: nullable(s.reasonCode, text), revision: nullable(s.revision, count), contentHash: nullable(s.contentHash, text) } }
function validation(v: unknown): RuleValidation { const r = object(v); return { revision: count(r.revision), contentHash: nullable(r.contentHash, text), valid: bool(r.valid), issues: list(r.issues, v => { const i = object(v); return { stepId: nullable(i.stepId, text), reason: text(i.reason), blocking: bool(i.blocking) } }) } }
export const readRuleReviewQueue = (offset: number, signal?: AbortSignal) => request(`expert/initial-pathways?offset=${offset}&limit=20`, v => list(v, summary), { signal })
function candidate(v: unknown): RuleCandidate { const c = object(v), m = object(c.module); return { stepId: text(c.stepId), module: { moduleId: text(m.moduleId), moduleRevision: count(m.moduleRevision), contentVersion: text(m.contentVersion), title: text(m.title), outcomeCodes: list(m.outcomeCodes, text), skillVersion: text(m.skillVersion), startedAt: null, completedAt: null } } }
function related(v: unknown): RuleRelatedModule { const r = object(v); return { skillId: text(r.skillId), knowledgeLevel: oneOf(r.knowledgeLevel, ['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'] as const), module: candidate({ stepId: 'related', module: r.module }).module } }
export const readRuleReview = (id: string, signal?: AbortSignal) => request('expert/initial-pathways/' + encodeURIComponent(id), v => { const d = object(v), p = object(d.plan); return { status: summary(d.status), plan: { steps: list(p.steps, v => step(v, true)), dependencies: list(p.dependencies, dependency) }, validation: validation(d.validation), archived: bool(d.archived), candidates: list(d.candidates, candidate), related: list(d.related ?? [], related), reorderableStepIds: list(d.reorderableStepIds ?? [], text) } satisfies RuleReviewDetail }, { signal })
export const moduleSelectionBody = (detail: RuleReviewDetail, selections: RuleModuleSelection[], stepOrder?: string[]) => ({ ...(stepOrder ? { stepOrder } : {}), expected: { revision: detail.status.revision, contentHash: detail.status.contentHash }, selections })
export const moduleSelectionCommand = (id: string, detail: RuleReviewDetail, selections: RuleModuleSelection[], stepOrder?: string[]): PendingPathwayCommand => ({ path: `expert/initial-pathways/${encodeURIComponent(id)}/module-selection`, key: crypto.randomUUID(), body: JSON.stringify(moduleSelectionBody(detail, selections, stepOrder)) })
export const checkModuleSelection = (id: string, detail: RuleReviewDetail, selections: RuleModuleSelection[], stepOrder?: string[]) => request(`expert/initial-pathways/${encodeURIComponent(id)}/module-selection/check`, v => validation(object(v).validation), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(moduleSelectionBody(detail, selections, stepOrder)) })
export function ruleReviewCommand(id: string, detail: RuleReviewDetail, action: 'confirmation' | 'refresh' | 'bypasses', stepId?: string, reason?: string): PendingPathwayCommand {
  const expected = { revision: detail.status.revision, contentHash: detail.status.contentHash }
  return { path: `expert/initial-pathways/${encodeURIComponent(id)}/${action}`, key: crypto.randomUUID(), body: JSON.stringify(action === 'bypasses' ? { expected, stepId, reason } : expected) }
}
