export const RQ3_REPORT_FIXTURE = '/fixtures/rq3-samples/rq3-pilot100-20261125-r2-runtime-parity.json'

export interface Rq3SimParams {
  eta: number
  guess: number
  slip: number
  lambda: number
  budget: number
  learningCost: number
  assessmentCost: number
  equalKnowledge: boolean
}

export interface Rq3BootstrapInterval {
  mean: number
  ci95Low: number
  ci95High: number
  stdErr: number
}

export interface Rq3StratumSummary {
  stratumKey: string
  profileCount: number
  baselineTargetDistance: number
  s0FinalTargetDistance: number
  a0FinalTargetDistance: number
  s1FinalTargetDistance: number
  deltaTargetDistance: number
  s0FinalGapDistance: number
  a0FinalGapDistance: number
  s1FinalGapDistance: number
  deltaGapDistance: number
  s0ReleaseRate: number
  a0ReleaseRate: number
  s1ReleaseRate: number
}

export interface Rq3SensitivityRow {
  label: string
  eta: number
  lambda: number
  assessmentCost: number
  budget: number
  equalKnowledge: boolean
  s0FinalTargetDistance: number
  a0FinalTargetDistance: number
  s1FinalTargetDistance: number
  deltaTargetDistanceA0vsS0: number
  deltaTargetCi95Low: number
  deltaTargetCi95High: number
  deltaTargetDistanceA0vsS1: number
  s0FinalGapDistance: number
  a0FinalGapDistance: number
  deltaGapDistanceA0vsS0: number
  s0ReleaseRate: number
  a0ReleaseRate: number
  s1ReleaseRate: number
}

export interface Rq3ProfileSummary {
  profileId: string
  roleLevel: 'Junior' | 'Middle' | 'Senior'
  gapBand: 'LOW' | 'MEDIUM' | 'HIGH'
  evidenceHistoryStratum: 'BASELINE_ONLY' | 'MIXED' | 'OFFICIAL_RICH'
  targetRequirementCount: number
  initialOfficialCount: number
  baselineExemptCount: number
  initialGapCount: number
  unachievedPrerequisiteCount: number
  baselineTargetDistance: number
  s0TargetTrajectory: Record<string, number>
  a0TargetTrajectory: Record<string, number>
  s1TargetTrajectory: Record<string, number>
  s0GapTrajectory: Record<string, number>
  a0GapTrajectory: Record<string, number>
  s1GapTrajectory: Record<string, number>
  s0FinalTargetDistance: number
  a0FinalTargetDistance: number
  s1FinalTargetDistance: number
  deltaTargetDistanceA0vsS0: number
  deltaTargetDistanceA0vsS1: number
  s0FinalGapDistance: number
  a0FinalGapDistance: number
  s1FinalGapDistance: number
  deltaGapDistanceA0vsS0: number
  s0ReleaseRate: number
  a0ReleaseRate: number
  s1ReleaseRate: number
  s0MeanBudgetUsed: number
  a0MeanBudgetUsed: number
  s1MeanBudgetUsed: number
  s0MeanLearningActions: number
  a0MeanLearningActions: number
  s1MeanLearningActions: number
  s0MeanAssessments: number
  a0MeanAssessments: number
  s1MeanAssessments: number
  a0MeanSupplements: number
  s0StopReasons: Record<string, number>
  a0StopReasons: Record<string, number>
  s1StopReasons: Record<string, number>
}

/** Secondary outcomes for one policy over all learner × replicate runs; costs are right-censored at the budget. */
export interface Rq3PolicyOutcomes {
  policy: 'S0' | 'A0' | 'S1'
  runs: number
  proportionTargetDistanceZero: number
  proportionInitialGapClosed: number
  releaseRate: number
  gapClosedCount: number
  gapCensoredCount: number
  restrictedMeanCostToGapClosure: number
  meanCostAmongGapAttainers: number | null
  releasedCount: number
  releaseCensoredCount: number
  restrictedMeanCostToRelease: number
  meanBudgetUsed: number
  meanLearningActions: number
  meanAssessmentAttempts: number
  meanRetakes: number
  meanFailedAttempts: number
  meanDistinctRemedialRequirements: number
  meanDistinctAssignedModules: number
  meanReviewEvents: number
  stopReasons: Record<string, number>
}

export interface Rq3PairedCompleteCase {
  comparison: string
  pairs: number
  totalPairs: number
  meanCostFirst: number
  meanCostSecond: number
}

export interface Rq3ExperimentReport {
  experimentId: string
  baseSeed: number
  replicates: number
  profileCount: number
  budget: number
  checkpoints: number[]
  primaryParameters: Rq3SimParams
  engineBoundary: string
  engineSourceSha256: Record<string, string>
  inputSha256: Record<string, string>
  s0MeanTargetTrajectory: Record<string, number>
  a0MeanTargetTrajectory: Record<string, number>
  s1MeanTargetTrajectory: Record<string, number>
  s0MeanGapTrajectory: Record<string, number>
  a0MeanGapTrajectory: Record<string, number>
  s1MeanGapTrajectory: Record<string, number>
  deltaTargetDistanceA0vsS0: Rq3BootstrapInterval
  deltaTargetDistanceA0vsS1: Rq3BootstrapInterval
  deltaGapDistanceA0vsS0: Rq3BootstrapInterval
  a0WinsOverS0: number
  a0TiesWithS0: number
  a0LossesToS0: number
  s0ReleaseRate: number
  a0ReleaseRate: number
  s1ReleaseRate: number
  s0MeanBudgetUsed: number
  a0MeanBudgetUsed: number
  s1MeanBudgetUsed: number
  s0MeanLearningActions: number
  a0MeanLearningActions: number
  s1MeanLearningActions: number
  s0MeanAssessments: number
  a0MeanAssessments: number
  s1MeanAssessments: number
  a0MeanSupplementedPrerequisites: number
  secondaryOutcomes: Rq3PolicyOutcomes[]
  pairedCompleteCaseCost: Rq3PairedCompleteCase[]
  byRoleLevel: Rq3StratumSummary[]
  byGapBand: Rq3StratumSummary[]
  byEvidenceHistory: Rq3StratumSummary[]
  byPrerequisiteExposure: Rq3StratumSummary[]
  sensitivityGrid: Rq3SensitivityRow[]
  profiles: Rq3ProfileSummary[]
}

