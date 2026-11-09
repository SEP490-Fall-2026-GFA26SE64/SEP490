import { workspaceFetch } from '../../../shared/api/workspaceFetch'

export interface CurrentSkill {
  id: string
  code: string | null
  name: string
  requiredKnowledgeLevels: string[]
  requiredScore: number
  mandatory: boolean
}
export interface CurrentLevel {
  id: string
  code: string
  name: string
  rank: number
  context: string
  attainmentRule: string
  duration?: string
  skills: CurrentSkill[]
}
export interface CurrentRole { id: string; code: string; name: string; scope: string; jobPositionId: string; jobPositionName: string; catalogVersion: string; fingerprint: string; levels: CurrentLevel[] }
export interface CurrentSelection { selectionId: string; role: CurrentRole; revision: number; selectedAt: string; available: boolean; levelId?: string | null }
export interface CareerPlacement { roleId: string | null; roleCode: string | null; roleName: string | null; levelName: string | null }
export interface RoleProgress { state: string; requiredCount: number; coveredCount: number; attemptId: string | null; baselineVersion: number | null }
export interface RoleFlowView {
  selection: CurrentSelection | null
  progress: RoleProgress
  placement?: CareerPlacement | null
  targetLocked?: boolean
}

export function resolveLevelRankInRole(role: CurrentRole, levelIdentifier?: string | null): number | null {
  if (!levelIdentifier) return null
  const clean = levelIdentifier.replace(/^(?:rank|level)\s*\d+\s*:\s*/i, '').trim().toLowerCase()
  const matches = role.levels.filter(level =>
    [level.id, level.code, level.name].some(value => value.toLowerCase() === clean),
  )
  if (matches.length !== 1 || matches[0].rank < 1 ||
      role.levels.some(level => level.rank < 1) ||
      new Set(role.levels.map(level => level.rank)).size !== role.levels.length) return null
  return matches[0].rank
}

export function assignedRankForRole(role: CurrentRole, view?: RoleFlowView): number | undefined {
  const placement = view?.placement
  if (!placement) return undefined
  const sameRole = role.id === placement.roleId ||
    Boolean(placement.roleCode && role.code.split('#')[0].toLowerCase() === placement.roleCode.split('#')[0].toLowerCase())
  return sameRole ? resolveLevelRankInRole(role, placement.levelName) ?? undefined : undefined
}

export class RoleFlowError extends Error {
  readonly code: string
  readonly status: number
  constructor(code: string, status = 0) { super(code); this.code = code; this.status = status }
  get ambiguous() { return this.status === 0 || this.status >= 500 || this.code === 'INVALID_RESPONSE' }
}
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error()
  return value as Record<string, unknown>
}
const text = (value: unknown) => { if (typeof value !== 'string') throw Error(); return value }
const optionalText = (value: unknown): string | null => value == null ? null : text(value)
const num = (value: unknown) => { if (typeof value !== 'number' || !Number.isFinite(value)) throw Error(); return value }
const bool = (value: unknown) => { if (typeof value !== 'boolean') throw Error(); return value }
const array = <T>(value: unknown, parse: (item: unknown) => T) => { if (!Array.isArray(value)) throw Error(); return value.map(parse) }

