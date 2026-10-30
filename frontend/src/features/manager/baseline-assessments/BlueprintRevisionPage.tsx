import { AlertTriangle, ArrowLeft, CheckCircle2, FileCheck2, FileEdit, FilePlus2, Save, Trash2 } from 'lucide-react'
import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { Input } from '../../../shared/components/ui/Input'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { useToast } from '../../../shared/hooks/useToast'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { BaselineRoleConfiguration, type CountField } from '../baseline-blueprints/BaselineRoleConfiguration'
import type { BaselineBlueprint, BlueprintCapacity, BlueprintRole } from '../baseline-blueprints/baselineBlueprintApi'
import { getOccupationCapacity } from '../baseline-blueprints/baselineBlueprintApi'
import { allocateRoleQuestionTotal, CapacityAllocationError, validateBlueprintCapacity } from '../baseline-blueprints/baselineBlueprintCapacity'
import { hasWeightWithoutQuestions, rolesForBlueprintEditor, toBlueprintDraft } from '../baseline-blueprints/baselineBlueprintDraft'
import { roleQuestionTotal } from '../baseline-blueprints/baselineBlueprintForm'
import { isValidScoreWeights, weightsFromRole, type ScoreWeights } from '../baseline-blueprints/baselineBlueprintWeights'
import {
  abandonPendingBlueprintChange,
  BaselineAssessmentManagementApiError,
  finalizeBlueprintWorkingRevision,
  generateAssessmentCandidate,
  getBaselineAssessmentWorkspace,
  saveBlueprintWorkingRevision,
  type BlueprintWorkingRevision,
} from './baselineAssessmentManagementApi'

type BusyAction = 'save' | 'finalize' | 'generate' | 'abandon' | null

