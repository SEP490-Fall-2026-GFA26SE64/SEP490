import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, FileEdit, RotateCcw, Send, ShieldOff, Trash2 } from 'lucide-react'
import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { Input } from '../../../shared/components/ui/Input'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { useToast } from '../../../shared/hooks/useToast'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { AssessmentManifestEditor } from './AssessmentManifestEditor'
import {
  abandonPendingBlueprintChange,
  BaselineAssessmentManagementApiError,
  disableActiveAssessment,
  editAssessmentManifest,
  getBaselineAssessmentWorkspace,
  getManagedAssessmentVersion,
  publishAssessmentCandidate,
  replaceReviewedAssessmentCandidate,
  restoreHistoricalAssessment,
  revealProtectedAssessmentAnswers,
  reviewAssessmentCandidate,
  type ManagedAssessmentItem,
  type ManagedAssessmentVersion,
} from './baselineAssessmentManagementApi'

type BusyAction = 'save' | 'review' | 'publish' | 'replace' | 'restore' | 'disable' | 'abandon' | 'reveal' | null
type ReasonAction = 'disable' | 'abandon' | null

export function AssessmentVersionPage() {
  const { occupationId = '', assessmentVersionId = '' } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { language, t } = useTranslation()
  const basePath = `/ld-manager/baseline-assessments/${encodeURIComponent(occupationId)}`
  const [assessment, setAssessment] = React.useState<ManagedAssessmentVersion | null>(null)
  const [effectiveState, setEffectiveState] = React.useState('')
  const [hasPendingChange, setHasPendingChange] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [items, setItems] = React.useState<ManagedAssessmentItem[]>([])
  const [dirty, setDirty] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState<BusyAction>(null)
  const [publishOpen, setPublishOpen] = React.useState(false)
  const [reasonAction, setReasonAction] = React.useState<ReasonAction>(null)
  const [reason, setReason] = React.useState('')
  const [revealedAnswers, setRevealedAnswers] = React.useState<Record<string, unknown>>({})
  const saveKey = React.useRef<string | null>(null)
  const cloneKey = React.useRef<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [detail, workspace] = await Promise.all([
        getManagedAssessmentVersion(assessmentVersionId),
        getBaselineAssessmentWorkspace(occupationId),
      ])
      const summary = workspace.assessmentVersions.find((item) => item.assessmentVersionId === assessmentVersionId)
      if (!summary) throw new Error('Assessment version is outside this Occupation workspace')
      setAssessment(detail)
      setEffectiveState(summary.effectiveState)
      setHasPendingChange(Boolean(
        workspace.workingRevision
        || workspace.blueprintVersions.some((item) => item.projection === 'CANDIDATE')
        || workspace.assessmentVersions.some((item) => item.effectiveState === 'DRAFT' || item.effectiveState === 'REVIEWED'),
      ))
      setTitle(detail.title)
      setItems(detail.items)
      setRevealedAnswers({})
      setDirty(false)
    } catch (cause) {
      setError(errorMessage(cause, t))
    } finally { setLoading(false) }
  }, [assessmentVersionId, occupationId, t])

  React.useEffect(() => { void load() }, [load])

  const markTitle = (value: string) => { saveKey.current = null; setTitle(value); setDirty(true) }
  const markItems = (value: ManagedAssessmentItem[]) => { saveKey.current = null; setItems(value); setDirty(true) }

  const toggleAnswers = async () => {
    if (!assessment) return
    if (Object.keys(revealedAnswers).length > 0) { setRevealedAnswers({}); return }
    setBusy('reveal')
    try {
      const revealed = await revealProtectedAssessmentAnswers(assessment.assessmentVersionId)
      setRevealedAnswers(Object.fromEntries(revealed.items.map((item) => [item.itemVersionId, item.protectedKey])))
      toast({ title: t('baselineAssessmentManagement.answerReview.revealed'), description: t('baselineAssessmentManagement.answerReview.revealedDescription'), variant: 'success' })
    } catch (cause) { toastError('revealFailed', cause, toast, t) } finally { setBusy(null) }
  }

  const save = async () => {
    if (!assessment || !title.trim() || items.length === 0) return
    setBusy('save')
    try {
      saveKey.current ??= crypto.randomUUID()
      const updated = await editAssessmentManifest(assessment.assessmentVersionId, assessment.draftRevision, title.trim(), items.map((item) => item.itemVersionId), saveKey.current)
      saveKey.current = null
      setAssessment(updated); setTitle(updated.title); setItems(updated.items); setDirty(false)
      toast({ title: t('baselineAssessmentManagement.assessmentActions.saved').replace('{revision}', String(updated.draftRevision)), description: t('baselineAssessmentManagement.assessmentActions.savedDescription'), variant: 'success' })
    } catch (cause) { toastError('saveFailed', cause, toast, t) } finally { setBusy(null) }
  }

  const review = async () => {
    if (!assessment || dirty) return
    setBusy('review')
    try {
      const reviewed = await reviewAssessmentCandidate(assessment.assessmentVersionId, assessment.contentHash)
      setAssessment(reviewed); setEffectiveState('REVIEWED')
      setHasPendingChange(true)
      toast({ title: t('baselineAssessmentManagement.assessmentActions.reviewed'), description: t('baselineAssessmentManagement.assessmentActions.reviewedDescription'), variant: 'success' })
    } catch (cause) { toastError('reviewFailed', cause, toast, t) } finally { setBusy(null) }
  }

  const publish = async () => {
    if (!assessment) return
    setBusy('publish')
    try {
      const published = await publishAssessmentCandidate(assessment.assessmentVersionId, assessment.contentHash)
      setAssessment(published); setEffectiveState('ACTIVE'); setPublishOpen(false)
      setHasPendingChange(false)
      toast({ title: t('baselineAssessmentManagement.assessmentActions.published'), description: t('baselineAssessmentManagement.assessmentActions.publishedDescription'), variant: 'success' })
    } catch (cause) { toastError('publishFailed', cause, toast, t) } finally { setBusy(null) }
  }

  const clone = async (action: 'replace' | 'restore') => {
    if (!assessment) return
    setBusy(action)
    try {
      cloneKey.current ??= crypto.randomUUID()
      const created = action === 'replace'
        ? await replaceReviewedAssessmentCandidate(assessment.assessmentVersionId, cloneKey.current)
        : await restoreHistoricalAssessment(assessment.assessmentVersionId, cloneKey.current)
      cloneKey.current = null
      toast({ title: t(`baselineAssessmentManagement.assessmentActions.${action === 'replace' ? 'replaced' : 'restored'}`).replace('{version}', String(created.version)), description: t(`baselineAssessmentManagement.assessmentActions.${action === 'replace' ? 'replacedDescription' : 'restoredDescription'}`), variant: 'success' })
      navigate(`${basePath}/assessments/${created.assessmentVersionId}`)
    } catch (cause) { toastError(action === 'replace' ? 'replaceFailed' : 'restoreFailed', cause, toast, t) } finally { setBusy(null) }
  }

  const submitReason = async () => {
    if (!assessment || !reasonAction || !reason.trim()) return
    const action = reasonAction
    setBusy(action)
    try {
      if (action === 'disable') {
        await disableActiveAssessment(assessment.assessmentVersionId, reason.trim())
        setEffectiveState('DISABLED')
        setHasPendingChange(false)
        toast({ title: t('baselineAssessmentManagement.assessmentActions.disabled'), description: t('baselineAssessmentManagement.assessmentActions.disabledDescription'), variant: 'success' })
      } else {
        await abandonPendingBlueprintChange(occupationId, reason.trim())
        setEffectiveState('ABANDONED')
        setHasPendingChange(false)
        toast({ title: t('baselineAssessmentManagement.assessmentActions.abandoned'), description: t('baselineAssessmentManagement.assessmentActions.abandonedDescription'), variant: 'success' })
      }
      setReasonAction(null); setReason('')
    } catch (cause) { toastError(action === 'disable' ? 'disableFailed' : 'abandonFailed', cause, toast, t) } finally { setBusy(null) }
  }

  const editable = effectiveState === 'DRAFT'
  const historical = ['SUPERSEDED', 'DISABLED', 'ABANDONED', 'PUBLISHED'].includes(effectiveState)

  return <WorkspaceLayout><div className="space-y-6 pb-16">
    <PageHeader icon={<ClipboardCheckIcon />} title={assessment ? t('baselineAssessmentManagement.assessments.version').replace('{version}', String(assessment.version)) : t('baselineAssessmentManagement.assessments.detailTitle')} description={t('baselineAssessmentManagement.assessments.detailDescription')} actions={<Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate(`${basePath}/assessments`)}>{t('baselineAssessmentManagement.assessments.backToVersions')}</Button>} />
    {error ? <EmptyState icon={<AlertCircle className="h-7 w-7" />} title={t('baselineAssessmentManagement.assessments.loadFailed')} description={error} action={<Button size="sm" onClick={() => void load()}>{t('common.refresh')}</Button>} /> : loading || !assessment ? <div className="h-80 animate-pulse rounded-lg bg-muted/60" aria-busy="true" /> : <>
      <Card><CardContent className="pt-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><dl className="grid flex-1 gap-3 text-sm sm:grid-cols-4"><Info label={t('common.status')} value={<Badge variant={stateVariant(effectiveState)}>{stateLabel(effectiveState, t)}</Badge>} /><Info label={t('baselineAssessmentManagement.assessments.sourceBlueprint')} value={<button type="button" className="font-medium text-primary hover:underline" onClick={() => navigate(`${basePath}/blueprints/${assessment.blueprintId}/versions/${assessment.blueprintVersion}`)}>{t('baselineAssessmentManagement.assessments.sourceVersion').replace('{version}', String(assessment.blueprintVersion))}</button>} /><Info label={t('baselineAssessmentManagement.assessments.created')} value={formatDate(assessment.createdAt, language)} /><Info label={t('baselineAssessmentManagement.assessments.contentHash')} value={<span className="font-mono text-xs" title={assessment.contentHash}>{shortHash(assessment.contentHash)}</span>} /></dl><div className="flex flex-wrap gap-2"><Button variant="outline" leftIcon={Object.keys(revealedAnswers).length > 0 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} isLoading={busy === 'reveal'} onClick={() => void toggleAnswers()}>{t(`baselineAssessmentManagement.answerReview.${Object.keys(revealedAnswers).length > 0 ? 'hide' : 'show'}`)}</Button>{editable && <><Button variant="outline" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setReasonAction('abandon')}>{t('baselineAssessmentManagement.assessmentActions.abandon')}</Button><Button variant="outline" leftIcon={<FileEdit className="h-4 w-4" />} isLoading={busy === 'save'} disabled={!dirty || !title.trim()} onClick={() => void save()}>{t('baselineAssessmentManagement.assessmentActions.save')}</Button><Button leftIcon={<CheckCircle2 className="h-4 w-4" />} isLoading={busy === 'review'} disabled={dirty} onClick={() => void review()}>{t('baselineAssessmentManagement.assessmentActions.review')}</Button></>}{effectiveState === 'REVIEWED' && <><Button variant="outline" leftIcon={<FileEdit className="h-4 w-4" />} isLoading={busy === 'replace'} onClick={() => void clone('replace')}>{t('baselineAssessmentManagement.assessmentActions.replace')}</Button><Button variant="outline" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setReasonAction('abandon')}>{t('baselineAssessmentManagement.assessmentActions.abandon')}</Button><Button leftIcon={<Send className="h-4 w-4" />} onClick={() => setPublishOpen(true)}>{t('baselineAssessmentManagement.assessmentActions.publish')}</Button></>}{effectiveState === 'ACTIVE' && <Button variant="destructive" leftIcon={<ShieldOff className="h-4 w-4" />} onClick={() => setReasonAction('disable')}>{t('baselineAssessmentManagement.assessmentActions.disable')}</Button>}{historical && <Button variant="outline" leftIcon={<RotateCcw className="h-4 w-4" />} isLoading={busy === 'restore'} disabled={hasPendingChange} title={hasPendingChange ? t('baselineAssessmentManagement.assessmentActions.restoreBlocked') : undefined} onClick={() => void clone('restore')}>{t('baselineAssessmentManagement.assessmentActions.restore')}</Button>}</div></div></CardContent></Card>
      {effectiveState === 'REVIEWED' && <Card className="border-warning/50 bg-warning/5"><CardContent className="pt-6 text-sm"><strong>{t('baselineAssessmentManagement.assessments.reviewLockedTitle')}</strong><p className="mt-1 text-muted-foreground">{t('baselineAssessmentManagement.assessments.reviewLockedDescription')}</p></CardContent></Card>}
      <AssessmentManifestEditor title={title} items={items} editable={editable} disabled={busy !== null} revealedAnswers={revealedAnswers} onTitleChange={markTitle} onItemsChange={markItems} />
    </>}
  </div>
  <Dialog open={publishOpen} onOpenChange={setPublishOpen}><DialogHeader><DialogTitle>{t('baselineAssessmentManagement.assessmentActions.publishTitle')}</DialogTitle></DialogHeader><DialogDescription>{t('baselineAssessmentManagement.assessmentActions.publishDescription')}</DialogDescription><DialogFooter className="mt-6"><Button variant="outline" disabled={busy !== null} onClick={() => setPublishOpen(false)}>{t('common.cancel')}</Button><Button isLoading={busy === 'publish'} onClick={() => void publish()}>{t('baselineAssessmentManagement.assessmentActions.publish')}</Button></DialogFooter></Dialog>
  <Dialog open={reasonAction !== null} onOpenChange={(open) => { if (!open) { setReasonAction(null); setReason('') } }}><DialogHeader><DialogTitle>{t(`baselineAssessmentManagement.assessmentActions.${reasonAction === 'disable' ? 'disableTitle' : 'abandonTitle'}`)}</DialogTitle></DialogHeader><DialogDescription>{t(`baselineAssessmentManagement.assessmentActions.${reasonAction === 'disable' ? 'disableDescription' : 'abandonDescription'}`)}</DialogDescription><label className="mt-4 block space-y-1 text-sm font-medium">{t('baselineAssessmentManagement.blueprints.reason')}<Input value={reason} onChange={(event) => setReason(event.target.value)} /></label><DialogFooter className="mt-6"><Button variant="outline" disabled={busy !== null} onClick={() => { setReasonAction(null); setReason('') }}>{t('common.cancel')}</Button><Button variant="destructive" isLoading={busy === 'disable' || busy === 'abandon'} disabled={!reason.trim()} onClick={() => void submitReason()}>{t(`baselineAssessmentManagement.assessmentActions.${reasonAction === 'disable' ? 'disable' : 'abandon'}`)}</Button></DialogFooter></Dialog>
  </WorkspaceLayout>
}

