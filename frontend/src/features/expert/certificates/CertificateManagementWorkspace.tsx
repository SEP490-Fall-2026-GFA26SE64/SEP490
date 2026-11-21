import { CertificateFacts } from './CertificateFacts'
import type { ReactNode } from 'react'
import { useContext, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Award, CheckCheck, CheckCircle2, Clock, Eye, Layers, Pencil, Plus, RefreshCw, Search, Upload } from 'lucide-react'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { certificateDirectory, decideCertificates, markCertificateViewed, type CertificateDraft, type CertificateInput } from '../../../shared/api/certificateAuthoringApi'
import type { CertificateDefinition } from '../../../shared/api/certificates'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { useToast } from '../../../shared/hooks/useToast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { Button } from '../../../shared/components/ui/Button'
import { Input } from '../../../shared/components/ui/Input'
import { Select } from '../../../shared/components/ui/Select'
import { Badge } from '../../../shared/components/ui/Badge'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { CopyableId } from '../../../shared/components/ui/CopyableId'
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { ManagementSection } from '../../../shared/components/ui/ManagementUi'
import { PageLoader } from '../../../shared/components/ui/PageLoader'
import { CertificateImportDialog } from './CertificateImportDialog'
import { CertificateEditor } from './CertificateEditor'
type Row = { id: string; name: string; skillId: string; skillName: string; level: string; state: string; input: CertificateInput; author: string; version: string; draft?: CertificateDraft; published?: CertificateDefinition }
export function CertificateManagementWorkspace({ manager = false, navigation, evidenceReview }: { manager?: boolean; navigation?: ReactNode; evidenceReview?: ReactNode }) {
 const identity = useContext(WorkspaceSessionContext)?.identity, { language, t } = useTranslation(), vi = language === 'vi', copy = (en: string, vn: string) => vi ? vn : en
 const { toast } = useToast(), client = useQueryClient(), [params] = useSearchParams()
 const queryKey = ['certificate-authoring', identity?.organizationId, identity?.accountId, manager]
 const query = useQuery({ queryKey, queryFn: ({ signal }) => certificateDirectory(manager, signal), refetchInterval: q => q.state.data?.drafts.some(d => d.state === 'PUBLISHING') ? 1000 : 10000, retry: false })
 const [search, setSearch] = useState(''), [status, setStatus] = useState(params.get('status') ?? ''), [skill, setSkill] = useState(''), [level, setLevel] = useState(''), [page, setPage] = useState(1)
 const [importOpen, setImportOpen] = useState(false), [editor, setEditor] = useState<{ draft?: CertificateDraft; previous?: CertificateDefinition } | null>(null)
 const [detail, setDetail] = useState<Row | null>(null)
 const [busy, setBusy] = useState(false), [batchOpen, setBatchOpen] = useState(false), [batchConfirm, setBatchConfirm] = useState(false), [error, setError] = useState('')
 const [batchExpert, setBatchExpert] = useState(''), [batchSkill, setBatchSkill] = useState('')
 const mutation = useRef(false)
 const data = query.data
 const refresh = () => void client.invalidateQueries({ queryKey: ['certificate-authoring'] })
 const publishedIds = new Set(data?.published.map(p => p.id))
 const states: Record<string, string> = { DRAFT: copy('Draft', 'Bản nháp'), SUBMITTED: copy('Submitted', 'Chờ duyệt'), REJECTED: copy('Rejected', 'Bị từ chối'), PUBLISHING: copy('Approved · publishing', 'Đã duyệt · đang phát hành'), PUBLISH_FAILED: copy('Action needed', 'Cần xử lý'), PUBLISHED: copy('Published', 'Đã phát hành'), SUPERSEDED: copy('Previous version', 'Bản trước') }
 const draftDefinitionIds = new Set(data?.drafts.map(d => d.definitionId).filter(Boolean))
 const rows: Row[] = (data?.drafts ?? []).map(d => ({ id: d.id, name: d.input.name, skillId: d.input.skillId, skillName: d.skillName, level: d.input.knowledgeLevel, state: d.state === 'PUBLISHED' && !publishedIds.has(d.definitionId ?? '') ? 'SUPERSEDED' : d.state, input: d.input, author: d.authorId, version: String(data?.published.find(p => p.id === d.definitionId)?.version ?? d.revision), draft: d }))
 for (const p of data?.published ?? []) if (!draftDefinitionIds.has(p.id)) rows.push({ id: p.id, name: p.name, skillId: p.skillId, skillName: p.skillName, level: p.knowledgeLevel, state: 'PUBLISHED', input: { skillId: p.skillId, knowledgeLevel: p.knowledgeLevel, name: p.name, description: p.description ?? '', referenceUrl: p.referenceUrl, expectedSkillVersion: p.skillVersion, replacesDefinitionId: p.id }, author: p.authoredBy, version: p.version, published: p })
 rows.sort((a, b) => Number(b.state === 'SUBMITTED') - Number(a.state === 'SUBMITTED') || a.name.localeCompare(b.name, language))
 const filtered = rows.filter(r => (!status || r.state === status) && (!skill || r.skillId === skill) && (!level || r.level === level) && `${r.name} ${r.id} ${r.skillName}`.toLowerCase().includes(search.toLowerCase()))
 const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 10))), visible = filtered.slice((currentPage - 1) * 10, currentPage * 10)
 const pending = rows.filter(r => r.draft && r.state === 'SUBMITTED')
 const batchVisible = pending.filter(r => (!batchExpert || r.author === batchExpert) && (!batchSkill || r.skillId === batchSkill))
 const batch = batchVisible.map(r => r.draft!)
 const linkId = params.get('certificate'), linkStatus = params.get('status'), [appliedLink, setAppliedLink] = useState('')
 if (query.data && linkId && appliedLink !== linkId) {
  const d = query.data.drafts.find(d => d.id === linkId)
  if (d) { setDetail({ id: d.id, name: d.input.name, skillId: d.input.skillId, skillName: d.skillName, level: d.input.knowledgeLevel, state: d.state, input: d.input, author: d.authorId, version: String(data?.published.find(p => p.id === d.definitionId)?.version ?? d.revision), draft: d }); setAppliedLink(linkId) }
 }
 const [previousStatusLink, setPreviousStatusLink] = useState(linkStatus)
 if (previousStatusLink !== linkStatus) { setPreviousStatusLink(linkStatus); if (linkStatus) { setStatus(linkStatus); setPage(1) } }
 async function approveBatch() { if (mutation.current || !batchConfirm || !batch.length || batch.length > 100) return; mutation.current = true; setBusy(true); setError('')
  try { for (const draft of batch) await markCertificateViewed(draft); await decideCertificates(batch.map(d => ({ id: d.id, revision: d.revision, decision: 'APPROVE', reason: '' }))); toast({ variant: 'success', description: copy(`${batch.length} certificates approved. Publication is being completed.`, `Đã duyệt ${batch.length} chứng chỉ. Hệ thống đang hoàn tất phát hành.`) }); setDetail(null); setBatchOpen(false); setBatchConfirm(false); refresh() }
  catch (e) { const message = e instanceof Error ? e.message : String(e); setError(message); setBatchConfirm(false); toast({ variant: 'destructive', description: message }); refresh() }
  finally { mutation.current = false; setBusy(false) }
 }
 function open(r: Row) { setDetail(r); setError('') }
 const shownDetail = detail ? rows.find(r => r.id === detail.id) ?? detail : null
 const statusBadge = (state: string) => <Badge className={state === 'SUBMITTED' || state === 'PUBLISHING' ? 'border-warning/60 text-foreground' : undefined} variant={state === 'PUBLISHED' ? 'success' : ['REJECTED', 'PUBLISH_FAILED'].includes(state) ? 'destructive' : ['SUBMITTED', 'PUBLISHING', 'DRAFT'].includes(state) ? 'warning' : 'outline'}>{states[state] ?? state}</Badge>
 const versionLabel = (r: Row) => r.published || data?.published.some(p => p.id === r.draft?.definitionId) ? copy('Published version', 'Phiên bản đã phát hành') : copy('Content revision', 'Phiên bản nội dung')
 const person = (id: string) => data?.experts.find(e => e.id === id)?.name ?? id
 if (query.isPending) return <PageLoader />
 if (query.isError || !data || data.manager !== manager) return <Card><CardContent className="space-y-4 pt-6"><p role="alert">{query.error instanceof Error ? query.error.message : copy('Certificate access unavailable.', 'Không thể truy cập chứng chỉ.')}</p><Button onClick={() => void query.refetch()}>{copy('Retry', 'Thử lại')}</Button></CardContent></Card>
 return <div className="space-y-7">
  {!manager && <div className="flex flex-wrap justify-end gap-3"><><Button variant="outline" onClick={() => setImportOpen(true)}><Upload size={16} />{copy('Import certificates', 'Nhập chứng chỉ')}</Button><Button onClick={() => setEditor({})}><Plus size={16} />{copy('Create certificate', 'Tạo chứng chỉ')}</Button></></div>}
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
   <StatCard title={copy('Total certificates', 'Tổng chứng chỉ')} value={rows.filter(r => r.state !== 'SUPERSEDED').length} icon={<Award size={18} />} valueClassName="text-primary" description={copy('Across your workspace', 'Trong tổ chức')} />
   <StatCard title={copy('Published certificates', 'Chứng chỉ đã phát hành')} value={data.published.length} icon={<CheckCircle2 size={18} className="text-success" />} valueClassName="text-success" description={copy('Available for new pathways', 'Dùng cho pathway tạo mới')} />
   <StatCard title={copy('Pending review', 'Chờ duyệt')} value={rows.filter(r => r.state === 'SUBMITTED').length} icon={<Clock size={18} className="text-warning" />} valueClassName="text-warning" className="cursor-pointer hover:border-warning" role="button" tabIndex={0} onClick={() => { setStatus('SUBMITTED'); setPage(1) }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStatus('SUBMITTED'); setPage(1) } }} description={copy('Click to filter pending review', 'Bấm để lọc các mục chờ duyệt')} />
   <StatCard title={copy('Micro-skills covered', 'Skill đã có chứng chỉ')} value={new Set(data.published.map(d => d.skillId)).size} icon={<Layers size={18} />} valueClassName="text-primary" description={copy('Skills in the certificate catalog', 'Skill trong danh mục chứng chỉ')} />
  </div>
  {navigation}
  {evidenceReview ?? <Card className="overflow-hidden"><CardHeader className="space-y-5 border-b border-border"><div><CardTitle className="flex items-center gap-2"><Award size={18} className="text-primary" />{copy('Certificate Directory', 'Danh mục chứng chỉ')}</CardTitle><CardDescription>{copy('Browse certificates by MicroSkill, track revisions, and manage review status.', 'Tra cứu chứng chỉ theo Skill, theo dõi phiên bản và trạng thái duyệt.')}</CardDescription></div>
   <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1.5fr_auto]">
    <label className="space-y-2 text-body-sm font-medium">{copy('Search name or ID', 'Tìm tên hoặc mã')}<Input leftIcon={<Search size={16} />} value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder={copy('Search name or ID…', 'Tìm tên hoặc mã…')} /></label>
    <div className="space-y-2"><p className="text-body-sm font-medium">{copy('Status', 'Trạng thái')}</p><Select aria-label={copy('Status', 'Trạng thái')} value={status} onChange={v => { setStatus(v); setPage(1) }} options={[{ value: '', label: copy('All', 'Tất cả') }, ...Object.entries(states).map(([value, label]) => ({ value, label }))]} /></div>
    <div className="space-y-2"><p className="text-body-sm font-medium">{copy('Knowledge level', 'Mức kiến thức')}</p><Select aria-label={copy('Knowledge level', 'Mức kiến thức')} value={level} onChange={v => { setLevel(v); setPage(1) }} options={[{ value: '', label: copy('All', 'Tất cả') }, ...['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'].map(value => ({ value, label: t('knowledgeLevel.' + value) }))]} /></div>
    <div className="space-y-2"><p className="text-body-sm font-medium">Skill</p><Select aria-label="Skill" value={skill} onChange={v => { setSkill(v); setPage(1) }} options={[{ value: '', label: copy('All', 'Tất cả') }, ...data.skills.map(s => ({ value: s.skillId, label: s.skillName }))]} /></div>
    <div className="flex items-center gap-2 self-end">{manager && <Button variant="outline" disabled={!pending.length || busy} onClick={() => { setBatchExpert(''); setBatchSkill(''); setBatchConfirm(false); setError(''); setBatchOpen(true) }}><CheckCheck size={16} />{copy('Batch review', 'Duyệt hàng loạt')} ({pending.length})</Button>}<Button variant="outline" aria-label={copy('Refresh', 'Tải lại')} onClick={refresh}><RefreshCw size={16} /></Button></div>
   </div>
  </CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-left text-body-sm"><thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr>{[copy('Certificate', 'Chứng chỉ'), copy('Responsible Expert', 'Expert phụ trách'), 'MicroSkill', copy('Knowledge level', 'Mức kiến thức'), copy('Reference URL', 'URL tham chiếu'), copy('Status', 'Trạng thái'), copy('Actions', 'Thao tác')].map(h => <th key={h} className="px-3 py-3 font-semibold last:text-right">{h}</th>)}</tr></thead>
   <tbody className="divide-y divide-border">{visible.map(r => <tr key={r.id} className="hover:bg-muted/20">
    <td className="min-w-64 px-3 py-4"><p className="font-semibold">{r.name}</p><CopyableId code={r.id} compact vi={vi} entity={copy('certificate ID', 'mã chứng chỉ')} /><Badge variant="outline" className="mt-2 text-primary">{versionLabel(r)} {r.version}</Badge></td><td className="max-w-48 break-words px-3 py-4">{person(r.author)}</td><td className="px-3 py-4">{r.skillName}</td><td className="px-3 py-4">{t('knowledgeLevel.' + r.level)}</td><td className="max-w-52 px-3 py-4"><a className="whitespace-nowrap font-medium text-primary underline" href={r.input.referenceUrl} target="_blank" rel="noopener noreferrer">{new URL(r.input.referenceUrl).hostname}</a></td>
    <td className="px-3 py-4">{statusBadge(r.state)}</td><td className="px-3 py-4"><div className="flex justify-end gap-2"><Button variant="outline" size="icon" aria-label={copy('View certificate', 'Xem chứng chỉ')} onClick={() => open(r)}><Eye size={16} className="text-primary" /></Button>{!manager && (r.published || r.draft?.state === 'PUBLISHED' && publishedIds.has(r.draft.definitionId ?? '') || r.draft && ['DRAFT', 'REJECTED', 'PUBLISH_FAILED'].includes(r.state) && r.author === identity?.accountId) && <Button variant="outline" size="icon" aria-label={copy('Edit certificate', 'Sửa chứng chỉ')} onClick={() => setEditor(r.draft && r.state !== 'PUBLISHED' ? { draft: r.draft } : { previous: data.published.find(p => p.id === (r.draft?.definitionId ?? r.id)) })}><Pencil size={16} /></Button>}</div></td>
   </tr>)}{!visible.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">{copy('No certificates match your filters.', 'Không có chứng chỉ phù hợp bộ lọc.')}</td></tr>}</tbody></table></div>
   <div className="border-t border-border p-4"><Pagination currentPage={currentPage} totalPages={Math.max(1, Math.ceil(filtered.length / 10))} totalItems={filtered.length} pageSize={10} onPageChange={setPage} locale={vi ? 'vi' : 'en'} /></div>
  </CardContent></Card>}
  {importOpen && <CertificateImportDialog onClose={() => setImportOpen(false)} onSubmitted={refresh} />}
  {editor && <CertificateEditor directory={data} {...editor} onClose={() => setEditor(null)} onSubmitted={refresh} />}
  {shownDetail && <Dialog open onOpenChange={v => { if (!v) setDetail(null) }} size="wide" className="module-management-dialog max-w-3xl max-h-[90dvh]" ariaLabel={copy('Certificate details', 'Chi tiết chứng chỉ')}>
   <DialogHeader><DialogTitle><Award size={18} className="text-primary" />{copy('Certificate details', 'Chi tiết chứng chỉ')}</DialogTitle><p className="text-sm text-foreground">{copy('Certificate content and publication information', 'Nội dung chứng chỉ và thông tin phát hành')}</p></DialogHeader>
   <DialogBody className="space-y-4 px-1 py-1"><section className="rounded-xl border border-border bg-card p-4"><CertificateFacts input={shownDetail.input} skillName={shownDetail.skillName} version={shownDetail.version} versionLabel={versionLabel(shownDetail)} status={statusBadge(shownDetail.state)} /></section>
    {shownDetail.state === 'PUBLISHING' && <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm font-medium">{copy('L&D has approved this certificate. Publication is in progress; it becomes available when the status is Published.', 'L&D đã duyệt chứng chỉ. Hệ thống đang phát hành; chứng chỉ sẽ khả dụng khi trạng thái chuyển thành Đã phát hành.')}</p>}
    {shownDetail.input.replacesDefinitionId && <section className="space-y-2 rounded-xl border border-primary/40 bg-secondary/40 p-4"><h3 className="font-semibold text-primary">{copy('Replaces a certificate for new pathways', 'Thay thế chứng chỉ cho lộ trình mới')}</h3><p className="text-xs font-semibold text-foreground">{copy('Original certificate', 'Chứng chỉ gốc')}</p><p className="font-medium">{data.published.find(p => p.id === shownDetail.input.replacesDefinitionId)?.name ?? rows.find(r => r.draft?.definitionId === shownDetail.input.replacesDefinitionId)?.name ?? shownDetail.input.replacesDefinitionId}</p><p className="text-sm text-foreground">{copy('Existing pathways keep the original certificate. This replacement applies only to pathways created after publication.', 'Lộ trình đã tạo giữ nguyên chứng chỉ gốc. Bản thay thế chỉ áp dụng cho lộ trình tạo sau khi phát hành.')}</p></section>}
    {shownDetail.draft?.reason && <p className="rounded-lg border border-destructive/30 p-3 text-destructive">{shownDetail.draft.reason}</p>}
   </DialogBody><DialogFooter><Button variant="outline" onClick={() => setDetail(null)}>{batchOpen ? copy('Back to batch review', 'Quay lại duyệt hàng loạt') : copy('Close', 'Đóng')}</Button></DialogFooter>
  </Dialog>}
  {batchOpen && !detail && <Dialog open onOpenChange={v => { if (!v && !busy) setBatchOpen(false) }} size="wide" className="module-management-dialog max-w-3xl max-h-[90dvh]" ariaLabel={copy('Batch review certificates', 'Duyệt chứng chỉ hàng loạt')}>
   <DialogHeader><DialogTitle><CheckCheck size={18} className="text-primary" />{copy('Batch review certificates', 'Duyệt chứng chỉ hàng loạt')}</DialogTitle><p className="text-xs text-muted-foreground">{copy('Filter the list, open certificate details, and confirm approval of the listed certificates.', 'Lọc danh sách, xem chi tiết chứng chỉ và xác nhận duyệt danh sách chứng chỉ.')}</p></DialogHeader>
   <DialogBody className="space-y-4 px-1 py-1">
    <ManagementSection title={copy('Review filters', 'Bộ lọc duyệt')}><div className="grid gap-3 sm:grid-cols-2"><Select aria-label={copy('Expert', 'Chuyên gia')} value={batchExpert} onChange={v => {setBatchExpert(v);setBatchConfirm(false)}} options={[{value:'',label:copy('All experts','Tất cả chuyên gia')},...data.experts.map(e=>({value:e.id,label:e.name}))]} /><Select aria-label="Skill" value={batchSkill} onChange={v => {setBatchSkill(v);setBatchConfirm(false)}} options={[{value:'',label:copy('All skills','Tất cả Skill')},...data.skills.map(e=>({value:e.skillId,label:e.skillName}))]} /></div></ManagementSection>
    <div className="rounded-lg border border-primary/30 bg-secondary/50 p-4"><p className="font-semibold text-primary">{copy(`${batch.length} certificates to approve`, `${batch.length} chứng chỉ sẽ được duyệt`)}</p><p className="mt-1 text-sm text-foreground">{copy('All pending certificates matching these filters are included. Open details, then confirm below.', 'Toàn bộ chứng chỉ chờ duyệt phù hợp bộ lọc đều được đưa vào. Xem chi tiết, sau đó xác nhận bên dưới.')}</p></div>
    {batchVisible.map(r => <ManagementSection key={r.id} title={copy('Certificate awaiting review', 'Chứng chỉ chờ duyệt')} aside={<Badge variant="warning" className="border-warning/60 text-foreground">{states.SUBMITTED}</Badge>}><div className="flex items-start justify-between gap-3"><div className="min-w-0 space-y-2"><p className="text-base font-semibold text-foreground">{r.name}</p><p className="text-sm"><span className="font-semibold">{copy('Skill: ', 'Kỹ năng: ')}</span>{r.skillName}</p><p className="text-sm"><span className="font-semibold">{copy('Knowledge level: ', 'Mức kiến thức: ')}</span>{t('knowledgeLevel.'+r.level)} · {copy('Content revision', 'Phiên bản nội dung')} {r.draft!.revision}</p><p className="text-xs text-foreground">{copy('Expert: ', 'Chuyên gia: ')}{person(r.author)}</p></div><Button size="sm" variant="outline" onClick={()=>open(r)}><Eye size={14}/>{copy('View details','Xem chi tiết')}</Button></div></ManagementSection>)}
    {!batchVisible.length && <p className="text-xs text-muted-foreground">{copy('No pending certificates match these filters.','Không có chứng chỉ chờ duyệt phù hợp bộ lọc.')}</p>}
    <label className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5 accent-primary" disabled={busy} checked={batchConfirm} onChange={e=>setBatchConfirm(e.target.checked)} />{copy('I have reviewed all certificates listed above and confirm their approval.','Tôi đã xem lại toàn bộ chứng chỉ trong danh sách trên và xác nhận duyệt.')}</label>
    {batch.length > 100 && <p className="text-destructive">{copy('Narrow the filters to approve at most 100 certificates at once.', 'Thu hẹp bộ lọc để duyệt tối đa 100 chứng chỉ mỗi lần.')}</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
   </DialogBody><DialogFooter><Button variant="outline" disabled={busy} onClick={()=>setBatchOpen(false)}>{copy('Cancel','Hủy')}</Button><Button isLoading={busy} disabled={!batchConfirm||!batch.length||batch.length>100} onClick={()=>void approveBatch()}>{copy(`Approve all listed (${batch.length})`,`Duyệt danh sách (${batch.length})`)}</Button></DialogFooter>
  </Dialog>}

 </div>
}