function role(value: unknown): CurrentRole {
  const item = object(value)
  return {
    id: text(item.id), code: text(item.code), name: text(item.name), scope: text(item.scope),
    jobPositionId: text(item.jobPositionId), jobPositionName: text(item.jobPositionName),
    catalogVersion: text(item.catalogVersion), fingerprint: text(item.fingerprint),
    levels: array(item.levels, value => {
      const level = object(value)
      return {
        id: text(level.id), code: text(level.code), name: text(level.name), rank: num(level.rank),
        context: text(level.context), attainmentRule: text(level.attainmentRule),
        duration: optionalText(level.duration) ?? undefined,
        skills: array(level.skills, value => {
          const skill = object(value)
          return {
            id: text(skill.id), code: optionalText(skill.code), name: text(skill.name),
            requiredKnowledgeLevels: array(skill.requiredKnowledgeLevels, text),
            requiredScore: typeof skill.requiredScore === 'number' ? num(skill.requiredScore) : 0.7,
            mandatory: bool(skill.mandatory),
          }
        }),
      }
    }),
  }
}
function selection(value: unknown): CurrentSelection {
  const item = object(value)
  return {
    selectionId: text(item.selectionId), role: role(item.role), revision: num(item.revision),
    selectedAt: text(item.selectedAt), available: bool(item.available), levelId: optionalText(item.levelId),
  }
}
async function request<T>(path: string, init: RequestInit, parse: (value: unknown) => T): Promise<T> {
  let response: Response
  try { response = await workspaceFetch('/api/v1/employee/' + path, init) }
  catch (cause) { if (init.signal?.aborted) throw cause; throw new RoleFlowError('NETWORK_ERROR') }
  let value: unknown
  try { value = await response.json() } catch { throw new RoleFlowError('INVALID_RESPONSE', response.status) }
  if (!response.ok) {
    const failure = value && typeof value === 'object' ? value as Record<string, unknown> : {}
    throw new RoleFlowError(typeof failure.code === 'string' ? failure.code : 'DEPENDENCY_UNAVAILABLE', response.status)
  }
  try { return parse(value) } catch { throw new RoleFlowError('INVALID_RESPONSE', response.status) }
}

/** The server-owned catalog is organization-scoped; employee department is not a selection boundary. */
export const currentRoles = (signal?: AbortSignal): Promise<CurrentRole[]> =>
  request('target-roles', { method: 'GET', signal }, value => array(value, role))

export const readRoleFlow = (signal?: AbortSignal): Promise<RoleFlowView> =>
  request('target-role-selection', { method: 'GET', signal }, value => {
    const item = object(value), progress = object(item.progress)
    const placement = item.placement == null ? null : object(item.placement)
    return {
      selection: item.selection === null ? null : selection(item.selection),
      progress: {
        state: text(progress.state), requiredCount: num(progress.requiredCount), coveredCount: num(progress.coveredCount),
        attemptId: optionalText(progress.attemptId),
        baselineVersion: progress.baselineVersion == null ? null : num(progress.baselineVersion),
      },
      placement: placement ? {
        roleId: optionalText(placement.roleId), roleCode: optionalText(placement.roleCode),
        roleName: optionalText(placement.roleName), levelName: optionalText(placement.levelName),
      } : null,
      // Older running APIs omit this field. Keep their learning data without assuming the target is unlocked.
      targetLocked: item.targetLocked === undefined ? undefined : bool(item.targetLocked),
    }
  })

export interface RoleChoiceCommand { body: string; key: string }
export interface MasteryProfile { jobPositionId: string; jobPositionName: string; attemptId: string; baselineVersion: number; initializedAt: string; skills: { id: string; name: string; mastery: number; confidence: string }[] }
export const readMyMastery = (signal?: AbortSignal) => request('target-role-selection/mastery', { method: 'GET', signal }, value => array(value, value => {
  const item = object(value)
  return {
    jobPositionId: text(item.jobPositionId), jobPositionName: text(item.jobPositionName), attemptId: text(item.attemptId),
    baselineVersion: num(item.baselineVersion), initializedAt: text(item.initializedAt),
    skills: array(item.skills, value => {
      const skill = object(value), mastery = num(skill.mastery), confidence = text(skill.confidence)
      if (mastery < 0 || mastery > 1 || !['LOW', 'MEDIUM', 'HIGH'].includes(confidence)) throw Error()
      return { id: text(skill.id), name: text(skill.name), mastery, confidence }
    }),
  } satisfies MasteryProfile
}))
export const prepareRoleChoice = (id: string, expected: string | null, levelId?: string): RoleChoiceCommand => ({
  body: JSON.stringify({ roleId: id, ...(levelId ? { levelId } : {}), expectedCurrentSelectionId: expected }),
  key: crypto.randomUUID(),
})
export const chooseCurrentRole = (command: RoleChoiceCommand): Promise<CurrentSelection> =>
  request('target-role-selection', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': command.key },
    body: command.body,
  }, selection)
