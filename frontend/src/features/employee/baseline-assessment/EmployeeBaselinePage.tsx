import { Link, useParams } from 'react-router-dom'
import { useContext } from 'react'
import { BookOpenCheck, Target, History } from 'lucide-react'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
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
  const identity = useContext(WorkspaceSessionContext)?.identity
  const scope = (identity?.organizationId ?? '') + ':' + (identity?.accountId ?? '') + ':' + (attemptId ?? 'start')
  return employeeBaselineEnabled ? <EmployeeBaselinePage key={scope} attemptId={attemptId} /> : <WorkspaceLayout><div className="space-y-4">
    <Heading level={1} className="sr-only">{t('employeeBaseline.title')}</Heading>
    <Card><CardContent className="p-6"><Text role="status">{t('employeeBaseline.unavailable')}</Text></CardContent></Card>
  </div></WorkspaceLayout>
}
export function BaselineHandoff() {
  const { t } = useTranslation()
  return <Card><CardHeader className="p-5 pb-3"><Heading level={2} size="card">{t('employeeBaseline.title')}</Heading></CardHeader><CardContent className="space-y-3 px-5 pb-5">
    <Text variant="body-sm">{t('roleFlow.selectFirst')}</Text>
    <Link className={buttonVariants({ variant: 'primary', size: 'sm' })} to="/employee/upskilling?tab=roles">{t('upskillingUi.roles')}</Link>
  </CardContent></Card>
}
function EmployeeBaselinePage({ attemptId }: { attemptId?: string }) {
  const { t } = useTranslation(), tr = (key: string) => t(`employeeBaseline.${key}`)
  const state = useBaselineAttempt(attemptId)
  return <WorkspaceLayout><div className="min-w-0 space-y-5 pb-8">
    <Heading level={1} className="sr-only">{tr('title')}</Heading>
    <div className="flex flex-wrap justify-end gap-2">
      <Link className={buttonVariants({ variant: 'primary', size: 'sm', className: 'gap-2 font-semibold' })} to="/employee/overview#competency-profile"><BookOpenCheck size={15} aria-hidden="true" />{t('baselineUi.myMastery')}</Link>
    </div>
    {state.busy && state.attempt?.state !== 'IN_PROGRESS' && <LoadingCard label={tr('loading')} />}
    {state.error && <div role="alert" className="space-y-2 rounded-md border border-border p-4">
      <Text variant="body-sm">{t(`employeeBaseline.errors.${state.error.code}`, tr('requestError'))}</Text>
      {state.pending ? <><Text variant="body-sm">{tr('retryNotice')}</Text><Button disabled={state.busy} onClick={() => void state.run(state.pending!)}>{tr('retry')}</Button></>
        : attemptId && <Button variant="outline" disabled={state.busy} onClick={() => void state.refresh()}>{tr('refresh')}</Button>}
    </div>}
    {!attemptId && <Card id="baseline-start" className="overflow-hidden border-primary/20"><CardHeader className="border-b border-primary/20 bg-secondary/40 p-5"><Heading level={2} size="card" className="flex items-center gap-2"><Target size={17} className="text-primary" aria-hidden="true" />{tr('start')}</Heading></CardHeader><CardContent className="space-y-4 p-5">
      <Text variant="body-sm">{t('roleFlow.selectFirst')}</Text>
      <Link className={buttonVariants({ variant: 'primary', size: 'sm' })} to="/employee/upskilling?tab=roles">{t('upskillingUi.roles')}</Link>
    </CardContent></Card>}
    {state.attempt?.state === 'IN_PROGRESS' && <BaselineAttemptPanel key={state.attempt.id} attempt={state.attempt} seconds={state.seconds} locked={state.locked} busy={state.busy} run={state.run} />}
    {state.result && <BaselineResultPanel result={state.result} locked={state.locked} run={state.run} error={state.error} />}
    {attemptId && <div className="grid w-full grid-cols-1 gap-3 sm:w-fit sm:grid-cols-2">
      <Button variant="primary" className="w-full font-semibold" disabled={state.busy || Boolean(state.pending)} onClick={() => void state.refresh()}>{tr('refresh')}</Button>
      {!state.pending && <Link className={buttonVariants({ variant: 'outline', className: 'w-full gap-2 border-primary/40 font-semibold text-primary hover:bg-secondary' })} to="/employee/baseline-assessment"><History size={15} aria-hidden="true" />{tr('history')}</Link>}
    </div>}
    {!attemptId && <BaselineHistory />}
  </div></WorkspaceLayout>
}
