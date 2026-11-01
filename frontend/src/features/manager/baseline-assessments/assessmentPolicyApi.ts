import { adaptiveHttp } from './adaptiveBaselineApi'

export interface PolicyValues { stopSe: number; highConfidenceSe: number; mediumConfidenceSe: number; k: number }
export interface PolicyVersion {
  pin: { organizationId: string; versionId: string; hash: string; values: PolicyValues }
  version: number; createdBy: string; createdAt: string
}
export interface PolicyState { active: PolicyVersion | null; activationRevision: number }
export interface PolicyPage { items: PolicyVersion[]; total: number; page: number; size: number }
export type PolicyCommand = { kind: 'save'; commandKey: string; values: PolicyValues } |
  { kind: 'activate'; commandKey: string; policyVersionId: string; expectedActivationRevision: number }
const base = '/api/v1/ld/adaptive-baseline-policy'
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid policy response')
  return value as Record<string, unknown>
}
function text(value: unknown): string { if (typeof value !== 'string' || !value) throw new Error('Invalid text'); return value }
function number(value: unknown): number { if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid number'); return value }
function count(value: unknown): number { const n = number(value); if (!Number.isSafeInteger(n) || n < 0) throw new Error('Invalid count'); return n }
function version(value: unknown): PolicyVersion {
  const v = object(value), pin = object(v.pin), raw = object(pin.values)
  const values = { stopSe: number(raw.stopSe), highConfidenceSe: number(raw.highConfidenceSe), mediumConfidenceSe: number(raw.mediumConfidenceSe), k: number(raw.k) }
  if (values.stopSe <= 0 || values.highConfidenceSe <= 0 || values.mediumConfidenceSe <= values.highConfidenceSe || values.k <= 0 || values.k > 10) throw new Error('Invalid policy values')
  const createdAt = text(v.createdAt), release = count(v.version)
  if (!Number.isFinite(Date.parse(createdAt)) || release < 1) throw new Error('Invalid version')
  return { pin: { organizationId: text(pin.organizationId), versionId: text(pin.versionId), hash: text(pin.hash), values }, version: release, createdBy: text(v.createdBy), createdAt }
}
function state(value: unknown): PolicyState {
  const v = object(value), active = v.active === null ? null : version(v.active), activationRevision = count(v.activationRevision)
  if ((active === null) !== (activationRevision === 0)) throw new Error('Invalid activation')
  return { active, activationRevision }
}
export const getAssessmentPolicy = (signal?: AbortSignal) => adaptiveHttp(base, { signal }, state)
export const listAssessmentPolicies = (page: number, signal?: AbortSignal) => adaptiveHttp(`${base}/versions?page=${page}&size=20`, { signal }, value => {
  const v = object(value)
  if (!Array.isArray(v.items)) throw new Error('Invalid policy list')
  return { items: v.items.map(version), total: count(v.total), page: count(v.page), size: count(v.size) }
})
export function runPolicyCommand(command: PolicyCommand) {
  if (command.kind === 'save') return adaptiveHttp(base + '/versions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ commandKey: command.commandKey, ...command.values }),
  }, value => { const v = object(value); if (typeof v.noOp !== 'boolean') throw new Error('Invalid receipt'); return { kind: 'saved' as const, version: version(v.version), noOp: v.noOp } })
  return adaptiveHttp(base + '/activation', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commandKey: command.commandKey, policyVersionId: command.policyVersionId, expectedActivationRevision: command.expectedActivationRevision }),
  }, value => ({ kind: 'activated' as const, state: state(value) }))
}
