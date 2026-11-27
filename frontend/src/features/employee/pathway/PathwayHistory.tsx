import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Eye } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { readPathwayHistory } from '../../../shared/api/requirementPathway'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { InitialPathwayFeedback } from '../../../shared/components/InitialPathwayFeedback'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { Pagination } from '../../../shared/components/ui/Pagination'

export function PathwayHistory({ scope, children }: { scope: string; children: React.ReactNode }) {
  const { language, t } = useTranslation(), vi = language === 'vi'
  const [params, setParams] = useSearchParams(), archive = params.get('archive')
  const [page, setPage] = useState(1)
  const query = useQuery({ queryKey: ['initialPathway', scope, 'history', page], queryFn: ({ signal }) => readPathwayHistory(page, signal), enabled: !archive, retry: false, staleTime: 0, refetchOnWindowFocus: false })
  function open(id?: string) {
    const next = new URLSearchParams(params)
    if (id) next.set('archive', id); else next.delete('archive')
    setParams(next)
  }
  if (archive) return <div className="space-y-5"><Button variant="outline" size="sm" onClick={() => open()}><ArrowLeft className="mr-2 size-4" />{vi ? 'Quay lại lịch sử' : 'Back to history'}</Button>{children}</div>
  if (query.isPending) return <LoadingCard label={t('initialPathway.loading')} />
  if (query.isError) return <InitialPathwayFeedback error={query.error} busy={query.isFetching} onRetry={() => void query.refetch()} />
  const data = query.data
  return <div className="space-y-5">
    {data.items.length === 0 ? <Card><CardContent className="p-4"><Text role="status" variant="body-sm">{vi ? 'Chưa có lộ trình hoàn thành hoặc bị hủy.' : 'No completed or cancelled pathways.'}</Text></CardContent></Card> : <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"><div className="overflow-x-auto" role="region" aria-label={vi ? 'Lịch sử lộ trình' : 'Pathway history'} tabIndex={0}>
      <table className="w-full min-w-[760px] table-fixed text-left text-body-sm">
        <caption className="sr-only">{vi ? 'Lịch sử lộ trình — chỉ đọc' : 'Pathway history — read-only'}</caption>
        <colgroup><col className="w-[25%]" /><col className="w-[23%]" /><col className="w-[15%]" /><col className="w-[17%]" /><col className="w-[20%]" /></colgroup>
        <thead className="border-b border-border bg-muted/20 text-caption text-muted-foreground"><tr>{[t('scopedPolicy.role'), t('baselineUi.jobPosition'), vi ? 'Trạng thái' : 'Status', vi ? 'Ngày kết thúc' : 'End date', t('scopedPolicy.actions')].map((label, i) => <th key={label} scope="col" className={`px-4 py-3 font-semibold ${i === 4 ? 'text-right' : ''}`}>{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-border">{data.items.map(item => <tr key={item.requestId}>
          <td className="px-4 py-4"><Text tone="foreground" className="break-words font-semibold">{item.roleName}</Text><Badge variant="secondary" className="mt-1 max-w-full whitespace-normal break-words">{item.levelName}</Badge></td>
          <td className="px-4 py-4">{item.jobPositionName ? <Badge variant="secondary" className="max-w-full whitespace-normal break-words">{item.jobPositionName}</Badge> : <span className="text-muted-foreground">—</span>}</td>
          <td className="px-4 py-4"><Badge variant={item.state === 'COMPLETED' ? 'success' : 'outline'}>{item.state === 'COMPLETED' ? vi ? 'Hoàn thành' : 'Completed' : vi ? 'Đã hủy' : 'Cancelled'}</Badge></td>
          <td className="px-4 py-4 text-muted-foreground">{new Date(item.endedAt).toLocaleDateString(vi ? 'vi-VN' : 'en-GB', { timeZone: 'UTC' })}</td>
          <td className="px-4 py-4"><div className="flex flex-wrap justify-end gap-2"><Button size="sm" variant="outline" onClick={() => open(item.requestId)}><Eye className="mr-2 size-4" />{vi ? 'Xem lộ trình' : 'View pathway'}</Button></div></td>
        </tr>)}</tbody>
      </table>
    </div></div>}
    {data.total > 0 && <Card className="overflow-hidden"><Pagination currentPage={page} totalPages={Math.max(1, Math.ceil(data.total / 12))} totalItems={data.total} pageSize={12} disabled={query.isFetching} onPageChange={setPage} itemLabel={vi ? 'lộ trình' : 'pathways'} locale={vi ? 'vi' : 'en'} /></Card>}
  </div>
}
