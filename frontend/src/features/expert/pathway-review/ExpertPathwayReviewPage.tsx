import { useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { CheckCircle2, Compass, Eye, MinusCircle, RefreshCw, Search, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { readReviewDetail, readReviewQueue, PathwayError } from '../../../shared/api/initialPathway'
import { useInitialPathwaySession } from '../../../shared/hooks/useInitialPathwaySession'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { InitialPathwayFeedback } from '../../../shared/components/InitialPathwayFeedback'
import { reviewLearnerName } from '../../../shared/api/initialPathwayMessages'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Combobox } from '../../../shared/components/ui/Combobox'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { Input } from '../../../shared/components/ui/Input'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'

/** Original queue composition, backed exclusively by the authorized paged APIs. */
export function ExpertPathwayReviewPage() {
  const { t, language } = useTranslation(), tr = (key: string) => t('initialPathway.' + key), ui = (key: string) => tr('reviewUi.' + key)
  const session = useInitialPathwaySession(), authorized = session.data?.role === 'DOMAIN_EXPERT'
  const [offset, setOffset] = useState(0), [search, setSearch] = useState(''), [status, setStatus] = useState('ALL')
  const queue = useQuery({ queryKey: ['initialPathway', session.scope, 'reviewQueue', offset], queryFn: ({ signal }) => readReviewQueue(offset, signal), enabled: Boolean(session.scope && authorized), retry: false, gcTime: 0 })
  const items = authorized ? queue.data ?? [] : []
  const projections = useQueries({ queries: items.map(row => ({ queryKey: ['initialPathway', session.scope, 'review', row.id], queryFn: ({ signal }: { signal: AbortSignal }) => readReviewDetail(row.id, signal), retry: false, gcTime: 0, refetchOnWindowFocus: false })) })
  const details = new Map(items.map((row, index) => [row.id, projections[index]?.data?.summary.contentHash === row.contentHash && !projections[index]?.isError ? projections[index]?.data : undefined]))
  const error = session.error ?? (!authorized && session.data ? new PathwayError('FORBIDDEN', 403) : queue.error)
  const rows = items.filter(row => (status === 'ALL' || row.reviewStatus === status) && `${reviewLearnerName(row, t)} ${row.learnerLabel ?? ''} ${row.learnerId ?? ''} ${row.roleName} ${row.levelName}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  const excludedCount = (id: string) => {
    const d = details.get(id)
    return d ? [...new Map(d.revision.overrides.map(o => [o.moduleId, o])).values()].filter(o => o.action === 'EXCLUDE' && !d.revision.selectedModules.includes(o.moduleId)).length : null
  }
  const totalExcluded = items.every(row => details.get(row.id)) ? items.reduce((sum, row) => sum + (excludedCount(row.id) ?? 0), 0) : null
  const pendingCount = items.filter(row => row.reviewStatus === 'AWAITING_EXPERT_REVIEW').length
  const approvedCount = items.filter(row => row.reviewStatus === 'APPROVED').length
  const failedDetails = projections.some(result => result.isError)
  function refresh() { void queue.refetch(); projections.forEach(result => { void result.refetch() }) }
  return <WorkspaceLayout><div className="min-w-0 space-y-6 pb-16">
    <h1 className="sr-only">{tr('reviewTitle')}</h1>
    {(session.isPending || authorized && queue.isPending) && <LoadingCard label={tr('loading')} />}
    {error && <InitialPathwayFeedback error={error} onRetry={() => { void session.refetch(); if (authorized) refresh() }} busy={session.isFetching || queue.isFetching} />}
    {!error && queue.data && <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard className="min-w-0" variant="gradient" icon={<Compass className="size-4 text-warning" />} title={tr('awaiting')} value={`${pendingCount} ${ui('toReview')}`} valueClassName="break-words text-warning" description={ui('awaitingOnPage')} />
        <StatCard className="min-w-0" variant="gradient" icon={<MinusCircle className="size-4 text-primary" />} title={tr('excluded')} value={totalExcluded === null ? '—' : `${totalExcluded} ${ui('excludedCount')}`} valueClassName="break-words text-primary" description={ui('excludedOnPage')} />
        <StatCard className="min-w-0" variant="gradient" icon={<CheckCircle2 className="size-4 text-success" />} title={ui('approvedPathways')} value={`${approvedCount} ${tr('approved')}`} valueClassName="break-words text-success" description={ui('approvedOnPage')} />
        <StatCard className="min-w-0" variant="gradient" icon={<SlidersHorizontal className="size-4 text-muted-foreground" />} title={ui('totalInQueue')} value={`${items.length} ${ui('total')}`} valueClassName="break-words" description={ui('assignedOnPage')} />
      </div>
      <Card className="min-w-0">
        <CardHeader><div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div className="min-w-0 flex-1"><CardTitle className="flex items-center gap-2 text-[length:var(--text-card)] font-bold"><Compass className="size-4 shrink-0 text-primary" />{ui('queueTitle')}</CardTitle><CardDescription className="mt-1 text-body-sm">{tr('reviewDescription')}</CardDescription></div>
          <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:w-140 xl:shrink-0">
            <div className="col-span-2 min-w-0 sm:col-span-1"><Input className="h-10 min-w-0" leftIcon={<Search className="size-4" />} aria-label={tr('reviewSearch')} placeholder={tr('reviewSearch')} value={search} onChange={event => setSearch(event.target.value)} /></div>
            <div className="min-w-0" role="group" aria-label={ui('status')}><Combobox clearable={false} wrapOptions value={status} onChange={setStatus} options={[
              { value: 'ALL', label: `${ui('allStatuses')} (${items.length})` },
              ...[...new Set(items.map(row => row.reviewStatus))].map(value => ({ value, label: `${value === 'AWAITING_EXPERT_REVIEW' ? tr('awaiting') : tr('state.' + value)} (${items.filter(row => row.reviewStatus === value).length})` })),
            ]} /></div>
            <Button variant="ghost" size="icon" aria-label={tr('refresh')} title={tr('refresh')} disabled={queue.isFetching || projections.some(result => result.isFetching)} onClick={refresh}><RefreshCw className="size-4" /></Button>
          </div>
        </div></CardHeader>
        <CardContent className="p-0">
          {failedDetails && <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2" role="status"><Text variant="caption">{ui('detailsUnavailable')}</Text><Button variant="ghost" size="sm" onClick={refresh}>{tr('retry')}</Button></div>}
          <div className="overflow-x-auto scrollbar-hidden" tabIndex={0} role="region" aria-label={ui('queueTitle')}>
            <table className="w-full min-w-240 border-collapse text-left text-body-sm">
              <thead className="border-y border-border bg-muted/40 text-caption uppercase text-muted-foreground"><tr>{['employee', 'targetRole', 'membership', 'estimatedDuration', 'reviewVersion', 'status', 'actions'].map(key => <th key={key} scope="col" className={`px-4 py-3 font-semibold ${['membership', 'estimatedDuration'].includes(key) ? 'text-center' : key === 'actions' ? 'text-right' : ''}`}>{ui(key)}</th>)}</tr></thead>
              <tbody className="divide-y divide-border">{rows.length === 0 ? <tr><td colSpan={7}><EmptyState bordered={false} title={tr(search.trim() || status !== 'ALL' ? 'noReviewResults' : 'noAssignments')} /></td></tr> : rows.map(row => {
                const d = details.get(row.id), quality = d?.revision.plan.quality
                const minutes = quality?.durationMinutes ?? (d && d.revision.plan.modules.length === d.revision.selectedModules.length ? d.revision.plan.modules.reduce((sum, m) => sum + m.durationMinutes, 0) : null)
                return <tr key={row.id} className="hover:bg-muted/20">
                  <th scope="row" className="max-w-60 break-words px-4 py-4 font-semibold">{reviewLearnerName(row, t)}</th>
                  <td className="max-w-72 px-4 py-4"><Text className="break-words font-semibold">{row.roleName}</Text><Text variant="caption">{row.levelName}</Text></td>
                  <td className="px-4 py-4 text-center"><Text className="font-semibold">{d ? `${d.revision.selectedModules.length} ${ui('includedCount')}` : '—'}</Text><Text variant="caption" className={excludedCount(row.id) ? 'text-destructive' : undefined}>{excludedCount(row.id) === null ? '—' : `(${excludedCount(row.id)} ${ui('excludedCount')})`}</Text></td>
                  <td className="whitespace-nowrap px-4 py-4 text-center font-semibold">{minutes === null ? '—' : `${(minutes / 60).toLocaleString(language, { maximumFractionDigits: 2 })} ${ui('hours')}`}</td>
                  <td className="px-4 py-4"><Text className="font-semibold">{ui('version')} {row.revision}</Text><Text variant="caption">{tr('state.' + row.validationStatus)}</Text></td>
                  <td className="whitespace-nowrap px-4 py-4"><Badge variant={row.reviewStatus === 'APPROVED' ? 'success' : 'warning'} className="w-max shrink-0 whitespace-nowrap px-3 py-1 text-[length:var(--text-caption)] leading-normal">{row.reviewStatus === 'AWAITING_EXPERT_REVIEW' ? tr('awaiting') : tr('state.' + row.reviewStatus)}</Badge></td>
                  <td className="px-4 py-4 text-right"><Link to={'/expert/pathway-review/' + encodeURIComponent(row.id)} className={buttonVariants({ variant: 'outline', size: 'sm' })}><Eye className="mr-2 size-4 text-primary" />{ui('review')}</Link></td>
                </tr>
              })}</tbody>
            </table>
          </div>
          <div className="grid grid-cols-2 items-center gap-3 border-t border-border px-4 py-3 sm:flex sm:justify-between"><Button className="order-2 min-h-10 justify-self-start sm:order-none sm:min-h-8" size="sm" variant="outline" disabled={offset === 0 || queue.isFetching} onClick={() => setOffset(value => Math.max(0, value - 20))}>{tr('previous')}</Button><Text variant="caption" className="order-1 col-span-2 text-center sm:order-none">{ui('page')} {Math.floor(offset / 20) + 1} · {rows.length} {ui('shown')}</Text><Button className="order-3 min-h-10 justify-self-end sm:order-none sm:min-h-8" size="sm" variant="outline" disabled={queue.isFetching || items.length < 20} onClick={() => setOffset(value => value + 20)}>{tr('next')}</Button></div>
        </CardContent>
      </Card>
    </>}
  </div></WorkspaceLayout>
}
