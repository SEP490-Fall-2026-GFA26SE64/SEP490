import { Link } from 'react-router-dom'
import { ArrowRight, History } from 'lucide-react'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Badge } from '../../../shared/components/ui/Badge'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { startCommand, attemptPath } from '../baseline-assessment/baselineApi'
import { useBaselineAttempt } from '../baseline-assessment/useBaselineAttempt'
import type { RoleFlowView } from './currentRoleFlowApi'

export function RoleBaselineGate({ view }: { view: RoleFlowView }) {
  const { t } = useTranslation(), tr = (key: string) => t(`roleFlow.${key}`)
  const state = useBaselineAttempt()
  const progress = view.progress
  if (!view.selection && progress.state !== 'RESUME') return <Text variant="body-sm">{tr('selectFirst')}</Text>
  return <section aria-label={t('upskillingUi.roleSelection')} className="space-y-3 border-t border-border bg-muted/20 px-5 py-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-2">
        <Text variant="body-sm" role="status">{tr(`states.${progress.state}`)}</Text>
        <div className="flex flex-wrap gap-2">
          {progress.requiredCount > 0 && <Badge variant="outline">{tr('coverage')}: {progress.coveredCount}/{progress.requiredCount}</Badge>}
          {progress.baselineVersion !== null && <Text variant="caption">{tr('baselineVersion')}: {progress.baselineVersion}</Text>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {progress.state === 'BASELINE_REQUIRED' && <Button size="sm" disabled={state.locked} onClick={() => void state.run(startCommand())}>{tr('start')}</Button>}
        {progress.state === 'RESUME' && progress.attemptId && <Link className={buttonVariants({ size: 'sm' })} to={attemptPath(progress.attemptId)}>{tr('resume')}</Link>}
        {progress.state === 'COMPLETE' && <Link className={buttonVariants({ size: 'sm', variant: 'secondary' })} to="/employee/gap-analysis">{tr('continue')}<ArrowRight size={14} aria-hidden="true" /></Link>}
        <Link className={buttonVariants({ size: 'sm', variant: 'outline' })} to="/employee/my-mastery">{t('baselineUi.myMastery')}</Link>
        {progress.state === 'COMPLETE' && progress.attemptId && <Link className={buttonVariants({ size: 'sm', variant: 'outline' })} to={attemptPath(progress.attemptId)}>{t('baselineUi.viewResult')}</Link>}
        <Link className={buttonVariants({ size: 'sm', variant: 'ghost' })} to="/employee/baseline-assessment"><History size={14} aria-hidden="true" />{t('baselineUi.history')}</Link>
      </div>
    </div>
    {state.error && <Text variant="body-sm" className="text-destructive" role="alert">{t(`employeeBaseline.errors.${state.error.code}`, tr('requestError'))}</Text>}
    {state.pending && <div className="flex flex-wrap items-center gap-3"><Text variant="body-sm">{tr('retryNotice')}</Text><Button size="sm" variant="outline" disabled={state.busy} onClick={() => void state.run(state.pending!)}>{tr('retry')}</Button></div>}
  </section>
}
