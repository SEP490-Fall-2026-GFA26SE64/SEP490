import { EmployeeAccessNotice } from '../components/EmployeeAccessNotice'
import { useContext, useRef, useState } from 'react'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { RefreshCw, Search, Target } from 'lucide-react'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { Input } from '../../../shared/components/ui/Input'
import { Combobox } from '../../../shared/components/ui/Combobox'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { assignedRankForRole, chooseCurrentRole, currentRoles, prepareRoleChoice, readRoleFlow, jobPositionLabel, RoleFlowError, type CurrentRole, type RoleChoiceCommand } from './currentRoleFlowApi'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { CurrentRoleCard } from './CurrentRoleCard'
import { CurrentRoleSummary } from './CurrentRoleSummary'
import { RoleLevelPicker } from './RoleLevelPicker'
import { CurrentRoleDetailsDialog } from './CurrentRoleDetailsDialog'

export function CurrentRolePanel() {
  const identity = useContext(WorkspaceSessionContext)?.identity
  const scope = (identity?.organizationId ?? '') + ':' + (identity?.accountId ?? '') + ':' + (identity?.roles?.join(',') ?? '')
  return <OwnedCurrentRolePanel key={scope} scope={scope} />
}
function OwnedCurrentRolePanel({ scope }: { scope: string }) {
  const { t, language } = useTranslation(), tr = (key: string) => t(`roleFlow.${key}`)
  const queryClient = useQueryClient(), [params, setParams] = useSearchParams()
  const jobPosition = params.get('jobPositionId') ?? ''
  const positionLabel = useQuery({ queryKey: ['jobPositionLabel', scope, jobPosition], queryFn: ({ signal }) => jobPositionLabel(jobPosition, signal), enabled: Boolean(jobPosition), retry: false })
  const roles = useQuery({ queryKey: ['currentRoleCatalog', scope, jobPosition], queryFn: ({ signal }) => currentRoles(signal, jobPosition), retry: false })
  const view = useQuery({ queryKey: ['currentRoleFlow', scope], queryFn: ({ signal }) => readRoleFlow(signal), retry: false, staleTime: 0, refetchOnWindowFocus: true,
    // An administrator may activate the configuration while this selected target stays open.
    refetchInterval: query => !query.state.error && query.state.data?.selection?.available && (query.state.data.targetLocked || query.state.data.progress.state === 'BASELINE_UNAVAILABLE') ? 15_000 : false,
  })
  const [selected, setSelected] = useState<CurrentRole | null>(null)
  const [levelId, setLevelId] = useState('')
  const [details, setDetails] = useState<{ role: CurrentRole; selectedLevelId?: string } | null>(null)
  const [command, setCommand] = useState<RoleChoiceCommand | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState<RoleFlowError | null>(null)
  const [sort, setSort] = useState('jobPosition'), [page, setPage] = useState(1)
  const [status, setStatus] = useState('all')
  const lock = useRef(false), committed = useRef(false)
  const search = params.get('search') ?? ''
  const filtered = (roles.isError ? [] : roles.data ?? []).filter(role => (status !== 'selected' || role.id === view.data?.selection?.role.id) && (!jobPosition || role.jobPositionId === jobPosition) && (role.name + ' ' + role.jobPositionName).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (sort === 'jobPosition' ? a.jobPositionName.localeCompare(b.jobPositionName, language) : 0) || a.name.localeCompare(b.name, language))
  const pageCount = Math.max(1, Math.ceil(filtered.length / 12)), currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * 12, currentPage * 12)
  const blocked = busy || Boolean(command)
  const assessmentActive = view.data?.progress.state === 'RESUME'
  async function refresh() { await Promise.all([roles.refetch(), view.refetch(), queryClient.invalidateQueries({ queryKey: ['initialPathway', scope] })]) }
  function choose(role: CurrentRole, chosenLevel?: string) {
    if (lock.current || command || !view.data) return
    if (view.data.targetLocked === undefined) {
      setError(new RoleFlowError('ROLE_SELECTION_NOT_READY', 409))
      return
    }
    if (view.data.targetLocked) {
      setError(new RoleFlowError('TARGET_ROLE_LEVEL_LOCKED', 409))
      return
    }
    const assignedRank = assignedRankForRole(role, view.data)
    const eligible = role.levels
      .filter(level => assignedRank === undefined || level.rank < assignedRank)
      .sort((a, b) => b.rank - a.rank)
    const targetLevelId = eligible.find(level => level.id === chosenLevel)?.id ?? eligible[0]?.id ?? ''

    setSelected(role)
    setLevelId(targetLevelId)
    setError(null)
    committed.current = false
  }
  async function confirm(prepared?: RoleChoiceCommand) {
    if (lock.current || !selected || !view.data || !levelId) return
    const next = prepared ?? prepareRoleChoice(selected.id, view.data.selection?.selectionId ?? null, levelId)
    lock.current = true; setBusy(true); setCommand(next); setError(null)
    try {
      if (!committed.current) { await chooseCurrentRole(next); committed.current = true }
      const result = await readRoleFlow()
      queryClient.setQueryData(['currentRoleFlow', scope], result)
      void queryClient.invalidateQueries({ queryKey: ['initialPathway'] })
      void queryClient.invalidateQueries({ queryKey: ['employee-role-overview'] })
      setCommand(null); setSelected(null)
    } catch (cause) {
      const failure = cause instanceof RoleFlowError ? cause : new RoleFlowError('NETWORK_ERROR')
      setError(failure)
      if (!failure.ambiguous && !committed.current) { setCommand(null); await refresh() }
    } finally { lock.current = false; setBusy(false) }
  }
  return <section aria-label={t('upskillingUi.roleCatalog')} className="min-w-0 space-y-5">
    {(roles.isPending || view.isPending) && <LoadingCard label={tr('loading')} />}
    {(roles.isError || view.isError) && <EmployeeAccessNotice error={roles.error ?? view.error} message={jobPosition && roles.error instanceof RoleFlowError ? t(`riasecUi.states.${roles.error.code}`, tr('catalogError')) : tr(roles.isError ? 'catalogError' : 'statusError')}
      retrying={roles.isFetching || view.isFetching} onRetry={() => void refresh()} />}
    {view.data && !view.isError && <CurrentRoleSummary view={view.data} disabled={blocked} onDetails={() => { if (view.data?.selection) setDetails({ role: view.data.selection.role, selectedLevelId: view.data.selection.levelId ?? undefined }) }} />}
    {error && !selected && <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3" role="alert"><Text variant="body-sm" tone="destructive">{t(`roleFlow.errors.${error.code}`, tr('statusError'))}</Text>{error.code === 'TARGET_ROLE_LEVEL_LOCKED' && <Link to="/employee/pathway?view=role" className={buttonVariants({ variant: 'primary', size: 'sm' })}>{t('roleFlow.viewPathway')}</Link>}</div>}
    {view.data?.targetLocked && !error && <Text variant="body-sm" role="status">{tr('errors.TARGET_ROLE_LEVEL_LOCKED')}</Text>}
    {view.data && view.data.targetLocked === undefined && !view.isError && !error && <Text variant="body-sm" role="status">{tr('errors.ROLE_SELECTION_NOT_READY')}</Text>}
    {assessmentActive && <Text variant="body-sm" role="status">{tr('errors.ASSESSMENT_IN_PROGRESS')}</Text>}
    <Card><CardContent className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <label className="sr-only" htmlFor="current-role-search">{tr('search')}</label>
        <Input id="current-role-search" type="search" value={search} disabled={blocked}
          leftIcon={<Search size={15} aria-hidden="true" />} className="h-9 bg-background"
          placeholder={t('upskillingUi.searchPlaceholder')}
          onChange={e => { setPage(1); const q = new URLSearchParams(params); q.set('search', e.target.value); setParams(q, { replace: true }) }} />
      </div>
      <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:flex lg:items-center">
        <div role="group" aria-label={tr('sort')} className="min-w-0 lg:w-40">
          <Combobox size="sm" clearable={false} disabled={blocked} value={sort}
            options={[{ value: 'jobPosition', label: tr('jobPosition') }, { value: 'role', label: tr('roleName') }]}
            onChange={value => { setSort(value); setPage(1) }} searchPlaceholder={tr('search')} emptyMessage={tr('empty')} />
        </div>
        <div role="group" aria-label={t('upskillingUi.status')} className="min-w-0 lg:w-40">
          <Combobox size="sm" clearable={false} disabled={blocked} value={status}
            options={[{ value: 'all', label: t('upskillingUi.allRoles') }, { value: 'selected', label: tr('selected') }]}
            onChange={value => { setStatus(value); setPage(1) }} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {(search || jobPosition || status !== 'all' || sort !== 'jobPosition') && <Button size="sm" variant="ghost" disabled={blocked} onClick={() => {
          const query = new URLSearchParams(params); query.delete('search'); query.delete('jobPositionId'); setParams(query, { replace: true })
          setSort('jobPosition'); setStatus('all'); setPage(1)
        }}>{t('upskillingUi.clearFilters')}</Button>}
        <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={tr('refresh')} title={tr('refresh')} disabled={blocked} onClick={() => void refresh()}><RefreshCw size={16} /></Button>
      </div>
    </CardContent></Card>
    {jobPosition && <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/40 p-3" role="status">
      <Text variant="body-sm">{t('riasecUi.filteredPosition')}: {(!positionLabel.isError && positionLabel.data) || (!roles.isError && roles.data?.find(role => role.jobPositionId === jobPosition)?.jobPositionName) || t('riasecUi.profileUnavailable')}</Text>
      <Button variant="ghost" size="sm" disabled={blocked} onClick={() => { const query = new URLSearchParams(params); query.delete('jobPositionId'); setParams(query, { replace: true }); setPage(1) }}>{t('riasecUi.clearPosition')}</Button>
    </div>}
    {!roles.isPending && !roles.isError && filtered.length === 0 && <EmptyState icon={<Target size={24} />}
      title={t('upskillingUi.noResults')}
      description={jobPosition && roles.data?.length === 0 ? t('riasecUi.noPositionRoles') : roles.data?.length === 0 ? tr('catalogEmptyHint') : t('upskillingUi.noResultsHint')} />}
    {visible.length > 0 && <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"><div className="overflow-x-auto" role="region" aria-label={t('upskillingUi.roleCatalog')} tabIndex={0}><table className="w-full min-w-[760px] table-fixed text-left text-body-sm">
      <caption className="sr-only">{t('upskillingUi.roleCatalog')}</caption>
      <colgroup><col className="w-[25%]" /><col className="w-[23%]" /><col className="w-[13%]" /><col className="w-[10%]" /><col className="w-[29%]" /></colgroup>
      <thead className="border-b border-border bg-muted/20 text-caption text-muted-foreground"><tr>{['scopedPolicy.role', 'baselineUi.jobPosition', 'upskillingUi.skillCount', 'upskillingUi.levels', 'scopedPolicy.actions'].map((label, index) => <th key={label} scope="col" className={`px-4 py-3 font-semibold ${index === 4 ? 'text-right' : ''}`}>{t(label)}</th>)}</tr></thead>
      <tbody className="divide-y divide-border">{visible.map(role => {
      const active = Boolean(view.data?.selection?.available && view.data.selection.role.id === role.id)
      return <CurrentRoleCard key={role.id} role={role} active={active} layout="row"
        disabled={blocked || assessmentActive || view.data?.targetLocked !== false || !view.data || view.isError}
        onDetails={() => setDetails({ role, selectedLevelId: active ? view.data?.selection?.levelId ?? undefined : undefined })} onChoose={() => choose(role)} />
    })}</tbody></table></div></div>}
    {filtered.length > 0 && <Card className="overflow-hidden"><Pagination currentPage={currentPage} totalPages={pageCount} totalItems={filtered.length} pageSize={12} disabled={blocked} onPageChange={setPage} itemLabel={t('upskillingUi.roles')}
      labels={{ navigation: t('adaptiveBaseline.paging.navigation'), first: t('adaptiveBaseline.paging.first'), previous: t('adaptiveBaseline.paging.previous'), next: t('adaptiveBaseline.paging.next'), last: t('adaptiveBaseline.paging.last'), showing: t('adaptiveBaseline.paging.showing'), of: t('adaptiveBaseline.paging.of') }} /></Card>}
    <Dialog open={selected !== null} className="max-w-lg sm:max-w-xl" onOpenChange={open => { if (!open && !blocked) setSelected(null) }} ariaLabel={tr('confirmTitle')} closeLabel={tr('cancel')}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Target size={18} className="shrink-0 text-primary" aria-hidden="true" />
          {tr('confirmTitle')}
        </DialogTitle>
        <DialogDescription className="text-body-sm">
          {tr(view.data?.selection ? 'changeNotice' : 'chooseNotice')}
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-4 px-1 py-1">
      <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-3.5">
        <Text variant="body-sm" tone="foreground" className="break-words font-semibold text-sm">
          {selected?.name}
        </Text>
        <Text variant="caption" className="text-muted-foreground text-xs">
          {selected?.jobPositionName}
        </Text>
      </div>
      {selected && <RoleLevelPicker
        levels={selected.levels}
        value={levelId}
        disabled={blocked}
        onChange={setLevelId}
        minAllowedRank={assignedRankForRole(selected, view.data)}
      />}
      {error && <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3" role="alert"><Text variant="body-sm" tone="destructive">{t(`roleFlow.errors.${error.code}`, tr('statusError'))}</Text>{error.code === 'TARGET_ROLE_LEVEL_LOCKED' && <Link to="/employee/pathway?view=role" className={buttonVariants({ variant: 'primary', size: 'sm' })}>{t('roleFlow.viewPathway')}</Link>}</div>}
      {command && <Text variant="body-sm">{tr('retryNotice')}</Text>}
      </DialogBody>
      <DialogFooter className="flex items-center justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" disabled={blocked} onClick={() => setSelected(null)}>
          {tr('cancel')}
        </Button>
        <Button variant="primary" size="sm" disabled={busy || view.data?.targetLocked !== false || (!levelId && (selected?.levels?.length ?? 0) > 0) || error?.code === 'TARGET_ROLE_LEVEL_LOCKED'} onClick={() => void confirm(command ?? undefined)}>
          {tr(command ? 'retry' : 'confirm')}
        </Button>
      </DialogFooter>
    </Dialog>
    {details && <CurrentRoleDetailsDialog key={details.role.id + ':' + (details.selectedLevelId ?? 'browse')} role={details.role} selectedLevelId={details.selectedLevelId} onClose={() => setDetails(null)} />}
  </section>
}
