import { EmployeeAccessNotice } from '../components/EmployeeAccessNotice'
import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { RefreshCw, Search, Target } from 'lucide-react'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { Input } from '../../../shared/components/ui/Input'
import { Combobox } from '../../../shared/components/ui/Combobox'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { chooseCurrentRole, currentRoles, prepareRoleChoice, readRoleFlow, RoleFlowError, type CurrentRole, type RoleChoiceCommand } from './currentRoleFlowApi'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { Heading } from '../../../shared/components/typography/Heading'
import { CurrentRoleCard } from './CurrentRoleCard'
import { CurrentRoleSummary } from './CurrentRoleSummary'

export function CurrentRolePanel() {
  const { t, language } = useTranslation(), tr = (key: string) => t(`roleFlow.${key}`)
  const queryClient = useQueryClient(), [params, setParams] = useSearchParams()
  const roles = useQuery({ queryKey: ['currentRoleCatalog'], queryFn: ({ signal }) => currentRoles(signal), retry: false })
  const view = useQuery({ queryKey: ['currentRoleFlow'], queryFn: ({ signal }) => readRoleFlow(signal), retry: false })
  const [selected, setSelected] = useState<CurrentRole | null>(null)
  const [details, setDetails] = useState<CurrentRole | null>(null)
  const [command, setCommand] = useState<RoleChoiceCommand | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState<RoleFlowError | null>(null)
  const [occupation, setOccupation] = useState(''), [sort, setSort] = useState('occupation'), [page, setPage] = useState(1)
  const [status, setStatus] = useState('all')
  const lock = useRef(false), committed = useRef(false)
  const search = params.get('search') ?? ''
  const filtered = (roles.data ?? []).filter(role => (status !== 'selected' || role.id === view.data?.selection?.role.id) && (!occupation || role.occupationId === occupation) && (role.name + ' ' + role.occupationName).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (sort === 'occupation' ? a.occupationName.localeCompare(b.occupationName, language) : 0) || a.name.localeCompare(b.name, language))
  const pageCount = Math.max(1, Math.ceil(filtered.length / 12)), currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * 12, currentPage * 12)
  const occupations = [...new Map((roles.data ?? []).map(role => [role.occupationId, { value: role.occupationId, label: role.occupationName }])).values()]
  const blocked = busy || Boolean(command)
  const assessmentActive = view.data?.progress.state === 'RESUME'
  async function refresh() { await Promise.all([roles.refetch(), view.refetch()]) }
  function choose(role: CurrentRole) {
    if (lock.current || command || !view.data) return
    setSelected(role); setError(null); committed.current = false
  }
  async function confirm(prepared?: RoleChoiceCommand) {
    if (lock.current || !selected || !view.data) return
    const next = prepared ?? prepareRoleChoice(selected.id, view.data.selection?.selectionId ?? null)
    lock.current = true; setBusy(true); setCommand(next); setError(null)
    try {
      if (!committed.current) { await chooseCurrentRole(next); committed.current = true }
      const result = await readRoleFlow()
      queryClient.setQueryData(['currentRoleFlow'], result)
      setCommand(null); setSelected(null)
    } catch (cause) {
      const failure = cause instanceof RoleFlowError ? cause : new RoleFlowError('NETWORK_ERROR')
      setError(failure)
      if (!failure.ambiguous && !committed.current) { setCommand(null); setSelected(null); await refresh() }
    } finally { lock.current = false; setBusy(false) }
  }
  return <section aria-label={t('upskillingUi.roleCatalog')} className="min-w-0 space-y-5">
    {(roles.isPending || view.isPending) && <LoadingCard label={tr('loading')} />}
    {(roles.isError || view.isError) && <EmployeeAccessNotice error={roles.error ?? view.error} message={tr('requestError')}
      retrying={roles.isFetching || view.isFetching} onRetry={() => void refresh()} />}
    {view.data && !view.isError && <CurrentRoleSummary view={view.data} />}
    {roles.isSuccess && roles.data.length === 0 &&
      <Text role="status" variant="body-sm">{t('baselineIntegration.readiness')}</Text>}
    {assessmentActive && <Text variant="body-sm" role="status">{tr('errors.ASSESSMENT_IN_PROGRESS')}</Text>}
    <Card><CardContent className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <label className="sr-only" htmlFor="current-role-search">{tr('search')}</label>
        <Input id="current-role-search" type="search" value={search} disabled={blocked}
          leftIcon={<Search size={15} aria-hidden="true" />} className="h-9 bg-background"
          placeholder={t('upskillingUi.searchPlaceholder')}
          onChange={e => { setPage(1); const q = new URLSearchParams(params); q.set('search', e.target.value); setParams(q, { replace: true }) }} />
      </div>
      <div className="grid min-w-0 gap-2 sm:grid-cols-3 lg:flex lg:items-center">
        <div role="group" aria-label={tr('occupation')} className="min-w-0 lg:w-40">
          <Combobox size="sm" wrapOptions clearable={false} disabled={blocked} value={occupation || 'ALL'}
            options={[{ value: 'ALL', label: tr('allOccupations') }, ...occupations]}
            onChange={value => { setOccupation(value === 'ALL' ? '' : value); setPage(1) }}
            searchPlaceholder={tr('search')} emptyMessage={tr('empty')} />
        </div>
        <div role="group" aria-label={tr('sort')} className="min-w-0 lg:w-40">
          <Combobox size="sm" clearable={false} disabled={blocked} value={sort}
            options={[{ value: 'occupation', label: tr('occupation') }, { value: 'role', label: tr('roleName') }]}
            onChange={value => { setSort(value); setPage(1) }} searchPlaceholder={tr('search')} emptyMessage={tr('empty')} />
        </div>
        <div role="group" aria-label={t('upskillingUi.status')} className="min-w-0 lg:w-40">
          <Combobox size="sm" clearable={false} disabled={blocked} value={status}
            options={[{ value: 'all', label: t('upskillingUi.allRoles') }, { value: 'selected', label: tr('selected') }]}
            onChange={value => { setStatus(value); setPage(1) }} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {(search || occupation || status !== 'all' || sort !== 'occupation') && <Button size="sm" variant="ghost" disabled={blocked} onClick={() => {
          const query = new URLSearchParams(params); query.delete('search'); setParams(query, { replace: true })
          setOccupation(''); setSort('occupation'); setStatus('all'); setPage(1)
        }}>{t('upskillingUi.clearFilters')}</Button>}
        <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={tr('refresh')} title={tr('refresh')} disabled={blocked} onClick={() => void refresh()}><RefreshCw size={16} /></Button>
      </div>
    </CardContent></Card>
    {!roles.isPending && !roles.isError && filtered.length === 0 && <EmptyState icon={<Target size={24} />}
      title={t('upskillingUi.noResults')} description={t('upskillingUi.noResultsHint')} />}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map(role => {
      const active = Boolean(view.data?.selection?.available && view.data.selection.role.id === role.id)
      return <CurrentRoleCard key={role.id} role={role} active={active}
        disabled={blocked || assessmentActive || !view.data || view.isError}
        onDetails={() => setDetails(role)} onChoose={() => choose(role)} />
    })}</div>
    {filtered.length > 0 && <Card className="overflow-hidden"><Pagination currentPage={currentPage} totalPages={pageCount} totalItems={filtered.length} pageSize={12} disabled={blocked} onPageChange={setPage} itemLabel={t('upskillingUi.roles')}
      labels={{ navigation: t('adaptiveBaseline.paging.navigation'), first: t('adaptiveBaseline.paging.first'), previous: t('adaptiveBaseline.paging.previous'), next: t('adaptiveBaseline.paging.next'), last: t('adaptiveBaseline.paging.last'), showing: t('adaptiveBaseline.paging.showing'), of: t('adaptiveBaseline.paging.of') }} /></Card>}
    <Dialog open={selected !== null} onOpenChange={open => { if (!open && !blocked) setSelected(null) }} ariaLabel={tr('confirmTitle')} closeLabel={tr('cancel')}>
      <DialogHeader><DialogTitle>{tr('confirmTitle')}</DialogTitle><DialogDescription>{tr(view.data?.selection ? 'changeNotice' : 'chooseNotice')}</DialogDescription></DialogHeader>
      <Text variant="body-sm" className="break-words font-semibold">{selected?.name}</Text>
      {error && <Text variant="body-sm" tone="destructive" className="text-destructive" role="alert">{tr(`errors.${error.code}`)}</Text>}
      {command && <Text variant="body-sm">{tr('retryNotice')}</Text>}
      <DialogFooter><Button variant="outline" disabled={blocked} onClick={() => setSelected(null)}>{tr('cancel')}</Button>
        <Button disabled={busy} onClick={() => void confirm(command ?? undefined)}>{tr(command ? 'retry' : 'confirm')}</Button></DialogFooter>
    </Dialog>
    {error && !selected && <Text variant="body-sm" tone="destructive" className="text-destructive" role="alert">{tr(`errors.${error.code}`)}</Text>}
    <Dialog open={details !== null} onOpenChange={open => { if (!open) setDetails(null) }} ariaLabel={tr('details')} closeLabel={tr('cancel')} className="max-w-4xl">
      <DialogHeader><DialogTitle>{details?.name}</DialogTitle><DialogDescription>{details?.scope}</DialogDescription></DialogHeader>
      <div tabIndex={0} className="min-h-0 space-y-3 overflow-y-auto overscroll-contain">
        {details?.levels.map(level => <section key={level.id} className="space-y-3 rounded-lg border border-primary/20 bg-secondary/20 p-4">
          <Heading level={3} size="subsection">{level.name}</Heading><Text variant="body-sm" tone="foreground">{level.context}</Text>
          <ul className="divide-y divide-border">{level.skills.map(skill => <li key={skill.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-body-sm">
            <span className="min-w-0 flex-1 basis-48 break-words font-medium">{skill.name}{skill.mandatory ? ` · ${tr('mandatory')}` : ''}</span>
            <span className="rounded-md border border-primary/20 bg-card px-2.5 py-1 text-caption font-semibold text-secondary-foreground">{tr('requiredScore')}: {Math.round(skill.requiredScore * 100)}%</span>
          </li>)}</ul>
        </section>)}
      </div>
    </Dialog>
  </section>
}
