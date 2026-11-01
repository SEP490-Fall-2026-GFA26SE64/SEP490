import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../shared/components/ui/Button'
import { Badge } from '../../../shared/components/ui/Badge'
import { Card, CardContent, CardHeader } from '../../../shared/components/ui/Card'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { Input } from '../../../shared/components/ui/Input'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { AdaptiveBaselineApiError } from './adaptiveBaselineApi'
import { AdaptiveErrorNotice, AdaptiveLoading } from './AdaptiveBaselineFeedback'
import { getAssessmentPolicy, listAssessmentPolicies, runPolicyCommand, type PolicyCommand, type PolicyPage, type PolicyState, type PolicyValues, type PolicyVersion } from './assessmentPolicyApi'

const fields = ['stopSe', 'highConfidenceSe', 'mediumConfidenceSe', 'k'] as const
type Field = typeof fields[number]
type Draft = Record<Field, string>
const suggestions: Draft = { stopSe: '0.5', highConfidenceSe: '0.35', mediumConfidenceSe: '0.7', k: '1' }
const draftOf = (values: PolicyValues): Draft => Object.fromEntries(fields.map(field => [field, String(values[field])])) as Draft

export function AssessmentPolicyTab({ onPendingChange, returnToBaseline }: { onPendingChange: (pending: boolean) => void; returnToBaseline?: string }) {
  const navigate = useNavigate()
  const { t, language } = useTranslation(), tr = (key: string) => t(`assessmentPolicy.${key}`)
  const [state, setState] = useState<PolicyState | null>(null), [versions, setVersions] = useState<PolicyPage | null>(null)
  const [page, setPage] = useState(0), [reload, setReload] = useState(0), [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<Draft | null>(null), [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [error, setError] = useState<AdaptiveBaselineApiError | null>(null), [notice, setNotice] = useState('')
  const [pending, setPending] = useState<PolicyCommand | null>(null), [busy, setBusy] = useState(false), [needsRefresh, setNeedsRefresh] = useState(false)
  const [confirm, setConfirm] = useState<PolicyVersion | null>(null)
  const inFlight = useRef(false), summary = useRef<HTMLDivElement>(null)
  useEffect(() => { onPendingChange(busy || pending !== null || needsRefresh) }, [busy, pending, needsRefresh, onPendingChange])
  useEffect(() => () => onPendingChange(false), [onPendingChange])
  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([getAssessmentPolicy(controller.signal), listAssessmentPolicies(page, controller.signal)])
      .then(([current, list]) => {
        if (controller.signal.aborted) return
        setState(current); setVersions(list); setError(null); setNeedsRefresh(false)
        setDraft(previous => previous ?? (current.active ? draftOf(current.active.pin.values) : { ...suggestions }))
      })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(asError(cause)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [page, reload])
  const locked = busy || pending !== null || needsRefresh || loading || !state
  async function execute(command: PolicyCommand) {
    if (inFlight.current) return
    inFlight.current = true; setBusy(true); setPending(command); setError(null); setNotice(''); setConfirm(null)
    try {
      const result = await runPolicyCommand(command)
      setPending(null)
      setNotice(result.kind === 'saved' ? (result.noOp ? 'unchanged' : 'saved') : 'activated')
      setLoading(true); setPage(0); setReload(value => value + 1)
    } catch (cause: unknown) {
      const failure = asError(cause); setError(failure)
      const uncertain = failure.status === 0 || failure.status >= 500 || failure.code === 'INVALID_RESPONSE'
      if (!uncertain) setPending(null)
      if (failure.status === 409) setNeedsRefresh(true)
    } finally { inFlight.current = false; setBusy(false) }
  }
  function save() {
    if (locked || !draft) return
    const invalid: Partial<Record<Field, string>> = {}
    const values = {} as PolicyValues
    for (const field of fields) {
      const raw = draft[field].trim(), value = Number(raw)
      if (!raw) invalid[field] = tr('required')
      else if (!Number.isFinite(value) || value <= 0) invalid[field] = tr('positive')
      values[field] = value
    }
    if (!invalid.mediumConfidenceSe && !invalid.highConfidenceSe && values.mediumConfidenceSe <= values.highConfidenceSe) invalid.mediumConfidenceSe = tr('ordered')
    if (!invalid.k && values.k > 10) invalid.k = tr('kRange')
    setErrors(invalid)
    if (Object.keys(invalid).length) { queueMicrotask(() => summary.current?.focus()); return }
    void execute({ kind: 'save', commandKey: crypto.randomUUID(), values })
  }
  return <div className="space-y-5">
    {returnToBaseline && <div role="status" className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <Text variant="body-sm">{tr(state?.active ? 'readyToReturn' : 'requiredForBaseline')}</Text>
      <Button variant="outline" disabled={locked || !state?.active || error !== null} onClick={() => navigate(returnToBaseline)}>{tr('returnBaseline')}</Button>
    </div>}
    <Card><CardHeader><Heading level={2} size="section">{tr('title')}</Heading><Text>{tr('description')}</Text></CardHeader>
      <CardContent className="space-y-4">
        {loading && <AdaptiveLoading />}
        {error && <AdaptiveErrorNotice error={error} />}
        {needsRefresh && <Text role="alert" tone="destructive">{tr('stale')}</Text>}
        {notice && <Text role="status" tone="success">{tr(notice)}</Text>}
        {!loading && state && <div className="flex flex-wrap items-center gap-3"><Badge variant={state.active ? 'success' : 'warning'}>{state.active ? `${tr('activeVersion')} ${state.active.version}` : tr('noActive')}</Badge><Text variant="body-sm">{tr('historyHelp')}</Text></div>}
        {pending && !busy && <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/5 p-4"><Text role="status">{tr('uncertain')}</Text><Button variant="outline" onClick={() => void execute(pending)}>{tr('retry')}</Button></div>}
        <Button variant="outline" disabled={busy} onClick={() => { setLoading(true); setReload(value => value + 1) }}>{tr('refresh')}</Button>
        {draft && <form className="space-y-4" noValidate onSubmit={event => { event.preventDefault(); save() }}>
          {Object.keys(errors).length > 0 && <div ref={summary} tabIndex={-1} role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-destructive"><Text>{tr('errorSummary')}</Text><ul className="list-disc pl-5">{fields.filter(field => errors[field]).map(field => <li key={field}><a href={`#assessment-policy-${field}`} className="underline">{tr(field)}: {errors[field]}</a></li>)}</ul></div>}
          <div className="grid gap-4 md:grid-cols-2">{fields.map(field => <div key={field} className="space-y-2">
            <label htmlFor={`assessment-policy-${field}`} className="text-body-sm font-medium">{tr(field)} <span aria-hidden="true">*</span></label>
            <Input id={`assessment-policy-${field}`} type="number" step="any" required value={draft[field]} disabled={locked}
              aria-invalid={Boolean(errors[field])} aria-describedby={`assessment-policy-${field}-help${errors[field] ? ` assessment-policy-${field}-error` : ''}`}
              onChange={event => { setDraft({ ...draft, [field]: event.target.value }); setErrors(previous => ({ ...previous, [field]: undefined })) }} />
            <Text id={`assessment-policy-${field}-help`} variant="caption">{tr(`${field}Help`)}</Text>
            {errors[field] && <Text id={`assessment-policy-${field}-error`} role="alert" variant="body-sm" tone="destructive">{errors[field]}</Text>}
          </div>)}</div>
          <Text variant="body-sm">{tr('suggestionsHelp')}</Text>
          <div className="flex flex-wrap gap-2"><Button type="submit" disabled={locked}>{busy ? tr('saving') : tr('save')}</Button>
            <Button type="button" variant="outline" disabled={locked || !state?.active} onClick={() => { if (state?.active) { setDraft(draftOf(state.active.pin.values)); setErrors({}) } }}>{tr('useActive')}</Button></div>
        </form>}
      </CardContent></Card>
    <Card><CardHeader><Heading level={2} size="subsection">{tr('versions')}</Heading></CardHeader><CardContent className="space-y-3">
      {versions?.items.length === 0 && <Text>{tr('noVersions')}</Text>}
      {versions?.items.map(version => <div key={version.pin.versionId} className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1"><Heading level={3} size="card">{tr('version')} {version.version}</Heading><Text variant="caption">{new Date(version.createdAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}</Text><Text variant="body-sm">{fields.map(field => `${tr(field)}: ${version.pin.values[field]}`).join(' · ')}</Text></div>
        {state?.active?.pin.versionId === version.pin.versionId ? <Badge variant="success">{tr('active')}</Badge> : <Button variant="outline" disabled={locked} onClick={() => setConfirm(version)}>{tr('activate')}</Button>}
      </div>)}
      {versions && <Pagination currentPage={page + 1} totalPages={Math.max(1, Math.ceil(versions.total / 20))} totalItems={versions.total} pageSize={20} onPageChange={value => { setLoading(true); setPage(value - 1) }} disabled={locked} locale={language === 'vi' ? 'vi' : 'en'} />}
    </CardContent></Card>
    <Dialog open={confirm !== null} onOpenChange={open => { if (!open) setConfirm(null) }} ariaLabel={tr('confirmTitle')}>
      <DialogHeader><DialogTitle>{tr('confirmTitle')}</DialogTitle><DialogDescription>{tr('confirmHelp')}</DialogDescription></DialogHeader>
      <DialogFooter><Button variant="outline" onClick={() => setConfirm(null)}>{t('common.cancel')}</Button><Button disabled={busy || !confirm || !state} onClick={() => { if (confirm && state) void execute({ kind: 'activate', commandKey: crypto.randomUUID(), policyVersionId: confirm.pin.versionId, expectedActivationRevision: state.activationRevision }) }}>{tr('activate')}</Button></DialogFooter>
    </Dialog>
  </div>
}
function asError(cause: unknown): AdaptiveBaselineApiError { return cause instanceof AdaptiveBaselineApiError ? cause : new AdaptiveBaselineApiError(0, 'NETWORK_ERROR') }
