import type { DevelopmentEmployee } from './developmentApi'

export type DevelopmentStatus = 'no_target' | 'awaiting_pathway' | 'on_track' | 'at_risk' | 'completed'
export const DEVELOPMENT_STATUSES: DevelopmentStatus[] = ['on_track', 'at_risk', 'awaiting_pathway', 'no_target', 'completed']
export const statusLabels: Record<DevelopmentStatus, [string, string]> = {
  no_target: ['No target role', 'Chưa chọn mục tiêu'],
  awaiting_pathway: ['Pathway pending', 'Chờ lộ trình'],
  on_track: ['On track', 'Đúng tiến độ'],
  at_risk: ['Needs attention', 'Cần chú ý'],
  completed: ['Completed', 'Hoàn thành'],
}
/** Token-based colors (HSL variable names) for charts and badges. */
export const statusTone: Record<DevelopmentStatus, string> = {
  no_target: '--muted-foreground', awaiting_pathway: '--warning', on_track: '--primary', at_risk: '--destructive', completed: '--success',
}
export const NONE = '__none__'

const BLOCKED_GENERATION = ['BLOCKED', 'UNRESOLVED', 'FAILED_RETRYABLE', 'STALE']
/** Learning progress counts fulfilled required steps; bypassed steps are waived, never counted as met. */
export function pathwayProgress(employee: DevelopmentEmployee): number | null {
  const p = employee.pathway
  if (!p) return null
  const denominator = p.requiredSteps - p.bypassedSteps
  if (denominator <= 0) return p.generationStatus === 'NO_LEARNING_REQUIRED' || (p.requiredSteps > 0 && p.bypassedSteps === p.requiredSteps) ? 100 : null
  return Math.round(100 * p.fulfilledSteps / denominator)
}
export function assessmentPassRate(employee: Pick<DevelopmentEmployee, 'assessments'>): number | null {
  const { passedGroups, totalGroups } = employee.assessments
  return totalGroups > 0 ? Math.round(100 * passedGroups / totalGroups) : null
}
export function developmentStatus(employee: DevelopmentEmployee): DevelopmentStatus {
  const p = employee.pathway
  if (!employee.target && !p) return 'no_target'
  if (!p) return 'awaiting_pathway'
  if (p.timingState === 'COMPLETED' || p.generationStatus === 'NO_LEARNING_REQUIRED') return 'completed'
  if (p.timingState === 'OVERDUE' || p.expertSteps > 0 || employee.evidence.needReview > 0 || p.reviewStatus === 'REJECTED' || BLOCKED_GENERATION.includes(p.generationStatus)) return 'at_risk'
  if (p.reviewStatus !== 'APPROVED') return 'awaiting_pathway'
  const progress = pathwayProgress(employee)
  return progress === 100 ? 'completed' : 'on_track'
}

export interface DevelopmentFilters { search: string; department: string; jobPosition: string; status: string }
export const emptyFilters: DevelopmentFilters = { search: '', department: '', jobPosition: '', status: '' }
export function filterEmployees(employees: DevelopmentEmployee[], filters: DevelopmentFilters) {
  const query = filters.search.trim().toLocaleLowerCase()
  return employees.filter(employee => {
    if (filters.department && (employee.departmentId ?? NONE) !== filters.department) return false
    if (filters.jobPosition && (employee.jobPositionId ?? NONE) !== filters.jobPosition) return false
    if (filters.status && developmentStatus(employee) !== filters.status) return false
    if (!query) return true
    return [employee.fullName, employee.email, employee.target?.roleName, employee.departmentName, employee.jobPositionName]
      .some(value => value?.toLocaleLowerCase().includes(query))
  })
}

