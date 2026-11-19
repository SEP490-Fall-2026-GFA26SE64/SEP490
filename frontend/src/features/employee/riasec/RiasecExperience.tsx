import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { RiasecAttemptPanel } from './RiasecAttemptPanel'
import { manifest } from './riasecInstrument'
import { aiRunning, riasecRequest, RiasecError, type Draft, type View } from './riasecApi'
import { RiasecResultComparison } from './RiasecResultComparison'
import { RiasecAiProgress } from './RiasecAiProgress'
import { RiasecResultHistory, type HistoryAction } from './RiasecResultHistory'

export function RiasecExperience({ scope, active, enabled }: { scope: string; active: boolean; enabled: boolean }) {
  const { t } = useTranslation()
  if (!enabled) return <EmptyState title={t('riasecUi.unavailable')} />
  return <Assessment key={scope} active={active} />
}
function Assessment({ active }: { active: boolean }) {
  const { language, t } = useTranslation(), vi = language === 'vi'
  const ui = (key: string) => t(`riasecUi.${key}`)
  const copy = (en: string, vn: string) => vi ? vn : en
  const failureText = (code: string) => {
    if (code === 'RIASEC_ENDPOINT_UNAVAILABLE') return copy('Career interests is not enabled at this server endpoint. Ask the workspace administrator to check the deployment configuration, then reload.', 'Endpoint Khám phá sở thích chưa khả dụng trên server. Nhờ quản trị viên kiểm tra cấu hình triển khai rồi tải lại.')
    if (['EDITING_ELSEWHERE', 'DRAFT_CHANGED'].includes(code)) return copy('The draft changed or editing moved to another tab. Continue here with the latest saved draft.', 'Nháp đã thay đổi hoặc quyền sửa đã chuyển sang tab khác. Tiếp tục tại đây với nháp đã lưu mới nhất.')
    if (code === 'AI_RUNNING') return copy('Wait for AI processing to finish before this action.', 'Chờ AI xử lý xong trước khi thực hiện thao tác này.')
    if (code === 'INCOMPLETE_ANSWERS') return copy('Answer all 60 activities before submitting.', 'Trả lời đủ 60 câu trước khi nộp.')
    if (['FORBIDDEN', 'UNAUTHENTICATED'].includes(code)) return copy('Sign in with your Employee account to access your results.', 'Đăng nhập bằng tài khoản Employee của bạn để xem kết quả.')
    if (['RESTORE_EXPIRED', 'RESULT_NOT_FOUND'].includes(code)) return copy('This result is unavailable or its restore period has ended.', 'Kết quả không còn khả dụng hoặc đã hết thời hạn khôi phục.')
    if (code === 'RESULT_NOT_INACTIVE') return copy('Only an inactive result can be permanently deleted.', 'Chỉ có thể xóa vĩnh viễn bản inactive.')
    if (code === 'NOT_RETRYABLE') return copy('Only the current result with unsuccessful AI can be retried.', 'Chỉ kết quả hiện hành có AI chưa thành công mới được thử lại.')
    return copy('The service is temporarily unavailable. Retry when the connection is restored.', 'Dịch vụ tạm thời chưa khả dụng. Thử lại khi kết nối được khôi phục.')
  }
  const [historyIntent, setHistoryIntent] = useState<'start' | undefined>()
  const [historyOpen, setHistoryOpen] = useState(false)
  const historyTrigger = useRef<HTMLButtonElement>(null)
  const changeHistoryOpen = (open: boolean) => { setHistoryOpen(open); if (!open) requestAnimationFrame(() => historyTrigger.current?.focus()) }
  const [editorId] = useState(() => crypto.randomUUID())
  const [view, setView] = useState<View | null>(null), [error, setError] = useState(''), [saveError, setSaveError] = useState(false)
  const [busy, setBusy] = useState(false), [saving, setSaving] = useState(false), [selected, setSelected] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Map<string, number>>(new Map())
  const [index, setIndex] = useState(0), [review, setReview] = useState(false), [confirm, setConfirm] = useState(false)
  const heading = useRef<HTMLDivElement>(null)
  const draft = useRef<Draft | null>(null), pending = useRef<Record<string, number> | null>(null)
  const flushing = useRef<Promise<boolean> | null>(null), mutating = useRef(false), epoch = useRef(0), mounted = useRef(true)
  const readFailure = useRef<RiasecError | null>(null), loading = useRef(false)
  const syncDraft = (d: Draft) => { draft.current = d; if (pending.current === null) setAnswers(new Map(Object.entries(d.answers))) }
  const load = async () => {
    if (loading.current || readFailure.current && [401, 403, 404].includes(readFailure.current.status) || flushing.current || pending.current || mutating.current) return
    loading.current = true
    const generation = epoch.current
    try {
      const v = await riasecRequest<View>()
      if (!mounted.current || generation !== epoch.current || flushing.current || pending.current) return
      setView(v); syncDraft(v.draft); setError(''); readFailure.current = null
    } catch (e) {
      if (mounted.current && generation === epoch.current) {
        readFailure.current = e instanceof RiasecError ? e : null
        if (e instanceof RiasecError && [401, 403].includes(e.status)) setView(null)
        setError(e instanceof RiasecError && e.status === 404 ? 'RIASEC_ENDPOINT_UNAVAILABLE' : e instanceof Error ? e.message : 'RIASEC_UNAVAILABLE')
      }
    } finally { loading.current = false }
  }
  useEffect(() => {
    mounted.current = true
    if (active) queueMicrotask(() => { if (mounted.current) void load() })
    const timer = window.setInterval(() => { if (active) void load() }, 3000)
    return () => { mounted.current = false; window.clearInterval(timer) }
  }, [active]) // Scope is an unmount boundary; answers never enter browser storage.
  useEffect(() => {
    if (!saving && !saveError) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [saving, saveError])
  const move = (next: number) => { setIndex(next); setReview(false); heading.current?.focus({ preventScroll: true }) }
  const flush = (): Promise<boolean> => {
    if (flushing.current) return flushing.current
    setSaving(true); setSaveError(false); epoch.current++
    flushing.current = (async () => {
      while (pending.current) {
        const values = pending.current; pending.current = null
        try {
          const d = draft.current!
          const saved = await riasecRequest<Draft>('/draft', 'PUT', { editorId, draftId: d.draftId, revision: d.revision, answers: values })
          // Finish queued saves even if navigation unmounts this component.
          draft.current = saved
          if (mounted.current) { syncDraft(saved); setView(v => v ? { ...v, draft: saved } : v); setError('') }
        } catch (e) {
          pending.current ??= values
          if (mounted.current) { setError(e instanceof Error ? e.message : 'RIASEC_UNAVAILABLE'); setSaveError(true) }
          return false
        }
      }
      return true
    })().finally(() => { flushing.current = null; epoch.current++; if (mounted.current) setSaving(false) })
    return flushing.current
  }
  const rate = (value?: number) => {
    const next = new Map(answers), item = manifest.items[index]
    if (value === undefined) next.delete(item.id); else next.set(item.id, value)
    setAnswers(next); pending.current = Object.fromEntries(next); void flush()
  }
  const command = async (work: () => Promise<void>) => {
    if (mutating.current) return false
    mutating.current = true; epoch.current++; setBusy(true); setError('')
    try { await work(); return true } catch (e) { setError(e instanceof Error ? e.message : 'RIASEC_UNAVAILABLE'); return false }
    finally { mutating.current = false; epoch.current++; setBusy(false); void load() }
  }
  const start = () => command(async () => { const d = await riasecRequest<Draft>('/draft', 'POST', { editorId }); syncDraft(d); setView(v => v ? { ...v, draft: d } : v); setIndex(0); setReview(false) })
  const takeover = () => command(async () => {
    const latest = await riasecRequest<View>()
    const d = await riasecRequest<Draft>('/draft/takeover', 'POST', { editorId, draftId: latest.draft.draftId, revision: latest.draft.revision })
    pending.current = null; setSaveError(false); syncDraft(d); setView({ ...latest, draft: d })
  })
  const submit = () => command(async () => {
    if (!await flush()) return
    const d = draft.current!
    const receipt = await riasecRequest<{ id: string }>('/submit', 'POST', { editorId, draftId: d.draftId, revision: d.revision })
    setSelected(receipt.id); setConfirm(false)
  })
  const current = view?.results.find(r => r.id === view?.currentId)
  const result = view?.results.find(r => r.id === selected && !r.deletedAt) ?? current
  const running = view?.results.some(aiRunning) ?? false
  const locked = !active || busy || saveError || view?.draft.editorId !== editorId
  const historyAction = async (action: HistoryAction): Promise<boolean> => {
    if (action.kind === 'start') return start()
    return command(async () => {
      const id = action.result?.id
      if (!id) throw new Error('RESULT_NOT_FOUND')
      if (action.kind === 'view') {
        const latest = await riasecRequest<View>()
        if (!latest.results.some(r => r.id === id && !r.deletedAt)) throw new Error('RESULT_NOT_FOUND')
        setView(latest); syncDraft(latest.draft); setSelected(id)
      } else {
        const suffix = action.kind === 'purge' ? '/permanent' : action.kind === 'restore' ? '/restore' : action.kind === 'retry' ? '/retry' : ''
        await riasecRequest(`/results/${id}${suffix}`, action.kind === 'inactive' || action.kind === 'purge' ? 'DELETE' : 'POST')
        if (action.kind === 'inactive') setSelected(null)
      }
    })
  }
  const navigation = <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
    <div className="min-w-0"><Heading level={2} size="card">{copy('RIASEC occupational interest results', 'Kết quả sở thích nghề nghiệp RIASEC')}</Heading>
      {result && <Text variant="caption">{new Date(result.submittedAt).toLocaleString(vi ? 'vi-VN' : 'en-GB')} · {result.id === view?.currentId ? copy('Current', 'Hiện hành') : copy('History', 'Lịch sử')}</Text>}
    </div>
    <Button ref={historyTrigger} size="sm" variant="outline" onClick={() => { setHistoryIntent(undefined); changeHistoryOpen(true) }}>{copy('Result history', 'Danh sách kết quả')}</Button>
  </div>
  return <section className="space-y-5">
    {view && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="border-primary/35 border-t-2 border-t-primary bg-gradient-to-br from-secondary/50 to-card"><CardContent className="space-y-2 p-4"><Text variant="eyebrow">{copy('RIASEC assessment', 'Bài RIASEC')}</Text><Heading level={2} size="card">{copy('Explore your interests', 'Khám phá sở thích')}</Heading><Text variant="caption">{view.draft.draftId ? copy('Your saved draft is below.', 'Bài nháp đã lưu ở bên dưới.') : copy('60 activities · No time limit', '60 hoạt động · Không giới hạn giờ')}</Text>{!view.draft.draftId && <Button size="sm" disabled={busy || running} onClick={() => { setHistoryIntent('start'); changeHistoryOpen(true) }}>{copy('Start assessment', 'Làm bài RIASEC')}</Button>}</CardContent></Card>
      {[{label:copy('Current result','Kết quả hiện hành'), value:current ? '1' : '0', note:current ? new Date(current.submittedAt).toLocaleDateString(vi ? 'vi-VN' : 'en-GB') : copy('No active result','Chưa có kết quả')}, {label:copy('History','Lịch sử'),value:String(view.results.filter(r => !r.deletedAt && r.id !== view.currentId).length),note:copy('Previous active submissions','Các lần nộp trước còn hoạt động')}, {label:copy('Inactive','Không hoạt động'),value:String(view.results.filter(r => r.deletedAt).length),note:copy('Recover within 7 days','Khôi phục trong 7 ngày')}].map(item => <Card key={item.label} className="border-primary/35 border-t-2 border-t-primary"><CardContent className="space-y-2 p-4"><Text variant="eyebrow">{item.label}</Text><Heading level={2} size="section">{item.value}</Heading><Text variant="caption">{item.note}</Text></CardContent></Card>)}
    </div>}

      {!view && !error && <Text role="status">{copy('Loading…', 'Đang tải…')}</Text>}

      {running && <RiasecAiProgress key={view!.results.find(aiRunning)!.id} result={view!.results.find(aiRunning)!} />}
      {error && <div role="alert" className="space-y-2 text-destructive"><Text>{failureText(error)}</Text>
        {saveError ? <><Text>{copy('Unsaved answers remain in this tab. Retry saving, or continue here with the latest saved draft.', 'Câu chưa lưu vẫn còn trong tab này. Thử lưu lại hoặc tiếp tục tại đây với nháp đã lưu mới nhất.')}</Text><Button variant="outline" onClick={() => void flush()} disabled={saving}>{copy('Retry save', 'Thử lưu lại')}</Button><Button variant="outline" disabled={saving || busy} onClick={() => void takeover()}>{copy('Continue with saved draft', 'Tiếp tục với nháp đã lưu')}</Button></> : <Button variant="outline" onClick={() => { readFailure.current = null; void load() }}>{copy('Reload', 'Tải lại')}</Button>}
      </div>}
    {view?.draft.draftId && <>
      <div role="status" className="flex flex-wrap items-center gap-3 text-body-sm">
        {view.draft.editorId !== editorId ? <><span>{copy('This draft is being edited elsewhere. You can view it here.', 'Nháp đang được sửa ở nơi khác. Bạn có thể xem tại đây.')}</span><Button disabled={busy} onClick={() => void takeover()}>{copy('Continue here', 'Tiếp tục tại đây')}</Button></> : <span>{saving ? copy('Saving…', 'Đang lưu…') : saveError ? copy('Not saved', 'Chưa lưu') : copy('Saved to your account', 'Đã lưu theo tài khoản')}</span>}
      </div>
      {review ? <Card><CardContent className="space-y-4 p-5"><Heading level={2} size="section">{ui('review')} · {answers.size}/60</Heading>
      {answers.size < 60 && <Text role="status">{copy('Unanswered questions:', 'Câu chưa trả lời:')} {manifest.items.flatMap((q, i) => answers.has(q.id) ? [] : [i + 1]).join(', ')}</Text>}
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">{manifest.items.map((item, i) => <Button key={item.id} variant={answers.has(item.id) ? 'secondary' : 'outline'} onClick={() => move(i)}>{i + 1}</Button>)}</div>
      <div className="flex gap-3"><Button variant="outline" onClick={() => setReview(false)}>{ui('back')}</Button><Button disabled={answers.size !== 60 || locked || saving} onClick={() => setConfirm(true)}>{ui('submit')}</Button></div>
    </CardContent></Card> : <RiasecAttemptPanel attempt={{ attemptId: view.draft.draftId, answers: [...answers].map(([itemId, value]) => ({ itemId, value })) }}
      manifest={manifest} answers={answers} index={index} locked={locked} saving={saving} headingRef={heading} onMove={move} onRate={rate} onReview={() => setReview(true)} />}
    </>}
    {view && <div className="space-y-3">
      {result ? <RiasecResultComparison key={result.id} result={result} activeIds={view.activePositionIds}
        navigation={navigation} footer={<div className="border-t border-border px-4 py-3">{!aiRunning(result) && <RiasecAiProgress key={`${result.id}:${result.aiStatus}`} result={result} />}</div>} /> : <div className="rounded-xl border border-border bg-card">{navigation}<div className="p-4"><Text variant="body-sm">{copy('No active result. Open result history to recover an inactive result or start a new assessment.', 'Chưa có kết quả hoạt động. Mở danh sách để khôi phục hoặc làm bài mới.')}</Text></div></div>}

    </div>}

    {view && <RiasecResultHistory key={`${historyOpen}:${historyIntent}`} initialAction={historyIntent} open={historyOpen} onOpenChange={changeHistoryOpen} view={view} selectedId={result?.id} busy={busy} onAction={historyAction} />}
    <Dialog open={confirm} onOpenChange={setConfirm} closeLabel={ui('cancel')}><DialogHeader><DialogTitle>{ui('submit')}</DialogTitle></DialogHeader><DialogBody><Text>{copy('Submit all 60 answers? Scores and this submission will be saved. AI will then explore company positions using your interests.', 'Nộp đủ 60 câu? Điểm và lần nộp này sẽ được lưu. AI sau đó khám phá các vị trí trong công ty theo sở thích của bạn.')}</Text></DialogBody><DialogFooter><Button variant="outline" disabled={busy} onClick={() => setConfirm(false)}>{ui('cancel')}</Button><Button disabled={busy || saving || locked} onClick={() => void submit()}>{ui('submit')}</Button></DialogFooter></Dialog>

  </section>
}
