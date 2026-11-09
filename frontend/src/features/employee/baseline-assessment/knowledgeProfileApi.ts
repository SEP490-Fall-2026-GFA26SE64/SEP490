import { workspaceFetch } from '../../../shared/api/workspaceFetch'
import { RoleFlowError } from '../target-roles/currentRoleFlowApi'

export interface KnowledgeEntry {
  kind: 'DIAGNOSTIC' | 'EVIDENCE' | 'REVIEW'; id: string; skillId: string; skillName: string; knowledgeLevel: string; skillVersion: string
  outcomeCodes: string[]; observedAt: string; purpose: string | null; attemptId: string | null
  correctCount: number | null; totalCount: number | null; passed: boolean | null; mandatorySatisfied: boolean | null; vetoTriggered: boolean | null
  reasons: string[]; sourceKind: string | null; sourceId: string; reviewState: string | null
}
export interface KnowledgePage { items: KnowledgeEntry[]; page: number; pageSize: number; hasMore: boolean }
const object = (value: unknown): Record<string, unknown> => { if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(); return value as Record<string, unknown> }
const text = (value: unknown): string => { if (typeof value !== 'string' || !value.trim()) throw Error(); return value }
const number = (value: unknown): number => { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw Error(); return value }
const boolean = (value: unknown): boolean => { if (typeof value !== 'boolean') throw Error(); return value }
const optional = <T>(value: unknown, parse: (value: unknown) => T): T | null => value === null || value === undefined ? null : parse(value)
const strings = (value: unknown) => { if (!Array.isArray(value)) throw Error(); return value.map(text) }
function entry(value: unknown): KnowledgeEntry {
  const row = object(value), kind = text(row.kind), knowledgeLevel = text(row.knowledgeLevel)
  if (!['DIAGNOSTIC', 'EVIDENCE', 'REVIEW'].includes(kind) || !['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'].includes(knowledgeLevel)) throw Error()
  const result: KnowledgeEntry = { kind: kind as KnowledgeEntry['kind'], knowledgeLevel, id: text(row.id), skillId: text(row.skillId),
    skillName: optional(row.skillName, text) ?? text(row.skillId), skillVersion: text(row.skillVersion), outcomeCodes: [], observedAt: text(row.observedAt),
    purpose: optional(row.purpose, text), attemptId: optional(row.attemptId, text), correctCount: optional(row.correctCount, number), totalCount: optional(row.totalCount, number),
    passed: optional(row.passed, boolean), mandatorySatisfied: optional(row.mandatorySatisfied, boolean), vetoTriggered: optional(row.vetoTriggered, boolean), reasons: strings(row.reasons),
    sourceKind: optional(row.sourceKind, text), sourceId: text(row.sourceId), reviewState: optional(row.reviewState, text) }
  if (!Number.isFinite(Date.parse(result.observedAt))) throw Error()
  if (kind === 'DIAGNOSTIC' && (result.correctCount === null || result.totalCount === null || result.totalCount < 1 || result.correctCount > result.totalCount
    || result.passed === null || result.mandatorySatisfied === null || result.vetoTriggered === null || !['BASELINE', 'SKILL_ASSESSMENT'].includes(result.purpose ?? '') || !result.attemptId)) throw Error()
  if (kind === 'EVIDENCE' && !['MODULE_ASSESSMENT', 'CERTIFICATE'].includes(result.sourceKind ?? '')) throw Error()
  if (kind === 'REVIEW' && !['NEED_REVIEW', 'RESOLVED'].includes(result.reviewState ?? '')) throw Error()
  return result
}
export async function readKnowledgeProfile(page: number, signal?: AbortSignal): Promise<KnowledgePage> {
  let response: Response
  try { response = await workspaceFetch(`/api/v1/employee/knowledge-profile?page=${page}`, { signal }) }
  catch (cause) { if (signal?.aborted) throw cause; throw new RoleFlowError('NETWORK_ERROR') }
  const value: unknown = await response.json().catch(() => { throw new RoleFlowError('INVALID_RESPONSE', response.status) })
  if (!response.ok) throw new RoleFlowError(typeof object(value).code === 'string' ? String(object(value).code) : 'DEPENDENCY_UNAVAILABLE', response.status)
  try {
    const data = object(value)
    if (!Array.isArray(data.items) || data.items.length > 20 || number(data.page) !== page || number(data.pageSize) !== 20) throw Error()
    return { items: data.items.map(entry), page, pageSize: 20, hasMore: boolean(data.hasMore) }
  } catch { throw new RoleFlowError('INVALID_RESPONSE', response.status) }
}
