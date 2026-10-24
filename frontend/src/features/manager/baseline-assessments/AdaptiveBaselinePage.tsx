import { useEffect, useState } from 'react'
import { ClipboardList, Eye, Layers, Target } from 'lucide-react'
import { AdaptiveAssessmentPreview } from './AdaptiveAssessmentPreview'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader } from '../../../shared/components/ui/Card'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { Input } from '../../../shared/components/ui/Input'
import { Heading } from '../../../shared/components/typography/Heading'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { AdaptiveBaselineDirectory } from './AdaptiveBaselineDirectory'
import { AdaptiveBaselineForm } from './AdaptiveBaselineForm'
import { AdaptiveErrorNotice, AdaptiveLoading, AdaptiveShortages } from './AdaptiveBaselineFeedback'
import { getAdaptiveVersion, isCommonConfiguration, type AdaptiveVersion } from './adaptiveBaselineApi'
import { boundsDraft, createAdaptiveDraft } from './adaptiveBaselineDraft'
import { adaptiveApproval, useAdaptiveBaselineWorkspace, type AdaptiveApproval } from './useAdaptiveBaselineWorkspace'

type Confirmation = { action: 'finalize' | 'disable' | 'discard' | 'convert' | 'refresh' | 'leave'; snapshot: AdaptiveApproval }
// Actions must also fit the narrow content area beside an expanded mobile sidebar.
const compactAction = 'h-auto min-h-8 min-w-0 max-w-full whitespace-normal [overflow-wrap:anywhere] [&>span]:whitespace-normal'
const regularAction = 'h-auto min-h-10 min-w-0 max-w-full whitespace-normal [overflow-wrap:anywhere] [&>span]:whitespace-normal'
/** Remount by Occupation so drafts, local preview and pending keys never cross scopes. */
export function AdaptiveBaselineRoute() {
  const { occupationId, '*': legacyPath } = useParams<{ occupationId: string; '*': string }>()
  const { t } = useTranslation()
  if (occupationId && legacyPath) return <Navigate to={`/ld-manager/baseline-assessments/${encodeURIComponent(occupationId)}`} replace />
  if (import.meta.env.VITE_ADAPTIVE_BASELINE_ENABLED !== 'true') return <WorkspaceLayout><div className="space-y-4">
    <Heading level={1} className="sr-only">{t('adaptiveBaseline.title')}</Heading>
    <Card><CardContent className="p-6"><Text role="status">{t('adaptiveBaseline.unavailable')}</Text></CardContent></Card>
  </div></WorkspaceLayout>
  return <WorkspaceLayout>{occupationId ? <AdaptiveBaselineWorkspace key={occupationId} occupationId={occupationId} /> : <AdaptiveBaselineDirectory />}</WorkspaceLayout>
}
export const AdaptiveBaselinePage = AdaptiveBaselineRoute

