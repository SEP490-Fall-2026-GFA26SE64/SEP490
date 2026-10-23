import { Link } from 'react-router-dom'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { startCommand, attemptPath } from '../baseline-assessment/baselineApi'
import { useBaselineAttempt } from '../baseline-assessment/useBaselineAttempt'
import type { RoleFlowView } from './currentRoleFlowApi'

export function RoleBaselineGate({ view }: { view: RoleFlowView }) {
  const { t } = useTranslation(), tr = (key: string) => t(`roleFlow.${key}`)
  const state = useBaselineAttempt()
  const progress = view.progress
  if (!view.selection && progress.state !== 'RESUME') return <Text>{tr('selectFirst')}</Text>
  return <Card><CardHeader><CardTitle>{t('employeeBaseline.title')}</CardTitle>
    {view.selection && <Text variant="body-sm">{t('baselineUi.occupation')}: {view.selection.role.occupationName}</Text>}
  </CardHeader><CardContent className="space-y-3">
    <Text role="status">{tr(`states.${progress.state}`)}</Text>
    {progress.requiredCount > 0 && <Text variant="body-sm">{tr('coverage')}: {progress.coveredCount}/{progress.requiredCount}</Text>}
    {progress.baselineVersion !== null && <Text variant="caption">{tr('baselineVersion')}: {progress.baselineVersion}</Text>}
    {progress.state === 'BASELINE_REQUIRED' && <Button disabled={state.locked} onClick={() => void state.run(startCommand())}>{tr('start')}</Button>}
    {progress.state === 'RESUME' && progress.attemptId && <Link className="text-primary underline" to={attemptPath(progress.attemptId)}>{tr('resume')}</Link>}
    {progress.state === 'COMPLETE' && <Link className="text-primary underline" to="/employee/gap-analysis">{tr('continue')}</Link>}
    <div className="flex flex-wrap gap-4 border-t border-border pt-3">
      <Link className={buttonVariants({ variant: 'primary' })} to="/employee/my-mastery">{t('baselineUi.myMastery')}</Link>
      {progress.state === 'COMPLETE' && progress.attemptId && <Link className={buttonVariants({ variant: 'outline' })} to={attemptPath(progress.attemptId)}>{t('baselineUi.viewResult')}</Link>}
      <Link className={buttonVariants({ variant: 'outline' })} to="/employee/baseline-assessment">{t('baselineUi.history')}</Link>
    </div>
    {state.error && <Text role="alert">{t(`employeeBaseline.errors.${state.error.code}`, tr('requestError'))}</Text>}
    {state.pending && <><Text>{tr('retryNotice')}</Text><Button disabled={state.busy} onClick={() => void state.run(state.pending!)}>{tr('retry')}</Button></>}
  </CardContent></Card>
}
