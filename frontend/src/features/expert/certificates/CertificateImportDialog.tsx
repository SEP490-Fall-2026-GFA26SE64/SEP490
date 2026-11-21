import { useRef, useState } from 'react'
import { AlertTriangle, Award, CheckCircle2, Download, Upload } from 'lucide-react'
import { certificatePreview, submitCertificateImport, type CertificateImportRow } from '../../../shared/api/certificateAuthoringApi'
import { PathwayError } from '../../../shared/api/initialPathway'
import { Button } from '../../../shared/components/ui/Button'
import { Badge } from '../../../shared/components/ui/Badge'
import { Dialog, DialogBody, DialogHeader, DialogTitle, DialogFooter } from '../../../shared/components/ui/Dialog'
import { ManagementSection, ManagementSteps } from '../../../shared/components/ui/ManagementUi'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { useToast } from '../../../shared/hooks/useToast'
import { CertificateFacts } from './CertificateFacts'

export function CertificateImportDialog({ onClose, onSubmitted }: { onClose: () => void; onSubmitted: () => void }) {
 const { language } = useTranslation(), vi = language === 'vi', copy = (en: string, vn: string) => vi ? vn : en, { toast } = useToast()
 const [step, setStep] = useState(0), [file, setFile] = useState<File | null>(null), [rows, setRows] = useState<CertificateImportRow[]>([])
 const [choices, setChoices] = useState<Record<number, string>>({}), [reviewed, setReviewed] = useState(false)
 const [busy, setBusy] = useState(false), [error, setError] = useState(''), [uncertain, setUncertain] = useState(false)
 const mutation = useRef(false), key = useRef<string | null>(null)
 const sameScope = (a: CertificateImportRow, b: CertificateImportRow) => Boolean(a.input && b.input && a.input.skillId === b.input.skillId && a.input.knowledgeLevel === b.input.knowledgeLevel)
 const sameContent = (a: CertificateImportRow, b: CertificateImportRow) => sameScope(a,b) && ['name', 'description', 'referenceUrl'].every(k => String(a.input?.[k as 'name'] ?? '').trim() === String(b.input?.[k as 'name'] ?? '').trim())
 const repeat = (r: CertificateImportRow) => rows.some(other => other.row < r.row && !other.error && sameContent(other, r))
 const scopeClash = (r: CertificateImportRow) => rows.some(other => other.row !== r.row && !other.error && sameScope(other,r) && !sameContent(other,r))
 const choice = (r: CertificateImportRow) => r.alreadyExists ? 'keep' : repeat(r) ? 'skip' : choices[r.row] ?? (r.error || r.existing || r.openDraft || scopeClash(r) ? '' : 'import')
 function choose(r: CertificateImportRow, value: string) { setReviewed(false); setChoices(previous => { const next = { ...previous, [r.row]: value }; if (!r.error) for (const other of rows) if (other.row !== r.row && !other.error && sameScope(other, r)) next[other.row] = value === 'keep' ? 'keep' : 'skip'; return next }) }
 const selected = rows.filter(r => choice(r) === 'import' && !r.error && r.input)
 const isConflict = (r: CertificateImportRow) => !r.alreadyExists && !repeat(r) && !r.error && Boolean(r.openDraft || r.existing || scopeClash(r))
 const invalidRows = rows.filter(r => r.error), conflictRows = rows.filter(isConflict)
 const unresolvedConflicts = conflictRows.filter(r => !choice(r))
 const alreadyPresent = rows.filter(r => r.alreadyExists || repeat(r)).length
 const hasIssues = invalidRows.length > 0 || conflictRows.length > 0
 const localError = (message: string) => { const parts=message.split(' / '); return parts.length===2 ? parts[vi ? 1 : 0] : message }
 function failure(e: unknown) {
  if (e instanceof PathwayError && ['CERTIFICATE_CONFLICT_RELOAD','CERTIFICATE_OPEN_DRAFT_EXISTS','CERTIFICATE_DRAFT_CHANGED'].includes(e.code)) return copy('The certificate changed. Go back and check the file again to compare the current versions.', 'Chứng chỉ đã thay đổi. Quay lại kiểm tra file để so sánh các phiên bản hiện tại.')
  if (e instanceof PathwayError && ['CERTIFICATE_TEMPLATE_REQUIRED','CERTIFICATE_HEADERS_CHANGED'].includes(e.code)) return copy('Use the current five-column template and keep its headers unchanged.', 'Dùng mẫu năm cột hiện tại và giữ nguyên tên cột.')
  return copy('Unable to complete this action. Check the file or try again.', 'Chưa thể hoàn tất thao tác. Kiểm tra lại file hoặc thử lại.')
 }
 async function preview() { if (!file || mutation.current) return; mutation.current = true; setBusy(true); setError('')
  try { setRows(await certificatePreview(file)); setChoices({}); setReviewed(false); key.current=null; setStep(1) } catch (e) { setError(failure(e)) } finally { mutation.current = false; setBusy(false) }
 }
 async function submit() { if (mutation.current || !selected.length || !reviewed) return; mutation.current = true; setBusy(true); setError(''); key.current ??= crypto.randomUUID()
  try { const ids=await submitCertificateImport(selected,key.current); toast({variant:'success',description:copy(`${ids.length} certificates submitted to L&D.`,`Đã gửi ${ids.length} chứng chỉ cho L&D duyệt.`)}); onSubmitted(); onClose() }
  catch (e) { const ambiguous=e instanceof PathwayError && e.ambiguous; setUncertain(ambiguous); if(!ambiguous)key.current=null;setError(failure(e)) }
  finally { mutation.current=false;setBusy(false) }
 }
 return <Dialog open onOpenChange={open => {if(!open&&!busy&&!uncertain)onClose()}} className="module-management-dialog w-[96vw] max-w-6xl max-h-[90dvh]" ariaLabel={copy('Import certificates','Nhập chứng chỉ')}>
  <DialogHeader><DialogTitle><Award size={18} className="text-primary"/>{copy('Import certificates','Nhập chứng chỉ')}</DialogTitle></DialogHeader>
  <div className="mb-3 shrink-0"><ManagementSteps current={step} steps={[copy('Upload file','Chọn file'),copy('Check & resolve','Kiểm tra và xử lý'),copy('Review & submit','Xem lại và gửi duyệt')]}/></div>
  <DialogBody className="space-y-4 px-1 py-2">
   {step===0 && <ManagementSection title={copy('Certificate import file','File nhập chứng chỉ')}>
    <p className="text-sm text-foreground">{copy('Use the five-column template. Only the Certificates sheet is imported.','Dùng mẫu năm cột. Hệ thống chỉ nhập sheet Certificates.')}</p>
    <a href="/api/v1/expert/certificate-definitions/template" download="Certificate_Import_Template.xlsx" className="inline-flex items-center gap-2 font-semibold text-primary underline"><Download size={16}/>{copy('Download template','Tải file mẫu')}</a>
    <input aria-label={copy('Certificate Excel file','File Excel chứng chỉ')} type="file" accept=".xlsx" disabled={busy} className="block w-full rounded-lg border border-input p-3 text-sm" onChange={e=>{setFile(e.target.files?.[0]??null);setError('')}}/>
    <p className="text-xs text-foreground">{copy('XLSX · Up to 500 rows / 5 MB. No formulas.','XLSX · Tối đa 500 dòng / 5 MB. Không dùng công thức.')}</p>
   </ManagementSection>}
   {step===1 && <><div role="status" aria-live="polite" className={`space-y-2 rounded-lg border p-4 ${hasIssues ? 'border-destructive/50 bg-destructive/5' : 'border-success/40 bg-success/5'}`}>
    <h3 className={`flex items-center gap-2 font-semibold ${hasIssues ? 'text-destructive' : 'text-success'}`}>{hasIssues ? <AlertTriangle size={18}/> : <CheckCircle2 size={18}/>} {hasIssues ? copy('Check completed — issues found', 'Đã kiểm tra — có vấn đề cần xử lý') : copy('Check passed — no errors or conflicts', 'Kiểm tra thành công — không có lỗi hoặc xung đột')}</h3>
    {invalidRows.length > 0 && <p className="text-sm font-medium text-destructive">{copy(`Invalid rows: ${invalidRows.map(r=>r.row).join(', ')}. Correct the file or explicitly exclude these rows.`, `Dòng lỗi: ${invalidRows.map(r=>r.row).join(', ')}. Sửa file hoặc chủ động bỏ các dòng này.`)}</p>}
    {conflictRows.length > 0 && <p className="text-sm font-medium text-destructive">{copy(`Conflicts at rows: ${conflictRows.map(r=>r.row).join(', ')}. ${unresolvedConflicts.length} still need a choice.`, `Xung đột tại dòng: ${conflictRows.map(r=>r.row).join(', ')}. Còn ${unresolvedConflicts.length} dòng cần chọn phiên bản.`)}</p>}
    <p className="text-sm text-foreground">{copy(`${selected.length} certificates included for review in this import.`, `${selected.length} chứng chỉ được đưa vào lượt gửi duyệt này.`)}{alreadyPresent > 0 && ' '+copy(`${alreadyPresent} identical certificates already exist and will be skipped.`, `${alreadyPresent} chứng chỉ giống hệt đã có và sẽ được bỏ qua.`)}</p>
   </div>
    {rows.map(r=>{
     const exists=r.alreadyExists||repeat(r), previous=r.openDraft?.input??r.existing
     const conflict=isConflict(r)
     const changes=previous&&r.input ? [['name',copy('Certificate name','Tên chứng chỉ')],['description',copy('Description','Mô tả')],['referenceUrl',copy('Reference URL','Liên kết tham chiếu')]].filter(([k])=>String(previous[k as 'name']??'').trim()!==String(r.input![k as 'name']??'').trim()).map(([,label])=>label) : []
     return <section key={r.row} className={`space-y-4 rounded-xl border-2 p-4 ${conflict?'border-destructive/50 bg-destructive/5':exists?'border-border bg-muted/20':r.error?'border-destructive/50':'border-primary/25 bg-card'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-foreground">{copy('Row','Dòng')} {r.row} · {r.skillName}</h3><Badge className={conflict ? 'font-semibold' : undefined} variant={conflict?'destructive':r.error?'destructive':'outline'}>{conflict?copy('Conflict · changed content','Xung đột · nội dung khác'):exists?copy('Already exists','Đã có'):r.error?copy('Invalid row','Dòng lỗi'):copy('New certificate','Chứng chỉ mới')}</Badge></div>
      {r.error ? <><p role="alert" className="font-medium text-destructive">{localError(r.error)}</p><Button size="sm" variant="outline" disabled={busy} onClick={()=>choose(r,choice(r)==='skip'?'':'skip')}>{choice(r)==='skip'?copy('Row skipped','Đã bỏ qua dòng'):copy('Skip invalid row','Bỏ qua dòng lỗi')}</Button></>
       : exists ? <><div className="flex items-center gap-2 font-semibold text-foreground"><CheckCircle2 size={18} className="text-primary"/>{copy('Already exists — no new submission','Đã có — không gửi lại')}</div><p className="font-medium text-foreground">{r.input?.name}</p><p className="text-sm text-foreground">{copy('The certificate has identical content, including any version awaiting L&D review.','Chứng chỉ có nội dung giống hệt, kể cả bản đang chờ L&D duyệt.')}</p></>
       : previous && r.input ? <><div className="flex items-start gap-2 font-semibold text-foreground"><AlertTriangle size={18} className="shrink-0 text-warning"/><p>{copy('Same Skill and level, different content. Choose one version.','Cùng kỹ năng và mức kiến thức nhưng khác nội dung. Chọn một phiên bản.')}</p></div><p className="text-sm font-semibold text-primary">{copy('Changed fields: ','Các trường thay đổi: ')}{changes.join(', ')}</p><div className="grid gap-4 md:grid-cols-2">{(['keep','import'] as const).map(value=><section key={value} className={`space-y-4 rounded-lg border-2 p-4 ${choice(r)===value?'border-primary bg-secondary/40':value==='import'?'border-warning/70 bg-card':'border-border bg-card'}`}><h4 className="border-b border-border pb-2 text-base font-bold text-primary">{value==='keep'?copy('Existing certificate','Chứng chỉ hiện có'):copy('Imported certificate','Chứng chỉ trong file')}</h4><CertificateFacts input={value==='keep'?{...previous,description:previous.description??''}:r.input!} skillName={r.skillName} version={value==='keep'?String(r.openDraft?.revision??r.existing?.version??''):undefined} versionLabel={r.openDraft?copy('Content revision','Phiên bản nội dung'):copy('Published version','Phiên bản đã phát hành')}/><label className="flex cursor-pointer items-start gap-2 rounded-lg border border-primary/20 bg-secondary/40 p-3 font-semibold text-foreground"><input type="radio" className="mt-1 accent-primary" name={`row-${r.row}`} checked={choice(r)===value} disabled={busy} onChange={()=>choose(r,value)}/>{value==='keep'?copy('Keep existing','Giữ bản hiện có'):copy('Use imported and submit for review','Dùng bản trong file và gửi duyệt')}</label></section>)}</div><p className="text-sm text-foreground">{r.openDraft?copy('Replacing this pending certificate creates a new revision for L&D to review.','Thay bản đang chờ duyệt sẽ tạo phiên bản nội dung mới để L&D xem lại.'):copy('Existing pathways keep the original certificate. The replacement applies to new pathways after approval and publication.','Lộ trình đã tạo giữ chứng chỉ gốc. Bản thay thế áp dụng cho lộ trình mới sau khi được duyệt và phát hành.')}</p></>
       : r.input && <><CertificateFacts input={r.input} skillName={r.skillName}/>{conflict&&<p className="font-medium text-primary">{copy('Another row in this file uses the same Skill and level. Choose one candidate.','Dòng khác trong file dùng cùng kỹ năng và mức kiến thức. Chọn một bản muốn nhập.')}</p>}<div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/20 p-3"><Button size="sm" variant="outline" disabled={busy} onClick={()=>choose(r,choice(r)==='import'?'skip':'import')}>{choice(r)==='import'?copy('Exclude','Loại ra'):copy('Include','Thêm vào')}</Button><p role="status" aria-live="polite" className="text-sm font-medium text-foreground">{choice(r)==='import' ? choices[r.row]==='import' ? copy('Included again. This certificate will be submitted for review in this import.', 'Đã thêm lại. Chứng chỉ này sẽ được gửi duyệt trong lượt nhập này.') : copy('This certificate will be submitted for review in this import.', 'Chứng chỉ này sẽ được gửi duyệt trong lượt nhập này.') : copy('Excluded. This certificate will not be submitted for review in this import.', 'Đã loại ra. Chứng chỉ này sẽ không được gửi duyệt trong lượt nhập này.')}</p></div></>}
     </section>
    })}
   </>}
   {step===2 && <><div className="rounded-lg border border-primary/30 bg-secondary/40 p-4"><h3 className="font-semibold text-primary">{copy(`${selected.length} certificates to submit`,`${selected.length} chứng chỉ sẽ gửi duyệt`)}</h3><p className="mt-1 text-sm text-foreground">{copy('Review the content below. Submission creates drafts and sends them to L&D; it does not publish them.','Xem lại nội dung bên dưới. Khi xác nhận, hệ thống tạo bản nháp và gửi L&D duyệt; chưa phát hành chứng chỉ.')}</p></div>{selected.map(r=><section key={r.row} className="rounded-xl border border-border bg-card p-4"><CertificateFacts input={r.input!} skillName={r.skillName}/></section>)}<label className="flex items-start gap-2 rounded-lg border border-primary/30 bg-secondary/30 p-4 font-semibold text-foreground"><input type="checkbox" className="mt-1 accent-primary" disabled={busy||uncertain} checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>{copy('I have reviewed all certificates listed above.','Tôi đã xem lại toàn bộ chứng chỉ trong danh sách trên.')}</label></>}
   {error&&<p role="alert" className="rounded-lg border border-destructive/30 p-3 text-destructive">{error}</p>}{uncertain&&<p role="status" className="text-sm text-foreground">{copy('The result is uncertain. Retry this same submission to avoid duplicates.','Chưa xác định được kết quả. Gửi lại đúng yêu cầu này để tránh tạo trùng.')}</p>}
  </DialogBody>
  <DialogFooter><Button variant="outline" disabled={busy||uncertain} onClick={onClose}>{copy('Cancel','Hủy')}</Button>{step>0&&<Button variant="outline" disabled={busy||uncertain} onClick={()=>{setStep(s=>s-1);setError('')}}>{copy('Back','Quay lại')}</Button>}
   {step===0?<Button disabled={!file||file.size>5242880||!file.name.toLowerCase().endsWith('.xlsx')} isLoading={busy} onClick={()=>void preview()}><Upload size={16}/>{copy('Check file','Kiểm tra file')}</Button>:step===1?<Button disabled={busy||rows.some(r=>!choice(r))} onClick={()=>{if(!selected.length)onClose();else{setReviewed(false);setStep(2)}}}>{selected.length?copy(`Review ${selected.length} certificates`,`Xem lại ${selected.length} chứng chỉ`):copy('Finish — nothing new to import','Hoàn tất — không có nội dung mới')}</Button>:<Button isLoading={busy} disabled={!selected.length||!reviewed} onClick={()=>void submit()}>{uncertain?copy('Retry same submission','Gửi lại yêu cầu'):copy(`Confirm & Submit (${selected.length})`,`Xác nhận và Gửi duyệt (${selected.length})`)}</Button>}
  </DialogFooter>
 </Dialog>
}
