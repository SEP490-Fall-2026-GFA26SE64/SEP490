import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { Button } from '../../../shared/components/ui/Button'
import { Badge } from '../../../shared/components/ui/Badge'
import { Input } from '../../../shared/components/ui/Input'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '../../../shared/components/ui/Dialog'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { ModuleMarkdown } from '../../../shared/components/ui/ModuleMarkdown'
import { FormField as Field } from '../../../shared/components/ui/FormField'
import { Heading } from '../../../shared/components/typography/Heading'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { moduleRequest, type CatalogChoice, type ModuleActor, type ModuleCatalogItem, type ModuleCatalogPage, type ModuleContent, type ModuleDocument, type ModulePage, type ModuleRevision, type ModuleSave, type OccupationGrant, type TeachingInput } from '../../../shared/api/moduleAuthoringApi'

import { CatalogModuleDetails } from './CatalogModuleDetails'

type Mode = 'modules' | 'content' | 'approvals' | 'learning'
const control = 'min-h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-[length:var(--text-body-sm)] text-foreground focus:outline-none focus:ring-2 focus:ring-primary'
const latest = (doc: ModuleDocument) => doc.revisions[doc.revisions.length - 1]
const initialForm = (): ModuleSave => ({ title: '', moduleType: 'LESSON_AND_PRACTICE', contentId: '', duration: 1, price: 1, occupationIds: [], teachings: [] })
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Unable to complete the request.'

