import { useContext, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, RefreshCw, SlidersHorizontal, History, Eye, Pencil, Briefcase, CheckCircle2, Edit3 } from 'lucide-react'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { Button } from '../../../shared/components/ui/Button'
import { Badge } from '../../../shared/components/ui/Badge'
import { Card, CardContent, CardHeader } from '../../../shared/components/ui/Card'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { Input } from '../../../shared/components/ui/Input'
import { Combobox } from '../../../shared/components/ui/Combobox'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { Tabs, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody } from '../../../shared/components/ui/Dialog'
import { ManagementDialog as Dialog } from '../../../shared/components/ui/ManagementUi'
import { SharedSkillAssessmentPage } from './SharedSkillAssessmentPage'
import { AdaptiveBaselineApiError } from './adaptiveBaselineApi'
import { type AssessmentPurpose } from './assessmentRulePolicyApi'
import { getPolicyDirectory, getPolicyWorkspace, runScopedCommand, type PolicyDirectory, type PolicyWorkspace, type ScopedCommand, type ScopedVersion } from './scopedAssessmentPolicyApi'
import { BaselinePolicyDialog } from './BaselinePolicyDialog'
import { AssessmentBankIssues } from '../../../shared/components/AssessmentBankIssues'
import { SkillPolicyWizard as RulePolicyForm } from './SkillPolicyWizard'
import { useToast } from '../../../shared/hooks/useToast'
import { BulkSkillPolicyDialog } from './BulkSkillPolicyDialog'

type Loaded<T> = { key: string; value?: T; error?: unknown }
const pageNumber = (value: string | null) => value && /^\d{1,6}$/.test(value) ? Number(value) : 0