export function BlueprintRevisionPage() {
  const { occupationId = '' } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation()
  const basePath = `/ld-manager/baseline-assessments/${encodeURIComponent(occupationId)}`
  const [working, setWorking] = React.useState<BlueprintWorkingRevision | null>(null)
  const [occupationName, setOccupationName] = React.useState('')
  const [name, setName] = React.useState('')
  const [roles, setRoles] = React.useState<BlueprintRole[]>([])
  const [capacity, setCapacity] = React.useState<BlueprintCapacity | null>(null)
  const [pendingInputRoleIds, setPendingInputRoleIds] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState<BusyAction>(null)
  const [dirty, setDirty] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [abandonOpen, setAbandonOpen] = React.useState(false)
  const [abandonReason, setAbandonReason] = React.useState('')
  const [finalized, setFinalized] = React.useState<BaselineBlueprint | null>(null)
  const saveKey = React.useRef<string | null>(null)
  const finalizeKey = React.useRef<string | null>(null)
  const generateKey = React.useRef<string | null>(null)

  React.useEffect(() => {
    let active = true
    setLoading(true)
    void Promise.all([
      getBaselineAssessmentWorkspace(occupationId),
      getOccupationCapacity(occupationId),
    ]).then(([workspace, loadedCapacity]) => {
      if (!active) return
      if (!workspace.workingRevision) {
        setError(t('baselineAssessmentManagement.revision.notFound'))
        return
      }
      setWorking(workspace.workingRevision)
      setOccupationName(workspace.occupationName)
      setName(workspace.workingRevision.draft.name)
      setRoles(rolesForBlueprintEditor(workspace.workingRevision.draft.roles))
      setCapacity(loadedCapacity)
      setDirty(false)
    }).catch((cause: unknown) => {
      if (active) setError(errorMessage(cause, t))
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [occupationId, t])

  const capacityIssues = React.useMemo(() => capacity ? validateBlueprintCapacity(roles, capacity) : [], [capacity, roles])
  const hasInvalidWeights = roles.some((role) => roleQuestionTotal(role) > 0 && !isValidScoreWeights(weightsFromRole(role)))
  const formValid = Boolean(name.trim() && capacity && roles.length > 0 && roles.some((role) => roleQuestionTotal(role) > 0)
    && capacityIssues.length === 0 && pendingInputRoleIds.length === 0 && !hasInvalidWeights
    && !roles.some(hasWeightWithoutQuestions))

  const markEdited = () => {
    saveKey.current = null
    finalizeKey.current = null
    setDirty(true)
  }

  const updateRole = (roleIndex: number, update: (role: BlueprintRole) => BlueprintRole) => {
    markEdited()
    setRoles((current) => current.map((role, index) => index === roleIndex ? update(role) : role))
  }

  const updateCount = (roleIndex: number, skillIndex: number, field: CountField, value: string) => {
    const count = Math.max(0, Number.parseInt(value, 10) || 0)
    updateRole(roleIndex, (role) => ({ ...role, skills: role.skills.map((skill, index) => index === skillIndex ? { ...skill, [field]: count } : skill) }))
  }

  const updateWeights = (roleIndex: number, weights: ScoreWeights) => {
    updateRole(roleIndex, (role) => ({ ...role, ...weights }))
  }

  const applyRoleTotal = (roleIndex: number, total: number) => {
    if (!capacity) return
    try {
      const allocated = allocateRoleQuestionTotal(roles, roleIndex, total, capacity)
      updateRole(roleIndex, () => allocated)
    } catch (cause) {
      toast({ title: t('baselineAssessmentManagement.revision.invalidAllocation'), description: cause instanceof CapacityAllocationError ? t('baselineBlueprint.validation.capacityRange') : t('baselineBlueprint.apiErrors.unexpected'), variant: 'destructive' })
    }
  }

  const setRolePendingInput = React.useCallback((roleId: string, pending: boolean) => {
    setPendingInputRoleIds((current) => pending
      ? current.includes(roleId) ? current : [...current, roleId]
      : current.filter((id) => id !== roleId))
  }, [])

  const save = async () => {
    if (!working || !formValid) return
    setBusy('save')
    try {
      saveKey.current ??= crypto.randomUUID()
      const saved = await saveBlueprintWorkingRevision(
        occupationId,
        working.workingRevisionId,
        working.revision,
        toBlueprintDraft(name, { id: occupationId, name: occupationName }, roles),
        saveKey.current,
      )
      setWorking(saved)
      setName(saved.draft.name)
      setRoles(rolesForBlueprintEditor(saved.draft.roles))
      setDirty(false)
      saveKey.current = null
      toast({ title: t('baselineAssessmentManagement.revision.saved').replace('{revision}', String(saved.revision)), description: t('baselineAssessmentManagement.revision.savedDescription'), variant: 'success' })
    } catch (cause) {
      toast({ title: t('baselineAssessmentManagement.revision.saveFailed'), description: errorMessage(cause, t), variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  const finalize = async () => {
    if (!working || dirty || !formValid) return
    setBusy('finalize')
    try {
      finalizeKey.current ??= crypto.randomUUID()
      const finalized = await finalizeBlueprintWorkingRevision(occupationId, working.workingRevisionId, working.revision, finalizeKey.current)
      finalizeKey.current = null
      toast({ title: t('baselineAssessmentManagement.revision.finalized').replace('{version}', String(finalized.version)), description: t('baselineAssessmentManagement.revision.finalizedDescription'), variant: 'success' })
      setFinalized(finalized)
    } catch (cause) {
      toast({ title: t('baselineAssessmentManagement.revision.finalizeFailed'), description: errorMessage(cause, t), variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  const generateAssessment = async () => {
    if (!finalized) return
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

  const abandon = async () => {
    if (!abandonReason.trim()) return
    setBusy('abandon')
    try {
      await abandonPendingBlueprintChange(occupationId, abandonReason.trim())
      toast({ title: t('baselineAssessmentManagement.blueprints.abandoned'), description: t('baselineAssessmentManagement.blueprints.abandonedDescription'), variant: 'success' })
      navigate(`${basePath}/blueprints`)
    } catch (cause) {
      toast({ title: t('baselineAssessmentManagement.blueprints.abandonFailed'), description: errorMessage(cause, t), variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  return <WorkspaceLayout><div className="space-y-6 pb-16">
    <PageHeader icon={<FileEdit className="h-7 w-7" />} title={t('baselineAssessmentManagement.revision.title')} description={occupationName || t('baselineAssessmentManagement.revision.description')} actions={<Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate(`${basePath}/blueprints`)}>{t('baselineAssessmentManagement.blueprints.backToVersions')}</Button>} />
    {loading ? <div className="h-72 animate-pulse rounded-lg bg-muted/60" aria-busy="true" /> : error || !working ? <EmptyState icon={<AlertTriangle className="h-7 w-7" />} title={t('baselineAssessmentManagement.revision.unavailable')} description={error ?? t('baselineAssessmentManagement.revision.notFound')} /> : <>
      <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{t('baselineAssessmentManagement.revision.details')}</CardTitle><CardDescription>{t('baselineAssessmentManagement.revision.saveSemantics')}</CardDescription></div><div className="flex gap-2"><Badge variant="outline">{t('baselineAssessmentManagement.revision.revision').replace('{revision}', String(working.revision))}</Badge>{dirty && <Badge variant="warning">{t('baselineAssessmentManagement.revision.unsaved')}</Badge>}</div></div></CardHeader><CardContent><label className="block max-w-xl space-y-1 text-sm font-medium">{t('baselineBlueprint.blueprintName')}<Input value={name} disabled={busy !== null} onChange={(event) => { markEdited(); setName(event.target.value) }} /></label></CardContent></Card>
      {!capacity && <Card className="border-warning/50"><CardContent className="flex gap-3 pt-6 text-sm"><AlertTriangle className="h-5 w-5 shrink-0 text-warning" />{t('baselineBlueprint.capacityLoading')}</CardContent></Card>}
      <Card><CardHeader><CardTitle>{t('baselineAssessmentManagement.revision.configuration')}</CardTitle><CardDescription>{t('baselineAssessmentManagement.revision.configurationDescription')}</CardDescription></CardHeader><CardContent className="space-y-5"><BaselineRoleConfiguration key={`${working.workingRevisionId}-${working.revision}`} roles={roles} capacity={capacity} capacityIssues={capacityIssues} disabled={busy !== null} onCount={updateCount} onWeights={updateWeights} onApplyTotal={applyRoleTotal} onPendingInputChange={setRolePendingInput} />
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-sm">{formValid ? <><CheckCircle2 className="h-4 w-4 text-success" /><span>{t('baselineAssessmentManagement.revision.ready')}</span></> : <><AlertTriangle className="h-4 w-4 text-warning" /><span>{t('baselineAssessmentManagement.revision.resolveValidation')}</span></>}</div><div className="flex flex-wrap gap-2"><Button variant="destructive" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} disabled={busy !== null} onClick={() => setAbandonOpen(true)}>{t('baselineAssessmentManagement.blueprints.abandon')}</Button><Button variant="outline" leftIcon={<Save className="h-4 w-4" />} isLoading={busy === 'save'} disabled={busy !== null || !formValid || !dirty} onClick={() => void save()}>{t('baselineAssessmentManagement.revision.save')}</Button><Button leftIcon={<FileCheck2 className="h-4 w-4" />} isLoading={busy === 'finalize'} disabled={busy !== null || !formValid || dirty} onClick={() => void finalize()}>{t('baselineAssessmentManagement.revision.finalize')}</Button></div></div>
      </CardContent></Card>
    </>}
  </div>
  <Dialog open={abandonOpen} onOpenChange={setAbandonOpen}><DialogHeader><DialogTitle>{t('baselineAssessmentManagement.blueprints.abandonTitle')}</DialogTitle></DialogHeader><DialogDescription>{t('baselineAssessmentManagement.blueprints.abandonDescription')}</DialogDescription><label className="mt-4 block space-y-1 text-sm font-medium">{t('baselineAssessmentManagement.blueprints.reason')}<Input value={abandonReason} onChange={(event) => setAbandonReason(event.target.value)} /></label><DialogFooter className="mt-6"><Button variant="outline" disabled={busy !== null} onClick={() => setAbandonOpen(false)}>{t('common.cancel')}</Button><Button variant="destructive" isLoading={busy === 'abandon'} disabled={!abandonReason.trim()} onClick={() => void abandon()}>{t('baselineAssessmentManagement.blueprints.abandon')}</Button></DialogFooter></Dialog>
  <Dialog open={Boolean(finalized)} onOpenChange={(open) => {
    if (!open && finalized) navigate(`${basePath}/blueprints/${finalized.blueprintId}/versions/${finalized.version}`)
  }}>
    <DialogHeader><DialogTitle>{t('baselineAssessmentManagement.revision.finalized').replace('{version}', String(finalized?.version ?? ''))}</DialogTitle></DialogHeader>
    <DialogDescription>{t('baselineAssessmentManagement.revision.finalizedNextStep')}</DialogDescription>
    <DialogFooter className="mt-6">
      <Button variant="outline" disabled={busy !== null} onClick={() => finalized && navigate(`${basePath}/blueprints/${finalized.blueprintId}/versions/${finalized.version}`)}>{t('baselineAssessmentManagement.revision.viewFinalized')}</Button>
      <Button leftIcon={<FilePlus2 className="h-4 w-4" />} isLoading={busy === 'generate'} disabled={busy !== null} onClick={() => void generateAssessment()}>{t('baselineAssessmentManagement.revision.generateAssessment')}</Button>
    </DialogFooter>
  </Dialog>
  </WorkspaceLayout>
}

type Translate = (key: string, fallback?: string) => string
function errorMessage(cause: unknown, t: Translate) { if (cause instanceof BaselineAssessmentManagementApiError) { const key = `baselineAssessmentManagement.apiErrors.${cause.code}`; const translated = t(key); return `${cause.code}: ${translated === key ? cause.message : translated}` } return t('baselineAssessmentManagement.apiErrors.unexpected') }
