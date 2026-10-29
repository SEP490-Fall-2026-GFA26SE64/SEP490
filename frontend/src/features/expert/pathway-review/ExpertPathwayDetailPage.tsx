import { useId, useRef, useState, type DragEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { checkReview, prepareReviewCommand, readReviewDetail, sendPathwayCommand, PathwayError, type PendingPathwayCommand, type ReviewDetail, type ReviewAction, type TeachingTarget } from '../../../shared/api/initialPathway'
import { useInitialPathwaySession } from '../../../shared/hooks/useInitialPathwaySession'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { InitialGapTable } from '../../../shared/components/InitialGapTable'
import { InitialPathwayFeedback } from '../../../shared/components/InitialPathwayFeedback'
import { pathwayDiagnostic, pathwayMessage, reviewLearnerName } from '../../../shared/api/initialPathwayMessages'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader } from '../../../shared/components/ui/Card'
import { Dialog, DialogBody, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../shared/components/ui/Dialog'
import { Input } from '../../../shared/components/ui/Input'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { ArrowLeft, BookOpen, CheckCircle2, ChevronDown, ChevronUp, GripVertical, MinusCircle, Plus, RefreshCw, Search, Trash2, User } from 'lucide-react'
import { InitialTeachingDetails } from '../../../shared/components/InitialTeachingDetails'
import { Heading } from '../../../shared/components/typography/Heading'
import { Combobox } from '../../../shared/components/ui/Combobox'
import { ReviewValidation } from './ReviewValidation'
import { ReviewPathwayPreview } from './ReviewPathwayPreview'

export function ExpertPathwayDetailPage() {
  const session = useInitialPathwaySession(), { pathwayId = '' } = useParams<{ pathwayId: string }>(), { t } = useTranslation()
  return <WorkspaceLayout>{session.scope && session.data?.role === 'DOMAIN_EXPERT' ? <Review key={session.scope + pathwayId} scope={session.scope} id={pathwayId} /> : session.isPending ? <LoadingCard label={t('initialPathway.loading')} /> : <InitialPathwayFeedback error={session.error ?? new PathwayError('FORBIDDEN', 403)} onRetry={() => void session.refetch()} />}</WorkspaceLayout>
}
function Review({ scope, id }: { scope: string; id: string }) {
  const [orderWarningOpen, setOrderWarningOpen] = useState(false)
  const { t, language } = useTranslation(), tr = (key: string) => t('initialPathway.' + key), ui = (key: string) => tr('reviewUi.' + key), client = useQueryClient()
  const detail = useQuery({ queryKey: ['initialPathway', scope, 'review', id], queryFn: ({ signal }) => readReviewDetail(id, signal), retry: false, gcTime: 0, refetchOnWindowFocus: false })
  const [pending, setPending] = useState<PendingPathwayCommand | null>(null), [approval, setApproval] = useState<{ command: PendingPathwayCommand; detail: ReviewDetail } | null>(null)
  const [validationOpen, setValidationOpen] = useState(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState<PathwayError | null>(null), [reason, setReason] = useState('')
  const [checkResult, setCheckResult] = useState<{ hash: string; status: string; diagnostics: string[] } | null>(null)
  const lock = useRef(false), committed = useRef(false), d = detail.data
  const checked = checkResult?.hash === d?.summary.contentHash ? checkResult?.status : null
  const blocked = busy || pending !== null, editable = d?.summary.reviewStatus === 'AWAITING_EXPERT_REVIEW'
  async function reconcile() { const latest = await readReviewDetail(id); client.setQueryData(['initialPathway', scope, 'review', id], latest); return latest }
  function acceptCheck(snapshot: ReviewDetail, result: Awaited<ReturnType<typeof checkReview>>, showIssues: boolean) {
    const status = result.revisionContentHash === snapshot.summary.contentHash ? result.validationStatus : 'STALE'
    setCheckResult({ hash: snapshot.summary.contentHash, status, diagnostics: result.diagnostics })
    if (showIssues) setValidationOpen(status !== 'VALID')
    return status === 'VALID'
  }
  async function submit(command: PendingPathwayCommand) {
    if (lock.current) return
    lock.current = true; setBusy(true); setPending(command); setError(null); setCheckResult(null)
    try {
      if (!committed.current) { await sendPathwayCommand(command); committed.current = true }
      const latest = await reconcile()
      void client.invalidateQueries({ queryKey: ['initialPathway', scope, 'reviewQueue'] })
      setPending(null); setApproval(null); setCheckResult(null); committed.current = false
      if (latest.summary.reviewStatus === 'AWAITING_EXPERT_REVIEW') {
        // A failed check must not turn a committed Include into an uncertain command/replay.
        try { acceptCheck(latest, await checkReview(id), true) }
        catch (cause) { setError(cause instanceof PathwayError ? cause : new PathwayError('NETWORK_ERROR')); setValidationOpen(true) }
      }
    } catch (cause) {
      const failure = cause instanceof PathwayError ? cause : new PathwayError('NETWORK_ERROR'); setError(failure)
      if (failure.code === 'PREREQUISITE_ORDER_VIOLATION') setOrderWarningOpen(true)
      if (!failure.ambiguous && !committed.current) { setPending(null); setApproval(null); void detail.refetch() }
    } finally { lock.current = false; setBusy(false) }
  }
  async function validate() {
    if (lock.current || !d) return
    lock.current = true; setBusy(true); setError(null); setCheckResult(null)
    try {
      const result = await checkReview(id)
      // The server checks its current revision. Reload the large detail only on a hash change.
      const snapshot = result.revisionContentHash === d.summary.contentHash ? d : await reconcile()
      acceptCheck(snapshot, result, true)
    }
    catch (cause) { setError(cause instanceof PathwayError ? cause : new PathwayError('NETWORK_ERROR')); setValidationOpen(true) }
    finally { lock.current = false; setBusy(false) }
  }
  async function preview() {
    if (lock.current || checked !== 'VALID' || !d) return
    lock.current = true; setBusy(true); setError(null)
    try {
      const latest = await reconcile()
      const unchanged = latest.summary.contentHash === d.summary.contentHash && latest.summary.revision === d.summary.revision
      const valid = acceptCheck(latest, await checkReview(id), true)
      if (!unchanged) { setError(new PathwayError('STALE_REVISION', 409)); return }
      if (valid && latest.summary.reviewStatus === 'AWAITING_EXPERT_REVIEW') setApproval({ command: prepareReviewCommand(id, latest, 'confirmation'), detail: latest })
    } catch (cause) { setCheckResult(null); setError(cause instanceof PathwayError ? cause : new PathwayError('NETWORK_ERROR')); setValidationOpen(true) }
    finally { lock.current = false; setBusy(false) }
  }
  const totals = d?.revision.plan.quality
  const issues = checked !== null ? checkResult?.diagnostics ?? [] : d?.revision.plan.diagnostics ?? []
  const issueMessages = [...new Set(issues.map(issue => {
    const labels = issue.split(':').slice(1).map(ref => d?.gaps.skills.find(skill => skill.skillId === ref)?.name ?? ref)
    return [pathwayDiagnostic(issue, t), ...labels].join(' · ')
  }))]
  return <div className="min-w-0 space-y-5 pb-8">
    <h1 className="sr-only">{tr('reviewTitle')}</h1>
    {detail.isPending && <LoadingCard label={tr('loading')} />}
    {detail.isError && <InitialPathwayFeedback error={detail.error} onRetry={() => void detail.refetch()} busy={detail.isFetching} />}
    {error && error.code !== 'PREREQUISITE_ORDER_VIOLATION' && <InitialPathwayFeedback error={error} onRetry={() => { if (pending) void submit(pending); else void detail.refetch() }} busy={busy} />}
    {pending && <Text role="status">{tr(busy ? 'savingMembership' : 'uncertain')}</Text>}
    {d && !detail.isError && <>
      <Card><CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex min-w-0 items-center gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><User className="size-5" /></div><div className="min-w-0"><Text variant="caption">{ui('employee')}</Text><Text className="break-words font-semibold">{reviewLearnerName(d.summary, t)}</Text></div></div>
        <div className="min-w-0"><Text variant="caption">{tr('targetRole')}</Text><Text className="break-words font-semibold">{d.summary.roleName}</Text></div>
        <div><Text variant="caption">{tr('level')}</Text><Badge variant="outline" className="mt-1 whitespace-normal">{d.summary.levelName}</Badge></div>
        <div><Text variant="caption">{tr('reviewRevision')}</Text><Text className="font-semibold">{d.summary.revision}</Text></div>
      </CardContent></Card>
      <PathwayModules detail={d} disabled={blocked || !editable || approval !== null} onEdit={(action, moduleId) => { void submit(prepareReviewCommand(id, d, action, moduleId, reason)) }} />
      <Card className="border-primary/40"><CardContent className="space-y-4 p-4" aria-busy={busy}>
        {editable && <div aria-live="polite" role="status" className={`space-y-1 rounded-lg border-l-4 p-3 ${blocked ? 'border-primary bg-secondary/40' : error || checked && checked !== 'VALID' ? 'border-destructive bg-destructive/5' : checked === 'VALID' ? 'border-success bg-success/5' : 'border-primary bg-secondary/40'}`}>
          <Text className="font-semibold">{pending && !busy ? tr('uncertain') : tr('reviewFlow.' + (busy ? 'checking' : error ? 'checkFailed' : checked === 'VALID' ? 'valid' : checked ? 'invalid' : 'checkNeeded'))}</Text>
          {!blocked && issueMessages.map(message => <Text key={message} variant="body-sm">{message}</Text>)}
          {checked === 'STALE' && <Text variant="body-sm">{tr('stale')}</Text>}
          {checked === 'VALID' && <Text variant="caption">{tr('reviewFlow.readyHelp')}</Text>}
        </div>}
        <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="min-w-0 flex-1 basis-72 space-y-1"><Text as="span" variant="caption">{tr('reason')}</Text><Input value={reason} maxLength={2000} disabled={blocked || !editable || approval !== null} onChange={e => setReason(e.target.value)} /></label>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge variant={d.summary.reviewStatus === 'APPROVED' ? 'success' : 'warning'} className="w-max shrink-0 whitespace-nowrap px-3 py-1 text-[length:var(--text-caption)] leading-normal">{d.summary.reviewStatus === 'APPROVED' ? tr('approved') : tr('awaiting')}</Badge>
          <Link to="/expert/pathway-review" className={buttonVariants({ variant: 'ghost', size: 'sm' })}><ArrowLeft className="mr-1.5 size-4" />{tr('back')}</Link>
          <Button className="h-auto min-h-10 max-w-full whitespace-normal [&>span]:whitespace-normal sm:min-h-8" variant="outline" size="sm" disabled={blocked || approval !== null} isLoading={busy && !pending} onClick={() => void validate()}><RefreshCw className="size-4 shrink-0" />{tr('check')}</Button>
          <Button className="h-auto min-h-10 max-w-full whitespace-normal [&>span]:whitespace-normal sm:min-h-8" size="sm" disabled={blocked || !editable || approval !== null || checked !== 'VALID' || error !== null} onClick={() => void preview()}><CheckCircle2 className="size-4 shrink-0" />{tr('approve')}</Button>
        </div>
        </div>
      </CardContent></Card>
      <details className="rounded-lg border border-border bg-card p-4"><summary className="cursor-pointer text-body-sm font-semibold">{ui('reviewDetails')}</summary><div className="mt-4 space-y-4">
        {totals && <div className="flex flex-wrap gap-6"><Text variant="body-sm">{tr('moduleCount')}: {totals.moduleCount}</Text><Text variant="body-sm">{tr('totalDuration')}: {totals.durationMinutes.toLocaleString(language)} {tr('duration')}</Text><Text variant="body-sm">{tr('totalPrice')}: {totals.priceVnd.toLocaleString(language)} {tr('price')}</Text></div>}
        <InitialGapTable result={d.gaps} />
      </div></details>
    </>}
    <Dialog open={orderWarningOpen} onOpenChange={setOrderWarningOpen} ariaLabel={ui('orderBlocked')} closeLabel={tr('display.close')}>
      <DialogHeader><DialogTitle>{ui('orderBlocked')}</DialogTitle><DialogDescription>{ui('orderUnchanged')}</DialogDescription></DialogHeader>
      <DialogBody><ul className="space-y-3">{error?.diagnostics.map(diagnostic => {
        const [, provider, dependent, skill] = diagnostic.split(':')
        const title = (id: string | undefined) => d?.revision.plan.modules.find(m => m.id === id)?.title ?? id ?? '—'
        return <li key={diagnostic}><Text variant="body-sm">{ui('orderRequired').replace('{before}', title(provider)).replace('{after}', title(dependent)).replace('{skill}', d?.gaps.skills.find(s => s.skillId === skill)?.name ?? skill ?? '—')}</Text></li>
      })}</ul></DialogBody>
      <DialogFooter><Button onClick={() => setOrderWarningOpen(false)}>{tr('display.close')}</Button></DialogFooter>
    </Dialog>
    <Dialog open={validationOpen} size="wide" className="border-2 border-primary/40" onOpenChange={open => { if (!blocked) setValidationOpen(open) }} ariaLabel={tr('reviewFlow.checkTitle')} closeLabel={tr('display.close')}>
      <DialogHeader><DialogTitle>{tr('reviewFlow.checkTitle')}</DialogTitle><DialogDescription>{d?.summary.roleName} · {d?.summary.levelName} · {tr('reviewRevision')} {d?.summary.revision}</DialogDescription></DialogHeader>
      <DialogBody className="space-y-4">
        {blocked && <Text role="status">{tr('savingMembership')}</Text>}
        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4" role="alert"><Text>{tr(pending ? 'uncertain' : 'reviewFlow.checkFailed')}</Text><Text variant="body-sm">{error.code === 'MODULE_NOT_ELIGIBLE' ? tr('moduleNotEligible') : pathwayMessage(error, t)}</Text></div>}
        {!error && checked === 'STALE' && <Text role="status">{tr('stale')}</Text>}
        {d && !error && checked !== 'STALE' && <ReviewValidation detail={d} diagnostics={issues} disabled={blocked} onInclude={moduleId => { void submit(prepareReviewCommand(id, d, 'inclusions', moduleId, reason)) }} />}
      </DialogBody>
      <DialogFooter><Button variant="outline" disabled={blocked} onClick={() => setValidationOpen(false)}>{tr('display.close')}</Button>{pending ? <Button disabled={busy} onClick={() => void submit(pending)}>{tr('retryExact')}</Button> : <Button disabled={blocked} onClick={() => void validate()}>{tr('check')}</Button>}</DialogFooter>
    </Dialog>
    <Dialog open={approval !== null} size="wide" className="border-2 border-primary/40" onOpenChange={open => { if (!open && !blocked) setApproval(null) }} ariaLabel={tr('reviewFlow.previewTitle')} closeLabel={tr('reviewFlow.backToEdit')}>
      <DialogHeader><DialogTitle>{tr('reviewFlow.previewTitle')}</DialogTitle><DialogDescription>{tr('approveDescription')}</DialogDescription></DialogHeader>
      <DialogBody className="space-y-4">{error && <Text role="alert">{pathwayMessage(error, t)}</Text>}{approval && <ReviewPathwayPreview detail={approval.detail} />}</DialogBody>
      <DialogFooter><Button variant="outline" disabled={blocked} onClick={() => setApproval(null)}>{tr('reviewFlow.backToEdit')}</Button><Button isLoading={busy} onClick={() => { const command = pending ?? approval?.command; if (command) void submit(command) }}>{tr(pending ? 'retryExact' : 'reviewFlow.finalConfirm')}</Button></DialogFooter>
    </Dialog>
  </div>
}


type Zone = 'catalog' | 'included' | 'excluded'
type Row = { id: string; title: string; durationMinutes?: number; priceVnd?: number; targets: TeachingTarget[]; eligible: boolean; ordinal?: number; reason?: string }
type Props = { detail: ReviewDetail; disabled: boolean; onEdit: (action: Exclude<ReviewAction, 'confirmation'>, moduleId: string) => void }

/** Gestures express membership intent. Persisted order and every saved move come from the server. */
function PathwayModules({ detail, disabled, onEdit }: Props) {
  const { t, language } = useTranslation(), tr = (key: string) => t('initialPathway.' + key), hintId = useId()
  const [search, setSearch] = useState(''), [filter, setFilter] = useState('ALL:ALL')
  const [focus, difficulty] = filter.split(':')
  const ui = (key: string) => tr('reviewUi.' + key)
  const [dragged, setDragged] = useState<{ id: string; from: Zone; hash: string } | null>(null)
  const [over, setOver] = useState<Zone | null>(null)
  const skillNames = new Map(detail.gaps.skills.map(skill => [skill.skillId, skill.name]))
  const candidates = new Map<string, Row>()
  for (const pair of detail.candidates) {
    const row: Row = candidates.get(pair.moduleId) ?? { id: pair.moduleId, title: pair.title, durationMinutes: pair.durationMinutes, priceVnd: pair.priceVnd, targets: [], eligible: false }
    row.targets.push(pair)
    row.eligible ||= pair.preferredDifficulty !== null && pair.teachingFocus !== 'INCIDENTAL'
    candidates.set(row.id, row)
  }
  const selected = new Set(detail.revision.selectedModules), lastOverrides = new Map(detail.revision.overrides.map(o => [o.moduleId, o]))
  const excluded: Row[] = [...lastOverrides.values()].filter(o => o.action === 'EXCLUDE' && !selected.has(o.moduleId)).map(o => ({
    ...(candidates.get(o.moduleId) ?? { id: o.moduleId, title: tr('state.UNAVAILABLE'), targets: [], eligible: false }), reason: o.reason,
  }))
  const excludedIds = new Set(excluded.map(row => row.id))
  const included = detail.revision.selectedModules.map<Row>(id => {
    const module = detail.revision.plan.modules.find(m => m.id === id)
    return module ? { ...module, eligible: true } : candidates.get(id) ?? { id, title: tr('state.UNAVAILABLE'), targets: [], eligible: false }
  }).sort((a, b) => (a.ordinal ?? Number.MAX_SAFE_INTEGER) - (b.ordinal ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id))
  const available = [...candidates.values()].filter(row => row.eligible && !selected.has(row.id) && !excludedIds.has(row.id))
  const catalog = available.filter(row => `${row.title} ${row.id} ${row.targets.map(pair => `${pair.skillId} ${skillNames.get(pair.skillId) ?? ''}`).join(' ')}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    .filter(row => row.targets.some(pair => (focus === 'ALL' || pair.teachingFocus === focus) && (difficulty === 'ALL' || pair.difficultyLevel === difficulty)))
  const sourceStillValid = dragged && (dragged.from === 'included' ? selected.has(dragged.id) : candidates.get(dragged.id)?.eligible && !selected.has(dragged.id))
  const currentDrag = !disabled && sourceStillValid && dragged?.hash === detail.summary.contentHash ? dragged : null
  const canDrop = (zone: Zone) => Boolean(currentDrag && (zone === 'included' && currentDrag.from !== 'included' || zone === 'excluded' && currentDrag.from === 'included'))
  function start(event: DragEvent, row: Row, from: Zone) {
    if (disabled || from !== 'included' && !row.eligible) { event.preventDefault(); return }
    event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', row.id)
    setDragged({ id: row.id, from, hash: detail.summary.contentHash })
  }
  function drop(event: DragEvent, zone: Zone) {
    event.preventDefault(); event.stopPropagation()
    if (canDrop(zone) && currentDrag && event.dataTransfer.getData('text/plain') === currentDrag.id) onEdit(zone === 'included' ? 'inclusions' : 'exclusions', currentDrag.id)
    setDragged(null); setOver(null)
  }
  function list(zone: 'included' | 'excluded', rows: Row[]) {
    const accepts = canDrop(zone), minutes = rows.every(row => row.durationMinutes !== undefined) ? rows.reduce((sum, row) => sum + row.durationMinutes!, 0) : null
    return <div className="grid min-w-0 grid-rows-[auto_1fr] gap-3 lg:row-span-2 lg:grid-rows-subgrid">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2"><Heading level={2} size="card" className="min-w-0 break-words">{ui(zone === 'included' ? 'learningModules' : 'excludedModules')}</Heading><Badge variant={zone === 'included' ? 'primary' : 'outline'} className="max-w-full whitespace-normal break-words font-mono">{rows.length} {ui(zone === 'included' ? 'includedCount' : 'excludedCount')} · {minutes === null ? '—' : (minutes / 60).toLocaleString(language, { maximumFractionDigits: 2 })} {ui('hours')}</Badge>
          {zone === 'included' && <Text variant="caption" className="ml-auto font-semibold text-primary">{ui('activeCurriculum')}</Text>}
        </div>
        <Text variant="caption" className="break-words">{tr(zone === 'included' ? 'includedDropHint' : 'excludedDropHint')}</Text>
      </div>
      <section aria-label={ui(zone === 'included' ? 'learningModules' : 'excludedModules')} aria-describedby={hintId}
        className={`flex min-h-64 min-w-0 flex-col rounded-xl border p-1.5 shadow-2xs transition-colors lg:min-h-[380px] ${zone === 'excluded' ? 'border-dashed bg-card/60' : 'bg-card'} ${over === zone && accepts ? 'border-primary bg-secondary ring-2 ring-primary/20' : 'border-border'}`}
        onDragOver={event => { if (accepts) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setOver(zone) } }}
        onDragLeave={event => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setOver(null) }} onDrop={event => drop(event, zone)}>
        {rows.length === 0 ? <div className="flex min-h-64 flex-1 items-center justify-center p-6 text-center"><Text variant="body-sm">{tr(zone === 'included' ? 'noModules' : 'noExcluded')}</Text></div> : <ol className="min-w-0 space-y-1">{rows.map((row, index) => moduleRow(row, zone, index))}</ol>}
      </section>
    </div>
  }
  function moduleRow(row: Row, zone: Zone, index: number) {
    const movable = !disabled && (zone === 'included' || row.eligible)
    return <li key={row.id} draggable={movable} onDragStart={event => start(event, row, zone)} onDragEnd={() => { setDragged(null); setOver(null) }} className={currentDrag?.id === row.id ? 'opacity-40' : undefined}>
      <ReviewModuleRow row={row} zone={zone} step={index + 1} skillNames={skillNames} movable={movable} disabled={disabled || zone !== 'included' && !row.eligible} onAction={() => onEdit(zone === 'included' ? 'exclusions' : 'inclusions', row.id)}
        onMoveUp={!disabled && import.meta.env.VITE_LOCAL_BASELINE_DEMO_ENABLED !== 'true' && index > 0 ? () => onEdit('move-up', row.id) : undefined}
        onMoveDown={!disabled && import.meta.env.VITE_LOCAL_BASELINE_DEMO_ENABLED !== 'true' && index < included.length - 1 ? () => onEdit('move-down', row.id) : undefined}
        onRemove={!disabled && import.meta.env.VITE_LOCAL_BASELINE_DEMO_ENABLED !== 'true' ? () => onEdit('removals', row.id) : undefined} />
    </li>
  }
  return <div className="min-w-0 space-y-6">
    <Text id={hintId} className="sr-only">{tr(disabled ? 'reviewReadOnly' : 'dragMembershipHint')}</Text>
    <Card className="min-w-0">
      <CardHeader className="rounded-t-lg border-b border-border bg-muted/30 px-4 py-3"><div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2"><BookOpen className="size-4 shrink-0 text-primary" /><Heading level={2} size="card">{ui('catalogTitle')}</Heading><Text variant="caption">({available.length} {ui('available')}) · {tr(disabled ? 'reviewReadOnly' : 'includedDropHint')}</Text></div>
        <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:w-112 xl:shrink-0"><div className="min-w-0"><Input className="h-10 min-w-0" leftIcon={<Search className="size-4" />} aria-label={tr('searchModules')} placeholder={ui('catalogSearch')} value={search} onChange={event => setSearch(event.target.value)} /></div><div className="min-w-0" role="group" aria-label={ui('teachingFilter')}><Combobox clearable={false} wrapOptions value={filter} onChange={setFilter} options={['ALL', 'PRIMARY', 'SUPPORTING', 'INCIDENTAL'].flatMap(focus => ['ALL', 'LOW', 'MEDIUM', 'HIGH'].map(difficulty => ({ value: `${focus}:${difficulty}`, label: `${tr(focus === 'ALL' ? 'allFocus' : 'focus.' + focus)} · ${tr(difficulty === 'ALL' ? 'allDifficulties' : 'difficulty.' + difficulty)}` })))} /></div></div>
      </div></CardHeader>
      <CardContent className="p-3"><div className="max-h-80 overflow-y-auto overscroll-contain rounded-lg border border-border bg-background shadow-2xs scrollbar-hidden sm:max-h-52" tabIndex={0} role="region" aria-label={ui('catalogTitle')}>
        {catalog.length === 0 ? <Text variant="body-sm" className="p-5 text-center">{tr(search.trim() || filter !== 'ALL:ALL' ? 'noSearchResults' : 'noAlternatives')}</Text> : <ol className="divide-y divide-border">{catalog.map((row, index) => moduleRow(row, 'catalog', index))}</ol>}
      </div></CardContent>
    </Card>
    <div className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-6 lg:grid-cols-2 lg:gap-y-3">{list('included', included)}{list('excluded', excluded)}</div>
  </div>
}

/** Existing row composition, with server-persisted membership and adjacent-order commands. */
function ReviewModuleRow({ row, zone, step, skillNames, movable, disabled, onAction, onMoveUp, onMoveDown, onRemove }: { row: Row; zone: Zone; step: number; skillNames: ReadonlyMap<string, string>; movable: boolean; disabled: boolean; onAction: () => void; onMoveUp?: () => void; onMoveDown?: () => void; onRemove?: () => void }) {
  const { t, language } = useTranslation(), tr = (key: string) => t('initialPathway.' + key), ui = (key: string) => tr('reviewUi.' + key)
  const [expanded, setExpanded] = useState(false), detailsId = useId(), primary = row.targets.find(pair => pair.teachingFocus === 'PRIMARY') ?? row.targets[0]
  return <div className={`@container group min-w-0 rounded-lg px-3 py-4 transition-colors ${zone === 'excluded' ? 'bg-muted/30' : 'hover:bg-muted/20'} ${movable ? 'cursor-grab active:cursor-grabbing' : ''}`}>
    <div className="flex flex-wrap items-center gap-3 @lg:flex-nowrap">
      <GripVertical aria-hidden="true" className={`size-4 shrink-0 text-muted-foreground ${movable ? 'group-hover:text-primary' : 'opacity-40'}`} />
      {zone === 'included' && <div className="flex shrink-0 flex-col" title={ui('serverOrder')}><Button variant="ghost" size="icon" className="size-6" disabled={!onMoveUp} onClick={onMoveUp} aria-label={ui('moveUp')}><ChevronUp className="size-4" /></Button><Button variant="ghost" size="icon" className="size-6" disabled={!onMoveDown} onClick={onMoveDown} aria-label={ui('moveDown')}><ChevronDown className="size-4" /></Button></div>}
      <div className="min-w-0 flex-1 basis-40 space-y-2 @lg:basis-0">
        {zone !== 'catalog' && <Badge variant={zone === 'excluded' ? 'destructive' : 'secondary'}>{zone === 'excluded' ? ui('excludedBadge') : `${ui('step')} ${step}`}</Badge>}
        <div className="flex min-w-0 flex-wrap items-center gap-2"><button type="button" className={`min-w-0 max-w-full whitespace-normal break-words rounded text-left text-[length:var(--text-card)] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring @lg:truncate ${zone === 'excluded' ? 'text-muted-foreground line-through' : 'text-foreground hover:text-primary'}`} title={row.title} aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded(value => !value)}>{row.title}</button>
          {zone === 'catalog' && <Badge variant="outline" className="max-w-full whitespace-normal break-all font-mono">{row.id}</Badge>}
          {zone === 'catalog' && primary && <Badge variant="secondary" className="max-w-full whitespace-normal">{skillNames.get(primary.skillId) ?? primary.skillId}</Badge>}
          {row.targets.some(pair => pair.expertAttention) && <Badge variant="warning">{tr('expertAttention')}</Badge>}
        </div>
        {zone !== 'catalog' && <div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="max-w-full whitespace-normal break-all font-mono">{row.id}</Badge>{primary && <Text as="span" variant="caption" className="min-w-0 break-words rounded bg-muted px-2 py-1">{skillNames.get(primary.skillId) ?? primary.skillId}</Text>}</div>}
        <Text variant="caption" className="line-clamp-2 break-words">{row.reason || (primary ? `${skillNames.get(primary.skillId) ?? primary.skillId}${primary.difficultyLevel ? ' · ' + tr('difficulty.' + primary.difficultyLevel) : ''}` : tr('moduleNotEligible'))}{row.durationMinutes !== undefined && <> · <strong className="text-foreground">{(row.durationMinutes / 60).toLocaleString(language, { maximumFractionDigits: 2 })} {ui('hours')}</strong></>}</Text>
      </div>
      <div className="ml-auto flex w-full min-w-0 flex-wrap items-center justify-end gap-2 @lg:w-auto @lg:shrink-0 @lg:flex-nowrap">
        <Button variant="outline" size="sm" className={`h-auto min-h-10 max-w-full whitespace-normal [&>span]:whitespace-normal @lg:min-h-8 ${zone === 'included' ? 'text-muted-foreground' : 'border-primary/30 text-primary hover:bg-secondary'}`} disabled={disabled} onClick={onAction}>{zone === 'included' ? <MinusCircle className="size-4 shrink-0 text-destructive" /> : <Plus className="size-4 shrink-0" />}{zone === 'catalog' ? ui('addToPathway') : tr(zone === 'included' ? 'exclude' : 'include')}</Button>
        {zone === 'catalog' ? <span className="min-w-0 max-w-full" title={ui('preemptiveUnavailable')}><Button variant="outline" size="sm" className="h-auto min-h-10 max-w-full whitespace-normal text-muted-foreground [&>span]:whitespace-normal @lg:min-h-8" disabled><MinusCircle className="size-4 shrink-0" />{ui('addToExclude')}</Button></span> : <span title={ui('returnCatalog')}><Button variant="ghost" size="icon" className="size-8 text-muted-foreground" disabled={!onRemove} onClick={onRemove} aria-label={ui('removeModule')}><Trash2 className="size-4" /></Button></span>}
      </div>
    </div>
    {expanded && <div id={detailsId} className="ml-7 mt-4 space-y-3 border-t border-border pt-3"><Heading level={3} size="card" className="break-words">{row.title}</Heading>
      {row.durationMinutes !== undefined && row.priceVnd !== undefined && <Text variant="caption">{row.durationMinutes.toLocaleString(language)} {tr('duration')} · {row.priceVnd.toLocaleString(language)} {tr('price')}</Text>}
      {!row.eligible && <Text variant="caption">{tr('moduleNotEligible')}</Text>}
      {row.reason && <Text variant="body-sm" className="break-words">{tr('exclusionReason')}: {row.reason}</Text>}
      <InitialTeachingDetails targets={row.targets} skillNames={skillNames} />
    </div>}
  </div>
}
