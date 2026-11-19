import { workspaceFetch } from '../../../shared/api/workspaceFetch'
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
import { BookOpen, ClipboardCheck, FileText, Layers, Plus, Upload, Zap } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Combobox } from '../../../shared/components/ui/Combobox'
import { Select } from '../../../shared/components/ui/Select'
import { Badge, type BadgeProps } from '../../../shared/components/ui/Badge'
import { Input } from '../../../shared/components/ui/Input'
import { Dialog, DialogBody, DialogHeader, DialogTitle, DialogFooter } from '../../../shared/components/ui/Dialog'
import { Tabs, TabsContent } from '../../../shared/components/ui/Tabs'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { ModuleMarkdown } from '../../../shared/components/ui/ModuleMarkdown'
import { FormField as Field } from '../../../shared/components/ui/FormField'
import { Heading } from '../../../shared/components/typography/Heading'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { moduleRequest, type CatalogChoice, type ModuleActor, type ModuleCatalogItem, type ModuleCatalogPage, type ModuleContent, type ModuleDocument, type ModulePage, type ModuleRevision, type ModuleSave } from '../../../shared/api/moduleAuthoringApi'

import { Eye } from 'lucide-react'
import { Accordion,AccordionContent,AccordionItem,AccordionTrigger } from '../../../shared/components/ui/Accordion'
import { CopyableId } from '../../../shared/components/ui/CopyableId'
import { RowActions } from '../../../shared/components/ui/RowActions'
import { useToast } from "../../../shared/hooks/useToast"
import { CatalogModuleDetails } from './CatalogModuleDetails'
import { PageLoader } from '../../../shared/components/ui/PageLoader'

