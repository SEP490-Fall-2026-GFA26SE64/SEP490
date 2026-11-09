import { request } from '../../../shared/api/initialPathway'
import { parseRuleRequirement, readRulePathway, type RuleRequirement, type RuleStep } from '../../../shared/api/requirementPathway'
import { readRoleFlow } from '../target-roles/currentRoleFlowApi'
import type { CompetencySkillProfile } from '../data/employeeOverviewData'

export type RequirementStatus = 'achieved' | 'waiting' | 'learning' | 'baseline' | 'required'
export const statusLabels: Record<RequirementStatus, [string, string]> = {
  achieved: ['Officially achieved', 'Đạt chính thức'], waiting: ['Awaiting prerequisites', 'Chờ tiên quyết'],
  learning: ['In progress', 'Đang học'], baseline: ['Baseline passed', 'Baseline đạt'], required: ['Learning required', 'Cần học'],
}
export interface OverviewPair { requirement: RuleRequirement; status: RequirementStatus; step?: RuleStep }
export interface OverviewSkill extends Omit<CompetencySkillProfile, 'bktConfidence'> { pairs: OverviewPair[] }
const key = (r: RuleRequirement) => `${r.skillId}\n${r.knowledgeLevel}`
export async function readRoleOverview(signal?: AbortSignal) {
  const flow = await readRoleFlow(signal)
  const selection = flow.selection
  if (!selection) return { flow, pathway: null, skills: [] as OverviewSkill[], pairs: [] as OverviewPair[] }
  const [summary, pathway] = await Promise.all([
    request('employee/learning-overview', value => {
      if (!value || typeof value !== 'object') throw Error()
      const v = value as Record<string, unknown>
      if (v.selectionId !== selection.selectionId || v.selectionRevision !== selection.revision || !Array.isArray(v.target)
        || !Array.isArray(v.achievedKeys) || !Array.isArray(v.baselinePassedKeys)
        || !v.achievedKeys.every(k => typeof k === 'string') || !v.baselinePassedKeys.every(k => typeof k === 'string')) throw Error()
      return { target: v.target.map(parseRuleRequirement), achieved: new Set(v.achievedKeys as string[]), baseline: new Set(v.baselinePassedKeys as string[]) }
    }, { signal }), readRulePathway(null, signal),
  ])
  if (pathway && (pathway.selectionId !== selection.selectionId || pathway.selectionRevision !== selection.revision)) throw Error('STALE_SELECTION')
  const pairs: OverviewPair[] = summary.target.map(requirement => {
    const step = pathway?.steps.find(s => key(s.requirement) === key(requirement))
    const waiting = step && pathway?.dependencies.some(edge => edge.dependentStepId === step.id
      && pathway.steps.some(p => p.id === edge.prerequisiteStepId && p.state !== 'FULFILLED' && p.state !== 'BYPASSED'))
    const status: RequirementStatus = summary.achieved.has(key(requirement)) ? 'achieved'
      : waiting ? 'waiting' : step?.state === 'IN_PROGRESS' || step?.options.some(o => o.startedAt) ? 'learning'
      : summary.baseline.has(key(requirement)) ? 'baseline' : 'required'
    return { requirement, status, step }
  })
  const ids = [...new Set(pairs.map(p => p.requirement.skillId))]
  const skills: OverviewSkill[] = ids.map(id => {
    const own = pairs.filter(p => p.requirement.skillId === id), achieved = own.filter(p => p.status === 'achieved').length
    return { id, name: own[0].requirement.skillName, skillCode: selection.role.levels.flatMap(l => l.skills).find(s => s.id === id)?.code ?? undefined,
      category: selection.role.name, estimatedMastery: Math.round(100 * achieved / own.length), targetRoleRequirement: 100,
      status: achieved === own.length ? 'mastered' : own.some(p => ['waiting', 'learning'].includes(p.status)) ? 'in_progress' : 'critical_gap',
      pairs: own }
  })
  return { flow, pathway, pairs, skills }
}