export interface Option { value: string; label: string; count: number }
/** Options come from the report itself so every choice matches at least one employee; equal names get their department as context. */
export function filterOptions(employees: DevelopmentEmployee[], kind: 'department' | 'jobPosition', unassigned: string): Option[] {
  const options = new Map<string, Option & { context: string | null }>()
  for (const employee of employees) {
    const value = (kind === 'department' ? employee.departmentId : employee.jobPositionId) ?? NONE
    const label = (kind === 'department' ? employee.departmentName : employee.jobPositionName) ?? unassigned
    const current = options.get(value)
    options.set(value, { value, label: current?.label ?? label, count: (current?.count ?? 0) + 1, context: current?.context ?? employee.departmentName })
  }
  const names = new Map<string, number>()
  options.forEach(option => names.set(option.label, (names.get(option.label) ?? 0) + 1))
  return [...options.values()].map(({ context, ...option }) => ({ ...option, label: kind === 'jobPosition' && (names.get(option.label) ?? 0) > 1 && context ? `${option.label} · ${context}` : option.label }))
    .sort((a, b) => a.value === NONE ? 1 : b.value === NONE ? -1 : a.label.localeCompare(b.label))
}

const average = (values: (number | null)[]) => {
  const known = values.filter((value): value is number => value !== null)
  return known.length ? Math.round(known.reduce((sum, value) => sum + value, 0) / known.length) : null
}
export interface GroupSummary { key: string; label: string; headcount: number; withTarget: number; averageProgress: number | null; passRate: number | null; achievedLevels: number; statuses: Record<DevelopmentStatus, number> }
export function summarize(employees: DevelopmentEmployee[]) {
  const statuses = Object.fromEntries(DEVELOPMENT_STATUSES.map(status => [status, 0])) as Record<DevelopmentStatus, number>
  employees.forEach(employee => { statuses[developmentStatus(employee)] += 1 })
  const passedGroups = employees.reduce((sum, employee) => sum + employee.assessments.passedGroups, 0)
  const totalGroups = employees.reduce((sum, employee) => sum + employee.assessments.totalGroups, 0)
  return {
    headcount: employees.length,
    withTarget: employees.filter(employee => employee.target || employee.pathway).length,
    withPathway: employees.filter(employee => employee.pathway).length,
    averageProgress: average(employees.map(pathwayProgress)),
    passRate: totalGroups ? Math.round(100 * passedGroups / totalGroups) : null,
    passedGroups, failedGroups: totalGroups - passedGroups,
    attempts: employees.reduce((sum, employee) => sum + employee.assessments.finalized, 0),
    achievedLevels: employees.reduce((sum, employee) => sum + employee.evidence.achievedLevels, 0),
    completedModules: employees.reduce((sum, employee) => sum + employee.evidence.completedModules, 0),
    needReview: employees.reduce((sum, employee) => sum + employee.evidence.needReview, 0),
    statuses,
  }
}
export function groupBy(employees: DevelopmentEmployee[], kind: 'department' | 'jobPosition', unassigned: string): GroupSummary[] {
  return filterOptions(employees, kind, unassigned).map(option => {
    const members = employees.filter(employee => ((kind === 'department' ? employee.departmentId : employee.jobPositionId) ?? NONE) === option.value)
    const summary = summarize(members)
    return { key: option.value, label: option.label, headcount: members.length, withTarget: summary.withTarget, averageProgress: summary.averageProgress,
      passRate: summary.passRate, achievedLevels: summary.achievedLevels, statuses: summary.statuses }
  })
}
export function timingBreakdown(employees: DevelopmentEmployee[]) {
  const states = ['IN_PROGRESS', 'OVERDUE', 'COMPLETED', 'NOT_STARTED', 'LEGACY_UNTIMED'] as const
  return states.map(state => ({ state, count: employees.filter(employee => employee.pathway?.timingState === state).length }))
}
export function targetRoleBreakdown(employees: DevelopmentEmployee[]) {
  const roles = new Map<string, number>()
  employees.forEach(employee => { const name = employee.target?.roleName ?? employee.pathway?.roleName; if (name) roles.set(name, (roles.get(name) ?? 0) + 1) })
  return [...roles.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toLocaleUpperCase()).join('') || '?'
