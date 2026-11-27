import { useRef, useState } from 'react'
import { editCertificate, resubmitCertificate, submitCertificates, type CertificateDirectory, type CertificateDraft, type CertificateInput } from '../../../shared/api/certificateAuthoringApi'
import type { CertificateDefinition } from '../../../shared/api/certificates'
import type { KnowledgeLevel } from '../../../shared/api/requirementPathway'
import { PathwayError } from '../../../shared/api/initialPathway'
import { Button } from '../../../shared/components/ui/Button'
import { Input } from '../../../shared/components/ui/Input'
import { Combobox } from '../../../shared/components/ui/Combobox'
import { Dialog, DialogBody, DialogHeader, DialogTitle, DialogFooter } from '../../../shared/components/ui/Dialog'
import { ManagementSection, ManagementSteps } from '../../../shared/components/ui/ManagementUi'
import { FormField } from '../../../shared/components/ui/FormField'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { useToast } from '../../../shared/hooks/useToast'
export function CertificateEditor({ directory, draft, previous, onClose, onSubmitted }: { directory: CertificateDirectory; draft?: CertificateDraft; previous?: CertificateDefinition; onClose: () => void; onSubmitted: () => void }) {
 const { language, t } = useTranslation(), copy = (en: string, vn: string) => language === 'vi' ? vn : en, { toast } = useToast()
 const [step, setStep] = useState(0), [reviewed, setReviewed] = useState(false), [useNew, setUseNew] = useState(false)
 const [form, setForm] = useState<CertificateInput>(draft?.input ?? { skillId: previous?.skillId ?? '', knowledgeLevel: previous?.knowledgeLevel ?? 'ADVANCED', expectedSkillVersion: previous?.skillVersion ?? '', name: previous?.name ?? '', description: previous?.description ?? '', referenceUrl: previous?.referenceUrl ?? '', replacesDefinitionId: previous?.id ?? null })
 const [hasSaved, setHasSaved] = useState(false)
 const [busy, setBusy] = useState(false), [error, setError] = useState(''), [uncertain, setUncertain] = useState(false)
 const saved = useRef<CertificateDraft | null>(null), key = useRef<string | null>(null), mutation = useRef(false)
 const skill = directory.skills.find(s => s.skillId === form.skillId), existing = directory.published.find(d => d.skillId === form.skillId && d.knowledgeLevel === form.knowledgeLevel)
 const blocked = busy || uncertain || hasSaved
 const valid = (() => { try { const u = new URL(form.referenceUrl); return Boolean(skill && skill.levels.includes(form.knowledgeLevel) && form.name.trim() && u.protocol === 'https:' && !u.username && !u.password) } catch { return false } })()
 function patch(value: Partial<CertificateInput>) { setForm(f => ({ ...f, ...value })); setReviewed(false) }
 async function save(submit: boolean) { if (mutation.current || !valid || submit && !reviewed || !draft && existing && !useNew) return; mutation.current = true; setBusy(true); setError('')
  try { const input = { ...form, name: form.name.trim(), expectedSkillVersion: skill!.version, replacesDefinitionId: existing?.id ?? null }
   if (draft) { const updated = saved.current ?? await editCertificate(draft, input); saved.current = updated; setHasSaved(true); if (submit) await resubmitCertificate(updated) }
   else { key.current ??= crypto.randomUUID(); await submitCertificates([input], key.current) }
   toast({ variant: 'success', description: submit ? copy('Certificate submitted to L&D.', 'Đã gửi chứng chỉ cho L&D duyệt.') : copy('Draft saved.', 'Đã lưu bản nháp.') }); onSubmitted(); onClose()
  } catch (e) { const ambiguous = e instanceof PathwayError && e.ambiguous; setUncertain(ambiguous); if (!ambiguous) key.current = null; setError(e instanceof Error ? e.message : String(e)) }
  finally { mutation.current = false; setBusy(false) }
 }
 return <Dialog open onOpenChange={v => { if (!v && !blocked) onClose() }} size="wide" className="module-management-dialog h-[88dvh]" ariaLabel={copy('Certificate details', 'Thông tin chứng chỉ')}>
  <DialogHeader><DialogTitle>{draft ? copy('Edit certificate draft', 'Sửa bản nháp chứng chỉ') : copy('Create certificate', 'Tạo chứng chỉ')}</DialogTitle></DialogHeader>
  <div className="mb-3 shrink-0"><ManagementSteps current={step} steps={[copy('Skill & level', 'Skill & mức'), copy('Certificate details', 'Thông tin chứng chỉ'), copy('Review & submit', 'Xem lại & gửi duyệt')]} /></div>
  <DialogBody className="space-y-4 px-1 py-2">
   {draft?.reason && <p className="rounded-lg border border-destructive/30 p-3 text-destructive">{draft.reason}</p>}
   {step === 0 && <ManagementSection title={copy('Certificate-mode requirement', 'Yêu cầu dùng Certificate')}><FormField label={copy('Select skill & level', 'Chọn skill & mức')}><Combobox inlineDropdown wrapOptions placeholder={copy('Search & select skill & level...', 'Tìm và chọn skill & mức...')} searchPlaceholder={copy('Search by skill name or level...', 'Tìm theo tên skill hoặc mức...')} emptyMessage={copy('No matching skills found.', 'Không tìm thấy skill phù hợp.')} clearLabel={copy('Clear selection', 'Xóa lựa chọn')} disabled={blocked || Boolean(draft)} value={form.skillId + ':' + form.knowledgeLevel} options={directory.skills.flatMap(s => s.levels.map(l => ({ value: s.skillId + ':' + l, label: s.skillName + ' · ' + t('knowledgeLevel.' + l) })))} onChange={v => { const split = v.lastIndexOf(':'); const s = directory.skills.find(s => s.skillId === v.slice(0, split)); patch({ skillId: s?.skillId ?? '', expectedSkillVersion: s?.version ?? '', knowledgeLevel: v.slice(split + 1) as KnowledgeLevel }); setUseNew(false) }} /></FormField></ManagementSection>}
   {step === 1 && <ManagementSection title={copy('Certificate fields', 'Thông tin chứng chỉ')}>
    <FormField label={copy('Certificate name', 'Tên chứng chỉ')}><Input required maxLength={300} disabled={blocked} value={form.name} onChange={e => patch({ name: e.target.value })} /></FormField>
    <FormField label={copy('Description', 'Mô tả')}><textarea maxLength={6000} rows={5} disabled={blocked} className="w-full rounded-lg border border-input bg-background p-3 text-body-sm" value={form.description} onChange={e => patch({ description: e.target.value })} /></FormField>
    <FormField label={copy('Reference URL (HTTPS)', 'URL tham chiếu (HTTPS)')}><Input type="url" required maxLength={2048} disabled={blocked} value={form.referenceUrl} onChange={e => patch({ referenceUrl: e.target.value })} /></FormField>
   </ManagementSection>}
   {step === 2 && <>
    {existing && !draft && <><p className="text-body-sm">{copy('This Skill/level already has a certificate. Compare both and choose.', 'Skill và mức này đã có chứng chỉ. So sánh hai bản và chọn.')}</p><div className="grid gap-4 md:grid-cols-2"><ManagementSection title={copy('Existing certificate', 'Chứng chỉ hiện có')}><p className="font-semibold">{existing.name}</p><p className="whitespace-pre-wrap break-words">{existing.description || '—'}</p><a href={existing.referenceUrl} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline">{existing.referenceUrl}</a><Button disabled={blocked} variant="outline" onClick={onClose}>{copy('Keep existing', 'Giữ bản hiện có')}</Button></ManagementSection>
     <ManagementSection title={copy('Proposed certificate', 'Chứng chỉ đề xuất')}><p className="font-semibold">{form.name}</p><p className="whitespace-pre-wrap break-words">{form.description || '—'}</p><a href={form.referenceUrl} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline">{form.referenceUrl}</a><label className="flex items-center gap-2"><input type="checkbox" disabled={blocked} checked={useNew} onChange={e => setUseNew(e.target.checked)} />{copy('Use proposed version and submit', 'Chọn bản đề xuất để gửi duyệt')}</label></ManagementSection></div></>}
    {(!existing || draft) && <ManagementSection title={skill?.skillName + ' · ' + t('knowledgeLevel.' + form.knowledgeLevel)}><p className="font-semibold">{form.name}</p><p className="whitespace-pre-wrap break-words">{form.description || '—'}</p><a href={form.referenceUrl} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline">{form.referenceUrl}</a></ManagementSection>}
    <p className="text-caption text-muted-foreground">{copy('Published replacements apply only to new pathways. Existing pathways keep their certificate.', 'Bản thay thế được duyệt chỉ áp dụng cho pathway mới. Pathway đã tạo giữ chứng chỉ cũ.')}</p>
    <label className="flex items-center gap-2"><input type="checkbox" disabled={blocked} checked={reviewed} onChange={e => setReviewed(e.target.checked)} />{copy('I reviewed this certificate before submission', 'Tôi đã xem lại chứng chỉ trước khi gửi duyệt')}</label>
   </>}
   {error && <p role="alert" className="text-destructive">{error}</p>}{uncertain && <p role="status">{copy('Result uncertain; retry the same command.', 'Chưa xác định kết quả; hãy gửi lại đúng yêu cầu.')}</p>}
  </DialogBody>
  <DialogFooter><Button variant="outline" disabled={busy || uncertain} onClick={onClose}>{copy('Close', 'Đóng')}</Button>{step > 0 && <Button variant="outline" disabled={blocked} onClick={() => setStep(s => s - 1)}>{copy('Back', 'Quay lại')}</Button>}
   {step < 2 ? <Button disabled={blocked || (step === 0 ? !skill : !valid)} onClick={() => setStep(s => s + 1)}>{copy('Continue', 'Tiếp tục')}</Button> : <>{draft && !uncertain && <Button variant="outline" isLoading={busy} onClick={() => void save(false)}>{copy('Save draft', 'Lưu nháp')}</Button>}<Button isLoading={busy} disabled={!reviewed || !draft && Boolean(existing) && !useNew} onClick={() => void save(true)}>{uncertain ? copy('Retry same submission', 'Gửi lại yêu cầu') : copy('Confirm & Submit', 'Xác nhận & Gửi duyệt')}</Button></>}
  </DialogFooter>
 </Dialog>
}
