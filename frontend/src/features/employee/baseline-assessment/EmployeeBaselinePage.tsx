import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Input } from '../../../shared/components/ui/Input'
import { Heading } from '../../../shared/components/typography/Heading'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { employeeBaselineEnabled, startCommand } from './baselineApi'
import { BaselineAttemptPanel } from './BaselineAttemptPanel'
import { BaselineHistory, BaselineResultPanel } from './BaselineResults'
import { useBaselineAttempt } from './useBaselineAttempt'

export function EmployeeBaselineRoute() {
  const { attemptId } = useParams<{ attemptId: string }>()
  return employeeBaselineEnabled ? <EmployeeBaselinePage key={attemptId ?? 'start'} attemptId={attemptId} /> : <Navigate to="/employee/assessment" replace />
}
export function BaselineHandoff() {
  const { t } = useTranslation()
  return <Card><CardHeader><CardTitle>{t('employeeBaseline.title')}</CardTitle></CardHeader><CardContent className="space-y-3">
    <p className="text-sm text-muted-foreground">{t('employeeBaseline.intro')}</p>
    <Link className="text-primary underline" to="/employee/baseline-assessment">{t('employeeBaseline.open')}</Link>
  </CardContent></Card>
}
function EmployeeBaselinePage({ attemptId }: { attemptId?: string }) {
  const { t } = useTranslation(), tr = (key: string) => t(`employeeBaseline.${key}`)
  const state = useBaselineAttempt(attemptId)
  const [occupation, setOccupation] = useState('')
  return <WorkspaceLayout><div className="mx-auto w-full max-w-3xl space-y-5">
    <Heading level={1} size="page">{tr('title')}</Heading>
    <p className="text-sm text-muted-foreground">{tr('intro')}</p>
    <Link className="inline-block text-sm text-primary underline" to="/employee/assessment?tab=baseline">{tr('otherAssessments')}</Link>
    {state.busy && <p role="status">{tr('loading')}</p>}
    {state.error && <div role="alert" className="space-y-2 rounded-md border border-border p-4">
      <p>{t(`employeeBaseline.errors.${state.error.code}`, tr('requestError'))}</p>
      {state.pending ? <><p className="text-sm">{tr('retryNotice')}</p><Button disabled={state.busy} onClick={() => void state.run(state.pending!)}>{tr('retry')}</Button></>
        : attemptId && <Button variant="outline" disabled={state.busy} onClick={() => void state.refresh()}>{tr('refresh')}</Button>}
    </div>}
    {!attemptId && <Card><CardHeader><CardTitle>{tr('start')}</CardTitle></CardHeader><CardContent className="space-y-4">
      <Button disabled={state.locked} onClick={() => void state.run(startCommand())}>{tr('selectedRole')}</Button>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="baseline-occupation">{tr('occupationId')}</label>
        <Input id="baseline-occupation" value={occupation} disabled={state.locked} onChange={event => setOccupation(event.target.value)} />
        <p className="text-sm text-muted-foreground">{tr('occupationNotice')}</p>
        <Button variant="outline" disabled={state.locked || !occupation.trim()} onClick={() => void state.run(startCommand(occupation))}>{tr('explore')}</Button>
      </div>
    </CardContent></Card>}
    {state.attempt?.state === 'IN_PROGRESS' && <BaselineAttemptPanel key={`${state.attempt.id}:${state.attempt.revision}`} attempt={state.attempt} seconds={state.seconds} locked={state.locked} run={state.run} />}
    {state.result && <BaselineResultPanel result={state.result} locked={state.locked} run={state.run} />}
    {attemptId && <Button variant="outline" disabled={state.busy || Boolean(state.pending)} onClick={() => void state.refresh()}>{tr('refresh')}</Button>}
    {!attemptId && <BaselineHistory />}
    {attemptId && !state.pending && <Link className="block text-sm text-primary underline" to="/employee/baseline-assessment">{tr('history')}</Link>}
  </div></WorkspaceLayout>
}