type Mode = 'modules' | 'content' | 'approvals' | 'learning'
const control = 'min-h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-[length:var(--text-body-sm)] text-foreground focus:outline-none focus:ring-2 focus:ring-primary [color-scheme:light]'
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
  const authoringFormRef = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)
  const [catalogReady, setCatalogReady] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [page, setPage] = useState<ModulePage>({ items: [], total: 0, page: 1, pageSize: 10 })
  const [catalogPage, setCatalogPage] = useState<ModuleCatalogPage>({ items: [], total: 0, page: 1, pageSize: 10 })
  const [responsibilityDoc, setResponsibilityDoc] = useState<ModuleDocument | null>(null)
  const [responsibilityTarget, setResponsibilityTarget] = useState('')
  const [experts, setExperts] = useState<CatalogChoice[]>([])
  const [staff, setStaff] = useState<CatalogChoice[]>([])
  const [catalogSelection, setCatalogSelection] = useState<ModuleCatalogItem | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [allModuleStatuses, setAllModuleStatuses] = useState(false)
  const [filters, setFilters] = useState({ search: searchParams.get('search') ?? '', status: '', review: '', type: '', skill: '' })
  const query = searchParams.get('search')
  const [previousQuery, setPreviousQuery] = useState(query)
  if (previousQuery !== query) {
    setPreviousQuery(query)
    if (query !== null) { setPageNumber(1); setFilters(old => ({ ...old, search: query })) }
  }
  const [search, setSearch] = useState(filters.search)
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(filters.search), 180)
    return () => clearTimeout(timeout)
  }, [filters.search])
  const [skills, setSkills] = useState<CatalogChoice[]>([])
  const [moduleSkills, setModuleSkills] = useState<CatalogChoice[]>([])
  const [jobPositions, setJobPositions] = useState<CatalogChoice[]>([])
  const [targetRoles, setTargetRoles] = useState<Array<{ id: string; name: string; familyCode?: string; jobPositionId?: string; requirements?: Array<{ skillId?: string; skillCode?: string; skillName?: string }>; skillTargets?: Array<{ skillId?: string; skillName?: string }> }>>([])
  const [filterTargetRole, setFilterTargetRole] = useState('')
  const [contents, setContents] = useState<ModuleContent[]>([])
  const [selected, setSelected] = useState<ModuleDocument | null>(null)
  const [conflict, setConflict] = useState<ModuleDocument | null>(null)
  const [editing, setEditing] = useState(false)
  const [authoringSection, setAuthoringSection] = useState('details')
  const [formState, setForm] = useState<ModuleSave>(initialForm)
  const [moduleLessons, setModuleLessons] = useState<LearningLesson[]>([newLesson('TEXT')])

  const form = { ...formState, duration: moduleLessons.length > 0
    ? Math.max(1, Math.ceil(moduleLessons.reduce((total, lesson) => total + (lesson.durationSeconds || 0), 0) / 60))
    : formState.duration }
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
  const canManage = (doc: ModuleDocument) => expert && (doc.responsibleExpertId ?? doc.createdBy) === actor?.id
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
        const [, nextSkills, nextContents, nextStaff, nextModuleSkills, nextExperts, nextJobPositions, nextTargetRoles] = await Promise.all([
          listRequest,
          moduleRequest<CatalogChoice[]>('/catalog/MicroSkill', 'GET', undefined, signal),
          actor.roles.includes('LD_MANAGER') && mode !== 'content' ? Promise.resolve(null) : moduleRequest<ModuleContent[]>('/contents', 'GET', undefined, signal),
          moduleRequest<CatalogChoice[]>('/catalog/Staff', 'GET', undefined, signal),
          actor.roles.includes('EXPERT') ? moduleRequest<CatalogChoice[]>('/catalog/ModuleSkill', 'GET', undefined, signal) : Promise.resolve([]),
          actor.roles.includes('LD_MANAGER') ? moduleRequest<CatalogChoice[]>('/catalog/Expert', 'GET', undefined, signal) : Promise.resolve([]),
          moduleRequest<CatalogChoice[]>('/catalog/JobPosition', 'GET', undefined, signal).catch(() => []),
          workspaceFetch(`/api/v1/organizations/${actor.organizationId}/target-roles`, { signal })
            .then(r => r.ok ? r.json() : [])
            .catch(() => []),
        ])
        setSkills(nextSkills); if (nextContents) setContents(nextContents); setStaff(Array.isArray(nextStaff) ? nextStaff : []); setCatalogReady(true)
        setModuleSkills(nextModuleSkills); setExperts(nextExperts)
        setJobPositions(Array.isArray(nextJobPositions) ? nextJobPositions : [])
        setTargetRoles(Array.isArray(nextTargetRoles) ? nextTargetRoles : [])
      }
    } catch (failure) { if (!signal?.aborted) setError(errorText(failure)) }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [actor, mode, moduleId, search, filters.status, filters.review, filters.type, filters.skill, pageNumber, publishedOnly])

  useEffect(() => {
    const controller = new AbortController()
    // oxlint-disable-next-line react/set-state-in-effect -- Synchronize the pending state of the external data request when its scope changes.
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  async function run(work: () => Promise<void>) {
    if (mutation.current) return
    mutation.current = true; setBusy(true); setError(''); setNotice('')
    try { await work() } catch (failure) { setError(errorText(failure)) }
    finally { mutation.current = false; setBusy(false) }
  }

  async function saveModule(submitAfterSave: boolean) {
    if (form.teachings.length !== 1 || !moduleSkills.some(skill => skill.id === form.teachings[0].skillId)) {
      throw new Error(copy('Choose exactly one skill.', 'Chọn đúng một kỹ năng.'))
    }
    const prepared = await moduleRequest<ModuleContent>('/contents/lessons', 'POST', { title: form.title, lessons: moduleLessons })
    const savedForm = { ...form, contentId: prepared.id }
    const saved = await moduleRequest<ModuleDocument>(
      selected ? `/modules/${selected.id}` : '/modules',
      selected ? 'PUT' : 'POST',
      selected ? { expectedVersion: selected.lockVersion, value: savedForm } : savedForm
    )
    if (submitAfterSave) {
      await moduleRequest(`/modules/${saved.id}/actions`, 'POST', {
        expectedVersion: saved.lockVersion,
        action: 'submit',
        feedback: '',
      })
    }
    setEditing(false)
    setSelected(null)
    await load()
    if (submitAfterSave) {
      setNotice(copy('Module saved and submitted for review.', 'Đã lưu và gửi duyệt module.'))
      toast({ description: copy('Module submitted for review.', 'Đã gửi duyệt module.'), variant: 'success', duration: 3000 })
    } else {
      setNotice(copy('Draft saved. Submit it for review before release.', 'Đã lưu bản nháp. Hãy gửi duyệt trước khi phát hành.'))
      toast({ description: copy('Draft saved.', 'Đã lưu bản nháp.'), variant: 'success', duration: 3000 })
    }
  }

  function openEditor(doc?: ModuleDocument) {
    setSelected(doc ?? null); setConflict(null); setError('')
    setFilterTargetRole('')
    const lessons = doc ? latest(doc).payload.content.lessons ?? [] : [newLesson('TEXT')]
    setModuleLessons(lessons)
    const initialDuration = lessons.length > 0
      ? Math.max(1, Math.ceil(lessons.reduce((sum, l) => sum + (l.durationSeconds || 0), 0) / 60))
      : 1
    if (doc) {
      const p = latest(doc).payload
      setForm({ title: p.title, moduleType: p.moduleType, contentId: p.content.id, duration: initialDuration,
        teachings: p.teachings.length === 1 ? [{ skillId: p.teachings[0].skillId }] : [{ skillId: '' }], knowledgeLevel: p.knowledgeLevel ?? '' })
    } else { setForm({ ...initialForm(), duration: initialDuration }) }
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
    NEEDS_EXPERT_REVIEW: copy('Not approved', 'Chưa duyệt'), APPROVED: copy('Approved', 'Đã duyệt'), REJECTED: copy('Changes requested', 'Cần chỉnh sửa'),
    SUBMITTED: copy('Submitted', 'Đã gửi duyệt'), RETURNED: copy('Returned for changes', 'Yêu cầu chỉnh sửa'), RELEASED: copy('Released', 'Đã phát hành'),
    PUBLISH_PENDING: copy('Awaiting publication', 'Chờ phát hành'), ARCHIVE_PENDING: copy('Archiving', 'Đang lưu trữ'), ARCHIVE_REQUESTED: copy('Archive requested', 'Đã yêu cầu lưu trữ'),
    LESSON_AND_PRACTICE: copy('Lesson and practice', 'Bài học và thực hành'), RESOURCE_GUIDED_PRACTICE: copy('Resource-guided practice', 'Thực hành theo tài liệu'),
    PRIMARY: copy('Primary', 'Chính'), SUPPORTING: copy('Supporting', 'Hỗ trợ'), INCIDENTAL: copy('Incidental', 'Ngữ cảnh'), LOW: copy('Low', 'Thấp'), MEDIUM: copy('Medium', 'Trung bình'), HIGH: copy('High', 'Cao'),
    'text/markdown': copy('Reading', 'Bài đọc'),
    'application/vnd.adapt-learning.lessons+json': copy('Text and Video lessons', 'Bài học Text và Video'),
  }
  const eventLabels: Record<string, string> = { OWNER_TRANSFERRED: copy('Responsible Expert changed', 'Đã đổi người phụ trách'), HISTORY_RESTORED: copy('Earlier assignment history retained', 'Đã giữ lịch sử phân công trước đây'), OWNER_ASSIGNED: copy('Responsible Expert assigned', 'Đã gán Expert phụ trách'), ASSIGN_INTAKE: copy('Assigned for intake', 'Phân công tiếp nhận'), INTAKE: copy('Received imported module', 'Tiếp nhận module nhập vào'), CREATE: copy('Created', 'Đã tạo'), EDIT: copy('Edited', 'Đã sửa'), SUBMIT: copy('Submitted for review', 'Đã gửi duyệt'), RETURN: copy('Returned for changes', 'Đã yêu cầu chỉnh sửa'), APPROVE: copy('Approved', 'Đã duyệt'), RETRY: copy('Retried publication', 'Đã thử phát hành lại'), REQUEST_ARCHIVE: copy('Requested archive', 'Đã yêu cầu lưu trữ'), APPROVE_ARCHIVE: copy('Approved archive', 'Đã duyệt lưu trữ'), RESTORE: copy('Restored to draft', 'Đã khôi phục bản nháp'), RELEASED: copy('Released', 'Đã phát hành'), ARCHIVED: copy('Archived', 'Đã lưu trữ') }
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
      {manager && <Button variant="outline" size="sm" disabled={busy || contentBusy} onClick={() => { setResponsibilityDoc(doc); setResponsibilityTarget(''); setSelected(null); setError('') }}>{copy('Change responsible person', 'Đổi người phụ trách')}</Button>}
      {canManage(doc) && ['DRAFT', 'RETURNED', 'RELEASED'].includes(state) && <Button variant="outline" size="sm" disabled={busy || contentBusy} onClick={() => openEditor(doc)}>{copy('Edit', 'Chỉnh sửa')}</Button>}
      {actions.map(action => <Button variant={mode === 'approvals' && ['approve', 'approve-archive'].includes(action) ? 'primary' : 'outline'} size="sm" disabled={busy || contentBusy} key={action} onClick={() => ask(doc, action)}>{actionLabels[action]}</Button>)}
    </>
  }
  const moduleHome = manager ? '/ld-manager/modules' : '/expert/modules'
  const title = managerLearning ? copy('Learning Content', 'Nội dung học tập') : mode === 'content' ? manager ? copy('Learning content', 'Nội dung học tập') : copy('Content Studio', 'Biên soạn nội dung') : mode === 'approvals' ? copy('Content Approvals', 'Duyệt nội dung') : mode === 'learning' ? copy('Module lessons', 'Nội dung bài học') : copy('Learning modules', 'Quản lý module học')

  const displayedPage = mode === 'modules' ? catalogPage : page
  const listItems: ModuleCatalogItem[] = loading && managerLearning ? [] : mode === 'modules' ? catalogPage.items : page.items.map(doc => ({ module: latest(doc).payload, authoring: doc }))
  const statusFilterValue = filters.status === 'ACTIVE' && filters.review === 'APPROVED'
    ? 'RELEASED'
    : filters.status || filters.review || ''
  const applyStatusFilter = (value: string) => {
    setPageNumber(1)
    if (value === 'RELEASED') setFilters(old => ({ ...old, status: 'ACTIVE', review: 'APPROVED' }))
    else if (value === 'ACTIVE' || value === 'DRAFT' || value === 'ARCHIVED') setFilters(old => ({ ...old, status: value, review: '' }))
    else if (value === 'NEEDS_EXPERT_REVIEW' || value === 'REJECTED') setFilters(old => ({ ...old, status: '', review: value }))
    else setFilters(old => ({ ...old, status: '', review: '' }))
  }
  const resolveItemStatus = (item: ModuleCatalogItem) => {
    const needsContent = Boolean(
      item.authoring &&
      (!latest(item.authoring).payload.content.lessons?.length ||
        latest(item.authoring).payload.content.lessons?.some(
          l => !l.title.trim() || !l.durationSeconds || (l.type === 'TEXT' && !l.body?.replace(/<[^>]*>/g, '').trim()) || (l.type === 'VIDEO' && !(l.assetId || l.videoUrl))
        ))
    )
    if (publishedOnly) {
      const workingState = item.authoring && latest(item.authoring).state !== 'RELEASED'
        ? `${copy('Working workflow', 'Trạng thái soạn thảo')}: ${stateLabels[latest(item.authoring).state] ?? latest(item.authoring).state}`
        : null
      return {
        label: item.authoring?.releasedRevision != null ? `${copy('Published revision', 'Bản phát hành')} ${item.authoring.releasedRevision}` : copy('Released', 'Đã phát hành'),
        variant: 'success' as BadgeProps['variant'],
        note: workingState,
        needsContent: false,
      }
    }
    if (item.authoring) {
      const state = latest(item.authoring).state
      const note = item.authoring.releasedRevision != null && state !== 'RELEASED'
        ? `${copy('Published revision', 'Bản phát hành')} ${item.authoring.releasedRevision}`
        : null
      return {
        label: stateLabels[state] ?? state,
        variant: statusVariant(state),
        note,
        needsContent,
      }
    }
    const metaStatus = item.module.metadata.status
    const metaReview = item.module.metadata.reviewStatus
    if (metaStatus === 'ACTIVE' && metaReview === 'APPROVED') {
      return { label: copy('Released', 'Đã phát hành'), variant: 'success' as BadgeProps['variant'], note: copy('No authoring record', 'Chưa có hồ sơ soạn thảo'), needsContent: false }
    }
    if (metaStatus === 'ACTIVE' && metaReview === 'NEEDS_EXPERT_REVIEW') {
      return { label: `${stateLabels.ACTIVE} · ${stateLabels.NEEDS_EXPERT_REVIEW}`, variant: 'warning' as BadgeProps['variant'], note: copy('No authoring record', 'Chưa có hồ sơ soạn thảo'), needsContent: false }
    }
    const fallback = metaReview === 'REJECTED' ? metaReview : (metaStatus || metaReview || '')
    return {
      label: stateLabels[fallback] ?? (fallback || '—'),
      variant: statusVariant(fallback),
      note: copy('No authoring record', 'Chưa có hồ sơ soạn thảo'),
      needsContent: false,
    }
  }

  const roleComboboxOptions = targetRoles.map(role => {
    const pos = jobPositions.find(p => p.id === role.familyCode || p.id === role.jobPositionId)
    return {
      value: role.id,
      label: role.name,
      description: pos?.name,
    }
  })

  const filteredEditorSkills = moduleSkills.filter(skill => {
    if (filterTargetRole) {
      const role = targetRoles.find(r => r.id === filterTargetRole)
      const skillIds = [
        ...(role?.requirements?.map(req => req.skillId).filter(Boolean) ?? []),
        ...(role?.skillTargets?.map(st => st.skillId).filter(Boolean) ?? []),
      ]
      if (skillIds.length > 0 && !skillIds.includes(skill.id)) return false
    }
    return true
  })

  const historyView = (doc: ModuleDocument) => <section className="space-y-3 border-t border-border pt-4"><Heading level={3} size="card">{copy('Change history', 'Lịch sử thay đổi')}</Heading>{!doc.history.length && <p className="text-xs text-muted-foreground">{copy('No edit history has been recorded for this module.', 'Module này chưa có lịch sử chỉnh sửa được ghi nhận.')}</p>}{doc.history.map(e => <div key={e.sequence} className="space-y-1 border-l-2 border-border pl-3 text-xs"><p className="font-medium text-foreground">{person(e.actorId)} · {eventLabels[e.action.replaceAll('-', '_')] ?? e.action} · {copy('Revision', 'Phiên bản')} {e.revision}</p><p className="text-muted-foreground">{formatTime(e.occurredAt)}</p>{e.action === 'EDIT' && e.detail?.startsWith('Changed: ') && <p>{copy('Changed', 'Đã thay đổi')}: {e.detail.slice(9).split(', ').map(field => fieldLabels[field] ?? field).join(', ')}</p>}{['RETURN', 'OWNER_ASSIGNED'].includes(e.action) && e.detail && <p>{e.detail}</p>}{e.action === 'OWNER_TRANSFERRED' && <p>{copy('Previous', 'Trước')}: {person(e.previousResponsibleExpertId)} {e.previousResponsibleExpertId && `(${e.previousResponsibleExpertId})`} → {copy('New', 'Mới')}: {person(e.responsibleExpertId)} {e.responsibleExpertId && `(${e.responsibleExpertId})`}</p>}</div>)}</section>

  return <WorkspaceLayout><div className="relative space-y-5 text-[length:var(--text-body)] text-foreground">
    <PageHeader
      title={expert && mode === 'modules' ? copy('Learning modules', 'Quản lý module học') : title}
      description={expert && mode === 'modules'
        ? copy('Create focused learning packages, manage lessons, and track revision lifecycles.', 'Xây dựng các gói bài học thích ứng theo kỹ năng, quản lý nội dung chi tiết và theo dõi tiến trình phê duyệt.')
        : managerLearning
          ? copy('Browse released modules and review content requests.', 'Tra cứu module đã phát hành và xử lý yêu cầu duyệt nội dung.')
          : copy('Create focused learning packages and keep every revision easy to review.', 'Xây dựng gói học tập trung và theo dõi rõ ràng từng lần chỉnh sửa.')
      }
      actions={expert && mode === 'modules' ? <div className="flex flex-wrap items-center gap-2">
        <Link to="/expert/skill-assessment-config?status=UNCONFIGURED" className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'gap-2 border border-primary/20 font-semibold' })}><ClipboardCheck size={14} />{t('scopedPolicy.skillTitle')}</Link>
        <Button variant="outline" size="sm" leftIcon={<Upload className="h-4 w-4" aria-hidden="true" />} disabled={busy || contentBusy} aria-haspopup="dialog" onClick={() => setModuleImportOpen(true)} className="bg-secondary text-primary border border-primary/20 hover:bg-secondary/80 font-semibold shadow-2xs">{copy('Import', 'Nhập file')}</Button>
        <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />} disabled={busy || contentBusy || loading || !catalogReady} onClick={() => openEditor()} className="font-semibold shadow-2xs">{copy('Create module', 'Tạo module')}</Button>
      </div> : undefined}
    />
    {error && <div role="alert" tabIndex={-1} data-module-error className="rounded-lg border border-destructive bg-card p-3 text-[length:var(--text-body-sm)] text-destructive">{error}{actor && <Button variant="outline" size="sm" className="ml-3" disabled={busy || contentBusy || loading} onClick={() => void load()}>{copy('Reload latest data', 'Tải dữ liệu mới nhất')}</Button>}</div>}
    {notice && <p role="status" className="text-[length:var(--text-body-sm)] text-success">{notice}</p>}
    {!actor ? <Card><CardContent className="space-y-3 pt-6">
      {sessionLoading ? <PageLoader label={copy('Loading your session…', 'Đang tải phiên đăng nhập…')} /> : <>
        <p>{copy('Continue with your workspace account from the main login page.', 'Tiếp tục bằng tài khoản hệ thống tại trang đăng nhập chung.')}</p>
        <Button onClick={() => navigate('/login')}>{copy('Go to login', 'Đến trang đăng nhập')}</Button>
        <Button variant="outline" onClick={() => { setSessionLoading(true); setError(''); setSessionAttempt(value => value + 1) }}>{copy('Retry', 'Thử lại')}</Button>
      </>}
    </CardContent></Card> : <>
      {manager && mode !== 'learning' && (
        <nav className="inline-flex rounded-lg bg-muted p-1 border border-border/80" aria-label={copy('Learning workspace', 'Không gian học tập')}>
          {[
            { path: moduleHome, active: mode === 'modules', icon: <BookOpen className="size-4" aria-hidden="true" />, label: copy('Modules', 'Module') },
            { path: '/ld-manager/approvals', active: mode === 'approvals', icon: <ClipboardCheck className="size-4" aria-hidden="true" />, label: copy('Approvals', 'Chờ duyệt') }
          ].map(tab => (
            <Link
              key={tab.path}
              to={tab.path}
              aria-current={tab.active ? 'page' : undefined}
              className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-all ${
                tab.active
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setPageNumber(1)}
            >
              {tab.icon}
              {tab.label}
            </Link>
          ))}
        </nav>
      )}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              variant="gradient"
              icon={<BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />}
              title={mode === 'approvals' ? copy('Pending actions', 'Yêu cầu cần xử lý') : copy('Matching modules', 'Module phù hợp')}
              value={displayedPage.total}
              valueClassName="text-primary"
              description={copy('Matching your current filters', 'Phù hợp với bộ lọc hiện tại')}
            />
            <StatCard
              variant="gradient"
              icon={<FileText className="h-4 w-4 text-success" aria-hidden="true" />}
              title={mode === 'approvals' ? copy('Awaiting review', 'Chờ phê duyệt') : manager ? copy('Released modules', 'Đã phát hành') : copy('Content packages', 'Gói nội dung')}
              value={mode === 'approvals' ? page.items.filter(d => latest(d).state === 'SUBMITTED').length : manager ? catalogPage.total : contents.length}
              valueClassName="text-success"
              description={mode === 'approvals' ? copy('New module submissions', 'Bản ghi module mới gửi lên') : manager ? copy('Active catalog curriculum', 'Chương trình giảng dạy đang hoạt động') : copy('Saved content in your workspace', 'Nội dung đã lưu trong không gian làm việc')}
            />
            <StatCard
              variant="gradient"
              icon={<Layers className="h-4 w-4 text-warning" aria-hidden="true" />}
              role="group"
              aria-label={copy('Available skills', 'Kỹ năng hiện có')}
              title={mode === 'approvals' ? copy('Archive requests', 'Yêu cầu lưu trữ') : copy('Available skills', 'Kỹ năng hiện có')}
              value={mode === 'approvals' ? page.items.filter(d => latest(d).state === 'ARCHIVE_REQUESTED').length : expert ? moduleSkills.length : skills.length}
              valueClassName="text-warning"
              description={mode === 'approvals' ? copy('Modules requested for archive', 'Module xin ngừng phát hành') : expert ? copy('Skills available for module authoring', 'Kỹ năng có thể chọn khi soạn module') : copy('Skills in the module catalog', 'Kỹ năng trong danh mục module')}
            />
          </div>

          {loading && managerLearning && <PageLoader label={copy('Loading learning content?', '?ang t?i n?i dung h?c t?p?')} />}
          {mode === 'approvals' ? (
            listItems.length > 0 ? (
              <ModuleApprovalQueue documents={page.items} showHeading={true} total={page.total} loading={loading} busy={busy || contentBusy} vi={language === 'vi'} copy={copy} person={person} formatTime={formatTime} labels={stateLabels} onReview={doc => void run(async () => { setSelected(await moduleRequest<ModuleDocument>(`/modules/${doc.id}`)); setEditing(false) })} />
            ) : (!loading && (!managerLearning || (catalogReady && !error))) ? (
              <Card>
                <CardContent className="space-y-3 pt-6">
                  <p>
                    {Object.values(filters).some(Boolean)
                      ? copy('No requests match your filters. Clear filters to see pending requests.', 'Không có yêu cầu phù hợp. Xoá bộ lọc để xem hàng đợi.')
                      : copy('No requests need your attention. New submissions will appear here.', 'Chưa có yêu cầu cần xử lý. Các module được gửi duyệt sẽ xuất hiện tại đây.')}
                  </p>
                </CardContent>
              </Card>
            ) : null
          ) : (
            <Card>
              <CardHeader className="border-b border-border p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>{copy('Module Directory', 'Danh sách module')}</CardTitle>
                      <CardDescription>
                        {loading || !catalogReady || error ? '—' : displayedPage.total} {copy('modules match your filters', 'module phù hợp bộ lọc')}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-end gap-2.5 pt-1">
                    {manager && (
                      <div className="w-44">
                        <Field label={copy('Show modules', 'Hiển thị module')}>
                          <Select
                            size="sm"
                            aria-label={copy('Show modules', 'Hiển thị module')}
                            value={allModuleStatuses ? 'all' : 'published'}
                            onChange={value => {
                              setAllModuleStatuses(value === 'all')
                              setFilters(old => ({ ...old, status: '', review: '' }))
                              setPageNumber(1)
                            }}
                            options={[
                              { value: 'published', label: copy('Published modules', 'Module đã phát hành') },
                              { value: 'all', label: copy('All statuses', 'Tất cả trạng thái') },
                            ]}
                          />
                        </Field>
                      </div>
                    )}
                    <div className="min-w-[180px] flex-1 max-w-xs">
                      <Field label={copy('Search name or ID', 'Tìm theo tên hoặc ID')}>
                        <Input
                          className="h-8 text-xs bg-card"
                          placeholder={copy('Search name or ID…', 'Tìm theo tên hoặc ID…')}
                          value={filters.search}
                          onChange={e => { setPageNumber(1); setFilters({ ...filters, search: e.target.value }) }}
                        />
                      </Field>
                    </div>
                    {!publishedOnly && (
                      <div className="w-40">
                        <Field label={copy('Status', 'Trạng thái')}>
                          <Select
                            size="sm"
                            aria-label={copy('Status', 'Trạng thái')}
                            value={statusFilterValue}
                            onChange={applyStatusFilter}
                            options={[
                              { value: '', label: copy('All', 'Tất cả') },
                              { value: 'RELEASED', label: copy('Released', 'Đã phát hành') },
                              { value: 'ACTIVE', label: copy('Active', 'Đang sử dụng') },
                              { value: 'NEEDS_EXPERT_REVIEW', label: copy('Pending review', 'Chờ duyệt') },
                              { value: 'REJECTED', label: copy('Changes requested', 'Cần chỉnh sửa') },
                              { value: 'DRAFT', label: copy('Draft', 'Bản nháp') },
                              { value: 'ARCHIVED', label: copy('Archived', 'Đã lưu trữ') },
                            ]}
                          />
                        </Field>
                      </div>
                    )}
                    <div className="w-48">
                      <Field label={copy('Module type', 'Loại module')}>
                        <Select
                          size="sm"
                          aria-label={copy('Module type', 'Loại module')}
                          value={filters.type}
                          onChange={value => { setPageNumber(1); setFilters({ ...filters, type: value }) }}
                          options={[
                            { value: '', label: copy('All', 'Tất cả') },
                            { value: 'LESSON_AND_PRACTICE', label: copy('Lesson and practice', 'Bài học và thực hành') },
                            { value: 'RESOURCE_GUIDED_PRACTICE', label: copy('Resource-guided practice', 'Thực hành theo tài liệu') },
                          ]}
                        />
                      </Field>
                    </div>
                    <div className="w-52">
                      <Field label={copy('Skill', 'Kỹ năng')}>
                        <Combobox
                          size="sm"
                          clearable={false}
                          aria-label={copy('Skill', 'Kỹ năng')}
                          value={filters.skill}
                          onChange={value => { setPageNumber(1); setFilters({ ...filters, skill: value }) }}
                          options={[
                            { value: '', label: copy('All', 'Tất cả') },
                            ...skills.map(s => ({ value: s.id, label: s.name })),
                          ]}
                          placeholder={copy('All', 'Tất cả')}
                          searchPlaceholder={copy('Search skill…', 'Tìm kỹ năng…')}
                          emptyMessage={copy('No matching skill.', 'Không tìm thấy kỹ năng.')}
                        />
                      </Field>
                    </div>
                    {(Object.values(filters).some(Boolean) || (manager && allModuleStatuses)) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground mb-0.5"
                        onClick={() => {
                          setFilters({ search: '', status: '', review: '', type: '', skill: '' })
                          if (manager) setAllModuleStatuses(false)
                          setPageNumber(1)
                        }}
                      >
                        {copy('Clear filters', 'Xoá bộ lọc')}
                      </Button>
                    )}
                  </div>
                  {(Object.values(filters).some(Boolean) || (manager && allModuleStatuses)) && (
                    <div className="flex flex-wrap gap-1.5 pt-1" aria-label={copy('Active filters', 'Bộ lọc đang áp dụng')}>
                      {[
                        { label: manager && allModuleStatuses ? copy('All statuses', 'Tất cả trạng thái') : '', clear: () => setAllModuleStatuses(false) },
                        { label: filters.search ? `${copy('Search', 'Tìm')}: ${filters.search}` : '', clear: () => setFilters(old => ({ ...old, search: '' })) },
                        { label: !publishedOnly && statusFilterValue ? (stateLabels[statusFilterValue] ?? statusFilterValue) : '', clear: () => applyStatusFilter('') },
                        { label: filters.type ? (filters.type === 'LESSON_AND_PRACTICE' ? copy('Lesson and practice', 'Bài học và thực hành') : filters.type === 'RESOURCE_GUIDED_PRACTICE' ? copy('Resource-guided practice', 'Thực hành theo tài liệu') : filters.type) : '', clear: () => setFilters(old => ({ ...old, type: '' })) },
                        { label: filters.skill ? (skills.find(s => s.id === filters.skill)?.name ?? filters.skill) : '', clear: () => setFilters(old => ({ ...old, skill: '' })) },
                      ].filter(item => item.label).map((item, idx) => (
                        <Button
                          key={idx}
                          size="sm"
                          variant="outline"
                          className="h-6 bg-muted/60 px-2 text-[11px] font-medium text-foreground hover:bg-muted"
                          onClick={() => { item.clear(); setPageNumber(1) }}
                        >
                          <span className="truncate max-w-[180px]">{item.label}</span>
                          <span aria-hidden="true" className="ml-1 text-muted-foreground">×</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className={listItems.length > 0 ? "p-0" : "space-y-3 pt-6"}>
                {listItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="module-directory block w-full md:min-w-[920px] table-fixed text-left text-xs md:table">
                      <caption className="sr-only">{copy('Module Directory', 'Danh sách module')}</caption>
                      <thead className="hidden bg-muted/40 text-[11px] uppercase text-muted-foreground md:table-header-group">
                        <tr>
                          {[
                            copy('Module', 'Module'),
                            copy('Responsible person', 'Người phụ trách'),
                            copy('Skill taught', 'Kỹ năng được dạy'),
                            copy('Knowledge level', 'Mức kiến thức'),
                            copy('Duration', 'Thời lượng'),
                            copy('Status', 'Trạng thái'),
                            copy('Action', 'Thao tác')
                          ].map((label, index) => (
                            <th key={label} className={`px-2.5 py-2.5 font-semibold ${['w-[24%]', 'w-[14%]', 'w-[18%]', 'w-[11%]', 'w-[9%]', 'w-[14%]', 'w-[10%]'][index]} ${index === 6 ? 'text-center' : ''}`}>
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="block divide-y divide-border md:table-row-group">
                        {listItems.map(item => {
                          const statusInfo = resolveItemStatus(item)
                          return (
                            <tr key={item.module.metadata.id} data-testid="module-row" className="grid grid-cols-2 items-start gap-3 p-3 hover:bg-muted/20 md:table-row md:p-0">
                              <td className="col-span-2 min-w-0 md:px-2.5 md:py-3">
                                <Heading level={2} size="card" style={{ fontSize: 'var(--text-sm)' }} className="line-clamp-2 break-words text-left">
                                  {item.module.title?.trim() || copy('Untitled module', 'Module chưa có tên')}
                                </Heading>
                                <CopyableId code={item.module.metadata.id} compact vi={language === 'vi'} entity={copy('module ID', 'mã module')} />
                                {item.authoring && latest(item.authoring).payload.title !== item.module.title && (
                                  <p className="mt-1 text-xs text-muted-foreground">{copy('Working revision', 'Bản đang soạn')}: {latest(item.authoring).payload.title}</p>
                                )}
                              </td>
                              <td className="col-span-2 min-w-0 break-words text-left md:px-2.5 md:py-3">
                                <span className="mb-1 block text-muted-foreground md:hidden">{copy('Responsible person', 'Người phụ trách')}</span>
                                {person(item.authoring?.responsibleExpertId ?? item.authoring?.createdBy)}
                              </td>
                              <td className="col-span-2 min-w-0 break-words md:px-2.5 md:py-3">
                                <span className="mb-1 block text-muted-foreground md:hidden">{copy('Skill taught', 'Kỹ năng được dạy')}</span>
                                {item.module.teachings.length ? item.module.teachings.map(teaching => teaching.skillName?.trim() || copy('Skill name unavailable', 'Chưa có tên kỹ năng')).join(', ') : '—'}
                              </td>
                              <td className="min-w-0 md:px-2.5 md:py-3">
                                <span className="mb-1 block text-muted-foreground md:hidden">{copy('Knowledge level', 'Mức kiến thức')}</span>
                                <span className="whitespace-nowrap">{stateLabels[item.module.knowledgeLevel ?? ''] ?? item.module.knowledgeLevel ?? '—'}</span>
                              </td>
                              <td className="md:px-2.5 md:py-3">
                                <span className="mb-1 block text-muted-foreground md:hidden">{copy('Duration', 'Thời lượng')}</span>
                                {item.module.duration == null ? '—' : `${item.module.duration} ${copy('min', 'phút')}`}
                              </td>
                              <td className="min-w-0 md:px-2.5 md:py-3" data-testid="module-status">
                                <span className="mb-1 block text-muted-foreground md:hidden">{copy('Status', 'Trạng thái')}</span>
                                <Badge className="whitespace-normal" variant={statusInfo.variant}>{statusInfo.label}</Badge>
                                {statusInfo.note && <p className="mt-1 text-xs text-muted-foreground">{statusInfo.note}</p>}
                                {statusInfo.needsContent && <p className="mt-1 text-xs text-muted-foreground">{copy('Needs content', 'Cần bổ sung nội dung')}</p>}
                              </td>
                              <td className="col-span-2 md:px-1 md:py-3">
                                <div className="flex items-center justify-center gap-1.5 [&>button]:shrink-0">
                                  <Button variant="outline" size="icon" className="size-8" title={copy('View module', 'Xem module')} aria-label={copy('View module', 'Xem module')} onClick={() => setCatalogSelection(item)}>
                                    <Eye className="size-4 text-primary" aria-hidden="true" />
                                  </Button>
                                  {(item.authoring || (expert && item.module.knowledgeLevel)) && (
                                    <RowActions label={`${copy('Actions for', 'Thao tác cho')} ${item.module.metadata.id}`} compact disabled={busy || contentBusy}>
                                      <div className="flex flex-wrap gap-2">
                                        {item.authoring && controls(item.authoring)}
                                        {expert && item.module.knowledgeLevel && item.module.teachings.length === 1 && (
                                          <Link to={'/expert/skill-assessment-config?' + new URLSearchParams({ owner: item.module.teachings[0].skillId, level: item.module.knowledgeLevel }).toString()} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                                            {t('scopedPolicy.skillTitle')}
                                          </Link>
                                        )}
                                      </div>
                                    </RowActions>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>
                    {manager
                      ? publishedOnly && !Object.values(filters).some(Boolean)
                        ? copy('No published modules yet. Approved publication requests will appear here after release.', 'Chưa có module đã phát hành. Yêu cầu được duyệt sẽ xuất hiện ở đây sau khi phát hành thành công.')
                        : copy('No modules match your filters. Try another search.', 'Không có module phù hợp. Hãy thử tìm kiếm hoặc bộ lọc khác.')
                      : copy('No modules match this view. Try changing your filters, or prepare content for a new module.', 'Chưa có module phù hợp. Hãy thử bộ lọc khác hoặc chuẩn bị nội dung cho module mới.')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          <Pagination className="max-w-full [&_nav]:max-w-full [&_nav]:flex-wrap [&_nav]:justify-center [&_nav>div]:flex-wrap [&_nav>div]:justify-center" currentPage={displayedPage.page} totalPages={Math.ceil(displayedPage.total / displayedPage.pageSize)} totalItems={displayedPage.total} pageSize={displayedPage.pageSize} onPageChange={setPageNumber} disabled={busy || contentBusy || loading} itemLabel={copy('modules', 'module')} labels={{ navigation: copy('Pagination', 'Phân trang'), first: copy('First page', 'Trang đầu'), previous: copy('Prev', 'Trước'), next: copy('Next', 'Tiếp'), last: copy('Last page', 'Trang cuối'), showing: copy('Showing', 'Hiển thị'), of: copy('of', 'trên') }} />
        </>}
      </>}
    </>}

    <CatalogModuleDetails history={catalogSelection?.authoring ? historyView(catalogSelection.authoring) : undefined} content={catalogSelection ? publishedModuleRevision(catalogSelection)?.payload.content ?? catalogSelection.authoring?.revisions.find(revision => revision.payload.contentUri === catalogSelection.module.contentUri && revision.payload.contentVersion === catalogSelection.module.contentVersion)?.payload.content : undefined} authoringLabel={publishedOnly ? copy('View working revisions & history', 'Xem bản soạn thảo và lịch sử') : undefined} module={catalogSelection?.module ?? null} hasHistory={catalogSelection?.authoring !== null && catalogSelection !== null} staff={staff} onOpenAuthoring={catalogSelection?.authoring ? () => { const doc = catalogSelection.authoring!; setCatalogSelection(null); void run(async () => { setSelected(await moduleRequest<ModuleDocument>(`/modules/${doc.id}`)); setEditing(false) }) } : undefined} onClose={() => setCatalogSelection(null)} />
    <Dialog open={editing} onOpenChange={open => { if (!busy && !contentBusy) { setEditing(open); if (!open) setSelected(null) } }} size="wide" className="module-authoring-dialog w-[96vw] max-w-3xl max-h-[88vh] h-auto p-4 sm:p-5" ariaLabel={copy('Module editor', 'Chỉnh sửa module')}>
      <DialogHeader>
        <DialogTitle>{selected ? copy('Create a revised package', 'Chỉnh sửa gói học') : copy('Create module', 'Tạo module')}</DialogTitle>
        <p className="text-xs text-muted-foreground">
          {authoringSection === 'details'
            ? copy('Step 1 of 2 · Module details', 'Bước 1/2 · Thông tin module')
            : `${copy('Step 2 of 2 · Learning content', 'Bước 2/2 · Nội dung học')} (${moduleLessons.length} ${copy('lessons', 'bài')} · ${form.duration} ${copy('min', 'phút')})`}
        </p>
      </DialogHeader>
      <form ref={authoringFormRef} className="flex min-h-0 flex-1 flex-col" onInvalidCapture={event => {
        const field = event.target as HTMLInputElement
        const section = field.closest('[data-authoring-section]')?.getAttribute('data-authoring-section')
        if (section && section !== authoringSection) {
          event.preventDefault(); setAuthoringSection(section)
          requestAnimationFrame(() => { field.focus(); field.reportValidity() })
        }
      }} onSubmit={event => { event.preventDefault(); void run(() => saveModule(false)) }}>
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
          <TabsContent value="details" forceMount data-authoring-section="details" className="space-y-4 min-h-[380px] pb-8">
            {/* Row 1: Title & Module Type */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Field label={<>{copy('Title', 'Tên module')} <span className="text-destructive" aria-hidden="true">*</span></>}>
                  <Input required aria-label={copy('Title', 'Tên module')} maxLength={240} className="h-9 text-xs" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </Field>
              </div>
              <div className="sm:col-span-1">
                <Field label={<>{copy('Module type', 'Loại module')} <span className="text-destructive" aria-hidden="true">*</span></>}>
                  <Select
                    size="md"
                    aria-label={copy('Module type', 'Loại module')}
                    value={form.moduleType}
                    onChange={value => setForm({ ...form, moduleType: value })}
                    options={[
                      { value: 'LESSON_AND_PRACTICE', label: copy('Lesson and practice', 'Bài học và thực hành') },
                      { value: 'RESOURCE_GUIDED_PRACTICE', label: copy('Resource-guided practice', 'Thực hành theo tài liệu') },
                    ]}
                  />
                </Field>
              </div>
            </div>

            {/* Row 2: Filter skills by Role (Helper filter bar) */}
            <div className="rounded-lg bg-muted/30 p-2.5 border border-border">
              <div className="flex h-5 items-center justify-between mb-1.5">
                <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  {copy('Filter skills by Role', 'Lọc kỹ năng theo Vai trò')}
                </label>
                {filterTargetRole && (
                  <button
                    type="button"
                    onClick={() => setFilterTargetRole('')}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer underline"
                  >
                    {copy('Clear', 'Xoá lọc')}
                  </button>
                )}
              </div>
              <Combobox
                size="md"
                clearable={false}
                value={filterTargetRole}
                onChange={setFilterTargetRole}
                options={roleComboboxOptions}
                placeholder={copy('All roles (All skills)', 'Tất cả vai trò (Toàn bộ kỹ năng)')}
                searchPlaceholder={copy('Search role or position…', 'Tìm vai trò hoặc vị trí…')}
                emptyMessage={copy('No matching role found.', 'Không tìm thấy vai trò.')}
                aria-label={copy('Filter by Role', 'Lọc theo Vai trò')}
              />
            </div>

            {/* Row 3: Skill (col-span-2) & Knowledge level + Duration (col-span-1) */}
            <div className="grid gap-3 sm:grid-cols-3 items-start">
              <div className="sm:col-span-2 space-y-1">
                <Field label={<>{copy('Skill', 'Kỹ năng')} <span className="text-destructive" aria-hidden="true">*</span></>}>
                  <Combobox
                    size="md"
                    clearable={false}
                    disabled={!moduleSkills.length}
                    aria-describedby="module-skill-eligibility"
                    aria-label={copy('Skill', 'Kỹ năng')}
                    value={form.teachings[0]?.skillId ?? ''}
                    onChange={value => { setForm({ ...form, teachings: [{ skillId: value }], knowledgeLevel: '' }) }}
                    options={filteredEditorSkills.map(s => ({ value: s.id, label: s.name, description: s.id }))}
                    placeholder={copy('Select skill', 'Chọn kỹ năng')}
                    searchPlaceholder={copy('Search skill by name or code…', 'Tìm kỹ năng theo tên hoặc mã…')}
                    emptyMessage={copy('No matching skill found.', 'Không tìm thấy kỹ năng phù hợp.')}
                  />
                </Field>
                <p id="module-skill-eligibility" role="status" className="text-[11px] text-muted-foreground leading-tight pt-0.5">
                  {!moduleSkills.length
                    ? copy('No active, approved skills are available in this organization. Approve and activate a skill before creating a module.', 'Tổ chức chưa có kỹ năng đang hoạt động và đã được duyệt. Hãy duyệt và kích hoạt kỹ năng trước khi tạo module.')
                    : form.teachings[0]?.skillId && !moduleSkills.some(skill => skill.id === form.teachings[0].skillId)
                      ? copy('The selected skill is no longer eligible. Choose an active, approved skill.', 'Kỹ năng đã chọn không còn đủ điều kiện. Hãy chọn kỹ năng đang hoạt động và đã được duyệt.')
                      : copy('Only active, approved skills in this organization are listed.', 'Chỉ hiển thị kỹ năng thuộc tổ chức, đang hoạt động và đã được duyệt.')}
                </p>
              </div>

              <div className="sm:col-span-1 space-y-3">
                <Field label={<>{copy('Knowledge level', 'Mức kiến thức')} <span className="text-destructive" aria-hidden="true">*</span></>}>
                  <Select
                    size="md"
                    aria-required={true}
                    aria-label={copy('Knowledge level', 'Mức kiến thức')}
                    value={form.knowledgeLevel ?? ''}
                    onChange={value => { setForm({ ...form, knowledgeLevel: value }) }}
                    placeholder={copy('Select level', 'Chọn mức')}
                    options={[
                      { value: 'FOUNDATION', label: copy('Foundation', 'Nền tảng') },
                      { value: 'INTERMEDIATE', label: copy('Intermediate', 'Trung cấp') },
                      { value: 'ADVANCED', label: copy('Advanced', 'Nâng cao') },
                    ]}
                  />
                </Field>

                <div className="rounded-md border border-border bg-muted/30 p-2 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">{copy('Duration:', 'Thời lượng:')}</span>
                    <span className="font-semibold text-foreground">{form.duration} {copy('min', 'phút')}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-medium text-primary">
                    <Zap className="h-3 w-3 shrink-0" />
                    <span>{copy('Auto-synced from lessons', 'Tự động tính từ bài học')}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="content" forceMount data-authoring-section="content">
            <section aria-label={copy('Learning content', 'Nội dung học')} className="min-w-0">
              <LearningLessonsEditor onBusyChange={setContentBusy} disabled={busy || contentBusy} lessons={moduleLessons} onChange={setModuleLessons} />
            </section>
          </TabsContent>
        </Tabs>
        </fieldset>
        </DialogBody><DialogFooter className="sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            {authoringSection === 'content' && (
              <Button type="button" variant="outline" disabled={busy || contentBusy} onClick={() => setAuthoringSection('details')}>
                {copy('← Back', '← Quay lại')}
              </Button>
            )}
            <Button type="button" variant="ghost" disabled={busy || contentBusy} onClick={() => { setEditing(false); setSelected(null) }}>
              {copy('Cancel', 'Hủy')}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="outline"
              disabled={busy || contentBusy || !moduleSkills.some(skill => skill.id === form.teachings[0]?.skillId)}
            >
              {copy('Save draft', 'Lưu bản nháp')}
            </Button>
            {authoringSection === 'details' ? (
              <Button
                type="button"
                disabled={busy || contentBusy || !form.title.trim() || !form.moduleType || !moduleSkills.some(skill => skill.id === form.teachings[0]?.skillId) || !form.knowledgeLevel}
                onClick={() => setAuthoringSection('content')}
              >
                {copy('Next →', 'Tiếp theo →')}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={busy || contentBusy || !moduleSkills.some(skill => skill.id === form.teachings[0]?.skillId)}
                onClick={() => {
                  if (!authoringFormRef.current?.reportValidity()) return
                  void run(() => saveModule(true))
                }}
              >
                {copy('Submit for review', 'Gửi duyệt')}
              </Button>
            )}
          </div>
        </DialogFooter>
      </form>
    </Dialog>

    <Dialog open={Boolean(selected) && !editing} onOpenChange={open => { if (!open) setSelected(null) }} className="module-management-dialog w-[96vw] max-w-7xl max-h-[94dvh]" ariaLabel={mode === 'approvals' ? copy('Review module request', 'Duyệt yêu cầu module') : copy('Module details', 'Chi tiết module')}>
      <DialogHeader><DialogTitle>{selected && latest(selected).payload.title}</DialogTitle>{selected && <div className="flex flex-wrap items-center gap-2"><CopyableId code={selected.id} vi={language === 'vi'} entity={copy('module ID', 'mã module')} /><span className="text-xs text-muted-foreground">{copy('Status', 'Trạng thái')}</span><Badge variant={statusVariant(latest(selected).state)}>{stateLabels[latest(selected).state] ?? latest(selected).state}</Badge>{selected.releasedRevision != null && latest(selected).state !== 'RELEASED' && <span className="text-xs text-muted-foreground">({copy('Published revision', 'Bản phát hành')} {selected.releasedRevision})</span>}</div>}</DialogHeader>
      {selected && mode === 'approvals' ? <ModuleApprovalReview key={selected.id + ':' + selected.lockVersion} doc={selected} staff={staff} person={person} formatTime={formatTime} labels={stateLabels} history={historyView(selected)} copy={copy} /> : selected && <DialogBody className="space-y-4 py-2">
        <CatalogModuleDetails key={selected.id + "-" + selected.lockVersion}
          module={latest(selected).payload} content={latest(selected).payload.content}
          review={{by:latest(selected).decidedBy,at:latest(selected).decidedAt}}
          embedded hasHistory={selected.history.length>0} onClose={()=>{}} staff={staff}
          previewLabel={`${copy("Revision", "Phiên bản")} ${latest(selected).number} · ${stateLabels[latest(selected).state] ?? latest(selected).state}`}
          information={<>
        <section className="space-y-2 text-xs"><p>{copy('Responsible person', 'Người phụ trách')}: {person(selected.responsibleExpertId ?? selected.createdBy)}</p><p>{copy('Created by / Responsible Expert: ', 'Người tạo / Chuyên gia phụ trách: ')}{person(selected.responsibleExpertId ?? selected.createdBy)}</p><p>{copy('Created/imported by', 'Người tạo/nhập')}: {person(selected.createdBy)}{!selected.intake && <> · {formatTime(selected.createdAt)}</>}</p><p>{copy('Released revision', 'Phiên bản đã phát hành')}: {selected.releasedRevision ?? '—'}</p><p>{copy('Revision', 'Phiên bản')}: {latest(selected).number} · {stateLabels[latest(selected).state] ?? latest(selected).state}</p><p>{copy('Last edited', 'Sửa gần nhất')}: {person(latest(selected).editedBy)} · {formatTime(latest(selected).editedAt)}</p>{latest(selected).feedback && <p className="rounded-md bg-muted/40 p-3">{latest(selected).feedback}</p>}</section>
        {selected.intake && <section className="space-y-2 rounded-lg bg-muted/30 p-3 text-xs"><p>{copy('Source', 'Nguồn')}: {copy('Imported catalog', 'Danh mục nhập vào')} · {selected.intake.source.metadata.id}</p><p>{copy('Assigned by', 'Người phân công')}: {person(selected.intake.assignedBy)} · {formatTime(selected.intake.assignedAt)}</p><p>{copy('Received by', 'Người tiếp nhận')}: {person(selected.intake.acceptedBy)} · {formatTime(selected.intake.acceptedAt)}</p><Button variant="outline" size="sm" onClick={() => { setCatalogSelection({ module: selected.intake!.source, authoring: selected, intake: selected.intake }); setSelected(null) }}>{copy('View original catalog record', 'Xem bản danh mục gốc')}</Button></section>}
          </>}
          history={<div className="space-y-4">
            {historyView(selected)}
        <Accordion>{[...selected.revisions].reverse().filter(revision => revision.number !== latest(selected).number).map(revision => <AccordionItem key={revision.number} value={String(revision.number)}><AccordionTrigger>{copy('Revision', 'Phiên bản')} {revision.number} · {stateLabels[revision.state] ?? revision.state}</AccordionTrigger><AccordionContent><div className="space-y-4 pt-2"><p className="text-xs text-muted-foreground">{copy('Edited by', 'Người sửa')}: {person(revision.editedBy)} · {formatTime(revision.editedAt)}</p>{revision.feedback && <p className="rounded-md bg-muted/40 p-3 text-sm">{revision.feedback}</p>}<CatalogModuleDetails module={revision.payload} content={revision.payload.content} review={{ by: revision.decidedBy, at: revision.decidedAt }} embedded hasHistory={true} onClose={() => {}} staff={staff} /></div></AccordionContent></AccordionItem>)}</Accordion>          </div>}
        />
      </DialogBody>}
      <DialogFooter><div className="flex flex-1 flex-wrap gap-2">{selected && controls(selected, false)}</div><Button size="sm" variant="outline" onClick={() => setSelected(null)}>{copy('Close', 'Đóng')}</Button></DialogFooter>
    </Dialog>

    <Dialog open={responsibilityDoc !== null} onOpenChange={open => { if (!open && !busy) setResponsibilityDoc(null) }} ariaLabel={copy('Change responsible person', 'Đổi người phụ trách')}>
      <DialogHeader><DialogTitle>{copy('Change responsible person', 'Đổi người phụ trách')}</DialogTitle></DialogHeader>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (!responsibilityDoc || !responsibilityTarget) return; const doc = responsibilityDoc; void run(async () => {
        await moduleRequest<ModuleDocument>(`/modules/${encodeURIComponent(doc.id)}/responsible-expert`, 'PUT', { expectedVersion: doc.lockVersion, expertId: responsibilityTarget })
        setResponsibilityDoc(null); setCatalogSelection(null); await load(); setNotice(copy('Responsible person changed. The previous owner is retained in history.', 'Đã đổi người phụ trách. Người phụ trách trước được giữ trong lịch sử.'))
      }) }}>
        <DialogBody className="space-y-4">
          <p className="break-words text-body-sm">{responsibilityDoc && latest(responsibilityDoc).payload.title}</p>
          <p className="text-body-sm">{copy('Current responsible person', 'Người phụ trách hiện tại')}: {person(responsibilityDoc?.responsibleExpertId ?? responsibilityDoc?.createdBy)}</p>
          <Field label={copy('New responsible person', 'Người phụ trách mới')}>
            <Combobox
              size="md"
              clearable={false}
              disabled={busy}
              aria-label={copy('New responsible person', 'Người phụ trách mới')}
              value={responsibilityTarget}
              onChange={setResponsibilityTarget}
              options={experts
                .filter(expert => expert.id !== (responsibilityDoc?.responsibleExpertId ?? responsibilityDoc?.createdBy))
                .map(expert => ({ value: expert.id, label: expert.name }))}
              placeholder={copy('Select an Expert', 'Chọn Expert')}
              searchPlaceholder={copy('Search Expert…', 'Tìm Expert…')}
              emptyMessage={copy('No matching Expert found.', 'Không tìm thấy Expert.')}
            />
          </Field>
          {!experts.some(expert => expert.id !== (responsibilityDoc?.responsibleExpertId ?? responsibilityDoc?.createdBy)) && <p role="status" className="text-body-sm text-muted-foreground">{copy('No other active Expert is available in this organization.', 'Không có Expert đang hoạt động khác trong tổ chức.')}</p>}
          <p className="text-body-sm text-muted-foreground">{copy('Editing responsibility will move to the selected Expert. The creator, content and previous owners remain recorded.', 'Quyền chỉnh sửa chuyển sang Expert được chọn. Người tạo, nội dung và lịch sử người phụ trách được giữ nguyên.')}</p>
          {error && <p role="alert" className="text-body-sm text-destructive">{error}</p>}
        </DialogBody>
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setResponsibilityDoc(null)}>{copy('Cancel', 'Hủy')}</Button><Button type="submit" disabled={busy || !responsibilityTarget}>{copy('Confirm transfer', 'Xác nhận chuyển giao')}</Button></DialogFooter>
      </form>
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
