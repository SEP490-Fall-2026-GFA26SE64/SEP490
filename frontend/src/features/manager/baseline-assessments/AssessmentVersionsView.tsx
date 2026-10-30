import { AlertCircle, ArrowLeft, ClipboardCheck, FilePlus2, RotateCcw, Trash2 } from 'lucide-react'
import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { Input } from '../../../shared/components/ui/Input'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Tabs, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'
import { useToast } from '../../../shared/hooks/useToast'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import {
  abandonPendingBlueprintChange,
  BaselineAssessmentManagementApiError,
  type AssessmentVersionSummary,
  type BaselineAssessmentWorkspace,
  generateAssessmentCandidate,
  getBaselineAssessmentWorkspace,
  restoreHistoricalAssessment,
} from './baselineAssessmentManagementApi'

type Filter = 'ALL' | 'OPEN' | 'ACTIVE' | 'HISTORY'

export function AssessmentVersionsView() {
  const { occupationId = '' } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { language, t } = useTranslation()
  const [workspace, setWorkspace] = React.useState<BaselineAssessmentWorkspace | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [filter, setFilter] = React.useState<Filter>('ALL')
  const [busy, setBusy] = React.useState<'generate' | 'restore' | 'abandon' | null>(null)
  const [abandonOpen, setAbandonOpen] = React.useState(false)
  const [abandonReason, setAbandonReason] = React.useState('')
  const generateKey = React.useRef<string | null>(null)
  const restoreKeys = React.useRef<Record<string, string>>({})
  const basePath = `/ld-manager/baseline-assessments/${encodeURIComponent(occupationId)}`

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setWorkspace(await getBaselineAssessmentWorkspace(occupationId))
    } catch (cause) {
      setError(errorMessage(cause, t))
    } finally {
      setLoading(false)
    }
  }, [occupationId, t])

  React.useEffect(() => { void load() }, [load])

  const openCandidate = workspace?.assessmentVersions.find((item) => isOpen(item.effectiveState))
  const pendingBlueprint = workspace?.blueprintVersions.find((item) => item.projection === 'CANDIDATE')
  const pendingChange = Boolean(workspace?.workingRevision || pendingBlueprint || openCandidate)
  const visibleItems = workspace?.assessmentVersions.filter((item) => matchesFilter(item, filter)) ?? []

  const generate = async () => {
    setBusy('generate')
    try {
      generateKey.current ??= crypto.randomUUID()
      const created = await generateAssessmentCandidate(occupationId, generateKey.current)
      generateKey.current = null
      toast({ title: t('baselineAssessmentManagement.assessmentActions.generated').replace('{version}', String(created.version)), description: t('baselineAssessmentManagement.assessmentActions.generatedDescription'), variant: 'success' })
      navigate(`${basePath}/assessments/${created.assessmentVersionId}`)
    } catch (cause) {
      toast({ title: t('baselineAssessmentManagement.assessmentActions.generateFailed'), description: errorMessage(cause, t), variant: 'destructive' })
    } finally { setBusy(null) }
  }

  const restore = async (item: AssessmentVersionSummary) => {
    setBusy('restore')
    try {
      restoreKeys.current[item.assessmentVersionId] ??= crypto.randomUUID()
      const created = await restoreHistoricalAssessment(item.assessmentVersionId, restoreKeys.current[item.assessmentVersionId])
      delete restoreKeys.current[item.assessmentVersionId]
      toast({ title: t('baselineAssessmentManagement.assessmentActions.restored').replace('{version}', String(created.version)), description: t('baselineAssessmentManagement.assessmentActions.restoredDescription'), variant: 'success' })
      navigate(`${basePath}/assessments/${created.assessmentVersionId}`)
    } catch (cause) {
      toast({ title: t('baselineAssessmentManagement.assessmentActions.restoreFailed'), description: errorMessage(cause, t), variant: 'destructive' })
    } finally { setBusy(null) }
  }

  const abandon = async () => {
    if (!abandonReason.trim()) return
    setBusy('abandon')
    try {
      const updated = await abandonPendingBlueprintChange(occupationId, abandonReason.trim())
      setWorkspace(updated)
      setAbandonOpen(false)
      setAbandonReason('')
      toast({ title: t('baselineAssessmentManagement.assessmentActions.abandoned'), description: t('baselineAssessmentManagement.assessmentActions.abandonedDescription'), variant: 'success' })
    } catch (cause) {
      toast({ title: t('baselineAssessmentManagement.assessmentActions.abandonFailed'), description: errorMessage(cause, t), variant: 'destructive' })
    } finally { setBusy(null) }
  }

  const changeTab = (tab: string) => navigate(`${basePath}/${tab}`)

  return <WorkspaceLayout><div className="space-y-6 pb-16">
    <PageHeader icon={<ClipboardCheck className="h-7 w-7" />} title={workspace?.occupationName ?? t('baselineAssessmentManagement.workspaceTitle')} description={t('baselineAssessmentManagement.workspaceDescription')} actions={<Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/ld-manager/baseline-assessments')}>{t('baselineAssessmentManagement.backToOccupations')}</Button>} />
    {error ? <EmptyState icon={<AlertCircle className="h-7 w-7" />} title={t('baselineAssessmentManagement.workspaceLoadFailed')} description={error} action={<Button size="sm" onClick={() => void load()}>{t('common.refresh')}</Button>} /> : loading || !workspace ? <div className="h-64 animate-pulse rounded-lg bg-muted/60" aria-busy="true" /> : <>
      <Tabs value="assessments" onValueChange={changeTab}><TabsList className="h-auto flex-wrap justify-start gap-1"><TabsTrigger value="blueprints">{t('baselineAssessmentManagement.tabs.blueprints')}</TabsTrigger><TabsTrigger value="assessments">{t('baselineAssessmentManagement.tabs.assessments')}</TabsTrigger></TabsList></Tabs>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-semibold text-foreground">{t('baselineAssessmentManagement.assessments.title')}</h2><p className="text-sm text-muted-foreground">{t('baselineAssessmentManagement.assessments.description')}</p></div><div className="flex flex-wrap gap-2">{openCandidate && <Button variant="outline" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setAbandonOpen(true)}>{t('baselineAssessmentManagement.assessmentActions.abandon')}</Button>}<Button size="sm" leftIcon={<FilePlus2 className="h-4 w-4" />} disabled={!pendingBlueprint || Boolean(openCandidate) || Boolean(workspace.workingRevision)} isLoading={busy === 'generate'} onClick={() => void generate()}>{t('baselineAssessmentManagement.assessmentActions.generate')}</Button></div></div>
      {!pendingBlueprint && workspace.assessmentVersions.length === 0 && <Card className="border-warning/50 bg-warning/5"><CardContent className="pt-6 text-sm text-muted-foreground">{t('baselineAssessmentManagement.assessmentActions.finalizeFirst')}</CardContent></Card>}
      <div className="flex justify-end"><select value={filter} onChange={(event) => setFilter(event.target.value as Filter)} className="h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground"><option value="ALL">{t('baselineAssessmentManagement.assessmentFilters.all')}</option><option value="OPEN">{t('baselineAssessmentManagement.assessmentFilters.open')}</option><option value="ACTIVE">{t('baselineAssessmentManagement.assessmentFilters.active')}</option><option value="HISTORY">{t('baselineAssessmentManagement.assessmentFilters.history')}</option></select></div>
      {visibleItems.length === 0 ? <EmptyState icon={<ClipboardCheck className="h-7 w-7" />} title={t('baselineAssessmentManagement.assessments.empty')} description={t('baselineAssessmentManagement.assessments.emptyDescription')} /> : <Card className="overflow-hidden"><div className="divide-y divide-border">{visibleItems.map((item) => <div key={item.assessmentVersionId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><button type="button" className="min-w-0 text-left" onClick={() => navigate(`${basePath}/assessments/${item.assessmentVersionId}`)}><p className="font-semibold text-foreground">{t('baselineAssessmentManagement.assessments.version').replace('{version}', String(item.version))}</p><p className="mt-1 text-xs text-muted-foreground">{t('baselineAssessmentManagement.assessments.sourceVersion').replace('{version}', String(item.blueprintVersion))} · {formatDate(item.createdAt, language)}</p><p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{shortHash(item.contentHash)}</p></button><div className="flex items-center gap-2"><Badge variant={stateVariant(item.effectiveState)}>{stateLabel(item.effectiveState, t)}</Badge>{canRestore(item, pendingChange) && <Button variant="outline" size="sm" leftIcon={<RotateCcw className="h-3.5 w-3.5" />} isLoading={busy === 'restore'} onClick={() => void restore(item)}>{t('baselineAssessmentManagement.assessmentActions.restore')}</Button>}<Button variant="outline" size="sm" onClick={() => navigate(`${basePath}/assessments/${item.assessmentVersionId}`)}>{t('baselineAssessmentManagement.assessmentActions.open')}</Button></div></div>)}</div></Card>}
    </>}
  </div>
  <Dialog open={abandonOpen} onOpenChange={setAbandonOpen}><DialogHeader><DialogTitle>{t('baselineAssessmentManagement.assessmentActions.abandonTitle')}</DialogTitle></DialogHeader><DialogDescription>{t('baselineAssessmentManagement.assessmentActions.abandonDescription')}</DialogDescription><label className="mt-4 block space-y-1 text-sm font-medium">{t('baselineAssessmentManagement.blueprints.reason')}<Input value={abandonReason} onChange={(event) => setAbandonReason(event.target.value)} /></label><DialogFooter className="mt-6"><Button variant="outline" disabled={busy !== null} onClick={() => setAbandonOpen(false)}>{t('common.cancel')}</Button><Button variant="destructive" isLoading={busy === 'abandon'} disabled={!abandonReason.trim()} onClick={() => void abandon()}>{t('baselineAssessmentManagement.assessmentActions.abandon')}</Button></DialogFooter></Dialog>
  </WorkspaceLayout>
}

type Translate = (key: string, fallback?: string) => string
function isOpen(state: string) { return state === 'DRAFT' || state === 'REVIEWED' }
function matchesFilter(item: AssessmentVersionSummary, filter: Filter) { if (filter === 'ALL') return true; if (filter === 'OPEN') return isOpen(item.effectiveState); if (filter === 'ACTIVE') return item.effectiveState === 'ACTIVE'; return !isOpen(item.effectiveState) && item.effectiveState !== 'ACTIVE' }
function canRestore(item: AssessmentVersionSummary, pending: boolean) { return !pending && item.effectiveState !== 'ACTIVE' && item.effectiveState !== 'DRAFT' && item.effectiveState !== 'REVIEWED' }
function stateVariant(state: string): 'success' | 'warning' | 'destructive' | 'outline' { if (state === 'ACTIVE') return 'success'; if (state === 'DRAFT' || state === 'REVIEWED') return 'warning'; if (state === 'DISABLED') return 'destructive'; return 'outline' }
function stateLabel(state: string, t: Translate) { const key = `baselineAssessmentManagement.state.${state.toLowerCase()}`; const translated = t(key); return translated === key ? state : translated }
function formatDate(value: string, language: 'en' | 'vi') { return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function shortHash(hash: string) { return `${hash.slice(0, 12)}…${hash.slice(-8)}` }
function errorMessage(cause: unknown, t: Translate) { if (cause instanceof BaselineAssessmentManagementApiError) { const key = `baselineAssessmentManagement.apiErrors.${cause.code}`; const translated = t(key); return `${cause.code}: ${translated === key ? cause.message : translated}` } return t('baselineAssessmentManagement.apiErrors.unexpected') }