function AdaptiveBaselineWorkspace({ occupationId }: { occupationId: string }) {
  const navigate = useNavigate(), { t, language } = useTranslation(), tr = (key: string) => t(`adaptiveBaseline.${key}`)
  const state = useAdaptiveBaselineWorkspace(occupationId)
  const [params, setParams] = useSearchParams()
  const blueprint = params.get('blueprint'), version = params.get('version')
  const [versionReload, setVersionReload] = useState(0)
  const versionKey = `${blueprint}:${version}:${versionReload}`
  const [versionState, setVersionState] = useState<{ key: string; value: (AdaptiveVersion & { status: string }) | null; error: boolean } | null>(null)
  const selectedVersion = versionState?.key === versionKey ? versionState.value : null
  const versionError = versionState?.key === versionKey && versionState.error
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [draftExistsNotice, setDraftExistsNotice] = useState(false)
  useEffect(() => {
    if (!blueprint || !version) return
    const controller = new AbortController()
    void getAdaptiveVersion(occupationId, { blueprintId: blueprint, version: Number(version) }, controller.signal)
      .then(value => { if (!controller.signal.aborted) setVersionState({ key: versionKey, value, error: false }) })
      .catch(() => { if (!controller.signal.aborted) setVersionState({ key: versionKey, value: null, error: true }) })
    return () => controller.abort()
  }, [occupationId, blueprint, version, versionKey])
  const currentWorkingId = state.workspace?.working?.workingRevisionId
  useEffect(() => {
    if (state.notice === 'save' && currentWorkingId) {
      setParams({ draft: currentWorkingId }, { replace: true })
    }
    if (state.notice === 'discard') setParams({}, { replace: true })
  }, [state.notice, currentWorkingId, setParams])
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null), [reason, setReason] = useState('')
  const denied = state.error?.status === 401 || state.error?.status === 403
  const workspace = denied ? null : state.workspace
  const requestedDraft = params.get('draft')
  const draftMismatch = Boolean(requestedDraft && workspace && requestedDraft !== workspace.working?.workingRevisionId)
  const locked = state.busy || state.pending || state.needsRefresh || draftMismatch
  const viewingVersion = Boolean(version && editing !== versionKey)
  const versionDraft = workspace && selectedVersion ? createAdaptiveDraft({ ...workspace, working: null, current: selectedVersion }) : null
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
    else if (action === 'refresh') { setEditing(null); setVersionReload(value => value + 1); void state.refresh() }
    else { if (action === 'discard') setDraftExistsNotice(false); state.command(action, reason, snapshot) }
  }
  return <div className="min-w-0 space-y-5 pb-8 [overflow-wrap:anywhere]">
    <Heading level={1} className="sr-only">{tr('workspaceTitle')}</Heading>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Text variant="body-sm" tone="foreground" className="min-w-0 break-words font-semibold">{workspace?.capacity.occupationName}</Text>
      <div className="flex min-w-0 max-w-full flex-wrap gap-2">
      <Button size="sm" className={compactAction} variant="ghost" disabled={state.busy || state.pending && !state.writeCommitted} onClick={() => state.dirty && !state.writeCommitted ? ask('leave') : navigate('/ld-manager/baseline-assessments')}>{tr('back')}</Button>
      <Button size="sm" className={compactAction} variant="outline" disabled={state.busy || state.pending} onClick={() => { if (state.dirty) ask('refresh'); else { setVersionReload(value => value + 1); void state.refresh() } }}>{tr('refresh')}</Button>
      <Button size="sm" className={compactAction} disabled={!workspace || locked || state.dirty} onClick={() => {
        if (workspace?.working) { setDraftExistsNotice(true); return }
        setDraftExistsNotice(false); setParams({}); state.edit({ name: '', occupation: boundsDraft() }); setEditing(null)
      }}>{tr('createNew')}</Button>
    </div></div>
    {state.busy && <AdaptiveLoading />}
    {state.error && <AdaptiveErrorNotice error={state.error} />}
    {!denied && !workspace && selectedVersion && <Card><CardHeader className="p-5 pb-4"><Heading level={2} size="card">{selectedVersion.configuration.name} · v{selectedVersion.id.version}</Heading></CardHeader><CardContent className="space-y-2 px-5 pb-5">
      <Badge variant="outline">{tr(`statuses.${selectedVersion.status}`)}</Badge>
      {isCommonConfiguration(selectedVersion.configuration) && <Text variant="body-sm">{selectedVersion.configuration.occupationBounds.maxQuestions} · {selectedVersion.configuration.occupationBounds.timeLimitSeconds % 60 !== 0 ? '≈ ' : ''}{Math.round(selectedVersion.configuration.occupationBounds.timeLimitSeconds / 60)} {tr('totalMinutes')}</Text>}
    </CardContent></Card>}
    {draftMismatch && <Card><CardContent className="space-y-3 p-5"><Text role="alert">{tr('refreshRequired')}</Text>
      <Button disabled={state.busy || state.pending} onClick={() => setParams(workspace?.working ? { draft: workspace.working.workingRevisionId } : {})}>{tr(workspace?.working ? 'continueDraft' : 'refresh')}</Button>
    </CardContent></Card>}
    {state.pending && <Card><CardContent className="space-y-3 p-5"><Text role="status">{tr(state.writeCommitted ? 'committedReadPending' : 'pending')}</Text><Button size="sm" variant="outline" disabled={state.busy} onClick={() => void state.retry()}>{tr('retry')}</Button></CardContent></Card>}
    {state.needsRefresh && <Text role="status" className="text-muted-foreground">{tr('refreshRequired')}</Text>}
    {draftExistsNotice && <Card><CardContent className="space-y-3 p-5">
      <Text role="alert">{tr('existingDraftNotice')}</Text>
      <Button disabled={locked} onClick={() => { setDraftExistsNotice(false); if (workspace?.working) setParams({ draft: workspace.working.workingRevisionId }) }}>{tr('continueDraft')}</Button>
      <Button variant="outline" onClick={() => setDraftExistsNotice(false)}>{tr('cancel')}</Button>
    </CardContent></Card>}
    {state.notice && <Text role="status" tone="success">{tr(`success.${state.notice}`)}</Text>}
    {workspace && state.draft && <>
      <Card className={workspace.current ? "overflow-hidden border-success/40" : "overflow-hidden border-primary/25"}><CardHeader className={workspace.current ? "border-b border-success/20 bg-success/5 p-5" : "border-b border-primary/20 bg-secondary/30 p-5"}><Heading level={2} size="subsection">{tr('current')}</Heading><CardDescription>{tr('historyNotice')}</CardDescription></CardHeader>
        <CardContent className="flex flex-wrap items-start justify-between gap-3 p-5">
          <div className="min-w-0 max-w-full space-y-2"><Text variant="body-sm" tone="foreground" className="break-words font-semibold">{workspace.current ? `${workspace.current.configuration.name} · v${workspace.current.id.version}` : tr('none')}</Text>
            <Badge className="max-w-full whitespace-normal break-words" variant={workspace.current ? 'success' : 'outline'}>{tr(workspace.current ? 'statuses.ACTIVE' : 'notActive')}</Badge>
            <Text variant="body-sm" className="text-muted-foreground">{tr(`readiness.${workspace.admissionReadiness}`)}</Text>
            {workspace.current && <Text variant="caption">{tr('dates.ACTIVATED')}: {new Date(workspace.current.createdAt).toLocaleString(language)}</Text>}
          </div>
          {workspace.current && <Button size="sm" className={compactAction} variant="ghost" disabled={locked} onClick={() => ask('disable')}>{tr('disable')}</Button>}
        </CardContent>
      </Card>
      <div className="grid min-w-0 gap-3 sm:grid-cols-3 [&>*]:min-w-0 [&_*]:break-words [&_span]:min-w-0">
        <StatCard variant="gradient" icon={<ClipboardList size={16} />} valueClassName="text-primary" title={tr('capacity')} value={workspace.capacity.occupation?.eligibleCapacity ?? '—'} />
        <StatCard variant="gradient" icon={<Layers size={16} />} valueClassName="text-primary" title={tr('skillCount')} value={workspace.capacity.occupation?.skillCount ?? '—'} />
        <StatCard variant="gradient" icon={<Target size={16} />} valueClassName="text-primary" title={tr('minimumCoverage')} value={workspace.capacity.occupation?.minimumQuestions ?? '—'} description={tr('minimumHint')} />
      </div>
      {!viewingVersion && <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary">{tr('statuses.DRAFT')}</Badge>
        {workspace.working && <Button className={regularAction} variant="destructive" disabled={locked} onClick={() => ask('discard')}>{tr('deleteDraft')}</Button>}
        {state.dirty && <Button className={regularAction} variant="outline" disabled={locked} onClick={() => ask('refresh')}>{tr('cancelEditing')}</Button>}
      </div>}
      <Card><CardHeader className="p-5 pb-4"><Heading level={2} size="card">{tr('coverageTitle')}</Heading><CardDescription>{tr('coverageHint')}</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2 px-5 pb-5">{Object.entries(skills).map(([id, name]) => <Badge key={id} variant="secondary" className="max-w-full whitespace-normal [overflow-wrap:anywhere]">{name}</Badge>)}</CardContent></Card>
      {legacy && <Card><CardHeader className="p-5 pb-4"><Heading level={2} size="card">{tr('legacyTitle')}</Heading><CardDescription>{tr('legacyNotice')}</CardDescription></CardHeader><CardContent className="space-y-2 px-5 pb-5">
        <Text variant="body-sm" className="break-words">{legacy.name}</Text>
        <Text variant="body-sm">{tr('earlierExploration')}: {legacy.exploration.maxQuestions} · {legacy.exploration.timeLimitSeconds} {tr('seconds')}</Text>
        {Object.entries(legacy.roles).map(([id, bounds]) => <Text key={id} variant="body-sm">{workspace.current?.roles[id]?.name ?? workspace.capacity.roles[id]?.snapshot.name ?? tr('earlierRole')}: {bounds.maxQuestions} · {bounds.timeLimitSeconds} {tr('seconds')}</Text>)}
      </CardContent></Card>}
      {viewingVersion && <Card><CardContent className="space-y-3 p-5">
        <Text variant="body-sm">{selectedVersion ? `${selectedVersion.configuration.name} · v${selectedVersion.id.version}` : tr(versionError ? 'unavailable' : 'loading')}</Text>
        {selectedVersion && <Badge className="max-w-full whitespace-normal break-words" variant={selectedVersion.status === 'ACTIVE' ? 'success' : 'outline'}>{tr(`statuses.${selectedVersion.status}`)}</Badge>}
        <Text variant="body-sm">{tr('editVersionNotice')}</Text>
        <Text variant="body-sm">{tr(workspace.working ? 'existingDraftNotice' : 'editVersionNotice')}</Text>
        <Button className={regularAction} disabled={locked || !versionDraft} onClick={() => {
          if (workspace.working) setParams({ draft: workspace.working.workingRevisionId })
          else if (versionDraft) { state.edit(versionDraft); setEditing(versionKey) }
        }}>{tr(workspace.working ? 'continueDraft' : 'editVersion')}</Button>
      </CardContent></Card>}
      {(!viewingVersion || versionDraft) && <AdaptiveBaselineForm key={viewingVersion ? `${blueprint}:${version}` : workspace.working?.workingRevisionId ?? 'new'} value={viewingVersion ? versionDraft! : state.draft} capacity={workspace.capacity} onChange={state.edit}
        disabled={viewingVersion || locked || confirmation !== null} unchanged={viewingVersion || state.saved} converting={state.legacy} onSave={() => state.legacy ? ask('convert') : state.command('save')} />}
      <Card><CardContent className="space-y-3 p-5"><div className="flex flex-wrap gap-3">
        <Button className={regularAction} variant="outline" disabled={viewingVersion || locked || !state.saved} leftIcon={<Eye size={16} />} onClick={() => { setPreviewOpen(true); void state.test() }}>{tr('test')}</Button>
        <Button className={regularAction} disabled={viewingVersion || locked || !state.canActivate} onClick={() => ask('finalize')}>{tr('finalize')}</Button>
      </div><Text variant="body-sm" className="text-muted-foreground">{tr(state.canActivate ? 'readyToActivate' : state.saved ? 'previewFirst' : 'saveFirst')}</Text></CardContent></Card>
      {state.preview && <Card className={state.preview.feasible ? "border-success/40 bg-success/5" : "border-warning/50 bg-warning/5"}>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="min-w-0 space-y-2"><Badge variant={state.preview.feasible ? 'success' : 'warning'}>{tr(state.preview.feasible ? 'feasible' : 'infeasible')}</Badge>
            <Text variant="body-sm" tone="foreground">{tr('previewNotice')}</Text>
            <AdaptiveShortages values={state.preview.shortages} skillNames={skills} />
          </div>
          <Button size="sm" variant="outline" leftIcon={<Eye size={16} />} onClick={() => setPreviewOpen(true)}>{tr('test')}</Button>
        </CardContent>
      </Card>}
      {state.preview && previewOpen && <AdaptiveAssessmentPreview preview={state.preview} skillNames={skills} onClose={() => setPreviewOpen(false)} />}
    </>}
    <Dialog open={confirmation !== null} onOpenChange={open => { if (!open) setConfirmation(null) }} closeLabel={tr('cancel')} ariaLabel={tr('confirm')}>
      <DialogHeader><DialogTitle>{tr('confirm')}</DialogTitle><DialogDescription>{tr(confirmation?.action === 'discard' ? 'deleteDraftNotice' : confirmation?.action === 'finalize' ? 'finalizeNotice' : confirmation?.action === 'disable' ? 'disableNotice' : confirmation?.action === 'convert' ? 'convertNotice' : 'discardNotice')}</DialogDescription></DialogHeader>
      {(confirmation?.action === 'finalize' || confirmation?.action === 'disable') && <div className="space-y-2">
        <Text variant="body-sm" className="break-words">{tr('occupation')}: {workspace?.capacity.occupationName}</Text>
        <Text variant="body-sm" className="break-words">{tr('current')}: {workspace?.current?.configuration.name ?? tr('none')}{confirmation.snapshot.current ? ` · v${confirmation.snapshot.current.version}` : ''}</Text>
        {confirmation.action === 'finalize' && <Text variant="body-sm" className="break-words">{tr('replacementName')}: {state.draft?.name.trim()}</Text>}
      </div>}
      {confirmation?.action === 'disable' && <label className="mt-3 space-y-2 text-body-sm">{tr('reason')}<Input value={reason} maxLength={1000} onChange={event => setReason(event.target.value)} /></label>}
      <DialogFooter><Button variant="outline" onClick={() => setConfirmation(null)}>{tr('cancel')}</Button><Button variant={confirmation?.action === 'disable' ? 'destructive' : 'primary'} disabled={state.busy || state.pending || confirmation?.action === 'disable' && !reason.trim()} onClick={confirm}>{tr('confirm')}</Button></DialogFooter>
    </Dialog>
  </div>
}
