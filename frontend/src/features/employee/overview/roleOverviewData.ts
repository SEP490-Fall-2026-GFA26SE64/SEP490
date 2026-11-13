import { readModuleHistory } from '../baseline-assessment/baselineApi'
import { moduleAssessmentState, type AssessmentState } from '../baseline-assessment/usePathwayAssessmentStates'
import { request } from '../../../shared/api/initialPathway'
import { parseRuleRequirement, readRulePathway, type RuleRequirement, type RuleStep } from '../../../shared/api/requirementPathway'
import { readRoleFlow } from '../target-roles/currentRoleFlowApi'
import type { CompetencySkillProfile } from '../data/employeeOverviewData'

export type RequirementStatus = 'achieved' | 'waiting' | 'learning' | 'baseline' | 'required' | 'bypassed' | 'expert' | 'failed' | 'assessing' | 'unavailable' | 'review' | 'assessment_passed'
export const statusLabels: Record<RequirementStatus, [string, string]> = {
  assessment_passed: ['Assessment passed; pending completion', '\u0110\u00e1nh gi\u00e1 \u0111\u1ea1t, ch\u1edd ho\u00e0n t\u1ea5t'],
  review: ['Awaiting pathway review', 'Ch\u1edd duy\u1ec7t l\u1ed9 tr\u00ecnh'],
  failed: ['Assessment not passed', '\u0110\u00e1nh gi\u00e1 ch\u01b0a \u0111\u1ea1t'], assessing: ['Assessment in progress', '\u0110ang \u0111\u00e1nh gi\u00e1'], unavailable: ['Assessment status unavailable', 'Ch\u01b0a r\u00f5 \u0111\u00e1nh gi\u00e1'],
  bypassed: ['Bypassed in pathway', '\u0110\u01b0\u1ee3c mi\u1ec5n trong l\u1ed9 tr\u00ecnh'], expert: ['Needs expert action', 'C\u1ea7n chuy\u00ean gia'],
  achieved: ['Officially achieved', 'Đạt chính thức'], waiting: ['Awaiting prerequisites', 'Chờ tiên quyết'],
  learning: ['In progress', 'Đang học'], baseline: ['Met through Baseline', 'Đạt qua Baseline'], required: ['Learning required', 'Cần học'],
}
export interface OverviewPair { requirement: RuleRequirement; status: RequirementStatus; step?: RuleStep; origin: 'target' | 'prerequisite'; baselinePassed: boolean; needsReview: boolean }
export interface OverviewSkill extends Omit<CompetencySkillProfile, 'bktConfidence'> { pairs: OverviewPair[] }
export const requirementMet = (status: RequirementStatus) => status === 'achieved' || status === 'baseline'
const key = (r: RuleRequirement) => JSON.stringify([r.skillId, r.skillVersion, r.knowledgeLevel])
export async function readRoleOverview(signal?: AbortSignal) {
  const flow = await readRoleFlow(signal)
  const selection = flow.selection
  if (!selection) return { flow, pathway: null, skills: [] as OverviewSkill[], pairs: [] as OverviewPair[], allPairs: [] as OverviewPair[], allSkills: [] as OverviewSkill[] }
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
  if (pathway && (pathway.selectionId !== selection.selectionId || pathway.selectionRevision !== selection.revision || pathway.archived || pathway.roleId !== selection.role.id || pathway.levelId !== selection.levelId)) throw Error('STALE_SELECTION')
  const moduleReads = new Map((pathway?.steps ?? []).flatMap(step => step.options.filter(option=>option.completedAt && step.state!=='BYPASSED').map(option=>[JSON.stringify([option.moduleId,option.moduleRevision]), option] as const)))
  const histories = new Map(await Promise.all([...moduleReads].map(async ([id, option]) => {
    try { return [id, await readModuleHistory(option.moduleId,option.moduleRevision,signal)] as const }
    catch (error) { if (signal?.aborted || (error && typeof error==='object' && 'status' in error && [401,403].includes(Number(error.status)))) throw error; return [id, null] as const }
  })))
  // Exact requirement identity; target scope never grows, extended scope follows the saved plan.
  const target = new Map(summary.target.map(requirement=>[key(requirement),requirement]))
  const extended = new Map(target)
  for (const step of pathway?.steps ?? []) if (!extended.has(key(step.requirement))) extended.set(key(step.requirement),step.requirement)
  const allPairs: OverviewPair[] = [...extended.values()].map(requirement => {
    const ownSteps = pathway?.steps.filter(step=>key(step.requirement)===key(requirement)) ?? []
    const step = ownSteps.find(step=>step.kind==='REQUIRED') ?? ownSteps[0]
    const baselinePassed = target.has(key(requirement)) && summary.baseline.has(requirement.skillId+'\n'+requirement.knowledgeLevel)
    const waiting = Boolean(step && pathway?.dependencies.some(edge=>edge.dependentStepId===step.id && pathway.steps.some(p=>p.id===edge.prerequisiteStepId && p.state!=='FULFILLED' && p.state!=='BYPASSED')))
    const assessmentStates: AssessmentState[] = step && pathway ? step.options.filter(option=>option.completedAt).map(option=>{const history=histories.get(JSON.stringify([option.moduleId,option.moduleRevision]));return history ? moduleAssessmentState(history,pathway,step) : 'unavailable'}) : []
    const assessment = (['passed','prerequisites','inProgress','failed','unavailable','notStarted'] as const).find(state=>assessmentStates.includes(state))
    const needsReview = Boolean(step && step.state!=='FULFILLED' && step.state!=='BYPASSED' && (baselinePassed || target.has(key(requirement)) && summary.achieved.has(requirement.skillId+'\n'+requirement.knowledgeLevel)))
    // A current learning gap takes precedence over a historical Baseline pass.
    const status: RequirementStatus = step?.state==='FULFILLED' ? 'achieved'
      : (!step || step.state==='BYPASSED') && baselinePassed ? 'baseline'
      : step?.state==='BYPASSED' ? 'bypassed' : step?.state==='NEEDS_EXPERT_ACTION' ? 'expert'
      : !step && target.has(key(requirement)) && summary.achieved.has(requirement.skillId+'\n'+requirement.knowledgeLevel) ? 'achieved'
      : step?.learningLocked && !waiting ? 'review' : waiting || assessment==='prerequisites' ? 'waiting'
      : assessment==='inProgress' ? 'assessing' : assessment==='failed' ? 'failed' : assessment==='unavailable' ? 'unavailable'
      : assessment==='passed' ? 'assessment_passed' : step?.state==='IN_PROGRESS' || step?.options.some(option=>option.startedAt) ? 'learning'
      : !requirement.skillVersion ? 'unavailable' : 'required'
    return {requirement,status,step,baselinePassed,needsReview,origin:target.has(key(requirement))?'target':'prerequisite'}
  })
  const pairs = allPairs.filter(pair=>pair.origin==='target')
  const group = (items: OverviewPair[]): OverviewSkill[] => [...new Set(items.map(pair=>pair.requirement.skillId))].map(id=>{
    const own=items.filter(pair=>pair.requirement.skillId===id),achieved=own.filter(pair=>requirementMet(pair.status)).length
    return {id,name:own[0].requirement.skillName,skillCode:selection.role.levels.flatMap(level=>level.skills).find(skill=>skill.id===id)?.code??undefined,category:selection.role.name,
      estimatedMastery:Math.round(100*achieved/own.length),targetRoleRequirement:100,status:achieved===own.length?'mastered':own.some(pair=>['waiting','learning','assessing'].includes(pair.status))?'in_progress':'critical_gap',pairs:own}
  })
  return {flow,pathway,pairs,skills:group(pairs),allPairs,allSkills:group(allPairs)}
}
