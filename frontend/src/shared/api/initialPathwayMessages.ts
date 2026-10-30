import { PathwayError, type GapRow, type PathwayView, type ReviewSummary } from './initialPathway'

/** Read-only display helpers; baseline attainment is the server's frozen gap result. */
export const pathwaySkill = (pathway: PathwayView, id: string) => pathway.baseline?.skills.find(skill => skill.skillId === id)
export const baselineTargetMet = (skill: GapRow | undefined) => Boolean(skill && skill.evidenceState === 'KNOWN' && skill.mastery !== null && skill.gap === 0)
export function pathwayEntry(pathway: PathwayView, id: string): string | null {
  const item = pathway.modules.find(item => item.module.id === id), entry = item?.entry
  return !pathway.archived && item?.accessState === 'AVAILABLE' && entry?.startsWith('/') && !entry.startsWith('//') && !entry.includes('\\') ? entry : null
}
export function pathwayAccessNote(reason: string | null, t: (key: string) => string): string {
  return t('initialPathway.display.' + (reason?.includes('READINESS') || reason?.includes('PREREQUISITE') ? 'readinessUnavailable' : 'contentUnavailable'))
}

export function reviewLearnerName(summary: Pick<ReviewSummary, 'learnerId' | 'learnerLabel'>, t: (key: string) => string): string {
  if (import.meta.env.VITE_LOCAL_BASELINE_DEMO_ENABLED === 'true' && summary.learnerLabel === 'local-baseline-demo-employee-a') return t('roles.employee')
  return summary.learnerLabel ?? summary.learnerId ?? t('initialPathway.state.UNAVAILABLE')
}

export function pathwayMessage(error: unknown, t: (key: string) => string): string {
  const e = error instanceof PathwayError ? error : null
  if (e?.code === 'ASSESSMENT_IN_PROGRESS') return t('roleFlow.errors.ASSESSMENT_IN_PROGRESS')
  const key = e?.code === 'BASELINE_REQUIRED' ? 'baseline' : e?.status === 401 || e?.status === 403 ? 'denied' : e?.status === 409 ? 'stale' : e?.code.endsWith('NOT_CONFIGURED') ? 'setup' : 'unavailable'
  return t('initialPathway.' + key)
}
export function pathwayDiagnostic(value: string, t: (key: string) => string) {
  const code = value.split(':')[0]
  const key = code.includes('PROVIDER') || code === 'UNMATCHED_MODULE' ? 'coverageIssue' : code.includes('CYCLE') ? 'cycleIssue' : code.includes('INTERNAL') ? 'internalIssue' : code.includes('PREREQUISITE') || code.includes('READINESS') ? 'prerequisiteIssue' : code.includes('LIMIT') ? 'resourceIssue' : 'validationIssue'
  return t('initialPathway.' + key)
}

export function pathwayAttention(reason: string | null, t: (key: string) => string): string {
  const [code, transition] = (reason ?? '').split(':'), [preferred, offered] = (transition ?? '').split('->')
  const note = t('initialPathway.' + (code === 'SUPPORTING_COVERAGE_FALLBACK' ? 'supportingFallbackNote' : 'difficultyFallbackNote'))
  if (preferred !== offered && ['LOW', 'MEDIUM', 'HIGH'].includes(preferred ?? '') && ['LOW', 'MEDIUM', 'HIGH'].includes(offered ?? '')) {
    return `${note} ${t('initialPathway.preferredDifficulty')}: ${t('initialPathway.difficulty.' + preferred)}; ${t('initialPathway.chosenDifficulty')}: ${t('initialPathway.difficulty.' + offered)}.`
  }
  return note
}