export function SkillAssessmentConfigurationPage() {
  return <SharedSkillAssessmentPage />
}
export function AssessmentConfigurationWorkspace({ purpose }: { purpose: AssessmentPurpose }) {
  const session = useContext(WorkspaceSessionContext), { t } = useTranslation()
  const key = `${session?.identity.organizationId}:${session?.identity.accountId}:${session?.identity.roles?.join(',')}:${purpose}`
  return <div className="min-w-0 space-y-5 pb-8"><Heading level={1} className="sr-only">{t(purpose === 'BASELINE' ? 'scopedPolicy.baselineTitle' : 'scopedPolicy.skillTitle')}</Heading>
    <ScopeDirectory key={key} purpose={purpose} />
  </div>
}
function ConfigError({ error }: { error: unknown }) {
  const { t } = useTranslation()
  const code = error instanceof AdaptiveBaselineApiError
    ? error.code === 'REQUEST_FAILED' && error.status === 401 ? 'HTTP_UNAUTHORIZED' : error.code
    : 'GENERIC'
  return <div role="alert" className="space-y-2"><Text tone="destructive">{t(`scopedPolicy.errors.${code}`, t('scopedPolicy.errors.GENERIC'))}</Text><AssessmentBankIssues issues={error instanceof AdaptiveBaselineApiError ? error.bankIssues : undefined} /></div>
}
function ScopeDirectory({ purpose }: { purpose: AssessmentPurpose }) {
  const [bulk, setBulk] = useState(false)
  const { t, language } = useTranslation(), [params, setParams] = useSearchParams(), [reload, setReload] = useState(0)
  const { toast } = useToast(), listRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState<Loaded<PolicyDirectory> & { archived?: boolean }>({ key: '' })
  const [selectedScope, setSelectedScope] = useState<string | null>(() => params.get('scope'))
  const [initialAction, setInitialAction] = useState<'configure' | 'edit' | 'view'>('view')
  const [notice, setNotice] = useState(false)
  const search = params.get('search') ?? '', owner = params.get('owner') ?? '', level = purpose === 'BASELINE' && params.get('status') !== 'HISTORY' ? '' : params.get('level') ?? '', status = params.get('status') ?? '', page = pageNumber(params.get('page'))
  const archived = status === 'HISTORY', activeTab = purpose === 'BASELINE' && status === 'ACTIVE'
  const showLevel = purpose === 'SKILL_ASSESSMENT' || archived
  const [searchDraft, setSearchDraft] = useState({ query: search, value: search })
  const searchInput = searchDraft.query === search ? searchDraft.value : search
  const query = new URLSearchParams({ search, owner, level, status: purpose === 'BASELINE' && !status ? 'WORKLIST' : status, page: String(page), size: '10' }), queryString = query.toString(), key = `${queryString}:${reload}`
  const current = loaded.key === key ? loaded : undefined, data = current?.value
  useEffect(() => {
    if (searchInput === search) return
    const timer = window.setTimeout(() => setParams(previous => {
      const next = new URLSearchParams(previous); next.delete('page')
      if (searchInput) next.set('search', searchInput); else next.delete('search')
      return next
    }, { replace: true }), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput, search, setParams])
  useEffect(() => {
    const controller = new AbortController()
    void getPolicyDirectory(purpose, new URLSearchParams(queryString), controller.signal)
      .then(value => {
        if (controller.signal.aborted) return
        if (value.total > 0 && page * 10 >= value.total) {
          setParams(previous => { const next = new URLSearchParams(previous); next.set('page', String(Math.floor((value.total - 1) / 10))); return next }, { replace: true })
          return
        }
        setLoaded({ key, value, archived })
      })
      .catch(error => { if (!controller.signal.aborted) setLoaded({ key, error, archived }) })
    return () => controller.abort()
  }, [purpose, queryString, key, page, setParams, archived])
  function filter(patch: Record<string, string>) {
    const next = new URLSearchParams(params)
    Object.entries({ ...patch, page: '0' }).forEach(([name, value]) => value ? next.set(name, value) : next.delete(name))
    setParams(next, { replace: true })
  }
  const readyLabel = language === 'vi' ? 'Có thể cấu hình' : 'Ready to configure'
  const waitingLabel = language === 'vi' ? 'Chờ thiết lập vị trí' : 'Waiting for Role setup'
  const choices = loaded.value?.choices ?? [], owners = [...new Map(choices.map(c => [c.ownerId, { value: c.ownerId, label: c.ownerName }])).values()]
    .sort((a, b) => a.label.localeCompare(b.label, language) || a.value.localeCompare(b.value))
  const levels = choices.filter(c => c.ownerId === owner).sort((a, b) => a.rank - b.rank || a.levelId.localeCompare(b.levelId))
  const levelLabel = (id: string, name: string) => purpose === 'BASELINE' ? id === 'ALL_ROLE_LEVELS' ? t('baselineUX.sharedRole') : name : t(`knowledgeLevel.${id}`)
  return <>
    {purpose === 'SKILL_ASSESSMENT' && <Button variant="outline" onClick={() => setBulk(true)}>{language === 'vi' ? 'Cấu hình hàng loạt' : 'Bulk configuration'}</Button>}
    {bulk && <BulkSkillPolicyDialog choices={choices} onClose={() => { setBulk(false); setReload(v => v + 1) }} />}
    {notice && <Text role="status" tone="success">{t('baselineWizard.updated')}</Text>}
    {selectedScope && purpose === 'BASELINE' && <BaselinePolicyDialog key={selectedScope} scopeKey={selectedScope} initialAction={initialAction} renderError={error => <ConfigError error={error} />} onActivated={workspace => {
      setSelectedScope(null); setNotice(false); setReload(value => value + 1)
      // Keep the activated Role in view even when prior filters/pages would hide it.
      setParams({ status: 'ACTIVE', owner: workspace.scope.ownerId }, { replace: true })
      setSearchDraft({ query: '', value: '' })
      toast({ variant: 'success', title: t('baselineUX.activatedTitle'), description: t('baselineUX.activatedLocation'), duration: 6000 })
      requestAnimationFrame(() => { listRef.current?.scrollIntoView({ block: 'start' }); listRef.current?.focus({ preventScroll: true }) })
    }} onClose={saved => {
      setSelectedScope(null); setNotice(saved); setReload(v => v + 1)
      if (params.has('scope')) { const next = new URLSearchParams(params); next.delete('scope'); next.delete('versionsPage'); setParams(next, { replace: true }) }
    }} />}
    {selectedScope && purpose === 'SKILL_ASSESSMENT' && <SkillAssessmentPolicyDialog key={selectedScope} scopeKey={selectedScope} initialAction={initialAction} onClose={() => {
      setSelectedScope(null); setReload(v => v + 1)
      const next = new URLSearchParams(params); next.delete('scope'); next.delete('versionsPage'); setParams(next, { replace: true })
    }} />}
    {purpose === 'BASELINE' && <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <StatCard variant="gradient" icon={<Briefcase className="size-4 text-primary" />} title={language === 'vi' ? 'Tổng vị trí quản lý' : 'Managed Roles'} value={current?.value?.statistics?.total ?? '\u2014'} valueClassName="text-primary" description={language === 'vi' ? 'Trong phòng ban được Admin phân công' : 'Within your Admin-assigned department'} />
      <StatCard variant="gradient" icon={<CheckCircle2 className="size-4 text-success" />} title={language === 'vi' ? 'Cấu hình đang áp dụng' : 'Active configurations'} value={current?.value?.statistics?.active ?? '\u2014'} valueClassName="text-success" description={language === 'vi' ? 'Vị trí có phiên bản Baseline đang hoạt động' : 'Roles with an active Baseline policy'} />
      <StatCard variant="gradient" icon={<Edit3 className="size-4 text-warning" />} title={language === 'vi' ? 'Cần cấu hình' : 'Needs configuration'} value={current?.value?.statistics?.needsConfiguration ?? '\u2014'} valueClassName="text-warning" description={language === 'vi' ? 'Chưa kích hoạt hoặc có bản nháp cần hoàn tất' : 'Ready Roles not activated or with a draft to complete'} />
    </div>}
    <div ref={listRef} tabIndex={-1} className="scroll-mt-24 focus-visible:outline-none">{<Tabs value={archived ? 'archive' : activeTab ? 'active' : 'worklist'} onValueChange={value => filter({ status: value === 'archive' ? 'HISTORY' : value === 'active' ? 'ACTIVE' : '', level: '' })}>
      <TabsList className="h-auto w-full justify-start flex-wrap gap-1 border border-border p-1"><TabsTrigger value="worklist">{t('baselineUX.worklist')}</TabsTrigger>{purpose === 'BASELINE' && <TabsTrigger value="active">{t('baselineUX.active')}</TabsTrigger>}<TabsTrigger value="archive">{t('baselineUX.archive')}</TabsTrigger></TabsList>
    </Tabs>}</div>
    <Card className="overflow-hidden"><CardHeader>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4"><div className="min-w-0 space-y-1 pr-2">
        <Heading level={2} size="card" className="flex items-center gap-2"><Briefcase className="size-4 shrink-0 text-primary" aria-hidden="true" />{t('baselineUX.title')}</Heading>
        <Text variant="caption">{purpose === 'BASELINE' && !archived && !activeTab ? language === 'vi' ? 'Mặc định chỉ hiện vị trí có thể cấu hình. Chọn Tất cả để xem vị trí đang chờ thiết lập.' : 'Ready Roles are shown by default. Select All to include Roles waiting for catalog setup.' : t(archived ? 'baselineUX.archiveHelp' : activeTab ? 'baselineUX.activeHelp' : 'baselineUX.worklistHelp')}</Text>
      </div><div className="flex flex-wrap items-center justify-end gap-2">
      <label className="w-full min-w-0 sm:w-60"><span className="sr-only">{t(purpose === 'BASELINE' ? 'scopedPolicy.searchRole' : 'scopedPolicy.searchSkill')}</span>
        <Input type="search" maxLength={200} className="h-8 bg-background text-caption" leftIcon={<Search size={15} aria-hidden="true" />} value={searchInput} placeholder={t(purpose === 'BASELINE' ? 'baselineUX.searchRole' : 'baselineUX.searchSkill')} onChange={e => setSearchDraft({ query: search, value: e.target.value })} /></label>
      <label className="w-full min-w-0 sm:w-40"><span className="sr-only">{t(purpose === 'BASELINE' ? 'scopedPolicy.role' : 'scopedPolicy.skill')}</span>
        <Combobox size="sm" value={owner} options={owners} className="bg-background" customTriggerLabel={`${t(purpose === 'BASELINE' ? 'scopedPolicy.role' : 'scopedPolicy.skill')}: ${owners.find(o => o.value === owner)?.label ?? t('scopedPolicy.allOwners')}`} placeholder={t('scopedPolicy.allOwners')} onChange={value => filter({ owner: value, level: '' })} /></label>
      {(purpose === 'SKILL_ASSESSMENT' || archived) && <label className="w-full min-w-0 sm:w-40"><span className="sr-only">{t(purpose === 'BASELINE' ? 'scopedPolicy.memberLevel' : 'scopedPolicy.knowledgeLevel')}</span>
        <Combobox size="sm" value={level} disabled={!owner} options={levels.map(c => ({ value: c.levelId, label: levelLabel(c.levelId, c.levelName) }))} className="bg-background" customTriggerLabel={`${t('baselineUX.levelFilter')}: ${levels.some(c => c.levelId === level) ? levelLabel(level, levels.find(c => c.levelId === level)!.levelName) : t('scopedPolicy.allLevels')}`} placeholder={t('scopedPolicy.allLevels')} onChange={value => filter({ level: value })} /></label>}
      {!archived && !activeTab && <label className="w-full min-w-0 sm:w-40"><span className="sr-only">{t('scopedPolicy.status')}</span><Combobox size="sm" value={status} className="bg-background"
        customTriggerLabel={purpose === 'BASELINE' ? status === 'ALL' ? t('scopedPolicy.allStatuses') : status ? t(`scopedPolicy.${status}`) : readyLabel : `${t('scopedPolicy.status')}: ${status ? t(`scopedPolicy.${status}`) : t('scopedPolicy.allStatuses')}`}
        options={(purpose === 'BASELINE' ? ['', 'ALL', 'UNCONFIGURED', 'DRAFT'] : ['UNCONFIGURED', 'DRAFT', 'ACTIVE']).map(value => ({ value, label: purpose === 'BASELINE' && !value ? readyLabel : value === 'ALL' ? t('scopedPolicy.allStatuses') : t(`scopedPolicy.${value}`) }))} placeholder={purpose === 'BASELINE' ? readyLabel : t('scopedPolicy.allStatuses')} onChange={value => filter({ status: value })} /></label>}
      {(search || owner || level || status && !archived && !activeTab) && <Button variant="outline" size="sm" className="w-fit border-primary/30 text-primary hover:bg-secondary" onClick={() => { setSearchDraft({ query: '', value: '' }); setParams(archived ? { status: 'HISTORY' } : activeTab ? { status: 'ACTIVE' } : {}, { replace: true }) }}>{t('scopedPolicy.clear')}</Button>}

      <Button size="icon" variant="outline" className="size-8" disabled={!current} title={t('scopedPolicy.refresh')} aria-label={t('scopedPolicy.refresh')} onClick={() => setReload(v => v + 1)}><RefreshCw size={14} /></Button>
      </div></div>
    </CardHeader>
    {!current && <Text role="status" variant="caption">{t('scopedPolicy.loading')}</Text>}
    {current?.error != null && <Card><CardContent className="space-y-3 pt-5"><ConfigError error={current.error} /><Button variant="outline" onClick={() => setReload(v => v + 1)}>{t('scopedPolicy.retry')}</Button></CardContent></Card>}
    {data && data.issues.length > 0 && <Card><CardContent className="space-y-2 p-4"><Text role="status" tone="foreground">{t('scopedPolicy.catalogIssues')}</Text>
      {data.issues.map(issue => <Text variant="body-sm" key={`${issue.ownerId}:${issue.levelName}:${issue.code}`}>{issue.ownerName} · {issue.levelName}: {t(`scopedPolicy.errors.${issue.code}`, t('scopedPolicy.notReady'))}</Text>)}
    </CardContent></Card>}
    {data && (data.rows.length === 0 ? <Card><CardContent className="p-6"><Text role="status">{t(archived ? 'baselineUX.emptyArchive' : 'scopedPolicy.empty')}</Text></CardContent></Card> :
      <div aria-busy={!current} className={`overflow-hidden border-t border-border ${!current ? 'pointer-events-none opacity-60' : ''}`}><div className="overflow-x-auto"><table className="w-full text-left text-body-sm"><thead className="border-b border-border bg-background text-xs uppercase tracking-wide text-muted-foreground"><tr>
        {[purpose === 'BASELINE' ? 'role' : 'skill', ...(showLevel ? [purpose === 'BASELINE' ? 'memberLevel' : 'knowledgeLevel'] : []), 'status', 'versions', 'actions'].map(label => <th key={label} scope="col" className="px-3 py-3 font-semibold last:text-right">{t(`scopedPolicy.${label}`)}</th>)}
      </tr></thead><tbody className="divide-y divide-border">{data.rows.map(row => <tr key={row.scope.key} className="transition-colors even:bg-background/60 hover:bg-muted/40">
        <td className="max-w-xs break-words px-3 py-3"><span className="font-semibold">{row.scope.ownerName}</span>{purpose === 'SKILL_ASSESSMENT' && <Text variant="caption" className="mt-0.5">{row.scope.ownerId}</Text>}</td>{showLevel && <td className="px-3 py-3">{levelLabel(row.scope.levelId, row.scope.levelName)}</td>}
        <td className="px-3 py-3"><div className="flex flex-wrap gap-2"><Badge className={row.status === 'WAITING' ? 'border-warning bg-warning/15 text-foreground' : undefined} variant={row.status === 'ACTIVE' ? 'success' : row.status === 'DRAFT' || purpose === 'SKILL_ASSESSMENT' && row.status === 'UNCONFIGURED' ? 'secondary' : 'outline'}>{row.status === 'WAITING' ? waitingLabel : t(archived ? 'baselineUX.archivedStatus' : `scopedPolicy.${row.status}`)}</Badge>
          {!archived && row.hasDraft && row.status === 'ACTIVE' && <Badge variant="secondary">{t('scopedPolicy.DRAFT')}</Badge>}</div>
          {!archived && !row.scope.ready && <Text variant="caption" className="mt-1">{purpose === 'BASELINE' ? language === 'vi' ? 'Catalog vị trí chưa hoàn chỉnh. Cần cấu hình kỹ năng yêu cầu.' : 'Role catalog setup is incomplete. Required Skills must be configured.' : t('scopedPolicy.notReady')}</Text>}</td>
        <td className="px-3 py-3"><Text variant="caption">{archived ? `${row.archivedCount} ${t('baselineUX.archivedItems')}` : row.activeVersion !== null ? `${t('scopedPolicy.ACTIVE')} · v${row.activeVersion}` : t(row.hasDraft ? 'baselineUX.draftVersion' : 'baselineUX.noVersion')}</Text></td>
        <td className="px-3 py-3"><div className="flex justify-end gap-1.5"><Button size="icon" variant="outline" className="size-8" title={t(archived ? 'baselineUX.viewHistory' : row.status === 'UNCONFIGURED' ? 'scopedPolicy.configure' : 'baselineWizard.edit')} aria-label={t(archived ? 'baselineUX.viewHistory' : row.status === 'UNCONFIGURED' ? 'scopedPolicy.configure' : 'baselineWizard.edit')} disabled={!current || purpose === 'BASELINE' && !archived && !row.scope.ready} onClick={() => {
          if (archived) { setNotice(false); setInitialAction('view'); setSelectedScope(row.scope.key); return }
          setNotice(false); setInitialAction(row.status === 'UNCONFIGURED' || row.draftIncomplete ? 'configure' : 'edit'); setSelectedScope(row.scope.key)
        }}>{archived ? <History size={14} /> : <Pencil size={14} />}</Button>
          {!archived && (row.hasDraft || row.versionCount > 0) && <Button size="icon" variant="outline" className="size-8 text-primary" aria-label={t('baselineUX.history')} title={t('baselineUX.history')} disabled={!current} onClick={() => { setNotice(false); setInitialAction('view'); setSelectedScope(row.scope.key) }}><Eye size={14} /></Button>}
        </div></td>
      </tr>)}</tbody></table></div><Pagination currentPage={page + 1} totalPages={Math.ceil(data.total / 10)} totalItems={data.total} pageSize={10} locale={language}
        disabled={!current} onPageChange={value => { const next = new URLSearchParams(params); next.set('page', String(value - 1)); setParams(next) }} /></div>)}
    </Card>
  </>
}
export function SkillAssessmentPolicyDialog({ scopeKey, initialAction = 'configure', onClose }: { scopeKey: string; initialAction?: 'configure' | 'edit' | 'view'; onClose: () => void }) {
  return <ScopeWorkspace purpose="SKILL_ASSESSMENT" scopeKey={scopeKey} initialAction={initialAction} onClose={onClose} />
}
function ScopeWorkspace({ purpose, scopeKey, initialAction, onClose }: { purpose: AssessmentPurpose; scopeKey: string; initialAction: 'configure' | 'edit' | 'view'; onClose: () => void }) {
  const { t, language } = useTranslation(), [reload, setReload] = useState(0), [page, setPage] = useState(0)
  const key = `${page}:${reload}`, opened = useRef(false), createKey = useRef(crypto.randomUUID())
  const [loaded, setLoaded] = useState<Loaded<PolicyWorkspace>>({ key: '' }), [editing, setEditing] = useState(false), [viewing, setViewing] = useState<ScopedVersion | null>(null)
  const [busy, setBusy] = useState(false), [pending, setPending] = useState<ScopedCommand | null>(null), [mutationError, setMutationError] = useState<unknown>(null), [notice, setNotice] = useState(''), [confirm, setConfirm] = useState(false), [discard, setDiscard] = useState(false), flight = useRef(false), activateOnSave = useRef(false)
  const current = loaded.key === key ? loaded : undefined, data = current?.value, locked = busy || pending !== null
  useEffect(() => {
    const controller = new AbortController()
    void getPolicyWorkspace(purpose, scopeKey, page, controller.signal).then(value => { if (!controller.signal.aborted) setLoaded({ key, value }) })
      .catch(error => { if (!controller.signal.aborted) setLoaded({ key, error }) })
    return () => controller.abort()
  }, [purpose, scopeKey, page, key])
  useEffect(() => {
    if (!locked) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn)
  }, [locked])
  async function execute(command: ScopedCommand, activateAfterSave = false) {
    if (flight.current) return
    let savedForActivation = false
    flight.current = true; activateOnSave.current = activateAfterSave; setBusy(true); setPending(command); setMutationError(null); setNotice(''); setConfirm(false)
    try {
      let result = await runScopedCommand(command)
      if (command.kind === 'save' && activateAfterSave && result.draft) {
        savedForActivation = true
        setLoaded({ key, value: result }); setEditing(false)
        const activation: ScopedCommand = { purpose, scopeKey, kind: 'activate', commandKey: crypto.randomUUID(), draftId: result.draft.id, expectedRevision: result.draft.revision, expectedActivationRevision: result.activationRevision, expectedCatalogHash: result.scope.catalogHash }
        setPending(activation); result = await runScopedCommand(activation)
      }
      setLoaded({ key, value: result }); setPending(null); setViewing(null); setEditing(command.kind === 'create'); setReload(v => v + 1)
      setNotice(command.kind === 'activate' || activateAfterSave ? 'activated' : command.kind === 'create' ? 'draftOpened' : 'saved')
    } catch (error) {
      setMutationError(error)
      if (savedForActivation) setNotice('savedActivationFailed')
      if (error instanceof AdaptiveBaselineApiError && error.status >= 400 && error.status < 500) { setPending(null); setReload(v => v + 1) }
    } finally { flight.current = false; setBusy(false) }
  }
  useEffect(() => {
    if (!data || opened.current || initialAction === 'view') return
    opened.current = true
    if (data.draft) setEditing(true)
    else void execute({ purpose, scopeKey, kind: 'create', commandKey: createKey.current, expectedActivationRevision: data.activationRevision })
    // One initial action per opening; execute retains its command for safe retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, initialAction])
  const base = () => ({ purpose, scopeKey, commandKey: crypto.randomUUID() })
  function back() { if (locked) return; if (editing) setDiscard(true); else onClose() }
  return <Dialog open size="wide" className="max-w-3xl border-primary/20" ariaLabel={t('scopedPolicy.skillTitle')} onOpenChange={open => { if (!open) back() }}>
    <DialogHeader className="mb-4 border-b border-border pb-4 pr-7"><DialogTitle><SlidersHorizontal className="h-5 w-5 text-primary" />{data ? `${data.scope.ownerName} \u00b7 ${t(`knowledgeLevel.${data.scope.levelId}`)}` : t('scopedPolicy.skillTitle')}</DialogTitle><DialogDescription>{t('scopedPolicy.skillTitle')}</DialogDescription></DialogHeader>
    <DialogBody className="space-y-4">
    {notice && <Text role="status" tone={notice === 'savedActivationFailed' ? 'foreground' : 'success'}>{t(`scopedPolicy.${notice}`)}</Text>}
    {mutationError != null && <ConfigError error={mutationError} />}
    {pending && !busy && <Card><CardContent className="space-y-3 pt-5"><Text role="status">{t('scopedPolicy.pending')}</Text><Button variant="outline" onClick={() => void execute(pending, pending.kind === 'save' && activateOnSave.current)}>{t('scopedPolicy.retry')}</Button></CardContent></Card>}
    {!current && <Text role="status">{t('scopedPolicy.loading')}</Text>}
    {current?.error != null && <><ConfigError error={current.error} /><Button variant="outline" disabled={locked} onClick={() => setReload(v => v + 1)}>{t('scopedPolicy.retry')}</Button></>}
    {data && <>
      <Card className="border-primary/25 bg-secondary/30 shadow-none"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0"><Heading level={2} size="subsection" className="break-words">{data.scope.ownerName}</Heading>
        <Text variant="body-sm">{t(purpose === 'BASELINE' ? 'scopedPolicy.memberLevel' : 'scopedPolicy.knowledgeLevel')}: {purpose === 'BASELINE' ? data.scope.levelName : t(`knowledgeLevel.${data.scope.levelId}`)}</Text></div>
        <div className="flex flex-wrap gap-2">{data.active && <Badge variant="success">{t('scopedPolicy.ACTIVE')} · v{data.active.version}</Badge>}{data.draft && <Badge variant="secondary">{t('scopedPolicy.DRAFT')}</Badge>}</div>
      </CardContent></Card>
      {!data.scope.ready && <Text role="status">{t('scopedPolicy.notReady')}</Text>}
      {data.scope.readinessIssues.map(issue => <Text variant="body-sm" key={issue}>{t(`scopedPolicy.errors.${issue}`, t('scopedPolicy.notReady'))}</Text>)}
      {(data.draft && data.draft.catalogHash !== data.scope.catalogHash || data.active && data.active.catalogHash !== data.scope.catalogHash) && <Text role="status">{t('scopedPolicy.catalogChanged')}</Text>}
      {editing && data.draft ? <RulePolicyForm key={`${data.draft.id}:${data.draft.revision}`} workspace={data} locked={locked}
        onCancel={() => setEditing(false)} onSave={(configuration, activate) => void execute({ ...base(), kind: 'save', draftId: data.draft!.id, expectedRevision: data.draft!.revision, expectedCatalogHash: data.scope.catalogHash, configuration }, activate)} />
        : viewing ? <RulePolicyForm key={viewing.id} workspace={data} version={viewing} locked={true} onCancel={() => setViewing(null)} /> : <>
          <div className="flex flex-wrap justify-end gap-2">{data.draft ? <>
            <Button variant="secondary" className="border border-primary/30 font-semibold" disabled={locked} onClick={() => { setEditing(true); setViewing(null) }}>{t('scopedPolicy.editDraft')}</Button>
            <Button disabled={locked || !data.draft.configuration || !data.scope.ready || data.draft.catalogHash !== data.scope.catalogHash} onClick={() => setConfirm(true)}>{t('scopedPolicy.activate')}</Button>
          </> : <Button disabled={locked} onClick={() => void execute({ ...base(), kind: 'create', expectedActivationRevision: data.activationRevision })}>{t('scopedPolicy.createDraft')}</Button>}</div>
          <Card><CardHeader><Heading level={2} size="subsection">{t('scopedPolicy.versions')}</Heading></CardHeader><CardContent className="space-y-3">
            {data.draft && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"><div><Text tone="foreground">{t('scopedPolicy.DRAFT')}</Text><Text variant="caption">{new Date(data.draft.updatedAt).toLocaleString(language)}</Text></div><Button variant="outline" size="sm" disabled={locked} onClick={() => setEditing(true)}>{t('scopedPolicy.editDraft')}</Button></div>}
            {!data.totalVersions && !data.draft && <Text>{t('scopedPolicy.noVersions')}</Text>}
            {data.versions.map(version => <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"><div><Text tone="foreground">v{version.version}</Text><Text variant="caption">{new Date(version.createdAt).toLocaleString(language)}</Text></div>
              <div className="flex items-center gap-2"><Badge variant={data.active?.id === version.id ? 'success' : 'outline'}>{t(data.active?.id === version.id ? 'scopedPolicy.ACTIVE' : 'scopedPolicy.HISTORY')}</Badge><Button variant="outline" size="sm" disabled={locked} onClick={() => { setViewing(version); setEditing(false) }}>{t('scopedPolicy.view')}</Button></div></div>)}
            <Pagination currentPage={page + 1} totalPages={Math.ceil(data.totalVersions / 20)} totalItems={data.totalVersions} pageSize={20} locale={language} disabled={locked} onPageChange={value => setPage(value - 1)} />
          </CardContent></Card>
        </>}
      <Dialog open={confirm} onOpenChange={open => { if (!locked) setConfirm(open) }} ariaLabel={t('scopedPolicy.activate')}>
        <DialogHeader><DialogTitle>{t('scopedPolicy.activate')}</DialogTitle><DialogDescription>{t('scopedPolicy.confirmHelp')}</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" disabled={locked} onClick={() => setConfirm(false)}>{t('scopedPolicy.cancel')}</Button><Button disabled={locked || !data.draft} onClick={() => { if (data.draft) void execute({ ...base(), kind: 'activate', draftId: data.draft.id, expectedRevision: data.draft.revision, expectedActivationRevision: data.activationRevision, expectedCatalogHash: data.scope.catalogHash }) }}>{t('scopedPolicy.activate')}</Button></DialogFooter>
      </Dialog>
    </>}
    </DialogBody>
    <Dialog open={discard} ariaLabel={t('baselineWizard.discard')} onOpenChange={open => { if (!locked) setDiscard(open) }}>
      <DialogHeader><DialogTitle>{t('baselineWizard.discard')}</DialogTitle></DialogHeader>
      <DialogFooter><Button variant="outline" onClick={() => setDiscard(false)}>{t('scopedPolicy.cancel')}</Button><Button onClick={onClose}>{t('baselineWizard.discard')}</Button></DialogFooter>
    </Dialog>
  </Dialog>
}
