import { EmployeeAccessNotice } from '../components/EmployeeAccessNotice'
import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { RefreshCw, Search, Target } from 'lucide-react'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
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
import { InitialRoleGapDialog } from './InitialRoleGapDialog'
import { RoleLevelPicker } from './RoleLevelPicker'

export function CurrentRolePanel() {
  const { t, language } = useTranslation(), tr = (key: string) => t(`roleFlow.${key}`)
  const queryClient = useQueryClient(), [params, setParams] = useSearchParams()
  const roles = useQuery({ queryKey: ['currentRoleCatalog'], queryFn: ({ signal }) => currentRoles(signal), retry: false })
  const view = useQuery({ queryKey: ['currentRoleFlow'], queryFn: ({ signal }) => readRoleFlow(signal), retry: false })
  const [selected, setSelected] = useState<CurrentRole | null>(null)
  const [levelId, setLevelId] = useState('')
  const [details, setDetails] = useState<CurrentRole | null>(null)
  const [gapRole, setGapRole] = useState<CurrentRole | null>(null)
  const [command, setCommand] = useState<RoleChoiceCommand | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState<RoleFlowError | null>(null)
  const [jobPosition, setJobPosition] = useState(''), [sort, setSort] = useState('jobPosition'), [page, setPage] = useState(1)
  const [status, setStatus] = useState('all')
  const lock = useRef(false), committed = useRef(false)
  const search = params.get('search') ?? ''
  const filtered = (roles.data ?? []).filter(role => (status !== 'selected' || role.id === view.data?.selection?.role.id) && (!jobPosition || role.jobPositionId === jobPosition) && (role.name + ' ' + role.jobPositionName).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (sort === 'jobPosition' ? a.jobPositionName.localeCompare(b.jobPositionName, language) : 0) || a.name.localeCompare(b.name, language))
  const pageCount = Math.max(1, Math.ceil(filtered.length / 12)), currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * 12, currentPage * 12)
  const blocked = busy || Boolean(command)
  const assessmentActive = view.data?.progress.state === 'RESUME'
  async function refresh() { await Promise.all([roles.refetch(), view.refetch()]) }
  function choose(role: CurrentRole, chosenLevel?: string) {
    if (lock.current || command || !view.data) return
    const isSameStartOffRole = Boolean(
      (view.data.selection &&
        (view.data.selection.role.id === role.id ||
          view.data.selection.role.code.toUpperCase() === role.code.toUpperCase() ||
          view.data.selection.role.name.toLowerCase() === role.name.toLowerCase())) ||
      (view.data.assignedRoleId && view.data.assignedRoleId === role.id) ||
      (view.data.assignedRoleCode && view.data.assignedRoleCode.toUpperCase() === role.code.toUpperCase()) ||
      (view.data.assignedRoleTitle && view.data.assignedRoleTitle.toLowerCase() === role.name.toLowerCase())
    )
    const assignedLevelStr = (view.data.assignedLevel || view.data.selection?.levelId || '')
      .replace(/^(?:rank|level)\s*\d+\s*:\s*/i, '')
      .trim()
      .toLowerCase()

    const currentAssignedLevel = isSameStartOffRole
      ? role.levels.find(
          l =>
            l.id.toLowerCase() === assignedLevelStr ||
            l.name.toLowerCase() === assignedLevelStr ||
            l.code.toLowerCase() === assignedLevelStr ||
            l.id === view.data?.selection?.levelId ||
            (typeof view.data?.assignedLevelRank === 'number' && l.rank === view.data.assignedLevelRank),
        )
      : null
    const fallbackLevelId = currentAssignedLevel?.id ?? (isSameStartOffRole ? view.data.selection?.levelId ?? '' : '')

    // The filter preventing lower and same levels ONLY applies when choosing the same start-off target role.
    // For any other target role, all levels are fully selectable!
    const effectiveMinRank = isSameStartOffRole
      ? (currentAssignedLevel?.rank ?? view.data?.assignedLevelRank ?? undefined)
      : undefined

    let targetLevelId = chosenLevel ?? fallbackLevelId
    if (effectiveMinRank !== undefined) {
      const selectedLvl = role.levels.find(l => l.id === targetLevelId)
      // Upskilling within same role strictly requires a level higher than current assigned rank (rank < effectiveMinRank)
      if (!selectedLvl || selectedLvl.rank >= effectiveMinRank) {
        const permissible = role.levels
          .filter(l => l.rank < effectiveMinRank)
          .sort((a, b) => b.rank - a.rank)
        if (permissible.length > 0) {
          targetLevelId = permissible[0].id
        } else {
          targetLevelId = ''
        }
      }
    } else if (!targetLevelId) {
      // For a different role, default to entry level or first level
      targetLevelId = role.levels[role.levels.length - 1]?.id ?? role.levels[0]?.id ?? ''
    }

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
      queryClient.setQueryData(['currentRoleFlow'], result)
      setCommand(null); setSelected(null)
    } catch (cause) {
      const failure = cause instanceof RoleFlowError ? cause : new RoleFlowError('NETWORK_ERROR')
      setError(failure)
      if (!failure.ambiguous && !committed.current) { setCommand(null); setSelected(null); await refresh() }
    } finally { lock.current = false; setBusy(false) }
  }
  return <section aria-label={t('upskillingUi.roleCatalog')} className="min-w-0 space-y-5">
    {gapRole && (() => {
      const isSameStartOff = Boolean(
        (view.data?.selection &&
          (view.data.selection.role.id === gapRole.id ||
            view.data.selection.role.code.toUpperCase() === gapRole.code.toUpperCase() ||
            view.data.selection.role.name.toLowerCase() === gapRole.name.toLowerCase())) ||
        (view.data?.assignedRoleId && view.data.assignedRoleId === gapRole.id) ||
        (view.data?.assignedRoleCode && view.data.assignedRoleCode.toUpperCase() === gapRole.code.toUpperCase()) ||
        (view.data?.assignedRoleTitle && view.data.assignedRoleTitle.toLowerCase() === gapRole.name.toLowerCase())
      )
      const assignedLevelStr = (view.data?.assignedLevel || view.data?.selection?.levelId || '')
        .replace(/^(?:rank|level)\s*\d+\s*:\s*/i, '')
        .trim()
        .toLowerCase()

      const currentAssignedLevel = isSameStartOff
        ? gapRole.levels.find(
            l =>
              l.id.toLowerCase() === assignedLevelStr ||
              l.name.toLowerCase() === assignedLevelStr ||
              l.code.toLowerCase() === assignedLevelStr ||
              l.id === view.data?.selection?.levelId ||
              (typeof view.data?.assignedLevelRank === 'number' && l.rank === view.data.assignedLevelRank),
          )
        : null

      const allowedMinRank = isSameStartOff
        ? (currentAssignedLevel?.rank ?? view.data?.assignedLevelRank ?? undefined)
        : undefined

      return (
        <InitialRoleGapDialog
          role={gapRole}
          initialLevelId={
            isSameStartOff ? view.data?.selection?.levelId : null
          }
          minAllowedRank={allowedMinRank}
          onClose={() => setGapRole(null)}
          onBaseline={value => {
            setGapRole(null)
            choose(gapRole, value)
          }}
        />
      )
    })()}
    {(roles.isPending || view.isPending) && <LoadingCard label={tr('loading')} />}
    {(roles.isError || view.isError) && <EmployeeAccessNotice error={roles.error ?? view.error} message={tr(roles.isError ? 'catalogError' : 'statusError')}
      retrying={roles.isFetching || view.isFetching} onRetry={() => void refresh()} />}
    {view.data && !view.isError && <CurrentRoleSummary view={view.data} disabled={blocked} onReviewGaps={() => { if (view.data?.selection?.available) setGapRole(view.data.selection.role) }} />}
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
        {(search || status !== 'all' || sort !== 'jobPosition') && <Button size="sm" variant="ghost" disabled={blocked} onClick={() => {
          const query = new URLSearchParams(params); query.delete('search'); setParams(query, { replace: true })
          setJobPosition(''); setSort('jobPosition'); setStatus('all'); setPage(1)
        }}>{t('upskillingUi.clearFilters')}</Button>}
        <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={tr('refresh')} title={tr('refresh')} disabled={blocked} onClick={() => void refresh()}><RefreshCw size={16} /></Button>
      </div>
    </CardContent></Card>
    {!roles.isPending && !roles.isError && filtered.length === 0 && <EmptyState icon={<Target size={24} />}
      title={roles.data?.length === 0 ? tr('catalogEmpty') : t('upskillingUi.noResults')}
      description={roles.data?.length === 0 ? tr('catalogEmptyHint') : t('upskillingUi.noResultsHint')} />}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map(role => {
      const active = Boolean(view.data?.selection?.available && view.data.selection.role.id === role.id)
      return <CurrentRoleCard key={role.id} role={role} active={active}
        disabled={blocked || assessmentActive || !view.data || view.isError}
        onDetails={() => setDetails(role)} onChoose={() => choose(role)} onGaps={() => setGapRole(role)} gapDisabled={blocked || !view.data || view.isError} />
    })}</div>
    {filtered.length > 0 && <Card className="overflow-hidden"><Pagination currentPage={currentPage} totalPages={pageCount} totalItems={filtered.length} pageSize={12} disabled={blocked} onPageChange={setPage} itemLabel={t('upskillingUi.roles')}
      labels={{ navigation: t('adaptiveBaseline.paging.navigation'), first: t('adaptiveBaseline.paging.first'), previous: t('adaptiveBaseline.paging.previous'), next: t('adaptiveBaseline.paging.next'), last: t('adaptiveBaseline.paging.last'), showing: t('adaptiveBaseline.paging.showing'), of: t('adaptiveBaseline.paging.of') }} /></Card>}
    <Dialog open={selected !== null} size="wide" onOpenChange={open => { if (!open && !blocked) setSelected(null) }} ariaLabel={tr('confirmTitle')} closeLabel={tr('cancel')}>
      <DialogHeader><DialogTitle className="text-section">{tr('confirmTitle')}</DialogTitle><DialogDescription className="text-body-sm">{tr(view.data?.selection ? 'changeNotice' : 'chooseNotice')}</DialogDescription></DialogHeader>
      <DialogBody className="space-y-4">
      <Text variant="body-sm" className="break-words font-semibold">{selected?.name}</Text>
      {selected && (() => {
        const isSameStartOff = Boolean(
          (view.data?.selection &&
            (view.data.selection.role.id === selected.id ||
              view.data.selection.role.code.toUpperCase() === selected.code.toUpperCase() ||
              view.data.selection.role.name.toLowerCase() === selected.name.toLowerCase())) ||
          (view.data?.assignedRoleId && view.data.assignedRoleId === selected.id) ||
          (view.data?.assignedRoleCode && view.data.assignedRoleCode.toUpperCase() === selected.code.toUpperCase()) ||
          (view.data?.assignedRoleTitle && view.data.assignedRoleTitle.toLowerCase() === selected.name.toLowerCase())
        )
        const assignedLevelStr = (view.data?.assignedLevel || view.data?.selection?.levelId || '')
          .replace(/^(?:rank|level)\s*\d+\s*:\s*/i, '')
          .trim()
          .toLowerCase()

        const currentAssignedLevel = isSameStartOff
          ? selected.levels.find(
              l =>
                l.id.toLowerCase() === assignedLevelStr ||
                l.name.toLowerCase() === assignedLevelStr ||
                l.code.toLowerCase() === assignedLevelStr ||
                l.id === view.data?.selection?.levelId ||
                (typeof view.data?.assignedLevelRank === 'number' && l.rank === view.data.assignedLevelRank),
            )
          : null

        const allowedMinRank = isSameStartOff
          ? (currentAssignedLevel?.rank ?? view.data?.assignedLevelRank ?? undefined)
          : undefined

        return (
          <RoleLevelPicker
            levels={selected.levels}
            value={levelId}
            disabled={blocked}
            onChange={setLevelId}
            minAllowedRank={allowedMinRank}
          />
        )
      })()}
      {error && <Text variant="body-sm" tone="destructive" className="text-destructive" role="alert">{tr(`errors.${error.code}`)}</Text>}
      {command && <Text variant="body-sm">{tr('retryNotice')}</Text>}
      </DialogBody>
      <DialogFooter><Button variant="outline" disabled={blocked} onClick={() => setSelected(null)}>{tr('cancel')}</Button>
        <Button disabled={busy || !levelId} onClick={() => void confirm(command ?? undefined)}>{tr(command ? 'retry' : 'confirm')}</Button></DialogFooter>
    </Dialog>
    {error && !selected && <Text variant="body-sm" tone="destructive" className="text-destructive" role="alert">{tr(`errors.${error.code}`)}</Text>}
    <Dialog open={details !== null} size="wide" onOpenChange={open => { if (!open) setDetails(null) }} ariaLabel={tr('details')} closeLabel={tr('cancel')}>
      <DialogHeader><DialogTitle className="text-section">{details?.name}</DialogTitle><DialogDescription className="text-body-sm">{tr('details')}</DialogDescription></DialogHeader>
      <DialogBody className="space-y-4">
        {details?.levels.map(level => <section key={level.id} className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Heading level={3} size="subsection">{level.name}</Heading>
            {level.duration && (
              <span className="rounded-md border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-caption font-semibold text-primary">
                Est. {level.duration}
              </span>
            )}
          </div>
          <Text variant="body-sm" tone="foreground">{level.context}</Text>
          <ul className="divide-y divide-border">{level.skills.map(skill => <li key={skill.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-body-sm">
            <span className="min-w-0 flex-1 basis-48 break-words font-medium">{skill.name}{skill.mandatory ? ` · ${tr('mandatory')}` : ''}</span>
            <span className="rounded-md border border-border bg-card px-2.5 py-1 text-caption font-semibold text-foreground">{tr('requiredScore')}: {Math.round(skill.requiredScore * 100)}%</span>
          </li>)}</ul>
        </section>)}
      </DialogBody>
    </Dialog>
  </section>
}