export interface Rq3ProfileFilterOptions {
  searchQuery: string
  roleLevel: 'ALL' | 'Junior' | 'Middle' | 'Senior'
  gapBand: 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'
  outcomeFilter: 'ALL' | 'A0_WIN' | 'TIE' | 'A0_LOSS'
}

export async function fetchBuiltInRq3Report(): Promise<Rq3ExperimentReport> {
  const response = await fetch(RQ3_REPORT_FIXTURE)
  if (!response.ok) {
    throw new Error(`Failed to fetch RQ3 benchmark report (${response.status})`)
  }
  const parsed = (await response.json()) as Rq3ExperimentReport
  return validateRq3Report(parsed)
}

export function validateRq3Report(report: Rq3ExperimentReport): Rq3ExperimentReport {
  if (!report || typeof report.profileCount !== 'number' || !Array.isArray(report.profiles)) {
    throw new Error('Invalid RQ3 experiment report format')
  }
  if (report.profileCount !== 100 || report.profiles.length !== 100) {
    throw new Error(`Expected 100 profiles in RQ3 cohort, received ${report.profiles.length}`)
  }
  if (!Array.isArray(report.secondaryOutcomes) || report.secondaryOutcomes.length !== 3) {
    throw new Error('RQ3 report is missing per-policy secondary outcomes')
  }
  return report
}

/** Formats a signed difference with an explicit sign, e.g. +0.0427 or −0.0136. */
export function formatSigned(value: number, digits = 4): string {
  const fixed = Math.abs(value).toFixed(digits)
  if (Number(fixed) === 0) return `+${fixed}`
  return value > 0 ? `+${fixed}` : `−${fixed}`
}

export function filterRq3Profiles(
  profiles: Rq3ProfileSummary[],
  filters: Rq3ProfileFilterOptions,
): Rq3ProfileSummary[] {
  const q = filters.searchQuery.trim().toLowerCase()
  return profiles.filter((profile) => {
    if (q && !profile.profileId.toLowerCase().includes(q)) {
      return false
    }
    if (filters.roleLevel !== 'ALL' && profile.roleLevel !== filters.roleLevel) {
      return false
    }
    if (filters.gapBand !== 'ALL' && profile.gapBand !== filters.gapBand) {
      return false
    }
    if (filters.outcomeFilter === 'A0_WIN' && profile.deltaTargetDistanceA0vsS0 <= 1e-9) {
      return false
    }
    if (filters.outcomeFilter === 'TIE' && Math.abs(profile.deltaTargetDistanceA0vsS0) > 1e-9) {
      return false
    }
    if (filters.outcomeFilter === 'A0_LOSS' && profile.deltaTargetDistanceA0vsS0 >= -1e-9) {
      return false
    }
    return true
  })
}

export function buildRq3ProfilesCsv(report: Rq3ExperimentReport): string {
  const headers = [
    'profileId',
    'roleLevel',
    'gapBand',
    'evidenceHistoryStratum',
    'targetRequirementCount',
    'initialOfficialCount',
    'baselineExemptCount',
    'initialGapCount',
    'unachievedPrerequisiteCount',
    'baselineTargetDistance',
    's0TargetD10',
    's0TargetD20',
    's0TargetD30',
    's0FinalTargetDistance',
    'a0TargetD10',
    'a0TargetD20',
    'a0TargetD30',
    'a0FinalTargetDistance',
    's1FinalTargetDistance',
    'deltaTargetDistanceA0vsS0',
    's0FinalGapDistance',
    'a0FinalGapDistance',
    'deltaGapDistanceA0vsS0',
    's0ReleaseRate',
    'a0ReleaseRate',
    'a0MeanSupplements',
  ]
  const rows = report.profiles.map((p) => [
    p.profileId,
    p.roleLevel,
    p.gapBand,
    p.evidenceHistoryStratum,
    p.targetRequirementCount,
    p.initialOfficialCount,
    p.baselineExemptCount,
    p.initialGapCount,
    p.unachievedPrerequisiteCount,
    p.baselineTargetDistance.toFixed(4),
    (p.s0TargetTrajectory['10'] ?? 0).toFixed(4),
    (p.s0TargetTrajectory['20'] ?? 0).toFixed(4),
    (p.s0TargetTrajectory['30'] ?? 0).toFixed(4),
    p.s0FinalTargetDistance.toFixed(4),
    (p.a0TargetTrajectory['10'] ?? 0).toFixed(4),
    (p.a0TargetTrajectory['20'] ?? 0).toFixed(4),
    (p.a0TargetTrajectory['30'] ?? 0).toFixed(4),
    p.a0FinalTargetDistance.toFixed(4),
    p.s1FinalTargetDistance.toFixed(4),
    p.deltaTargetDistanceA0vsS0.toFixed(4),
    p.s0FinalGapDistance.toFixed(4),
    p.a0FinalGapDistance.toFixed(4),
    p.deltaGapDistanceA0vsS0.toFixed(4),
    p.s0ReleaseRate.toFixed(4),
    p.a0ReleaseRate.toFixed(4),
    p.a0MeanSupplements.toFixed(4),
  ])
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}
