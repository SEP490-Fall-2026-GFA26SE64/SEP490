import { publishedModuleRevision } from './publishedModulePresentation'
import { ModuleApprovalQueue } from './ModuleApprovalQueue'
import { ModuleApprovalReview } from './ModuleApprovalReview'
import { newLesson } from '../../../shared/lib/learningLessons'
import { LearningImportPanel } from './LearningImportPanel'
import { LearningLessonsEditor } from '../../../shared/components/learning/LearningLessonsEditor'
import { LearningLessonList } from '../../../shared/components/learning/LearningLessonList'
import type { LearningLesson } from '../../../shared/api/moduleAuthoringApi'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { BookOpen, ClipboardCheck, FileText, Layers, Plus, Upload } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Badge, type BadgeProps } from '../../../shared/components/ui/Badge'
import { Input } from '../../../shared/components/ui/Input'
import { Dialog, DialogBody, DialogHeader, DialogTitle, DialogFooter } from '../../../shared/components/ui/Dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../shared/components/ui/Tabs'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { ModuleMarkdown } from '../../../shared/components/ui/ModuleMarkdown'
import { FormField as Field } from '../../../shared/components/ui/FormField'
import { Heading } from '../../../shared/components/typography/Heading'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { moduleRequest, type CatalogChoice, type ModuleActor, type ModuleCatalogItem, type ModuleCatalogPage, type ModuleContent, type ModuleDocument, type ModulePage, type ModuleRevision, type ModuleSave } from '../../../shared/api/moduleAuthoringApi'

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../../shared/components/ui/Accordion'
import { CopyableId } from '../../../shared/components/ui/CopyableId'
import { RowActions } from '../../../shared/components/ui/RowActions'
import { useToast } from '../../../shared/hooks/useToast'
import { Eye } from 'lucide-react'
import { CatalogModuleDetails } from './CatalogModuleDetails'

type Mode = 'modules' | 'content' | 'approvals' | 'learning'
const control = 'min-h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-[length:var(--text-body-sm)] text-foreground focus:outline-none focus:ring-2 focus:ring-primary'
const latest = (doc: ModuleDocument) => doc.revisions[doc.revisions.length - 1]
const initialForm = (): ModuleSave => ({ title: '', moduleType: 'LESSON_AND_PRACTICE', contentId: '', duration: 1, teachings: [{ skillId: '' }], knowledgeLevel: '' })
const statusVariant = (state: string | null | undefined): BadgeProps['variant'] => {
  if (['APPROVED', 'ACTIVE', 'RELEASED'].includes(state ?? '')) return 'success'
  if (['SUBMITTED', 'NEEDS_EXPERT_REVIEW', 'PUBLISH_PENDING', 'ARCHIVE_PENDING', 'ARCHIVE_REQUESTED'].includes(state ?? '')) return 'warning'
  if (['REJECTED', 'RETURNED'].includes(state ?? '')) return 'destructive'
  return state === 'DRAFT' ? 'secondary' : 'outline'
}
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Unable to complete the request.'

