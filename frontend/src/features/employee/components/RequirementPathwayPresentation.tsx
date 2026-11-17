import { orderByDependencies } from './requirementOrder'
import type { RulePathway, RuleStep } from '../../../shared/api/requirementPathway'
import { usePathwayAssessmentStates } from '../baseline-assessment/usePathwayAssessmentStates'
import { EmployeeRequirementGraph } from './EmployeeRequirementGraph'

type AssessmentStateReader = ReturnType<typeof usePathwayAssessmentStates>

/** `assessmentStates` supplies already-read outcomes (for example an L&D report) so read-only previews still show assessment results. */
export function RequirementPathwayPresentation({ pathway, preview = false, assessmentStates, onCertificate, onInteractionLockChange }: {
  pathway: RulePathway; preview?: boolean; assessmentStates?: AssessmentStateReader; onCertificate?: (step: RuleStep) => void; onInteractionLockChange?: (locked: boolean) => void
}) {
  const ownStates = usePathwayAssessmentStates(pathway, preview || Boolean(assessmentStates))
  const assessmentState = assessmentStates ?? ownStates
  const required = orderByDependencies(pathway.steps.filter(step => step.kind === 'REQUIRED'), pathway.dependencies)
  const parallel = pathway.steps.filter(step => step.kind === 'PARALLEL_SUPPLEMENT')
  return pathway.steps.length > 0 ? <EmployeeRequirementGraph pathway={pathway} steps={[...required, ...parallel]} preview={preview} assessmentState={assessmentState} onCertificate={onCertificate} onInteractionLockChange={onInteractionLockChange} /> : null
}
