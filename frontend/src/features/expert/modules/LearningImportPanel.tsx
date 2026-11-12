import { useEffect, useRef, useState } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { cn } from '../../../shared/lib/utils'
import { moduleRequest, uploadLearningFile, type ImportPreview } from '../../../shared/api/moduleAuthoringApi'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { FileDropzone } from '../../../shared/components/ui/FileDropzone'
import { Card } from '../../../shared/components/ui/Card'
import { Heading } from '../../../shared/components/typography/Heading'
import { DialogBody, DialogFooter } from '../../../shared/components/ui/Dialog'
import { LinearStepper } from '../../../shared/components/ui/LinearStepper'
import { Badge } from '../../../shared/components/ui/Badge'
import { LessonVideo } from '../../../shared/components/learning/LessonVideo'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { useToast } from '../../../shared/hooks/useToast'

export function LearningImportPanel({ onImported, showHeading = true, onBusyChange, embedded = false, onClose }: { onImported: () => void; showHeading?: boolean; onBusyChange?: (busy: boolean) => void; embedded?: boolean; onClose?: () => void }) {
 const { language } = useTranslation(); const vi = language === 'vi'; const copy = (en: string, vn: string) => vi ? vn : en
 const { toast } = useToast()
 const [preview, setPreview] = useState<ImportPreview | null>(null)
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
 const commit = () => void run(async () => {
  if (!preview || preview.errors.length || preview.committed) return
  await moduleRequest(`/imports/${preview.id}/commit`, 'POST', { confirmOwnedDuplicates: true })
  const message = copy('Imported. Submit the drafts for review.', 'Đã import. Các bản nháp cần được gửi duyệt.')
  setPreview(null); setStep(0); setNotice(message); setFileInfo(null); toast({ description: message, variant: 'success', duration: 3000 }); onImported()
 })
 const Wrapper = embedded ? 'div' : Card
 return <Wrapper className={cn('flex min-h-0 flex-1 flex-col', !embedded && 'max-h-[85dvh] p-4')}>
  {showHeading && <Heading level={2} size="card" className="mb-3">{copy('Import modules and lessons', 'Import module và bài học')}</Heading>}
  <div className="shrink-0 pb-3"><LinearStepper ariaLabel={copy('Import progress', 'Tiến trình nhập')} currentStep={step} steps={[copy('Upload', 'Tải tệp'), copy('Review', 'Kiểm tra'), copy('Confirm', 'Xác nhận')]} /></div>
  <DialogBody className="space-y-4 px-0.5 py-2">
   {busy && <p role="status" className="text-xs text-muted-foreground">{step === 0 ? copy('Uploading and validating…', 'Đang tải và kiểm tra…') : step === 2 ? copy('Importing batch…', 'Đang import…') : copy('Updating validation…', 'Đang cập nhật kiểm tra…')}</p>}
   {error && <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
   {notice && <p role="status" className="rounded-lg bg-success/5 p-3 text-sm text-success">{notice}</p>}
   {step === 0 && <section aria-label={copy('Upload modules', 'Tải tệp module')} className="space-y-4"><p className="text-xs leading-relaxed text-muted-foreground">{copy('Use the Excel template, or a ZIP containing modules.xlsx and assets. Each module needs one skill and a knowledge level. Review the entire batch before confirming.', 'Dùng Excel theo mẫu, hoặc ZIP chứa modules.xlsx và tài nguyên. Mỗi module cần một kỹ năng và một mức kiến thức. Kiểm tra toàn bộ trước khi xác nhận.')}</p><a className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'h-auto min-h-8 max-w-full gap-2 whitespace-normal text-left text-primary')} href="/api/v1/module-management/imports/template"><Download className="size-4 shrink-0" aria-hidden="true" /><span>{copy('Download Excel template and instructions', 'Tải mẫu Excel và hướng dẫn')}</span></a><div className="space-y-2"><p className="text-xs text-muted-foreground">{copy('Excel (.xlsx) or ZIP (.zip)', 'Excel (.xlsx) hoặc ZIP (.zip)')}</p><FileDropzone busy={busy} accept=".xlsx,.zip" label={copy('Module import file', 'File import module')} copy={copy} onFile={file => { setFileInfo({ name: file.name, size: file.size }); setPlayed({}); void run(async () => { setPreview(null); const result = await uploadLearningFile<ImportPreview>('/imports', file); setPreview(result); setStep(1) }) }} /></div></section>}
   {fileInfo && <div className="flex min-w-0 items-start gap-2 rounded-lg border border-border p-3 text-xs"><FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><div className="min-w-0"><p className="break-words font-medium">{fileInfo.name}</p><p className="mt-1 text-muted-foreground">{new Intl.NumberFormat(vi ? 'vi-VN' : 'en-GB', { maximumFractionDigits: 1 }).format(fileInfo.size / 1024)} KB · {busy ? copy('Processing', 'Đang xử lý') : preview ? copy('Server preview received', 'Đã nhận kết quả kiểm tra') : copy('Selected file', 'Tệp đã chọn')}</p></div></div>}
   {preview && step > 0 && <>
    <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/30 p-3 text-xs"><div><p className="text-muted-foreground">{copy('Modules parsed', 'Module đọc được')}</p><p className="mt-1 text-sm font-semibold">{preview.modules.length}</p></div><div><p className="text-muted-foreground">{copy('Validation issues', 'Lỗi kiểm tra')}</p><p className="mt-1 text-sm font-semibold">{preview.errors.length}</p></div><div><p className="text-muted-foreground">{copy('Existing owned IDs', 'ID đang phụ trách')}</p><p className="mt-1 text-sm font-semibold">{preview.ownedDuplicates.length}</p></div></div>
    {step === 1 && <>
     {preview.errors.length > 0 ? <section aria-label={copy('Import validation errors', 'Lỗi kiểm tra import')} className="space-y-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3"><p className="text-sm font-semibold text-destructive">{copy('Import blocked. Resolve every error:', 'Chưa thể import. Cần sửa tất cả lỗi:')}</p><p className="text-xs text-muted-foreground">{copy('All modules are imported together. Correct the reported rows, then upload again or refresh validation.', 'Toàn bộ module được import cùng nhau. Sửa các dòng được báo lỗi, sau đó tải lại hoặc kiểm tra lại.')}</p><ul className="space-y-2 text-xs">{preview.errors.map((problem, index) => <li key={index} className="break-words"><span className="font-semibold">{problem.moduleId || copy('Batch', 'Gói import')} · {copy('row', 'dòng')} {problem.row}</span><p className="mt-0.5">{problem.reason}</p></li>)}</ul></section> : <p role="status" className="text-xs text-success">{copy('The server reported no validation errors. Review the modules before continuing.', 'Máy chủ không báo lỗi kiểm tra. Hãy xem lại module trước khi tiếp tục.')}</p>}
     <ul aria-label={copy('Modules in import', 'Module trong gói import')} className="divide-y divide-border rounded-lg border border-border">{preview.modules.map(row => <li key={row.moduleId} className="space-y-1 p-3 text-xs"><p className="break-words text-sm font-medium">{row.module.title}</p><p className="break-all text-muted-foreground">{row.moduleId} · {copy('row', 'dòng')} {row.excelRow} · {row.lessons.length} {copy('lessons', 'bài học')}</p>{preview.ownedDuplicates.includes(row.moduleId) && <Badge variant="warning" className="whitespace-normal">{copy('Your existing module — creates a revision', 'Module bạn phụ trách bị trùng — sẽ tạo bản sửa')}</Badge>}</li>)}</ul>
     {preview.modules.flatMap(row => row.lessons.filter(lesson => lesson.type === 'VIDEO' && lesson.videoSource !== 'UPLOAD').map(lesson => { const key = `${row.moduleId}:${lesson.id}`; return <div key={key} className="space-y-2 rounded-lg border border-border p-3"><p className="break-words text-xs font-medium">{row.moduleId} · {lesson.title}</p><LessonVideo lesson={lesson} onSample={sample => { if (sample.playing && sample.duration > 0) setPlayed(old => old[key] === sample.duration ? old : { ...old, [key]: sample.duration }) }} /><Button size="sm" variant="outline" disabled={busy || !played[key]} onClick={() => void run(async () => { await moduleRequest('/videos/verify', 'POST', { provider: lesson.videoSource, url: lesson.videoUrl, played: true, durationSeconds: played[key] }); setPreview(await moduleRequest<ImportPreview>(`/imports/${preview.id}`)) })}>{copy('Verify video and refresh validation', 'Kiểm tra video và cập nhật kết quả')}</Button></div> }))}
    </>}
    {step === 2 && <section aria-label={copy('Confirm import', 'Xác nhận import')} className="space-y-3"><Heading level={3} size="card">{copy('Ready to import this batch?', 'Sẵn sàng import gói này?')}</Heading><p className="text-sm">{preview.modules.length} {copy('modules', 'module')} · {preview.modules.reduce((total, row) => total + row.lessons.length, 0)} {copy('lessons', 'bài học')}</p><p className="text-xs leading-relaxed text-muted-foreground">{preview.ownedDuplicates.length ? copy(`Your modules already exist: ${preview.ownedDuplicates.join(', ')}. Import creates new draft revisions that require approval.`, `Các module bạn phụ trách bị trùng: ${preview.ownedDuplicates.join(', ')}. Dữ liệu import sẽ trở thành bản chỉnh sửa mới và cần gửi duyệt lại.`) : copy('Create the new modules with all validated lessons.', 'Tạo các module mới cùng toàn bộ bài học đã kiểm tra.')}</p></section>}
   </>}
  </DialogBody>
  <DialogFooter className="mt-3 flex-wrap sm:justify-between"><div className="flex flex-wrap gap-2">{onClose && <Button size="sm" variant="outline" disabled={busy} onClick={onClose}>{copy('Close', 'Đóng')}</Button>}{step > 0 && <Button size="sm" variant="outline" disabled={busy} onClick={() => setStep(step - 1)}>{copy('Back', 'Quay lại')}</Button>}{preview && step === 1 && <Button size="sm" variant="outline" disabled={busy} onClick={() => { setPreview(null); setFileInfo(null); setStep(0) }}>{copy('Cancel batch', 'Hủy gói')}</Button>}</div><div className="flex flex-wrap gap-2">{step === 0 && preview && <Button size="sm" disabled={busy} onClick={() => setStep(1)}>{copy('Review results', 'Xem kết quả')}</Button>}{step === 1 && preview && <><Button size="sm" variant="outline" disabled={busy || preview.committed} onClick={() => void run(async () => setPreview(await moduleRequest<ImportPreview>(`/imports/${preview.id}`)))}>{copy('Validate again', 'Kiểm tra lại')}</Button><Button size="sm" disabled={busy || !!preview.errors.length || preview.committed} onClick={() => setStep(2)}>{copy('Continue import', 'Tiếp tục import')}</Button></>}{step === 2 && preview && <Button size="sm" disabled={busy || !!preview.errors.length || preview.committed} onClick={commit}>{copy('Confirm import', 'Xác nhận import')}</Button>}</div></DialogFooter>
 </Wrapper>
}
