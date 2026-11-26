import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildRq3ProfilesCsv,
  filterRq3Profiles,
  formatSigned,
  validateRq3Report,
  type Rq3ExperimentReport,
} from './rq3BenchmarkEngine'

const reportPath = resolve(__dirname, '../../../public/fixtures/rq3-samples/rq3-pilot100-20261125-r2-runtime-parity.json')
const loadedReport = JSON.parse(readFileSync(reportPath, 'utf-8')) as Rq3ExperimentReport

describe('rq3BenchmarkEngine', () => {
  it('validates the canonical 100-profile 30-replicate RQ3 report', () => {
    const valid = validateRq3Report(loadedReport)
    expect(valid.profileCount).toBe(100)
    expect(valid.replicates).toBe(30)
    expect(valid.checkpoints).toEqual([0, 10, 20, 30, 40])
    expect(valid.a0WinsOverS0 + valid.a0TiesWithS0 + valid.a0LossesToS0).toBe(100)
    expect(valid.deltaTargetDistanceA0vsS0.ci95Low).toBeLessThanOrEqual(valid.deltaTargetDistanceA0vsS0.ci95High)
    expect(valid.secondaryOutcomes.map((o) => o.policy)).toEqual(['S0', 'A0', 'S1'])
    for (const outcome of valid.secondaryOutcomes) {
      expect(outcome.gapClosedCount + outcome.gapCensoredCount).toBe(outcome.runs)
    }
    expect(valid.sensitivityGrid.map((row) => row.budget)).toEqual(expect.arrayContaining([20, 40, 80]))
    expect(valid.sensitivityGrid.map((row) => row.assessmentCost)).toEqual(expect.arrayContaining([0.5, 1, 2]))
    expect(valid.sensitivityGrid.some((row) => row.equalKnowledge)).toBe(true)
    expect(Object.values(valid.engineSourceSha256).every((hash) => /^[0-9a-f]{64}$/.test(hash))).toBe(true)
  })

  it('rejects a report without per-policy secondary outcomes', () => {
    expect(() => validateRq3Report({ ...loadedReport, secondaryOutcomes: [] })).toThrow(/secondary outcomes/)
  })

  it('formats signed differences explicitly', () => {
    expect(formatSigned(0.04271)).toBe('+0.0427')
    expect(formatSigned(-0.0136)).toBe('−0.0136')
    expect(formatSigned(-0.00001)).toBe('+0.0000')
  })

  it('filters profiles by role level, gap band, search query, and comparison outcome', () => {
    const juniors = filterRq3Profiles(loadedReport.profiles, {
      searchQuery: '',
      roleLevel: 'Junior',
      gapBand: 'ALL',
      outcomeFilter: 'ALL',
    })
    expect(juniors).toHaveLength(34)

    const wins = filterRq3Profiles(loadedReport.profiles, {
      searchQuery: '',
      roleLevel: 'ALL',
      gapBand: 'ALL',
      outcomeFilter: 'A0_WIN',
    })
    expect(wins).toHaveLength(loadedReport.a0WinsOverS0)

    const empty = filterRq3Profiles(loadedReport.profiles, {
      searchQuery: 'NON-EXISTENT-PROFILE-999',
      roleLevel: 'ALL',
      gapBand: 'ALL',
      outcomeFilter: 'ALL',
    })
    expect(empty).toHaveLength(0)
  })

  it('exports all 100 profiles to CSV with header row', () => {
    const csv = buildRq3ProfilesCsv(loadedReport)
    const lines = csv.trim().split('\n')
    expect(lines).toHaveLength(101)
    expect(lines[0]).toContain('profileId,roleLevel,gapBand')
    expect(lines[1]).toContain('SYN-')
  })
})
