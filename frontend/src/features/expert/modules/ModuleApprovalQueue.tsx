import type { ModuleDocument } from '../../../shared/api/moduleAuthoringApi'
import { Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { CopyableId } from '../../../shared/components/ui/CopyableId'
import { approvalRequest } from './moduleApprovalPresentation'

type Copy = (en: string, vi: string) => string
export function ModuleApprovalQueue({ documents, total, loading, showHeading = true, busy, onReview, person, formatTime, labels, copy, vi }: {
  documents: ModuleDocument[]; total?: number; loading?: boolean; showHeading?: boolean; busy: boolean; onReview: (doc: ModuleDocument) => void
  person: (id: string | null | undefined) => string; formatTime: (date: string | null | undefined) => string
  labels: Record<string, string>; copy: Copy; vi: boolean
}) {
  return <Card><CardHeader className="p-4">{showHeading && <><CardTitle>{copy('Approval queue', 'Hàng đợi duyệt')}</CardTitle><p className="text-xs text-muted-foreground">{loading?'—':total??documents.length} {copy('requests match your filters','yêu cầu phù hợp bộ lọc')}</p></>}<p className="text-xs text-muted-foreground">{copy('Open a request to inspect its exact revision before deciding. Ordered by module creation date.', 'Mở yêu cầu để kiểm tra đúng phiên bản trước khi xử lý. Sắp xếp theo ngày tạo module.')}</p></CardHeader><CardContent className="px-3 pb-3"><div className="overflow-hidden rounded-lg border border-border"><table className="block w-full table-fixed text-left text-xs xl:table"><caption className="sr-only">{copy('Approval queue', 'Hàng đợi duyệt')}</caption><thead className="hidden bg-muted/40 text-[11px] uppercase text-muted-foreground xl:table-header-group"><tr>{[copy('Module / Skill', 'Module / Kỹ năng'), copy('Request', 'Yêu cầu'), copy('Revision', 'Phiên bản'), copy('Submitted by', 'Người gửi'), copy('Requested at', 'Thời điểm gửi'), copy('Status', 'Trạng thái'), copy('Action', 'Thao tác')].map((label,index) => <th key={label} className={`px-3 py-2.5 font-semibold ${['w-[27%]','w-[15%]','w-[8%]','w-[15%]','w-[15%]','w-[12%]','w-[8%]'][index]} ${index===6?'text-center':''}`}>{label}</th>)}</tr></thead><tbody className="block divide-y divide-border xl:table-row-group">{documents.map(doc => {
    const request=approvalRequest(doc), payload=request.revision.payload
    return <tr key={doc.id} data-testid="approval-row" className="grid grid-cols-2 gap-3 p-3 hover:bg-muted/20 xl:table-row xl:p-0">
      <td className="col-span-2 min-w-0 xl:px-3 xl:py-3"><h2 className="break-words text-sm font-semibold leading-snug">{payload.title}</h2><CopyableId code={doc.id} compact vi={vi} entity={copy('module ID','mã module')} /><p className="mt-1 break-words text-muted-foreground">{payload.teachings.map(skill=>skill.skillName || copy('Skill name unavailable','Chưa có tên kỹ năng')).join(', ') || '—'} · {labels[payload.knowledgeLevel??''] ?? payload.knowledgeLevel ?? '—'}</p></td>
      <td className="xl:px-3 xl:py-3"><span className="mb-1 block text-muted-foreground xl:hidden">{copy('Request','Yêu cầu')}</span>{request.archive?copy('Archive module','Lưu trữ module'):copy('Publish revision','Phát hành phiên bản')}</td>
      <td className="xl:px-3 xl:py-3"><span className="mb-1 block text-muted-foreground xl:hidden">{copy('Revision','Phiên bản')}</span>{request.revision.number}</td>
      <td className="min-w-0 break-words xl:px-3 xl:py-3"><span className="mb-1 block text-muted-foreground xl:hidden">{copy('Submitted by','Người gửi')}</span>{person(request.event?.actorId)}</td>
      <td className="xl:px-3 xl:py-3"><span className="mb-1 block text-muted-foreground xl:hidden">{copy('Requested at','Thời điểm gửi')}</span>{formatTime(request.event?.occurredAt)}</td>
      <td className="xl:px-3 xl:py-3"><Badge variant="warning" className="whitespace-normal">{request.retry?copy('Action needed','Cần xử lý'):copy('Awaiting review','Chờ duyệt')}</Badge>{request.retry&&<p className="mt-1 text-muted-foreground">{labels[request.revision.state]??request.revision.state}</p>}</td>
      <td className="col-span-2 xl:px-3 xl:py-3"><div className="flex justify-center"><Button variant="outline" size="icon" className="size-8" disabled={busy} title={copy('Review request','Xem yêu cầu duyệt')} aria-label={copy('Review request','Xem yêu cầu duyệt')} onClick={()=>onReview(doc)}><Eye className="size-4 text-primary" aria-hidden="true" /></Button></div></td>
    </tr>
  })}</tbody></table></div></CardContent></Card>
}
