import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { readReviewQueue, PathwayError } from '../../../shared/api/initialPathway'
import { useInitialPathwaySession } from '../../../shared/hooks/useInitialPathwaySession'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { InitialPathwayFeedback } from '../../../shared/components/InitialPathwayFeedback'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { Input } from '../../../shared/components/ui/Input'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'

export function ExpertPathwayReviewPage() {
  const { t } = useTranslation(), tr = (key: string) => t('initialPathway.' + key), session = useInitialPathwaySession()
  const [offset, setOffset] = useState(0), [search, setSearch] = useState('')
  const authorized = session.data?.role === 'DOMAIN_EXPERT'
  const queue = useQuery({ queryKey: ['initialPathway', session.scope, 'reviewQueue', offset], queryFn: ({ signal }) => readReviewQueue(offset, signal), enabled: Boolean(session.scope && authorized), retry: false, gcTime: 0 })
  const error = session.error ?? (!authorized && session.data ? new PathwayError('FORBIDDEN', 403) : queue.error)
  const rows = (queue.data ?? []).filter(r => `${r.roleName} ${r.levelName}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
  return <WorkspaceLayout><div className="min-w-0 space-y-5 pb-8">
    <PageHeader title={tr('reviewTitle')} description={tr('reviewDescription')} actions={<Button variant="outline" disabled={!authorized || queue.isFetching} onClick={() => void queue.refetch()}>{tr('refresh')}</Button>} />
    {(session.isPending || authorized && queue.isPending) && <LoadingCard label={tr('loading')} />}
    {error && <InitialPathwayFeedback error={error} onRetry={() => { void session.refetch(); if (authorized) void queue.refetch() }} busy={session.isFetching || queue.isFetching} />}
    {!error && queue.data && <Card><CardContent className="space-y-4 p-4">
      <Input aria-label={tr('search')} placeholder={tr('search')} value={search} onChange={event => setSearch(event.target.value)} />
      {rows.length === 0 ? <EmptyState bordered={false} title={tr('noAssignments')} /> : <div className="overflow-x-auto"><table className="w-full text-left text-body-sm">
        <thead className="bg-muted"><tr>{['skill', 'level', 'awaiting', 'open'].map(key => <th className="px-3 py-2" key={key} scope="col">{key === 'skill' ? t('roleFlow.roleName') : key === 'awaiting' ? t('upskillingUi.status') : tr(key)}</th>)}</tr></thead>
        <tbody className="divide-y divide-border">{rows.map(row => <tr key={row.id}>
          <th scope="row" className="max-w-80 break-words px-3 py-3 font-medium">{row.roleName}</th><td className="px-3 py-3">{row.levelName}</td>
          <td className="px-3 py-3"><Badge variant={row.reviewStatus === 'APPROVED' ? 'success' : 'warning'}>{t('initialPathway.state.' + (row.validationStatus === 'VALID' ? row.reviewStatus : row.validationStatus))}</Badge></td>
          <td className="px-3 py-3"><Link to={'/expert/pathway-review/' + encodeURIComponent(row.id)} className="font-semibold text-primary underline underline-offset-4">{tr('open')}</Link></td>
        </tr>)}</tbody>
      </table></div>}
      <div className="flex items-center justify-between gap-3"><Button size="sm" variant="outline" disabled={offset === 0 || queue.isFetching} onClick={() => setOffset(value => Math.max(0, value - 20))}>{tr('previous')}</Button>
        <Text variant="caption">{offset + (rows.length ? 1 : 0)}–{offset + rows.length}</Text><Button size="sm" variant="outline" disabled={queue.isFetching || queue.data.length < 20} onClick={() => setOffset(value => value + 20)}>{tr('next')}</Button></div>
    </CardContent></Card>}
  </div></WorkspaceLayout>
}