function ClipboardCheckIcon() { return <CheckCircle2 className="h-7 w-7" /> }
type Translate = (key: string, fallback?: string) => string
type Toast = ReturnType<typeof useToast>['toast']
function Info({ label, value }: { label: string; value: React.ReactNode }) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium text-foreground">{value}</dd></div> }
function stateVariant(state: string): 'success' | 'warning' | 'destructive' | 'outline' { if (state === 'ACTIVE') return 'success'; if (state === 'DRAFT' || state === 'REVIEWED') return 'warning'; if (state === 'DISABLED') return 'destructive'; return 'outline' }
function stateLabel(state: string, t: Translate) { const key = `baselineAssessmentManagement.state.${state.toLowerCase()}`; const translated = t(key); return translated === key ? state : translated }
function formatDate(value: string, language: 'en' | 'vi') { return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function shortHash(hash: string) { return `${hash.slice(0, 12)}…${hash.slice(-8)}` }
function errorMessage(cause: unknown, t: Translate) { if (cause instanceof BaselineAssessmentManagementApiError) { const key = `baselineAssessmentManagement.apiErrors.${cause.code}`; const translated = t(key); return `${cause.code}: ${translated === key ? cause.message : translated}` } return cause instanceof Error ? cause.message : t('baselineAssessmentManagement.apiErrors.unexpected') }
function toastError(key: string, cause: unknown, toast: Toast, t: Translate) { toast({ title: t(`baselineAssessmentManagement.assessmentActions.${key}`), description: errorMessage(cause, t), variant: 'destructive' }) }
