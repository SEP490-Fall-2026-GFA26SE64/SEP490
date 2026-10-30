import { isCommonConfiguration, type AdaptiveBounds, type AdaptiveCapacity, type AdaptiveCommonConfiguration, type AdaptiveWorkspace } from './adaptiveBaselineApi'

export interface AdaptiveBoundsDraft { maxQuestions: string; totalMinutes: string; totalSeconds: string; secondsPerQuestion: string; durationMode: 'rate' | 'total' }
export interface AdaptiveDraft { name: string; occupation: AdaptiveBoundsDraft }
export type AdaptiveTimeField = 'maxQuestions' | 'totalMinutes' | 'secondsPerQuestion'
export type AdaptiveField = 'name' | AdaptiveTimeField
export type AdaptiveFieldErrors = Partial<Record<AdaptiveField, string>>
const maximumInteger = 2_147_483_647
const positive = (value: string) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) > 0
const whole = (value: string) => positive(value) && Number.isSafeInteger(Number(value)) && Number(value) <= maximumInteger

/** Editable rate suggestion; clearing inputs never restores it silently. */
export function boundsDraft(saved?: AdaptiveBounds): AdaptiveBoundsDraft {
  return saved
    ? { maxQuestions: String(saved.maxQuestions), totalMinutes: String(saved.timeLimitSeconds / 60), totalSeconds: String(saved.timeLimitSeconds), secondsPerQuestion: String(saved.timeLimitSeconds / saved.maxQuestions), durationMode: 'total' }
    : { maxQuestions: '', totalMinutes: '', totalSeconds: '', secondsPerQuestion: '60', durationMode: 'rate' }
}
export function createAdaptiveDraft(workspace: AdaptiveWorkspace): AdaptiveDraft {
  const source = workspace.working?.configuration ?? workspace.current?.configuration
  // Never aggregate or adopt legacy Role/exploration bounds as the new common pair.
  return { name: source?.name ?? '', occupation: boundsDraft(source && isCommonConfiguration(source) ? source.occupationBounds : undefined) }
}
export function editAdaptiveBounds(value: AdaptiveBoundsDraft, field: AdaptiveTimeField, raw: string): AdaptiveBoundsDraft {
  const next = { ...value, [field]: raw }
  if (field === 'secondsPerQuestion') next.durationMode = 'rate'
  if (field === 'totalMinutes') next.durationMode = 'total'
  const count = whole(next.maxQuestions) ? Number(next.maxQuestions) : null
  if (next.durationMode === 'total') {
    const seconds = positive(next.totalMinutes) ? Math.round(Number(next.totalMinutes) * 60) : null
    return { ...next, totalSeconds: seconds === null ? '' : String(seconds), secondsPerQuestion: seconds !== null && count ? String(seconds / count) : '' }
  }
  const seconds = count && positive(next.secondsPerQuestion) ? Math.round(count * Number(next.secondsPerQuestion)) : null
  return { ...next, totalSeconds: seconds === null ? '' : String(seconds), totalMinutes: seconds === null ? '' : String(seconds / 60) }
}
/** Client feedback mirrors common configuration limits; server feasibility stays authoritative. */
export function adaptiveErrors(value: AdaptiveDraft, capacity: AdaptiveCapacity): AdaptiveFieldErrors {
  const errors: AdaptiveFieldErrors = {}, bounds = value.occupation, limits = capacity.occupation
  if (!value.name.trim()) errors.name = 'nameRequired'
  else if (Array.from(value.name.trim()).length > 100) errors.name = 'nameLength'
  if (!bounds.maxQuestions.trim()) errors.maxQuestions = 'maximumRequired'
  else if (!whole(bounds.maxQuestions)) errors.maxQuestions = 'maximumWhole'
  else if (!limits) errors.maxQuestions = 'coverageUnavailable'
  else if (Number(bounds.maxQuestions) < limits.minimumQuestions) errors.maxQuestions = 'minimumCoverage'
  else if (Number(bounds.maxQuestions) > limits.modelMaxQuestions) errors.maxQuestions = 'modelMaximum'
  else if (Number(bounds.maxQuestions) > limits.eligibleCapacity) errors.maxQuestions = 'maximumCapacity'
  if (!positive(bounds.totalMinutes) || !whole(bounds.totalSeconds)) errors.totalMinutes = 'durationRequired'
  else if (whole(bounds.maxQuestions) && (Number(bounds.totalSeconds) < 30 * Number(bounds.maxQuestions) || Number(bounds.totalSeconds) > 120 * Number(bounds.maxQuestions))) errors.totalMinutes = 'durationRange'
  if (!positive(bounds.secondsPerQuestion)) errors.secondsPerQuestion = 'rateRequired'
  else if (Number(bounds.secondsPerQuestion) < 30 || Number(bounds.secondsPerQuestion) > 120) errors.secondsPerQuestion = 'rateRange'
  return errors
}
export function adaptiveConfiguration(value: AdaptiveDraft, capacity: AdaptiveCapacity): AdaptiveCommonConfiguration | null {
  if (Object.keys(adaptiveErrors(value, capacity)).length) return null
  return { name: value.name.trim(), occupationBounds: { maxQuestions: Number(value.occupation.maxQuestions), timeLimitSeconds: Number(value.occupation.totalSeconds) } }
}
export const sameAdaptiveConfiguration = (left: AdaptiveCommonConfiguration, right: AdaptiveCommonConfiguration) =>
  left.name === right.name && left.occupationBounds.maxQuestions === right.occupationBounds.maxQuestions && left.occupationBounds.timeLimitSeconds === right.occupationBounds.timeLimitSeconds
