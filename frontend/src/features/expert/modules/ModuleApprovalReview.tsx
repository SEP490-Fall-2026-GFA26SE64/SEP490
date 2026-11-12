import { useState, type ReactNode } from 'react'
import type { CatalogChoice, ModuleDocument } from '../../../shared/api/moduleAuthoringApi'
import { DialogBody } from '../../../shared/components/ui/Dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../shared/components/ui/Tabs'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../../shared/components/ui/Accordion'
import { CatalogModuleDetails } from './CatalogModuleDetails'
import { LearningContentPreview } from '../../../shared/components/learning/LearningContentPreview'
import { approvalRequest, releasedComparison } from './moduleApprovalPresentation'

type Copy = (en: string, vi: string) => string
export function ModuleApprovalReview({ doc, staff, person, formatTime, labels, history, copy }: {
  doc: ModuleDocument; staff: CatalogChoice[]; person: (id: string | null | undefined) => string
  formatTime: (date: string | null | undefined) => string; labels: Record<string,string>; history: ReactNode; copy: Copy
}) {
  const [tab,setTab]=useState('content')
  const request=approvalRequest(doc), revision=request.revision, released=releasedComparison(doc)
  const metadata=[
    [copy('Request','Yêu cầu'),request.archive?copy('Archive module','Lưu trữ module'):copy('Publish revision','Phát hành phiên bản')],
    [copy('Reviewing revision','Phiên bản đang xem'),String(revision.number)],
    [copy('Submitted by','Người gửi'),person(request.event?.actorId)],
    [copy('Requested at','Thời điểm gửi'),formatTime(request.event?.occurredAt)],
    [copy('Responsible Expert','Expert phụ trách'),person(doc.createdBy)],
    [copy('Last editor','Người sửa cuối'),person(revision.editedBy)],
    [copy('Last edited at','Thời điểm sửa cuối'),formatTime(revision.editedAt)],
    [copy('Released revision','Phiên bản đã phát hành'),doc.releasedRevision==null?'—':String(doc.releasedRevision)],
  ]
  return <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
    <TabsList aria-label={copy('Review sections','Nội dung duyệt')} className="mb-3 h-auto min-h-9 shrink-0 items-stretch"><TabsTrigger value="content" className="min-w-0 flex-1 whitespace-normal px-2 text-xs">{copy('Request content','Nội dung yêu cầu')}</TabsTrigger><TabsTrigger value="learner" className="min-w-0 flex-1 whitespace-normal px-2 text-xs">{copy('View as learner','Xem như học viên')}</TabsTrigger><TabsTrigger value="history" className="min-w-0 flex-1 whitespace-normal px-2 text-xs">{copy('History & comparison','Lịch sử & đối chiếu')}</TabsTrigger></TabsList>
    <DialogBody className="space-y-4 py-1">
      <TabsContent value="content" className="space-y-4">
        <section aria-label={copy('Request overview','Tổng quan yêu cầu')} className="rounded-lg border border-border bg-muted/20 p-3"><dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">{metadata.map(([label,value])=><div key={label} className="min-w-0"><dt className="mb-1 text-xs text-muted-foreground">{label}</dt><dd className="break-words font-medium">{value}</dd></div>)}</dl>{request.event?.detail?.trim() && <p className="mt-3 break-words border-t border-border pt-3 text-xs"><span className="mr-1 font-medium">{copy('Request note', 'Ghi chú yêu cầu')}:</span>{request.event.detail}</p>}</section>
        {revision.feedback?.trim() && <section aria-label={copy('Recorded revision feedback','Phản hồi đã ghi nhận')} className="space-y-1 rounded-lg bg-muted/30 p-3"><h3 className="text-xs font-semibold">{copy('Recorded revision feedback','Phản hồi đã ghi nhận')}</h3><p className="whitespace-pre-wrap break-words text-sm">{revision.feedback}</p></section>}
        {request.retry&&<p role="status" className="rounded-lg bg-warning/10 p-3 text-xs">{copy('This approved operation is waiting for projection. Retry uses the existing publication workflow.', 'Thao tác đã duyệt đang chờ đồng bộ. Thử lại sử dụng quy trình phát hành hiện tại.')}</p>}
        <CatalogModuleDetails module={revision.payload} content={revision.payload.content} review={{by:revision.decidedBy,at:revision.decidedAt}} embedded hasHistory={doc.history.length>0} onClose={()=>{}} staff={staff} />
      </TabsContent>
      <TabsContent value="learner"><LearningContentPreview key={`${doc.id}:${revision.number}`} lessons={revision.payload.content.lessons ?? []} label={`${copy('Reviewing revision', 'Phiên bản đang xem')} ${revision.number} · ${labels[revision.state] ?? revision.state}`} /></TabsContent>
      <TabsContent value="history" className="space-y-5">
        <section aria-label={copy('Released revision comparison','Đối chiếu phiên bản đã phát hành')} className="space-y-3"><h3 className="text-base font-semibold">{copy('Compare with released revision','Đối chiếu bản đã phát hành')}</h3>{released&&released.number!==revision.number?<>
          <p className="text-xs text-muted-foreground">{copy(`Released revision ${released.number} → requested revision ${revision.number}. Inspect the recorded snapshots below; no changes are inferred from missing data.`, `Bản đã phát hành ${released.number} → bản yêu cầu ${revision.number}. Đối chiếu các bản ghi bên dưới; không suy diễn khi thiếu dữ liệu.`)}</p>
          <dl className="space-y-2 text-xs">{[
            [copy('Title','Tên module'),released.payload.title,revision.payload.title],
            [copy('Module type','Loại module'),labels[released.payload.moduleType]??released.payload.moduleType,labels[revision.payload.moduleType]??revision.payload.moduleType],
            [copy('Duration (minutes)','Thời lượng (phút)'),String(released.payload.duration),String(revision.payload.duration)],
            [copy('Knowledge level','Mức kiến thức'),labels[released.payload.knowledgeLevel??'']??released.payload.knowledgeLevel??'—',labels[revision.payload.knowledgeLevel??'']??revision.payload.knowledgeLevel??'—'],
          ].map(([label,oldValue,newValue])=><div key={label} className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3"><dt className="col-span-2 font-medium">{label}{oldValue!==newValue&&<span className="ml-2 text-primary">{copy('Changed','Đã đổi')}</span>}</dt><dd className="min-w-0 break-words text-muted-foreground"><span className="block text-[11px]">{copy('Released','Đã phát hành')}</span>{oldValue}</dd><dd className="min-w-0 break-words"><span className="block text-[11px] text-muted-foreground">{copy('Requested','Đang yêu cầu')}</span>{newValue}</dd></div>)}</dl>
          <Accordion><AccordionItem value="released"><AccordionTrigger>{copy('View released content snapshot','Xem nội dung bản đã phát hành')}</AccordionTrigger><AccordionContent><CatalogModuleDetails module={released.payload} content={released.payload.content} review={{by:released.decidedBy,at:released.decidedAt}} embedded hasHistory={true} onClose={()=>{}} staff={staff} /></AccordionContent></AccordionItem></Accordion>
        </>:<p className="text-xs text-muted-foreground">{doc.releasedRevision==null?copy('No released revision exists for comparison.','Chưa có phiên bản đã phát hành để đối chiếu.'):released?.number===revision.number?copy('This request concerns the currently released revision.','Yêu cầu này áp dụng cho chính phiên bản đang phát hành.'):copy('The released revision snapshot is unavailable.','Không có bản ghi nội dung của phiên bản đã phát hành.')}</p>}</section>
        {history}
        <Accordion>{[...doc.revisions].reverse().filter(item=>item.number!==revision.number).map(item=><AccordionItem key={item.number} value={String(item.number)}><AccordionTrigger>{copy('Historical revision','Phiên bản trước')} {item.number} · {labels[item.state]??item.state}</AccordionTrigger><AccordionContent><p className="mb-2 text-xs text-muted-foreground">{copy('Edited by','Người sửa')}: {person(item.editedBy)} · {formatTime(item.editedAt)}</p>{item.feedback&&<p className="mb-3 text-xs">{item.feedback}</p>}<CatalogModuleDetails module={item.payload} content={item.payload.content} review={{by:item.decidedBy,at:item.decidedAt}} embedded hasHistory={true} onClose={()=>{}} staff={staff}/></AccordionContent></AccordionItem>)}</Accordion>
      </TabsContent>
    </DialogBody>
  </Tabs>
}
