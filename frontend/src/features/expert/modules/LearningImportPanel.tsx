import { LearningContentPreview } from '../../../shared/components/learning/LearningContentPreview'
import { ImportedModulesPreview } from '../../../shared/components/learning/ImportedModulesPreview'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Download, FileArchive } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { cn } from '../../../shared/lib/utils'
import { moduleRequest, uploadLearningFile, type ImportPreview, type ModuleDocument } from '../../../shared/api/moduleAuthoringApi'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { FileDropzone } from '../../../shared/components/ui/FileDropzone'
import { Card } from '../../../shared/components/ui/Card'
import { Heading } from '../../../shared/components/typography/Heading'
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../../shared/components/ui/Dialog'
import { LinearStepper } from '../../../shared/components/ui/LinearStepper'
import { LessonVideo } from '../../../shared/components/learning/LessonVideo'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { useToast } from '../../../shared/hooks/useToast'

export function LearningImportPanel({ onImported, showHeading = true, onBusyChange, embedded = false, onClose }: { onImported: () => void; showHeading?: boolean; onBusyChange?: (busy: boolean) => void; embedded?: boolean; onClose?: () => void }) {
 const { language } = useTranslation(); const vi = language === 'vi'; const copy = (en: string, vn: string) => vi ? vn : en
 const localizeMessage = (raw: string) => {
  const parts = raw.split(' / ')
  return parts.length === 2 ? (vi ? parts[1].trim() : parts[0].trim()) : raw
 }
 const { toast } = useToast()
 const [importedModules, setImportedModules] = useState<ModuleDocument[] | null>(null)
 const [reviewModuleId, setReviewModuleId] = useState<string | null>(null)
 const [preview, setPreview] = useState<ImportPreview | null>(null)
 const [templateMenuOpen, setTemplateMenuOpen] = useState(false)
 const [busy, setBusy] = useState(false), [step, setStep] = useState(0)
 const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null)
 const [error, setError] = useState(''), [notice, setNotice] = useState('')
 const [played, setPlayed] = useState<Record<string, number>>({})
 const lock = useRef(false), errorRef = useRef<HTMLParagraphElement>(null)
 useEffect(() => { onBusyChange?.(busy); return () => onBusyChange?.(false) }, [busy, onBusyChange])
 useEffect(() => { if (error) errorRef.current?.focus() }, [error])
 const run = async (work: () => Promise<void>) => {
  if (lock.current) return
  lock.current = true; setBusy(true); setError(''); setNotice('')
  try { await work() } catch (e) { setError(e instanceof Error ? e.message : 'Import failed') } finally { lock.current = false; setBusy(false) }
 }
 const commit = (submitAfterImport = false) => void run(async () => {
  if (!preview || preview.errors.length || preview.committed) return
  const imported = await moduleRequest<ModuleDocument[]>(`/imports/${preview.id}/commit`, 'POST', { confirmOwnedDuplicates: false })
  let documents = imported
  if (submitAfterImport) {
    const submitted: ModuleDocument[] = []
    for (const doc of imported) {
      submitted.push(await moduleRequest<ModuleDocument>('/commands', 'POST', { id: doc.id, expectedVersion: doc.lockVersion, action: 'submit', feedback: null }))
    }
    documents = submitted
  }
  const message = submitAfterImport
    ? copy('Imported and submitted for review.', 'Đã import và gửi duyệt module.')
    : copy('Imported. Submit the drafts for review.', 'Đã import. Các bản nháp cần được gửi duyệt.')
  setImportedModules(documents); setPreview(null); setStep(0); setNotice(message); setFileInfo(null); toast({ description: message, variant: 'success', duration: 3000 }); onImported()
 })
 if (importedModules !== null) return <ImportedModulesPreview modules={importedModules} onClose={onClose} />
 const reviewModule = step === 1 ? preview?.modules.find(row => row.moduleId === reviewModuleId) : undefined
 const Wrapper = embedded ? 'div' : Card
 return <Wrapper className={cn('flex min-h-0 flex-1 flex-col', !embedded && 'max-h-[85dvh] p-4')}>
  {showHeading && <Heading level={2} size="card" className="mb-3">{copy('Import modules and lessons', 'Import module và bài học')}</Heading>}
  <div className="shrink-0 pb-3"><LinearStepper ariaLabel={copy('Import progress', 'Tiến trình nhập')} currentStep={step} steps={[copy('Upload', 'Tải tệp'), copy('Review', 'Kiểm tra'), copy('Confirm', 'Xác nhận')]} /></div>
  <DialogBody className="space-y-4 px-0.5 py-2">
   {busy && <p role="status" className="text-xs text-muted-foreground">{step === 0 ? copy('Uploading and validating…', 'Đang tải và kiểm tra…') : step === 2 ? copy('Importing batch…', 'Đang import…') : copy('Updating validation…', 'Đang cập nhật kiểm tra…')}</p>}
   {error && <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg bg-destructive/5 p-3 text-sm text-destructive">{localizeMessage(error)}</p>}
   {notice && <p role="status" className="rounded-lg bg-success/5 p-3 text-sm text-success">{notice}</p>}
   {step === 0 && <section aria-label={copy('Upload modules', 'Tải tệp module')} className="space-y-4">
    <p className="text-xs leading-relaxed text-muted-foreground">{copy('Download the ZIP template with English and Vietnamese instructions. Fill module.xlsx using one Skill code per module, put Word readings in lesson/ and MP4 videos in video/, then upload the ZIP. The file paths link each lesson automatically. Each import creates new drafts.', 'Tải mẫu ZIP có hướng dẫn tiếng Việt và tiếng Anh. Điền module.xlsx bằng một mã Skill cho mỗi module, đặt bài đọc Word trong lesson/ và video MP4 trong video/, rồi tải ZIP lên. Đường dẫn tệp tự ghép nội dung vào từng bài học. Mỗi lần import tạo bản nháp mới.')}</p>
    <div className="inline-flex items-center rounded-md border border-border shadow-2xs bg-secondary">
      <a
        className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'h-8 rounded-r-none border-r border-border gap-2 font-medium text-primary hover:bg-secondary-hover')}
        href="/api/v1/module-management/imports/template"
        download="module-template.zip"
      >
        <Download className="size-4 shrink-0" aria-hidden="true" />
        <span>{copy('Download ZIP template and bilingual instructions', 'Tải mẫu ZIP và hướng dẫn')}</span>
      </a>
      <Popover.Root open={templateMenuOpen} onOpenChange={setTemplateMenuOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="flex h-8 items-center justify-center rounded-r-md px-2 text-primary hover:bg-secondary-hover cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
            title={copy('Choose template language', 'Chọn ngôn ngữ mẫu')}
            aria-label={copy('Choose template language', 'Chọn ngôn ngữ mẫu')}
          >
            <ChevronDown className="size-3.5" aria-hidden="true" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={4}
            className="z-50 w-64 rounded-lg border border-border bg-card p-1.5 shadow-md focus:outline-none"
          >
            <div className="flex flex-col gap-1">
              <a
                href="/api/v1/module-management/imports/template"
                download="module-template.zip"
                onClick={() => setTemplateMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <span className="text-sm">🇻🇳</span>
                <div className="text-left">
                  <div className="font-semibold">{copy('Vietnamese template', 'Mẫu Tiếng Việt')}</div>
                  <div className="text-[10px] text-muted-foreground">{copy('module.xlsx + instructions', 'module.xlsx + hướng dẫn tiếng Việt')}</div>
                </div>
              </a>
              <a
                href="/api/v1/module-management/imports/template?lang=en"
                download="module-template-en.zip"
                onClick={() => setTemplateMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <span className="text-sm">🇬🇧</span>
                <div className="text-left">
                  <div className="font-semibold">{copy('English template', 'Mẫu Tiếng Anh')}</div>
                  <div className="text-[10px] text-muted-foreground">{copy('module.xlsx + English instructions', 'module.xlsx + hướng dẫn tiếng Anh')}</div>
                </div>
              </a>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
    <div className="space-y-2"><p className="text-xs text-muted-foreground">{copy('ZIP (.zip) containing module.xlsx, lesson/ and video/', 'ZIP (.zip) chứa module.xlsx, lesson/ và video/')}</p><FileDropzone busy={busy} accept=".zip" label={copy('Module import file', 'File import module')} copy={copy} onFile={file => { if (!file.name.toLowerCase().endsWith('.zip')) { setPreview(null); setFileInfo({ name: file.name, size: file.size }); setNotice(''); setReviewModuleId(null); setError(copy('Use the new ZIP template. RAR and standalone Excel are not supported.', 'Dùng mẫu ZIP mới. Không hỗ trợ RAR hoặc Excel đơn lẻ.')); return } setFileInfo({ name: file.name, size: file.size }); setPlayed({}); setReviewModuleId(null); void run(async () => { setPreview(null); const result = await uploadLearningFile<ImportPreview>('/imports', file); setPreview(result); setStep(1) }) }} /></div>
   </section>}
   {fileInfo && <div className="flex min-w-0 items-start gap-2 rounded-lg border border-border p-3 text-xs"><FileArchive className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><div className="min-w-0"><p className="break-words font-medium">{fileInfo.name}</p><p className="mt-1 text-muted-foreground">{new Intl.NumberFormat(vi ? 'vi-VN' : 'en-GB', { maximumFractionDigits: 1 }).format(fileInfo.size / 1024)} KB · {busy ? copy('Processing', 'Đang xử lý') : preview ? copy('Server preview received', 'Đã nhận kết quả kiểm tra') : copy('Selected file', 'Tệp đã chọn')}</p></div></div>}
   {preview && step > 0 && <>
    <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/30 p-3 text-xs"><div><p className="text-muted-foreground">{copy('Modules parsed', 'Module đọc được')}</p><p className="mt-1 text-sm font-semibold">{preview.modules.length}</p></div><div><p className="text-muted-foreground">{copy('Validation issues', 'Lỗi kiểm tra')}</p><p className="mt-1 text-sm font-semibold">{preview.errors.length}</p></div><div><p className="text-muted-foreground">{copy('Lessons parsed', 'Bài học đọc được')}</p><p className="mt-1 text-sm font-semibold">{preview.modules.reduce((sum, row) => sum + row.lessons.length, 0)}</p></div></div>
    {step === 1 && <>
     {preview.errors.length > 0 ? <section aria-label={copy('Import validation errors', 'Lỗi kiểm tra import')} className="space-y-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3"><p className="text-sm font-semibold text-destructive">{copy('Import blocked. Resolve every error:', 'Chưa thể import. Cần sửa tất cả lỗi:')}</p><p className="text-xs text-muted-foreground">{copy('All modules are imported together. Correct the reported rows, then upload again or refresh validation.', 'Toàn bộ module được import cùng nhau. Sửa các dòng được báo lỗi, sau đó tải lại hoặc kiểm tra lại.')}</p><ul className="space-y-2 text-xs">{preview.errors.map((problem, index) => <li key={index} className="break-words"><span className="font-semibold">{problem.moduleId || copy('Batch', 'Gói import')} · {copy('row', 'dòng')} {problem.row}</span><p className="mt-0.5">{localizeMessage(problem.reason)}</p></li>)}</ul></section> : <p role="status" className="text-xs text-success">{copy('The server reported no validation errors. Review the modules before continuing.', 'Máy chủ không báo lỗi kiểm tra. Hãy xem lại module trước khi tiếp tục.')}</p>}
     <ul aria-label={copy('Modules in import', 'Module trong gói import')} className="divide-y divide-border rounded-lg border border-border">{preview.modules.map(row => <li key={row.moduleId} className="space-y-1 p-3 text-xs"><p className="break-words text-sm font-medium">{row.module.title}</p><p className="break-all text-muted-foreground">{row.moduleRef ?? '—'} · {copy('row', 'dòng')} {row.excelRow} · {row.lessons.length} {copy('lessons', 'bài học')}</p><p className="break-all text-muted-foreground">{copy('Generated module ID', 'Mã module tự sinh')}: {row.moduleId}</p><Button size="sm" variant="outline" disabled={busy} onClick={() => setReviewModuleId(row.moduleId)}>{copy('View as learner', 'Xem như học viên')}</Button></li>)}</ul>
     {preview.modules.flatMap(row => row.lessons.filter(lesson => lesson.type === 'VIDEO' && lesson.videoSource !== 'UPLOAD').map(lesson => { const key = `${row.moduleId}:${lesson.id}`; return <div key={key} className="space-y-2 rounded-lg border border-border p-3"><p className="break-words text-xs font-medium">{row.moduleId} · {lesson.title}</p><LessonVideo lesson={lesson} onSample={sample => { if (sample.playing && sample.duration > 0) setPlayed(old => old[key] === sample.duration ? old : { ...old, [key]: sample.duration }) }} /><Button size="sm" variant="outline" disabled={busy || !played[key]} onClick={() => void run(async () => { await moduleRequest('/videos/verify', 'POST', { provider: lesson.videoSource, url: lesson.videoUrl, played: true, durationSeconds: played[key] }); setPreview(await moduleRequest<ImportPreview>(`/imports/${preview.id}`)) })}>{copy('Verify video and refresh validation', 'Kiểm tra video và cập nhật kết quả')}</Button></div> }))}
    </>}
    {step === 2 && <section aria-label={copy('Confirm import', 'Xác nhận import')} className="space-y-3"><Heading level={3} size="card">{copy('Ready to import this batch?', 'Sẵn sàng import gói này?')}</Heading><p className="text-sm">{preview.modules.length} {copy('modules', 'module')} · {preview.modules.reduce((total, row) => total + row.lessons.length, 0)} {copy('lessons', 'bài học')}</p><p className="text-xs leading-relaxed text-muted-foreground">{copy('Create new draft modules with system-generated IDs and all validated lessons. Existing modules are not updated.', 'Tạo module nháp mới với mã do hệ thống sinh và toàn bộ bài học đã kiểm tra. Module hiện có không bị cập nhật.')}</p></section>}
   </>}
  </DialogBody>
  <Dialog open={!!reviewModule} onOpenChange={open => { if (!open) setReviewModuleId(null) }} size="wide" className="w-[96vw] max-w-7xl max-h-[94dvh]" ariaLabel={copy('Review module preview', 'Xem thử module đang import')}><DialogHeader><p className="text-eyebrow font-bold uppercase tracking-wide text-muted-foreground">{copy('View as learner', 'Xem như học viên')}</p><DialogTitle className="[overflow-wrap:anywhere]">{reviewModule?.module.title}</DialogTitle></DialogHeader><DialogBody>{reviewModule && <LearningContentPreview key={preview?.id + ':' + reviewModule.moduleId} lessons={reviewModule.lessons} label={copy('Import review · Not yet confirmed', 'Kiểm tra file · Chưa xác nhận import')} />}</DialogBody><DialogFooter><Button variant="outline" onClick={() => setReviewModuleId(null)}>{copy('Back to import review', 'Quay lại kiểm tra file')}</Button></DialogFooter></Dialog>
  <DialogFooter className="mt-3 flex-wrap sm:justify-between"><div className="flex flex-wrap gap-2">{onClose && <Button size="sm" variant="outline" disabled={busy} onClick={onClose}>{copy('Close', 'Đóng')}</Button>}{step > 0 && <Button size="sm" variant="outline" disabled={busy} onClick={() => setStep(step - 1)}>{copy('Back', 'Quay lại')}</Button>}{preview && step === 1 && <Button size="sm" variant="outline" disabled={busy} onClick={() => { setPreview(null); setFileInfo(null); setStep(0) }}>{copy('Cancel batch', 'Hủy gói')}</Button>}</div><div className="flex flex-wrap gap-2">{step === 0 && preview && <Button size="sm" disabled={busy} onClick={() => setStep(1)}>{copy('Review results', 'Xem kết quả')}</Button>}{step === 1 && preview && <><Button size="sm" variant="outline" disabled={busy || preview.committed} onClick={() => void run(async () => setPreview(await moduleRequest<ImportPreview>(`/imports/${preview.id}`)))}>{copy('Validate again', 'Kiểm tra lại')}</Button><Button size="sm" disabled={busy || !!preview.errors.length || preview.committed} onClick={() => setStep(2)}>{copy('Continue import', 'Tiếp tục import')}</Button></>}{step === 2 && preview && <><Button size="sm" variant="outline" disabled={busy || !!preview.errors.length || preview.committed} onClick={() => commit(false)}>{copy('Confirm import', 'Xác nhận import')}</Button><Button size="sm" disabled={busy || !!preview.errors.length || preview.committed} onClick={() => commit(true)}>{copy('Confirm & submit for review', 'Xác nhận & gửi duyệt')}</Button></>}</div></DialogFooter>
 </Wrapper>
}
