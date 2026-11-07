import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal } from 'lucide-react'
import type { ModulePackage } from '../../../shared/api/moduleAuthoringApi'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { SkillAssessmentPolicyDialog } from '../../manager/baseline-assessments/ScopedAssessmentConfiguration'
import { getPolicyDirectory } from '../../manager/baseline-assessments/scopedAssessmentPolicyApi'

export function ModuleAssessmentConfiguration({ scope, payload }: { scope: string; payload: ModulePackage }) {
  const { t } = useTranslation(), [configuring, setConfiguring] = useState(false)
  const skillId = payload.teachings.length === 1 ? payload.teachings[0].skillId : null
  const level = payload.knowledgeLevel
  const supported = Boolean(skillId && level && ['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'].includes(level))
  const query = useQuery({
    queryKey: ['moduleSkillPolicy', scope, skillId, level],
    enabled: supported,
    queryFn: ({ signal }) => getPolicyDirectory('SKILL_ASSESSMENT', new URLSearchParams({ owner: skillId!, level: level!, page: '0', size: '20' }), signal),
    retry: false,
  })
  const row = query.data?.rows.find(item => item.scope.ownerId === skillId && item.scope.levelId === level)
  return <section aria-label={t('moduleReview.assessmentStatus')} className="space-y-3 rounded-lg border border-primary/25 bg-secondary/30 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Text tone="foreground" variant="body" className="flex items-center gap-2 font-semibold"><SlidersHorizontal size={16} className="shrink-0 text-primary" aria-hidden="true" />{t('moduleReview.assessmentStatus')}</Text>
      {supported && !query.isError && row && <div className="flex flex-wrap items-center gap-2">
        <Badge className="px-3 py-1 font-semibold" variant={row.activeVersion !== null ? 'success' : row.hasDraft ? 'secondary' : 'outline'}>{t(`scopedPolicy.${row.activeVersion !== null ? 'ACTIVE' : row.hasDraft ? 'DRAFT' : 'UNCONFIGURED'}`)}{row.activeVersion !== null ? ` · v${row.activeVersion}` : ''}</Badge>
        {row.activeVersion === null && <Button className="min-w-28 border border-primary font-semibold" leftIcon={<SlidersHorizontal size={14} aria-hidden="true" />} onClick={() => setConfiguring(true)}>{t(row.hasDraft ? 'baselineWizard.continue' : 'scopedPolicy.configure')}</Button>}
      </div>}
    </div>
    <Text variant="body-sm">{t('moduleReview.assessmentShared')}</Text>
    {supported && query.isPending && <Text variant="caption" role="status">{t('scopedPolicy.loading')}</Text>}
    {query.isError && <div className="flex flex-wrap items-center gap-2"><Text variant="body-sm" tone="destructive" role="alert">{t('scopedPolicy.errors.GENERIC')}</Text><Button size="sm" variant="outline" onClick={() => void query.refetch()}>{t('scopedPolicy.retry')}</Button></div>}
    {(!supported || query.isSuccess && !row) && <Text variant="body-sm" role="status">{t('scopedPolicy.notReady')}</Text>}
    {configuring && row && <SkillAssessmentPolicyDialog scopeKey={row.scope.key} initialAction={row.hasDraft ? 'edit' : 'configure'} onClose={() => { setConfiguring(false); void query.refetch() }} />}
  </section>
}
