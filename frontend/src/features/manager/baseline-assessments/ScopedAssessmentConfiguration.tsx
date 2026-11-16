import { useContext, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, RefreshCw, SlidersHorizontal, History, ArrowRight, Pencil } from 'lucide-react'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { Button } from '../../../shared/components/ui/Button'
import { Badge } from '../../../shared/components/ui/Badge'
import { Card, CardContent, CardHeader } from '../../../shared/components/ui/Card'
import { Input } from '../../../shared/components/ui/Input'
import { Combobox } from '../../../shared/components/ui/Combobox'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { Tabs, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody } from '../../../shared/components/ui/Dialog'
import { AdaptiveBaselineApiError } from './adaptiveBaselineApi'
import { type AssessmentPurpose } from './assessmentRulePolicyApi'
import { getPolicyDirectory, getPolicyWorkspace, runScopedCommand, type PolicyDirectory, type PolicyWorkspace, type ScopedCommand, type ScopedVersion } from './scopedAssessmentPolicyApi'
import { BaselinePolicyDialog } from './BaselinePolicyDialog'
import { SkillPolicyWizard as RulePolicyForm } from './SkillPolicyWizard'

type Loaded<T> = { key: string; value?: T; error?: unknown }
const pageNumber = (value: string | null) => value && /^\d{1,6}$/.test(value) ? Number(value) : 0

