import { describe, expect, it } from 'vitest'
import { parseEmployeeDevelopment, type DevelopmentEmployee, type DevelopmentPathway } from './developmentApi'
import { developmentStatus, filterEmployees, filterOptions, groupBy, NONE, pathwayProgress, summarize } from './developmentMetrics'

const pathway = (patch: Partial<DevelopmentPathway> = {}): DevelopmentPathway => ({ requestId: 'r1', roleName: 'Analyst', levelName: 'Senior', generationStatus: 'SUCCEEDED', reviewStatus: 'APPROVED',
  timingState: 'IN_PROGRESS', startedAt: '2026-10-01T00:00:00Z', deadlineAt: '2027-04-01T00:00:00Z', completedAt: null, requiredSteps: 4, fulfilledSteps: 1, bypassedSteps: 0,
  inProgressSteps: 1, expertSteps: 0, supplementSteps: 0, ...patch })
const employee = (patch: Partial<DevelopmentEmployee> = {}): DevelopmentEmployee => ({ accountId: crypto.randomUUID(), fullName: 'Ana Pham', email: 'ana@example.test', active: true,
  departmentId: 'd1', departmentName: 'Engineering', jobPositionId: 'j1', jobPositionName: 'Developer', target: { roleId: 'role', roleName: 'Analyst', levelId: 'l', levelName: 'Senior', selectedAt: null },
  pathway: pathway(), assessments: { attempts: 2, finalized: 2, inProgress: 0, baselineFinalized: 1, passedGroups: 3, totalGroups: 4, lastAssessmentAt: null },
  evidence: { achievedLevels: 1, needReview: 0, completedModules: 1, lastAchievedAt: null }, lastActivityAt: null, ...patch })

describe('FR-04.07 development metrics', () => {
  it('excludes waived steps from progress instead of counting them as met', () => {
    expect(pathwayProgress(employee({ pathway: pathway({ requiredSteps: 4, fulfilledSteps: 1, bypassedSteps: 2 }) }))).toBe(50)
    expect(pathwayProgress(employee({ pathway: null }))).toBeNull()
  })

  it('classifies development status from real pathway, timing and review signals', () => {
    expect(developmentStatus(employee({ target: null, pathway: null }))).toBe('no_target')
    expect(developmentStatus(employee({ pathway: null }))).toBe('awaiting_pathway')
    expect(developmentStatus(employee({ pathway: pathway({ reviewStatus: 'AWAITING_EXPERT_REVIEW' }) }))).toBe('awaiting_pathway')
    expect(developmentStatus(employee())).toBe('on_track')
    expect(developmentStatus(employee({ pathway: pathway({ timingState: 'OVERDUE' }) }))).toBe('at_risk')
    expect(developmentStatus(employee({ evidence: { achievedLevels: 1, needReview: 2, completedModules: 0, lastAchievedAt: null } }))).toBe('at_risk')
    expect(developmentStatus(employee({ pathway: pathway({ timingState: 'COMPLETED' }) }))).toBe('completed')
  })

  it('filters by department, job position, status and search with an explicit unassigned bucket', () => {
    const ana = employee(), ben = employee({ fullName: 'Ben Tran', departmentId: null, departmentName: null, jobPositionId: 'j2', jobPositionName: 'QA', pathway: pathway({ timingState: 'OVERDUE' }) })
    const all = [ana, ben]
    expect(filterEmployees(all, { search: '', department: NONE, jobPosition: '', status: '' })).toEqual([ben])
    expect(filterEmployees(all, { search: '', department: '', jobPosition: 'j1', status: '' })).toEqual([ana])
    expect(filterEmployees(all, { search: '', department: '', jobPosition: '', status: 'at_risk' })).toEqual([ben])
    expect(filterEmployees(all, { search: 'analyst', department: '', jobPosition: '', status: '' })).toHaveLength(2)
    expect(filterOptions(all, 'department', 'Unassigned').map(option => option.label)).toEqual(['Engineering', 'Unassigned'])
  })

  it('aggregates department summaries from employee records only', () => {
    const groups = groupBy([employee(), employee({ pathway: pathway({ fulfilledSteps: 3 }) })], 'department', 'Unassigned')
    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ label: 'Engineering', headcount: 2, averageProgress: 50, passRate: 75 })
    expect(summarize([]).averageProgress).toBeNull()
  })

  it('accepts unavailable report sections but rejects sections with neither data nor reason', () => {
    const base = { generatedAt: '2026-11-16T00:00:00Z', employee: { ...employee(), pathway: null }, assessments: [], achievements: [] }
    const parsed = parseEmployeeDevelopment({ ...base, competency: { data: null, unavailableCode: 'TARGET_NOT_SELECTED' }, pathway: { data: null, unavailableCode: 'PATHWAY_NOT_STARTED' } })
    expect(parsed.competency.unavailableCode).toBe('TARGET_NOT_SELECTED')
    expect(() => parseEmployeeDevelopment({ ...base, competency: { data: null, unavailableCode: null }, pathway: { data: null, unavailableCode: 'X' } })).toThrow()
  })
})
