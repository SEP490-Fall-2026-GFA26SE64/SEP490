import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowLeft, Compass, Eye, RefreshCw, Search, User } from 'lucide-react'
import { PathwayError, sendPathwayCommand, type PendingPathwayCommand } from '../../../shared/api/initialPathway'
import { readRuleReview, readRuleReviewQueue, ruleReviewCommand, type RuleStep } from '../../../shared/api/requirementPathway'
import { useInitialPathwaySession } from '../../../shared/hooks/useInitialPathwaySession'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { InitialPathwayFeedback } from '../../../shared/components/InitialPathwayFeedback'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { Input } from '../../../shared/components/ui/Input'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { RequirementModuleEditor } from './RequirementModuleEditor'

export function RequirementPathwayReviewQueue() {
  const { t } = useTranslation(), session = useInitialPathwaySession(), authorized = session.data?.role === 'DOMAIN_EXPERT'
  const [offset, setOffset] = useState(0), [search, setSearch] = useState('')
  const query = useQuery({ queryKey: ['initialPathway', session.scope, 'ruleReviewQueue', offset], queryFn: ({ signal }) => readRuleReviewQueue(offset, signal), enabled: Boolean(session.scope && authorized), retry: false, gcTime: 0 })
  const items = authorized ? query.data ?? [] : [], rows = items.filter(row => `${row.learnerName} ${row.roleName} ${row.levelName}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  const error = session.error ?? (session.data && !authorized ? new PathwayError('FORBIDDEN', 403) : query.error)
  return <WorkspaceLayout><div className="min-w-0 space-y-6 pb-16"><h1 className="sr-only">{t('initialPathway.reviewTitle')}</h1>
    {(session.isPending || authorized && query.isPending) && <LoadingCard label={t('initialPathway.loading')} />}
    {error && <InitialPathwayFeedback error={error} onRetry={() => { void session.refetch(); void query.refetch() }} />}
    {!error && query.data && <><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
      [t('initialPathway.awaiting'), items.filter(row => row.reviewStatus === 'AWAITING_EXPERT_REVIEW').length],
      [t('initialPathway.reviewUi.approvedPathways'), items.filter(row => row.reviewStatus === 'APPROVED').length],
      [t('initialPathway.state.GENERATING'), items.filter(row => row.revision === null).length],
      [t('initialPathway.reviewUi.totalInQueue'), items.length],
    ].map(([title, value]) => <StatCard key={title} variant="gradient" className="min-w-0" icon={<Compass className="size-4 text-primary" />} title={String(title)} value={String(value)} description={t('initialPathway.reviewUi.assignedOnPage')} />)}</div>
      <Card className="min-w-0"><CardHeader><div className="flex flex-wrap items-center justify-between gap-4"><div><CardTitle className="flex items-center gap-2"><Compass className="size-4 text-primary" />{t('initialPathway.reviewUi.queueTitle')}</CardTitle><CardDescription>{t('initialPathway.reviewDescription')}</CardDescription></div><div className="flex w-full min-w-0 gap-2 sm:w-80"><Input leftIcon={<Search className="size-4" />} aria-label={t('initialPathway.reviewSearch')} placeholder={t('initialPathway.reviewSearch')} value={search} onChange={event => setSearch(event.target.value)} /><Button variant="ghost" size="icon" aria-label={t('initialPathway.refresh')} disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className="size-4" /></Button></div></div></CardHeader>
      <CardContent className="p-0"><div className="overflow-x-auto scrollbar-hidden"><table className="w-full min-w-180 text-left text-body-sm"><thead className="border-y border-border bg-muted/40 text-caption uppercase text-muted-foreground"><tr>{['employee', 'targetRole', 'reviewVersion', 'status', 'actions'].map(key => <th key={key} scope="col" className="px-4 py-3 font-semibold">{t('initialPathway.reviewUi.' + key)}</th>)}</tr></thead><tbody className="divide-y divide-border">{rows.length === 0 ? <tr><td colSpan={5}><EmptyState bordered={false} title={t('initialPathway.noAssignments')} /></td></tr> : rows.map(row => <tr key={row.requestId} className="hover:bg-muted/20"><th scope="row" className="break-words px-4 py-4 font-semibold">{row.learnerName}</th><td className="px-4 py-4"><Text className="font-semibold">{row.roleName}</Text><Text variant="caption">{row.levelName}</Text></td><td className="px-4 py-4">{row.revision ?? '—'}</td><td className="px-4 py-4"><Badge variant={row.reviewStatus === 'APPROVED' ? 'success' : 'warning'}>{t('initialPathway.state.' + (row.revision === null ? row.generationStatus : row.reviewStatus))}</Badge></td><td className="px-4 py-4"><Link className={buttonVariants({ variant: 'outline', size: 'sm' })} to={'/expert/pathway-review/' + encodeURIComponent(row.requestId)}><Eye className="mr-2 size-4 text-primary" />{t('initialPathway.reviewUi.review')}</Link></td></tr>)}</tbody></table></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3"><Button variant="outline" size="sm" disabled={!offset || query.isFetching} onClick={() => setOffset(value => Math.max(0, value - 20))}>{t('initialPathway.previous')}</Button><Text variant="caption">{t('initialPathway.reviewUi.page')} {offset / 20 + 1}</Text><Button variant="outline" size="sm" disabled={items.length < 20 || query.isFetching} onClick={() => setOffset(value => value + 20)}>{t('initialPathway.next')}</Button></div></CardContent></Card>
    </>}
  </div></WorkspaceLayout>
}
export function RequirementPathwayReviewDetail({ scope, id }: { scope: string; id: string }) {
  const { t } = useTranslation(), client = useQueryClient(), [editorDirty, setEditorDirty] = useState(false)
  const query = useQuery({ refetchOnWindowFocus: false, refetchOnReconnect: false, queryKey: ['initialPathway', scope, 'ruleReview', id], queryFn: ({ signal }) => readRuleReview(id, signal), retry: false, gcTime: 0 })
  const [pending, setPending] = useState<PendingPathwayCommand | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<PathwayError | null>(null)
  const [bypass, setBypass] = useState<RuleStep | null>(null), [reason, setReason] = useState(''), [rejecting, setRejecting] = useState(false), [approval, setApproval] = useState<PendingPathwayCommand | null>(null)
  const lock = useRef(false), committed = useRef(false), d = query.data
  async function send(command: PendingPathwayCommand) {
    if (lock.current) return
    lock.current = true; setBusy(true); setError(null); setPending(command)
    try {
      if (!committed.current) { await sendPathwayCommand(command); committed.current = true }
      const latest = await readRuleReview(id); client.setQueryData(['initialPathway', scope, 'ruleReview', id], latest)
      await client.invalidateQueries({ queryKey: ['initialPathway', scope, 'ruleReviewQueue'] })
      setPending(null); setBypass(null); setRejecting(false); setApproval(null); setReason(''); committed.current = false
    } catch (cause) { const failure = cause instanceof PathwayError ? cause : new PathwayError('NETWORK_ERROR'); setError(failure); if (!failure.ambiguous && !committed.current) { setPending(null); setApproval(null); if (!command.path.endsWith('/module-selection')) void query.refetch() } }
    finally { lock.current = false; setBusy(false) }
  }
  const blocked = busy || Boolean(pending)
  return <div className="min-w-0 space-y-5 pb-8"><h1 className="sr-only">{t('initialPathway.reviewTitle')}</h1><Link className={buttonVariants({ variant: 'ghost', size: 'sm' })} to="/expert/pathway-review" onClick={event => { if (blocked || editorDirty && !window.confirm(t("moduleReview.discardConfirm"))) event.preventDefault() }}><ArrowLeft className="mr-2 size-4" />{t('initialPathway.reviewTitle')}</Link>
    {query.isPending && <LoadingCard label={t('initialPathway.loading')} />}{(error || query.error) && <InitialPathwayFeedback error={error ?? query.error} busy={busy} onRetry={() => { if (pending) void send(pending); else if (!editorDirty || window.confirm(t("moduleReview.discardConfirm"))) void query.refetch() }} />}
    {pending && <Text role="status">{t('initialPathway.uncertain')}</Text>}
    {d && !query.isError && <><Card><CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4"><div className="flex items-center gap-3"><User className="size-5 text-primary" /><div><Text variant="caption">{t('initialPathway.reviewUi.employee')}</Text><Text className="font-semibold">{d.status.learnerName}</Text></div></div><div><Text variant="caption">{t('initialPathway.targetRole')}</Text><Text className="font-semibold">{d.status.roleName}</Text></div><div><Text variant="caption">{t('initialPathway.level')}</Text><Badge variant="outline">{d.status.levelName}</Badge></div><div><Text variant="caption">{t('initialPathway.reviewRevision')}</Text><Text>{d.status.revision ?? '—'}</Text></div></CardContent></Card>
      {!d.archived && d.status.reviewStatus === 'AWAITING_EXPERT_REVIEW' && <Button variant="destructive" disabled={blocked || editorDirty} onClick={() => { setRejecting(true); setReason('') }}>{t('moduleReview.reject')}</Button>}
      <RequirementModuleEditor key={id + ":" + d.status.revision + ":" + d.status.contentHash} id={id} scope={scope} detail={d} disabled={blocked} onDirtyChange={setEditorDirty} onCommand={command => void send(command)} onApprove={() => setApproval(ruleReviewCommand(id, d, "confirmation"))} onBypass={step => { setBypass(step); setReason("") }} />
    </>}
    {bypass && d && <Dialog open onOpenChange={open => { if (!open && !blocked) setBypass(null) }} ariaLabel={t('rulePathway.bypass')}><DialogHeader className="rounded-xl border border-primary/20 bg-secondary/60 p-4 pr-10"><DialogTitle>{t('rulePathway.bypass')}</DialogTitle><DialogDescription>{t('rulePathway.bypassHelp')}</DialogDescription></DialogHeader><DialogBody className="space-y-4"><Text>{bypass.requirement.skillName} · {t('knowledgeLevel.' + bypass.requirement.knowledgeLevel)}</Text><label htmlFor="requirement-bypass-reason" className="block text-body-sm font-semibold text-foreground">{t('rulePathway.bypassReason')}</label><Input id="requirement-bypass-reason" className="border-primary/30" aria-label={t('rulePathway.bypassReason')} placeholder={t('rulePathway.bypassReason')} maxLength={4000} value={reason} disabled={blocked} onChange={event => setReason(event.target.value)} /></DialogBody><DialogFooter><Button variant="outline" disabled={blocked} onClick={() => setBypass(null)}>{t('initialPathway.cancel')}</Button><Button disabled={blocked || !reason.trim() || !d.bypassableStepIds?.includes(bypass.id)} onClick={() => void send(ruleReviewCommand(id, d, 'bypasses', bypass.id, reason.trim()))}>{t('rulePathway.bypass')}</Button></DialogFooter></Dialog>}
    {rejecting && d && <Dialog open onOpenChange={open => { if (!open && !blocked) setRejecting(false) }} ariaLabel={t('moduleReview.reject')}><DialogHeader><DialogTitle>{t('moduleReview.reject')}</DialogTitle></DialogHeader><DialogBody><Input aria-label={t('initialPathway.rejectionReason')} placeholder={t('initialPathway.rejectionReason')} maxLength={4000} value={reason} disabled={blocked} onChange={event => setReason(event.target.value)} /></DialogBody><DialogFooter><Button variant="outline" disabled={blocked} onClick={() => setRejecting(false)}>{t('initialPathway.cancel')}</Button><Button variant="destructive" disabled={blocked || !reason.trim()} onClick={() => void send(ruleReviewCommand(id, d, 'rejection', undefined, reason.trim()))}>{t('moduleReview.reject')}</Button></DialogFooter></Dialog>}
    {approval && d && <Dialog open size="wide" onOpenChange={open => { if (!open && !blocked) setApproval(null) }} ariaLabel={t('moduleReview.approve')}><DialogHeader><DialogTitle>{t('moduleReview.approve')}</DialogTitle><DialogDescription>{d.status.roleName} · {d.status.levelName}</DialogDescription></DialogHeader><DialogBody><Text>{t('rulePathway.requirements')}: {d.plan.steps.filter(step => step.kind === 'REQUIRED').length}</Text><Text variant="body-sm">{t('rulePathway.completionHelp')}</Text></DialogBody><DialogFooter><Button variant="outline" disabled={blocked} onClick={() => setApproval(null)}>{t('initialPathway.cancel')}</Button><Button disabled={blocked} onClick={() => void send(approval)}>{t('moduleReview.approve')}</Button></DialogFooter></Dialog>}
  </div>
}
