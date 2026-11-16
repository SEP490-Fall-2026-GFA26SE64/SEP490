import { workspaceFetch } from '../../../shared/api/workspaceFetch'
import { RoleFlowError } from '../target-roles/currentRoleFlowApi'
import { decodeJobPositionWithTargetRole } from '../../subscription/subscriptionApi'
import type { JourneyRole, JourneySkill } from './knowledgeJourneyApi'

const object = (v: unknown): Record<string, unknown> => { if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error(); return v as Record<string, unknown> }
const text = (v: unknown): string => { if (typeof v !== 'string' || !v.trim()) throw Error(); return v }
const optionalText = (v: unknown): string | null => v == null ? null : text(v)
const bool = (v: unknown): boolean => { if (typeof v !== 'boolean') throw Error(); return v }
const list = <T>(v: unknown, max: number, parse: (v: unknown) => T): T[] => { if (!Array.isArray(v) || v.length > max) throw Error(); return v.map(parse) }
async function read(path: string, signal?: AbortSignal): Promise<unknown> {
  let response: Response
  try { response = await workspaceFetch(path, { signal }) }
  catch (cause) { if (signal?.aborted) throw cause; throw new RoleFlowError('NETWORK_ERROR') }
  const value: unknown = await response.json().catch(() => { throw new RoleFlowError('INVALID_RESPONSE', response.status) })
  if (!response.ok) {
    const failure = value && typeof value === 'object' ? value as Record<string, unknown> : {}
    throw new RoleFlowError(typeof failure.code === 'string' ? failure.code : 'DEPENDENCY_UNAVAILABLE', response.status)
  }
  return value
}
export interface AssignedKnowledgeRole { assigned: JourneyRole | null }
/** Existing own-membership read; it never treats a selected target, cache or history record as assigned employment. */
export async function readAssignedKnowledgeRole(organization: string, account: string, signal?: AbortSignal): Promise<AssignedKnowledgeRole> {
  const value = await read(`/api/v1/organizations/${encodeURIComponent(organization)}/subscription/my-assignment`, signal)
  if (value === null) return { assigned: null }
  let assigned: JourneyRole
  try {
    const member = object(value)
    if (text(member.accountId) !== account || !bool(member.active) || !bool(member.accountActive) || !list(member.roles, 30, text).includes('EMPLOYEE')) throw new RoleFlowError('FORBIDDEN', 403)
    const decoded = decodeJobPositionWithTargetRole(optionalText(member.jobPositionName))
    const roleId = optionalText(member.targetRoleId) ?? decoded.targetRoleId, roleCode = optionalText(member.targetRoleCode) ?? decoded.targetRoleCode
    if (!roleId && !roleCode) return { assigned: null }
    assigned = { id: 'assigned', roleId, roleCode, roleName: optionalText(member.targetRoleName) ?? decoded.targetRoleName ?? roleCode ?? roleId!,
      roleVersion: null, levelId: null, levelName: optionalText(member.targetRoleLevel) ?? decoded.targetRoleLevel, rank: null, revision: null, selectedAt: null,
      current: true, source: 'ASSIGNED', requirementsSource: 'UNAVAILABLE', skills: [] }
  } catch (error) { if (error instanceof RoleFlowError) throw error; throw new RoleFlowError('INVALID_RESPONSE') }
  return { assigned }
}

/** The server's actual current learning target; this never reconstructs older targets from browser storage. */
export async function readCurrentKnowledgeTarget(signal?: AbortSignal): Promise<JourneyRole | null> {
  const value = await read('/api/v1/employee/target-role-selection',signal)
  let current: JourneyRole
  try {
    const view=object(value)
    if(view.selection===null)return null
    const selected=object(view.selection),role=object(selected.role),levelId=optionalText(selected.levelId)
    const levels=list(role.levels,100,object).filter(level=>level.id===levelId)
    if(levelId!==null&&levels.length!==1)throw Error()
    const level=levels[0]
    const skills: JourneySkill[] = level ? list(level.skills, 1000, value => {
      const s = object(value), names = list(s.requiredKnowledgeLevels, 3, text)
      if (new Set(names).size !== names.length || names.some(n => !['FOUNDATION','INTERMEDIATE','ADVANCED'].includes(n))) throw Error()
      // The current-target DTO has no exact skill version: never use catalogVersion as a substitute.
      return { id: text(s.id), name: text(s.name), levels: names.map(knowledgeLevel => ({ knowledgeLevel, skillVersion: null })) }
    }) : []
    if (new Set(skills.map(s => s.id)).size !== skills.length) throw Error()
    const revision=selected.revision,selectedAt=text(selected.selectedAt)
    if(typeof revision!=='number'||!Number.isSafeInteger(revision)||revision<1||!Number.isFinite(Date.parse(selectedAt)))throw Error()
    bool(selected.available)
    current = { id:text(selected.selectionId), roleId:text(role.id),roleCode:optionalText(role.code),roleName:text(role.name),roleVersion:optionalText(role.roleVersion),
      levelId,levelName:level?text(level.name):null,rank:level&&typeof level.rank==='number'&&Number.isSafeInteger(level.rank)?level.rank:null,
      revision,selectedAt,current:true,source:'TARGET',requirementsSource:'CURRENT',skills }
  } catch { throw new RoleFlowError('INVALID_RESPONSE') }
  let summary: unknown
  try { summary=await read('/api/v1/employee/learning-overview',signal) }
  catch(error) {
    if(signal?.aborted || error instanceof RoleFlowError && [401,403].includes(error.status))throw error
    return current
  }
  try {
    const data=object(summary)
    if(data.selectionId!==current.id || data.selectionRevision!==current.revision)throw new RoleFlowError('STALE_SELECTION',409)
    const skills=new Map<string,JourneySkill>(),seen=new Set<string>()
    for(const value of list(data.target,1000,object)) {
      const id=text(value.skillId),name=text(value.skillName),knowledgeLevel=text(value.knowledgeLevel),version=optionalText(value.skillVersion),key=JSON.stringify([id,knowledgeLevel])
      if(!['FOUNDATION','INTERMEDIATE','ADVANCED'].includes(knowledgeLevel)||seen.has(key))throw Error()
      seen.add(key)
      const skill=skills.get(id)??{id,name,levels:[]}
      skill.levels.push({knowledgeLevel,skillVersion:version});skills.set(id,skill)
    }
    // Only exact requirements are used. Aggregate baseline/achievement flags are not assessment results.
    return {...current,skills:[...skills.values()]}
  } catch(error) {if(error instanceof RoleFlowError)throw error;throw new RoleFlowError('INVALID_RESPONSE')}
}
