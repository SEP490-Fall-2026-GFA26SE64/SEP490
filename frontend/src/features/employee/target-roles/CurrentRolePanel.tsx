import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { Input } from '../../../shared/components/ui/Input'
import { Combobox } from '../../../shared/components/ui/Combobox'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { chooseCurrentRole, currentRoles, prepareRoleChoice, readRoleFlow, RoleFlowError, type CurrentRole, type RoleChoiceCommand } from './currentRoleFlowApi'
import { RoleBaselineGate } from './RoleBaselineGate'

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
  const lock = useRef(false), committed = useRef(false)
  const search = params.get('search') ?? ''
  const filtered = (roles.data ?? []).filter(role => (!occupation || role.occupationId === occupation) && (role.name + ' ' + role.occupationName).toLowerCase().includes(search.toLowerCase()))
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
  return <div className="space-y-4">
    {(roles.isPending || view.isPending) && <LoadingCard label={tr('loading')} />}
    {(roles.isError || view.isError) && <Card><CardContent className="space-y-3 pt-5">
      <Text role="alert">{tr((roles.error as RoleFlowError ?? view.error as RoleFlowError)?.status === 403 ? 'employeeRequired' : 'requestError')}</Text>
      <Button variant="outline" onClick={() => void refresh()}>{tr('retry')}</Button>
    </CardContent></Card>}
    {view.data && !view.isError && <>
      {view.data.selection && <Card><CardHeader><CardTitle>{tr(view.data.selection.available ? 'selectedRole' : 'previousUnavailable')}</CardTitle></CardHeader><CardContent className="space-y-2">
        <Text className="font-semibold">{view.data.selection.role.name}</Text>
        <Text variant="body-sm">{t('baselineUi.occupation')}: {view.data.selection.role.occupationName}</Text>
        <Text variant="caption">{tr('selectedAt')}: {new Date(view.data.selection.selectedAt).toLocaleString(language)}</Text>
      </CardContent></Card>}
      <RoleBaselineGate view={view.data} />
      {assessmentActive && <Text role="status">{tr('errors.ASSESSMENT_IN_PROGRESS')}</Text>}
    </>}
    <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1 space-y-2 text-body-sm">{tr('search')}<Input type="search" value={search} disabled={blocked} onChange={e => { setPage(1); const q = new URLSearchParams(params); q.set('search', e.target.value); setParams(q, { replace: true }) }} /></label>
      <Button variant="outline" disabled={blocked} onClick={() => void refresh()}>{tr('refresh')}</Button>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div role="group" aria-label={tr('occupation')} className="space-y-2"><Text variant="body-sm">{tr('occupation')}</Text><Combobox clearable={false} disabled={blocked} value={occupation || 'ALL'} options={[{ value: 'ALL', label: tr('allOccupations') }, ...occupations]} onChange={value => { setOccupation(value === 'ALL' ? '' : value); setPage(1) }} searchPlaceholder={tr('search')} emptyMessage={tr('empty')} /></div>
      <div role="group" aria-label={tr('sort')} className="space-y-2"><Text variant="body-sm">{tr('sort')}</Text><Combobox clearable={false} disabled={blocked} value={sort} options={[{ value: 'occupation', label: tr('occupation') }, { value: 'role', label: tr('roleName') }]} onChange={value => { setSort(value); setPage(1) }} searchPlaceholder={tr('search')} emptyMessage={tr('empty')} /></div>
    </div>
    {!roles.isPending && !roles.isError && filtered.length === 0 && <Text role="status">{tr('empty')}</Text>}
    <div className="grid gap-4 lg:grid-cols-2">{visible.map(role => {
      const active = view.data?.selection?.available && view.data.selection.role.id === role.id
      return <Card key={role.id}><CardHeader><CardTitle>{role.name}</CardTitle></CardHeader><CardContent className="space-y-3">
        <Text variant="body-sm">{role.occupationName}</Text><Text className="whitespace-pre-wrap">{role.scope}</Text>
        <div className="flex flex-wrap gap-2">{role.levels.map(level => <Badge key={level.id} variant="outline">{level.name}</Badge>)}</div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setDetails(role)}>{tr('details')}</Button>
          <Button disabled={blocked || assessmentActive || active || !view.data || view.isError} onClick={() => choose(role)}>{tr(active ? 'selected' : 'choose')}</Button></div>
      </CardContent></Card>
    })}</div>
    {filtered.length > 12 && <Pagination currentPage={currentPage} totalPages={pageCount} totalItems={filtered.length} pageSize={12} disabled={blocked} onPageChange={setPage} itemLabel={t('nav.targetRoles')}
      labels={{ navigation: t('adaptiveBaseline.paging.navigation'), first: t('adaptiveBaseline.paging.first'), previous: t('adaptiveBaseline.paging.previous'), next: t('adaptiveBaseline.paging.next'), last: t('adaptiveBaseline.paging.last'), showing: t('adaptiveBaseline.paging.showing'), of: t('adaptiveBaseline.paging.of') }} />}
    <Dialog open={selected !== null} onOpenChange={open => { if (!open && !blocked) setSelected(null) }} ariaLabel={tr('confirmTitle')} closeLabel={tr('cancel')}>
      <DialogHeader><DialogTitle>{tr('confirmTitle')}</DialogTitle><DialogDescription>{tr(view.data?.selection ? 'changeNotice' : 'chooseNotice')}</DialogDescription></DialogHeader>
      <Text>{selected?.name}</Text>
      {error && <Text role="alert">{tr(`errors.${error.code}`)}</Text>}
      {command && <Text>{tr('retryNotice')}</Text>}
      <DialogFooter><Button variant="outline" disabled={blocked} onClick={() => setSelected(null)}>{tr('cancel')}</Button>
        <Button disabled={busy} onClick={() => void confirm(command ?? undefined)}>{tr(command ? 'retry' : 'confirm')}</Button></DialogFooter>
    </Dialog>
    {error && !selected && <Text role="alert">{tr(`errors.${error.code}`)}</Text>}
    <Dialog open={details !== null} onOpenChange={open => { if (!open) setDetails(null) }} ariaLabel={tr('details')} closeLabel={tr('cancel')} className="max-w-3xl">
      <DialogHeader><DialogTitle>{details?.name}</DialogTitle><DialogDescription>{details?.scope}</DialogDescription></DialogHeader>
      <div tabIndex={0} className="min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {details?.levels.map(level => <section key={level.id} className="space-y-2 border-b border-border py-3">
        <Text className="font-semibold">{level.name}</Text><Text>{level.context}</Text>
        <ul className="space-y-1">{level.skills.map(skill => <li key={skill.id} className="flex flex-wrap justify-between gap-2 text-body-sm"><span>{skill.name}{skill.mandatory ? ` · ${tr('mandatory')}` : ''}</span><span>{tr('requiredScore')}: {Math.round(skill.requiredScore * 100)}%</span></li>)}</ul>
      </section>)}
      </div>
    </Dialog>
  </div>
}
