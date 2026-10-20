import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { Input } from '../../../shared/components/ui/Input'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { AdaptiveBaselineForm } from './AdaptiveBaselineForm'
import { AdaptiveBaselineApiError, listAdaptiveOccupations, type AdaptiveShortage } from './adaptiveBaselineApi'
import { hasAdaptiveRoleDrift } from './adaptiveBaselineDraft'
import { useAdaptiveBaselineWorkspace } from './useAdaptiveBaselineWorkspace'

/** Remount on scope changes: no draft, preview or pending command can cross Occupations. */
export function AdaptiveBaselineRoute() {
  const { occupationId, '*': legacyPath } = useParams<{ occupationId: string; '*': string }>()
  if (occupationId && legacyPath) return <Navigate to={`/ld-manager/baseline-assessments/${encodeURIComponent(occupationId)}`} replace />
  return <AdaptiveBaselinePage key={occupationId ?? 'directory'} />
}

export function AdaptiveBaselinePage() {
  const { occupationId } = useParams<{ occupationId: string }>()
  const navigate = useNavigate(), { t } = useTranslation()
  const state = useAdaptiveBaselineWorkspace(occupationId)
  const [occupations, setOccupations] = useState<{ id: string; name: string }[]>([])
  const [catalogBusy, setCatalogBusy] = useState(!occupationId)
  const [catalogError, setCatalogError] = useState<AdaptiveBaselineApiError | null>(null)
  const [reload, setReload] = useState(0)
  const [confirmation, setConfirmation] = useState<'finalize' | 'disable' | 'refresh' | 'leave' | null>(null)
  const [reason, setReason] = useState('')
  useEffect(() => {
    if (occupationId) return
    const controller = new AbortController()
    void listAdaptiveOccupations(controller.signal).then(values => { if (!controller.signal.aborted) setOccupations(values) })
      .catch(cause => { if (!controller.signal.aborted) setCatalogError(cause instanceof AdaptiveBaselineApiError ? cause : new AdaptiveBaselineApiError(0, 'NETWORK_ERROR')) })
      .finally(() => { if (!controller.signal.aborted) setCatalogBusy(false) })
    return () => controller.abort()
  }, [occupationId, reload])
  const tr = (key: string) => t(`adaptiveBaseline.${key}`)
  const error = occupationId ? state.error : catalogError
  const denied = error?.status === 401 || error?.status === 403
  const workspace = denied ? null : state.workspace
  const locked = state.busy || state.pending || state.needsRefresh
  function confirm() {
    const action = confirmation
    setConfirmation(null)
    if (action === 'leave') navigate('/ld-manager/baseline-assessments')
    else if (action === 'refresh') void state.refresh()
    else if (action) state.command(action, reason)
  }
  function shortages(values: AdaptiveShortage[]) {
    return <ul className="list-disc pl-5 space-y-1">{values.map((item, index) => <li key={`${item.roleId}-${item.kind}-${index}`}>
      {item.roleId === null ? tr('exploration') : workspace?.capacity.roles[item.roleId]?.snapshot.name ?? item.roleId}
      {' — '}{tr(item.kind === 'ITEM_CAPACITY' ? 'capacity' : 'missingParameters')}: {tr('required')} {item.required}, {tr('available')} {item.available}
    </li>)}</ul>
  }
  return <WorkspaceLayout><div className="space-y-6 min-w-0">
    <PageHeader title={tr('title')} description={workspace?.capacity.occupationName ?? tr('description')}
      actions={occupationId && <>
        <Button variant="ghost" disabled={state.busy || state.pending} onClick={() => state.dirty ? setConfirmation('leave') : navigate('/ld-manager/baseline-assessments')}>{tr('choose')}</Button>
        <Button variant="outline" disabled={state.busy || state.pending} onClick={() => state.dirty ? setConfirmation('refresh') : void state.refresh()}>{tr('refresh')}</Button>
      </>} />
    <p className="text-caption text-muted-foreground">{tr('localNotice')}</p>
    {(state.busy || catalogBusy && !occupationId) && <p role="status">{tr('loading')}</p>}
    {error && <div role="alert" className="rounded-xl border border-destructive p-4 space-y-2 text-destructive">
      <p>{tr(`errors.${error.code}`) === `adaptiveBaseline.errors.${error.code}` ? tr('errors.REQUEST_FAILED') : tr(`errors.${error.code}`)}</p>
      {shortages(error.shortages)}
      {!occupationId && <Button variant="outline" disabled={catalogBusy} onClick={() => { setCatalogBusy(true); setCatalogError(null); setOccupations([]); setReload(value => value + 1) }}>{tr('retry')}</Button>}
    </div>}
    {state.pending && <div role="status" className="rounded-xl border border-border bg-muted p-4 space-y-3">
      <p>{tr('pending')}</p><Button variant="outline" disabled={state.busy} onClick={() => void state.retry()}>{tr('retry')}</Button>
    </div>}
    {state.needsRefresh && <p role="status" className="text-muted-foreground">{tr('refreshRequired')}</p>}
    {state.notice && <p role="status" className="text-success">{tr(`success.${state.notice}`)}</p>}
    {!occupationId && !catalogBusy && !catalogError && <Card><CardHeader><CardTitle>{tr('choose')}</CardTitle></CardHeader><CardContent className="space-y-2">
      {occupations.length === 0 ? <p>{tr('empty')}</p> : occupations.map(item => <Button className="w-full justify-start" variant="outline" key={item.id}
        onClick={() => navigate(`/ld-manager/baseline-assessments/${encodeURIComponent(item.id)}`)}>{item.name}</Button>)}
    </CardContent></Card>}
    {workspace && state.draft && <>
      <Card><CardHeader><CardTitle>{tr('serverState')}</CardTitle></CardHeader><CardContent className="space-y-2 break-words">
        <p>{tr('current')}: {workspace.current ? `v${workspace.current.id.version} — ${workspace.current.configuration.name}` : tr('none')}</p>
        <p>{tr('working')}: {workspace.working ? workspace.working.revision : tr('none')} · {tr('activation')}: {workspace.activation?.revision ?? 0}</p>
        <p className="text-caption text-muted-foreground">{tr('historyNotice')}</p>
        {workspace.current && <details className="text-caption"><summary className="cursor-pointer">{tr('pins')}</summary>
          <dl className="mt-2 space-y-1 break-all">{Object.entries(workspace.current.pins).map(([key, value]) => <div key={key}><dt>{tr(key)}</dt><dd>{value}</dd></div>)}</dl>
        </details>}
      </CardContent></Card>
      {(hasAdaptiveRoleDrift(workspace) || workspace.current && workspace.current.catalogFingerprint !== workspace.capacity.catalogFingerprint) &&
        <p role="status" className="rounded-xl bg-muted p-4">{tr('drift')}</p>}
      <AdaptiveBaselineForm value={state.draft} capacity={workspace.capacity} onChange={state.edit} disabled={locked} />
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={locked || !state.valid} onClick={() => state.command('save')}>{tr('save')}</Button>
        <Button variant="outline" disabled={locked || !state.valid} onClick={() => void state.test()}>{tr('test')}</Button>
        <Button variant="secondary" disabled={locked || !state.saved} onClick={() => setConfirmation('finalize')}>{tr('finalize')}</Button>
        <Button variant="destructive" disabled={locked || !workspace.current} onClick={() => { setReason(''); setConfirmation('disable') }}>{tr('disable')}</Button>
      </div>
      <p className="text-caption text-muted-foreground">{state.dirty ? tr('unsaved') : tr('saveFirst')}</p>
      {state.preview && <Card><CardHeader><CardTitle>{tr(state.preview.feasible ? 'feasible' : 'infeasible')}</CardTitle></CardHeader><CardContent className="space-y-4">
        <p className="text-caption text-muted-foreground">{tr('previewNotice')}</p>{shortages(state.preview.shortages)}
        {state.preview.sample.map((item, index) => <article key={item.itemVersionId} className="rounded-xl border border-border p-4 space-y-2">
          <p className="whitespace-pre-wrap">{index + 1}. {item.prompt}</p>
          <ul className="space-y-1">{Object.entries(item.options).map(([key, text]) => <li key={key} className="whitespace-pre-wrap">{key}. {text}</li>)}</ul>
          <p className="text-caption text-muted-foreground">{tr('skill')}: {Object.values(workspace.capacity.roles).flatMap(role => Object.entries(role.snapshot.skills)).find(([id]) => id === item.microSkillId)?.[1].name ?? item.microSkillId} · {tr(item.reason)}</p>
        </article>)}
      </CardContent></Card>}
    </>}
    <Dialog open={confirmation !== null} onOpenChange={open => { if (!open) setConfirmation(null) }} ariaLabel={tr('confirm')}>
      <DialogHeader><DialogTitle>{tr('confirm')}</DialogTitle><DialogDescription>{tr(confirmation === 'finalize' ? 'finalizeNotice' : confirmation === 'disable' ? 'disableNotice' : 'discardNotice')}</DialogDescription></DialogHeader>
      {confirmation === 'disable' && <label className="space-y-2 text-body-sm">{tr('reason')}<Input value={reason} maxLength={1000} onChange={event => setReason(event.target.value)} /></label>}
      <DialogFooter><Button variant="outline" onClick={() => setConfirmation(null)}>{tr('cancel')}</Button><Button variant={confirmation === 'disable' ? 'destructive' : 'primary'} disabled={state.busy || state.pending || confirmation === 'disable' && !reason.trim()} onClick={confirm}>{tr('confirm')}</Button></DialogFooter>
    </Dialog>
  </div></WorkspaceLayout>
}
