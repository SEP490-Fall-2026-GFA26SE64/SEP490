import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { Text } from '../../../shared/components/typography/Text'
import { Button } from '../../../shared/components/ui/Button'
import { Badge } from '../../../shared/components/ui/Badge'
import { SlidersHorizontal, History, Trash2 } from 'lucide-react'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '../../../shared/components/ui/Dialog'
import { AdaptiveBaselineApiError } from './adaptiveBaselineApi'
import { BaselinePolicyForm, type BaselineFormHandle } from './BaselinePolicyForm'
import { getPolicyWorkspace, runScopedCommand, type AbandonedDraft, type BaselineEditorState, type PolicyWorkspace, type ScopedCommand, type ScopedVersion } from './scopedAssessmentPolicyApi'

type Mode = 'overview' | 'wizard' | 'edit'
type Intent = Mode | 'close'
export function BaselinePolicyDialog({ scopeKey, initialAction, onClose, renderError }: { scopeKey: string; initialAction: 'configure' | 'edit' | 'view'; onClose: (saved: boolean) => void; renderError: (error: unknown) => ReactNode }) {
  const { t, language } = useTranslation()
  const [workspace, setWorkspace] = useState<PolicyWorkspace | null>(null), [reload, setReload] = useState(0), [mode, setMode] = useState<Mode>('overview')
  const [error, setError] = useState<unknown>(null), [busy, setBusy] = useState(false), [refreshRequired, setRefreshRequired] = useState(false)
  const [pending, setPending] = useState<{ command: ScopedCommand; intent: Intent } | null>(null)
  const [viewing, setViewing] = useState<ScopedVersion | null>(null), [confirming, setConfirming] = useState(false), [notice, setNotice] = useState('')
  const [historyPage, setHistoryPage] = useState(0), [abandonedPage, setAbandonedPage] = useState(0), [abandonedView, setAbandonedView] = useState<AbandonedDraft | null>(null), [abandonConfirm, setAbandonConfirm] = useState(false)
  const flight = useRef(false), form = useRef<BaselineFormHandle>(null), changed = useRef(false), createKey = useRef(crypto.randomUUID())
  const locked = busy || pending !== null || refreshRequired
  async function execute(command: ScopedCommand, intent: Intent) {
    if (flight.current) return
    flight.current = true; setBusy(true); setPending({ command, intent }); setError(null); setNotice('')
    try {
      const result = await runScopedCommand(command)
      changed.current = true; setWorkspace(result); setHistoryPage(0); setAbandonedPage(0); setPending(null); setViewing(null); setAbandonedView(null); setConfirming(false); setAbandonConfirm(false)
      if (intent === 'close') { onClose(true); return }
      setMode(intent); setNotice(command.kind === 'abandon' ? 'abandoned' : command.kind === 'activate' || command.kind === 'complete' ? 'activated' : 'saved')
    } catch (failure) {
      setError(failure)
      if (failure instanceof AdaptiveBaselineApiError && failure.status >= 400 && failure.status < 500) {
        setPending(null); if (failure.status === 409 || failure.code === 'QUESTION_COUNT_OUT_OF_RANGE') setRefreshRequired(true)
      }
    } finally { flight.current = false; setBusy(false) }
  }
  useEffect(() => {
    const controller = new AbortController()
    void getPolicyWorkspace('BASELINE', scopeKey, 0, controller.signal).then(value => {
      if (controller.signal.aborted) return
      setWorkspace(value); setError(null); setRefreshRequired(false)
      if (initialAction === 'view') setMode('overview')
      else if (!value.draft) {
        void execute({ purpose: 'BASELINE', scopeKey, kind: 'create', commandKey: createKey.current, expectedActivationRevision: value.activationRevision }, value.active ? 'edit' : 'wizard')
      } else setMode(!value.draft.configuration || value.draft.editorState && !value.draft.editorState.completed ? 'wizard' : 'edit')
    }).catch(failure => { if (!controller.signal.aborted) setError(failure) })
    return () => controller.abort()
    // Each opening owns one scope. Mutations have their own stable retry key and in-flight guard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey, reload, initialAction])
  useEffect(() => {
    if (!pending) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn)
  }, [pending])
  function close() {
    if (busy || pending) return
    if (abandonConfirm) { setAbandonConfirm(false); return }
    if (mode !== 'overview' && workspace?.draft && !refreshRequired) form.current?.saveAndClose()
    else onClose(changed.current)
  }
  function save(editorState: BaselineEditorState, dismiss: boolean, activate = false) {
    if (!workspace?.draft || locked) return
    const command = { purpose: 'BASELINE' as const, scopeKey, commandKey: crypto.randomUUID(), draftId: workspace.draft.id,
      expectedRevision: workspace.draft.revision, expectedCatalogHash: workspace.scope.catalogHash, editorState }
    void execute(activate ? { ...command, kind: 'complete', expectedActivationRevision: workspace.activationRevision } : { ...command, kind: 'progress' }, dismiss ? 'close' : mode)
  }
  function edit() {
    if (!workspace || locked) return
    if (workspace.draft) setMode(workspace.draft.configuration && (!workspace.draft.editorState || workspace.draft.editorState.completed) ? 'edit' : 'wizard')
    else void execute({ purpose: 'BASELINE', scopeKey, kind: 'create', commandKey: crypto.randomUUID(), expectedActivationRevision: workspace.activationRevision }, 'edit')
  }
  async function history(page: number, abandoned = false) {
    if (locked || flight.current) return
    flight.current = true; setBusy(true)
    try {
      const result = await getPolicyWorkspace('BASELINE', scopeKey, page, new AbortController().signal)
      setWorkspace(previous => previous ? abandoned ? { ...result, versions: previous.versions } : { ...result, abandonedDrafts: previous.abandonedDrafts } : result)
      if (abandoned) setAbandonedPage(page); else setHistoryPage(page)
      setViewing(null); setAbandonedView(null)
    }
    catch (failure) { setError(failure) }
    finally { flight.current = false; setBusy(false) }
  }
  const draft = workspace?.draft, showForm = mode !== 'overview' && draft != null
  return <Dialog open onOpenChange={open => { if (!open) close() }} ariaLabel={t('scopedPolicy.baselineTitle')} closeLabel={t(showForm ? 'baselineWizard.saveClose' : 'baselineWizard.close')} size="wide" className="max-w-3xl">
    <DialogHeader className="mb-5 gap-2"><div className="flex flex-wrap items-center justify-between gap-3"><DialogTitle><SlidersHorizontal className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />{workspace ? `${workspace.scope.ownerName} · ${workspace.scope.levelName}` : t('scopedPolicy.baselineTitle')}</DialogTitle>
      {draft ? <Badge variant="secondary">{t('scopedPolicy.DRAFT')}</Badge> : workspace?.active && <Badge variant="success">{t('scopedPolicy.ACTIVE')} · v{workspace.active.version}</Badge>}</div>
      <DialogDescription className="text-body-sm">{showForm ? t(mode === 'edit' ? 'baselineWizard.editHelp' : 'baselineWizard.createHelp') : t('baselineWizard.overviewHelp')}</DialogDescription>
      {draft && <Button variant="outline" size="sm" className="mt-1 w-fit border-destructive/30 text-destructive hover:bg-destructive/5" leftIcon={<Trash2 size={14} aria-hidden="true" />} disabled={locked || abandonConfirm} onClick={() => setAbandonConfirm(true)}>{t('baselineUX.abandon')}</Button>}
    </DialogHeader>
    {error != null && <div className="mb-3">{renderError(error)}</div>}
    {busy && <Text role="status" className="mb-3">{t('scopedPolicy.loading')}</Text>}
    {notice && <Text role="status" tone="success" className="mb-3">{t(notice === 'abandoned' ? 'baselineUX.abandoned' : `scopedPolicy.${notice}`)}</Text>}
    {abandonConfirm && draft && workspace && <div role="alert" aria-label={t('baselineUX.abandonTitle')} className="mb-4 space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <Text tone="foreground" className="font-semibold">{t('baselineUX.abandonTitle')}</Text><Text variant="body-sm">{t('baselineUX.abandonHelp')}</Text><div className="flex flex-wrap justify-end gap-2"><Button autoFocus variant="outline" size="sm" disabled={locked} onClick={() => setAbandonConfirm(false)}>{t('baselineUX.keepDraft')}</Button><Button variant="destructive" size="sm" disabled={locked} onClick={() => void execute({ purpose: 'BASELINE', scopeKey, kind: 'abandon', commandKey: crypto.randomUUID(), draftId: draft.id, expectedRevision: draft.revision }, 'overview')}>{t('baselineUX.confirmAbandon')}</Button></div>
    </div>}
    {pending && !busy && <div className="mb-3 space-y-2"><Text role="status">{t('scopedPolicy.pending')}</Text><Button variant="outline" onClick={() => void execute(pending.command, pending.intent)}>{t('scopedPolicy.retry')}</Button></div>}
    {refreshRequired && <div className="mb-3 space-y-2"><Text variant="caption">{t('baselineWizard.reloadHelp')}</Text><Button variant="outline" onClick={() => { setWorkspace(null); setReload(v => v + 1) }}>{t('baselineWizard.reloadSaved')}</Button></div>}
    {showForm && workspace && draft.catalogHash !== workspace.scope.catalogHash && <Text role="status" className="mb-3">{t('scopedPolicy.catalogChanged')}</Text>}
    {!workspace && <DialogBody><Text role="status">{t('scopedPolicy.loading')}</Text>{error != null && <Button variant="outline" onClick={() => setReload(v => v + 1)}>{t('scopedPolicy.retry')}</Button>}</DialogBody>}
    {workspace && showForm ? <BaselinePolicyForm key={`${draft.id}:${draft.revision}:${reload}`} ref={form} workspace={workspace} editing={mode === 'edit'} locked={locked || abandonConfirm}
      onSave={save} onDiscard={() => { if (!locked) onClose(changed.current) }} /> : workspace && <>
      <DialogBody className="space-y-4">
        <div className="flex flex-wrap gap-2">{workspace.active && <Badge variant="success">{t('scopedPolicy.ACTIVE')} · v{workspace.active.version}</Badge>}{draft && <Badge variant="secondary">{t('scopedPolicy.DRAFT')}</Badge>}</div>
        {!workspace.scope.ready && <div className="space-y-2 rounded-lg border border-border p-3"><Text>{t('scopedPolicy.notReady')}</Text>
          {workspace.scope.readinessIssues.map(issue => <Text variant="caption" key={issue}>{t(`scopedPolicy.errors.${issue}`, t('scopedPolicy.notReady'))}</Text>)}
        </div>}
        {draft && draft.catalogHash !== workspace.scope.catalogHash && <Text role="status">{t('scopedPolicy.catalogChanged')}</Text>}
        {viewing && <div className="space-y-3 rounded-lg border border-border p-4"><Text tone="foreground" className="font-semibold">v{viewing.version} · {t('scopedPolicy.readonly')}</Text>
          <Text>{t('baselineWizard.total')}: {viewing.configuration.groups.reduce((sum, g) => sum + g.totalCount, 0)} · {t('baselineWizard.totalMinutes')}: {viewing.configuration.timeLimitSeconds / 60}</Text>
          <Text>{t('scopedPolicy.maxAttempts')}: {viewing.configuration.maxAttempts} · {t('baselineWizard.waitMinutes')}: {viewing.configuration.retakeWaitSeconds / 60}</Text>
          <div className="overflow-x-auto"><table className="w-full text-left text-body-sm"><thead><tr>{['skill', 'knowledgeLevel', 'totalCount', 'requiredCorrect'].map(key => <th key={key} className="p-2 font-semibold">{t(`scopedPolicy.${key}`)}</th>)}</tr></thead><tbody>{viewing.configuration.groups.map(g => <tr key={`${g.skillId}:${g.knowledgeLevel}`}><td className="p-2">{workspace.scope.groups.find(s => s.requirement.skillId === g.skillId)?.skillName ?? g.skillId}</td><td className="p-2">{t(`knowledgeLevel.${g.knowledgeLevel}`)}</td><td className="p-2">{g.totalCount}</td><td className="p-2">{g.requiredCorrectCount}</td></tr>)}</tbody></table></div>
          <Button variant="outline" size="sm" onClick={() => setViewing(null)}>{t('scopedPolicy.backVersions')}</Button>
        </div>}
        {abandonedView && <div className="space-y-3 rounded-xl border border-border bg-background p-4"><Badge variant="outline">{t('baselineUX.abandonedDraft')}</Badge><Text variant="caption">{t('baselineUX.abandonedAt')}: {new Date(abandonedView.abandonedAt).toLocaleString(language)}</Text>
          {abandonedView.editorState ? <><Text>{t('baselineUX.savedStep')}: {abandonedView.editorState.step}/3</Text><div className="overflow-x-auto"><table className="w-full text-left text-body-sm"><thead><tr>{['knowledgeLevel', 'questionsPerSkill', 'correct'].map(key => <th key={key} className="p-2">{t(`baselineWizard.${key}`)}</th>)}</tr></thead><tbody>{abandonedView.editorState.levels.map(row => <tr key={row.knowledgeLevel}><td className="p-2">{t(`knowledgeLevel.${row.knowledgeLevel}`)}</td><td className="p-2">{row.totalCount ?? '—'}</td><td className="p-2">{row.requiredCorrectCount ?? '—'}</td></tr>)}</tbody></table></div>
            <Text variant="body-sm">{t('baselineWizard.totalMinutes')}: {abandonedView.editorState.timeLimitSeconds == null ? '—' : abandonedView.editorState.timeLimitSeconds / 60} · {t('scopedPolicy.maxAttempts')}: {abandonedView.editorState.maxAttempts ?? '—'} · {t('baselineWizard.waitMinutes')}: {abandonedView.editorState.retakeWaitSeconds == null ? '—' : abandonedView.editorState.retakeWaitSeconds / 60}</Text></>
            : abandonedView.configuration ? <><Text>{t('baselineWizard.total')}: {abandonedView.configuration.groups.reduce((sum, group) => sum + group.totalCount, 0)} · {t('baselineWizard.totalMinutes')}: {abandonedView.configuration.timeLimitSeconds / 60}</Text><Text variant="body-sm">{t('scopedPolicy.maxAttempts')}: {abandonedView.configuration.maxAttempts} · {t('baselineWizard.waitMinutes')}: {abandonedView.configuration.retakeWaitSeconds / 60}</Text>
              <div className="overflow-x-auto"><table className="w-full text-left text-body-sm"><thead><tr>{['skill', 'knowledgeLevel', 'totalCount', 'requiredCorrect'].map(key => <th key={key} className="p-2 font-semibold">{t(`scopedPolicy.${key}`)}</th>)}</tr></thead><tbody>{abandonedView.configuration.groups.map(group => <tr key={`${group.skillId}:${group.knowledgeLevel}`}><td className="p-2">{workspace.scope.groups.find(s => s.requirement.skillId === group.skillId)?.skillName ?? group.skillId}</td><td className="p-2">{t(`knowledgeLevel.${group.knowledgeLevel}`)}</td><td className="p-2">{group.totalCount}</td><td className="p-2">{group.requiredCorrectCount}</td></tr>)}</tbody></table></div>
            </> : <Text>{t('baselineUX.noSnapshot')}</Text>}
          <Button size="sm" variant="outline" onClick={() => setAbandonedView(null)}>{t('scopedPolicy.backVersions')}</Button>
        </div>}
        <div className="space-y-3 rounded-xl border border-border p-4"><Text tone="foreground" className="flex items-center gap-2 font-semibold"><History size={16} className="text-primary" aria-hidden="true" />{t('baselineUX.history')}</Text>
          {!workspace.versions.length && <Text>{t('scopedPolicy.noVersions')}</Text>}
          {workspace.versions.map(v => <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"><div className="space-y-1"><Text tone="foreground" className="font-semibold">v{v.version}</Text><Text variant="caption">{new Date(v.createdAt).toLocaleString(language)}</Text></div><div className="flex items-center gap-2"><Badge variant={v.id === workspace.active?.id ? 'success' : 'outline'}>{t(v.id === workspace.active?.id ? 'scopedPolicy.ACTIVE' : 'baselineUX.inactiveVersions')}</Badge><Button variant="outline" className="border-primary/30 text-primary hover:bg-secondary" size="sm" disabled={locked || abandonConfirm} onClick={() => { setViewing(v); setAbandonedView(null) }}>{t('scopedPolicy.view')}</Button></div></div>)}
          <Pagination currentPage={historyPage + 1} totalPages={Math.ceil(workspace.totalVersions / 20)} totalItems={workspace.totalVersions} pageSize={20} locale={language} disabled={locked || abandonConfirm} onPageChange={page => void history(page - 1)} />
        </div>
        {workspace.totalAbandonedDrafts > 0 && <div className="space-y-3 rounded-xl border border-border p-4"><Text tone="foreground" className="font-semibold">{t('baselineUX.abandonedDrafts')}</Text>
          {workspace.abandonedDrafts.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"><div className="space-y-1"><Badge variant="outline">{t('baselineUX.abandonedDraft')}</Badge><Text variant="caption">{new Date(item.abandonedAt).toLocaleString(language)}</Text></div><Button variant="outline" className="border-primary/30 text-primary hover:bg-secondary" size="sm" disabled={locked || abandonConfirm} onClick={() => { setAbandonedView(item); setViewing(null) }}>{t('scopedPolicy.view')}</Button></div>)}
          <Pagination currentPage={abandonedPage + 1} totalPages={Math.ceil(workspace.totalAbandonedDrafts / 20)} totalItems={workspace.totalAbandonedDrafts} pageSize={20} locale={language} disabled={locked || abandonConfirm} onPageChange={page => void history(page - 1, true)} />
        </div>}
        {confirming && <Text role="status">{t('scopedPolicy.confirmHelp')}</Text>}
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" disabled={busy || pending !== null} onClick={close}>{t('scopedPolicy.cancel')}</Button>
        <Button variant="outline" className="border-primary/30 text-primary hover:bg-secondary" disabled={locked || abandonConfirm} onClick={edit}>{t(draft && (!draft.configuration || draft.editorState && !draft.editorState.completed) ? 'baselineWizard.continue' : draft ? 'scopedPolicy.editDraft' : 'scopedPolicy.createDraft')}</Button>
        {draft && <Button disabled={locked || abandonConfirm || !draft.configuration || !workspace.scope.ready || draft.catalogHash !== workspace.scope.catalogHash} onClick={() => {
          if (!confirming) { setConfirming(true); return }
          void execute({ purpose: 'BASELINE', scopeKey, kind: 'activate', commandKey: crypto.randomUUID(), draftId: draft.id, expectedRevision: draft.revision,
            expectedActivationRevision: workspace.activationRevision, expectedCatalogHash: workspace.scope.catalogHash }, 'overview')
        }}>{t('scopedPolicy.activate')}</Button>}
      </DialogFooter>
    </>}
  </Dialog>
}
