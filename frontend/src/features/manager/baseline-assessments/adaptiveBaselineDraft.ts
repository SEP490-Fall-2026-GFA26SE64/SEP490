import type { AdaptiveBounds, AdaptiveCapacity, AdaptiveConfiguration, AdaptiveWorkspace } from './adaptiveBaselineApi'

export interface AdaptiveBoundsDraft { maxQuestions: string; totalMinutes: string; totalSeconds: string; secondsPerQuestion: string }
export interface AdaptiveDraft { name: string; exploration: AdaptiveBoundsDraft; roles: Record<string, AdaptiveBoundsDraft> }
export type AdaptiveTimeField = 'maxQuestions' | 'totalMinutes' | 'secondsPerQuestion'
const maximumInteger = 2_147_483_647

const positive = (value: string) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) > 0
const whole = (value: string) => positive(value) && Number.isSafeInteger(Number(value)) && Number(value) <= maximumInteger

/** 60s is only an editable UI suggestion; absent max/duration stay blank and cannot be serialized. */
export function boundsDraft(saved?: AdaptiveBounds): AdaptiveBoundsDraft {
  return saved
    ? { maxQuestions: String(saved.maxQuestions), totalMinutes: String(saved.timeLimitSeconds / 60), totalSeconds: String(saved.timeLimitSeconds), secondsPerQuestion: String(saved.timeLimitSeconds / saved.maxQuestions) }
    : { maxQuestions: '', totalMinutes: '', totalSeconds: '', secondsPerQuestion: '60' }
}

export function createAdaptiveDraft(workspace: AdaptiveWorkspace): AdaptiveDraft {
  const source = workspace.working?.configuration ?? workspace.current?.configuration
  return { name: source?.name ?? '', exploration: boundsDraft(source?.exploration), roles: Object.fromEntries(
    Object.keys(workspace.capacity.roles).map(id => [id, boundsDraft(source && Object.hasOwn(source.roles, id) ? source.roles[id] : undefined)])) }
}

export function hasAdaptiveRoleDrift(workspace: AdaptiveWorkspace): boolean {
  const source = workspace.working?.configuration ?? workspace.current?.configuration
  const roles = Object.keys(workspace.capacity.roles)
  return Boolean(source && (roles.length !== Object.keys(source.roles).length || roles.some(id => !Object.hasOwn(source.roles, id))))
}

/** Total duration is resolved to whole server seconds, never inferred by the backend. */
export function editAdaptiveBounds(value: AdaptiveBoundsDraft, field: AdaptiveTimeField, raw: string): AdaptiveBoundsDraft {
  const next = { ...value, [field]: raw }
  const count = whole(next.maxQuestions) ? Number(next.maxQuestions) : null
  if (field === 'totalMinutes') {
    const seconds = positive(raw) ? Math.round(Number(raw) * 60) : null
    return { ...next, totalSeconds: seconds === null ? '' : String(seconds), secondsPerQuestion: seconds !== null && count ? String(seconds / count) : '' }
  }
  if (count && positive(next.secondsPerQuestion)) {
    const seconds = Math.round(count * Number(next.secondsPerQuestion))
    return { ...next, totalSeconds: String(seconds), totalMinutes: String(seconds / 60) }
  }
  if (field === 'maxQuestions' && count && whole(next.totalSeconds)) {
    return { ...next, secondsPerQuestion: String(Number(next.totalSeconds) / count) }
  }
  return field === 'secondsPerQuestion' ? { ...next, totalSeconds: '', totalMinutes: '' } : next
}

export function adaptiveBoundsValid(value: AdaptiveBoundsDraft, capacity: number): boolean {
  return whole(value.maxQuestions) && Number(value.maxQuestions) <= capacity && whole(value.totalSeconds)
}

/** Fresh allowlist, including only current roles and final total seconds. No calculator/legacy metadata. */
export function adaptiveConfiguration(value: AdaptiveDraft, capacity: AdaptiveCapacity): AdaptiveConfiguration | null {
  const ids = Object.keys(capacity.roles)
  if (!value.name.trim() || ids.length === 0 || ids.length !== Object.keys(value.roles).length
      || !adaptiveBoundsValid(value.exploration, capacity.explorationCapacity)
      || ids.some(id => !Object.hasOwn(value.roles, id) || !adaptiveBoundsValid(value.roles[id], capacity.roles[id].eligibleCapacity))) return null
  const bounds = (row: AdaptiveBoundsDraft): AdaptiveBounds => ({ maxQuestions: Number(row.maxQuestions), timeLimitSeconds: Number(row.totalSeconds) })
  return { name: value.name.trim(), exploration: bounds(value.exploration), roles: Object.fromEntries(ids.map(id => [id, bounds(value.roles[id])])) }
}
