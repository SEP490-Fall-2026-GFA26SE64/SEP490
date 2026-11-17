import { BaselineError, type AssessmentTarget } from './baselineApi'
import { PathwayError } from '../../../shared/api/initialPathway'
import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { readRulePathway, type RulePathway, type RuleStep, type RuleModuleOption } from '../../../shared/api/requirementPathway'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { IndependentSkillAssessmentEntry } from './IndependentSkillAssessmentEntry'
import { AssessmentStatus, SkillAssessmentEntry } from './SkillAssessmentEntry'
import { usePathwayAssessmentStates } from './usePathwayAssessmentStates'

/** Reuse the same exact module/pathway matching for the admission snapshot of a NEW paper. */
export async function targetForCompletedModule(moduleId: string, revision: number): Promise<AssessmentTarget> {
  let pathway: RulePathway | null
  try { pathway = await readRulePathway(null) } catch (cause) { if (cause instanceof PathwayError) throw new BaselineError(cause.code, cause.status); throw cause }
  const match = matchingModule(pathway, moduleId, revision)
  if (!match) return { selectionId: null, selectionRevision: 0, moduleId, moduleRevision: revision }
  if (!match.option.completedAt) throw new BaselineError('EXACT_LEARNING_COMPLETION_REQUIRED', 409)
  return { selectionId: pathway!.selectionId, selectionRevision: pathway!.selectionRevision, stepId: match.step.id, moduleId, moduleRevision: revision }
}
function matchingModule(pathway: RulePathway | null | undefined, moduleId: string, revision: number) {
  if (!pathway || pathway.archived) return null
  const step = pathway.steps.find(step => step.state !== 'BYPASSED' && step.options.some(option => option.moduleId === moduleId && option.moduleRevision === revision))
  const option = step?.options.find(option => option.moduleId === moduleId && option.moduleRevision === revision)
  return step && option ? { step, option } : null
}

/** Shared reader/catalog resolver: preserve the real assigned-pathway or independent assessment context. */
export function CompletedModuleAssessmentLink({ moduleId, revision, compact = false }: { moduleId: string; revision: number; compact?: boolean }) {
  const { t, language } = useTranslation(), identity = useContext(WorkspaceSessionContext)?.identity
  const scope = `${identity?.organizationId}:${identity?.accountId}:${identity?.roles?.join(',')}`
  const query = useQuery({ queryKey: ['initialPathway', scope, 'moduleAssessmentEntry', moduleId, revision], queryFn: ({ signal }) => readRulePathway(null, signal), enabled: Boolean(identity?.organizationId && identity?.accountId), retry: false, gcTime: 0,
    refetchInterval: current => !current.state.error && current.state.data && !current.state.data.archived ? 5000 : false })
  if (query.isPending) return <p className="text-body-sm text-muted-foreground" role="status">{t('initialPathway.loading')}</p>
  if (query.error) return <IndependentSkillAssessmentEntry moduleId={moduleId} revision={revision} compact={compact} />
  const pathway = query.data
  if (!pathway || pathway.archived) return <IndependentSkillAssessmentEntry moduleId={moduleId} revision={revision} compact={compact} />
  const match = matchingModule(pathway, moduleId, revision)
  if (!match) return <IndependentSkillAssessmentEntry moduleId={moduleId} revision={revision} compact={compact} />
  const { step, option } = match
  if (!option.completedAt) return <div className="space-y-2"><p className="text-caption text-muted-foreground">{language === 'vi' ? 'Tiến độ học của lộ trình chưa xác nhận hoàn thành module. Hãy tải lại trước khi thi.' : 'Learning progress has not yet confirmed completion for this pathway. Refresh before starting an assessment.'}</p><Button size="sm" variant="outline" onClick={() => void query.refetch()}>{t('initialPathway.refresh')}</Button></div>
  return <ReaderModuleAssessment pathway={pathway} step={step} option={option} compact={compact} />
}

function ReaderModuleAssessment({ pathway, step, option, compact }: { pathway: RulePathway; step: RuleStep; option: RuleModuleOption; compact: boolean }) {
  const { t } = useTranslation()
  const assessmentState = usePathwayAssessmentStates({ ...pathway, steps: [{ ...step, options: [option] }] }, false)
  return <div className="space-y-2">{!compact && <Badge variant={step.state === 'FULFILLED' ? 'success' : 'warning'}>{t('rulePathway.official')}: {t('rulePathway.state.' + step.state)}</Badge>}<AssessmentStatus state={assessmentState(step, option)} /><SkillAssessmentEntry pathway={pathway} step={step} option={option} compact={compact} /></div>
}
