import type { CatalogModule } from '../../../shared/api/moduleAuthoringApi'
import { Dialog, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { Heading } from '../../../shared/components/typography/Heading'
import { useTranslation } from '../../../shared/i18n/LanguageContext'

export function CatalogModuleDetails({ module, hasHistory, onClose }: { module: CatalogModule | null; hasHistory: boolean; onClose: () => void }) {
  const { language } = useTranslation()
  const copy = (en: string, vi: string) => language === 'vi' ? vi : en
  const labels: Record<string, string> = {
    id: copy('ID', 'Mã'), version: copy('Catalog version', 'Phiên bản danh mục'), status: copy('Lifecycle', 'Vòng đời'),
    reviewStatus: copy('Review', 'Duyệt'), reviewedBy: copy('Reviewed by', 'Người duyệt'), reviewedAt: copy('Reviewed at', 'Thời điểm duyệt'),
    title: copy('Title', 'Tên module'), moduleType: copy('Module type', 'Loại module'), contentUri: copy('Content location', 'Địa chỉ nội dung'),
    contentType: copy('Content format', 'Định dạng nội dung'), contentVersion: copy('Content version', 'Phiên bản nội dung'),
    duration: copy('Duration (minutes)', 'Thời lượng (phút)'), price: copy('Price (VND)', 'Giá (VND)'),
    teachingFocus: copy('Teaching focus', 'Vai trò giảng dạy'), difficultyLevel: copy('Difficulty', 'Độ khó'),
  }
  const values: Record<string, string> = {
    DRAFT: copy('Draft', 'Bản nháp'), ACTIVE: copy('Active', 'Đang hoạt động'), ARCHIVED: copy('Archived', 'Đã lưu trữ'),
    APPROVED: copy('Approved', 'Đã duyệt'), NEEDS_EXPERT_REVIEW: copy('Not approved', 'Chưa được duyệt'), REJECTED: copy('Changes requested', 'Cần chỉnh sửa'),
    LESSON_AND_PRACTICE: copy('Lesson and practice', 'Bài học và thực hành'), RESOURCE_GUIDED_PRACTICE: copy('Resource-guided practice', 'Thực hành theo tài liệu'),
    PRIMARY: copy('Primary', 'Chính'), SUPPORTING: copy('Supporting', 'Hỗ trợ'), INCIDENTAL: copy('Incidental', 'Ngữ cảnh'),
    LOW: copy('Low', 'Thấp'), MEDIUM: copy('Medium', 'Trung bình'), HIGH: copy('High', 'Cao'),
  }
  const fields = (entries: [string, string | number | null][]) => <dl className="grid gap-3 sm:grid-cols-2">{entries.map(([key, value]) => <div key={key}>
    <dt className="text-muted-foreground">{labels[key] ?? key}</dt>
    <dd className="break-words [overflow-wrap:anywhere]">{value === null || value === '' ? copy('Not recorded', 'Chưa có thông tin') : typeof value === 'string' ? values[value] ?? value : new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-US').format(value)}</dd>
  </div>)}</dl>
  return <Dialog open={module !== null} onOpenChange={open => { if (!open) onClose() }} className="max-w-3xl" ariaLabel={copy('Catalog module details', 'Chi tiết module trong danh mục')}>
    <DialogHeader><DialogTitle>{module?.title ?? module?.metadata.id}</DialogTitle></DialogHeader>
    {module && <div className="space-y-5 overflow-y-auto px-1 text-[length:var(--text-body-sm)]">
      {!hasHistory && <p className="rounded-lg border border-border bg-muted p-3 text-muted-foreground">{copy('No edit history has been recorded for this module.', 'Module này chưa có lịch sử chỉnh sửa được ghi nhận.')}</p>}
      {fields(Object.entries({ ...module.metadata, title: module.title, moduleType: module.moduleType, contentUri: module.contentUri, contentType: module.contentType, contentVersion: module.contentVersion, duration: module.duration, price: module.price }))}
      <Heading level={3} size="subsection">{copy('Skills taught', 'Kỹ năng được giảng dạy')}</Heading>
      {!module.teachings.length && <p className="text-muted-foreground">{copy('No skills have been mapped yet.', 'Chưa có kỹ năng được liên kết.')}</p>}
      {module.teachings.map((teaching, index) => <section key={`${teaching.skillId}:${index}`} className="space-y-3 rounded-lg border border-border p-3">
        <Heading level={4} size="card" className="break-words">{teaching.skillName ?? teaching.skillId}</Heading>
        <p className="break-all text-muted-foreground">{teaching.skillId}</p>
        {fields(Object.entries({ ...teaching.metadata, teachingFocus: teaching.teachingFocus, difficultyLevel: teaching.difficultyLevel }))}
      </section>)}
    </div>}
  </Dialog>
}