export function SkillAssessmentConfigurationPage() {
  return <WorkspaceLayout><AssessmentConfigurationWorkspace purpose="SKILL_ASSESSMENT" /></WorkspaceLayout>
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
  return <Text role="alert" tone="destructive">{t(`scopedPolicy.errors.${code}`, t('scopedPolicy.errors.GENERIC'))}</Text>
}
function ScopeDirectory({ purpose }: { purpose: AssessmentPurpose }) {
  const { t, language } = useTranslation(), [params, setParams] = useSearchParams(), [reload, setReload] = useState(0)
  const [loaded, setLoaded] = useState<Loaded<PolicyDirectory> & { archived?: boolean }>({ key: '' })
  const [selectedScope, setSelectedScope] = useState<string | null>(() => params.get('scope'))
  const [initialAction, setInitialAction] = useState<'configure' | 'edit' | 'view'>('view')
  const [notice, setNotice] = useState(false)
  const search = params.get('search') ?? '', owner = params.get('owner') ?? '', level = params.get('level') ?? '', status = params.get('status') ?? '', page = pageNumber(params.get('page'))
  const archived = status === 'HISTORY'
  const [searchDraft, setSearchDraft] = useState({ query: search, value: search })
  const searchInput = searchDraft.query === search ? searchDraft.value : search
  const query = new URLSearchParams({ search, owner, level, status, page: String(page), size: '20' }), queryString = query.toString(), key = `${queryString}:${reload}`
  const current = loaded.key === key ? loaded : undefined, data = loaded.archived === archived ? loaded.value : undefined
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
        if (value.total > 0 && page * 20 >= value.total) {
          setParams(previous => { const next = new URLSearchParams(previous); next.set('page', String(Math.floor((value.total - 1) / 20))); return next }, { replace: true })
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
  const choices = loaded.value?.choices ?? [], owners = [...new Map(choices.map(c => [c.ownerId, { value: c.ownerId, label: c.ownerName }])).values()]
    .sort((a, b) => a.label.localeCompare(b.label, language) || a.value.localeCompare(b.value))
  const levels = choices.filter(c => c.ownerId === owner).sort((a, b) => a.rank - b.rank || a.levelId.localeCompare(b.levelId))
  const levelLabel = (id: string, name: string) => purpose === 'BASELINE' ? name : t(`knowledgeLevel.${id}`)
  return <>
    {notice && <Text role="status" tone="success">{t('baselineWizard.updated')}</Text>}
    {selectedScope && purpose === 'BASELINE' && <BaselinePolicyDialog key={selectedScope} scopeKey={selectedScope} initialAction={initialAction} renderError={error => <ConfigError error={error} />} onClose={saved => {
      setSelectedScope(null); setNotice(saved); setReload(v => v + 1)
      if (params.has('scope')) { const next = new URLSearchParams(params); next.delete('scope'); next.delete('versionsPage'); setParams(next, { replace: true }) }
    }} />}
    {selectedScope && purpose === 'SKILL_ASSESSMENT' && <SkillAssessmentPolicyDialog key={selectedScope} scopeKey={selectedScope} initialAction={initialAction} onClose={() => {
      setSelectedScope(null); setReload(v => v + 1)
      const next = new URLSearchParams(params); next.delete('scope'); next.delete('versionsPage'); setParams(next, { replace: true })
    }} />}
    {<Tabs value={archived ? 'archive' : 'worklist'} onValueChange={value => filter({ status: value === 'archive' ? 'HISTORY' : '' })}>
      <TabsList className="h-auto flex-wrap gap-1 border border-border p-1"><TabsTrigger value="worklist">{t('baselineUX.worklist')}</TabsTrigger><TabsTrigger value="archive">{t('baselineUX.archive')}</TabsTrigger></TabsList>
    </Tabs>}
    <Card><CardHeader className={purpose === 'SKILL_ASSESSMENT' ? 'space-y-0 px-5 pb-3 pt-4' : 'space-y-0'}>
      <div className={purpose === 'SKILL_ASSESSMENT' ? 'flex justify-end' : 'flex flex-wrap items-start justify-between gap-3'}>{purpose === 'BASELINE' && <div className="min-w-0 space-y-1">
        <Heading level={2} size="subsection" className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{t('baselineUX.title')}</Heading>
        <Text variant="body-sm">{t(archived ? 'baselineUX.archiveHelp' : 'baselineUX.worklistHelp')}</Text>
      </div>}<Button size="sm" variant="primary" isLoading={!current} leftIcon={<RefreshCw size={14} aria-hidden="true" />} onClick={() => setReload(v => v + 1)}>{t('scopedPolicy.refresh')}</Button></div>
    </CardHeader><CardContent className="grid items-center gap-3 pt-0 sm:grid-cols-2 xl:grid-cols-4">
      <label className="min-w-0"><span className="sr-only">{t(purpose === 'BASELINE' ? 'scopedPolicy.searchRole' : 'scopedPolicy.searchSkill')}</span>
        <Input type="search" maxLength={200} className="h-8 bg-background text-body-sm" leftIcon={<Search size={15} aria-hidden="true" />} value={searchInput} placeholder={t(purpose === 'BASELINE' ? 'baselineUX.searchRole' : 'baselineUX.searchSkill')} onChange={e => setSearchDraft({ query: search, value: e.target.value })} /></label>
      <label className="min-w-0"><span className="sr-only">{t(purpose === 'BASELINE' ? 'scopedPolicy.role' : 'scopedPolicy.skill')}</span>
        <Combobox size="sm" value={owner} options={owners} className="bg-background" customTriggerLabel={`${t(purpose === 'BASELINE' ? 'scopedPolicy.role' : 'scopedPolicy.skill')}: ${owners.find(o => o.value === owner)?.label ?? t('scopedPolicy.allOwners')}`} placeholder={t('scopedPolicy.allOwners')} onChange={value => filter({ owner: value, level: '' })} /></label>
      <label className="min-w-0"><span className="sr-only">{t(purpose === 'BASELINE' ? 'scopedPolicy.memberLevel' : 'scopedPolicy.knowledgeLevel')}</span>
        <Combobox size="sm" value={level} disabled={!owner} options={levels.map(c => ({ value: c.levelId, label: levelLabel(c.levelId, c.levelName) }))} className="bg-background" customTriggerLabel={`${t('baselineUX.levelFilter')}: ${levels.some(c => c.levelId === level) ? levelLabel(level, levels.find(c => c.levelId === level)!.levelName) : t('scopedPolicy.allLevels')}`} placeholder={t('scopedPolicy.allLevels')} onChange={value => filter({ level: value })} /></label>
      {!archived && <label className="min-w-0"><span className="sr-only">{t('scopedPolicy.status')}</span><Combobox size="sm" value={status} className="bg-background"
        customTriggerLabel={`${t('scopedPolicy.status')}: ${status ? t(`scopedPolicy.${status}`) : t('scopedPolicy.allStatuses')}`}
        options={['UNCONFIGURED', 'DRAFT', 'ACTIVE'].map(value => ({ value, label: t(`scopedPolicy.${value}`) }))} placeholder={t('scopedPolicy.allStatuses')} onChange={value => filter({ status: value })} /></label>}
      {(search || owner || level || status && !archived) && <Button variant="outline" size="sm" className="w-fit border-primary/30 text-primary hover:bg-secondary" onClick={() => { setSearchDraft({ query: '', value: '' }); setParams(archived ? { status: 'HISTORY' } : {}, { replace: true }) }}>{t('scopedPolicy.clear')}</Button>}
    </CardContent>
    {!current && <Text role="status" variant="caption">{t('scopedPolicy.loading')}</Text>}
    {current?.error != null && <Card><CardContent className="space-y-3 pt-5"><ConfigError error={current.error} /><Button variant="outline" onClick={() => setReload(v => v + 1)}>{t('scopedPolicy.retry')}</Button></CardContent></Card>}
    {data && data.issues.length > 0 && <Card><CardContent className="space-y-2 p-4"><Text role="status" tone="foreground">{t('scopedPolicy.catalogIssues')}</Text>
      {data.issues.map(issue => <Text variant="body-sm" key={`${issue.ownerId}:${issue.levelName}:${issue.code}`}>{issue.ownerName} · {issue.levelName}: {t(`scopedPolicy.errors.${issue.code}`, t('scopedPolicy.notReady'))}</Text>)}
    </CardContent></Card>}
    {data && (data.rows.length === 0 ? <Card><CardContent className="p-6"><Text role="status">{t(archived ? 'baselineUX.emptyArchive' : 'scopedPolicy.empty')}</Text></CardContent></Card> :
      <div aria-busy={!current} className={`overflow-hidden border-t border-border ${!current ? 'pointer-events-none opacity-60' : ''}`}><div className="overflow-x-auto"><table className="w-full text-left text-body-sm"><thead className="border-b border-border bg-background text-caption uppercase text-muted-foreground"><tr>
        {[purpose === 'BASELINE' ? 'role' : 'skill', purpose === 'BASELINE' ? 'memberLevel' : 'knowledgeLevel', 'status', 'versions', 'actions'].map(label => <th key={label} scope="col" className="px-4 py-3 font-semibold">{t(`scopedPolicy.${label}`)}</th>)}
      </tr></thead><tbody className="divide-y divide-border">{data.rows.map(row => <tr key={row.scope.key} className="transition-colors even:bg-background/60 hover:bg-muted/40">
        <td className="max-w-xs break-words px-4 py-3"><span className="font-semibold">{row.scope.ownerName}</span>{purpose === 'SKILL_ASSESSMENT' && <Text variant="caption" className="mt-0.5">{row.scope.ownerId}</Text>}</td><td className="px-4 py-3">{levelLabel(row.scope.levelId, row.scope.levelName)}</td>
        <td className="px-4 py-3"><div className="flex flex-wrap gap-2"><Badge variant={row.status === 'ACTIVE' ? 'success' : row.status === 'DRAFT' || purpose === 'SKILL_ASSESSMENT' && row.status === 'UNCONFIGURED' ? 'secondary' : 'outline'}>{t(archived ? 'baselineUX.archivedStatus' : `scopedPolicy.${row.status}`)}</Badge>
          {!archived && row.hasDraft && row.status === 'ACTIVE' && <Badge variant="secondary">{t('scopedPolicy.DRAFT')}</Badge>}</div>
          {!archived && !row.scope.ready && <Text variant="caption" className="mt-1">{t('scopedPolicy.notReady')}</Text>}</td>
        <td className="px-4 py-3"><Text variant="caption">{archived ? `${row.archivedCount} ${t('baselineUX.archivedItems')}` : row.activeVersion !== null ? `${t('scopedPolicy.ACTIVE')} · v${row.activeVersion}` : t(row.hasDraft ? 'baselineUX.draftVersion' : 'baselineUX.noVersion')}</Text></td>
        <td className="px-4 py-3"><div className="flex flex-wrap gap-2"><Button size="sm" variant={archived ? 'outline' : 'primary'} className={archived ? 'border-primary/30 text-primary hover:bg-secondary' : undefined} leftIcon={archived ? <History size={14} /> : row.hasDraft ? <Pencil size={14} /> : <ArrowRight size={14} />} disabled={!current} onClick={() => {
          if (archived) { setNotice(false); setInitialAction('view'); setSelectedScope(row.scope.key); return }
          setNotice(false); setInitialAction(row.status === 'UNCONFIGURED' || row.draftIncomplete ? 'configure' : 'edit'); setSelectedScope(row.scope.key)
        }}>{t(archived ? 'baselineUX.viewHistory' : row.draftIncomplete && purpose === 'BASELINE' ? 'baselineWizard.continue' : row.status === 'UNCONFIGURED' ? 'scopedPolicy.configure' : 'baselineWizard.edit')}</Button>
          {!archived && (row.hasDraft || row.versionCount > 0) && <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-secondary" leftIcon={<History size={14} />} disabled={!current} onClick={() => { setNotice(false); setInitialAction('view'); setSelectedScope(row.scope.key) }}>{t('baselineUX.history')}</Button>}
        </div></td>
      </tr>)}</tbody></table></div><Pagination currentPage={page + 1} totalPages={Math.ceil(data.total / 20)} totalItems={data.total} pageSize={20} locale={language}
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
    flight.current = true; activateOnSave.current = activateAfterSave; setBusy(true); setPending(command); setMutationError(null); setNotice(''); setConfirm(false)
    try {
      let result = await runScopedCommand(command)
      if (command.kind === 'save' && activateAfterSave && result.draft) {
        setLoaded({ key, value: result }); setEditing(false)
        const activation: ScopedCommand = { purpose, scopeKey, kind: 'activate', commandKey: crypto.randomUUID(), draftId: result.draft.id, expectedRevision: result.draft.revision, expectedActivationRevision: result.activationRevision, expectedCatalogHash: result.scope.catalogHash }
        setPending(activation); result = await runScopedCommand(activation)
      }
      setLoaded({ key, value: result }); setPending(null); setViewing(null); setEditing(command.kind === 'create'); setReload(v => v + 1)
      setNotice(command.kind === 'activate' || activateAfterSave ? 'activated' : command.kind === 'create' ? 'draftOpened' : 'saved')
    } catch (error) {
      setMutationError(error)
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
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button variant="secondary" className="min-w-24 border border-primary/30 font-semibold" disabled={locked || editing} leftIcon={<RefreshCw size={14} aria-hidden="true" />} onClick={() => { setViewing(null); setReload(v => v + 1) }}>{t('scopedPolicy.refresh')}</Button></div>
    {notice && <Text role="status" tone="success">{t(`scopedPolicy.${notice}`)}</Text>}
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
