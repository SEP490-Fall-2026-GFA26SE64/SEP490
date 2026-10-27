import { PathwayError } from './initialPathway'

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
