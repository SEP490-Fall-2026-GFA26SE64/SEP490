import { request } from '../../../shared/api/initialPathway'
import { parseRulePathway, parseRuleRequirement, type KnowledgeLevel, type RulePathway, type RuleRequirement } from '../../../shared/api/requirementPathway'

export interface DevelopmentTarget { roleId: string; roleName: string; levelId: string | null; levelName: string | null; selectedAt: string | null }
export interface DevelopmentPathway {
  requestId: string; roleName: string | null; levelName: string | null; generationStatus: string; reviewStatus: string; timingState: string
  startedAt: string | null; deadlineAt: string | null; completedAt: string | null
  requiredSteps: number; fulfilledSteps: number; bypassedSteps: number; inProgressSteps: number; expertSteps: number; supplementSteps: number
}
export interface DevelopmentAssessments { attempts: number; finalized: number; inProgress: number; baselineFinalized: number; passedGroups: number; totalGroups: number; lastAssessmentAt: string | null }
export interface DevelopmentEvidence { achievedLevels: number; needReview: number; completedModules: number; lastAchievedAt: string | null }
export interface DevelopmentEmployee {
  accountId: string; fullName: string; email: string | null; active: boolean
  departmentId: string | null; departmentName: string | null; jobPositionId: string | null; jobPositionName: string | null
  target: DevelopmentTarget | null; pathway: DevelopmentPathway | null; assessments: DevelopmentAssessments; evidence: DevelopmentEvidence; lastActivityAt: string | null
}
export interface DevelopmentReport { generatedAt: string; employees: DevelopmentEmployee[] }
export interface GroupOutcome { groupId: string; skillId: string; skillName: string; knowledgeLevel: KnowledgeLevel; role: 'TARGET' | 'MAIN' | 'PREREQUISITE'; correctCount: number; totalCount: number; passed: boolean; vetoTriggered: boolean }
export interface AttemptOutcome {
  attemptId: string; purpose: 'BASELINE' | 'SKILL_ASSESSMENT'; state: 'IN_PROGRESS' | 'FINALIZED'; selectionId: string; selectionRevision: number
  roleName: string | null; levelName: string | null; stepId: string | null; moduleId: string | null; moduleRevision: number | null
  startedAt: string; deadlineAt: string; finishedAt: string | null; finishReason: string | null; groups: GroupOutcome[]
}
export interface Achievement { skillId: string; skillName: string; knowledgeLevel: KnowledgeLevel; skillVersion: string | null; sourceKind: 'MODULE_ASSESSMENT' | 'CERTIFICATE'; achievedAt: string }
export interface CompetencyOverview { selectionId: string; selectionRevision: number; target: RuleRequirement[]; achievedKeys: string[]; baselinePassedKeys: string[] }
export interface Section<T> { data: T | null; unavailableCode: string | null }
export interface EmployeeDevelopmentDetail {
  generatedAt: string; employee: DevelopmentEmployee; competency: Section<CompetencyOverview>; pathway: Section<RulePathway>
  assessments: AttemptOutcome[]; achievements: Achievement[]
}

const LEVELS = ['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'] as const
function object(v: unknown): Record<string, unknown> { if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error(); return v as Record<string, unknown> }
function text(v: unknown): string { if (typeof v !== 'string' || !v.trim()) throw Error(); return v }
function optionalText(v: unknown): string | null { return v === null || v === undefined || v === '' ? null : text(v) }
function count(v: unknown): number { if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0) throw Error(); return v }
function bool(v: unknown): boolean { if (typeof v !== 'boolean') throw Error(); return v }
function timestamp(v: unknown): string { const value = text(v); if (!Number.isFinite(Date.parse(value))) throw Error(); return value }
function optionalTimestamp(v: unknown): string | null { return v === null || v === undefined ? null : timestamp(v) }
function list<T>(v: unknown, parse: (v: unknown) => T): T[] { if (!Array.isArray(v) || v.length > 100000) throw Error(); return v.map(parse) }
function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T { const value = text(v); if (!allowed.includes(value as T)) throw Error(); return value as T }

