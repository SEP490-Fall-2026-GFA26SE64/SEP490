import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { checkReview, prepareReviewCommand, readReviewDetail, sendPathwayCommand, PathwayError, type PendingPathwayCommand } from '../../../shared/api/initialPathway'
import { useInitialPathwaySession } from '../../../shared/hooks/useInitialPathwaySession'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { InitialGapTable } from '../../../shared/components/InitialGapTable'
import { InitialPathwayFeedback } from '../../../shared/components/InitialPathwayFeedback'
import { pathwayDiagnostic, pathwayMessage } from '../../../shared/api/initialPathwayMessages'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../shared/components/ui/Dialog'
import { Input } from '../../../shared/components/ui/Input'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'

export function ExpertPathwayDetailPage() {
  const session = useInitialPathwaySession(), { pathwayId = '' } = useParams<{ pathwayId: string }>(), { t } = useTranslation()
  return <WorkspaceLayout>{session.scope && session.data?.role === 'DOMAIN_EXPERT' ? <Review key={session.scope + pathwayId} scope={session.scope} id={pathwayId} /> : session.isPending ? <LoadingCard label={t('initialPathway.loading')} /> : <InitialPathwayFeedback error={session.error ?? new PathwayError('FORBIDDEN', 403)} onRetry={() => void session.refetch()} />}</WorkspaceLayout>
}
function Review({ scope, id }: { scope: string; id: string }) {
  const { t, language } = useTranslation(), tr = (key: string) => t('initialPathway.' + key), client = useQueryClient()
  const detail = useQuery({ queryKey: ['initialPathway', scope, 'review', id], queryFn: ({ signal }) => readReviewDetail(id, signal), retry: false, gcTime: 0, refetchOnWindowFocus: false })
  const [pending, setPending] = useState<PendingPathwayCommand | null>(null), [approval, setApproval] = useState<PendingPathwayCommand | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState<PathwayError | null>(null), [reason, setReason] = useState(''), [search, setSearch] = useState('')
  const [checked, setChecked] = useState<string | null>(null), [diagnostics, setDiagnostics] = useState<string[] | null>(null)
  const lock = useRef(false), committed = useRef(false), d = detail.data
  const blocked = busy || pending !== null, editable = d?.summary.reviewStatus === 'AWAITING_EXPERT_REVIEW'
  async function reconcile() { const latest = await readReviewDetail(id); client.setQueryData(['initialPathway', scope, 'review', id], latest); return latest }
  async function submit(command: PendingPathwayCommand) {
    if (lock.current) return
    lock.current = true; setBusy(true); setPending(command); setError(null)
    try {
      if (!committed.current) { await sendPathwayCommand(command); committed.current = true }
      await reconcile(); await client.invalidateQueries({ queryKey: ['initialPathway', scope, 'reviewQueue'] })
      setPending(null); setApproval(null); setChecked(null); setDiagnostics(null); committed.current = false
    } catch (cause) {
      const failure = cause instanceof PathwayError ? cause : new PathwayError('NETWORK_ERROR'); setError(failure)
      if (!failure.ambiguous && !committed.current) { setPending(null); setApproval(null); void detail.refetch() }
    } finally { lock.current = false; setBusy(false) }
  }
  async function validate() {
    if (lock.current) return
    lock.current = true; setBusy(true); setError(null)
    try { const result = await checkReview(id); setChecked(result.validationStatus); setDiagnostics(result.diagnostics) }
    catch (cause) { setError(cause instanceof PathwayError ? cause : new PathwayError('NETWORK_ERROR')) }
    finally { lock.current = false; setBusy(false) }
  }
  const alternatives = [...new Map((d?.candidates ?? []).filter(c => !d?.revision.selectedModules.includes(c.moduleId)).map(c => [c.moduleId, c])).values()]
    .filter(c => `${c.title} ${c.skillId}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
  const issues = diagnostics ?? d?.revision.plan.diagnostics ?? []
  return <div className="min-w-0 space-y-5 pb-8">
    <PageHeader title={tr('reviewTitle')} description={d ? `${d.summary.roleName} · ${d.summary.levelName}` : tr('reviewDescription')} actions={<Link to="/expert/pathway-review" className="font-semibold text-primary underline">{tr('back')}</Link>} />
    {detail.isPending && <LoadingCard label={tr('loading')} />}
    {detail.isError && <InitialPathwayFeedback error={detail.error} onRetry={() => void detail.refetch()} busy={detail.isFetching} />}
    {error && <InitialPathwayFeedback error={error} onRetry={() => { if (pending) void submit(pending); else void detail.refetch() }} busy={busy} />}
    {pending && <Text role="status">{tr('uncertain')}</Text>}
    {d && !detail.isError && <>
      <div className="flex flex-wrap items-center gap-3"><Badge variant={d.summary.reviewStatus === 'APPROVED' || (checked ?? d.summary.validationStatus) === 'VALID' ? 'success' : 'warning'}>{t('initialPathway.state.' + (d.summary.reviewStatus === 'APPROVED' ? 'APPROVED' : checked ?? d.summary.validationStatus))}</Badge>
        <Button variant="outline" disabled={blocked} isLoading={busy && !pending} onClick={() => void validate()}>{tr('check')}</Button>
        <Button disabled={blocked || !editable || (checked ?? d.summary.validationStatus) !== 'VALID'} onClick={() => setApproval(prepareReviewCommand(id, d, 'confirmation'))}>{tr('approve')}</Button></div>
      {issues.length > 0 && <Card><CardContent className="space-y-2 p-4" role="status">{[...new Set(issues.map(issue => pathwayDiagnostic(issue, t)))].map(message => <Text key={message}>{message}</Text>)}</CardContent></Card>}
      <InitialGapTable result={d.gaps} />
      <label className="block space-y-2"><Text as="span" variant="body-sm">{tr('reason')}</Text><Input value={reason} maxLength={2000} disabled={blocked} onChange={e => setReason(e.target.value)} /></label>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <Card><CardContent className="space-y-4 p-5"><Heading level={2} size="section">{tr('included')}</Heading>
          {d.revision.selectedModules.length === 0 && <Text>{tr('noModules')}</Text>}
          <ol className="divide-y divide-border">{[...d.revision.selectedModules].sort((a, b) => (d.revision.plan.modules.find(m => m.id === a)?.ordinal ?? Number.MAX_SAFE_INTEGER) - (d.revision.plan.modules.find(m => m.id === b)?.ordinal ?? Number.MAX_SAFE_INTEGER) || a.localeCompare(b)).map(moduleId => {
            const m = d.revision.plan.modules.find(m => m.id === moduleId), candidate = d.candidates.find(c => c.moduleId === moduleId)
            return <li key={moduleId} className="space-y-2 py-4"><div className="flex items-start justify-between gap-3"><Heading level={3} size="card">{m ? `${m.ordinal}. ` : ''}{m?.title ?? candidate?.title ?? tr('state.UNAVAILABLE')}</Heading>
              <Button size="sm" variant="outline" disabled={blocked || !editable} onClick={() => void submit(prepareReviewCommand(id, d, 'exclusions', moduleId, reason))}>{tr('exclude')}</Button></div>
              {m && <><Text variant="caption">{m.durationMinutes.toLocaleString(language)} {tr('duration')} · {m.priceVnd.toLocaleString(language)} {tr('price')}</Text><Text variant="body-sm">{m.targets.map(s => d.gaps.skills.find(g => g.skillId === s.skillId)?.name ?? s.skillId).join(', ')}</Text></>}
            </li>
          })}</ol>
        </CardContent></Card>
        <Card><CardContent className="space-y-4 p-5"><Heading level={2} size="section">{tr('alternatives')}</Heading><Input value={search} placeholder={tr('searchModules')} aria-label={tr('searchModules')} disabled={blocked} onChange={e => setSearch(e.target.value)} />
          <ul className="divide-y divide-border">{alternatives.map(c => <li key={c.moduleId} className="space-y-2 py-4"><div className="flex items-start justify-between gap-3"><Heading level={3} size="card">{c.title}</Heading>
            <Button size="sm" variant="secondary" disabled={blocked || !editable} onClick={() => void submit(prepareReviewCommand(id, d, 'inclusions', c.moduleId, reason))}>{tr('include')}</Button></div><Text variant="caption">{c.durationMinutes.toLocaleString(language)} {tr('duration')} · {c.priceVnd.toLocaleString(language)} {tr('price')}</Text></li>)}</ul>
        </CardContent></Card>
      </div>
    </>}
    <Dialog open={approval !== null} onOpenChange={open => { if (!open && !blocked) setApproval(null) }} ariaLabel={tr('approveTitle')} closeLabel={tr('cancel')}>
      <DialogHeader><DialogTitle>{tr('approveTitle')}</DialogTitle><DialogDescription>{tr('approveDescription')}</DialogDescription></DialogHeader>
      {error && <Text role="alert">{pathwayMessage(error, t)}</Text>}
      <DialogFooter><Button variant="outline" disabled={blocked} onClick={() => setApproval(null)}>{tr('cancel')}</Button><Button isLoading={busy} onClick={() => { const command = pending ?? approval; if (command) void submit(command) }}>{tr(pending ? 'retryExact' : 'approve')}</Button></DialogFooter>
    </Dialog>
  </div>
}
