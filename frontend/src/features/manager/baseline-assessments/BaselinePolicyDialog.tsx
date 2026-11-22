import { useEffect, useRef, useState, type ReactNode } from 'react'
import { SlidersHorizontal, Trash2 } from 'lucide-react'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { Text } from '../../../shared/components/typography/Text'
import { Button } from '../../../shared/components/ui/Button'
import { Badge } from '../../../shared/components/ui/Badge'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '../../../shared/components/ui/Dialog'
import { ManagementDialog as Dialog } from '../../../shared/components/ui/ManagementUi'
import { AdaptiveBaselineApiError } from './adaptiveBaselineApi'
import { BaselinePolicyForm, type BaselineFormHandle } from './BaselinePolicyForm'
import { getPolicyWorkspace, runScopedCommand, type BaselineEditorState, type PolicyWorkspace, type ScopedCommand } from './scopedAssessmentPolicyApi'

export function BaselinePolicyDialog({ scopeKey, initialAction, onClose, onActivated, renderError }: { scopeKey: string; initialAction: 'configure' | 'edit' | 'view'; onClose: (saved: boolean) => void; onActivated?: (workspace: PolicyWorkspace) => void; renderError: (error: unknown) => ReactNode }) {
  const { t, language } = useTranslation(), copy = (en: string, vi: string) => language === 'vi' ? vi : en
  const [workspace, setWorkspace] = useState<PolicyWorkspace | null>(null), [reload, setReload] = useState(0), [editing, setEditing] = useState(initialAction !== 'view')
  const [error, setError] = useState<unknown>(null), [busy, setBusy] = useState(false), [pending, setPending] = useState<{ command: ScopedCommand; dismiss: boolean; activateAfterSave: boolean } | null>(null)
  const [dirty, setDirty] = useState(false), [closing, setClosing] = useState(false), [abandoning, setAbandoning] = useState(false), [formStep, setFormStep] = useState(1)
  const [notice, setNotice] = useState(''), [historyPage, setHistoryPage] = useState(0)
  const form = useRef<BaselineFormHandle>(null), flight = useRef(false), changed = useRef(false)
  const draft = workspace?.draft, legacy = Boolean(workspace && workspace.scope.levelId !== 'ALL_ROLE_LEVELS'), locked = busy || pending !== null
  useEffect(() => {
    const controller = new AbortController()
    void getPolicyWorkspace('BASELINE', scopeKey, historyPage, controller.signal).then(value => {
      if (!controller.signal.aborted) { setWorkspace(value); setError(null) }
    }).catch(failure => { if (!controller.signal.aborted) setError(failure) })
    return () => controller.abort()
  }, [scopeKey, reload, historyPage])
  useEffect(() => {
    if (!dirty && !pending) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, pending])
  async function execute(command: ScopedCommand, dismiss = false, activateAfterSave = false) {
    if (flight.current) return
    let savedForActivation = false
    flight.current = true; setBusy(true); setError(null); setPending({ command, dismiss, activateAfterSave }); setNotice('')
    try {
      let result = await runScopedCommand(command)
      changed.current = true; setWorkspace(result)
      if (command.kind === 'progress' && activateAfterSave) {
        savedForActivation = true
        if (!result.draft?.configuration) throw new Error('Saved configuration is incomplete')
        const activation: ScopedCommand = { purpose: 'BASELINE', scopeKey, kind: 'activate', commandKey: crypto.randomUUID(), draftId: result.draft.id, expectedRevision: result.draft.revision, expectedActivationRevision: result.activationRevision, expectedCatalogHash: result.scope.catalogHash }
        setPending({ command: activation, dismiss: false, activateAfterSave: false })
        result = await runScopedCommand(activation)
      }
      const activated = command.kind === 'activate' || activateAfterSave
      setWorkspace(result); setPending(null); setDirty(false); setClosing(false); setAbandoning(false)
      setNotice(activated ? t('scopedPolicy.activated') : command.kind === 'abandon' ? t('baselineUX.abandoned') : t('scopedPolicy.saved'))
      if (activated && onActivated) { onActivated(result); return }
      if (command.kind !== 'progress' || activated) setEditing(false)
      if (dismiss) onClose(true)
    } catch (failure) {
      setError(failure)
      if (savedForActivation) setNotice(t('scopedPolicy.savedActivationFailed'))
      // Retry only the uncertain stage: activation retries never repeat the already saved draft command.
      if (failure instanceof AdaptiveBaselineApiError && failure.status >= 400 && failure.status < 500) setPending(null)
    } finally { flight.current = false; setBusy(false) }
  }
  function close() { if (locked) return; if (dirty) setClosing(true); else onClose(changed.current) }
  function save(editorState: BaselineEditorState, dismiss: boolean, activateAfterSave = false) {
    if (!workspace || locked || legacy) return
    void execute({ purpose: 'BASELINE', scopeKey, kind: 'progress', commandKey: crypto.randomUUID(), draftId: draft?.id ?? null,
      expectedRevision: draft?.revision ?? 0, expectedActivationRevision: workspace.activationRevision, expectedCatalogHash: workspace.scope.catalogHash, editorState }, dismiss, activateAfterSave)
  }
  return <><Dialog open onOpenChange={open => { if (!open) close() }} size="wide" className="max-w-3xl" ariaLabel={t('scopedPolicy.baselineTitle')}>
    <DialogHeader><DialogTitle><SlidersHorizontal className="size-5 text-primary" />{workspace?.scope.ownerName ?? t('scopedPolicy.baselineTitle')}</DialogTitle><DialogDescription>{legacy ? copy('Historical Role level policy · read only', 'Chính sách Role Level cũ · chỉ xem') : copy('One policy for this Role. The selected Role level determines each employee’s required Skills.', 'Một chính sách chung cho vị trí. Role Level đã chọn quyết định Skill cần đánh giá của từng nhân viên.')}</DialogDescription>
      <div className="flex flex-wrap gap-2">{workspace?.active && <Badge variant="success">{t('scopedPolicy.ACTIVE')} · v{workspace.active.version}</Badge>}{draft && <Badge variant="secondary">{t('scopedPolicy.DRAFT')}</Badge>}{dirty && <Badge variant="warning">{copy('Unsaved changes', 'Thay đổi chưa lưu')}</Badge>}</div>
    </DialogHeader>
    {error != null && <div className="mb-3">{renderError(error)}</div>}
    {notice && <Text role="status" variant="body-sm" tone="success" className="mb-3">{notice}</Text>}
    {pending && !busy && <div className="mb-3 space-y-2"><Text role="status" variant="body-sm">{t('scopedPolicy.pending')}</Text><Button variant="outline" onClick={() => void execute(pending.command, pending.dismiss, pending.activateAfterSave)}>{t('scopedPolicy.retry')}</Button></div>}
    {!workspace ? <DialogBody><Text role="status">{error ? copy('Configuration could not be loaded.', 'Chưa tải được cấu hình.') : t('scopedPolicy.loading')}</Text>{error != null && <Button variant="outline" onClick={() => setReload(value => value + 1)}>{t('scopedPolicy.retry')}</Button>}</DialogBody>
      : editing && !legacy ? <BaselinePolicyForm key={`${draft?.id ?? 'local'}:${draft?.revision ?? 0}:${reload}`} ref={form} workspace={workspace} locked={locked} onSave={save} onDirtyChange={setDirty} onStepChange={setFormStep} />
      : <DialogBody className="space-y-4">
        {legacy && <Text variant="body-sm">{copy('Retained for history. New baseline assessments require an explicitly activated shared Role policy.', 'Giữ lại để tra cứu lịch sử. Lượt baseline mới cần chính sách chung theo vị trí được kích hoạt tường minh.')}</Text>}
        {!workspace.scope.ready && <Text variant="body-sm">{t('scopedPolicy.notReady')}</Text>}
        {workspace.scope.readinessIssues.map(issue => <Text key={issue} variant="caption">{t(`scopedPolicy.errors.${issue}`, issue)}</Text>)}
        {!workspace.versions.length && <Text variant="body-sm">{t('scopedPolicy.noVersions')}</Text>}
        {workspace.versions.map(version => <details key={version.id} className="rounded-lg border border-border p-3"><summary className="cursor-pointer text-body-sm">v{version.version} · {new Date(version.createdAt).toLocaleString(language)} · {version.id === workspace.active?.id ? t('scopedPolicy.ACTIVE') : t('baselineUX.inactiveVersions')}</summary>
          <div className="mt-3 space-y-2"><Text variant="caption">{version.configuration.baselineTiming ? `${copy('Seconds per question', 'Giây mỗi câu')}: ${version.configuration.baselineTiming.secondsPerQuestion}` : `${copy('Time limit (seconds)', 'Giới hạn thời gian (giây)')}: ${version.configuration.timeLimitSeconds}`}</Text><Text variant="caption">{copy('Maximum attempts', 'Số lượt tối đa')}: {version.configuration.maxAttempts} · {copy('Retake wait (minutes)', 'Chờ làm lại (phút)')}: {version.configuration.retakeWaitSeconds / 60}</Text>
          <ul className="space-y-1 text-caption">{version.configuration.groups.map(group => <li key={`${group.skillId}:${group.knowledgeLevel}`}>{workspace.scope.groups.find(item => item.requirement.skillId === group.skillId)?.skillName ?? group.skillId} · {t('knowledgeLevel.' + group.knowledgeLevel)} · {group.requiredCorrectCount}/{group.totalCount}</li>)}</ul></div>
        </details>)}
        <Pagination currentPage={historyPage + 1} totalPages={Math.ceil(workspace.totalVersions / 20)} totalItems={workspace.totalVersions} pageSize={20} locale={language} disabled={locked} onPageChange={page => setHistoryPage(page - 1)} />
        {draft && <details className="rounded-lg border border-border p-3"><summary className="cursor-pointer text-body-sm">{copy('Last saved draft', 'Bản nháp đã lưu')} · {new Date(draft.updatedAt).toLocaleString(language)}</summary><pre className="mt-2 whitespace-pre-wrap text-caption">{draft.editorState?.levels.map(row => `${t('knowledgeLevel.' + row.knowledgeLevel)}: ${row.requiredCorrectCount ?? '—'}/${row.totalCount ?? '—'}`).join('\n') ?? draft.configuration?.groups.map(row => `${row.skillId} · ${t('knowledgeLevel.' + row.knowledgeLevel)}: ${row.requiredCorrectCount}/${row.totalCount}`).join('\n') ?? t('baselineUX.noSnapshot')}</pre></details>}
        {workspace.abandonedDrafts.map(item => <details key={item.id} className="rounded-lg border border-border p-3"><summary className="cursor-pointer text-body-sm">{t('baselineUX.abandonedDraft')} · {new Date(item.abandonedAt).toLocaleString(language)}</summary><div className="mt-2 space-y-1">{(item.editorState?.levels ?? item.configuration?.groups ?? []).map((row, index) => <Text key={index} variant="caption">{t('knowledgeLevel.' + row.knowledgeLevel)} · {row.requiredCorrectCount ?? '—'}/{row.totalCount ?? '—'}</Text>)}<Text variant="caption">{item.editorState?.timePerQuestionSeconds ?? item.configuration?.baselineTiming?.secondsPerQuestion ?? item.editorState?.timeLimitSeconds ?? item.configuration?.timeLimitSeconds ?? '—'} {copy('seconds', 'giây')}</Text></div></details>)}
        <Pagination currentPage={historyPage + 1} totalPages={Math.ceil(workspace.totalAbandonedDrafts / 20)} totalItems={workspace.totalAbandonedDrafts} pageSize={20} locale={language} disabled={locked} onPageChange={page => setHistoryPage(page - 1)} />
      </DialogBody>}
    <DialogFooter className="flex-wrap">
      {draft && !legacy && <Button variant="ghost" size="sm" className="mr-auto text-destructive" leftIcon={<Trash2 size={14} />} disabled={locked} onClick={() => setAbandoning(true)}>{t('baselineUX.abandon')}</Button>}
      <Button variant="outline" disabled={locked} onClick={close}>{copy('Close', 'Đóng')}</Button>
      {workspace && !legacy && (editing ? formStep === 3 && <Button disabled={locked || !workspace.scope.ready} isLoading={busy} onClick={() => form.current?.saveAndActivate()}>{copy('Save & Activate', 'Lưu và kích hoạt')}</Button> : <Button disabled={locked} onClick={() => setEditing(true)}>{copy('Configure', 'Cấu hình')}</Button>)}
      {editing && formStep === 3 && <Text variant="caption" className="w-full">{copy('Save & Activate saves this configuration, then activates the saved revision after validation.', 'Lưu và kích hoạt sẽ lưu cấu hình này, sau đó kiểm tra và kích hoạt đúng phiên bản đã lưu.')}</Text>}
    </DialogFooter>
  </Dialog>
  <Dialog open={closing} onOpenChange={open => { if (!locked) setClosing(open) }} ariaLabel={copy('Unsaved changes', 'Thay đổi chưa lưu')}><DialogHeader><DialogTitle>{copy('Save changes before closing?', 'Lưu thay đổi trước khi đóng?')}</DialogTitle><DialogDescription>{copy('Discarding leaves the previously saved draft and active policy unchanged.', 'Bỏ thay đổi vẫn giữ nguyên bản nháp đã lưu và chính sách đang hoạt động.')}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={locked} onClick={() => setClosing(false)}>{copy('Continue editing', 'Tiếp tục chỉnh sửa')}</Button><Button variant="outline" disabled={locked} onClick={() => onClose(changed.current)}>{copy('Discard changes', 'Bỏ thay đổi')}</Button><Button disabled={locked} onClick={() => form.current?.save(true)}>{copy('Save draft', 'Lưu bản nháp')}</Button></DialogFooter></Dialog>
  <Dialog open={abandoning} onOpenChange={open => { if (!locked) setAbandoning(open) }} ariaLabel={t('baselineUX.abandonTitle')}><DialogHeader><DialogTitle>{t('baselineUX.abandonTitle')}</DialogTitle><DialogDescription>{t('baselineUX.abandonHelp')}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={locked} onClick={() => setAbandoning(false)}>{t('baselineUX.keepDraft')}</Button><Button variant="destructive" disabled={locked} onClick={() => { if (draft) void execute({ purpose: 'BASELINE', scopeKey, kind: 'abandon', commandKey: crypto.randomUUID(), draftId: draft.id, expectedRevision: draft.revision }) }}>{t('baselineUX.confirmAbandon')}</Button></DialogFooter></Dialog>
  </>
}
