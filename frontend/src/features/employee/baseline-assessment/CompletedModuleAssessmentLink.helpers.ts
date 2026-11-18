import { PathwayError } from '../../../shared/api/initialPathway'
import { readRulePathway,type RulePathway } from '../../../shared/api/requirementPathway'
import { BaselineError,type AssessmentTarget } from './baselineApi'

export async function targetForCompletedModule(moduleId: string, revision: number): Promise<AssessmentTarget> {
  let pathway: RulePathway | null
  try { pathway = await readRulePathway(null) } catch (cause) { if (cause instanceof PathwayError) throw new BaselineError(cause.code, cause.status); throw cause }
  const match = matchingModule(pathway, moduleId, revision)
  if (!match) return { selectionId: null, selectionRevision: 0, moduleId, moduleRevision: revision }
  if (!match.option.completedAt) throw new BaselineError('EXACT_LEARNING_COMPLETION_REQUIRED', 409)
  return { selectionId: pathway!.selectionId, selectionRevision: pathway!.selectionRevision, stepId: match.step.id, moduleId, moduleRevision: revision }
}

export function matchingModule(pathway: RulePathway | null | undefined, moduleId: string, revision: number) {
  if (!pathway || pathway.archived) return null
  const step = pathway.steps.find(step => step.state !== 'BYPASSED' && step.options.some(option => option.moduleId === moduleId && option.moduleRevision === revision))
  const option = step?.options.find(option => option.moduleId === moduleId && option.moduleRevision === revision)
  return step && option ? { step, option } : null
}

