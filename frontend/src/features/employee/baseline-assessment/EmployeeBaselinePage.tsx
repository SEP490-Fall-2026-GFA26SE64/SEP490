import { Link, useParams } from 'react-router-dom'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { employeeBaselineEnabled } from './baselineApi'
import { BaselineAttemptPanel } from './BaselineAttemptPanel'
import { BaselineHistory, BaselineResultPanel } from './BaselineResults'
import { useBaselineAttempt } from './useBaselineAttempt'

export function EmployeeBaselineRoute() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const { t } = useTranslation()
  return employeeBaselineEnabled ? <EmployeeBaselinePage key={attemptId ?? 'start'} attemptId={attemptId} /> : <WorkspaceLayout><div className="space-y-4">
    <PageHeader title={t('employeeBaseline.title')} />
    <Card><CardContent className="p-6"><Text role="status">{t('employeeBaseline.unavailable')}</Text></CardContent></Card>
  </div></WorkspaceLayout>
}
export function BaselineHandoff() {
  const { t } = useTranslation()
  return <Card><CardHeader><CardTitle>{t('employeeBaseline.title')}</CardTitle></CardHeader><CardContent className="space-y-3">
    <p className="text-sm text-muted-foreground">{t('roleFlow.selectFirst')}</p>
    <Link className="text-primary underline" to="/employee/target-roles">{t('nav.targetRoles')}</Link>
  </CardContent></Card>
}
function EmployeeBaselinePage({ attemptId }: { attemptId?: string }) {
  const { t } = useTranslation(), tr = (key: string) => t(`employeeBaseline.${key}`)
  const state = useBaselineAttempt(attemptId)
  return <WorkspaceLayout><div className="min-w-0 space-y-4">
    <PageHeader title={tr('title')} description={tr('intro')} />
    <div className="flex flex-wrap gap-4">
      <Link className="text-primary underline" to="/employee/my-mastery">{t('baselineUi.myMastery')}</Link>
      <Link className="text-primary underline" to="/employee/assessment?tab=baseline">{tr('otherAssessments')}</Link>
    </div>
    {state.busy && <LoadingCard label={tr('loading')} />}
    {state.error && <div role="alert" className="space-y-2 rounded-md border border-border p-4">
      <p>{t(`employeeBaseline.errors.${state.error.code}`, tr('requestError'))}</p>
      {state.pending ? <><p className="text-sm">{tr('retryNotice')}</p><Button disabled={state.busy} onClick={() => void state.run(state.pending!)}>{tr('retry')}</Button></>
        : attemptId && <Button variant="outline" disabled={state.busy} onClick={() => void state.refresh()}>{tr('refresh')}</Button>}
    </div>}
    {!attemptId && <Card id="baseline-start"><CardHeader><CardTitle>{tr('start')}</CardTitle></CardHeader><CardContent className="space-y-4">
      <p>{t('roleFlow.selectFirst')}</p>
      <Link className="text-primary underline" to="/employee/target-roles">{t('nav.targetRoles')}</Link>
    </CardContent></Card>}
    {state.attempt?.state === 'IN_PROGRESS' && <BaselineAttemptPanel key={`${state.attempt.id}:${state.attempt.revision}`} attempt={state.attempt} seconds={state.seconds} locked={state.locked} run={state.run} />}
    {state.result && <BaselineResultPanel result={state.result} locked={state.locked} run={state.run} />}
    {attemptId && <Button variant="outline" disabled={state.busy || Boolean(state.pending)} onClick={() => void state.refresh()}>{tr('refresh')}</Button>}
    {!attemptId && <BaselineHistory />}
    {attemptId && !state.pending && <Link className="block text-sm text-primary underline" to="/employee/baseline-assessment">{tr('history')}</Link>}
  </div></WorkspaceLayout>
}
