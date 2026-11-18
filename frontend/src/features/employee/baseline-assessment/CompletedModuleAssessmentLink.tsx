import { useQuery } from '@tanstack/react-query'
import { useContext } from 'react'
import { readRulePathway,type RuleModuleOption,type RulePathway,type RuleStep } from '../../../shared/api/requirementPathway'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { useTranslation } from "../../../shared/i18n/LanguageContext"
import { matchingModule } from './CompletedModuleAssessmentLink.helpers'
import { IndependentSkillAssessmentEntry } from './IndependentSkillAssessmentEntry'
import { AssessmentStatus,SkillAssessmentEntry } from './SkillAssessmentEntry'
import { usePathwayAssessmentStates } from './usePathwayAssessmentStates'
import { PageLoader } from '../../../shared/components/ui/PageLoader'

/** Shared reader/catalog resolver: preserve the real assigned-pathway or independent assessment context. */
export function CompletedModuleAssessmentLink({ moduleId, revision, compact = false }: { moduleId: string; revision: number; compact?: boolean }) {
  const { t, language } = useTranslation(), identity = useContext(WorkspaceSessionContext)?.identity
  const scope = `${identity?.organizationId}:${identity?.accountId}:${identity?.roles?.join(',')}`
  const query = useQuery({ queryKey: ['initialPathway', scope, 'moduleAssessmentEntry', moduleId, revision], queryFn: ({ signal }) => readRulePathway(null, signal), enabled: Boolean(identity?.organizationId && identity?.accountId), retry: false, gcTime: 0,
    refetchInterval: current => !current.state.error && current.state.data && !current.state.data.archived ? 5000 : false })
  if (query.isPending) return <PageLoader size="sm" label={t('initialPathway.loading')} />
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
