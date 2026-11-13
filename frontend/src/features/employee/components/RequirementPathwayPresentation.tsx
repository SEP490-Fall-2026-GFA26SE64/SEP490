import { orderByDependencies } from './requirementOrder'
import type { RulePathway, RuleStep } from '../../../shared/api/requirementPathway'
import { usePathwayAssessmentStates } from '../baseline-assessment/usePathwayAssessmentStates'
import { EmployeeRequirementGraph } from './EmployeeRequirementGraph'

export function RequirementPathwayPresentation({ pathway, preview = false, onCertificate, onInteractionLockChange }: {
  pathway: RulePathway; preview?: boolean; onCertificate?: (step: RuleStep) => void; onInteractionLockChange?: (locked: boolean) => void
}) {
  const assessmentState = usePathwayAssessmentStates(pathway, preview)
  const required = orderByDependencies(pathway.steps.filter(step => step.kind === 'REQUIRED'), pathway.dependencies)
  const parallel = pathway.steps.filter(step => step.kind === 'PARALLEL_SUPPLEMENT')
  return pathway.steps.length > 0 ? <EmployeeRequirementGraph pathway={pathway} steps={[...required, ...parallel]} preview={preview} assessmentState={assessmentState} onCertificate={onCertificate} onInteractionLockChange={onInteractionLockChange} /> : null
}
