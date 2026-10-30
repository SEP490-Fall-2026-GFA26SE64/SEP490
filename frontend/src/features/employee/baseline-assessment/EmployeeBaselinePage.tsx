import { Link, useParams } from 'react-router-dom'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader } from '../../../shared/components/ui/Card'
import { Heading } from '../../../shared/components/typography/Heading'
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
    <Heading level={1} className="sr-only">{t('employeeBaseline.title')}</Heading>
    <Card><CardContent className="p-6"><Text role="status">{t('employeeBaseline.unavailable')}</Text></CardContent></Card>
  </div></WorkspaceLayout>
}
export function BaselineHandoff() {
  const { t } = useTranslation()
  return <Card><CardHeader className="p-5 pb-3"><Heading level={2} size="card">{t('employeeBaseline.title')}</Heading></CardHeader><CardContent className="space-y-3 px-5 pb-5">
    <Text variant="body-sm">{t('roleFlow.selectFirst')}</Text>
    <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} to="/employee/upskilling?tab=roles">{t('upskillingUi.roles')}</Link>
  </CardContent></Card>
}
function EmployeeBaselinePage({ attemptId }: { attemptId?: string }) {
  const { t } = useTranslation(), tr = (key: string) => t(`employeeBaseline.${key}`)
  const state = useBaselineAttempt(attemptId)
  return <WorkspaceLayout><div className="min-w-0 space-y-5 pb-8">
    <Heading level={1} className="sr-only">{tr('title')}</Heading>
    <div className="flex flex-wrap justify-end gap-2">
      <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} to="/employee/my-mastery">{t('baselineUi.myMastery')}</Link>
      <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} to="/employee/assessment?tab=baseline">{tr('otherAssessments')}</Link>
    </div>
    {state.busy && state.attempt?.state !== 'IN_PROGRESS' && <LoadingCard label={tr('loading')} />}
    {state.error && <div role="alert" className="space-y-2 rounded-md border border-border p-4">
      <Text variant="body-sm">{t(`employeeBaseline.errors.${state.error.code}`, tr('requestError'))}</Text>
      {state.pending ? <><Text variant="body-sm">{tr('retryNotice')}</Text><Button disabled={state.busy} onClick={() => void state.run(state.pending!)}>{tr('retry')}</Button></>
        : attemptId && <Button variant="outline" disabled={state.busy} onClick={() => void state.refresh()}>{tr('refresh')}</Button>}
    </div>}
    {!attemptId && <Card id="baseline-start"><CardHeader className="p-5 pb-3"><Heading level={2} size="card">{tr('start')}</Heading></CardHeader><CardContent className="space-y-4 px-5 pb-5">
      <Text variant="body-sm">{t('roleFlow.selectFirst')}</Text>
      <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} to="/employee/upskilling?tab=roles">{t('upskillingUi.roles')}</Link>
    </CardContent></Card>}
    {state.attempt?.state === 'IN_PROGRESS' && <BaselineAttemptPanel key={state.attempt.id} attempt={state.attempt} seconds={state.seconds} locked={state.locked} busy={state.busy} run={state.run} />}
    {state.result && <BaselineResultPanel result={state.result} locked={state.locked} run={state.run} />}
    {attemptId && <Button variant="outline" disabled={state.busy || Boolean(state.pending)} onClick={() => void state.refresh()}>{tr('refresh')}</Button>}
    {!attemptId && <BaselineHistory />}
    {attemptId && !state.pending && <Link className="block text-sm text-primary underline" to="/employee/baseline-assessment">{tr('history')}</Link>}
  </div></WorkspaceLayout>
}
