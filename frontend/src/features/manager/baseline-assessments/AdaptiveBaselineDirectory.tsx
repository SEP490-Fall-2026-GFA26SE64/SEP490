import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { Combobox } from '../../../shared/components/ui/Combobox'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { Input } from '../../../shared/components/ui/Input'
import { Heading } from '../../../shared/components/typography/Heading'
import { ClipboardList, RefreshCw, Search } from 'lucide-react'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { AdaptiveBaselineApiError, listAdaptiveOccupations, type AdaptiveListRow, type AdaptiveListQuery } from './adaptiveBaselineApi'
import { AdaptiveErrorNotice, AdaptiveLoading } from './AdaptiveBaselineFeedback'
import { useAdaptiveBaselineList } from './useAdaptiveBaselineList'

export function AdaptiveBaselineDirectory() {
  const { t, language } = useTranslation(), tr = (key: string) => t(`adaptiveBaseline.${key}`), navigate = useNavigate()
  const state = useAdaptiveBaselineList(), locked = state.busy || state.pending
  const [selected, setSelected] = useState<AdaptiveListRow | null>(null), [reason, setReason] = useState('')
  const [choosing, setChoosing] = useState(false), [catalogRetry, setCatalogRetry] = useState(0)
  const [occupations, setOccupations] = useState<{ id: string; name: string }[]>([]), [catalogBusy, setCatalogBusy] = useState(false)
  const [catalogError, setCatalogError] = useState<AdaptiveBaselineApiError | null>(null)
  useEffect(() => {
    if (!choosing) return
    const controller = new AbortController()
    void listAdaptiveOccupations(controller.signal).then(value => { if (!controller.signal.aborted) setOccupations(value) })
      .catch(cause => { if (!controller.signal.aborted) setCatalogError(cause instanceof AdaptiveBaselineApiError ? cause : new AdaptiveBaselineApiError(0, 'NETWORK_ERROR')) })
      .finally(() => { if (!controller.signal.aborted) setCatalogBusy(false) })
    return () => controller.abort()
  }, [choosing, catalogRetry])
  function openPicker() { setCatalogBusy(true); setCatalogError(null); setOccupations([]); setChoosing(true) }
  const open = (occupation: string) => navigate(`/ld-manager/baseline-assessments/${encodeURIComponent(occupation)}`)
  const statuses = ['DRAFT', 'ACTIVE', 'RETIRING', 'INACTIVE'] as const
  return <div className="min-w-0 space-y-5 pb-8">
    <Heading level={1} className="sr-only">{tr('title')}</Heading>
    <div className="flex flex-wrap justify-end gap-2">
      <Button size="sm" variant="outline" leftIcon={<RefreshCw size={14} />} disabled={locked} onClick={state.refresh}>{tr('refresh')}</Button>
      <Button size="sm" disabled={locked} onClick={openPicker}>{tr('choose')}</Button>
    </div>
    <Card><CardContent className="grid gap-3 p-3 md:grid-cols-4">
      <label className="min-w-0 space-y-2 text-body-sm md:col-span-2"><span className="sr-only">{tr('search')}</span><Input className="h-9 bg-background" leftIcon={<Search size={15} aria-hidden="true" />} type="search" value={state.search} disabled={state.pending} placeholder={tr('searchPlaceholder')} onChange={event => state.setSearch(event.target.value)} /></label>
      <div className="space-y-2"><Text variant="body-sm" className="sr-only" id="adaptive-status-label">{tr('status')}</Text><div aria-labelledby="adaptive-status-label"><Combobox size="sm" clearable={false} disabled={locked}
        value={state.query.status || 'ALL'} options={[{ value: 'ALL', label: tr('allStatuses') }, ...statuses.map(value => ({ value, label: tr(`statuses.${value}`) }))]}
        onChange={value => state.changeQuery({ status: value === 'ALL' ? '' : value as AdaptiveListQuery['status'], page: 0 })} /></div></div>
      <div role="group" aria-labelledby="adaptive-order-label" className="space-y-2"><Text variant="body-sm" className="sr-only" id="adaptive-order-label">{tr('dateOrder')}</Text><Combobox size="sm" clearable={false} disabled={locked} value={state.query.direction}
        options={[{ value: 'NEWEST', label: tr('newest') }, { value: 'OLDEST', label: tr('oldest') }]}
        onChange={value => state.changeQuery({ direction: value as AdaptiveListQuery['direction'], page: 0 })} /></div>
    </CardContent></Card>
    {state.error && <AdaptiveErrorNotice error={state.error} />}
    {state.pending && <Card><CardContent className="space-y-3 pt-5"><Text role="status">{tr('pending')}</Text><Button disabled={state.busy} variant="outline" onClick={() => void state.retry()}>{tr('retry')}</Button></CardContent></Card>}
    {state.notice && <Text role="status" tone="success">{tr('success.disable')}</Text>}
    {state.busy ? <AdaptiveLoading /> : state.result && <>
      {state.result.rows.length === 0 ? <EmptyState icon={<ClipboardList size={28} className="text-primary" aria-hidden="true" />} title={tr('emptyList')} description={tr('emptyListHint')}
        action={<Button variant="secondary" disabled={state.pending} onClick={() => state.query.search || state.query.status ? (state.setSearch(''), state.changeQuery({ search: '', status: '', page: 0 })) : openPicker()}>{tr(state.query.search || state.query.status ? 'clearFilters' : 'choose')}</Button>} />
        : <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-body-sm">
          <thead className="border-b border-border bg-muted/50"><tr>{['name', 'occupation', 'status', 'date', 'actions'].map(key => <th className="px-4 py-3 font-semibold" scope="col" key={key}>{tr(key)}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">{state.result.rows.map(row => <tr className="transition-colors hover:bg-muted/30" key={row.workingRevisionId ?? `${row.blueprintId}:${row.version}`}>
            <td className="max-w-xs px-4 py-3"><Text variant="body-sm" tone="foreground" className="break-words font-semibold">{row.name}</Text><Text variant="caption" className="text-muted-foreground">{tr(row.type === 'DRAFT' ? 'draftType' : 'versionType')}{row.version === null ? '' : ` ${row.version}`}</Text></td>
            <td className="max-w-xs break-words px-4 py-3">{row.occupationName}</td>
            <td className="px-4 py-3"><Badge variant={row.status === 'ACTIVE' ? 'success' : row.status === 'RETIRING' ? 'warning' : row.status === 'DRAFT' ? 'secondary' : 'outline'}>{tr(`statuses.${row.status}`)}</Badge>
              {row.status === 'RETIRING' && <Text variant="caption" className="mt-1">{row.inProgressCount} {tr('continuing')}</Text>}
              {row.configurationUpdateRequired && row.status === 'ACTIVE' && <Text variant="caption" className="mt-1 text-muted-foreground">{tr('updateRequired')}</Text>}</td>
            <td className="px-4 py-3"><Text variant="caption">{tr(`dates.${row.dateLabel}`)}</Text><time dateTime={row.date}>{new Date(row.date).toLocaleString(language)}</time></td>
            <td className="px-4 py-3"><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={state.pending} onClick={() => navigate(`/ld-manager/baseline-assessments/${encodeURIComponent(row.occupationId)}?${new URLSearchParams(row.type === 'DRAFT' ? { draft: row.workingRevisionId! } : { blueprint: row.blueprintId, version: String(row.version) })}`)}>{tr('manage')}</Button>
              {row.status === 'ACTIVE' && <Button variant="ghost" size="sm" disabled={state.pending} onClick={() => { setReason(''); setSelected(row) }}>{tr('disable')}</Button>}</div></td>
          </tr>)}</tbody>
        </table></div><Pagination currentPage={state.query.page + 1} totalPages={Math.ceil(state.result.total / state.query.size)} totalItems={state.result.total} pageSize={state.query.size} itemLabel={tr('rows')} labels={{ navigation: tr('paging.navigation'), first: tr('paging.first'), previous: tr('paging.previous'), next: tr('paging.next'), last: tr('paging.last'), showing: tr('paging.showing'), of: tr('paging.of') }} disabled={locked} onPageChange={page => state.changeQuery({ page: page - 1 })} /></Card>}
    </>}
    <Dialog open={selected !== null} onOpenChange={value => { if (!value) setSelected(null) }} closeLabel={tr('cancel')} ariaLabel={tr('disable')}>
      <DialogHeader><DialogTitle>{tr('disable')}</DialogTitle><DialogDescription>{tr('disableNotice')}</DialogDescription></DialogHeader>
      <Text variant="body-sm" className="break-words">{selected?.name} · {selected?.occupationName} · v{selected?.version}</Text>
      <label className="mt-3 space-y-2 text-body-sm">{tr('reason')}<Input value={reason} maxLength={1000} onChange={event => setReason(event.target.value)} /></label>
      <DialogFooter><Button variant="outline" onClick={() => setSelected(null)}>{tr('cancel')}</Button><Button variant="destructive" disabled={!reason.trim() || locked} onClick={() => { if (selected) state.deactivate(selected, reason); setSelected(null) }}>{tr('confirm')}</Button></DialogFooter>
    </Dialog>
    <Dialog open={choosing} onOpenChange={setChoosing} closeLabel={tr('cancel')} ariaLabel={tr('choose')}>
      <DialogHeader><DialogTitle>{tr('choose')}</DialogTitle><DialogDescription>{tr('chooseHint')}</DialogDescription></DialogHeader>
      <div className="min-h-0 space-y-3 overflow-y-auto">{catalogBusy ? <AdaptiveLoading /> : catalogError ? <><AdaptiveErrorNotice error={catalogError} /><Button variant="outline" onClick={() => { setCatalogBusy(true); setCatalogError(null); setCatalogRetry(value => value + 1) }}>{tr('refresh')}</Button></>
        : occupations.length === 0 ? <Text>{tr('empty')}</Text> : occupations.map(item => <Button className="h-auto w-full justify-start whitespace-normal text-left" key={item.id} variant="outline" onClick={() => open(item.id)}>{item.name}</Button>)}</div>
      <DialogFooter><Button variant="outline" onClick={() => setChoosing(false)}>{tr('cancel')}</Button></DialogFooter>
    </Dialog>
  </div>
}
