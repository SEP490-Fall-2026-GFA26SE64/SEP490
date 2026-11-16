import { workspaceFetch } from '../../../shared/api/workspaceFetch'
import { RoleFlowError } from '../target-roles/currentRoleFlowApi'

export interface JourneySkill { id: string; name: string; levels: { knowledgeLevel: string; skillVersion: string | null }[] }
export interface JourneyRole {
  id: string; roleId: string | null; roleCode: string | null; roleName: string; roleVersion: string | null
  levelId: string | null; levelName: string | null; rank: number | null; revision: number | null; selectedAt: string | null
  current: boolean; source: 'ASSIGNED' | 'TARGET'; requirementsSource: 'CURRENT' | 'FROZEN' | 'SELECTION' | 'UNAVAILABLE'; skills: JourneySkill[]
}
export interface JourneyPage { assigned: JourneyRole | null; nodes: JourneyRole[]; page: number; pageSize: number; hasMore: boolean }
const object = (v: unknown): Record<string, unknown> => { if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error(); return v as Record<string, unknown> }
const text = (v: unknown): string => { if (typeof v !== 'string' || !v.trim()) throw Error(); return v }
const count = (v: unknown): number => { if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0) throw Error(); return v }
const bool = (v: unknown): boolean => { if (typeof v !== 'boolean') throw Error(); return v }
const optional = <T>(v: unknown, parse: (v: unknown) => T): T | null => v == null ? null : parse(v)
const list = <T>(v: unknown, max: number, parse: (v: unknown) => T): T[] => { if (!Array.isArray(v) || v.length > max) throw Error(); return v.map(parse) }
function role(value: unknown): JourneyRole {
  const v = object(value), source = text(v.source), requirementsSource = text(v.requirementsSource)
  if (!['ASSIGNED', 'TARGET'].includes(source) || !['CURRENT', 'FROZEN', 'SELECTION', 'UNAVAILABLE'].includes(requirementsSource)) throw Error()
  const selectedAt = optional(v.selectedAt, text)
  if (selectedAt && !Number.isFinite(Date.parse(selectedAt))) throw Error()
  const skills = list(v.skills, 1000, value => {
    const s = object(value), levels = list(s.levels, 3, value => {
      const k = object(value), knowledgeLevel = text(k.knowledgeLevel)
      if (!['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'].includes(knowledgeLevel)) throw Error()
      return { knowledgeLevel, skillVersion: optional(k.skillVersion, text) }
    })
    if (new Set(levels.map(l => l.knowledgeLevel)).size !== levels.length) throw Error()
    return { id: text(s.id), name: text(s.name), levels }
  })
  if (new Set(skills.map(s => s.id)).size !== skills.length) throw Error()
  return { id: text(v.id), roleId: optional(v.roleId, text), roleCode: optional(v.roleCode, text), roleName: text(v.roleName), roleVersion: optional(v.roleVersion, text),
    levelId: optional(v.levelId, text), levelName: optional(v.levelName, text), rank: optional(v.rank, count), revision: optional(v.revision, count), selectedAt,
    current: bool(v.current), source: source as JourneyRole['source'], requirementsSource: requirementsSource as JourneyRole['requirementsSource'], skills }
}
export async function readKnowledgeJourney(page: number, signal?: AbortSignal): Promise<JourneyPage> {
  let response: Response
  try { response = await workspaceFetch(`/api/v1/employee/knowledge-profile/journey?page=${page}`, { signal }) }
  catch (cause) { if (signal?.aborted) throw cause; throw new RoleFlowError('NETWORK_ERROR') }
  const value: unknown = await response.json().catch(() => { throw new RoleFlowError('INVALID_RESPONSE', response.status) })
  if (!response.ok) { const error = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; throw new RoleFlowError(typeof error.code === 'string' ? error.code : 'DEPENDENCY_UNAVAILABLE', response.status) }
  try {
    const v = object(value), nodes = list(v.nodes, 20, role)
    if (count(v.page) !== page || count(v.pageSize) !== 20 || new Set(nodes.map(n => n.id)).size !== nodes.length || nodes.some(n => n.source !== 'TARGET')) throw Error()
    const assigned = optional(v.assigned, role)
    if (assigned && assigned.source !== 'ASSIGNED') throw Error()
    return { assigned, nodes, page, pageSize: 20, hasMore: bool(v.hasMore) }
  } catch { throw new RoleFlowError('INVALID_RESPONSE', response.status) }
}