export function ModuleManagementWorkspace({ mode = 'modules' }: { mode?: Mode }) {
  const { language } = useTranslation()
  const copy = (en: string, vi: string) => language === 'vi' ? vi : en
  const { moduleId } = useParams()
  const navigate = useNavigate()
  const [actor, setActor] = useState<ModuleActor | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [sessionAttempt, setSessionAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const mutation = useRef(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [page, setPage] = useState<ModulePage>({ items: [], total: 0, page: 1, pageSize: 10 })
  const [catalogPage, setCatalogPage] = useState<ModuleCatalogPage>({ items: [], total: 0, page: 1, pageSize: 10 })
  const [intakeSelection, setIntakeSelection] = useState<ModuleCatalogItem | null>(null)
  const [intakeOccupations, setIntakeOccupations] = useState<string[]>([])
  const [catalogSelection, setCatalogSelection] = useState<ModuleCatalogItem | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [filters, setFilters] = useState({ search: '', status: '', review: '', type: '', skill: '' })
  const [occupations, setOccupations] = useState<CatalogChoice[]>([])
  const [skills, setSkills] = useState<CatalogChoice[]>([])
  const [contents, setContents] = useState<ModuleContent[]>([])
  const [grants, setGrants] = useState<OccupationGrant[]>([])
  const [experts, setExperts] = useState<CatalogChoice[]>([])
  const [grantForm, setGrantForm] = useState({ expertId: '', occupationId: '' })
  const [selected, setSelected] = useState<ModuleDocument | null>(null)
  const [conflict, setConflict] = useState<ModuleDocument | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<ModuleSave>(initialForm)
  const [contentOpen, setContentOpen] = useState(false)
  const [contentForm, setContentForm] = useState({ title: '', markdown: '', occupationIds: [] as string[] })
  const [preview, setPreview] = useState<ModuleContent | null>(null)
  const [confirm, setConfirm] = useState<{ doc: ModuleDocument; action: string } | null>(null)
  const [feedback, setFeedback] = useState('')
  const [learning, setLearning] = useState<ModuleRevision | null>(null)
  const manager = actor?.roles.includes('LD_MANAGER') ?? false
  const expert = actor?.roles.includes('EXPERT') ?? false

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
        const query = new URLSearchParams({ ...filters, page: String(pageNumber) })
        const listRequest = mode === 'modules'
          ? moduleRequest<ModuleCatalogPage>(`/module-list?${query}`, 'GET', undefined, signal).then(setCatalogPage)
          : mode === 'content' ? Promise.resolve() : moduleRequest<ModulePage>(`/modules?${query}`, 'GET', undefined, signal).then(setPage)
        const [, nextOccupations, nextSkills, nextContents] = await Promise.all([
          listRequest,
          moduleRequest<CatalogChoice[]>('/catalog/Occupation', 'GET', undefined, signal),
          moduleRequest<CatalogChoice[]>('/catalog/MicroSkill', 'GET', undefined, signal),
          moduleRequest<ModuleContent[]>('/contents', 'GET', undefined, signal),
        ])
        setOccupations(nextOccupations); setSkills(nextSkills); setContents(nextContents)
        if (actor.roles.includes('LD_MANAGER')) {
          const [nextGrants, nextExperts] = await Promise.all([moduleRequest<OccupationGrant[]>('/grants', 'GET', undefined, signal), moduleRequest<CatalogChoice[]>('/catalog/Expert', 'GET', undefined, signal)])
          setGrants(nextGrants); setExperts(nextExperts)
        }
      }
    } catch (failure) { if (!signal?.aborted) setError(errorText(failure)) }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [actor, mode, moduleId, filters, pageNumber])

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => { void load(controller.signal) }, 180)
    return () => { clearTimeout(timeout); controller.abort() }
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
      setForm({ title: p.title, moduleType: p.moduleType, contentId: p.content.id, duration: p.duration, price: p.price,
        occupationIds: doc.occupationIds, teachings: p.teachings.map(t => ({ skillId: t.skillId, teachingFocus: t.teachingFocus, difficultyLevel: t.difficultyLevel })) })
    } else setForm(initialForm())
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
    contentType: copy('Content format', 'Định dạng nội dung'), contentVersion: copy('Content version', 'Phiên bản nội dung'), duration: copy('Duration (minutes)', 'Thời lượng (phút)'), price: copy('Package price (VND)', 'Giá gói học (VND)'),
    content: copy('Learning content', 'Nội dung học'), teachings: copy('Skills taught', 'Kỹ năng được dạy'),
  }
  const stateLabels: Record<string, string> = {
    DRAFT: copy('Draft', 'Bản nháp'), ACTIVE: copy('Active', 'Đang sử dụng'), ARCHIVED: copy('Archived', 'Đã lưu trữ'),
    NEEDS_EXPERT_REVIEW: copy('Not approved', 'Chưa được duyệt'), APPROVED: copy('Approved', 'Đã duyệt'), REJECTED: copy('Changes requested', 'Cần chỉnh sửa'),
    SUBMITTED: copy('Submitted', 'Đã gửi duyệt'), RETURNED: copy('Returned for changes', 'Yêu cầu chỉnh sửa'), RELEASED: copy('Released', 'Đã phát hành'),
    PUBLISH_PENDING: copy('Awaiting publication', 'Chờ phát hành'), ARCHIVE_PENDING: copy('Archiving', 'Đang lưu trữ'), ARCHIVE_REQUESTED: copy('Archive requested', 'Đã yêu cầu lưu trữ'),
    LESSON_AND_PRACTICE: copy('Lesson and practice', 'Bài học và thực hành'), RESOURCE_GUIDED_PRACTICE: copy('Resource-guided practice', 'Thực hành theo tài liệu'),
    PRIMARY: copy('Primary', 'Chính'), SUPPORTING: copy('Supporting', 'Hỗ trợ'), INCIDENTAL: copy('Incidental', 'Ngữ cảnh'), LOW: copy('Low', 'Thấp'), MEDIUM: copy('Medium', 'Trung bình'), HIGH: copy('High', 'Cao'),
    'text/markdown': 'Markdown',
  }
  const eventLabels: Record<string, string> = { ASSIGN_INTAKE: copy('Assigned for intake', 'Phân công tiếp nhận'), INTAKE: copy('Received imported module', 'Tiếp nhận module nhập vào'), CREATE: copy('Created', 'Đã tạo'), EDIT: copy('Edited', 'Đã sửa'), SUBMIT: copy('Submitted for review', 'Đã gửi duyệt'), RETURN: copy('Returned for changes', 'Đã yêu cầu chỉnh sửa'), APPROVE: copy('Approved', 'Đã duyệt'), RETRY: copy('Retried publication', 'Đã thử phát hành lại'), REQUEST_ARCHIVE: copy('Requested archive', 'Đã yêu cầu lưu trữ'), APPROVE_ARCHIVE: copy('Approved archive', 'Đã duyệt lưu trữ'), RESTORE: copy('Restored to draft', 'Đã khôi phục bản nháp'), RELEASED: copy('Released', 'Đã phát hành'), ARCHIVED: copy('Archived', 'Đã lưu trữ') }
  function ask(doc: ModuleDocument, action: string) { setConfirm({ doc, action }); setFeedback(''); setError('') }
  function controls(doc: ModuleDocument) {
    const state = latest(doc).state
    const actions: string[] = []
    if (expert) {
      if (['DRAFT', 'RETURNED'].includes(state)) actions.push('submit')
      if (state === 'RELEASED' && !doc.archived) actions.push('request-archive')
      if (state === 'ARCHIVED') actions.push('restore')
      if (!doc.intake && !doc.everReleased && state === 'DRAFT') actions.push('delete')
    }
    if (manager) {
      if (state === 'SUBMITTED') actions.push('approve', 'return')
      if (state === 'ARCHIVE_REQUESTED') actions.push('approve-archive', 'return')
      if (['PUBLISH_PENDING', 'ARCHIVE_PENDING'].includes(state)) actions.push('retry')
    }
    return <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" disabled={busy} onClick={() => void run(async () => { setSelected(await moduleRequest<ModuleDocument>(`/modules/${doc.id}`)); setEditing(false) })}>{copy('Details & history', 'Chi tiết và lịch sử')}</Button>
      {expert && ['DRAFT', 'RETURNED', 'RELEASED'].includes(state) && <Button variant="outline" size="sm" disabled={busy} onClick={() => openEditor(doc)}>{copy('Edit', 'Chỉnh sửa')}</Button>}
      {actions.map(action => <Button variant="outline" size="sm" disabled={busy} key={action} onClick={() => ask(doc, action)}>{actionLabels[action]}</Button>)}
    </div>
  }
  const scopeSelector = (value: string[], onChange: (values: string[]) => void, disabled = false) => <select multiple required className={control} disabled={disabled} value={value} onChange={e => onChange(Array.from(e.target.selectedOptions, option => option.value))}>
    {occupations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
  </select>
  const moduleHome = manager ? '/ld-manager/modules' : '/expert/modules'
  const contentHome = manager ? '/ld-manager/learning-content' : '/expert/learning-content'
  const title = mode === 'content' ? manager ? copy('Learning content', 'Nội dung học tập') : copy('Content Studio', 'Biên soạn nội dung') : mode === 'approvals' ? copy('Learning approvals', 'Duyệt gói học') : mode === 'learning' ? copy('Module lessons', 'Nội dung bài học') : copy('Learning modules', 'Quản lý module học')

  const displayedPage = mode === 'modules' ? catalogPage : page
  const listItems: ModuleCatalogItem[] = mode === 'modules' ? catalogPage.items : page.items.map(doc => ({ module: latest(doc).payload, authoring: doc }))

  return <WorkspaceLayout><div className="space-y-5 text-[length:var(--text-body)] text-foreground">
    <PageHeader title={title} description={manager ? copy('Review learning packages, inspect revisions and manage approval decisions.', 'Xem xét gói học, kiểm tra các phiên bản và quản lý quyết định duyệt.') : copy('Create focused learning packages and keep every revision easy to review.', 'Xây dựng gói học tập trung và theo dõi rõ ràng từng lần chỉnh sửa.')}
      />
    {error && <div role="alert" tabIndex={-1} data-module-error className="rounded-lg border border-destructive bg-card p-3 text-[length:var(--text-body-sm)] text-destructive">{error}{actor && <Button variant="outline" size="sm" className="ml-3" disabled={busy || loading} onClick={() => void load()}>{copy('Reload latest data', 'Tải dữ liệu mới nhất')}</Button>}</div>}
    {notice && <p role="status" className="text-[length:var(--text-body-sm)] text-success">{notice}</p>}
    {!actor ? <Card><CardContent className="space-y-3 pt-6">
      {sessionLoading ? <p role="status">{copy('Loading your session…', 'Đang tải phiên đăng nhập…')}</p> : <>
        <p>{copy('Continue with your workspace account from the main login page.', 'Tiếp tục bằng tài khoản hệ thống tại trang đăng nhập chung.')}</p>
        <Button onClick={() => navigate('/login')}>{copy('Go to login', 'Đến trang đăng nhập')}</Button>
        <Button variant="outline" onClick={() => { setSessionLoading(true); setError(''); setSessionAttempt(value => value + 1) }}>{copy('Retry', 'Thử lại')}</Button>
      </>}
    </CardContent></Card> : <>
      {mode !== 'learning' && <nav className="flex flex-wrap gap-4 text-[length:var(--text-body-sm)] text-primary" aria-label={copy('Learning workspace', 'Không gian học tập')}>
        <Link to={moduleHome}>{copy('Modules', 'Module')}</Link><Link to={contentHome}>{manager ? copy('Learning content', 'Nội dung học tập') : copy('Content Studio', 'Biên soạn nội dung')}</Link>
        {manager && <Link to="/ld-manager/approvals">{copy('Approvals & assignments', 'Duyệt và phân công')}</Link>}
      </nav>}
      {loading ? <div role="status" aria-label={copy('Loading', 'Đang tải')} className="h-32 animate-pulse rounded-xl border border-border bg-muted" /> : null}
      {mode === 'learning' ? <Card><CardContent className="space-y-4 pt-6">
        {!learning ? <Button disabled={busy || loading} onClick={() => void run(async () => { setLearning(await moduleRequest<ModuleRevision>(`/learning/${encodeURIComponent(moduleId ?? '')}/start`, 'POST')) })}>{copy('Start learning', 'Bắt đầu học')}</Button>
          : <><Heading level={2}>{learning.payload.title}</Heading><Badge variant="outline">{copy('Revision', 'Phiên bản')} {learning.number}</Badge><ModuleMarkdown markdown={learning.payload.content.markdown} /></>}
      </CardContent></Card> : <>
        {manager && mode === 'approvals' && <Card><CardContent className="space-y-4 pt-6"><Heading level={2} size="subsection">{copy('Expert assignments by occupation', 'Phân công chuyên gia theo nghề')}</Heading>
          <form className="grid gap-3 sm:grid-cols-3" onSubmit={event => { event.preventDefault(); void run(async () => { await moduleRequest('/grants', 'PUT', { ...grantForm, active: true }); await load(); setNotice(copy('Assignment saved.', 'Đã lưu phân công.')) }) }}>
            <Field label={copy('Expert account', 'Tài khoản chuyên gia')}><select required className={control} value={grantForm.expertId} onChange={e => setGrantForm({ ...grantForm, expertId: e.target.value })}><option value="">{copy('Select expert', 'Chọn chuyên gia')}</option>{experts.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></Field>
            <Field label={copy('Occupation', 'Nghề')}><select required className={control} value={grantForm.occupationId} onChange={e => setGrantForm({ ...grantForm, occupationId: e.target.value })}><option value="">{copy('Select occupation', 'Chọn nghề')}</option>{occupations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
            <Button type="submit" disabled={busy} className="self-end">{copy('Assign expert', 'Phân công')}</Button>
          </form>
          {grants.map(g => <div key={`${g.expertId}:${g.occupationId}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-[length:var(--text-body-sm)]"><span>{g.expertId} · {occupations.find(o => o.id === g.occupationId)?.name ?? g.occupationId}</span><Button variant="outline" size="sm" disabled={busy} onClick={() => void run(async () => { await moduleRequest('/grants', 'PUT', { ...g, active: false }); await load() })}>{copy('Remove assignment', 'Gỡ phân công')}</Button></div>)}
        </CardContent></Card>}
        {mode === 'content' ? <>
          {expert && <Button disabled={busy || !occupations.length} onClick={() => { setContentForm({ title: '', markdown: '', occupationIds: [] }); setContentOpen(true) }}>{copy('Create content', 'Tạo nội dung')}</Button>}
          {!loading && !contents.length && <Card><CardContent className="pt-6">{copy('No content yet. Create your first lesson after an occupation is assigned.', 'Chưa có nội dung. Hãy tạo bài học sau khi được phân công nghề.')}</CardContent></Card>}
          <div className="grid gap-4 md:grid-cols-2">{contents.map(content => <Card key={content.id}><CardContent className="space-y-3 pt-6"><Heading level={2} size="card" className="break-words">{content.title}</Heading><p className="text-[length:var(--text-body-sm)] text-muted-foreground">{copy('Created by', 'Người tạo')}: {content.createdBy ?? copy('Original creator unknown', 'Chưa xác định người tạo gốc')} · {!content.createdBy && <>{copy('Recorded at', 'Ghi nhận lúc')}: </>}{content.createdAt}</p><Button variant="outline" onClick={() => setPreview(content)}>{copy('Preview', 'Xem trước')}</Button></CardContent></Card>)}</div>
        </> : <>
          <div className="grid gap-3 sm:grid-cols-3"><StatCard title={copy('Matching modules', 'Module phù hợp')} value={displayedPage.total} /><StatCard title={copy('Available content', 'Nội dung hiện có')} value={contents.length} /><StatCard title={copy('Occupations in scope', 'Nghề trong phạm vi')} value={occupations.length} /></div>
          <div className="flex flex-wrap items-end gap-3">
            <Field label={copy('Search name or ID', 'Tìm theo tên hoặc ID')}><Input value={filters.search} onChange={e => { setPageNumber(1); setFilters({ ...filters, search: e.target.value }) }} /></Field>
            {(['status', 'review', 'type', 'skill'] as const).map(key => <Field key={key} label={key === 'status' ? copy('Lifecycle', 'Vòng đời') : key === 'review' ? copy('Review', 'Duyệt') : key === 'type' ? copy('Module type', 'Loại module') : copy('Skill', 'Kỹ năng')}><select className={control} value={filters[key]} onChange={e => { setPageNumber(1); setFilters({ ...filters, [key]: e.target.value }) }}><option value="">{copy('All', 'Tất cả')}</option>
              {(key === 'skill' ? skills.map(s => ({ value: s.id, label: s.name })) : (key === 'status' ? ['DRAFT', 'ACTIVE', 'ARCHIVED'] : key === 'review' ? ['NEEDS_EXPERT_REVIEW', 'APPROVED', 'REJECTED'] : ['LESSON_AND_PRACTICE', 'RESOURCE_GUIDED_PRACTICE']).map(value => ({ value, label: stateLabels[value] ?? value }))).map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select></Field>)}
            {expert && <Button disabled={busy || !occupations.length || !contents.length} onClick={() => openEditor()}>{copy('Create module', 'Tạo module')}</Button>}
          </div>
          {!loading && !listItems.length && <Card><CardContent className="space-y-3 pt-6"><p>{copy('No modules match this view. Try changing your filters, or prepare content for a new module.', 'Chưa có module phù hợp. Hãy thử bộ lọc khác hoặc chuẩn bị nội dung cho module mới.')}</p>{expert && <Link className="text-primary underline" to="/expert/learning-content">{copy('Open Content Studio', 'Mở trình biên soạn nội dung')}</Link>}</CardContent></Card>}
          {listItems.map(item => <Card key={item.module.metadata.id}><CardContent className="space-y-3 pt-5"><div className="flex flex-wrap justify-between gap-2"><div className="min-w-0"><Heading level={2} size="card" className="break-words">{item.module.title ?? item.module.metadata.id}</Heading><p className="break-all text-caption text-muted-foreground">{item.module.metadata.id}</p></div>
            <div className="flex flex-wrap gap-2"><Badge variant="outline">{item.module.metadata.status ? stateLabels[item.module.metadata.status] ?? item.module.metadata.status : copy('Lifecycle not recorded', 'Chưa có vòng đời')}</Badge><Badge variant={item.module.metadata.reviewStatus === 'APPROVED' ? 'success' : 'outline'}>{item.module.metadata.reviewStatus ? stateLabels[item.module.metadata.reviewStatus] ?? item.module.metadata.reviewStatus : copy('Review not recorded', 'Chưa có thông tin duyệt')}</Badge>{!item.authoring && <Badge variant="outline">{item.intake ? copy('Awaiting Expert intake', 'Chờ Expert tiếp nhận') : copy('Not received', 'Chưa tiếp nhận')}</Badge>}{item.authoring && <Badge variant="outline">{stateLabels[latest(item.authoring).state] ?? latest(item.authoring).state}</Badge>}</div></div>
            <p className="text-[length:var(--text-body-sm)] text-muted-foreground">{item.module.duration ?? '—'} {copy('minutes', 'phút')} · {item.module.price === null ? '—' : new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: 'VND' }).format(item.module.price)} · {copy('Catalog version', 'Phiên bản danh mục')} {item.module.metadata.version ?? '—'}</p>
            {item.authoring && latest(item.authoring).payload.title !== item.module.title && <p className="break-words text-[length:var(--text-body-sm)]">{copy('Working revision', 'Phiên bản đang chỉnh sửa')}: {latest(item.authoring).payload.title}</p>}
            <Button variant="outline" size="sm" onClick={() => setCatalogSelection(item)}>{copy('View module', 'Xem module')}</Button>
            {item.authoring && controls(item.authoring)}
            {!item.authoring && <div className="space-y-2">
              <p className="text-[length:var(--text-body-sm)] text-muted-foreground">{item.intake ? copy('Waiting for an assigned Expert to receive this module.', 'Đang chờ chuyên gia được phân công tiếp nhận module.') : copy('Not received into the editing and approval workflow.', 'Chưa tiếp nhận vào quy trình chỉnh sửa và duyệt.')}</p>
              {item.intake && <p className="text-[length:var(--text-body-sm)]">{copy('Responsible occupations', 'Nghề phụ trách')}: {item.intake.occupationIds.map(id => occupations.find(o => o.id === id)?.name ?? id).join(', ')}</p>}
              {((manager && !item.intake?.acceptedBy) || (expert && item.intake && !item.intake.acceptedBy)) && <Button variant="outline" size="sm" disabled={busy} onClick={() => { setIntakeSelection(item); setIntakeOccupations(item.intake?.occupationIds ?? []); setError('') }}>{manager ? item.intake ? copy('Update intake assignment', 'Cập nhật phân công tiếp nhận') : copy('Assign for intake', 'Phân công tiếp nhận') : copy('Receive for editing', 'Tiếp nhận chỉnh sửa')}</Button>}
            </div>}
          </CardContent></Card>)}
          <Pagination currentPage={displayedPage.page} totalPages={Math.ceil(displayedPage.total / displayedPage.pageSize)} totalItems={displayedPage.total} pageSize={displayedPage.pageSize} onPageChange={setPageNumber} disabled={busy || loading} itemLabel={copy('modules', 'module')} labels={{ navigation: copy('Pagination', 'Phân trang'), first: copy('First page', 'Trang đầu'), previous: copy('Prev', 'Trước'), next: copy('Next', 'Tiếp'), last: copy('Last page', 'Trang cuối'), showing: copy('Showing', 'Hiển thị'), of: copy('of', 'trên') }} />
        </>}
      </>}
    </>}

    <Dialog open={intakeSelection !== null} onOpenChange={open => { if (!busy && !open) setIntakeSelection(null) }} ariaLabel={manager ? copy('Assign for intake', 'Phân công tiếp nhận') : copy('Receive for editing', 'Tiếp nhận chỉnh sửa')}>
      <DialogHeader><DialogTitle>{manager ? copy('Assign responsible occupations', 'Phân công nghề phụ trách') : copy('Receive imported module', 'Tiếp nhận module nhập vào')}</DialogTitle></DialogHeader>
      <form className="space-y-4 overflow-y-auto" onSubmit={event => { event.preventDefault(); if (!intakeSelection) return; const item = intakeSelection; void run(async () => {
        if (manager) await moduleRequest(`/catalog-modules/${encodeURIComponent(item.module.metadata.id)}/assignment`, 'POST', { occupationIds: intakeOccupations, expectedAssignedAt: item.intake?.assignedAt ?? null })
        else {
          const doc = await moduleRequest<ModuleDocument>(`/catalog-modules/${encodeURIComponent(item.module.metadata.id)}/accept`, 'POST')
          setIntakeSelection(null); await load(); openEditor(doc); return
        }
        setIntakeSelection(null); await load(); setNotice(copy('Assigned. An Expert with access to a responsible occupation can receive the module.', 'Đã phân công. Chuyên gia phụ trách nghề có thể tiếp nhận module.'))
      }) }}>
        <p className="break-words">{intakeSelection?.module.title}</p>
        <p className="text-[length:var(--text-body-sm)] text-muted-foreground">{copy('The original module ID and source are retained. The receiver is recorded separately from the unknown original creator. Changes require approval before publication.', 'Giữ nguyên mã module và nguồn gốc. Người tiếp nhận được ghi nhận riêng với người tạo gốc chưa xác định. Mọi thay đổi cần được duyệt trước khi phát hành.')}</p>
        {error && <p role="alert" tabIndex={-1} className="text-destructive">{error}</p>}
        {manager && <Field label={copy('Responsible occupations', 'Nghề phụ trách')}>{scopeSelector(intakeOccupations, setIntakeOccupations, busy)}</Field>}
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setIntakeSelection(null)}>{copy('Cancel', 'Hủy')}</Button><Button type="submit" disabled={busy}>{manager ? copy('Assign', 'Phân công') : copy('Receive module', 'Tiếp nhận module')}</Button></DialogFooter>
      </form>
    </Dialog>
    <CatalogModuleDetails module={catalogSelection?.module ?? null} hasHistory={catalogSelection?.authoring !== null && catalogSelection !== null} onClose={() => setCatalogSelection(null)} />
    <Dialog open={editing} onOpenChange={open => { if (!busy) { setEditing(open); if (!open) setSelected(null) } }} className="max-w-3xl" ariaLabel={copy('Module editor', 'Chỉnh sửa module')}>
      <DialogHeader><DialogTitle>{selected ? copy('Create a revised package', 'Chỉnh sửa gói học') : copy('Create module', 'Tạo module')}</DialogTitle></DialogHeader>
      <form className="space-y-4 overflow-y-auto px-1" onSubmit={event => { event.preventDefault(); void run(async () => {
        if (form.teachings.filter(t => t.teachingFocus === 'PRIMARY').length !== 1) throw new Error(copy('Choose exactly one primary skill.', 'Chọn đúng một kỹ năng chính.'))
        await moduleRequest<ModuleDocument>(selected ? `/modules/${selected.id}` : '/modules', selected ? 'PUT' : 'POST', selected ? { expectedVersion: selected.lockVersion, value: form } : form)
        setEditing(false); setSelected(null); await load(); setNotice(copy('Draft saved. Submit it for review before release.', 'Đã lưu bản nháp. Hãy gửi duyệt trước khi phát hành.'))
      }) }}>
        {error && <p role="alert" tabIndex={-1} className="text-destructive">{error}</p>}
        {error && selected && <Button type="button" variant="outline" disabled={busy} onClick={() => void run(async () => { setConflict(await moduleRequest<ModuleDocument>(`/modules/${selected.id}`)) })}>{copy('Compare with latest revision', 'So sánh với phiên bản mới nhất')}</Button>}
        {conflict && <div className="space-y-3 rounded-lg border border-border bg-muted p-3">
          <p className="font-semibold">{copy('Latest saved revision', 'Phiên bản đã lưu mới nhất')}: {latest(conflict).number} · {latest(conflict).editedBy}</p>
          <p>{latest(conflict).payload.title} · {latest(conflict).payload.duration} {copy('minutes', 'phút')} · {latest(conflict).payload.price} VND</p>
          <p>{latest(conflict).payload.content.title} · {stateLabels[latest(conflict).payload.moduleType]}</p>
          {latest(conflict).payload.teachings.map(t => <p key={t.skillId}>{t.skillName} · {stateLabels[t.teachingFocus]} · {stateLabels[t.difficultyLevel]}</p>)}
          <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => { setSelected(conflict); setConflict(null); setNotice(copy('Your edits are retained. Review them before saving against the latest revision.', 'Đã giữ nội dung bạn nhập. Hãy kiểm tra trước khi lưu trên phiên bản mới nhất.')) }}>{copy('Keep my edits on this revision', 'Giữ nội dung tôi sửa trên phiên bản này')}</Button>
          <Button type="button" variant="outline" onClick={() => openEditor(conflict)}>{copy('Replace form with latest values', 'Điền lại bằng dữ liệu mới nhất')}</Button></div>
        </div>}
        <fieldset disabled={busy} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label={copy('Title', 'Tên module')}><Input required maxLength={240} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label={copy('Module type', 'Loại module')}><select className={control} value={form.moduleType} onChange={e => setForm({ ...form, moduleType: e.target.value })}><option value="LESSON_AND_PRACTICE">{copy('Lesson and practice', 'Bài học và thực hành')}</option><option value="RESOURCE_GUIDED_PRACTICE">{copy('Resource-guided practice', 'Thực hành theo tài liệu')}</option></select></Field>
          <Field label={copy('Occupations (hold Ctrl / Cmd to select several)', 'Nghề (giữ Ctrl / Cmd để chọn nhiều)')}>{scopeSelector(form.occupationIds, ids => setForm({ ...form, occupationIds: ids, contentId: '' }), selected !== null)}</Field>
          <Field label={copy('Learning content', 'Nội dung học')}><select required className={control} value={form.contentId} onChange={e => setForm({ ...form, contentId: e.target.value })}><option value="">{copy('Select content', 'Chọn nội dung')}</option>{contents.filter(c => form.occupationIds.every(id => c.occupationIds.includes(id))).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></Field>
          <Field label={copy('Duration (minutes)', 'Thời lượng (phút)')}><Input required type="number" min={1} step={1} value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} /></Field>
          <Field label={copy('Package price (VND)', 'Giá gói học (VND)')}><Input required type="number" min={1} step={1} value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} /></Field></div>
        <Heading level={3}>{copy('Skills taught', 'Kỹ năng được dạy')}</Heading>
        <p className="text-[length:var(--text-body-sm)] text-muted-foreground">{copy('Choose one primary skill. Add supporting practice or contextual skills as needed.', 'Chọn một kỹ năng chính. Có thể thêm kỹ năng hỗ trợ hoặc kỹ năng xuất hiện trong ngữ cảnh.')}</p>
        {form.teachings.map((teaching, index) => <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-4" key={index}>
          <Field label={copy('Skill', 'Kỹ năng')}><select required className={control} value={teaching.skillId} onChange={e => setForm({ ...form, teachings: form.teachings.map((t, i) => i === index ? { ...t, skillId: e.target.value } : t) })}><option value="">{copy('Select skill', 'Chọn kỹ năng')}</option>{skills.filter(s => s.id === teaching.skillId || !form.teachings.some(t => t.skillId === s.id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label={copy('Teaching focus', 'Vai trò giảng dạy')}><select className={control} value={teaching.teachingFocus} onChange={e => setForm({ ...form, teachings: form.teachings.map((t, i) => i === index ? { ...t, teachingFocus: e.target.value as TeachingInput['teachingFocus'] } : t) })}>{['PRIMARY', 'SUPPORTING', 'INCIDENTAL'].map(v => <option key={v} value={v}>{v === 'PRIMARY' ? copy('Primary', 'Chính') : v === 'SUPPORTING' ? copy('Supporting', 'Hỗ trợ') : copy('Incidental', 'Ngữ cảnh')}</option>)}</select></Field>
          <Field label={copy('Difficulty', 'Độ khó')}><select className={control} value={teaching.difficultyLevel} onChange={e => setForm({ ...form, teachings: form.teachings.map((t, i) => i === index ? { ...t, difficultyLevel: e.target.value as TeachingInput['difficultyLevel'] } : t) })}>{['LOW', 'MEDIUM', 'HIGH'].map(v => <option key={v} value={v}>{v === 'LOW' ? copy('Low', 'Thấp') : v === 'MEDIUM' ? copy('Medium', 'Trung bình') : copy('High', 'Cao')}</option>)}</select></Field>
          <Button type="button" variant="outline" className="self-end" onClick={() => setForm({ ...form, teachings: form.teachings.filter((_, i) => i !== index) })}>{copy('Remove skill', 'Gỡ kỹ năng')}</Button>
        </div>)}
        <Button type="button" variant="outline" onClick={() => setForm({ ...form, teachings: [...form.teachings, { skillId: '', teachingFocus: form.teachings.length ? 'SUPPORTING' : 'PRIMARY', difficultyLevel: 'LOW' }] })}>{copy('Add skill', 'Thêm kỹ năng')}</Button>
        </fieldset>
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => { setEditing(false); setSelected(null) }}>{copy('Cancel', 'Hủy')}</Button><Button type="submit" disabled={busy}>{copy('Save draft', 'Lưu bản nháp')}</Button></DialogFooter>
      </form>
    </Dialog>

    <Dialog open={Boolean(selected) && !editing} onOpenChange={open => { if (!open) setSelected(null) }} className="max-w-3xl" ariaLabel={copy('Module details', 'Chi tiết module')}>
      <DialogHeader><DialogTitle>{selected && latest(selected).payload.title}</DialogTitle></DialogHeader>
      {selected && <div className="space-y-5 overflow-y-auto break-words px-1 text-[length:var(--text-body-sm)]">
        <p>{copy('Created by', 'Người tạo')}: {selected.createdBy ?? copy('Original creator unknown', 'Chưa xác định người tạo gốc')}{!selected.intake && <> · {selected.createdAt}</>}</p>{selected.intake && <section className="space-y-2 rounded-lg border border-border bg-muted p-3">
          <p>{copy('Source', 'Nguồn')}: {copy('Imported Neo4j catalog', 'Danh mục nhập từ Neo4j')} · {selected.intake.source.metadata.id}</p>
          <p>{copy('Assigned by', 'Người phân công')}: {selected.intake.assignedBy} · {selected.intake.assignedAt}</p>
          <p>{copy('Received by', 'Người tiếp nhận')}: {selected.intake.acceptedBy} · {selected.intake.acceptedAt}</p>
          <p>{copy('Original content location', 'Địa chỉ nội dung gốc')}: {selected.intake.source.contentUri} · {selected.intake.source.contentVersion}</p>
          <Button variant="outline" size="sm" onClick={() => { setCatalogSelection({ module: selected.intake!.source, authoring: selected, intake: selected.intake }); setSelected(null) }}>{copy('View original catalog record', 'Xem bản danh mục gốc')}</Button>
        </section>}<p>{copy('Released revision', 'Phiên bản đã phát hành')}: {selected.releasedRevision ?? '—'}</p>
        {selected.revisions.map(revision => <section key={revision.number} className="space-y-3 rounded-lg border border-border p-3"><Heading level={3} size="card">{copy('Revision', 'Phiên bản')} {revision.number} · {stateLabels[revision.state] ?? revision.state}</Heading>
          <p>{copy('Edited by', 'Người sửa')}: {revision.editedBy} · {revision.editedAt}</p><p>{copy('Decision by', 'Người quyết định')}: {revision.decidedBy ?? '—'} · {revision.decidedAt ?? '—'}</p>{revision.feedback && <p>{revision.feedback}</p>}
          <dl className="grid gap-2 sm:grid-cols-2">{Object.entries({ ...revision.payload.metadata, title: revision.payload.title, moduleType: revision.payload.moduleType, contentUri: revision.payload.contentUri, contentType: revision.payload.contentType, contentVersion: revision.payload.contentVersion, duration: revision.payload.duration, price: revision.payload.price }).map(([key, value]) => <div key={key}><dt className="text-muted-foreground">{fieldLabels[key] ?? key}</dt><dd className="break-all">{typeof value === 'string' ? stateLabels[value] ?? value : value ?? copy('Not reviewed', 'Chưa duyệt')}</dd></div>)}</dl>
          {revision.payload.teachings.map(t => <details key={t.skillId} className="rounded bg-muted p-3"><summary>{t.skillName} · {stateLabels[t.teachingFocus]} · {stateLabels[t.difficultyLevel]}</summary><dl className="mt-2 space-y-1">{Object.entries(t.metadata).map(([key, value]) => <div key={key} className="break-all">{fieldLabels[key] ?? key}: {value ? stateLabels[value] ?? value : '—'}</div>)}</dl></details>)}
          <details><summary>{copy('Preview this content version', 'Xem nội dung phiên bản này')}</summary><ModuleMarkdown markdown={revision.payload.content.markdown} /></details>
        </section>)}
        <Heading level={3}>{copy('Change history', 'Lịch sử thay đổi')}</Heading>{selected.history.map(e => <div key={e.sequence} className="border-l-2 border-border pl-3"><p>{e.actorId} · {eventLabels[e.action] ?? e.action} · {copy('Revision', 'Phiên bản')} {e.revision}</p><p className="text-muted-foreground">{e.occurredAt}</p>{e.action === 'EDIT' && e.detail?.startsWith('Changed: ') && <p>{copy('Changed', 'Đã thay đổi')}: {e.detail.slice(9).split(', ').map(field => fieldLabels[field] ?? field).join(', ')}</p>}{e.action === 'RETURN' && e.detail && <p>{e.detail}</p>}</div>)}
      </div>}
    </Dialog>

    <Dialog open={contentOpen} onOpenChange={open => { if (!busy) setContentOpen(open) }} className="max-w-3xl" ariaLabel={copy('Create content', 'Tạo nội dung')}>
      <DialogHeader><DialogTitle>{copy('Create a content version', 'Tạo phiên bản nội dung')}</DialogTitle></DialogHeader>
      <form className="space-y-4 overflow-y-auto px-1" onSubmit={event => { event.preventDefault(); void run(async () => { await moduleRequest('/contents', 'POST', contentForm); setContentOpen(false); await load(); setNotice(copy('Content saved. It will be reviewed with its module.', 'Đã lưu nội dung. Nội dung sẽ được duyệt cùng module.')) }) }}>
        {error && <p role="alert" tabIndex={-1} className="text-destructive">{error}</p>}
        <fieldset disabled={busy} className="space-y-4"><Field label={copy('Title', 'Tiêu đề')}><Input required maxLength={240} value={contentForm.title} onChange={e => setContentForm({ ...contentForm, title: e.target.value })} /></Field>
        <Field label={copy('Occupations', 'Nghề')}>{scopeSelector(contentForm.occupationIds, occupationIds => setContentForm({ ...contentForm, occupationIds }))}</Field>
        <Field label={copy('Lesson text (Markdown)', 'Nội dung bài học (Markdown)')}><textarea required maxLength={200000} rows={12} className={control} value={contentForm.markdown} onChange={e => setContentForm({ ...contentForm, markdown: e.target.value })} /></Field>
        </fieldset>
        <p className="text-[length:var(--text-body-sm)] text-muted-foreground">{copy('Embed a video on its own line: [video](https://example.com/lesson.mp4). Use a direct HTTPS video file that learners can access.', 'Nhúng video trên một dòng riêng: [video](https://example.com/lesson.mp4). Dùng đường dẫn HTTPS trực tiếp đến tệp video mà người học có thể truy cập.')}</p>
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setContentOpen(false)}>{copy('Cancel', 'Hủy')}</Button><Button disabled={busy} type="submit">{copy('Save content', 'Lưu nội dung')}</Button></DialogFooter>
      </form>
    </Dialog>
    <Dialog open={preview !== null} onOpenChange={open => { if (!open) setPreview(null) }} className="max-w-3xl" ariaLabel={copy('Content preview', 'Xem trước nội dung')}><DialogHeader><DialogTitle>{preview?.title}</DialogTitle></DialogHeader><div className="overflow-y-auto">{preview && <ModuleMarkdown markdown={preview.markdown} />}</div></Dialog>
    <Dialog open={confirm !== null} onOpenChange={open => { if (!busy && !open) setConfirm(null) }} ariaLabel={confirm ? actionLabels[confirm.action] : ''}>
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
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setConfirm(null)}>{copy('Cancel', 'Hủy')}</Button><Button type="submit" disabled={busy}>{copy('Confirm', 'Xác nhận')}</Button></DialogFooter>
      </form>
    </Dialog>
  </div></WorkspaceLayout>
}
