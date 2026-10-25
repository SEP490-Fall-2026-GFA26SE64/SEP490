import {
  AlertCircle,
  ArrowLeft,
  ClipboardList,
  FileClock,
  FileEdit,
  FilePlus2,
  History,
  Plus,
  Trash2,
} from 'lucide-react'
import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { Input } from '../../../shared/components/ui/Input'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Tabs, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'
import { useToast } from '../../../shared/hooks/useToast'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { getBlueprintVersion, type BaselineBlueprint } from '../baseline-blueprints/baselineBlueprintApi'
import { roleQuestionTotal } from '../baseline-blueprints/baselineBlueprintForm'
import {
  abandonPendingBlueprintChange,
  BaselineAssessmentManagementApiError,
  type BaselineAssessmentWorkspace,
  type BlueprintVersionSummary,
  type BlueprintWorkingRevision,
  getBaselineAssessmentWorkspace,
  generateAssessmentCandidate,
  startBlueprintWorkingRevision,
} from './baselineAssessmentManagementApi'

export function BlueprintVersionsView() {
  const { occupationId = '', blueprintId, version } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { language, t } = useTranslation()
  const [workspace, setWorkspace] = React.useState<BaselineAssessmentWorkspace | null>(null)
  const [blueprint, setBlueprint] = React.useState<BaselineBlueprint | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState<'start' | 'generate' | 'abandon' | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadRevision, setReloadRevision] = React.useState(0)
  const [abandonOpen, setAbandonOpen] = React.useState(false)
  const [abandonReason, setAbandonReason] = React.useState('')
  const startKey = React.useRef<string | null>(null)
  const generateKey = React.useRef<string | null>(null)

  React.useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    const blueprintVersion = Number(version)
    const detail = blueprintId && Number.isInteger(blueprintVersion) && blueprintVersion > 0
      ? getBlueprintVersion(blueprintId, blueprintVersion)
      : Promise.resolve(null)
    void Promise.all([getBaselineAssessmentWorkspace(occupationId, controller.signal), detail])
      .then(([loadedWorkspace, loadedBlueprint]) => {
        setWorkspace(loadedWorkspace)
        setBlueprint(loadedBlueprint)
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(errorMessage(cause, t))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [blueprintId, occupationId, reloadRevision, t, version])

  const basePath = `/ld-manager/baseline-assessments/${encodeURIComponent(occupationId)}`
  const hasAssessmentPending = workspace?.assessmentVersions.some((item) =>
    item.effectiveState === 'DRAFT' || item.effectiveState === 'REVIEWED') ?? false
  const candidateBlueprint = workspace?.blueprintVersions.find((item) => item.projection === 'CANDIDATE')
  const hasPending = Boolean(workspace?.workingRevision || candidateBlueprint || hasAssessmentPending)

  const changeTab = (tab: string) => {
    if (tab === 'blueprints') navigate(`${basePath}/blueprints`)
    if (tab === 'assessments') navigate(`${basePath}/assessments`)
  }

  const startRevision = async () => {
    setBusy('start')
    try {
      startKey.current ??= crypto.randomUUID()
      await startBlueprintWorkingRevision(occupationId, startKey.current)
      startKey.current = null
      navigate(`${basePath}/blueprints/revision`)
    } catch (cause) {
      toast({ title: t('baselineAssessmentManagement.blueprints.startFailed'), description: errorMessage(cause, t), variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  const abandon = async () => {
    if (!abandonReason.trim()) return
    setBusy('abandon')
    try {
      const updated = await abandonPendingBlueprintChange(occupationId, abandonReason.trim())
      setWorkspace(updated)
      setAbandonOpen(false)
      setAbandonReason('')
      toast({ title: t('baselineAssessmentManagement.blueprints.abandoned'), description: t('baselineAssessmentManagement.blueprints.abandonedDescription'), variant: 'success' })
    } catch (cause) {
      toast({ title: t('baselineAssessmentManagement.blueprints.abandonFailed'), description: errorMessage(cause, t), variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  const generateAssessment = async () => {
    setBusy('generate')
    try {
      generateKey.current ??= crypto.randomUUID()
      const created = await generateAssessmentCandidate(occupationId, generateKey.current)
      generateKey.current = null
      toast({ title: t('baselineAssessmentManagement.assessmentActions.generated').replace('{version}', String(created.version)), description: t('baselineAssessmentManagement.assessmentActions.generatedDescription'), variant: 'success' })
      navigate(`${basePath}/assessments/${created.assessmentVersionId}`)
    } catch (cause) {
      toast({ title: t('baselineAssessmentManagement.assessmentActions.generateFailed'), description: errorMessage(cause, t), variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        <PageHeader
          icon={<ClipboardList className="h-7 w-7" />}
          title={workspace?.occupationName ?? t('baselineAssessmentManagement.workspaceTitle')}
          description={t('baselineAssessmentManagement.workspaceDescription')}
          actions={<Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/ld-manager/baseline-assessments')}>{t('baselineAssessmentManagement.backToOccupations')}</Button>}
        />

        {error ? (
          <EmptyState icon={<AlertCircle className="h-7 w-7" />} title={t('baselineAssessmentManagement.workspaceLoadFailed')} description={error} action={<Button size="sm" onClick={() => setReloadRevision((value) => value + 1)}>{t('common.refresh')}</Button>} />
        ) : loading || !workspace ? (
          <WorkspaceLoading />
        ) : (
          <Tabs value="blueprints" onValueChange={changeTab}>
            <TabsList className="h-auto flex-wrap justify-start gap-1">
              <TabsTrigger value="blueprints">{t('baselineAssessmentManagement.tabs.blueprints')}</TabsTrigger>
              <TabsTrigger value="assessments">{t('baselineAssessmentManagement.tabs.assessments')}</TabsTrigger>
            </TabsList>
            <div className="mt-5 space-y-4">
              {blueprint ? (
                <BlueprintDetail blueprint={blueprint} t={t} language={language} onBack={() => navigate(`${basePath}/blueprints`)} />
              ) : (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">{t('baselineAssessmentManagement.blueprints.title')}</h2>
                      <p className="text-sm text-muted-foreground">{t('baselineAssessmentManagement.blueprints.description')}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {candidateBlueprint && !hasAssessmentPending && (
                        <Button size="sm" leftIcon={<FilePlus2 className="h-4 w-4" />} isLoading={busy === 'generate'} onClick={() => void generateAssessment()}>{t('baselineAssessmentManagement.revision.generateAssessment')}</Button>
                      )}
                      {(workspace.workingRevision || candidateBlueprint) && !hasAssessmentPending && (
                        <Button variant="outline" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setAbandonOpen(true)}>{t('baselineAssessmentManagement.blueprints.abandon')}</Button>
                      )}
                      {workspace.workingRevision ? (
                        <Button size="sm" leftIcon={<FileEdit className="h-4 w-4" />} onClick={() => navigate(`${basePath}/blueprints/revision`)}>{t('baselineAssessmentManagement.blueprints.resume')}</Button>
                      ) : (
                        <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} disabled={hasPending} isLoading={busy === 'start'} onClick={() => void startRevision()}>{t('baselineAssessmentManagement.blueprints.newRevision')}</Button>
                      )}
                    </div>
                  </div>

                  {hasPending && !workspace.workingRevision && (
                    <Card className="border-warning/50 bg-warning/5"><CardContent className="flex gap-3 pt-6 text-sm"><FileClock className="h-5 w-5 shrink-0 text-warning" /><div><p className="font-semibold">{t('baselineAssessmentManagement.blueprints.pendingBlockedTitle')}</p><p className="mt-1 text-muted-foreground">{t('baselineAssessmentManagement.blueprints.pendingBlockedDescription')}</p></div></CardContent></Card>
                  )}
                  <BlueprintList working={workspace.workingRevision} items={workspace.blueprintVersions} t={t} language={language} onResume={() => navigate(`${basePath}/blueprints/revision`)} onOpen={(item) => navigate(`${basePath}/blueprints/${item.blueprintId}/versions/${item.version}`)} />
                </>
              )}
            </div>
          </Tabs>
        )}
      </div>

      <Dialog open={abandonOpen} onOpenChange={setAbandonOpen}>
        <DialogHeader><DialogTitle>{t('baselineAssessmentManagement.blueprints.abandonTitle')}</DialogTitle></DialogHeader>
        <DialogDescription>{t('baselineAssessmentManagement.blueprints.abandonDescription')}</DialogDescription>
        <label className="mt-4 block space-y-1 text-sm font-medium">{t('baselineAssessmentManagement.blueprints.reason')}<Input value={abandonReason} onChange={(event) => setAbandonReason(event.target.value)} /></label>
        <DialogFooter className="mt-6"><Button variant="outline" disabled={busy !== null} onClick={() => setAbandonOpen(false)}>{t('common.cancel')}</Button><Button variant="destructive" isLoading={busy === 'abandon'} disabled={!abandonReason.trim()} onClick={() => void abandon()}>{t('baselineAssessmentManagement.blueprints.abandon')}</Button></DialogFooter>
      </Dialog>
    </WorkspaceLayout>
  )
}

type Translate = (key: string, fallback?: string) => string

function BlueprintList({ working, items, t, language, onResume, onOpen }: { working: BlueprintWorkingRevision | null; items: BlueprintVersionSummary[]; t: Translate; language: 'en' | 'vi'; onResume: () => void; onOpen: (item: BlueprintVersionSummary) => void }) {
  if (!working && items.length === 0) return <EmptyState icon={<History className="h-7 w-7" />} title={t('baselineAssessmentManagement.blueprints.emptyTitle')} description={t('baselineAssessmentManagement.blueprints.emptyDescription')} />
  return <Card className="overflow-hidden"><div className="divide-y divide-border">
    {working && <button type="button" onClick={onResume} className="flex w-full items-center justify-between gap-4 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"><div className="min-w-0"><p className="font-semibold text-foreground">{working.draft.name}</p><p className="mt-1 text-xs text-muted-foreground">{t('baselineAssessmentManagement.blueprints.savedRevision').replace('{revision}', String(working.revision))} · {formatDate(working.updatedAt, language)}</p></div><div className="flex items-center gap-2"><Badge variant="success">{t('baselineAssessmentManagement.blueprints.saved')}</Badge><span className="text-xs font-medium text-primary">{t('baselineAssessmentManagement.blueprints.continueEditing')}</span></div></button>}
    {items.map((item) => <button type="button" key={`${item.blueprintId}-${item.version}`} onClick={() => onOpen(item)} className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-muted/30"><div className="min-w-0"><p className="font-semibold text-foreground">{item.name}</p><p className="mt-1 text-xs text-muted-foreground">v{item.version} · {formatDate(item.createdAt, language)}</p></div><Badge variant={projectionVariant(item.projection)}>{t(`baselineAssessmentManagement.projection.${projectionKey(item.projection)}`)}</Badge></button>)}
  </div></Card>
}

function BlueprintDetail({ blueprint, t, language, onBack }: { blueprint: BaselineBlueprint; t: Translate; language: 'en' | 'vi'; onBack: () => void }) {
  return <div className="space-y-4">
    <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>{t('baselineAssessmentManagement.blueprints.backToVersions')}</Button>
    <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{blueprint.name}</CardTitle><CardDescription className="mt-1">{t('baselineAssessmentManagement.blueprints.immutableDescription')}</CardDescription></div><Badge variant="outline">v{blueprint.version}</Badge></div></CardHeader><CardContent className="space-y-5">
      <dl className="grid gap-3 text-sm sm:grid-cols-3"><Info label={t('baselineAssessmentManagement.columns.occupation')} value={blueprint.occupationNameSnapshot ?? blueprint.occupationId ?? '—'} /><Info label={t('baselineAssessmentManagement.blueprints.created')} value={formatDate(blueprint.createdAt, language)} /><Info label={t('baselineAssessmentManagement.blueprints.roles')} value={String(blueprint.roles.length)} /></dl>
      <div className="space-y-3">{blueprint.roles.map((role) => <details key={role.roleId} className="group rounded-md border border-border bg-background" open>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4"><div><p className="font-semibold text-foreground">{role.roleNameSnapshot}</p><p className="mt-1 text-xs text-muted-foreground">{role.skills.length} {t('baselineAssessmentManagement.blueprints.skills')} · {t('baselineAssessmentManagement.blueprints.weights').replace('{easy}', String(Math.round(role.easyScoreWeight * 100))).replace('{medium}', String(Math.round(role.mediumScoreWeight * 100))).replace('{hard}', String(Math.round(role.hardScoreWeight * 100)))}</p></div><Badge variant={roleQuestionTotal(role) > 0 ? 'primary' : 'secondary'}>{roleQuestionTotal(role)} {t('baselineAssessmentManagement.blueprints.questions')}</Badge></summary>
        <div className="border-t border-border p-4"><div className="grid gap-2">{role.skills.map((skill) => <div key={skill.microSkillId} className="grid gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm sm:grid-cols-[1fr_auto_auto_auto]"><span className="font-medium text-foreground">{skill.microSkillNameSnapshot}</span><span className="text-muted-foreground">{t('baselineBlueprint.difficulty.easy')}: {skill.easyQuestionCount}</span><span className="text-muted-foreground">{t('baselineBlueprint.difficulty.medium')}: {skill.mediumQuestionCount}</span><span className="text-muted-foreground">{t('baselineBlueprint.difficulty.hard')}: {skill.hardQuestionCount}</span></div>)}</div></div>
      </details>)}</div>
    </CardContent></Card>
  </div>
}

function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium text-foreground">{value}</dd></div> }
function WorkspaceLoading() { return <div className="space-y-3" aria-busy="true"><div className="h-10 animate-pulse rounded bg-muted/60" /><div className="h-52 animate-pulse rounded bg-muted/60" /></div> }
function formatDate(value: string, language: 'en' | 'vi') { return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function projectionKey(value: BlueprintVersionSummary['projection']) { return { ACTIVE_SOURCE: 'activeSource', DRAFT_SOURCE: 'draftSource', CANDIDATE: 'candidate', HISTORICAL: 'historical' }[value] }
function projectionVariant(value: BlueprintVersionSummary['projection']): 'success' | 'warning' | 'primary' | 'outline' { return value === 'ACTIVE_SOURCE' ? 'success' : value === 'CANDIDATE' || value === 'DRAFT_SOURCE' ? 'warning' : 'outline' }
function errorMessage(cause: unknown, t: Translate) { if (cause instanceof BaselineAssessmentManagementApiError) { const key = `baselineAssessmentManagement.apiErrors.${cause.code}`; const translated = t(key); return translated === key ? cause.message : translated } return t('baselineAssessmentManagement.apiErrors.unexpected') }
