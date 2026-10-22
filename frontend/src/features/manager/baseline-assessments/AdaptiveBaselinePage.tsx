import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { Input } from '../../../shared/components/ui/Input'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { AdaptiveBaselineDirectory } from './AdaptiveBaselineDirectory'
import { AdaptiveBaselineForm } from './AdaptiveBaselineForm'
import { AdaptiveErrorNotice, AdaptiveLoading, AdaptiveShortages } from './AdaptiveBaselineFeedback'
import { isCommonConfiguration } from './adaptiveBaselineApi'
import { adaptiveApproval, useAdaptiveBaselineWorkspace, type AdaptiveApproval } from './useAdaptiveBaselineWorkspace'

type Confirmation = { action: 'finalize' | 'disable' | 'convert' | 'refresh' | 'leave'; snapshot: AdaptiveApproval }
/** Remount by Occupation so drafts, local preview and pending keys never cross scopes. */
export function AdaptiveBaselineRoute() {
  const { occupationId, '*': legacyPath } = useParams<{ occupationId: string; '*': string }>()
  if (occupationId && legacyPath) return <Navigate to={`/ld-manager/baseline-assessments/${encodeURIComponent(occupationId)}`} replace />
  return <WorkspaceLayout>{occupationId ? <AdaptiveBaselineWorkspace key={occupationId} occupationId={occupationId} /> : <AdaptiveBaselineDirectory />}</WorkspaceLayout>
}
export const AdaptiveBaselinePage = AdaptiveBaselineRoute

