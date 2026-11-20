import { ImportedQuestionsPreview } from './ImportedQuestionsPreview'
import './questionHistory.css'
import { QuestionId } from './QuestionId'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs'
import { QuestionDirectory } from './QuestionDirectory'
import { ResponsibleExpert } from './ResponsibleExpert'
import { AssignmentFields } from './AssignmentFields'
import { latestAssignment } from './questionBankPresentation'
import { QuestionContentPreview } from './QuestionContentPreview'
import { QuestionDraftForm } from './QuestionDraftForm'
import { LinearStepper } from '../ui/LinearStepper'
import { importIssueLocation } from './importIssueLocation'
import { useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { WorkspaceSessionContext } from '../../auth/workspaceSession'

import { CheckCheck, CheckCircle2, Clock, CornerUpLeft, UserCheck, Eye, Pencil, Power, FileQuestion, History, Layers, Plus, Search, Upload } from 'lucide-react'

import * as XLSX from 'xlsx'
import { bankRequest, type BankAudit, type BankChoice, type BankContent, type BankPreview, type BankQuestion, type BankRow, type BankSession, type BankVersion, type BankView } from '../../api/questionBankApi'
import { questionBankMessage } from '../../api/questionBankMessages'
import { useTranslation } from '../../i18n/LanguageContext'
import { useToast } from '../../hooks/useToast'
import { WorkspaceLayout } from '../../layouts/WorkspaceLayout'
import { Heading } from '../typography/Heading'
import { Text } from '../typography/Text'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/Accordion'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Combobox } from '../ui/Combobox'
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/Dialog'
import { EmptyState } from '../ui/EmptyState'
import { FormField } from '../ui/FormField'
import { Input } from '../ui/Input'
import { LoadingCard } from '../ui/LoadingCard'
import { PageHeader } from '../ui/PageHeader'
import { Pagination } from '../ui/Pagination'
import { Select } from '../ui/Select'
import { QuestionImportUpload, type ImportFileInfo } from './QuestionImportPanels'
import { StatCard } from '../ui/StatCard'

const fieldClass = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-[length:var(--text-body-sm)] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
const emptyContent = (): BankContent => ({ prompt: '', options: ['', '', '', ''], correctAnswer: null, skillId: '', skillName: null, knowledgeLevel: null, mandatory: false, explanation: '' })
const current = (q: BankQuestion) => q.versions[q.versions.length - 1]
interface Editor { id: string | null; revision: number | null; code: string; content: BankContent; acknowledged: boolean }
interface Action { q: BankQuestion; name: string; reason: string; owner: string }
const columnAliases: Record<string, string> = {
  prompt: 'prompt', 'nội dung câu hỏi': 'prompt', 'question prompt': 'prompt',
  optiona: 'optionA', 'đáp án a': 'optionA', 'option a': 'optionA',
  optionb: 'optionB', 'đáp án b': 'optionB', 'option b': 'optionB',
  optionc: 'optionC', 'đáp án c': 'optionC', 'option c': 'optionC',
  optiond: 'optionD', 'đáp án d': 'optionD', 'option d': 'optionD',
  correctanswer: 'correctAnswer', 'đáp án đúng (a-d)': 'correctAnswer', 'đáp án đúng': 'correctAnswer', 'correct answer (a-d)': 'correctAnswer', 'correct answer': 'correctAnswer',
  skillid: 'skillCode', skillcode: 'skillCode', 'mã skill': 'skillCode', 'skill code': 'skillCode',
  knowledgelevel: 'knowledgeLevel', 'mức kiến thức': 'knowledgeLevel', 'knowledge level': 'knowledgeLevel',
  mandatory: 'mandatory', 'bắt buộc (true/false)': 'mandatory', 'bắt buộc': 'mandatory', 'mandatory (true/false)': 'mandatory',
  explanation: 'explanation', 'giải thích': 'explanation',
}
const levelAliases: Record<string, string> = {
  FOUNDATION: 'FOUNDATION', 'NỀN TẢNG': 'FOUNDATION',
  INTERMEDIATE: 'INTERMEDIATE', 'TRUNG CẤP': 'INTERMEDIATE',
  ADVANCED: 'ADVANCED', 'NÂNG CAO': 'ADVANCED',
}
function parseRows(value: unknown, maxRows: number, skills: BankChoice[] = []): BankRow[] {
  if (!Array.isArray(value) || !value.length || value.length > maxRows) throw new Error(`Import 1–${maxRows} questions / Nhập từ 1–${maxRows} câu hỏi`)
  const skillLookup = new Map<string, string>()
  for (const s of skills) {
    skillLookup.set(s.id.toLowerCase(), s.id)
    skillLookup.set(s.name.toLowerCase(), s.id)
    if (s.code) skillLookup.set(s.code.toLowerCase(), s.id)
  }
  return value.map((entry: unknown, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`Row ${index + 1}: invalid object`)
    const raw = entry as Record<string, unknown>
    const row: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(raw)) {
      if (k.trim().toLowerCase() === 'code') throw new Error('Question codes are generated automatically. Remove code and use the latest template.')
      const canonical = columnAliases[k.trim().toLowerCase()]
      if (!canonical) throw new Error(`Row ${index + 1}: use the template columns`)
      row[canonical] = v
    }
    const text = (key: string) => { const v = row[key]; if (v == null) return ''; if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') throw new Error(`Row ${index + 1}: invalid ${key}`); return String(v) }
    const answer = text('correctAnswer').trim().toUpperCase()
    if (answer && !/^[A-D]$/.test(answer)) throw new Error(`Row ${index + 1}: correctAnswer must be A–D, or blank for an incomplete draft`)
    const mandatoryRaw = text('mandatory').trim().toLowerCase()
    if (!['', 'true', 'false', 'có', 'không', 'yes', 'no'].includes(mandatoryRaw)) throw new Error(`Row ${index + 1}: mandatory must be true or false`)
    const rawSkill = text('skillCode').trim()
    const resolvedSkillId = rawSkill ? (skillLookup.get(rawSkill.toLowerCase()) ?? rawSkill) : ''
    const rawLevel = text('knowledgeLevel').trim()
    const resolvedLevel = rawLevel ? (levelAliases[rawLevel.toUpperCase()] ?? rawLevel) : null
    return {
      content: {
        prompt: text('prompt'),
        options: ['A', 'B', 'C', 'D'].map(letter => text('option' + letter)),
        correctAnswer: /^[A-D]$/.test(answer) ? answer.charCodeAt(0) - 65 : null,
        skillId: resolvedSkillId,
        skillName: null,
        knowledgeLevel: resolvedLevel,
        mandatory: mandatoryRaw === 'true' || mandatoryRaw === 'có' || mandatoryRaw === 'yes',
        explanation: text('explanation'),
      },
    }
  })
}
export function QuestionBankWorkspace() {
  const identity = useContext(WorkspaceSessionContext)?.identity
  return <OwnedQuestionBankWorkspace key={(identity?.organizationId ?? '') + ':' + (identity?.accountId ?? '') + ':' + (identity?.roles?.join(',') ?? '')} />
}
function OwnedQuestionBankWorkspace() {
  const { language } = useTranslation(), vi = language === 'vi'
  const copy = (en: string, vn: string) => vi ? vn : en
  const { toast } = useToast()
  const [session, setSession] = useState<BankSession | null>(null), [bank, setBank] = useState<BankView | null>(null)
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessageState] = useState('')
  const setMessage = (text: string) => {
    setMessageState(text)
    if (text) toast({ description: text, variant: 'success', duration: 3000 })
  }
  const [search, setSearch] = useState(''), [skill, setSkill] = useState('all'), [status, setStatus] = useState('all'), [owner, setOwner] = useState('all'), [page, setPage] = useState(1)
  const [levelFilter, setLevelFilter] = useState('all')
  const [editor, setEditor] = useState<Editor | null>(null), [editorShowErrors, setEditorShowErrors] = useState(false), [detail, setDetail] = useState<string | null>(null), [versionId, setVersionId] = useState('')
  const [detailTab, setDetailTab] = useState('content')
  const detailBodyId = useId()
  const [action, setAction] = useState<Action | null>(null), [selected, setSelected] = useState<string[]>([])
  const [importStep, setImportStep] = useState(0), [importFile, setImportFile] = useState<ImportFileInfo | null>(null)
  const [sourceRows, setSourceRows] = useState<number[]>([])
  const [reviewQuestionIndex, setReviewQuestionIndex] = useState<number | null>(null)
  const [importedQuestions, setImportedQuestions] = useState<BankQuestion[] | null>(null)
  const [importOpen, setImportOpen] = useState(false), [preview, setPreview] = useState<BankPreview | null>(null), [ackWarnings, setAckWarnings] = useState(false)
  const [approvalFeedback, setApprovalFeedback] = useState<{ issues: { id: string; code: string; reason: string }[]; serverError: string | null } | null>(null)
  const [batchReviewOpen, setBatchReviewOpen] = useState(false), [batchReviewIds, setBatchReviewIds] = useState<string[]>([])
  const [batchSkillFilter, setBatchSkillFilter] = useState('all'), [batchOwnerFilter, setBatchOwnerFilter] = useState('all'), [batchLevelFilter, setBatchLevelFilter] = useState('all')
  const [batchCompactView, setBatchCompactView] = useState(true), [expandedBatchIds, setExpandedBatchIds] = useState<string[]>([]), [batchPage, setBatchPage] = useState(1)
  const lock = useRef(false), loadEpoch = useRef(0)
  const load = useCallback(async (signal?: AbortSignal) => {
    const epoch = ++loadEpoch.current
    try { const [identity, data] = await Promise.all([bankRequest<BankSession>('/session', undefined, signal), bankRequest<BankView>('', undefined, signal)]); if (!signal?.aborted && epoch === loadEpoch.current) { setSession(identity); setBank(data); setSelected([]) } }
    catch (e) { if (!signal?.aborted && epoch === loadEpoch.current) setError(e instanceof Error ? e.message : 'Unable to load Question Bank') }
    finally { if (!signal?.aborted && epoch === loadEpoch.current) setLoading(false) }
  }, [])
  // load commits state only after awaited network requests; this effect synchronizes external data.
  // eslint-disable-next-line react/set-state-in-effect
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort() }, [load])
  const refresh = () => { setLoading(true); setError(''); setMessage(''); void load() }
  const run = async (operation: () => Promise<void>) => {
    if (lock.current) return; lock.current = true; loadEpoch.current++; setLoading(false); setBusy(true); setError(''); setMessage('')
    try { await operation() }
    catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed'
      setError(msg)
      if (!editor && !action && !importOpen && !detail) {
        toast({ description: questionBankMessage(msg, vi), variant: 'destructive', duration: 4000 })
      }
    }
    finally { lock.current = false; setBusy(false) }
  }
  const command = async (q: BankQuestion, name: string, reason = '', nextOwner: string | null = null) => {
    setBank(await bankRequest<BankView>('/commands', { id: q.id, expectedRevision: q.revision, action: name, reason, owner: nextOwner })); setSelected([]); setMessage(copy('Question updated.', 'Đã cập nhật câu hỏi.'))
  }
  const manager = session?.actor.role === 'LD_MANAGER'
  const questions = bank?.questions ?? [], query = search.trim().toLocaleLowerCase()
  const pendingQuestions = questions.filter(q => !q.retired && !!q.owner && current(q).state === 'SUBMITTED')
  const filtered = questions.filter(q => { const v = current(q); return (!query || `${q.code} ${v.content.prompt}`.toLocaleLowerCase().includes(query)) && (skill === 'all' || v.content.skillId === skill) && (status === 'all' ? !q.retired : status === 'RETIRED' ? q.retired : !q.retired && v.state === status) && (owner === 'all' || (owner === 'unassigned' ? !q.owner : q.owner === owner)) && (levelFilter === 'all' || (levelFilter === 'UNCLASSIFIED' ? !v.content.knowledgeLevel : v.content.knowledgeLevel === levelFilter)) })
  const knowledgeChoices = (session?.knowledge ?? []).filter(k => k.skillId === editor?.content.skillId)
  const seedPublishers = new Set(questions.filter(q => q.versions.some(v => v.publicationSource === 'DEVELOPMENT_SEED')).map(q => q.createdBy))
  const pages = Math.max(1, Math.ceil(filtered.length / 20)), activePage = Math.min(page, pages), visible = filtered.slice((activePage - 1) * 20, activePage * 20)
  const detailQ = questions.find(q => q.id === detail), detailV = detailQ && (detailQ.versions.find(v => v.id === versionId) ?? current(detailQ))
  const person = (id: string | null) => id ? session?.people.find(p => p.id === id)?.name ?? (seedPublishers.has(id) ? copy('System Curriculum', 'Hệ thống đào tạo') : id === session?.actor.id ? copy('You', 'Bạn') : copy('Person unavailable', 'Chưa có thông tin người dùng')) : '–'
  const date = (value: string | null) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString(vi ? 'vi-VN' : 'en-GB') : '–'
  const stateName = (v: BankVersion) => v.state === 'DRAFT' ? copy('Draft', 'Bản nháp') : v.state === 'SUBMITTED' ? copy('Pending review', 'Chờ duyệt') : copy('Published', 'Đã xuất bản')
  const knowledgeLevel = (value: string | null) => ({ FOUNDATION: copy('Foundation', 'Nền tảng'), INTERMEDIATE: copy('Intermediate', 'Trung cấp'), ADVANCED: copy('Advanced', 'Nâng cao') })[value ?? ''] ?? copy('Unclassified', 'Chưa phân loại')
  const own = (q: BankQuestion) => session?.actor.role === 'DOMAIN_EXPERT' && q.owner === session.actor.id
  const edit = (q?: BankQuestion) => { setEditorShowErrors(false); setEditor(q ? { id: q.id, revision: q.revision, code: q.code, content: { ...current(q).content, options: [...current(q).content.options] }, acknowledged: false } : { id: null, revision: null, code: '', content: emptyContent(), acknowledged: false }); setError('') }
  const openDetail = (q: BankQuestion) => { setDetailTab('content'); setMessage(''); setDetail(q.id); setVersionId(current(q).id) }
  const ask = (q: BankQuestion, name: string) => setAction({ q, name, reason: '', owner: q.owner ?? '' })
  const setContent = (patch: Partial<BankContent>) => setEditor(prev => prev ? { ...prev, content: { ...prev.content, ...patch } } : null)
  const save = (submitAfterSave = false) => {
    if (!editor) return
    const opts = [0, 1, 2, 3].map(i => (editor.content.options[i] ?? '').trim().toLowerCase())
    const nonEmptyOpts = opts.filter(Boolean)
    if (new Set(nonEmptyOpts).size !== nonEmptyOpts.length) {
      setEditorShowErrors(true)
      setError(copy('Two or more answer options are identical. Please make all options distinct.', 'Có từ 2 đáp án trở lên giống nhau. Vui lòng nhập các đáp án khác nhau.'))
      return
    }
    if (submitAfterSave && (nonEmptyOpts.length < 4 || editor.content.correctAnswer === null || !editor.content.knowledgeLevel)) {
      setEditorShowErrors(true)
      setError(copy('Complete all required fields highlighted above before submitting for review.', 'Vui lòng điền đầy đủ các trường bắt buộc được đánh dấu phía trên trước khi gửi duyệt.'))
      return
    }
    void run(async () => {
      if (!editor) return
      const nextBank = await bankRequest<BankView>('/questions', { id: editor.id, expectedRevision: editor.revision, content: editor.content, acknowledgeDuplicates: editor.acknowledged })
      if (!submitAfterSave) {
        setBank(nextBank)
        setEditor(null)
        setMessage(copy('Draft saved.', 'Đã lưu bản nháp.'))
        return
      }
      const existingIds = new Set((bank?.questions ?? []).map(q => q.id))
      const target = editor.id
        ? nextBank.questions.find(q => q.id === editor.id)
        : nextBank.questions.find(q => !existingIds.has(q.id)) ?? nextBank.questions.at(-1)
      if (!target) {
        setBank(nextBank)
        setEditor(null)
        setMessage(copy('Draft saved.', 'Đã lưu bản nháp.'))
        return
      }
      setBank(nextBank)
      setEditor(prev => prev ? { ...prev, id: target.id, revision: target.revision, code: target.code } : null)
      const submittedBank = await bankRequest<BankView>('/commands', { id: target.id, expectedRevision: target.revision, action: 'SUBMIT', reason: '', owner: null })
      setBank(submittedBank)
      setEditor(null)
      setMessage(copy('Question submitted for review.', 'Đã gửi duyệt câu hỏi.'))
    })
  }
  const approveSelected = () => {
    const issues = selected.flatMap(id => {
      const q = questions.find(item => item.id === id)
      if (!q) return [{ id, code: id, reason: copy('Question changed. Reload the latest data.', 'Câu hỏi đã thay đổi. Hãy tải lại dữ liệu mới nhất.') }]
      const v = current(q)
      const reason = q.retired || v.state !== 'SUBMITTED'
        ? copy('This question is no longer awaiting approval. Reload the latest data.', 'Câu hỏi không còn ở trạng thái chờ duyệt. Hãy tải lại dữ liệu mới nhất.')
        : !q.owner ? copy('Assign a responsible Expert before approval.', 'Cần phân công Expert phụ trách trước khi duyệt.')
          : v.viewed[session!.actor.id] !== v.id ? copy('Open Details & history, read the content, then select Mark this version reviewed.', 'Mở Chi tiết và lịch sử, đọc nội dung rồi bấm Xác nhận đã xem phiên bản.') : null
      return reason ? [{ id, code: q.code, reason }] : []
    })
    if (issues.length) { setApprovalFeedback({ issues, serverError: null }); return }
    void run(async () => {
      try {
        setBank(await bankRequest<BankView>('/approve', { questions: selected.map(id => { const q = questions.find(x => x.id === id)!; return { id, expectedRevision: q.revision, action: 'APPROVE' } }) }))
        setSelected([]); setMessage(copy('Selected versions approved.', 'Đã duyệt các phiên bản đã chọn.'))
      } catch (e) {
        let reason = e instanceof Error ? e.message : 'Request failed'
        for (const q of questions) reason = reason.split(q.id).join(q.code)
        setApprovalFeedback({ issues: [], serverError: reason })
        throw e
      }
    })
  }
  const template = (lang: 'vi' | 'en') => {
    const link = document.createElement('a')
    link.href = lang === 'en' ? '/api/v1/question-bank/imports/template?lang=en' : '/api/v1/question-bank/imports/template'
    link.download = lang === 'en' ? 'question-bank-template-en.xlsx' : 'question-bank-template.xlsx'
    link.click()
  }
  const upload = (file: File) => void run(async () => {
    setReviewQuestionIndex(null); setPreview(null); setAckWarnings(false); setImportStep(0); setImportFile({ name: file.name, bytes: file.size }); setSourceRows([])
    if (file.size > (session?.maxImportBytes ?? 10485760)) throw new Error(copy('File exceeds the configured size limit.', 'File vượt quá dung lượng cho phép.'))
    if (!file.name.toLowerCase().endsWith('.xlsx')) throw new Error(copy('Use an Excel (.xlsx) file from the template.', 'Chỉ hỗ trợ file Excel (.xlsx) theo mẫu.'))
    const buffer = await file.arrayBuffer()
    let fileHash: string | null = null
    if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
      fileHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
    }
    const workbook = XLSX.read(buffer, { type: 'array' })
    const allowedSheets = new Set(['Questions', 'HuongDan', 'InstructionsEN', 'DanhMuc', 'SkillCatalog', 'Skills', 'Knowledge levels'])
    if (workbook.SheetNames.length > 1 && (workbook.SheetNames.some(name => !allowedSheets.has(name)) || !workbook.SheetNames.includes('Questions'))) {
      throw new Error(copy('Use the Questions sheet from the Excel template.', 'Sử dụng sheet Questions theo đúng mẫu Excel tải về.'))
    }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames.includes('Questions') ? 'Questions' : workbook.SheetNames[0]], { defval: '' })
    setSourceRows(Array.isArray(rows) ? rows.map((row, index) => typeof row?.__rowNum__ === 'number' ? row.__rowNum__ + 1 : index + 1) : [])
    setPreview(await bankRequest<BankPreview>('/imports/preview', { rows: parseRows(rows, session?.maxImportRows ?? 500, session?.skills ?? []), fileHash })); setImportStep(1)
  })
  const actionNeedsReason = !!action && !['SUBMIT', 'APPROVE'].includes(action.name)
  const actions = (q: BankQuestion, includeDetails = true, includeAssignment = true, footer = false) => {
    const v = current(q)
    return <div className="flex flex-wrap gap-2">
      {includeDetails && <Button variant="outline" size="sm" disabled={busy} onClick={() => openDetail(q)}><Eye className="size-4" />{copy('Details & history', 'Chi tiết và lịch sử')}</Button>}
      {own(q) && v.state === 'DRAFT' && <><Button variant="outline" size="sm" disabled={busy} onClick={() => edit(q)}>{copy('Edit draft', 'Sửa nháp')}</Button>{!q.retired && <Button size="sm" disabled={busy} onClick={() => footer ? ask(q, 'SUBMIT') : void run(() => command(q, 'SUBMIT'))}>{footer ? copy('Submit for review', 'Gửi duyệt') : copy('Submit', 'Gửi duyệt')}</Button>}</>}
      {own(q) && v.state === 'SUBMITTED' && <Button variant="outline" size="sm" disabled={busy} onClick={() => ask(q, 'WITHDRAW')}>{copy('Withdraw', 'Rút yêu cầu')}</Button>}
      {own(q) && v.state === 'PUBLISHED' && <Button variant="outline" size="sm" disabled={busy} onClick={() => void run(() => command(q, 'SUCCESSOR'))}>{copy('Create successor', 'Tạo phiên bản mới')}</Button>}
      {own(q) && !q.request && q.versions.some(x => x.state === 'PUBLISHED') && <Button variant="ghost" size="sm" disabled={busy} onClick={() => ask(q, q.retired ? 'REQUEST_REACTIVATE' : 'REQUEST_RETIRE')}>{q.retired ? copy('Request reactivation', 'Yêu cầu dùng lại') : copy('Request retirement', 'Yêu cầu ngừng dùng')}</Button>}
      {manager && includeAssignment && <Button variant="outline" size="sm" disabled={busy} onClick={() => ask(q, 'ASSIGN')}>{q.owner ? copy('Reassign Expert', 'Đổi Expert phụ trách') : copy('Assign Expert', 'Phân công Expert')}</Button>}
    </div>
  }
  return <WorkspaceLayout><div className="space-y-6 pb-16 min-w-0">
    <PageHeader title={copy('Assessment Bank', 'Ngân hàng câu hỏi')} description={copy('Manage reviewed questions across your organization’s skills.', 'Quản lý câu hỏi theo kỹ năng và theo dõi quá trình duyệt trong tổ chức.')} actions={session && !manager ? <div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" leftIcon={<Upload className="h-4 w-4" aria-hidden="true" />} className="bg-secondary text-primary border border-primary/20 hover:bg-secondary/80 font-semibold shadow-2xs" disabled={busy || !session.skills.length} onClick={() => { setImportOpen(true); setPreview(null); setImportStep(0); setImportFile(null); setSourceRows([]); setError(''); setAckWarnings(false) }}>{copy('Import questions', 'Nhập câu hỏi')}</Button><Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />} className="font-semibold shadow-2xs" disabled={busy || !session.skills.length} onClick={() => edit()}>{copy('Create question', 'Tạo câu hỏi')}</Button></div> : undefined} />
    {error && <Card role="alert" className="border-destructive"><CardContent className="p-4 space-y-2"><Text>{questionBankMessage(error, vi)}</Text><Button variant="outline" disabled={busy} onClick={refresh}>{copy('Reload latest data', 'Tải lại dữ liệu mới nhất')}</Button></CardContent></Card>}

    {message && <Text role="status" className="text-success">{message}</Text>}

    {session && !session.skills.length && <Text role="status">{copy('No approved MicroSkills are available. Contact the catalog manager before authoring questions.', 'Chưa có MicroSkill đã duyệt. Liên hệ người quản lý danh mục trước khi biên soạn câu hỏi.')}</Text>}
    {loading ? <LoadingCard label={copy('Loading Question Bank…', 'Đang tải ngân hàng câu hỏi…')} /> : bank && session && <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard variant="gradient" icon={<FileQuestion className="h-4 w-4 text-primary" aria-hidden="true" />} valueClassName="text-primary" description={copy('Across your organization', 'Trong ngân hàng của tổ chức')} title={copy('Total Bank Items', 'Tổng câu hỏi')} value={questions.length} />
        <StatCard variant="gradient" icon={<CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />} valueClassName="text-success" description={copy('Published and available', 'Đã xuất bản và sẵn sàng sử dụng')} title={copy('Published Questions', 'Câu đã xuất bản')} value={questions.filter(q => !q.retired && current(q).state === 'PUBLISHED' && current(q).content.knowledgeLevel).length} />
        <StatCard variant="gradient" className="cursor-pointer transition-all hover:border-warning/60" onClick={() => { setStatus(s => s === 'SUBMITTED' ? 'all' : 'SUBMITTED'); setPage(1) }} icon={<Clock className="h-4 w-4 text-warning" aria-hidden="true" />} valueClassName="text-warning" description={copy('Click to filter pending review', 'Nhấn để lọc câu chờ duyệt')} title={copy('Pending review', 'Chờ duyệt')} value={questions.filter(q => current(q).state === 'SUBMITTED').length} />
        <StatCard variant="gradient" icon={<Layers className="h-4 w-4 text-primary" aria-hidden="true" />} valueClassName="text-primary" description={copy('Skills covered by your questions', 'Kỹ năng được bao phủ bởi câu hỏi')} title={copy('Micro-Skills Assessed', 'Kỹ năng được đánh giá')} value={new Set(questions.map(q => current(q).content.skillId).filter(Boolean)).size} />
      </div>


      <Card><CardHeader className="border-b border-border p-4"><div className="flex flex-col gap-3"><div><CardTitle className="flex items-center gap-2"><FileQuestion className="size-4 text-primary" />{copy('Question Bank Directory', 'Danh sách câu hỏi')}</CardTitle><CardDescription>{copy('Browse by MicroSkill, review versions and track responsibility.', 'Xem theo MicroSkill, theo dõi phiên bản và người phụ trách.')}</CardDescription></div><div className="flex flex-wrap items-end justify-between gap-2.5">
        <div className="grid flex-1 min-w-0 gap-2.5 sm:grid-cols-2 xl:grid-cols-5 items-end">
          <FormField label={copy('Search', 'Tìm kiếm')}><Input className="h-8 text-xs bg-card" aria-label={copy('Search questions', 'Tìm câu hỏi')} leftIcon={<Search className="size-3.5" />} placeholder={copy('Search questions…', 'Tìm câu hỏi…')} value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} /></FormField>
          <FormField label="MicroSkill"><Combobox size="sm" clearable={false} aria-label={copy('Filter skill', 'Lọc kỹ năng')} value={skill} onChange={value => { setSkill(value); setPage(1) }} options={[{ value: 'all', label: copy('All skills', 'Tất cả kỹ năng') }, ...session.skills.map(s => ({ value: s.id, label: s.name }))]} placeholder={copy('All skills', 'Tất cả kỹ năng')} searchPlaceholder={copy('Search skill…', 'Tìm kỹ năng…')} emptyMessage={copy('No matching skill.', 'Không tìm thấy kỹ năng.')} /></FormField>
          <FormField label={copy('Knowledge level', 'Mức kiến thức')}><Select size="sm" aria-label={copy('Filter knowledge level', 'Lọc mức kiến thức')} value={levelFilter} onChange={value => { setLevelFilter(value); setPage(1) }} options={[{ value: 'all', label: copy('All knowledge levels', 'Tất cả mức kiến thức') }, ...['FOUNDATION', 'INTERMEDIATE', 'ADVANCED', 'UNCLASSIFIED'].map(value => ({ value, label: knowledgeLevel(value === 'UNCLASSIFIED' ? null : value) }))]} /></FormField>
          <FormField label={copy('Status', 'Trạng thái')}><Select size="sm" aria-label={copy('Filter status', 'Lọc trạng thái')} value={status} onChange={value => { setStatus(value); setPage(1) }} options={[{ value: 'all', label: copy('All states', 'Tất cả trạng thái') }, ...['DRAFT', 'SUBMITTED', 'PUBLISHED', 'RETIRED'].map(s => ({ value: s, label: s === 'RETIRED' ? copy('Retired', 'Ngừng sử dụng') : s === 'DRAFT' ? copy('Draft', 'Bản nháp') : s === 'SUBMITTED' ? copy('Pending review', 'Chờ duyệt') : copy('Published', 'Đã xuất bản') }))]} /></FormField>
          <FormField label={copy('Responsible Expert', 'Expert phụ trách')}><Combobox size="sm" clearable={false} aria-label={copy('Filter responsible Expert', 'Lọc người phụ trách')} value={owner} onChange={value => { setOwner(value); setPage(1) }} options={[{ value: 'all', label: copy('All Experts', 'Tất cả Expert') }, { value: 'unassigned', label: copy('Unassigned', 'Chưa phân công') }, ...session.experts.map(s => ({ value: s.id, label: s.name }))]} placeholder={copy('All Experts', 'Tất cả Expert')} searchPlaceholder={copy('Search Expert…', 'Tìm Expert…')} emptyMessage={copy('No matching Expert.', 'Không tìm thấy Expert.')} /></FormField>
        </div>
        {manager && pendingQuestions.length > 0 && (
          <div className="shrink-0 pb-0.5">
            <Button size="sm" variant="outline" className="h-8 gap-1.5 border-warning/50 bg-warning/10 text-warning hover:bg-warning/20 font-medium" disabled={busy} onClick={() => { setBatchReviewIds(pendingQuestions.map(q => q.id)); setBatchReviewOpen(true) }}>
              <CheckCheck className="size-4" aria-hidden="true" />
              {copy('Batch review', 'Duyệt hàng loạt')} ({pendingQuestions.length})
            </Button>
          </div>
        )}

      </div></div></CardHeader><CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><Text variant="body-sm" className="text-muted-foreground">{copy(`Results: ${filtered.length} · ${Math.min((activePage - 1) * 20 + 1, filtered.length)}–${Math.min(activePage * 20, filtered.length)} shown`, `${filtered.length} câu hỏi · hiển thị ${Math.min((activePage - 1) * 20 + 1, filtered.length)}–${Math.min(activePage * 20, filtered.length)}`)}</Text>{(search || skill !== 'all' || levelFilter !== 'all' || status !== 'all' || owner !== 'all') && <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setSkill('all'); setLevelFilter('all'); setStatus('all'); setOwner('all'); setPage(1) }}>{copy('Clear filters', 'Xoá bộ lọc')}</Button>}</div>
          <div className="flex flex-wrap gap-2" aria-label={copy('Active filters', 'Bộ lọc đang áp dụng')}>{[
            { label: search && `${copy('Search', 'Tìm kiếm')}: ${search}`, clear: () => setSearch('') },
            { label: skill !== 'all' && session.skills.find(s => s.id === skill)?.name, clear: () => setSkill('all') },
            { label: levelFilter !== 'all' && knowledgeLevel(levelFilter === 'UNCLASSIFIED' ? null : levelFilter), clear: () => setLevelFilter('all') },
            { label: status !== 'all' && (status === 'DRAFT' ? copy('Draft', 'Bản nháp') : status === 'SUBMITTED' ? copy('Pending review', 'Chờ duyệt') : status === 'PUBLISHED' ? copy('Published', 'Đã xuất bản') : copy('Retired', 'Ngừng sử dụng')), clear: () => setStatus('all') },
            { label: owner !== 'all' && (owner === 'unassigned' ? copy('Unassigned', 'Chưa phân công') : person(owner)), clear: () => setOwner('all') },
          ].filter(filter => filter.label).map((filter, index) => <Button key={index} size="sm" variant="outline" className="h-auto max-w-full bg-muted py-1 text-caption" aria-label={`${copy('Remove filter', 'Bỏ bộ lọc')}: ${filter.label}`} onClick={() => { filter.clear(); setPage(1) }}><span className="truncate">{filter.label}</span><span aria-hidden="true">×</span></Button>)}</div>
          {manager && selected.length > 0 && <div role="toolbar" aria-label={copy('Selected question actions', 'Thao tác câu hỏi đã chọn')} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2"><Text variant="body-sm">{copy(`${selected.length} selected`, `Đã chọn ${selected.length}`)}</Text><Button size="sm" disabled={busy} onClick={approveSelected}>{copy('Approve selected', 'Duyệt các câu đã chọn')} ({selected.length})</Button><Button variant="ghost" size="sm" disabled={busy} onClick={() => setSelected([])}>{copy('Clear selection', 'Bỏ chọn tất cả')}</Button></div>}
          {!filtered.length ? <EmptyState title={copy('No questions match this view', 'Chưa có câu hỏi phù hợp')} description={manager ? copy('Change the filters to find questions added by your Experts.', 'Điều chỉnh bộ lọc để tìm câu hỏi do các Expert biên soạn.') : copy('Change the filters, or create a new question.', 'Điều chỉnh bộ lọc hoặc tạo câu hỏi mới.')} /> : <QuestionDirectory questions={visible} history={bank.history} session={session} selected={selected} onSelect={(id, checked) => setSelected(prev => checked ? [...prev, id] : prev.filter(value => value !== id))} onView={openDetail} actions={q => actions(q, false)} hasActions={q => manager || own(q)} primaryActions={q => <>{own(q) && current(q).state === 'DRAFT' ? <Button variant="outline" size="icon" title={copy('Edit draft', 'Sửa nháp')} aria-label={`${copy('Edit draft', 'Sửa nháp')} ${q.code}`} disabled={busy} onClick={() => edit(q)}><Pencil className="size-4" aria-hidden="true" /></Button> : own(q) && !q.request && q.versions.some(version => version.state === 'PUBLISHED') ? <Button variant="outline" size="icon" className={q.retired ? 'text-success hover:bg-success/10' : 'text-destructive hover:bg-destructive/10'} title={q.retired ? copy('Request reactivation', 'Yêu cầu dùng lại') : copy('Request retirement', 'Yêu cầu ngừng dùng')} aria-label={`${q.retired ? copy('Request reactivation', 'Yêu cầu dùng lại') : copy('Request retirement', 'Yêu cầu ngừng dùng')} ${q.code}`} disabled={busy} onClick={() => ask(q, q.retired ? 'REQUEST_REACTIVATE' : 'REQUEST_RETIRE')}><Power className="size-4" aria-hidden="true" /></Button> : null}</>} busy={busy} vi={vi} levelName={knowledgeLevel} stateName={stateName} date={date} />}


          <Pagination currentPage={activePage} totalPages={pages} totalItems={filtered.length} pageSize={20} onPageChange={setPage} itemLabel={copy('questions', 'câu hỏi')} locale={vi ? 'vi' : 'en'} />
        </CardContent></Card>
    </>}
    <Dialog open={!!editor} onOpenChange={open => { if (!open && !busy) setEditor(null) }} size="wide" className="max-w-6xl border-border shadow-lg focus-visible:outline-none" closeLabel={copy('Close', 'Đóng')}>
      {editor && <><DialogHeader><DialogTitle className="text-[length:var(--text-card)] font-semibold">{editor.id ? copy('Edit draft question', 'Sửa câu hỏi nháp') : copy('Create draft question', 'Tạo câu hỏi nháp')}</DialogTitle><DialogDescription>{copy('Enter a prompt and choose a MicroSkill to save a draft. Complete every field before submission.', 'Nhập nội dung và chọn MicroSkill để lưu nháp. Hoàn thiện câu hỏi trước khi gửi duyệt.')}</DialogDescription></DialogHeader><DialogBody className="focus-visible:outline-muted-foreground space-y-4 py-4">
        <QuestionDraftForm content={editor.content} code={editor.id ? editor.code : null} skills={session?.skills ?? []} knowledgeLevels={knowledgeChoices.map(choice => choice.knowledgeLevel)} busy={busy} onChange={setContent} vi={vi} showErrors={editorShowErrors} />
        {(editor.acknowledged || error.includes('Matching question content')) && <label className="flex gap-2 items-start"><input type="checkbox" checked={editor.acknowledged} disabled={busy} onChange={e => setEditor({ ...editor, acknowledged: e.target.checked })} /><Text as="span" variant="body-sm">{copy('Allow matching content under a different code after checking the duplicate warning.', 'Cho phép nội dung trùng dưới mã khác sau khi đã kiểm tra cảnh báo.')}</Text></label>}
        {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{questionBankMessage(error, vi)}</div>}
      </DialogBody><DialogFooter><Button variant="outline" disabled={busy} onClick={() => setEditor(null)}>{copy('Cancel', 'Huỷ')}</Button><Button variant="outline" disabled={busy || !editor.content.prompt.trim() || !editor.content.skillId} onClick={() => save(false)}>{busy ? copy('Saving…', 'Đang lưu…') : copy('Save draft', 'Lưu nháp')}</Button><Button disabled={busy || !editor.content.prompt.trim() || !editor.content.skillId} onClick={() => save(true)}>{copy('Submit for review', 'Gửi duyệt')}</Button></DialogFooter></>}
    </Dialog>
    <Dialog ariaLabel={copy('Question details', 'Chi tiết câu hỏi')} open={!!detailQ} onOpenChange={open => { if (!open && !busy) setDetail(null) }} className="w-[96vw] max-w-3xl max-h-[90dvh]" closeLabel={copy('Close panel', 'Đóng bảng chi tiết')}>
      {detailQ && detailV && <><DialogHeader><DialogTitle className="text-[length:var(--text-card)] font-semibold">{copy('Question details', 'Chi tiết câu hỏi')}</DialogTitle><DialogDescription>{copy('Review content, responsibility and recorded version history.', 'Xem nội dung, người phụ trách và lịch sử phiên bản được ghi nhận.')}</DialogDescription></DialogHeader>
        <Tabs value={detailTab} onValueChange={value => { setDetailTab(value); requestAnimationFrame(() => { const body = document.getElementById(detailBodyId); if (body) body.scrollTop = 0 }) }} className="flex min-h-0 flex-1 flex-col"><TabsList className="mb-3 h-10 shrink-0"><TabsTrigger value="content" className="min-w-0 flex-1 px-2 text-caption sm:text-body-sm">{copy('Question content', 'Nội dung câu hỏi')}</TabsTrigger><TabsTrigger value="history" className="min-w-0 flex-1 px-2 text-caption sm:text-body-sm">{copy('History & versions', 'Lịch sử & phiên bản')}</TabsTrigger></TabsList><DialogBody id={detailBodyId} className="focus-visible:outline-muted-foreground py-3"><TabsContent value="content" className="space-y-5">
          {message && <Text role="status" className="text-success">{message}</Text>}
          <section aria-label={copy('Question content', 'Nội dung câu hỏi')} className="space-y-3">
            <Heading level={3} size="card">{copy('Question content', 'Nội dung câu hỏi')}</Heading>
            <QuestionContentPreview content={detailV.content} vi={vi} variant="details" />
          </section>
          <section aria-label={copy('Question overview', 'Tổng quan câu hỏi')} className="space-y-3 border-t border-border pt-4">
            <Heading level={3} size="card">{copy('Question overview', 'Tổng quan câu hỏi')}</Heading>
            <dl className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
              <div className="col-span-2"><dt className="text-xs text-muted-foreground">{copy('Question ID', 'Mã câu hỏi')}</dt><dd><QuestionId code={detailQ.code} compact vi={vi} /></dd></div>
              <div><dt className="mb-1 text-xs text-muted-foreground">{detailV.id === current(detailQ).id ? copy('Current version', 'Phiên bản hiện tại') : copy('Historical version', 'Phiên bản lịch sử')}</dt><dd className="font-medium">v{detailV.number}</dd></div>

              <div><dt className="mb-1 text-xs text-muted-foreground">{copy('Status', 'Trạng thái')}</dt><dd>{detailQ.retired ? <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground font-bold">RETIRED</Badge> : detailV.state === 'PUBLISHED' ? <Badge variant="success">PUBLISHED</Badge> : detailV.state === 'SUBMITTED' ? <Badge variant="primary" className="bg-sky-500/10 text-sky-600 border-sky-500/20 font-bold dark:text-sky-400">SUBMITTED</Badge> : <Badge variant="warning">DRAFT</Badge>}</dd></div>

              <div><dt className="mb-1 text-xs text-muted-foreground">MicroSkill</dt><dd className="break-words font-medium">{detailV.content.skillName || session?.skills.find(skill => skill.id === detailV.content.skillId)?.name || copy('Skill unavailable', 'Chưa có tên kỹ năng')}</dd></div>
              <div><dt className="mb-1 text-xs text-muted-foreground">{copy('Knowledge level', 'Mức kiến thức')}</dt><dd className="break-words font-medium">{knowledgeLevel(detailV.content.knowledgeLevel)}</dd></div>
            </dl>
          </section>
          <section aria-label={copy('Responsibility', 'Phân công phụ trách')} className="space-y-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><Heading level={3} size="card">{copy('Responsibility', 'Phân công phụ trách')}</Heading>{manager && <Button variant="outline" size="sm" disabled={busy} onClick={() => ask(detailQ, 'ASSIGN')}>{detailQ.owner ? copy('Reassign Expert', 'Đổi Expert phụ trách') : copy('Assign Expert', 'Phân công Expert')}</Button>}</div>
            <div className="rounded-lg border border-border bg-muted/20 p-3"><Text variant="caption" className="mb-2 text-muted-foreground">{copy('Responsible Expert', 'Expert phụ trách')}</Text><ResponsibleExpert owner={detailQ.owner} session={session} vi={vi} compact />{detailQ.owner && !session?.experts.some(expert => expert.id === detailQ.owner) && <Text variant="caption" className="mt-1 text-muted-foreground">{copy('Current Expert role is unavailable.', 'Chưa có thông tin vai trò Expert hiện tại.')}</Text>}{!detailQ.owner && <Text variant="caption" className="mt-2 text-muted-foreground">{copy('An L&D Manager can assign an eligible Expert.', 'L&D Manager có thể phân công một Expert đủ điều kiện.')}</Text>}<Text variant="caption" className="mt-3 border-t border-border pt-2 text-muted-foreground">{copy('Latest recorded assignment change', 'Thay đổi phân công được ghi nhận gần nhất')}: {date(latestAssignment(bank?.history ?? [], detailQ.id))}</Text></div>
          </section>
          <section aria-label={copy('Assessment configuration', 'Cấu hình đánh giá')} className="space-y-3 border-t border-border pt-4"><Heading level={3} size="card">{copy('Assessment configuration', 'Cấu hình đánh giá')}</Heading><dl className="space-y-3 text-sm"><div><dt className="text-xs text-muted-foreground">{copy('Mandatory in Skill Assessment', 'Bắt buộc trong Skill Assessment')}</dt><dd className="mt-1 font-medium">{detailV.content.mandatory ? copy('Yes', 'Có') : copy('No', 'Không')}</dd><dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy('The matching Skill Assessment policy determines how mandatory questions are included.', 'Chính sách Skill Assessment tương ứng quy định cách sử dụng câu hỏi bắt buộc.')}</dd></div><div><dt className="text-xs text-muted-foreground">{copy('Baseline behavior', 'Cách sử dụng trong Baseline')}</dt><dd className="mt-1 leading-relaxed">{copy('Baseline uses its own selection policy. This mandatory setting does not apply to Baseline.', 'Baseline sử dụng chính sách chọn câu hỏi riêng. Thiết lập bắt buộc này không áp dụng cho Baseline.')}</dd></div></dl></section>
          {detailV.publicationSource === 'DEVELOPMENT_SEED' && <Badge variant="outline">{copy('Development seed · no human review asserted', 'Seed dev · không ghi nhận người dùng đã duyệt')}</Badge>}
          {detailV.reason && <div className="rounded-lg bg-muted/40 p-3"><Text variant="caption" className="mb-1 font-medium text-muted-foreground">{copy('Version note', 'Ghi chú phiên bản')}</Text><Text variant="body-sm" className="whitespace-pre-wrap break-words">{detailV.reason}</Text></div>}
        </TabsContent><TabsContent value="history" className="question-history space-y-4">
            <section aria-label={copy('Version information', 'Thông tin phiên bản')} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><Heading level={3} size="card">{copy('Version information', 'Thông tin phiên bản')}</Heading><QuestionId code={detailQ.code} compact vi={vi} /></div>

              <div className="flex flex-wrap items-end gap-2"><div className="w-48"><FormField label={copy('Version', 'Phiên bản')}><Select size="sm" aria-label={copy('Version', 'Phiên bản')} value={detailV.id} onChange={value => { setVersionId(value); setError('') }} options={detailQ.versions.map(v => ({ value: v.id, label: `v${v.number}${v.id === current(detailQ).id ? copy(' · Latest', ' · Mới nhất') : copy(' · Historical', ' · Lịch sử')}` }))} /></FormField></div><div className="flex h-8 items-center">{detailV.state === 'PUBLISHED' ? <Badge variant="success">PUBLISHED</Badge> : detailV.state === 'SUBMITTED' ? <Badge variant="primary" className="bg-sky-500/10 text-sky-600 border-sky-500/20 font-bold dark:text-sky-400">SUBMITTED</Badge> : <Badge variant="warning">DRAFT</Badge>}</div></div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3 text-sm">{[
                [copy('Creator', 'Người tạo'), detailQ.createdBy, detailQ.createdAt],
                [copy('Last Editor', 'Người sửa gần nhất'), detailV.editedBy, detailV.editedAt],
                [copy('Submitter', 'Người gửi duyệt'), detailV.submittedBy, detailV.submittedAt],
                [copy('Reviewer', 'Người duyệt'), detailV.reviewedBy, detailV.reviewedAt],
              ].map(([label, actor, at]) => <div key={label}><dt className="mb-1 text-xs text-muted-foreground">{label}</dt><dd className={`break-words ${actor ? 'font-medium' : 'text-muted-foreground'}`}>{actor ? person(actor) : '—'}{at && <span className="mt-1 block text-xs font-normal text-muted-foreground">{date(at)}</span>}</dd></div>)}</dl>
            </section>
            <section aria-label={copy('Activity timeline', 'Dòng thời gian hoạt động')} className="space-y-3 border-t border-border pt-3"><Heading level={3} size="card"><History className="mr-1 inline size-4" aria-hidden="true" />{copy('Activity history', 'Lịch sử hoạt động')}</Heading>
              <ol aria-label={copy('Activity history', 'Lịch sử hoạt động')} className="ml-3 border-l border-border pl-5">{bank?.history.filter(item => item.question === detailQ.id).sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).map(item => <li key={item.id} className="relative pb-4 last:pb-0"><HistoryEntry item={item} vi={vi} actorName={person(item.actor)} at={date(item.at)} versionNumber={detailQ.versions.find(version => version.id === item.version)?.number} /></li>)}</ol>
              {!bank?.history.some(item => item.question === detailQ.id) && <Text variant="caption" className="rounded-lg bg-muted/30 p-3 text-muted-foreground">{copy('No activity was recorded for this question. Earlier changes may not be available for legacy items.', 'Chưa ghi nhận hoạt động của câu hỏi này. Dữ liệu cũ có thể không có lịch sử thay đổi trước đây.')}</Text>}
            </section>
          </TabsContent>        {busy && <Text role="status" variant="caption" className="mt-3 text-muted-foreground">{copy('Updating question…', 'Đang cập nhật câu hỏi…')}</Text>}{error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{questionBankMessage(error, vi)}</div>}
        </DialogBody></Tabs>
        <DialogFooter className="mt-3 flex-col sm:flex-row"><div className="flex flex-1 flex-wrap items-center gap-2 [&_button]:h-9 [&_button]:text-xs">{detailV.id !== current(detailQ).id && <Text variant="caption" className="w-full text-muted-foreground">{copy('Actions apply to the latest question version.', 'Các thao tác áp dụng cho phiên bản câu hỏi mới nhất.')}</Text>}
          {manager && detailV.id === current(detailQ).id && detailV.state === 'SUBMITTED' && <div className="flex flex-wrap gap-2">{detailTab === 'content' && <Button variant="outline" disabled={busy || detailV.viewed[session!.actor.id] === detailV.id} onClick={() => void run(() => command(detailQ, 'VIEW'))}>{copy('Mark this version reviewed', 'Xác nhận đã xem phiên bản')}</Button>}{!detailQ.retired && !!detailQ.owner && <Button disabled={busy || detailV.viewed[session!.actor.id] !== detailV.id} onClick={() => ask(detailQ, 'APPROVE')}>{copy('Approve & publish', 'Duyệt và xuất bản')}</Button>}{!detailQ.retired && !!detailQ.owner && pendingQuestions.some(q => q.id !== detailQ.id) && <Button variant="secondary" disabled={busy} onClick={() => void run(async () => { const next = pendingQuestions.find(q => q.id !== detailQ.id) ?? null; const updated = await bankRequest<BankView>('/approve', { questions: [{ id: detailQ.id, expectedRevision: detailQ.revision, action: 'APPROVE' }], markReviewed: true }); setBank(updated); if (next) { setDetail(next.id); setVersionId(current(next).id) } else { setDetail(null) } setMessage(copy('Approved and moved to next question.', 'Đã duyệt và chuyển sang câu tiếp theo.')) })}>{copy('Approve & next', 'Duyệt & câu tiếp')}</Button>}<Button variant="outline" disabled={busy} onClick={() => ask(detailQ, 'RETURN')}>{copy('Return with reason', 'Trả lại kèm lý do')}</Button></div>}
          {manager && detailQ.request && <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => ask(detailQ, 'CONFIRM_AVAILABILITY')}>{copy('Confirm availability request', 'Xác nhận yêu cầu sử dụng')}</Button><Button variant="outline" disabled={busy} onClick={() => ask(detailQ, 'REJECT_AVAILABILITY')}>{copy('Return availability request', 'Trả lại yêu cầu sử dụng')}</Button></div>}
          {actions(detailQ, false, false, true)}</div><Button variant="outline" size="sm" className="h-9" disabled={busy} onClick={() => setDetail(null)}>{copy('Close', 'Đóng')}</Button></DialogFooter></>}
    </Dialog>
    <Dialog ariaLabel={action?.name === 'ASSIGN' ? copy('Assign responsible Expert', 'Phân công Expert phụ trách') : copy('Confirm question action', 'Xác nhận thao tác câu hỏi')} open={!!action} onOpenChange={open => { if (!open && !busy) setAction(null) }} className="max-w-lg" closeLabel={copy('Close', 'Đóng')}>
      {action && <><DialogHeader><DialogTitle className="text-[length:var(--text-card)] font-semibold">{action.name === 'ASSIGN' ? copy('Assign responsible Expert', 'Phân công Expert phụ trách') : copy('Confirm question action', 'Xác nhận thao tác câu hỏi')}</DialogTitle><QuestionId code={action.q.code} vi={vi} /><DialogDescription>{actionNeedsReason ? copy('Provide a reason. The current version and permissions will be checked again.', 'Nhập lý do. Hệ thống sẽ kiểm tra lại phiên bản và quyền thực hiện.') : action.name === 'APPROVE' ? copy('Publish this reviewed version? It will become available for assessment selection.', 'Xuất bản phiên bản đã xem này? Phiên bản sẽ có thể được chọn cho bài đánh giá.') : copy('Send this draft to L&D for review? Its content will be validated before submission.', 'Gửi bản nháp này cho L&D duyệt? Nội dung sẽ được kiểm tra trước khi gửi.')}</DialogDescription></DialogHeader><DialogBody className="focus-visible:outline-muted-foreground space-y-4 py-4">{action.name === 'ASSIGN' ? <AssignmentFields currentOwner={action.q.owner} selectedOwner={action.owner} reason={action.reason} session={session} busy={busy} vi={vi} onOwner={owner => setAction({ ...action, owner })} onReason={reason => setAction({ ...action, reason })} /> : actionNeedsReason ? <label className="block text-sm">{copy('Reason', 'Lý do')}<textarea className={fieldClass} maxLength={2000} value={action.reason} onChange={e => setAction({ ...action, reason: e.target.value })} /></label> : <Text variant="body-sm" tone="foreground" className="whitespace-pre-wrap break-words rounded-lg bg-muted/30 p-3">{current(action.q).content.prompt}</Text>}{error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{questionBankMessage(error, vi)}</div>}</DialogBody><DialogFooter><Button variant="outline" disabled={busy} onClick={() => setAction(null)}>{copy('Cancel', 'Huỷ')}</Button><Button disabled={busy || actionNeedsReason && !action.reason.trim() || action.name === 'ASSIGN' && !session?.experts.some(expert => expert.id === action.owner)} onClick={() => void run(async () => { await command(action.q, action.name, action.reason, action.name === 'ASSIGN' ? action.owner || null : null); setAction(null) })}>{action.name === 'ASSIGN' ? copy('Confirm assignment', 'Xác nhận phân công') : action.name === 'APPROVE' ? copy('Confirm approval', 'Xác nhận phê duyệt') : action.name === 'SUBMIT' ? copy('Confirm submission', 'Xác nhận gửi duyệt') : copy('Confirm', 'Xác nhận')}</Button></DialogFooter></>}
    </Dialog>
    {importOpen && importStep === 1 && preview && reviewQuestionIndex !== null && <ImportedQuestionsPreview key={preview.id + ':' + reviewQuestionIndex} reviewRows={preview.rows} initialIndex={reviewQuestionIndex} onClose={() => setReviewQuestionIndex(null)} />}
    {importedQuestions !== null && <ImportedQuestionsPreview questions={importedQuestions} onClose={() => setImportedQuestions(null)} />}
    <Dialog open={importOpen} onOpenChange={open => { if (!busy) setImportOpen(open) }} className="max-w-3xl" closeLabel={copy('Close', 'Đóng')}>
      {(() => {
        const matchingMap = preview?.matching ?? {}
        const duplicateCodes = new Set(Object.entries(matchingMap).filter(([, matches]) => Array.isArray(matches) && matches.length > 0).map(([code]) => code))
        const newPreviewRows = (preview?.rows ?? []).filter(r => !duplicateCodes.has(r.code ?? ''))
        const duplicatePreviewRows = (preview?.rows ?? []).filter(r => duplicateCodes.has(r.code ?? ''))
        const internalDupErrors = (preview?.errors ?? []).filter(e => e.includes('duplicate question in this file') || e.includes('trùng câu hỏi trong cùng file'))
        const invalidPreviewErrors = (preview?.errors ?? []).filter(e => !e.includes('duplicate question in this file') && !e.includes('trùng câu hỏi trong cùng file'))
        const nonDuplicateWarnings = (preview?.warnings ?? []).filter(w => !w.includes('matching content exists'))
        const canContinue = Boolean(preview && preview.errors.length === 0 && newPreviewRows.length > 0 && (nonDuplicateWarnings.length === 0 || ackWarnings))
        return <>
          <DialogHeader><DialogTitle className="text-[length:var(--text-card)] font-semibold">{copy('Import questions', 'Nhập câu hỏi')}</DialogTitle><DialogDescription>{copy(`Excel (.xlsx) · ${(session?.maxImportBytes ?? 10485760) / 1048576} MB · ${session?.maxImportRows ?? 500} rows. Import creates drafts only.`, `Excel (.xlsx) · ${(session?.maxImportBytes ?? 10485760) / 1048576} MB · ${session?.maxImportRows ?? 500} dòng. Chỉ tạo bản nháp.`)}</DialogDescription></DialogHeader><div className="mb-4 shrink-0"><LinearStepper steps={[copy('Choose File', 'Chọn file'), copy('Review', 'Kiểm tra'), copy('Confirm', 'Xác nhận')]} currentStep={importStep} ariaLabel={copy('Import progress', 'Tiến trình nhập')} completedLabel={copy('Completed', 'Hoàn tất')} /></div><DialogBody className="focus-visible:outline-muted-foreground space-y-5 py-4">{busy && <Text role="status" className="text-muted-foreground">{copy('Processing your file…', 'Đang xử lý file…')}</Text>}{importStep === 0 && <section className="space-y-4"><QuestionImportUpload busy={busy} file={importFile} maxBytes={session?.maxImportBytes ?? 10485760} maxRows={session?.maxImportRows ?? 500} onUpload={upload} onTemplate={template} copy={copy} /><Text variant="body-sm">{copy('Download the bilingual Excel template (Vietnamese or English) with built-in instructions and the Skill catalog. Use Skill Code in the Questions sheet; question codes are generated automatically.', 'Tải mẫu Excel có hướng dẫn (Tiếng Việt hoặc Tiếng Anh) kèm danh mục Mã Skill. Điền Mã Skill vào sheet Questions; mã câu hỏi được hệ thống tự sinh.')}</Text><Accordion><AccordionItem value="import-skills"><AccordionTrigger>{copy('MicroSkill reference for import', 'Danh sách MicroSkill để nhập file')}</AccordionTrigger><AccordionContent><div className="max-h-52 overflow-auto space-y-2">{session?.skills.map(s => <Text key={s.id} variant="body-sm" className="break-words">{s.name} · <code>{s.code || s.id}</code></Text>)}</div></AccordionContent></AccordionItem></Accordion>
          </section>}{importStep > 0 && preview && <><div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2"><Heading level={3}>{importStep === 1 ? copy('Review your questions', 'Kiểm tra câu hỏi') : copy('Ready to create drafts', 'Sẵn sàng tạo bản nháp')}</Heading><Text variant="body-sm" className="break-words">{importFile?.name}</Text>{importStep === 2 && <Text variant="body-sm">{copy(`Confirm to add ${newPreviewRows.length} new questions${duplicatePreviewRows.length ? ` (${duplicatePreviewRows.length} existing skipped)` : ''}.`, `Xác nhận nhập ${newPreviewRows.length} câu hỏi mới${duplicatePreviewRows.length ? ` (bỏ qua ${duplicatePreviewRows.length} câu đã tồn tại)` : ''}.`)}</Text>}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-lg bg-muted/30 p-3 text-xs">
              <div className="rounded-md bg-card p-2 border border-border"><p className="text-muted-foreground">{copy('New (will import)', 'Mới (sẽ nhập)')}</p><p className="mt-1 text-sm font-semibold text-success">{newPreviewRows.length}</p></div>
              <div className="rounded-md bg-card p-2 border border-border"><p className="text-muted-foreground">{copy('Existing (skipped)', 'Trùng hệ thống (bỏ qua)')}</p><p className="mt-1 text-sm font-semibold text-warning">{duplicatePreviewRows.length}</p></div>
              <div className="rounded-md bg-card p-2 border border-border"><p className="text-muted-foreground">{copy('In-file duplicates', 'Trùng trong file')}</p><p className="mt-1 text-sm font-semibold text-destructive">{internalDupErrors.length}</p></div>
              <div className="rounded-md bg-card p-2 border border-border"><p className="text-muted-foreground">{copy('Invalid', 'Không hợp lệ')}</p><p className="mt-1 text-sm font-semibold text-destructive">{invalidPreviewErrors.length}</p></div>
            </div>
            <Text variant="caption" className="text-muted-foreground">{copy('Preview expires', 'Bản kiểm tra hết hạn')}: {date(preview.expiresAt)}</Text>{preview.errors.length > 0 && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2"><Heading level={3}>{copy('Resolve errors before continuing', 'Sửa lỗi trước khi tiếp tục')}</Heading>{preview.errors.map((e, i) => <Text key={i} role="alert" className="text-destructive">{questionBankMessage(importIssueLocation(e, sourceRows, !!importFile?.name.toLowerCase().endsWith('.xlsx'), copy), vi)}</Text>)}</div>}{preview.errors.length === 0 && newPreviewRows.length === 0 && <Text role="alert" className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-warning">{copy('No new questions to import. Every question in this file already exists.', 'Không có câu hỏi mới nào để nhập. Tất cả câu hỏi trong file đã tồn tại.')}</Text>}{nonDuplicateWarnings.length > 0 && <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 space-y-2"><Heading level={3}>{copy('Warnings to review', 'Cảnh báo cần kiểm tra')}</Heading>{nonDuplicateWarnings.map((w, i) => <Text key={i} className="text-warning">{questionBankMessage(w, vi)}</Text>)}</div>}<div className="max-h-64 overflow-auto rounded-lg border border-border p-3 space-y-2">{preview.rows.map((row, index) => { const dupMatches = matchingMap[row.code ?? ''] ?? []; const isDup = dupMatches.length > 0; return <div key={row.code ?? index} className="space-y-2 border-b border-border py-3 last:border-b-0"><div className="flex flex-wrap items-center justify-between gap-2">{row.code ? <QuestionId code={row.code} vi={vi} /> : <Text variant="caption" className="text-muted-foreground">–</Text>}<Badge variant={isDup ? 'warning' : 'success'}>{isDup ? `${copy('Duplicate · Skipped', 'Trùng hệ thống · Bỏ qua')} (${dupMatches.join(', ')})` : copy('New', 'Mới')}</Badge></div><Text variant="caption" className="text-muted-foreground">{session?.skills.find(skill => skill.id === row.content.skillId)?.name || row.content.skillId} · {knowledgeLevel(row.content.knowledgeLevel)}</Text><Text className="whitespace-pre-wrap break-words" variant="body-sm">{row.content.prompt}</Text>{importStep === 1 && <Button size="sm" variant="outline" disabled={busy} onClick={() => setReviewQuestionIndex(index)}>{copy('View as test taker', 'Xem như người làm bài')}</Button>}</div> })}</div>{nonDuplicateWarnings.length > 0 && <label className="flex gap-2 rounded-lg border border-border p-3"><input type="checkbox" checked={ackWarnings} disabled={busy} onChange={e => setAckWarnings(e.target.checked)} />{copy('I reviewed and accept the warnings.', 'Tôi đã xem và xác nhận các cảnh báo.')}</label>}</>}
            {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{questionBankMessage(importIssueLocation(error, sourceRows, !!importFile?.name.toLowerCase().endsWith('.xlsx'), copy), vi)}</div>}
          </DialogBody><DialogFooter><Button variant="outline" disabled={busy} onClick={() => setImportOpen(false)}>{copy('Cancel', 'Huỷ')}</Button>{importStep > 0 && <Button variant="outline" disabled={busy} onClick={() => setImportStep(importStep - 1)}>{copy('Back', 'Quay lại')}</Button>}{importStep === 1 && <Button disabled={busy || !canContinue} onClick={() => { setReviewQuestionIndex(null); setImportStep(2) }}>{copy('Continue to confirmation', 'Tiếp tục xác nhận')}</Button>}{importStep === 2 && <><Button variant="outline" disabled={busy || !canContinue} onClick={() => void run(async () => { if (!preview) return; const result = await bankRequest<BankView>('/imports/confirm', { batch: preview.id, acknowledgeWarnings: ackWarnings, submitForReview: false, skipDuplicates: true }); const codes = new Set(newPreviewRows.map(row => row.code)); setBank(result); setImportedQuestions(result.questions.filter(question => codes.has(question.code))); setPreview(null); setImportOpen(false); setMessage(copy('Import completed. Questions are saved as drafts.', 'Đã nhập câu hỏi dưới dạng bản nháp.')) })}>{busy ? copy('Processing…', 'Đang xử lý…') : copy('Confirm import', 'Xác nhận nhập')}</Button><Button disabled={busy || !canContinue} onClick={() => void run(async () => { if (!preview) return; const result = await bankRequest<BankView>('/imports/confirm', { batch: preview.id, acknowledgeWarnings: ackWarnings, submitForReview: true, skipDuplicates: true }); const codes = new Set(newPreviewRows.map(row => row.code)); setBank(result); setImportedQuestions(result.questions.filter(question => codes.has(question.code))); setPreview(null); setImportOpen(false); setMessage(copy('Import completed and submitted for review.', 'Đã nhập và gửi duyệt câu hỏi.')) })}>{busy ? copy('Processing…', 'Đang xử lý…') : copy('Confirm & submit for review', 'Xác nhận & gửi duyệt')}</Button></>}</DialogFooter>
        </>
      })()}
    </Dialog>
    <Dialog ariaLabel={copy('Unable to approve selected questions', 'Chưa thể duyệt các câu đã chọn')} open={approvalFeedback !== null} onOpenChange={open => { if (!open) setApprovalFeedback(null) }} className="max-w-2xl" closeLabel={copy('Close', 'Đóng')}>
      <DialogHeader><DialogTitle className="text-[length:var(--text-card)] font-semibold">{copy('Unable to approve selected questions', 'Chưa thể duyệt các câu đã chọn')}</DialogTitle><DialogDescription>{approvalFeedback?.serverError ? copy('Approval could not be confirmed. Read the reason below and reload the latest data before retrying.', 'Chưa xác nhận được kết quả duyệt. Xem lý do bên dưới và tải lại dữ liệu mới nhất trước khi thử lại.') : copy('No questions were approved. Resolve the items below, then try again.', 'Chưa có câu hỏi nào được duyệt. Hãy xử lý các mục bên dưới rồi thử lại.')}</DialogDescription></DialogHeader>
      <DialogBody className="focus-visible:outline-muted-foreground space-y-3 py-4"><div role="alert" className="space-y-3">
        {approvalFeedback?.serverError && <Text className="whitespace-pre-wrap break-words">{questionBankMessage(approvalFeedback.serverError, vi)}</Text>}
        {approvalFeedback?.issues.map(issue => <Card key={issue.id}><CardContent className="space-y-2 p-3"><QuestionId code={issue.code} vi={vi} /><Text>{issue.reason}</Text></CardContent></Card>)}
      </div></DialogBody>
      <DialogFooter><Button variant="outline" onClick={() => setApprovalFeedback(null)}>{copy('Back to list', 'Quay lại danh sách')}</Button>{approvalFeedback?.issues.some(issue => questions.some(q => q.id === issue.id)) && <Button onClick={() => { const q = questions.find(q => q.id === approvalFeedback.issues[0].id); setApprovalFeedback(null); if (q) openDetail(q) }}>{copy('Open first question', 'Mở câu hỏi đầu tiên')}</Button>}{approvalFeedback?.serverError && <Button onClick={() => { setApprovalFeedback(null); refresh() }}>{copy('Reload latest data', 'Tải lại dữ liệu mới nhất')}</Button>}</DialogFooter>
    </Dialog>
    <Dialog open={batchReviewOpen} onOpenChange={open => { if (!open && !busy) setBatchReviewOpen(false) }} size="wide" className="w-[96vw] max-w-5xl max-h-[90dvh]" closeLabel={copy('Close', 'Đóng')}>
      {(() => {
        const batchFiltered = pendingQuestions.filter(q => {
          const v = current(q)
          if (batchSkillFilter !== 'all' && v.content.skillId !== batchSkillFilter) return false
          if (batchOwnerFilter !== 'all' && q.owner !== batchOwnerFilter) return false
          if (batchLevelFilter !== 'all' && (v.content.knowledgeLevel ?? 'UNCLASSIFIED') !== batchLevelFilter) return false
          return true
        })
        const batchPageSize = 25
        const batchTotalPages = Math.max(1, Math.ceil(batchFiltered.length / batchPageSize))
        const activeBatchPage = Math.min(batchPage, batchTotalPages)
        const batchVisible = batchFiltered.slice((activeBatchPage - 1) * batchPageSize, activeBatchPage * batchPageSize)
        const selectedVisible = batchFiltered.filter(q => batchReviewIds.includes(q.id))
        const batchOwners = Array.from(new Set(pendingQuestions.map(q => q.owner).filter(Boolean))) as string[]
        const batchSkills = Array.from(new Set(pendingQuestions.map(q => current(q).content.skillId).filter(Boolean)))
        return <>
          <DialogHeader>
            <DialogTitle className="text-[length:var(--text-card)] font-semibold">{copy('Batch review & approve', 'Rà soát & duyệt hàng loạt')}</DialogTitle>
            <DialogDescription>{copy('Filter by skill, expert, or level, review items in compact or full view, then approve the selected questions in one step.', 'Lọc theo kỹ năng, chuyên gia hoặc mức độ, xem nhanh dạng rút gọn hoặc chi tiết rồi phê duyệt hàng loạt trong một bước.')}</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3 py-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <select aria-label={copy('Filter batch by skill', 'Lọc lô theo kỹ năng')} className="h-8 rounded-md border border-border bg-card px-2 text-xs" value={batchSkillFilter} disabled={busy} onChange={e => { setBatchSkillFilter(e.target.value); setBatchPage(1) }}>
                <option value="all">{copy('All skills', 'Tất cả kỹ năng')}</option>
                {batchSkills.map(id => <option key={id} value={id}>{session?.skills.find(s => s.id === id)?.name ?? id}</option>)}
              </select>
              <select aria-label={copy('Filter batch by expert', 'Lọc lô theo chuyên gia')} className="h-8 rounded-md border border-border bg-card px-2 text-xs" value={batchOwnerFilter} disabled={busy} onChange={e => { setBatchOwnerFilter(e.target.value); setBatchPage(1) }}>
                <option value="all">{copy('All Experts', 'Tất cả Expert')}</option>
                {batchOwners.map(id => <option key={id} value={id}>{person(id)}</option>)}
              </select>
              <select aria-label={copy('Filter batch by knowledge level', 'Lọc lô theo mức kiến thức')} className="h-8 rounded-md border border-border bg-card px-2 text-xs" value={batchLevelFilter} disabled={busy} onChange={e => { setBatchLevelFilter(e.target.value); setBatchPage(1) }}>
                <option value="all">{copy('All levels', 'Tất cả mức độ')}</option>
                {['FOUNDATION', 'INTERMEDIATE', 'ADVANCED', 'UNCLASSIFIED'].map(lvl => <option key={lvl} value={lvl}>{knowledgeLevel(lvl === 'UNCLASSIFIED' ? null : lvl)}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
              <span>{copy(`${selectedVisible.length} of ${batchFiltered.length} shown selected (${pendingQuestions.length} total pending)`, `Đã chọn ${selectedVisible.length}/${batchFiltered.length} đang lọc (tổng ${pendingQuestions.length} chờ duyệt)`)}</span>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setBatchCompactView(v => !v)}>{batchCompactView ? copy('Full preview', 'Xem đầy đủ') : copy('Compact list', 'Danh sách rút gọn')}</Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setBatchReviewIds(prev => Array.from(new Set([...prev, ...batchFiltered.map(q => q.id)])))}>{copy('Select filtered', 'Chọn tất cả đang lọc')}</Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => setBatchReviewIds(prev => prev.filter(id => !batchFiltered.some(q => q.id === id)))}>{copy('Clear filtered', 'Bỏ chọn đang lọc')}</Button>
              </div>
            </div>
            {batchVisible.map(q => {
              const v = current(q)
              const checked = batchReviewIds.includes(q.id)
              const expanded = !batchCompactView || expandedBatchIds.includes(q.id)
              const skillName = v.content.skillName || session?.skills.find(s => s.id === v.content.skillId)?.name || v.content.skillId
              return <Card key={q.id} className={checked ? 'border-primary/40' : 'opacity-70'}>
                <CardContent className="space-y-2 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-sm min-w-0">
                      <input type="checkbox" checked={checked} disabled={busy} onChange={e => setBatchReviewIds(prev => e.target.checked ? [...prev, q.id] : prev.filter(id => id !== q.id))} />
                      <QuestionId code={q.code} compact vi={vi} />
                      {batchCompactView && <span className="truncate text-xs font-normal text-foreground">{v.content.prompt}</span>}
                    </label>
                    <div className="flex items-center gap-2">
                      <Text variant="caption" className="text-muted-foreground">{skillName} · {knowledgeLevel(v.content.knowledgeLevel)} · {person(q.owner)}</Text>
                      {batchCompactView && <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setExpandedBatchIds(prev => prev.includes(q.id) ? prev.filter(id => id !== q.id) : [...prev, q.id])}>{expanded ? copy('Hide', 'Thu gọn') : copy('Preview', 'Xem')}</Button>}
                    </div>
                  </div>
                  {expanded && <QuestionContentPreview content={v.content} vi={vi} variant="details" />}
                </CardContent>
              </Card>
            })}
            {batchTotalPages > 1 && <Pagination currentPage={activeBatchPage} totalPages={batchTotalPages} totalItems={batchFiltered.length} pageSize={batchPageSize} onPageChange={setBatchPage} itemLabel={copy('questions', 'câu hỏi')} locale={vi ? 'vi' : 'en'} />}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setBatchReviewOpen(false)}>{copy('Cancel', 'Huỷ')}</Button>
            <Button disabled={busy || !selectedVisible.length} onClick={() => void run(async () => {
              const chosen = batchFiltered.filter(q => batchReviewIds.includes(q.id))
              if (!chosen.length) return
              const updated = await bankRequest<BankView>('/approve', { questions: chosen.map(q => ({ id: q.id, expectedRevision: q.revision, action: 'APPROVE' })), markReviewed: true })
              setBank(updated)
              setSelected([])
              setBatchReviewOpen(false)
              setMessage(copy(`Approved and published ${chosen.length} questions.`, `Đã duyệt và xuất bản ${chosen.length} câu hỏi.`))
            })}>{busy ? copy('Approving…', 'Đang duyệt…') : `${copy('Confirm reviewed & approve', 'Xác nhận đã rà soát & duyệt')} (${selectedVisible.length})`}</Button>
          </DialogFooter>
        </>
      })()}
    </Dialog>
  </div></WorkspaceLayout>
}

