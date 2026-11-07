import { adaptiveHttp } from './adaptiveBaselineApi'
export type AssessmentPurpose = 'BASELINE' | 'SKILL_ASSESSMENT'
export type KnowledgeLevel = 'FOUNDATION' | 'INTERMEDIATE' | 'ADVANCED'
export interface RuleGroup { skillId: string; knowledgeLevel: KnowledgeLevel; totalCount: number; requiredCorrectCount: number; mandatoryRequired: boolean; allWrongVeto: boolean }
export interface RulePolicy { timeLimitSeconds: number; retakeWaitSeconds: number; maxAttempts: number; groups: RuleGroup[] }
export interface RulePolicyVersion { id: string; purpose: AssessmentPurpose; version: number; configuration: RulePolicy; hash: string; createdBy: string; createdAt: string }
export interface RulePolicyState { purpose: AssessmentPurpose; active: RulePolicyVersion | null; activationRevision: number }
export type RulePolicyCommand = { purpose: AssessmentPurpose; kind: 'save'; commandKey: string; configuration: RulePolicy } |
  { purpose: AssessmentPurpose; kind: 'activate'; commandKey: string; versionId: string; expectedRevision: number }
const base = '/api/v1/ld/adaptive-baseline-policy/rules/'
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid policy response')
  return value as Record<string, unknown>
}
function integer(value: unknown, min: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min) throw new Error('Invalid policy count')
  return value
}
function text(value: unknown): string { if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid policy value'); return value }
export function rulePolicy(value: unknown): RulePolicy {
  const p = object(value)
  if (!Array.isArray(p.groups) || !p.groups.length || p.groups.length > 1000) throw new Error('Configure assessment groups')
  const groups: RuleGroup[] = p.groups.map(raw => {
    const g = object(raw), level = g.knowledgeLevel
    if (level !== 'FOUNDATION' && level !== 'INTERMEDIATE' && level !== 'ADVANCED') throw new Error('Invalid knowledge level')
    const totalCount = integer(g.totalCount, 1), requiredCorrectCount = integer(g.requiredCorrectCount, 1)
    if (totalCount > 500 || requiredCorrectCount > totalCount || typeof g.mandatoryRequired !== 'boolean' || typeof g.allWrongVeto !== 'boolean') throw new Error('Invalid group rule')
    return { skillId: text(g.skillId), knowledgeLevel: level, totalCount, requiredCorrectCount, mandatoryRequired: g.mandatoryRequired, allWrongVeto: g.allWrongVeto }
  })
  if (new Set(groups.map(g => `${g.skillId}:${g.knowledgeLevel}`)).size !== groups.length) throw new Error('Configure unique skill and knowledge groups')
  return { timeLimitSeconds: integer(p.timeLimitSeconds, 1), retakeWaitSeconds: integer(p.retakeWaitSeconds, 0), maxAttempts: integer(p.maxAttempts, 1), groups }
}
function version(value: unknown, purpose: AssessmentPurpose): RulePolicyVersion {
  const v = object(value)
  if (v.purpose !== purpose || !Number.isFinite(Date.parse(text(v.createdAt)))) throw new Error('Invalid policy purpose or date')
  return { id: text(v.id), purpose, version: integer(v.version, 1), configuration: rulePolicy(v.configuration), hash: text(v.hash), createdBy: text(v.createdBy), createdAt: text(v.createdAt) }
}
function state(value: unknown, purpose: AssessmentPurpose): RulePolicyState {
  const s = object(value)
  if (s.purpose !== purpose) throw new Error('Invalid policy purpose')
  const active = s.active === null ? null : version(s.active, purpose), activationRevision = integer(s.activationRevision, 0)
  if ((active === null) !== (activationRevision === 0)) throw new Error('Invalid activation')
  return { purpose, active, activationRevision }
}
export const getRulePolicy = (purpose: AssessmentPurpose, signal?: AbortSignal) => adaptiveHttp(base + purpose, { signal }, value => state(value, purpose))
export const listRulePolicies = (purpose: AssessmentPurpose, page: number, signal?: AbortSignal) => adaptiveHttp(`${base}${purpose}/versions?page=${page}&size=20`, { signal }, value => {
  if (!Array.isArray(value)) throw new Error('Invalid policy versions')
  return value.map(v => version(v, purpose))
})
export function runRulePolicyCommand(command: RulePolicyCommand) {
  return adaptiveHttp(base + command.purpose + (command.kind === 'save' ? '/versions' : '/activation'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(command.kind === 'save' ? { commandKey: command.commandKey, configuration: command.configuration } :
      { commandKey: command.commandKey, versionId: command.versionId, expectedRevision: command.expectedRevision }),
  }, value => command.kind === 'save' ? version(value, command.purpose) : state(value, command.purpose))
}