export function ModuleManagementWorkspace({ mode = 'modules' }: { mode?: Mode }) {
  const identity = useContext(WorkspaceSessionContext)?.identity
  return <OwnedModuleManagementWorkspace key={(identity?.organizationId ?? '') + ':' + (identity?.accountId ?? '') + ':' + (identity?.roles?.join(',') ?? '') + ':' + mode} mode={mode} managerShell={identity?.roles?.includes('LD_MANAGER') ?? false} />
}
function OwnedModuleManagementWorkspace({ mode, managerShell = false }: { mode: Mode; managerShell?: boolean }) {
  const { language, t } = useTranslation()
  const { toast } = useToast()
  const copy = (en: string, vi: string) => language === 'vi' ? vi : en
  const { moduleId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [actor, setActor] = useState<ModuleActor | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [sessionAttempt, setSessionAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [contentBusy, setContentBusy] = useState(false)
  const [moduleImportOpen, setModuleImportOpen] = useState(false)
  const [moduleImportBusy, setModuleImportBusy] = useState(false)
  const mutation = useRef(false)
  const [loading, setLoading] = useState(false)
  const [catalogReady, setCatalogReady] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [page, setPage] = useState<ModulePage>({ items: [], total: 0, page: 1, pageSize: 10 })
  const [catalogPage, setCatalogPage] = useState<ModuleCatalogPage>({ items: [], total: 0, page: 1, pageSize: 10 })
  const [intakeSelection, setIntakeSelection] = useState<ModuleCatalogItem | null>(null)
  const [intakeJobPositions, setIntakeJobPositions] = useState<string[]>([])
  const [intakeExpert, setIntakeExpert] = useState('')
  const [staff, setStaff] = useState<CatalogChoice[]>([])
  const [catalogSelection, setCatalogSelection] = useState<ModuleCatalogItem | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [allModuleStatuses, setAllModuleStatuses] = useState(false)
  const [filters, setFilters] = useState({ search: searchParams.get('search') ?? '', status: '', review: '', type: '', skill: '' })
  useEffect(() => { const query = searchParams.get('search'); if (query !== null) { setPageNumber(1); setFilters(old => ({ ...old, search: query })) } }, [searchParams])
  const [search, setSearch] = useState(filters.search)
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(filters.search), 180)
    return () => clearTimeout(timeout)
  }, [filters.search])
  const [jobPositions, setJobPositions] = useState<CatalogChoice[]>([])
  const [skills, setSkills] = useState<CatalogChoice[]>([])
  const [moduleSkills, setModuleSkills] = useState<CatalogChoice[]>([])
  const [contents, setContents] = useState<ModuleContent[]>([])
  const [experts, setExperts] = useState<CatalogChoice[]>([])
  const [selected, setSelected] = useState<ModuleDocument | null>(null)
  const [conflict, setConflict] = useState<ModuleDocument | null>(null)
  const [editing, setEditing] = useState(false)
  const [authoringSection, setAuthoringSection] = useState('details')
  const [form, setForm] = useState<ModuleSave>(initialForm)
  const [moduleLessons, setModuleLessons] = useState<LearningLesson[]>([newLesson('TEXT')])
  const [contentOpen, setContentOpen] = useState(false)
  const [contentForm, setContentForm] = useState({ title: '', markdown: '', lessons: [newLesson('TEXT')] as LearningLesson[] })
  const [preview, setPreview] = useState<ModuleContent | null>(null)
  const [confirm, setConfirm] = useState<{ doc: ModuleDocument; action: string } | null>(null)
  const [feedback, setFeedback] = useState('')
  const [learning, setLearning] = useState<ModuleRevision | null>(null)
  const manager = actor?.roles.includes('LD_MANAGER') ?? false
  const expert = actor?.roles.includes('EXPERT') ?? false
  const managerLearning = (manager || managerShell) && ['modules', 'approvals'].includes(mode)
  const publishedOnly = manager && mode === 'modules' && !allModuleStatuses
  const canManage = (doc: ModuleDocument) => expert && doc.createdBy === actor?.id
  const formatTime = (value: string | null | undefined) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
  const person = (id: string | null | undefined) => id ? staff.find(p => p.id === id)?.name ?? (id === 'DEVELOPMENT_SEED' ? copy('Development seed', 'Dữ liệu mẫu dev') : copy('Person unavailable', 'Chưa có thông tin người dùng')) : '—'

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mobile = window.matchMedia('(max-width: 767px)')
    const minimize = () => { if (mobile.matches) window.dispatchEvent(new Event('minimize-system-sidebar')) }
    const frame = requestAnimationFrame(minimize)
    mobile.addEventListener('change', minimize)
    return () => { cancelAnimationFrame(frame); mobile.removeEventListener('change', minimize) }
  }, [mode])

  useEffect(() => {
    if (!error) return
    const target = document.querySelector<HTMLElement>('[role="dialog"] [role="alert"]') ?? document.querySelector<HTMLElement>('[data-module-error]')
    target?.focus()
  }, [error])

  useEffect(() => {
    const controller = new AbortController()
    void moduleRequest<ModuleActor>('/session', 'GET', undefined, controller.signal).then(setActor).catch(failure => {
      if (!controller.signal.aborted) setError(errorText(failure))
    }).finally(() => { if (!controller.signal.aborted) setSessionLoading(false) })
    return () => controller.abort()
  }, [sessionAttempt])

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!actor) return
    setLoading(true); setError('')
    try {
      if (mode === 'learning') {
        setLearning(await moduleRequest<ModuleRevision>(`/learning/${encodeURIComponent(moduleId ?? '')}`, 'GET', undefined, signal))
      } else {
        const query = new URLSearchParams({ search, status: filters.status, review: filters.review, type: filters.type, skill: filters.skill, page: String(pageNumber) })
        if (publishedOnly) { query.set('status', 'ACTIVE'); query.set('review', 'APPROVED') }
        if (mode === 'approvals') { query.set('pendingOnly', 'true'); query.set('status', ''); query.set('review', '') }
        const listRequest = mode === 'modules'
          ? moduleRequest<ModuleCatalogPage>(`/module-list?${query}`, 'GET', undefined, signal).then(setCatalogPage)
          : mode === 'content' ? Promise.resolve() : moduleRequest<ModulePage>(`/modules?${query}`, 'GET', undefined, signal).then(setPage)
        const [, nextJobPositions, nextSkills, nextContents, nextStaff, nextExperts, nextModuleSkills] = await Promise.all([
          listRequest,
          moduleRequest<CatalogChoice[]>('/catalog/JobPosition', 'GET', undefined, signal),
          moduleRequest<CatalogChoice[]>('/catalog/MicroSkill', 'GET', undefined, signal),
          actor.roles.includes('LD_MANAGER') && mode !== 'content' ? Promise.resolve(null) : moduleRequest<ModuleContent[]>('/contents', 'GET', undefined, signal),
          moduleRequest<CatalogChoice[]>('/catalog/Staff', 'GET', undefined, signal),
          actor.roles.includes('LD_MANAGER') ? moduleRequest<CatalogChoice[]>('/catalog/Expert', 'GET', undefined, signal) : Promise.resolve([]),
          actor.roles.includes('EXPERT') ? moduleRequest<CatalogChoice[]>('/catalog/ModuleSkill', 'GET', undefined, signal) : Promise.resolve([]),
        ])
        setJobPositions(nextJobPositions); setSkills(nextSkills); if (nextContents) setContents(nextContents); setStaff(Array.isArray(nextStaff) ? nextStaff : []); setCatalogReady(true)
        setExperts(nextExperts); setModuleSkills(nextModuleSkills)
      }
    } catch (failure) { if (!signal?.aborted) setError(errorText(failure)) }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [actor, mode, moduleId, search, filters.status, filters.review, filters.type, filters.skill, pageNumber, publishedOnly])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  async function run(work: () => Promise<void>) {
    if (mutation.current) return
    mutation.current = true; setBusy(true); setError(''); setNotice('')
    try { await work() } catch (failure) { setError(errorText(failure)) }
    finally { mutation.current = false; setBusy(false) }
  }

  function openEditor(doc?: ModuleDocument) {
    setSelected(doc ?? null); setConflict(null); setError('')
    if (doc) {
      const p = latest(doc).payload
      setForm({ title: p.title, moduleType: p.moduleType, contentId: p.content.id, duration: p.duration,
        teachings: p.teachings.length === 1 ? [{ skillId: p.teachings[0].skillId }] : [{ skillId: '' }], knowledgeLevel: p.knowledgeLevel ?? '' })
    } else { setForm(initialForm()) }
    setModuleLessons(doc ? latest(doc).payload.content.lessons ?? [] : [newLesson('TEXT')])
    setAuthoringSection('details')
    setEditing(true)
  }

  const actionLabels: Record<string, string> = {
    submit: copy('Submit for review', 'Gửi duyệt'), return: copy('Return for changes', 'Yêu cầu chỉnh sửa'),
    approve: copy('Approve and release', 'Duyệt và phát hành'), retry: copy('Retry publication', 'Thử phát hành lại'),
    'request-archive': copy('Request archive', 'Yêu cầu lưu trữ'), 'approve-archive': copy('Approve archive', 'Duyệt lưu trữ'),
    restore: copy('Restore to draft', 'Khôi phục bản nháp'), delete: copy('Delete draft', 'Xóa bản nháp'),
  }
  const fieldLabels: Record<string, string> = {
    id: copy('Record ID', 'Mã bản ghi'), version: copy('Catalog version', 'Phiên bản danh mục'), status: copy('Lifecycle', 'Vòng đời'),
    reviewStatus: copy('Review status', 'Trạng thái duyệt'), reviewedBy: copy('Reviewed by', 'Người duyệt'), reviewedAt: copy('Reviewed at', 'Thời điểm duyệt'),
    title: copy('Title', 'Tiêu đề'), moduleType: copy('Module type', 'Loại module'), contentUri: copy('Content reference', 'Tham chiếu nội dung'),
    contentType: copy('Content format', 'Định dạng nội dung'), contentVersion: copy('Content version', 'Phiên bản nội dung'), duration: copy('Duration (minutes)', 'Thời lượng (phút)'),
    knowledgeLevel: copy('Knowledge level', 'Mức kiến thức'), skillVersion: copy('Skill version', 'Phiên bản kỹ năng'),
    content: copy('Learning content', 'Nội dung học'), teachings: copy('Skills taught', 'Kỹ năng được dạy'),
  }
  const stateLabels: Record<string, string> = {
    FOUNDATION: copy('Foundation', 'Nền tảng'), INTERMEDIATE: copy('Intermediate', 'Trung cấp'), ADVANCED: copy('Advanced', 'Nâng cao'),
    DRAFT: copy('Draft', 'Bản nháp'), ACTIVE: copy('Active', 'Đang sử dụng'), ARCHIVED: copy('Archived', 'Đã lưu trữ'),
    NEEDS_EXPERT_REVIEW: copy('Not approved', 'Chưa được duyệt'), APPROVED: copy('Approved', 'Đã duyệt'), REJECTED: copy('Changes requested', 'Cần chỉnh sửa'),
    SUBMITTED: copy('Submitted', 'Đã gửi duyệt'), RETURNED: copy('Returned for changes', 'Yêu cầu chỉnh sửa'), RELEASED: copy('Released', 'Đã phát hành'),
    PUBLISH_PENDING: copy('Awaiting publication', 'Chờ phát hành'), ARCHIVE_PENDING: copy('Archiving', 'Đang lưu trữ'), ARCHIVE_REQUESTED: copy('Archive requested', 'Đã yêu cầu lưu trữ'),
    LESSON_AND_PRACTICE: copy('Lesson and practice', 'Bài học và thực hành'), RESOURCE_GUIDED_PRACTICE: copy('Resource-guided practice', 'Thực hành theo tài liệu'),
    PRIMARY: copy('Primary', 'Chính'), SUPPORTING: copy('Supporting', 'Hỗ trợ'), INCIDENTAL: copy('Incidental', 'Ngữ cảnh'), LOW: copy('Low', 'Thấp'), MEDIUM: copy('Medium', 'Trung bình'), HIGH: copy('High', 'Cao'),
    'text/markdown': copy('Reading', 'Bài đọc'),
    'application/vnd.adapt-learning.lessons+json': copy('Text and Video lessons', 'Bài học Text và Video'),
  }
  const eventLabels: Record<string, string> = { HISTORY_RESTORED: copy('Earlier assignment history retained', 'Đã giữ lịch sử phân công trước đây'), OWNER_ASSIGNED: copy('Responsible Expert assigned', 'Đã gán Expert phụ trách'), ASSIGN_INTAKE: copy('Assigned for intake', 'Phân công tiếp nhận'), INTAKE: copy('Received imported module', 'Tiếp nhận module nhập vào'), CREATE: copy('Created', 'Đã tạo'), EDIT: copy('Edited', 'Đã sửa'), SUBMIT: copy('Submitted for review', 'Đã gửi duyệt'), RETURN: copy('Returned for changes', 'Đã yêu cầu chỉnh sửa'), APPROVE: copy('Approved', 'Đã duyệt'), RETRY: copy('Retried publication', 'Đã thử phát hành lại'), REQUEST_ARCHIVE: copy('Requested archive', 'Đã yêu cầu lưu trữ'), APPROVE_ARCHIVE: copy('Approved archive', 'Đã duyệt lưu trữ'), RESTORE: copy('Restored to draft', 'Đã khôi phục bản nháp'), RELEASED: copy('Released', 'Đã phát hành'), ARCHIVED: copy('Archived', 'Đã lưu trữ') }
  function ask(doc: ModuleDocument, action: string) { setConfirm({ doc, action }); setFeedback(''); setError('') }
  function controls(doc: ModuleDocument, includeDetails = true) {
    const state = latest(doc).state
    const actions: string[] = []
    if (canManage(doc)) {
      if (['DRAFT', 'RETURNED'].includes(state)) actions.push('submit')
      if (state === 'RELEASED' && !doc.archived) actions.push('request-archive')
      if (state === 'ARCHIVED') actions.push('restore')
      if (!doc.intake && !doc.everReleased && state === 'DRAFT') actions.push('delete')
    }
    if (manager && mode === 'approvals') {
      if (state === 'SUBMITTED') actions.push('approve', 'return')
      if (state === 'ARCHIVE_REQUESTED') actions.push('approve-archive', 'return')
      if (['PUBLISH_PENDING', 'ARCHIVE_PENDING'].includes(state)) actions.push('retry')
      if (state === 'PUBLISH_PENDING') actions.push('return')
    }
    return <>
      {includeDetails && <Button variant="outline" size="sm" disabled={busy || contentBusy} onClick={() => void run(async () => { setSelected(await moduleRequest<ModuleDocument>(`/modules/${doc.id}`)); setEditing(false) })}>{copy('Details & history', 'Chi tiết và lịch sử')}</Button>}
      {canManage(doc) && ['DRAFT', 'RETURNED', 'RELEASED'].includes(state) && <Button variant="outline" size="sm" disabled={busy || contentBusy} onClick={() => openEditor(doc)}>{copy('Edit', 'Chỉnh sửa')}</Button>}
      {actions.map(action => <Button variant={mode === 'approvals' && ['approve', 'approve-archive'].includes(action) ? 'primary' : 'outline'} size="sm" disabled={busy || contentBusy} key={action} onClick={() => ask(doc, action)}>{actionLabels[action]}</Button>)}
    </>
  }
  const scopeSelector = (value: string[], onChange: (values: string[]) => void, disabled = false) => <select multiple required className={control} disabled={disabled} value={value} onChange={e => onChange(Array.from(e.target.selectedOptions, option => option.value))}>
    {jobPositions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
  </select>
  const moduleHome = manager ? '/ld-manager/modules' : '/expert/modules'
  const title = managerLearning ? copy('Learning Content', 'Nội dung học tập') : mode === 'content' ? manager ? copy('Learning content', 'Nội dung học tập') : copy('Content Studio', 'Biên soạn nội dung') : mode === 'approvals' ? copy('Content Approvals', 'Duyệt nội dung') : mode === 'learning' ? copy('Module lessons', 'Nội dung bài học') : copy('Learning modules', 'Quản lý module học')

  const displayedPage = mode === 'modules' ? catalogPage : page
  const listItems: ModuleCatalogItem[] = loading && managerLearning ? [] : mode === 'modules' ? catalogPage.items : page.items.map(doc => ({ module: latest(doc).payload, authoring: doc }))

  const historyView = (doc: ModuleDocument) => <section className="space-y-3 border-t border-border pt-4"><Heading level={3} size="card">{copy('Change history', 'Lịch sử thay đổi')}</Heading>{!doc.history.length && <p className="text-xs text-muted-foreground">{copy('No edit history has been recorded for this module.', 'Module này chưa có lịch sử chỉnh sửa được ghi nhận.')}</p>}{doc.history.map(e => <div key={e.sequence} className="space-y-1 border-l-2 border-border pl-3 text-xs"><p className="font-medium text-foreground">{person(e.actorId)} · {eventLabels[e.action.replaceAll('-', '_')] ?? e.action} · {copy('Revision', 'Phiên bản')} {e.revision}</p><p className="text-muted-foreground">{formatTime(e.occurredAt)}</p>{e.action === 'EDIT' && e.detail?.startsWith('Changed: ') && <p>{copy('Changed', 'Đã thay đổi')}: {e.detail.slice(9).split(', ').map(field => fieldLabels[field] ?? field).join(', ')}</p>}{['RETURN', 'OWNER_ASSIGNED'].includes(e.action) && e.detail && <p>{e.detail}</p>}</div>)}</section>

  return <WorkspaceLayout><div className="relative space-y-5 text-[length:var(--text-body)] text-foreground">
    {expert && mode === 'modules' && <Heading level={1} className="sr-only">{title}</Heading>}
    <PageHeader title={expert && mode === 'modules' ? undefined : title} description={expert && mode === 'modules' ? undefined : managerLearning ? copy('Browse released modules and review content requests.', 'Tra cứu module đã phát hành và xử lý yêu cầu duyệt nội dung.') : copy('Create focused learning packages and keep every revision easy to review.', 'Xây dựng gói học tập trung và theo dõi rõ ràng từng lần chỉnh sửa.')}
      actions={expert && mode === 'modules' ? <div className="flex flex-wrap items-center gap-2">
        <Link to="/expert/skill-assessment-config?status=UNCONFIGURED" className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'gap-2 border border-primary/20 font-semibold' })}><ClipboardCheck size={14} />{t('scopedPolicy.skillTitle')}</Link>
        <Button variant="outline" size="sm" leftIcon={<Upload className="h-4 w-4" aria-hidden="true" />} disabled={busy || contentBusy} aria-haspopup="dialog" onClick={() => setModuleImportOpen(true)} className="bg-secondary text-primary border border-primary/20 hover:bg-secondary/80 font-semibold shadow-2xs">{copy('Import', 'Nhập file')}</Button>
        <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />} disabled={busy || contentBusy || loading || !catalogReady} onClick={() => openEditor()} className="font-semibold shadow-2xs">{copy('Create module', 'Tạo module')}</Button>
      </div> : undefined}
      />
    {error && <div role="alert" tabIndex={-1} data-module-error className="rounded-lg border border-destructive bg-card p-3 text-[length:var(--text-body-sm)] text-destructive">{error}{actor && <Button variant="outline" size="sm" className="ml-3" disabled={busy || contentBusy || loading} onClick={() => void load()}>{copy('Reload latest data', 'Tải dữ liệu mới nhất')}</Button>}</div>}
    {notice && <p role="status" className="text-[length:var(--text-body-sm)] text-success">{notice}</p>}
    {!actor ? <Card><CardContent className="space-y-3 pt-6">
      {sessionLoading ? <p role="status">{copy('Loading your session…', 'Đang tải phiên đăng nhập…')}</p> : <>
        <p>{copy('Continue with your workspace account from the main login page.', 'Tiếp tục bằng tài khoản hệ thống tại trang đăng nhập chung.')}</p>
        <Button onClick={() => navigate('/login')}>{copy('Go to login', 'Đến trang đăng nhập')}</Button>
        <Button variant="outline" onClick={() => { setSessionLoading(true); setError(''); setSessionAttempt(value => value + 1) }}>{copy('Retry', 'Thử lại')}</Button>
      </>}
    </CardContent></Card> : <>
      {manager && mode !== 'learning' && <nav className="flex max-w-full flex-wrap gap-3 border-b border-border" aria-label={copy('Learning workspace', 'Không gian học tập')}>
        {[{path:moduleHome,active:mode==='modules',icon:<BookOpen className="size-4" aria-hidden="true"/>,label:copy('Modules','Module')},{path:'/ld-manager/approvals',active:mode==='approvals',icon:<ClipboardCheck className="size-4" aria-hidden="true"/>,label:copy('Approvals','Chờ duyệt')}].map(tab=><Link key={tab.path} to={tab.path} aria-current={tab.active?'page':undefined} className={buttonVariants({variant:'ghost',size:'sm',className:`gap-2 rounded-none border-b-2 shadow-none ${tab.active?'border-primary text-primary':'border-transparent text-muted-foreground'}`})} onClick={()=>setPageNumber(1)}>{tab.icon}{tab.label}</Link>)}
      </nav>}
      {loading && !managerLearning && <span role="status" className="sr-only">{copy('Loading', 'Đang tải')}</span>}
      {expert && mode === 'modules' && <Dialog open={moduleImportOpen} onOpenChange={open => { if (!moduleImportBusy) setModuleImportOpen(open) }} className="module-management-dialog w-[96vw] max-w-7xl max-h-[94dvh]" ariaLabel={copy('Import modules', 'Nhập module')} closeLabel={copy('Close import', 'Đóng cửa sổ nhập')}>
        <DialogHeader><DialogTitle>{copy('Import modules and lessons', 'Import module và bài học')}</DialogTitle></DialogHeader>
        <LearningImportPanel embedded showHeading={false} onClose={() => setModuleImportOpen(false)} onBusyChange={setModuleImportBusy} onImported={() => void load()} />
      </Dialog>}
      {mode === 'learning' ? <Card><CardContent className="space-y-4 pt-6">
        {!learning ? <Button disabled={busy || contentBusy || loading} onClick={() => void run(async () => { setLearning(await moduleRequest<ModuleRevision>(`/learning/${encodeURIComponent(moduleId ?? '')}/start`, 'POST')) })}>{copy('Start learning', 'Bắt đầu học')}</Button>
          : <><Heading level={2}>{learning.payload.title}</Heading><Badge variant="outline">{copy('Revision', 'Phiên bản')} {learning.number}</Badge><ModuleMarkdown markdown={learning.payload.content.markdown} /></>}
      </CardContent></Card> : <>
        {mode === 'content' ? <>
          {expert && <Button disabled={busy || contentBusy || loading || !catalogReady} onClick={() => { setContentForm({ title: '', markdown: '', lessons: [newLesson('TEXT')] }); setContentOpen(true) }}>{copy('Create content', 'Tạo nội dung')}</Button>}
          {!loading && !contents.length && <Card><CardContent className="pt-6">{copy('No content yet. Create your first lesson after a job position is assigned.', 'Chưa có nội dung. Hãy tạo bài học sau khi được phân công vị trí công việc.')}</CardContent></Card>}
          <div className="grid gap-4 md:grid-cols-2">{contents.map(content => <Card key={content.id}><CardContent className="space-y-3 pt-6"><Heading level={2} size="card" className="break-words">{content.title}</Heading><p className="text-[length:var(--text-body-sm)] text-muted-foreground">{copy('Created by', 'Người tạo')}: {content.createdBy ?? copy('Original creator unknown', 'Chưa xác định người tạo gốc')} · {!content.createdBy && <>{copy('Recorded at', 'Ghi nhận lúc')}: </>}{content.createdAt}</p><Button variant="outline" onClick={() => setPreview(content)}>{copy('Preview', 'Xem trước')}</Button></CardContent></Card>)}</div>
        </> : <>
          {managerLearning && <div className="flex flex-wrap items-center justify-between gap-2"><Heading level={2} size="card">{mode==='approvals'?copy('Approval queue','Hàng đợi duyệt'):copy('Module Directory','Danh sách module')}</Heading><p role="status" className="text-xs text-muted-foreground">{loading || !catalogReady || error?'—':displayedPage.total} {mode==='approvals'?copy('requests match your filters','yêu cầu phù hợp bộ lọc'):copy('modules match your filters','module phù hợp bộ lọc')}</p></div>}
          {!managerLearning && <div className={`grid grid-cols-1 gap-4 ${mode === 'approvals' ? '' : manager ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
            <StatCard variant="gradient" icon={<BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />} title={mode === 'approvals' ? copy('Pending actions', 'Yêu cầu cần xử lý') : copy('Matching modules', 'Module phù hợp')} value={displayedPage.total} valueClassName="text-primary" description={copy('Matching your current filters', 'Phù hợp với bộ lọc hiện tại')} />
            {!manager && <StatCard variant="gradient" icon={<FileText className="h-4 w-4 text-success" aria-hidden="true" />} title={copy('Content packages', 'Gói nội dung')} value={contents.length} valueClassName="text-success" description={copy('Saved content in your workspace', 'Nội dung đã lưu trong không gian làm việc')} />}
            {mode !== 'approvals' && <StatCard variant="gradient" icon={<Layers className="h-4 w-4 text-warning" aria-hidden="true" />} role="group" aria-label={copy('Available skills', 'Kỹ năng hiện có')} title={copy('Available skills', 'Kỹ năng hiện có')} value={expert ? moduleSkills.length : skills.length} valueClassName="text-warning" description={expert ? copy('Skills available for module authoring', 'Kỹ năng có thể chọn khi soạn module') : copy('Skills in the module catalog', 'Kỹ năng trong danh mục module')} />}
          </div>}

          <div className={`module-filters grid grid-cols-1 items-end gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-2 ${manager && mode === 'modules' ? publishedOnly ? 'xl:grid-cols-4' : 'xl:grid-cols-3' : mode === 'approvals' ? 'xl:grid-cols-3' : 'xl:grid-cols-5'}`}>
            {manager && mode === 'modules' && <Field label={copy('Show modules','Hiển thị module')}><select className="h-8 w-full rounded-md border border-border bg-card px-2 text-xs focus-visible:ring-2 focus-visible:ring-ring" value={allModuleStatuses?'all':'published'} onChange={event=>{setAllModuleStatuses(event.target.value==='all');setFilters(old=>({...old,status:'',review:''}));setPageNumber(1)}}><option value="published">{copy('Published modules','Module đã phát hành')}</option><option value="all">{copy('All statuses','Tất cả trạng thái')}</option></select></Field>}
            <Field label={copy('Search name or ID', 'Tìm theo tên hoặc ID')}><Input className="h-8 text-xs" value={filters.search} onChange={e => { setPageNumber(1); setFilters({ ...filters, search: e.target.value }) }} /></Field>
            {(mode === 'approvals' || publishedOnly ? ['type', 'skill'] as const : ['status', 'review', 'type', 'skill'] as const).map(key => <Field key={key} label={key === 'status' ? copy('Lifecycle', 'Vòng đời') : key === 'review' ? copy('Review', 'Duyệt') : key === 'type' ? copy('Module type', 'Loại module') : copy('Skill', 'Kỹ năng')}><select className="h-8 w-full min-w-0 rounded-md border border-border bg-background px-2 text-xs text-foreground focus-visible:ring-2 focus-visible:ring-ring" value={filters[key]} onChange={e => { setPageNumber(1); setFilters({ ...filters, [key]: e.target.value }) }}><option value="">{copy('All', 'Tất cả')}</option>
              {(key === 'skill' ? skills.map(s => ({ value: s.id, label: s.name })) : (key === 'status' ? ['DRAFT', 'ACTIVE', 'ARCHIVED'] : key === 'review' ? ['NEEDS_EXPERT_REVIEW', 'APPROVED', 'REJECTED'] : ['LESSON_AND_PRACTICE', 'RESOURCE_GUIDED_PRACTICE']).map(value => ({ value, label: stateLabels[value] ?? value }))).map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select></Field>)}
          </div>
          {(Object.values(filters).some(Boolean) || manager && mode === 'modules' && allModuleStatuses) && <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={() => { setFilters({ search: '', status: '', review: '', type: '', skill: '' }); if(manager && mode === 'modules') setAllModuleStatuses(false); setPageNumber(1) }}>{copy('Clear filters', 'Xoá bộ lọc')}</Button></div>}
          {loading && managerLearning && <div role="status" aria-label={copy('Loading learning content', 'Đang tải nội dung học tập')} className="space-y-3 rounded-lg border border-border bg-card p-4"><span className="sr-only">{copy('Loading learning content…', 'Đang tải nội dung học tập…')}</span>{[1,2,3].map(row=><div key={row} aria-hidden="true" className="h-12 animate-pulse rounded-md bg-muted"/>)}</div>}
          {!loading && !listItems.length && (!managerLearning || catalogReady && !error) && <Card><CardContent className="space-y-3 pt-6"><p>{mode === 'approvals' ? Object.values(filters).some(Boolean) ? copy('No requests match your filters. Clear filters to see pending requests.', 'Không có yêu cầu phù hợp. Xoá bộ lọc để xem hàng đợi.') : copy('No requests need your attention. New submissions will appear here.', 'Chưa có yêu cầu cần xử lý. Các module được gửi duyệt sẽ xuất hiện tại đây.') : manager ? publishedOnly && !Object.values(filters).some(Boolean) ? copy('No published modules yet. Approved publication requests will appear here after release.', 'Chưa có module đã phát hành. Yêu cầu được duyệt sẽ xuất hiện ở đây sau khi phát hành thành công.') : copy('No modules match your filters. Try another search.', 'Không có module phù hợp. Hãy thử tìm kiếm hoặc bộ lọc khác.') : copy('No modules match this view. Try changing your filters, or prepare content for a new module.', 'Chưa có module phù hợp. Hãy thử bộ lọc khác hoặc chuẩn bị nội dung cho module mới.')}</p></CardContent></Card>}
          {mode === 'approvals' && listItems.length > 0 ? <ModuleApprovalQueue documents={page.items} showHeading={false} total={page.total} loading={loading} busy={busy || contentBusy} vi={language === 'vi'} copy={copy} person={person} formatTime={formatTime} labels={stateLabels} onReview={doc => void run(async () => { setSelected(await moduleRequest<ModuleDocument>(`/modules/${doc.id}`)); setEditing(false) })} /> : mode === 'modules' && listItems.length > 0 ? <Card>{!managerLearning && <CardHeader className="p-4"><CardTitle>{copy('Module Directory', 'Danh sách module')}</CardTitle></CardHeader>}<CardContent className={managerLearning?'p-3':'px-3 pb-3'}><div className="overflow-hidden rounded-lg border border-border"><table className="block w-full table-fixed text-left text-xs xl:table"><caption className="sr-only">{copy('Module Directory', 'Danh sách module')}</caption><thead className="hidden bg-muted/40 text-[11px] uppercase text-muted-foreground xl:table-header-group"><tr>{[copy('Module', 'Module'), copy('Skill taught', 'Kỹ năng được dạy'), copy('Knowledge level', 'Mức kiến thức'), copy('Duration', 'Thời lượng'), copy('Lifecycle', 'Vòng đời'), copy('Review', 'Duyệt'), copy('Workflow', 'Soạn thảo'), copy('Action', 'Thao tác')].map((label, index) => <th key={label} className={`px-2 py-2.5 font-semibold ${['w-[25%]', 'w-[17%]', 'w-[10%]', 'w-[7%]', 'w-[9%]', 'w-[11%]', 'w-[11%]', 'w-[10%]'][index]} ${index === 7 ? 'text-center' : ''}`}>{label}</th>)}</tr></thead><tbody className="block divide-y divide-border xl:table-row-group">{listItems.map(item => <tr key={item.module.metadata.id} data-testid="module-row" className="grid grid-cols-2 items-start gap-3 p-3 hover:bg-muted/20 xl:table-row xl:p-0">
            <td className="col-span-2 min-w-0 xl:px-2 xl:py-3"><Heading level={2} size="card" style={{ fontSize: 'var(--text-sm)' }} className="line-clamp-2 break-words">{item.module.title?.trim() || copy('Untitled module', 'Module chưa có tên')}</Heading><CopyableId code={item.module.metadata.id} compact vi={language === 'vi'} entity={copy('module ID', 'mã module')} />{item.authoring && latest(item.authoring).payload.title !== item.module.title && <p className="mt-1 text-xs text-muted-foreground">{copy('Working revision', 'Bản đang soạn')}: {latest(item.authoring).payload.title}</p>}</td>
            <td className="col-span-2 min-w-0 break-words xl:px-2 xl:py-3"><span className="mb-1 block text-muted-foreground xl:hidden">{copy('Skill taught', 'Kỹ năng được dạy')}</span>{item.module.teachings.length ? item.module.teachings.map(teaching => teaching.skillName?.trim() || copy('Skill name unavailable', 'Chưa có tên kỹ năng')).join(', ') : '—'}</td>
            <td className="min-w-0 xl:px-2 xl:py-3"><span className="mb-1 block text-muted-foreground xl:hidden">{copy('Knowledge level', 'Mức kiến thức')}</span><span className="whitespace-nowrap">{stateLabels[item.module.knowledgeLevel ?? ''] ?? item.module.knowledgeLevel ?? '—'}</span></td>
            <td className="xl:px-2 xl:py-3"><span className="mb-1 block text-muted-foreground xl:hidden">{copy('Duration', 'Thời lượng')}</span>{item.module.duration == null ? '—' : `${item.module.duration} ${copy('min', 'phút')}`}</td>
            <td className="xl:px-2 xl:py-3"><span className="mb-1 block text-muted-foreground xl:hidden">{copy('Lifecycle', 'Vòng đời')}</span><Badge className="whitespace-normal" variant={statusVariant(item.module.metadata.status)}>{stateLabels[item.module.metadata.status ?? ''] ?? item.module.metadata.status ?? '—'}</Badge></td>
            <td className="xl:px-2 xl:py-3"><span className="mb-1 block text-muted-foreground xl:hidden">{copy('Review', 'Duyệt')}</span><Badge className="whitespace-normal" variant={statusVariant(item.module.metadata.reviewStatus)}>{stateLabels[item.module.metadata.reviewStatus ?? ''] ?? item.module.metadata.reviewStatus ?? '—'}</Badge></td>
            <td className="min-w-0 xl:px-2 xl:py-3"><span className="mb-1 block text-muted-foreground xl:hidden">{copy('Workflow', 'Soạn thảo')}</span>{publishedOnly ? <><Badge variant="success" className="whitespace-normal">{item.authoring?.releasedRevision!=null?`${copy('Published revision','Bản phát hành')} ${item.authoring.releasedRevision}`:copy('Catalog release','Bản danh mục đã phát hành')}</Badge>{item.authoring && latest(item.authoring).state!=='RELEASED' && <p className="mt-1 text-xs text-muted-foreground">{copy('Working workflow','Trạng thái soạn thảo')}: {stateLabels[latest(item.authoring).state]??latest(item.authoring).state}</p>}</> : <Badge className="whitespace-normal" variant={item.authoring ? statusVariant(latest(item.authoring).state) : 'outline'}>{item.authoring ? stateLabels[latest(item.authoring).state] ?? latest(item.authoring).state : item.intake ? copy('Awaiting Expert intake', 'Chờ Expert tiếp nhận') : copy('Not received', 'Chưa tiếp nhận')}</Badge>}{!manager && item.authoring && <p className="mt-1 break-words text-muted-foreground">{person(item.authoring.createdBy)}</p>}{!publishedOnly && item.authoring && (!latest(item.authoring).payload.content.lessons?.length || latest(item.authoring).payload.content.lessons?.some(l => !l.title.trim() || !l.durationSeconds || l.type === 'TEXT' && !l.body?.replace(/<[^>]*>/g, '').trim() || l.type === 'VIDEO' && !(l.assetId || l.videoUrl))) && <p className="mt-1 text-muted-foreground">{copy('Needs content', 'Cần bổ sung nội dung')}</p>}{item.authoring?.createdBy === 'DEVELOPMENT_SEED' && <p className="mt-1 text-muted-foreground">{copy('Development seed', 'Dữ liệu mẫu dev')}</p>}</td>
            <td className="col-span-2 xl:px-1 xl:py-3"><div className="flex items-center justify-center gap-1.5 [&>button]:shrink-0"><Button variant="outline" size="icon" className="size-8" title={copy('View module', 'Xem module')} aria-label={copy('View module', 'Xem module')} onClick={() => setCatalogSelection(item)}><Eye className="size-4 text-primary" aria-hidden="true" /></Button>{(item.authoring || expert && (item.module.knowledgeLevel || item.intake?.expertId === actor?.id)) && <RowActions label={`${copy('Actions for', 'Thao tác cho')} ${item.module.metadata.id}`} compact disabled={busy || contentBusy}><div className="flex flex-wrap gap-2">{item.authoring && controls(item.authoring)}{expert && item.module.knowledgeLevel && item.module.teachings.length === 1 && <Link to={'/expert/skill-assessment-config?' + new URLSearchParams({ owner: item.module.teachings[0].skillId, level: item.module.knowledgeLevel }).toString()} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>{t('scopedPolicy.skillTitle')}</Link>}{!item.authoring && expert && item.intake?.expertId === actor?.id && !item.intake.acceptedBy && <Button variant="outline" size="sm" disabled={busy || contentBusy} onClick={() => { setIntakeSelection(item); setIntakeJobPositions(item.intake?.jobPositionIds ?? []); setIntakeExpert(item.intake?.expertId ?? ''); setError('') }}>{copy('Receive for editing', 'Tiếp nhận chỉnh sửa')}</Button>}</div></RowActions>}</div></td>
          </tr>)}</tbody></table></div></CardContent></Card> : <>          {listItems.map(item => <Card key={item.module.metadata.id}><CardContent className="space-y-3 pt-5"><div className="flex flex-wrap justify-between gap-2"><div className="min-w-0"><Heading level={2} size="card" className="break-words">{item.module.title?.trim() || copy('Untitled module', 'Module chưa có tên')}</Heading><p className="break-words text-body-sm text-muted-foreground">{copy('Skill taught', 'Kỹ năng được dạy')}: {item.module.teachings.length ? item.module.teachings.map(teaching => teaching.skillName?.trim() || copy('Skill name unavailable', 'Chưa có tên kỹ năng')).join(', ') : copy('No skill linked', 'Chưa liên kết kỹ năng')}</p><div className="mt-2 flex flex-wrap gap-2">{item.module.knowledgeLevel && <Badge variant="secondary">{stateLabels[item.module.knowledgeLevel] ?? item.module.knowledgeLevel}</Badge>}{item.authoring?.createdBy === 'DEVELOPMENT_SEED' && <Badge variant="outline">{copy('Development seed', 'Dữ liệu mẫu dev')}</Badge>}</div></div>
            <div className="flex flex-wrap items-start gap-2"><Badge variant={statusVariant(item.module.metadata.status)}>{item.module.metadata.status ? stateLabels[item.module.metadata.status] ?? item.module.metadata.status : copy('Lifecycle not recorded', 'Chưa có vòng đời')}</Badge><Badge variant={statusVariant(item.module.metadata.reviewStatus)}>{item.module.metadata.reviewStatus ? stateLabels[item.module.metadata.reviewStatus] ?? item.module.metadata.reviewStatus : copy('Review not recorded', 'Chưa có thông tin duyệt')}</Badge>{!item.authoring && <Badge variant="warning">{item.intake ? copy('Awaiting Expert intake', 'Chờ Expert tiếp nhận') : copy('Not received', 'Chưa tiếp nhận')}</Badge>}{item.authoring && (!latest(item.authoring).payload.content.lessons?.length || latest(item.authoring).payload.content.lessons?.some(l => !l.title.trim() || !l.durationSeconds || l.type === 'TEXT' && !l.body?.replace(/<[^>]*>/g, '').trim() || l.type === 'VIDEO' && !(l.assetId || l.videoUrl))) && <Badge variant="warning">{copy('Needs content', 'Cần bổ sung nội dung')}</Badge>}{item.authoring && <Badge variant={statusVariant(latest(item.authoring).state)}>{stateLabels[latest(item.authoring).state] ?? latest(item.authoring).state}</Badge>}</div></div>
            <p className="text-[length:var(--text-body-sm)] text-muted-foreground">{item.module.duration ?? '—'} {copy('minutes', 'phút')} · · {copy('Catalog version', 'Phiên bản danh mục')} {item.module.metadata.version ?? '—'}</p>
            {item.authoring && latest(item.authoring).payload.title !== item.module.title && <p className="break-words text-[length:var(--text-body-sm)]">{copy('Working revision', 'Phiên bản đang chỉnh sửa')}: {latest(item.authoring).payload.title}</p>}
            {item.authoring && <div className="space-y-1 text-[length:var(--text-body-sm)] text-muted-foreground">
              <p>{copy('Created by / Responsible Expert', 'Người tạo / Expert phụ trách')}: {person(item.authoring.createdBy)}</p>
              <p>{copy('Last edited', 'Sửa gần nhất')}: {person(latest(item.authoring).editedBy)} · {formatTime(latest(item.authoring).editedAt)}</p>
              {latest(item.authoring).decidedBy && <p>{copy('Reviewed by', 'Người duyệt')}: {person(latest(item.authoring).decidedBy)} · {formatTime(latest(item.authoring).decidedAt)}</p>}
              {expert && !canManage(item.authoring) && <Badge variant="outline">{copy('View only', 'Chỉ xem')}</Badge>}
            </div>}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setCatalogSelection(item)}>{copy('View module', 'Xem module')}</Button>
              {expert && item.module.knowledgeLevel && item.module.teachings.length === 1 && <Link to={'/expert/skill-assessment-config?' + new URLSearchParams({ owner: item.module.teachings[0].skillId, level: item.module.knowledgeLevel }).toString()} className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'border border-primary/20 font-semibold' })}>{t('scopedPolicy.skillTitle')}</Link>}
              {item.authoring && controls(item.authoring)}
            </div>
            {!item.authoring && <div className="space-y-2">
              <p className="text-[length:var(--text-body-sm)] text-muted-foreground">{item.intake ? copy('Waiting for an assigned Expert to receive this module.', 'Đang chờ chuyên gia được phân công tiếp nhận module.') : copy('Not received into the editing and approval workflow.', 'Chưa tiếp nhận vào quy trình chỉnh sửa và duyệt.')}</p>
              {item.intake && <p className="text-[length:var(--text-body-sm)]">{copy('Related job positions', 'Vị trí công việc liên quan')}: {item.intake.jobPositionIds.map(id => jobPositions.find(o => o.id === id)?.name ?? id).join(', ')}</p>}
              {(expert && item.intake?.expertId === actor?.id && !item.intake?.acceptedBy) && <Button variant="outline" size="sm" disabled={busy || contentBusy} onClick={() => { setIntakeSelection(item); setIntakeJobPositions(item.intake?.jobPositionIds ?? []); setIntakeExpert(item.intake?.expertId ?? (experts.length === 1 ? experts[0].id : '')); setError('') }}>{manager ? item.intake ? copy('Update intake assignment', 'Cập nhật phân công tiếp nhận') : copy('Assign for intake', 'Phân công tiếp nhận') : copy('Receive for editing', 'Tiếp nhận chỉnh sửa')}</Button>}
            </div>}
          </CardContent></Card>)}
          </>}
          <Pagination className="max-w-full [&_nav]:max-w-full [&_nav]:flex-wrap [&_nav]:justify-center [&_nav>div]:flex-wrap [&_nav>div]:justify-center" currentPage={displayedPage.page} totalPages={Math.ceil(displayedPage.total / displayedPage.pageSize)} totalItems={displayedPage.total} pageSize={displayedPage.pageSize} onPageChange={setPageNumber} disabled={busy || contentBusy || loading} itemLabel={copy('modules', 'module')} labels={{ navigation: copy('Pagination', 'Phân trang'), first: copy('First page', 'Trang đầu'), previous: copy('Prev', 'Trước'), next: copy('Next', 'Tiếp'), last: copy('Last page', 'Trang cuối'), showing: copy('Showing', 'Hiển thị'), of: copy('of', 'trên') }} />
        </>}
      </>}
    </>}

    <Dialog open={intakeSelection !== null} onOpenChange={open => { if (!busy && !contentBusy && !open) setIntakeSelection(null) }} ariaLabel={manager ? copy('Assign for intake', 'Phân công tiếp nhận') : copy('Receive for editing', 'Tiếp nhận chỉnh sửa')}>
      <DialogHeader><DialogTitle>{manager ? copy('Assign responsible Expert', 'Phân công Expert phụ trách') : copy('Receive imported module', 'Tiếp nhận module nhập vào')}</DialogTitle></DialogHeader>
      <form className="space-y-4 overflow-y-auto" onSubmit={event => { event.preventDefault(); if (!intakeSelection) return; const item = intakeSelection; void run(async () => {
        if (manager) await moduleRequest(`/catalog-modules/${encodeURIComponent(item.module.metadata.id)}/assignment`, 'POST', { expertId: intakeExpert, jobPositionIds: intakeJobPositions, expectedAssignedAt: item.intake?.assignedAt ?? null })
        else {
          const doc = await moduleRequest<ModuleDocument>(`/catalog-modules/${encodeURIComponent(item.module.metadata.id)}/accept`, 'POST')
          setIntakeSelection(null); await load(); openEditor(doc); return
        }
        setIntakeSelection(null); await load(); setNotice(copy('Assigned. Only the selected Expert can receive and manage this module.', 'Đã phân công. Chỉ Expert được chọn có thể tiếp nhận và quản lý module.'))
      }) }}>
        <p className="break-words">{intakeSelection?.module.title}</p>
        <p className="text-[length:var(--text-body-sm)] text-muted-foreground">{copy('The selected Expert will manage this module. Its source and earlier history are retained. Changes require approval before publication.', 'Expert được chọn chịu trách nhiệm quản lý module. Giữ nguyên nguồn và lịch sử trước đây. Mọi thay đổi cần được duyệt trước khi phát hành.')}</p>
        {error && <p role="alert" tabIndex={-1} className="text-destructive">{error}</p>}
        {manager && <Field label={copy('Responsible Expert', 'Expert phụ trách')}><select required className={control} disabled={busy || contentBusy} value={intakeExpert} onChange={event => setIntakeExpert(event.target.value)}><option value="">{copy('Select one Expert', 'Chọn một Expert')}</option>{experts.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>}
        {manager && <Field label={copy('Related job positions', 'Vị trí công việc liên quan')}>{scopeSelector(intakeJobPositions, setIntakeJobPositions, busy)}</Field>}
        <DialogFooter><Button type="button" variant="outline" disabled={busy || contentBusy} onClick={() => setIntakeSelection(null)}>{copy('Cancel', 'Hủy')}</Button><Button type="submit" disabled={busy || contentBusy}>{manager ? copy('Assign', 'Phân công') : copy('Receive module', 'Tiếp nhận module')}</Button></DialogFooter>
      </form>
    </Dialog>
    <CatalogModuleDetails history={catalogSelection?.authoring ? historyView(catalogSelection.authoring) : undefined} content={catalogSelection ? publishedModuleRevision(catalogSelection)?.payload.content ?? catalogSelection.authoring?.revisions.find(revision => revision.payload.contentUri === catalogSelection.module.contentUri && revision.payload.contentVersion === catalogSelection.module.contentVersion)?.payload.content : undefined} authoringLabel={publishedOnly ? copy('View working revisions & history', 'Xem bản soạn thảo và lịch sử') : undefined} module={catalogSelection?.module ?? null} hasHistory={catalogSelection?.authoring !== null && catalogSelection !== null} staff={staff} onOpenAuthoring={catalogSelection?.authoring ? () => { const doc = catalogSelection.authoring!; setCatalogSelection(null); void run(async () => { setSelected(await moduleRequest<ModuleDocument>(`/modules/${doc.id}`)); setEditing(false) }) } : undefined} onClose={() => setCatalogSelection(null)} actions={manager && catalogSelection && !catalogSelection.authoring && !catalogSelection.intake?.acceptedBy ? <Button disabled={busy || contentBusy} onClick={() => { const item = catalogSelection; setCatalogSelection(null); setIntakeSelection(item); setIntakeJobPositions(item.intake?.jobPositionIds ?? []); setIntakeExpert(item.intake?.expertId ?? (experts.length === 1 ? experts[0].id : '')); setError('') }}>{catalogSelection.intake ? copy('Update intake assignment', 'Cập nhật phân công tiếp nhận') : copy('Assign for intake', 'Phân công tiếp nhận')}</Button> : undefined} />
    <Dialog open={editing} onOpenChange={open => { if (!busy && !contentBusy) { setEditing(open); if (!open) setSelected(null) } }} size="wide" className="module-authoring-dialog h-[96dvh] max-h-[96dvh] max-w-[96vw] p-4 sm:p-6" ariaLabel={copy('Module editor', 'Chỉnh sửa module')}>
      <DialogHeader><DialogTitle>{selected ? copy('Create a revised package', 'Chỉnh sửa gói học') : copy('Create module', 'Tạo module')}</DialogTitle></DialogHeader>
      <form className="flex min-h-0 flex-1 flex-col" onInvalidCapture={event => {
        const field = event.target as HTMLInputElement
        const section = field.closest('[data-authoring-section]')?.getAttribute('data-authoring-section')
        if (section && section !== authoringSection) {
          event.preventDefault(); setAuthoringSection(section)
          requestAnimationFrame(() => { field.focus(); field.reportValidity() })
        }
      }} onSubmit={event => { event.preventDefault(); void run(async () => {
        if (form.teachings.length !== 1 || !moduleSkills.some(skill => skill.id === form.teachings[0].skillId)) throw new Error(copy('Choose exactly one skill.', 'Chọn đúng một kỹ năng.'))
        const prepared = await moduleRequest<ModuleContent>('/contents/lessons', 'POST', { title: form.title, lessons: moduleLessons })
        const savedForm = { ...form, contentId: prepared.id }
        await moduleRequest<ModuleDocument>(selected ? `/modules/${selected.id}` : '/modules', selected ? 'PUT' : 'POST', selected ? { expectedVersion: selected.lockVersion, value: savedForm } : savedForm)
        setEditing(false); setSelected(null); await load(); setNotice(copy('Draft saved. Submit it for review before release.', 'Đã lưu bản nháp. Hãy gửi duyệt trước khi phát hành.')); toast({ description: copy('Draft saved.', 'Đã lưu bản nháp.'), variant: 'success', duration: 3000 })
      }) }}>
        <DialogBody className="space-y-4 px-0.5 py-2">
        {error && <p role="alert" tabIndex={-1} className="text-destructive">{error}</p>}
        {error && selected && <Button type="button" variant="outline" disabled={busy || contentBusy} onClick={() => void run(async () => { setConflict(await moduleRequest<ModuleDocument>(`/modules/${selected.id}`)) })}>{copy('Compare with latest revision', 'So sánh với phiên bản mới nhất')}</Button>}
        {conflict && <div className="space-y-3 rounded-lg border border-border bg-muted p-3">
          <p className="font-semibold">{copy('Latest saved revision', 'Phiên bản đã lưu mới nhất')}: {latest(conflict).number} · {latest(conflict).editedBy}</p>
          <p>{latest(conflict).payload.title} · {latest(conflict).payload.duration} {copy('minutes', 'phút')}</p>
          <p>{latest(conflict).payload.content.title} · {stateLabels[latest(conflict).payload.moduleType]}</p>
          {latest(conflict).payload.teachings.map(t => <p key={t.skillId}>{t.skillName}</p>)}
          <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => { setSelected(conflict); setConflict(null); setNotice(copy('Your edits are retained. Review them before saving against the latest revision.', 'Đã giữ nội dung bạn nhập. Hãy kiểm tra trước khi lưu trên phiên bản mới nhất.')) }}>{copy('Keep my edits on this revision', 'Giữ nội dung tôi sửa trên phiên bản này')}</Button>
          <Button type="button" variant="outline" onClick={() => openEditor(conflict)}>{copy('Replace form with latest values', 'Điền lại bằng dữ liệu mới nhất')}</Button></div>
        </div>}
        <fieldset disabled={busy || contentBusy} className="min-w-0">
        <Tabs value={authoringSection} onValueChange={setAuthoringSection}>
          <TabsList aria-label={copy('Module authoring sections', 'Nội dung soạn module')} className="mb-4 h-auto min-h-10 w-auto flex-wrap"><TabsTrigger value="details" disabled={busy || contentBusy}>{copy('Module details', 'Thông tin module')}</TabsTrigger><TabsTrigger value="content" disabled={busy || contentBusy}>{copy('Learning content', 'Nội dung học')}</TabsTrigger></TabsList>
          <TabsContent value="details" forceMount data-authoring-section="details" className="mx-auto max-w-4xl space-y-5">
        <section aria-label={copy('Basic information', 'Thông tin cơ bản')} className="space-y-3"><Heading level={3} size="card">{copy('Basic information', 'Thông tin cơ bản')}</Heading><div className="grid gap-4 sm:grid-cols-2"><Field label={copy('Title', 'Tên module')}><Input required maxLength={240} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label={copy('Module type', 'Loại module')}><select className={control} value={form.moduleType} onChange={e => setForm({ ...form, moduleType: e.target.value })}><option value="LESSON_AND_PRACTICE">{copy('Lesson and practice', 'Bài học và thực hành')}</option><option value="RESOURCE_GUIDED_PRACTICE">{copy('Resource-guided practice', 'Thực hành theo tài liệu')}</option></select></Field>
          <Field label={copy('Duration (minutes)', 'Thời lượng (phút)')}><Input required type="number" min={1} step={1} value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} /></Field></div></section>
        <section aria-label={copy('Skill alignment', 'Liên kết kỹ năng')} className="space-y-3 border-t border-border pt-4"><Heading level={3} size="card">{copy('Skill alignment', 'Liên kết kỹ năng')}</Heading>
        <p className="text-body-sm text-muted-foreground">{copy('Each module teaches one skill. A skill may have several modules.', 'Mỗi module dạy một kỹ năng. Một kỹ năng có thể có nhiều module.')}</p>
        <Field label={copy('Skill', 'Kỹ năng')}><select required disabled={!moduleSkills.length} aria-describedby="module-skill-eligibility" className={control} value={form.teachings[0]?.skillId ?? ''} onChange={e => { setForm({ ...form, teachings: [{ skillId: e.target.value }], knowledgeLevel: '' }) }}><option value="">{copy('Select skill', 'Chọn kỹ năng')}</option>{moduleSkills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <p id="module-skill-eligibility" role="status" className="text-body-sm text-muted-foreground">{!moduleSkills.length ? copy('No active, approved skills are available in this organization. Approve and activate a skill before creating a module.', 'Tổ chức chưa có kỹ năng đang hoạt động và đã được duyệt. Hãy duyệt và kích hoạt kỹ năng trước khi tạo module.') : form.teachings[0]?.skillId && !moduleSkills.some(skill => skill.id === form.teachings[0].skillId) ? copy('The selected skill is no longer eligible. Choose an active, approved skill.', 'Kỹ năng đã chọn không còn đủ điều kiện. Hãy chọn kỹ năng đang hoạt động và đã được duyệt.') : copy('Only active, approved skills in this organization are listed.', 'Chỉ hiển thị kỹ năng thuộc tổ chức, đang hoạt động và đã được duyệt.')}</p>
        <Field label={copy('Knowledge level', 'Mức kiến thức')}><select required className={control} value={form.knowledgeLevel ?? ''} onChange={e => { setForm({ ...form, knowledgeLevel: e.target.value }) }}><option value="">{copy('Select level', 'Chọn mức')}</option><option value="FOUNDATION">{copy('Foundation', 'Nền tảng')}</option><option value="INTERMEDIATE">{copy('Intermediate', 'Trung cấp')}</option><option value="ADVANCED">{copy('Advanced', 'Nâng cao')}</option></select></Field>
        </section></TabsContent><TabsContent value="content" forceMount data-authoring-section="content"><section aria-label={copy('Learning content', 'Nội dung học')} className="min-w-0"><LearningLessonsEditor onBusyChange={setContentBusy} disabled={busy || contentBusy} lessons={moduleLessons} onChange={setModuleLessons} />
        </section></TabsContent></Tabs></fieldset>
        </DialogBody><DialogFooter><p className="mr-auto text-xs text-muted-foreground">{copy('Save a draft first, then submit it from the module actions.', 'Lưu bản nháp trước, sau đó gửi duyệt từ thao tác của module.')}</p><Button type="button" variant="outline" disabled={busy || contentBusy} onClick={() => { setEditing(false); setSelected(null) }}>{copy('Cancel', 'Hủy')}</Button><Button type="submit" disabled={busy || contentBusy || !moduleSkills.some(skill => skill.id === form.teachings[0]?.skillId)}>{copy('Save draft', 'Lưu bản nháp')}</Button></DialogFooter>
      </form>
    </Dialog>

    <Dialog open={Boolean(selected) && !editing} onOpenChange={open => { if (!open) setSelected(null) }} className="module-management-dialog w-[96vw] max-w-7xl max-h-[94dvh]" ariaLabel={mode === 'approvals' ? copy('Review module request', 'Duyệt yêu cầu module') : copy('Module details', 'Chi tiết module')}>
      <DialogHeader><DialogTitle>{selected && latest(selected).payload.title}</DialogTitle>{selected && <div className="flex flex-wrap items-center gap-2"><CopyableId code={selected.id} vi={language === 'vi'} entity={copy('module ID', 'mã module')} /><span className="text-xs text-muted-foreground">{copy('Lifecycle', 'Vòng đời')}</span><Badge variant={statusVariant(latest(selected).payload.metadata.status)}>{stateLabels[latest(selected).payload.metadata.status] ?? latest(selected).payload.metadata.status}</Badge><span className="text-xs text-muted-foreground">{copy('Review', 'Duyệt')}</span><Badge variant={statusVariant(latest(selected).payload.metadata.reviewStatus)}>{stateLabels[latest(selected).payload.metadata.reviewStatus] ?? latest(selected).payload.metadata.reviewStatus}</Badge><span className="text-xs text-muted-foreground">{copy('Workflow', 'Soạn thảo')}</span><Badge variant={statusVariant(latest(selected).state)}>{stateLabels[latest(selected).state] ?? latest(selected).state}</Badge></div>}</DialogHeader>
      {selected && mode === 'approvals' ? <ModuleApprovalReview key={selected.id + ':' + selected.lockVersion} doc={selected} staff={staff} person={person} formatTime={formatTime} labels={stateLabels} history={historyView(selected)} copy={copy} /> : selected && <DialogBody className="space-y-4 py-2">
        <CatalogModuleDetails key={selected.id + "-" + selected.lockVersion}
          module={latest(selected).payload} content={latest(selected).payload.content}
          review={{by:latest(selected).decidedBy,at:latest(selected).decidedAt}}
          embedded hasHistory={selected.history.length>0} onClose={()=>{}} staff={staff}
          previewLabel={`${copy("Revision", "Phiên bản")} ${latest(selected).number} · ${stateLabels[latest(selected).state] ?? latest(selected).state}`}
          information={<>
        <section className="space-y-2 text-xs"><p>{copy('Created by / Responsible Expert', 'Người tạo / Expert phụ trách')}: {person(selected.createdBy)}{!selected.intake && <> · {formatTime(selected.createdAt)}</>}</p><p>{copy('Released revision', 'Phiên bản đã phát hành')}: {selected.releasedRevision ?? '—'}</p><p>{copy('Revision', 'Phiên bản')}: {latest(selected).number} · {stateLabels[latest(selected).state] ?? latest(selected).state}</p><p>{copy('Last edited', 'Sửa gần nhất')}: {person(latest(selected).editedBy)} · {formatTime(latest(selected).editedAt)}</p>{latest(selected).feedback && <p className="rounded-md bg-muted/40 p-3">{latest(selected).feedback}</p>}</section>
        {selected.intake && <section className="space-y-2 rounded-lg bg-muted/30 p-3 text-xs"><p>{copy('Source', 'Nguồn')}: {copy('Imported catalog', 'Danh mục nhập vào')} · {selected.intake.source.metadata.id}</p><p>{copy('Assigned by', 'Người phân công')}: {person(selected.intake.assignedBy)} · {formatTime(selected.intake.assignedAt)}</p><p>{copy('Received by', 'Người tiếp nhận')}: {person(selected.intake.acceptedBy)} · {formatTime(selected.intake.acceptedAt)}</p><Button variant="outline" size="sm" onClick={() => { setCatalogSelection({ module: selected.intake!.source, authoring: selected, intake: selected.intake }); setSelected(null) }}>{copy('View original catalog record', 'Xem bản danh mục gốc')}</Button></section>}
          </>}
          history={<div className="space-y-4">
            {historyView(selected)}
        <Accordion>{[...selected.revisions].reverse().filter(revision => revision.number !== latest(selected).number).map(revision => <AccordionItem key={revision.number} value={String(revision.number)}><AccordionTrigger>{copy('Revision', 'Phiên bản')} {revision.number} · {stateLabels[revision.state] ?? revision.state}</AccordionTrigger><AccordionContent><div className="space-y-4 pt-2"><p className="text-xs text-muted-foreground">{copy('Edited by', 'Người sửa')}: {person(revision.editedBy)} · {formatTime(revision.editedAt)}</p>{revision.feedback && <p className="rounded-md bg-muted/40 p-3 text-sm">{revision.feedback}</p>}<CatalogModuleDetails module={revision.payload} content={revision.payload.content} review={{ by: revision.decidedBy, at: revision.decidedAt }} embedded hasHistory={true} onClose={() => {}} staff={staff} /></div></AccordionContent></AccordionItem>)}</Accordion>          </div>}
        />
      </DialogBody>}
      <DialogFooter><div className="flex flex-1 flex-wrap gap-2">{selected && controls(selected, false)}</div><Button size="sm" variant="outline" onClick={() => setSelected(null)}>{copy('Close', 'Đóng')}</Button></DialogFooter>
    </Dialog>

    <Dialog open={contentOpen} onOpenChange={open => { if (!busy) setContentOpen(open) }} className="max-w-3xl" ariaLabel={copy('Create content', 'Tạo nội dung')}>
      <DialogHeader><DialogTitle>{copy('Create a content version', 'Tạo phiên bản nội dung')}</DialogTitle></DialogHeader>
      <form className="space-y-4 overflow-y-auto px-1" onSubmit={event => { event.preventDefault(); void run(async () => { await moduleRequest('/contents/lessons', 'POST', contentForm); setContentOpen(false); await load(); setNotice(copy('Content saved. It will be reviewed with its module.', 'Đã lưu nội dung. Nội dung sẽ được duyệt cùng module.')) }) }}>
        {error && <p role="alert" tabIndex={-1} className="text-destructive">{error}</p>}
        <fieldset disabled={busy || contentBusy} className="space-y-4"><Field label={copy('Title', 'Tiêu đề')}><Input required maxLength={240} value={contentForm.title} onChange={e => setContentForm({ ...contentForm, title: e.target.value })} /></Field>
        <LearningLessonsEditor onBusyChange={setContentBusy} disabled={busy || contentBusy} lessons={contentForm.lessons} onChange={lessons => setContentForm({ ...contentForm, lessons })} /></fieldset>
        <DialogFooter><Button type="button" variant="outline" disabled={busy || contentBusy} onClick={() => setContentOpen(false)}>{copy('Cancel', 'Hủy')}</Button><Button disabled={busy || contentBusy} type="submit">{copy('Save content', 'Lưu nội dung')}</Button></DialogFooter>
      </form>
    </Dialog>
    <Dialog open={preview !== null} onOpenChange={open => { if (!open) setPreview(null) }} className="max-w-3xl" ariaLabel={copy('Content preview', 'Xem trước nội dung')}><DialogHeader><DialogTitle>{preview?.title}</DialogTitle></DialogHeader><div className="overflow-y-auto">{preview && <LearningLessonList lessons={preview.lessons} />}</div></Dialog>
    <Dialog open={confirm !== null} onOpenChange={open => { if (!busy && !contentBusy && !open) setConfirm(null) }} ariaLabel={confirm ? actionLabels[confirm.action] : ''}>
      <DialogHeader><DialogTitle>{confirm && actionLabels[confirm.action]}</DialogTitle></DialogHeader>
      <p className="break-words text-[length:var(--text-body-sm)]">{confirm && latest(confirm.doc).payload.title}</p>
      {confirm?.action === 'delete' && <p className="mt-3 text-[length:var(--text-body-sm)] text-destructive">{copy('This permanently removes the unreferenced draft.', 'Thao tác này xóa vĩnh viễn bản nháp chưa được sử dụng.')}</p>}
      {error && <p role="alert" tabIndex={-1} className="mt-3 text-destructive">{error}</p>}
      <form className="mt-3 space-y-3" onSubmit={event => { event.preventDefault(); if (!confirm) return; void run(async () => {
        if (confirm.action === 'delete') await moduleRequest(`/modules/${confirm.doc.id}?expectedVersion=${confirm.doc.lockVersion}`, 'DELETE')
        else await moduleRequest(`/modules/${confirm.doc.id}/actions`, 'POST', { expectedVersion: confirm.doc.lockVersion, action: confirm.action, feedback })
        setConfirm(null); setSelected(null); await load(); setNotice(copy('Action completed.', 'Đã hoàn tất thao tác.'))
      }) }}>
        {confirm?.action === 'return' && <Field label={copy('Required feedback', 'Nội dung yêu cầu chỉnh sửa')}><textarea required maxLength={2000} className={control} value={feedback} onChange={e => setFeedback(e.target.value)} /></Field>}
        <DialogFooter><Button type="button" variant="outline" disabled={busy || contentBusy} onClick={() => setConfirm(null)}>{copy('Cancel', 'Hủy')}</Button><Button type="submit" disabled={busy || contentBusy}>{copy('Confirm', 'Xác nhận')}</Button></DialogFooter>
      </form>
    </Dialog>
  </div></WorkspaceLayout>
}
