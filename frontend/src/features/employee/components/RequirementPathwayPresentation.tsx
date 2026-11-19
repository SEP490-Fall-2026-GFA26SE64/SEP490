import { orderByDependencies } from './requirementOrder'
import type { RulePathway, RuleStep } from '../../../shared/api/requirementPathway'
import { usePathwayAssessmentStates } from '../baseline-assessment/usePathwayAssessmentStates'
import { EmployeeRequirementGraph } from './EmployeeRequirementGraph'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'

type AssessmentStateReader = ReturnType<typeof usePathwayAssessmentStates>

/** `assessmentStates` supplies already-read outcomes (for example an L&D report) so read-only previews still show assessment results. */
export function RequirementPathwayPresentation({ pathway, preview = false, assessmentStates, onCertificate, onInteractionLockChange }: {
  pathway: RulePathway; preview?: boolean; assessmentStates?: AssessmentStateReader; onCertificate?: (step: RuleStep) => void; onInteractionLockChange?: (locked: boolean) => void
}) {
  const ownStates = usePathwayAssessmentStates(pathway, preview || Boolean(assessmentStates))
  const { language } = useTranslation(), vi = language === 'vi'
  const assessmentState = assessmentStates ?? ownStates
  const required = orderByDependencies(pathway.steps.filter(step => step.kind === 'REQUIRED' && step.state !== 'BYPASSED'), pathway.dependencies)
  const parallel = pathway.steps.filter(step => step.kind === 'PARALLEL_SUPPLEMENT')
  const bypassed = pathway.steps.filter(step => step.state === 'BYPASSED')
  return <div className="space-y-5">
    {required.length + parallel.length > 0 && <EmployeeRequirementGraph pathway={pathway} steps={[...required, ...parallel]} preview={preview} assessmentState={assessmentState} onCertificate={onCertificate} onInteractionLockChange={onInteractionLockChange} />}
    {(pathway.archived || preview) && bypassed.length > 0 && <details className="space-y-3 rounded-lg border border-border p-4"><summary className="cursor-pointer text-body-sm font-semibold">{vi ? 'Lịch sử gap đã bypass' : 'Bypassed gap history'} · {bypassed.length}</summary><ul className="space-y-3">{bypassed.map(step => <li key={step.id}><Text tone="foreground" className="font-semibold">{step.requirement.skillName} · {step.requirement.knowledgeLevel}</Text><Text variant="body-sm">{step.reason}</Text></li>)}</ul></details>}
  </div>
}