function AdaptiveBaselineWorkspace({ occupationId }: { occupationId: string }) {
  const navigate = useNavigate(), { t, language } = useTranslation(), tr = (key: string) => t(`adaptiveBaseline.${key}`)
  const state = useAdaptiveBaselineWorkspace(occupationId)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null), [reason, setReason] = useState('')
  const denied = state.error?.status === 401 || state.error?.status === 403
  const workspace = denied ? null : state.workspace
  const locked = state.busy || state.pending || state.needsRefresh
  const legacy = workspace?.working && !isCommonConfiguration(workspace.working.configuration) ? workspace.working.configuration : null
  const skills = Object.fromEntries(Object.values(workspace?.capacity.roles ?? {}).flatMap(role => Object.entries(role.snapshot.skills).map(([id, skill]) => [id, skill.name])))
  function ask(action: Confirmation['action']) {
    if (!workspace) return
    setReason(''); setConfirmation({ action, snapshot: adaptiveApproval(workspace) })
  }
  function confirm() {
    if (!confirmation) return
    const { action, snapshot } = confirmation; setConfirmation(null)
    if (action === 'leave') navigate('/ld-manager/baseline-assessments')
    else if (action === 'refresh') void state.refresh()
    else state.command(action, reason, snapshot)
  }
  return <div className="min-w-0 space-y-4">
    <PageHeader title={tr('workspaceTitle')} description={workspace?.capacity.occupationName ?? tr('workspaceDescription')} actions={<>
      <Button variant="ghost" disabled={state.busy || state.pending && !state.writeCommitted} onClick={() => state.dirty && !state.writeCommitted ? ask('leave') : navigate('/ld-manager/baseline-assessments')}>{tr('back')}</Button>
      <Button variant="outline" disabled={state.busy || state.pending} onClick={() => state.dirty ? ask('refresh') : void state.refresh()}>{tr('refresh')}</Button>
    </>} />
    {state.busy && <AdaptiveLoading />}
    {state.error && <AdaptiveErrorNotice error={state.error} />}
    {state.pending && <Card><CardContent className="space-y-3 pt-5"><Text role="status">{tr(state.writeCommitted ? 'committedReadPending' : 'pending')}</Text><Button variant="outline" disabled={state.busy} onClick={() => void state.retry()}>{tr('retry')}</Button></CardContent></Card>}
    {state.needsRefresh && <Text role="status" className="text-muted-foreground">{tr('refreshRequired')}</Text>}
    {state.notice && <Text role="status" className="text-success">{tr(`success.${state.notice}`)}</Text>}
    {workspace && state.draft && <>
      <Card><CardHeader><CardTitle>{tr('current')}</CardTitle><CardDescription>{tr('historyNotice')}</CardDescription></CardHeader>
        <CardContent className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2"><Text className="break-words font-semibold">{workspace.current ? `${workspace.current.configuration.name} · v${workspace.current.id.version}` : tr('none')}</Text>
            <Badge variant={workspace.current ? 'success' : 'outline'}>{tr(workspace.current ? 'statuses.ACTIVE' : 'notActive')}</Badge>
            <Text variant="body-sm" className="text-muted-foreground">{tr(`readiness.${workspace.admissionReadiness}`)}</Text>
            {workspace.current && <Text variant="caption">{tr('dates.ACTIVATED')}: {new Date(workspace.current.createdAt).toLocaleString(language)}</Text>}
          </div>
          {workspace.current && <Button variant="ghost" disabled={locked} onClick={() => ask('disable')}>{tr('disable')}</Button>}
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard title={tr('capacity')} value={workspace.capacity.occupation?.eligibleCapacity ?? '—'} />
        <StatCard title={tr('skillCount')} value={workspace.capacity.occupation?.skillCount ?? '—'} />
        <StatCard title={tr('minimumCoverage')} value={workspace.capacity.occupation?.minimumQuestions ?? '—'} description={tr('minimumHint')} />
      </div>
      <Card><CardHeader><CardTitle>{tr('coverageTitle')}</CardTitle><CardDescription>{tr('coverageHint')}</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2">{Object.entries(skills).map(([id, name]) => <Badge key={id} variant="outline" className="max-w-full whitespace-normal break-words">{name}</Badge>)}</CardContent></Card>
      {legacy && <Card><CardHeader><CardTitle>{tr('legacyTitle')}</CardTitle><CardDescription>{tr('legacyNotice')}</CardDescription></CardHeader><CardContent className="space-y-2">
        <Text className="break-words">{legacy.name}</Text>
        <Text variant="body-sm">{tr('earlierExploration')}: {legacy.exploration.maxQuestions} · {legacy.exploration.timeLimitSeconds} {tr('seconds')}</Text>
        {Object.entries(legacy.roles).map(([id, bounds]) => <Text key={id} variant="body-sm">{workspace.current?.roles[id]?.name ?? workspace.capacity.roles[id]?.snapshot.name ?? tr('earlierRole')}: {bounds.maxQuestions} · {bounds.timeLimitSeconds} {tr('seconds')}</Text>)}
      </CardContent></Card>}
      <AdaptiveBaselineForm key={workspace.working?.workingRevisionId ?? 'new'} value={state.draft} capacity={workspace.capacity} onChange={state.edit}
        disabled={locked || confirmation !== null} unchanged={state.saved} converting={state.legacy} onSave={() => state.legacy ? ask('convert') : state.command('save')} />
      <Card><CardContent className="space-y-3 pt-5"><div className="flex flex-wrap gap-3">
        <Button variant="outline" disabled={locked || !state.saved} onClick={() => void state.test()}>{tr('test')}</Button>
        <Button disabled={locked || !state.canActivate} onClick={() => ask('finalize')}>{tr('finalize')}</Button>
      </div><Text variant="body-sm" className="text-muted-foreground">{tr(state.canActivate ? 'readyToActivate' : state.saved ? 'previewFirst' : 'saveFirst')}</Text></CardContent></Card>
      {state.preview && <Card><CardHeader><CardTitle>{tr(state.preview.feasible ? 'feasible' : 'infeasible')}</CardTitle><CardDescription>{tr('previewNotice')}</CardDescription></CardHeader><CardContent className="space-y-4">
        <AdaptiveShortages values={state.preview.shortages} skillNames={skills} />
        {state.preview.sample.map((item, index) => <article key={item.itemVersionId} className="space-y-2 rounded-lg border border-border p-4">
          <Text className="whitespace-pre-wrap break-words">{index + 1}. {item.prompt}</Text>
          <ul className="space-y-1 text-body-sm">{Object.entries(item.options).map(([key, text]) => <li key={key} className="whitespace-pre-wrap break-words">{key}. {text}</li>)}</ul>
          <Text variant="caption" className="text-muted-foreground">{skills[item.microSkillId] ?? tr('skill')} · {tr(item.reason)}</Text>
        </article>)}
      </CardContent></Card>}
    </>}
    <Dialog open={confirmation !== null} onOpenChange={open => { if (!open) setConfirmation(null) }} closeLabel={tr('cancel')} ariaLabel={tr('confirm')}>
      <DialogHeader><DialogTitle>{tr('confirm')}</DialogTitle><DialogDescription>{tr(confirmation?.action === 'finalize' ? 'finalizeNotice' : confirmation?.action === 'disable' ? 'disableNotice' : confirmation?.action === 'convert' ? 'convertNotice' : 'discardNotice')}</DialogDescription></DialogHeader>
      {(confirmation?.action === 'finalize' || confirmation?.action === 'disable') && <div className="space-y-2">
        <Text className="break-words">{tr('occupation')}: {workspace?.capacity.occupationName}</Text>
        <Text className="break-words">{tr('current')}: {workspace?.current?.configuration.name ?? tr('none')}{confirmation.snapshot.current ? ` · v${confirmation.snapshot.current.version}` : ''}</Text>
        {confirmation.action === 'finalize' && <Text className="break-words">{tr('replacementName')}: {state.draft?.name.trim()}</Text>}
      </div>}
      {confirmation?.action === 'disable' && <label className="mt-3 space-y-2 text-body-sm">{tr('reason')}<Input value={reason} maxLength={1000} onChange={event => setReason(event.target.value)} /></label>}
      <DialogFooter><Button variant="outline" onClick={() => setConfirmation(null)}>{tr('cancel')}</Button><Button variant={confirmation?.action === 'disable' ? 'destructive' : 'primary'} disabled={state.busy || state.pending || confirmation?.action === 'disable' && !reason.trim()} onClick={confirm}>{tr('confirm')}</Button></DialogFooter>
    </Dialog>
  </div>
}