function HistoryEntry({ item, vi, actorName, at, versionNumber }: { item: BankAudit; vi: boolean; actorName: string; at: string; versionNumber?: number }) {
  const copy = (en: string, vn: string) => vi ? vn : en
  const snapshotDescriptionId = useId()
  const events: Record<string, { title: string; description: string }> = {
    CREATED: { title: copy('Question created', 'Tạo câu hỏi'), description: copy('A new question draft was created.', 'Một bản nháp câu hỏi mới đã được tạo.') },
    EDITED: { title: copy('Question edited', 'Chỉnh sửa câu hỏi'), description: copy('The draft question content was updated.', 'Nội dung bản nháp câu hỏi đã được cập nhật.') },
    ASSIGNED: { title: copy('Responsibility updated', 'Cập nhật phân công'), description: copy('A responsible Expert was assigned or reassigned.', 'Expert phụ trách đã được phân công hoặc thay đổi.') },
    SUBMITTED: { title: copy('Submitted for review', 'Gửi duyệt'), description: copy('The draft was sent to L&D for review.', 'Bản nháp đã được gửi cho L&D duyệt.') },
    APPROVED: { title: copy('Approved & published', 'Duyệt và xuất bản'), description: copy('The reviewed version was approved and published.', 'Phiên bản đã xem được phê duyệt và xuất bản.') },
    RETURN: { title: copy('Returned for changes', 'Trả lại để chỉnh sửa'), description: copy('L&D returned the submission to Draft for changes.', 'L&D đã trả câu hỏi về bản nháp để chỉnh sửa.') },
    WITHDRAW: { title: copy('Submission withdrawn', 'Rút yêu cầu duyệt'), description: copy('The responsible Expert withdrew the submission to Draft.', 'Expert phụ trách đã rút yêu cầu duyệt về bản nháp.') },
    SUCCESSOR_CREATED: { title: copy('New version created', 'Tạo phiên bản mới'), description: copy('A successor draft was created from published content.', 'Bản nháp phiên bản kế tiếp được tạo từ nội dung đã xuất bản.') },
    IMPORTED_SUCCESSOR: { title: copy('New version imported', 'Nhập phiên bản mới'), description: copy('A successor draft was imported.', 'Bản nháp phiên bản kế tiếp đã được nhập.') },
    REQUEST_RETIRE: { title: copy('Retirement requested', 'Yêu cầu ngừng dùng'), description: copy('A request was submitted; question availability had not yet changed.', 'Yêu cầu đã được gửi; trạng thái sử dụng câu hỏi chưa thay đổi.') },
    REQUEST_REACTIVATE: { title: copy('Reactivation requested', 'Yêu cầu dùng lại'), description: copy('A request was submitted to make the question available again.', 'Yêu cầu sử dụng lại câu hỏi đã được gửi.') },
    RETIRE_CONFIRMED: { title: copy('Status changed · Retired', 'Đổi trạng thái · Ngừng dùng'), description: copy('The question was retired from future selection.', 'Câu hỏi đã ngừng được chọn cho các bài đánh giá mới.') },
    REACTIVATE_CONFIRMED: { title: copy('Status changed · Reactivated', 'Đổi trạng thái · Dùng lại'), description: copy('The question was made available again; this does not publish a draft.', 'Câu hỏi đã được phép dùng lại; thao tác này không xuất bản bản nháp.') },
    AVAILABILITY_RETURNED: { title: copy('Availability request returned', 'Trả lại yêu cầu sử dụng'), description: copy('L&D returned the request without applying an availability change.', 'L&D đã trả yêu cầu mà không đổi trạng thái sử dụng.') },
  }
  const event = events[item.action] ?? { title: item.action, description: copy('An additional activity was recorded for this question.', 'Một hoạt động khác đã được ghi nhận cho câu hỏi này.') }
  const returned = ['RETURN', 'WITHDRAW', 'AVAILABILITY_RETURNED'].includes(item.action)
  const statusChanged = ['RETIRE_CONFIRMED', 'REACTIVATE_CONFIRMED'].includes(item.action)
  const Icon = item.action === 'ASSIGNED' ? UserCheck : item.action === 'APPROVED' ? CheckCircle2 : item.action === 'EDITED' ? Pencil : item.action === 'SUBMITTED' ? Clock : returned ? CornerUpLeft : statusChanged ? Power : item.action === 'CREATED' || item.action === 'SUCCESSOR_CREATED' ? Plus : History
  const tone = item.action === 'APPROVED' ? 'text-success bg-success/10' : item.action === 'RETURN' ? 'text-destructive bg-destructive/5' : 'text-muted-foreground bg-muted'
  const recipientInfo = copy('This history record does not include the assigned Expert. The current owner is not evidence of the historical recipient.', 'Lịch sử này không có thông tin Expert được phân công. Người phụ trách hiện tại không xác định được người nhận tại thời điểm trước đây.')
  return <div className="space-y-2">
    <span className={`absolute -left-[31px] top-0 flex size-5 items-center justify-center rounded-full ring-4 ring-card ${tone}`}><Icon className="size-3" aria-hidden="true" /></span>
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1"><Text variant="body-sm" tone="foreground" className="font-semibold">{event.title}</Text><time dateTime={Number.isFinite(Date.parse(item.at)) ? item.at : undefined} className="shrink-0 text-xs text-muted-foreground">{at === '–' ? '—' : at}</time></div>
    <Text variant="caption">{event.description}</Text>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
      <div><dt className="text-muted-foreground">{copy('Performed by', 'Người thực hiện')}</dt><dd className="mt-0.5 break-words text-sm font-medium text-foreground">{actorName === '–' ? '—' : actorName}</dd></div>
      <div><dt className="text-muted-foreground">{copy('Affected', 'Đối tượng tác động')}</dt><dd className="mt-0.5 text-sm text-foreground">{copy('This question', 'Câu hỏi này')}{versionNumber != null ? ` · v${versionNumber}` : ''}</dd></div>
      {item.action === 'ASSIGNED' && <div className="col-span-2"><dt className="text-muted-foreground">{copy('Assigned Expert', 'Expert được phân công')}</dt><dd className="mt-0.5 text-muted-foreground"><span title={recipientInfo}>—</span><span className="ml-2">{copy('Historical recipient unavailable', 'Chưa có thông tin người nhận trong lịch sử')}</span></dd></div>}
    </dl>
    {item.reason && <div className="border-l-2 border-border pl-3"><Text variant="caption" className="mb-1 font-medium">{copy('Note / reason', 'Ghi chú / lý do')}</Text><Text variant="caption" tone="foreground" className="whitespace-pre-wrap break-words">{item.reason}</Text></div>}
    {item.snapshot && <Accordion><AccordionItem value={item.id} className="px-3"><AccordionTrigger aria-label={copy('View question snapshot', 'Xem bản chụp câu hỏi')} aria-describedby={snapshotDescriptionId} className="rounded-sm py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><span className="block">{copy('View question snapshot', 'Xem bản chụp câu hỏi')}</span><span id={snapshotDescriptionId} className="mt-0.5 block text-xs font-normal text-muted-foreground">{copy('Exact question content saved with this event.', 'Nội dung câu hỏi chính xác được lưu cùng sự kiện này.')}</span></AccordionTrigger><AccordionContent className="border-t border-border pt-3"><QuestionContentPreview content={item.snapshot} vi={vi} variant="details" /></AccordionContent></AccordionItem></Accordion>}</div>
}