function target(v: unknown): DevelopmentTarget | null {
  if (v === null || v === undefined) return null
  const t = object(v)
  return { roleId: text(t.roleId), roleName: text(t.roleName), levelId: optionalText(t.levelId), levelName: optionalText(t.levelName), selectedAt: optionalTimestamp(t.selectedAt) }
}
function pathway(v: unknown): DevelopmentPathway | null {
  if (v === null || v === undefined) return null
  const p = object(v)
  return { requestId: text(p.requestId), roleName: optionalText(p.roleName), levelName: optionalText(p.levelName), generationStatus: text(p.generationStatus), reviewStatus: text(p.reviewStatus),
    timingState: text(p.timingState), startedAt: optionalTimestamp(p.startedAt), deadlineAt: optionalTimestamp(p.deadlineAt), completedAt: optionalTimestamp(p.completedAt),
    requiredSteps: count(p.requiredSteps), fulfilledSteps: count(p.fulfilledSteps), bypassedSteps: count(p.bypassedSteps), inProgressSteps: count(p.inProgressSteps),
    expertSteps: count(p.expertSteps), supplementSteps: count(p.supplementSteps) }
}
function employee(v: unknown): DevelopmentEmployee {
  const e = object(v), a = object(e.assessments), x = object(e.evidence)
  return { accountId: text(e.accountId), fullName: optionalText(e.fullName) ?? optionalText(e.email) ?? text(e.accountId), email: optionalText(e.email), active: bool(e.active),
    departmentId: optionalText(e.departmentId), departmentName: optionalText(e.departmentName), jobPositionId: optionalText(e.jobPositionId), jobPositionName: optionalText(e.jobPositionName),
    target: target(e.target), pathway: pathway(e.pathway),
    assessments: { attempts: count(a.attempts), finalized: count(a.finalized), inProgress: count(a.inProgress), baselineFinalized: count(a.baselineFinalized), passedGroups: count(a.passedGroups), totalGroups: count(a.totalGroups), lastAssessmentAt: optionalTimestamp(a.lastAssessmentAt) },
    evidence: { achievedLevels: count(x.achievedLevels), needReview: count(x.needReview), completedModules: count(x.completedModules), lastAchievedAt: optionalTimestamp(x.lastAchievedAt) },
    lastActivityAt: optionalTimestamp(e.lastActivityAt) }
}
function group(v: unknown): GroupOutcome {
  const g = object(v)
  return { groupId: text(g.groupId), skillId: text(g.skillId), skillName: text(g.skillName), knowledgeLevel: oneOf(g.knowledgeLevel, LEVELS), role: oneOf(g.role, ['TARGET', 'MAIN', 'PREREQUISITE'] as const),
    correctCount: count(g.correctCount), totalCount: count(g.totalCount), passed: bool(g.passed), vetoTriggered: bool(g.vetoTriggered) }
}
function attempt(v: unknown): AttemptOutcome {
  const a = object(v)
  return { attemptId: text(a.attemptId), purpose: oneOf(a.purpose, ['BASELINE', 'SKILL_ASSESSMENT'] as const), state: oneOf(a.state, ['IN_PROGRESS', 'FINALIZED'] as const),
    selectionId: text(a.selectionId), selectionRevision: count(a.selectionRevision), roleName: optionalText(a.roleName), levelName: optionalText(a.levelName),
    stepId: optionalText(a.stepId), moduleId: optionalText(a.moduleId), moduleRevision: a.moduleRevision === null || a.moduleRevision === undefined ? null : count(a.moduleRevision),
    startedAt: timestamp(a.startedAt), deadlineAt: timestamp(a.deadlineAt), finishedAt: optionalTimestamp(a.finishedAt), finishReason: optionalText(a.finishReason), groups: list(a.groups, group) }
}
function achievement(v: unknown): Achievement {
  const a = object(v)
  return { skillId: text(a.skillId), skillName: text(a.skillName), knowledgeLevel: oneOf(a.knowledgeLevel, LEVELS), skillVersion: optionalText(a.skillVersion),
    sourceKind: oneOf(a.sourceKind, ['MODULE_ASSESSMENT', 'CERTIFICATE'] as const), achievedAt: timestamp(a.achievedAt) }
}
function competency(v: unknown): CompetencyOverview {
  const c = object(v)
  return { selectionId: text(c.selectionId), selectionRevision: count(c.selectionRevision), target: list(c.target, parseRuleRequirement),
    achievedKeys: list(c.achievedKeys, text), baselinePassedKeys: list(c.baselinePassedKeys, text) }
}
function section<T>(v: unknown, parse: (v: unknown) => T): Section<T> {
  const s = object(v)
  const unavailableCode = optionalText(s.unavailableCode)
  const data = s.data === null || s.data === undefined ? null : parse(s.data)
  if (!data && !unavailableCode) throw Error()
  return { data, unavailableCode }
}
function rulePathway(v: unknown): RulePathway { const result = parseRulePathway(v); if (!result) throw Error(); return result }

export const parseDevelopmentReport = (v: unknown): DevelopmentReport => { const r = object(v); return { generatedAt: timestamp(r.generatedAt), employees: list(r.employees, employee) } }
export const parseEmployeeDevelopment = (v: unknown): EmployeeDevelopmentDetail => {
  const d = object(v)
  return { generatedAt: timestamp(d.generatedAt), employee: employee(d.employee), competency: section(d.competency, competency), pathway: section(d.pathway, rulePathway),
    assessments: list(d.assessments, attempt), achievements: list(d.achievements, achievement) }
}

export const readDevelopmentReport = (signal?: AbortSignal) => request('ld/development/employees', parseDevelopmentReport, { signal })
export const readEmployeeDevelopment = (accountId: string, signal?: AbortSignal) =>
  request('ld/development/employees/' + encodeURIComponent(accountId), parseEmployeeDevelopment, { signal })
