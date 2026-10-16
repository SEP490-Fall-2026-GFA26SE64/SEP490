import { AlertTriangle, CheckCircle2, ClipboardCheck, FileQuestion, Save, Send } from 'lucide-react'
import * as React from 'react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Input } from '../../../shared/components/ui/Input'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { useToast } from '../../../shared/hooks/useToast'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import {
  BaselineBlueprintApiError,
  type AssessmentDraft,
  type BaselineBlueprint,
  type BlueprintCapacity,
  type BlueprintDraft,
  type BlueprintRole,
  type CoverageShortage,
  type OccupationDetail,
  type OccupationSummary,
  createBlueprint,
  generateAssessment,
  getLatestBlueprintByOccupation,
  getOccupation,
  getOccupationCapacity,
  listOccupations,
  publishAssessment,
  reviewAssessment,
  reviseBlueprint,
} from './baselineBlueprintApi'
import {
  developmentBaselineOccupation,
  developmentBaselineOccupations,
} from './developmentBaselineCatalog'
import {
  BaselineRoleConfiguration,
  type CountField,
} from './BaselineRoleConfiguration'
import {
  difficultyQuestionTotal,
  roleQuestionTotal,
} from './baselineBlueprintForm'
import {
  CapacityAllocationError,
  allocateRoleQuestionTotal,
  validateBlueprintCapacity,
} from './baselineBlueprintCapacity'
import {
  defaultScoreWeights,
  isValidScoreWeights,
  weightsFromRole,
  type ScoreWeights,
} from './baselineBlueprintWeights'

type BusyAction = 'save' | 'generate' | 'review' | 'publish' | null

export function BaselineBlueprintPage() {
  const { toast } = useToast()
  const { t } = useTranslation()
  const translationRef = React.useRef(t)
  React.useEffect(() => {
    translationRef.current = t
  }, [t])
  const showError = React.useCallback((description: string) => toast({
    title: translationRef.current('baselineBlueprint.actionFailed'), description, variant: 'destructive',
  }), [toast])
  const [name, setName] = React.useState('')
  const [occupations, setOccupations] = React.useState<OccupationSummary[]>([])
  const [selectedOccupationId, setSelectedOccupationId] = React.useState('')
  const [selectedOccupation, setSelectedOccupation] = React.useState<OccupationDetail | null>(null)
  const [capacity, setCapacity] = React.useState<BlueprintCapacity | null>(null)
  const [capacityBusy, setCapacityBusy] = React.useState(false)
  const [capacityError, setCapacityError] = React.useState<string | null>(null)
  const [capacityRefresh, setCapacityRefresh] = React.useState(0)
  const [roles, setRoles] = React.useState<BlueprintRole[]>([])
  const [pendingInputRoleIds, setPendingInputRoleIds] = React.useState<string[]>([])
  const [blueprint, setBlueprint] = React.useState<BaselineBlueprint | null>(null)
  const [assessment, setAssessment] = React.useState<AssessmentDraft | null>(null)
  const [shortages, setShortages] = React.useState<CoverageShortage[]>([])
  const [coverageValidated, setCoverageValidated] = React.useState(false)
  const [busy, setBusy] = React.useState<BusyAction>(null)
  const [catalogBusy, setCatalogBusy] = React.useState(true)
  const saveKey = React.useRef<string | undefined>(undefined)
  const generationKey = React.useRef<string | undefined>(undefined)

  const chooseOccupation = React.useCallback((occupationId: string) => {
    saveKey.current = undefined
    generationKey.current = undefined
    setName('')
    setSelectedOccupation(null)
    setCapacity(null)
    setCapacityError(null)
    setCapacityBusy(Boolean(occupationId))
    setRoles([])
    setPendingInputRoleIds([])
    setBlueprint(null)
    setAssessment(null)
    setShortages([])
    setCoverageValidated(false)
    setCatalogBusy(Boolean(occupationId))
    setSelectedOccupationId(occupationId)
  }, [])

  React.useEffect(() => {
    let active = true
    void loadOccupationSummaries().then((available) => {
      if (!active) return
      setOccupations(available)
      chooseOccupation(available[0]?.id ?? '')
      if (available.length === 0) setCatalogBusy(false)
    }).catch((error: unknown) => {
      if (!active) return
      setCatalogBusy(false)
      showError(errorMessage(error, translationRef.current))
    })
    return () => { active = false }
  }, [chooseOccupation, showError])

  React.useEffect(() => {
    if (!selectedOccupationId) return

    let active = true
    void Promise.all([
      loadOccupationDetail(selectedOccupationId),
      loadLatestBlueprint(selectedOccupationId),
    ]).then(([occupation, saved]) => {
      if (!active) return
      const requiresWeightRevision = saved?.roles.some((role) => roleTotal(role) > 0
        && !isValidScoreWeights(weightsFromRole(role))) ?? false
      setSelectedOccupation(occupation)
      setName(saved?.name ?? formatMessage(translationRef.current('baselineBlueprint.defaultName'), {
        occupation: occupation.name,
      }))
      setRoles(saved ? rolesForEditor(saved.roles) : rolesFromOccupation(occupation))
      setBlueprint(saved)
      setCoverageValidated(saved !== null && !requiresWeightRevision)
    }).catch((error: unknown) => {
      if (active) showError(errorMessage(error, translationRef.current))
    }).finally(() => {
      if (active) setCatalogBusy(false)
    })
    return () => { active = false }
  }, [selectedOccupationId, showError])

  React.useEffect(() => {
    if (!selectedOccupationId) return

    let active = true
    void getOccupationCapacity(selectedOccupationId).then((loaded) => {
      if (!active) return
      if (loaded.occupationId !== selectedOccupationId) {
        throw new Error('Capacity response does not match the selected Occupation')
      }
      setCapacity(loaded)
    }).catch((error: unknown) => {
      if (active) setCapacityError(errorMessage(error, translationRef.current))
    }).finally(() => {
      if (active) setCapacityBusy(false)
    })
    return () => { active = false }
  }, [capacityRefresh, selectedOccupationId])

  const retryCapacity = React.useCallback(() => {
    setCapacityBusy(true)
    setCapacityError(null)
    setCapacityRefresh((value) => value + 1)
  }, [])

  const capacityStale = capacity !== null && selectedOccupation !== null
    && capacity.catalogVersion !== selectedOccupation.catalogVersion
  const capacityReady = capacity !== null && !capacityBusy && capacityError === null && !capacityStale
  const capacityIssues = React.useMemo(() => capacityReady && capacity
    ? validateBlueprintCapacity(roles, capacity)
    : [], [capacity, capacityReady, roles])
  const hasInvalidWeights = roles.some((role) => roleTotal(role) > 0
    && !isValidScoreWeights(weightsFromRole(role)))
  const setRolePendingInput = React.useCallback((roleId: string, pending: boolean) => {
    setPendingInputRoleIds((current) => pending
      ? current.includes(roleId) ? current : [...current, roleId]
      : current.filter((id) => id !== roleId))
  }, [])

  const markEdited = () => {
    saveKey.current = undefined
    generationKey.current = undefined
    setAssessment(null)
    setCoverageValidated(false)
    setShortages([])
  }

  const updateRole = (roleIndex: number, update: (role: BlueprintRole) => BlueprintRole) => {
    markEdited()
    setRoles((current) => current.map((role, index) => index === roleIndex ? update(role) : role))
  }

  const updateCount = (roleIndex: number, skillIndex: number, field: CountField, value: string) => {
    const count = Math.max(0, Number.parseInt(value, 10) || 0)
    updateRole(roleIndex, (role) => ({
      ...role,
      skills: role.skills.map((skill, index) => index === skillIndex ? { ...skill, [field]: count } : skill),
    }))
  }

  const updateWeights = (roleIndex: number, weights: ScoreWeights) => {
    updateRole(roleIndex, (role) => ({ ...role, ...weights }))
  }

  const applyRoleTotal = (roleIndex: number, total: number) => {
    if (!capacityReady || !capacity) return
    try {
      const allocated = allocateRoleQuestionTotal(roles, roleIndex, total, capacity)
      updateRole(roleIndex, () => allocated)
    } catch (error) {
      showError(error instanceof CapacityAllocationError
        ? t('baselineBlueprint.validation.capacityRange')
        : t('baselineBlueprint.apiErrors.unexpected'))
    }
  }

  const handleSave = async () => {
    if (!selectedOccupation || !name.trim() || roles.length === 0 || !roles.some((role) => roleTotal(role) > 0)) {
      showError(t('baselineBlueprint.validation.required'))
      return
    }
    if (hasInvalidWeights) {
      showError(t('baselineBlueprint.validation.weightHierarchy'))
      return
    }
    if (roles.some(hasWeightWithoutQuestions)) {
      showError(t('baselineBlueprint.validation.zeroDifficultyWeight'))
      return
    }
    if (capacityIssues.length > 0 || pendingInputRoleIds.length > 0) {
      showError(t('baselineBlueprint.validation.capacityInvalid'))
      return
    }
    setBusy('save')
    setShortages([])
    try {
      const payload = toDraft(name, selectedOccupation, roles)
      saveKey.current ??= crypto.randomUUID()
      const saved = blueprint
        ? await reviseBlueprint(blueprint.blueprintId, blueprint.version, payload, saveKey.current)
        : await createBlueprint(payload, saveKey.current)
      setBlueprint(saved)
      setRoles(rolesForEditor(saved.roles))
      setCoverageValidated(true)
      saveKey.current = undefined
      toast({
        title: formatMessage(translationRef.current('baselineBlueprint.toast.savedTitle'), {
          version: saved.version,
        }),
        description: translationRef.current('baselineBlueprint.toast.savedDescription'),
        variant: 'success',
      })
    } catch (error) {
      if (error instanceof BaselineBlueprintApiError
        && error.code === 'INSUFFICIENT_QUESTION_COVERAGE') {
        retryCapacity()
      }
      handleApiError(error, setShortages, showError, translationRef.current)
    } finally {
      setBusy(null)
    }
  }

  const handleGenerate = async () => {
    if (!blueprint || !coverageValidated) return
    setBusy('generate')
    try {
      generationKey.current ??= crypto.randomUUID()
      const generated = await generateAssessment(
        blueprint.blueprintId, blueprint.version, generationKey.current,
      )
      setAssessment(generated)
      toast({
        title: formatMessage(translationRef.current('baselineBlueprint.toast.generatedTitle'), {
          version: generated.version,
        }),
        description: formatMessage(translationRef.current('baselineBlueprint.toast.generatedDescription'), {
          count: generated.items.length,
        }),
        variant: 'success',
      })
    } catch (error) {
      handleApiError(error, setShortages, showError, translationRef.current)
    } finally {
      setBusy(null)
    }
  }

  const handleReview = async () => {
    if (!assessment) return
    setBusy('review')
    try {
      const reviewed = await reviewAssessment(assessment.assessmentVersionId, assessment.contentHash)
      setAssessment(reviewed)
      toast({
        title: translationRef.current('baselineBlueprint.toast.reviewedTitle'),
        description: shortHash(reviewed.contentHash),
        variant: 'success',
      })
    } catch (error) {
      handleApiError(error, setShortages, showError, translationRef.current)
    } finally {
      setBusy(null)
    }
  }

  const handlePublish = async () => {
    if (!assessment) return
    setBusy('publish')
    try {
      const published = await publishAssessment(assessment.assessmentVersionId, assessment.contentHash)
      setAssessment(published)
      toast({
        title: translationRef.current('baselineBlueprint.toast.publishedTitle'),
        description: formatMessage(translationRef.current('baselineBlueprint.toast.publishedDescription'), {
          version: published.version,
        }),
        variant: 'success',
      })
    } catch (error) {
      handleApiError(error, setShortages, showError, translationRef.current)
    } finally {
      setBusy(null)
    }
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6">
        <PageHeader
          title={t('baselineBlueprint.pageTitle')}
          description={t('baselineBlueprint.pageDescription')}
          icon={<FileQuestion size={24} />}
          actions={<Badge variant={assessment?.publicationState === 'PUBLISHED' ? 'success' : 'outline'}>
            {assessment?.publicationState === 'PUBLISHED'
              ? t('baselineBlueprint.status.published')
              : blueprint
                ? formatMessage(t('baselineBlueprint.status.blueprintVersion'), { version: blueprint.version })
                : t('baselineBlueprint.status.unsaved')}
          </Badge>}
        />

        {!catalogBusy && occupations.length === 0 && (
          <Card className="border-warning/50">
            <CardContent className="flex gap-3 pt-6 text-sm">
              <AlertTriangle className="mt-0.5 shrink-0 text-warning" size={18} />
              <p>{t('baselineBlueprint.catalogEmpty')}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('baselineBlueprint.selectStep')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block max-w-xl space-y-1 text-sm font-medium">
              {t('baselineBlueprint.occupation')}
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedOccupationId}
                disabled={catalogBusy || busy !== null}
                onChange={(event) => chooseOccupation(event.target.value)}
              >
                <option value="">{t('baselineBlueprint.selectOccupation')}</option>
                {occupations.map((occupation) => (
                  <option key={occupation.id} value={occupation.id}>
                    {occupation.name} ({formatMessage(t(occupation.roleCount === 1
                      ? 'baselineBlueprint.roleCountOne'
                      : 'baselineBlueprint.roleCountMany'), { count: occupation.roleCount })})
                  </option>
                ))}
              </select>
            </label>
            {selectedOccupation && (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{formatMessage(t(selectedOccupation.roles.length === 1
                  ? 'baselineBlueprint.roleCountOne'
                  : 'baselineBlueprint.roleCountMany'), { count: selectedOccupation.roles.length })}</Badge>
                <span>{formatMessage(t('baselineBlueprint.catalogVersion'), {
                  version: selectedOccupation.catalogVersion,
                })}</span>
                <span>{t('baselineBlueprint.allRolesVisible')}</span>
                {capacityBusy && <Badge variant="outline">{t('baselineBlueprint.capacityLoading')}</Badge>}
                {capacityReady && <Badge variant="success">{t('baselineBlueprint.capacityReady')}</Badge>}
              </div>
            )}
            {selectedOccupation && !capacityBusy && (capacityError || capacityStale) && (
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-warning/50 bg-warning/5 p-3 text-sm">
                <AlertTriangle className="shrink-0 text-warning" size={17} />
                <span className="min-w-0 flex-1">
                  {capacityStale ? t('baselineBlueprint.capacityStale') : capacityError}
                </span>
                <Button size="sm" variant="outline" onClick={retryCapacity}>
                  {t('baselineBlueprint.retryCapacity')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('baselineBlueprint.configureStep')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="block max-w-xl space-y-1 text-sm font-medium">
              {t('baselineBlueprint.blueprintName')}
              <Input value={name} disabled={catalogBusy || busy !== null || !selectedOccupation} onChange={(event) => {
                markEdited()
                setName(event.target.value)
              }} />
            </label>

            <BaselineRoleConfiguration
              key={`${selectedOccupationId}-${roles[0]?.roleId ?? 'loading'}`}
              roles={roles}
              capacity={capacityReady ? capacity : null}
              capacityIssues={capacityIssues}
              onPendingInputChange={setRolePendingInput}
              disabled={catalogBusy || busy !== null}
              onCount={updateCount}
              onWeights={updateWeights}
              onApplyTotal={applyRoleTotal}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <CoverageStatus validated={coverageValidated} shortages={shortages} />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" leftIcon={<Save size={15} />} isLoading={busy === 'save'} disabled={catalogBusy || busy !== null || !selectedOccupation || !capacityReady || capacityIssues.length > 0 || pendingInputRoleIds.length > 0 || hasInvalidWeights || roles.length === 0} onClick={() => void handleSave()}>
                  {blueprint ? t('baselineBlueprint.saveNewVersion') : t('baselineBlueprint.saveBlueprint')}
                </Button>
                <Button leftIcon={<FileQuestion size={15} />} isLoading={busy === 'generate'} disabled={busy !== null || !blueprint || !coverageValidated || !capacityReady || assessment !== null} onClick={() => void handleGenerate()}>
                  {t('baselineBlueprint.generateAssessment')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {shortages.length > 0 && <ShortageTable shortages={shortages} roles={roles} />}
        {assessment && (
          <AssessmentReview
            assessment={assessment}
            busy={busy}
            onReview={() => void handleReview()}
            onPublish={() => void handlePublish()}
          />
        )}
      </div>
    </WorkspaceLayout>
  )
}

function CoverageStatus({ validated, shortages }: { validated: boolean; shortages: CoverageShortage[] }) {
  const { t } = useTranslation()
  if (shortages.length > 0) return <Badge variant="destructive">{formatMessage(
    t('baselineBlueprint.coverageShort'), { count: shortages.length },
  )}</Badge>
  if (validated) return <Badge variant="success">{t('baselineBlueprint.coverageValidated')}</Badge>
  return <Badge variant="outline">{t('baselineBlueprint.coverageNotValidated')}</Badge>
}

function ShortageTable({ shortages, roles }: { shortages: CoverageShortage[]; roles: BlueprintRole[] }) {
  const { t } = useTranslation()
  return <Card className="border-destructive/40"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle size={17} />{t('baselineBlueprint.shortagesTitle')}</CardTitle></CardHeader><CardContent>
    <div className="space-y-2 text-sm">{shortages.map((item) => <div key={`${item.roleId}-${item.microSkillId}-${item.difficulty}`} className="space-y-2 rounded bg-muted/40 p-2">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <span>{item.microSkillId}</span>
        <span>{translatedDifficulty(t, item.difficulty)}</span>
        <span>{formatMessage(t('baselineBlueprint.required'), { count: item.required })}</span>
        <span>{formatMessage(t('baselineBlueprint.available'), { count: item.available })}</span>
        <strong>{formatMessage(t('baselineBlueprint.missing'), { count: item.missing })}</strong>
      </div>
      {(item.roleRequirements?.length ?? 0) > 0 && <p className="text-xs text-muted-foreground">
        {formatMessage(t('baselineBlueprint.roleDemand'), {
          roles: item.roleRequirements?.map((requirement) =>
            `${roleName(roles, requirement.roleId)} (${requirement.required})`).join(', ') ?? '',
        })}
      </p>}
    </div>)}</div>
  </CardContent></Card>
}

function roleName(roles: BlueprintRole[], roleId: string) {
  return roles.find((role) => role.roleId === roleId)?.roleNameSnapshot ?? roleId
}

function AssessmentReview({ assessment, busy, onReview, onPublish }: {
  assessment: AssessmentDraft
  busy: BusyAction
  onReview: () => void
  onPublish: () => void
}) {
  const { t } = useTranslation()
  const reviewed = assessment.reviewedContentHash === assessment.contentHash
  const published = assessment.publicationState === 'PUBLISHED'
  return <Card><CardHeader><CardTitle className="flex flex-wrap items-center justify-between gap-3"><span>{formatMessage(t('baselineBlueprint.assessmentDraft'), { version: assessment.version })}</span><Badge variant={published ? 'success' : reviewed ? 'warning' : 'outline'}>{published
    ? t('baselineBlueprint.status.published')
    : reviewed ? t('baselineBlueprint.status.reviewed') : t('baselineBlueprint.status.draft')}</Badge></CardTitle></CardHeader><CardContent className="space-y-4">
    <div className="grid gap-2 rounded-md bg-muted/40 p-3 text-xs md:grid-cols-3">
      <span><strong>{t('baselineBlueprint.items')}</strong> {assessment.items.length}</span>
      <span><strong>{t('baselineBlueprint.blueprint')}</strong> v{assessment.blueprintVersion}</span>
      <span className="truncate font-mono" title={assessment.contentHash}><strong>{t('baselineBlueprint.hash')}</strong> {shortHash(assessment.contentHash)}</span>
    </div>
    <ol className="max-h-96 space-y-2 overflow-y-auto pr-1">{assessment.items.map((item) => <li key={item.position} className="rounded-md border border-border p-3 text-sm">
      <div className="mb-1 flex flex-wrap gap-2 text-xs text-muted-foreground"><span>#{item.position}</span><span>{item.roleNameSnapshot}</span><span>{item.microSkillNameSnapshot}</span><Badge variant="secondary">{translatedDifficulty(t, item.difficulty)}</Badge></div>
      <p>{item.prompt}</p>
    </li>)}</ol>
    <div className="flex justify-end gap-2 border-t border-border pt-4">
      <Button variant="outline" leftIcon={<ClipboardCheck size={15} />} isLoading={busy === 'review'} disabled={busy !== null || reviewed || published} onClick={onReview}>{t('baselineBlueprint.reviewHash')}</Button>
      <Button leftIcon={<Send size={15} />} isLoading={busy === 'publish'} disabled={busy !== null || !reviewed || published} onClick={onPublish}>{t('baselineBlueprint.publish')}</Button>
    </div>
    {reviewed && <p className="flex items-center gap-2 text-xs text-success"><CheckCircle2 size={14} />{t('baselineBlueprint.reviewedHashMatches')}</p>}
  </CardContent></Card>
}

function toDraft(name: string, occupation: OccupationDetail, roles: BlueprintRole[]): BlueprintDraft {
  return {
    name: name.trim(),
    occupationId: occupation.id,
    occupationNameSnapshot: occupation.name,
    roles: roles.map(({ totalQuestionCount: _ignored, ...role }) => {
      const participates = roleTotal(role) > 0
      return {
        ...role,
        enabled: participates,
        ...(!participates && {
          // The existing backend domain requires every persisted role's weights to total one,
          // even though generation ignores weights for a zero-question role.
          easyScoreWeight: 0.3334,
          mediumScoreWeight: 0.3333,
          hardScoreWeight: 0.3333,
        }),
      }
    }),
  }
}

function rolesForEditor(roles: BlueprintRole[]): BlueprintRole[] {
  return roles.map((role) => {
    if (roleTotal(role) === 0) return {
      ...role,
      easyScoreWeight: 0,
      mediumScoreWeight: 0,
      hardScoreWeight: 0,
    }
    return isValidScoreWeights(weightsFromRole(role)) ? role : { ...role, ...defaultScoreWeights() }
  })
}

async function loadOccupationSummaries(): Promise<OccupationSummary[]> {
  try {
    return await listOccupations()
  } catch (error) {
    const fixtures = developmentBaselineOccupations()
    if (fixtures.length > 0 && canUseDevelopmentCatalog(error)) return fixtures
    throw error
  }
}

async function loadOccupationDetail(occupationId: string): Promise<OccupationDetail> {
  try {
    return await getOccupation(occupationId)
  } catch (error) {
    const fixture = developmentBaselineOccupation(occupationId)
    if (fixture && canUseDevelopmentCatalog(error)) return fixture
    throw error
  }
}

async function loadLatestBlueprint(occupationId: string): Promise<BaselineBlueprint | null> {
  try {
    return await getLatestBlueprintByOccupation(occupationId)
  } catch (error) {
    if (error instanceof BaselineBlueprintApiError && error.status === 404) return null
    throw error
  }
}

function canUseDevelopmentCatalog(error: unknown) {
  return import.meta.env.DEV && (error instanceof TypeError
    || (error instanceof BaselineBlueprintApiError && (error.status === 404 || error.status === 503)))
}

function rolesFromOccupation(occupation: OccupationDetail): BlueprintRole[] {
  return occupation.roles.map((role) => ({
    roleId: role.id,
    roleNameSnapshot: role.name,
    enabled: true,
    easyScoreWeight: 0,
    mediumScoreWeight: 0,
    hardScoreWeight: 0,
    skills: role.skills.map((skill) => ({
      microSkillId: skill.id,
      microSkillNameSnapshot: skill.name,
      easyQuestionCount: 0,
      mediumQuestionCount: 0,
      hardQuestionCount: 0,
    })),
  }))
}

const roleTotal = roleQuestionTotal

function hasWeightWithoutQuestions(role: BlueprintRole) {
  if (roleTotal(role) === 0) return false
  return (difficultyTotal(role, 'easy') === 0 && role.easyScoreWeight !== 0)
    || (difficultyTotal(role, 'medium') === 0 && role.mediumScoreWeight !== 0)
    || (difficultyTotal(role, 'hard') === 0 && role.hardScoreWeight !== 0)
}

function difficultyTotal(role: BlueprintRole, difficulty: 'easy' | 'medium' | 'hard') {
  return difficultyQuestionTotal(role, difficulty)
}

function handleApiError(
  error: unknown,
  setShortages: React.Dispatch<React.SetStateAction<CoverageShortage[]>>,
  showError: (message: string) => void,
  t: Translator,
) {
  if (error instanceof BaselineBlueprintApiError) {
    setShortages(error.coverageShortages)
    showError(apiErrorMessage(error, t))
    return
  }
  showError(t('baselineBlueprint.apiErrors.unexpected'))
}

function shortHash(hash: string) {
  return `${hash.slice(0, 12)}…${hash.slice(-8)}`
}

function errorMessage(error: unknown, t: Translator) {
  return error instanceof BaselineBlueprintApiError
    ? apiErrorMessage(error, t)
    : t('baselineBlueprint.apiErrors.unexpected')
}

type Translator = (keyOrPhrase: string, fallback?: string) => string

function apiErrorMessage(error: BaselineBlueprintApiError, t: Translator) {
  const key = `baselineBlueprint.apiErrors.${error.code}`
  const localized = t(key)
  return `${error.code}: ${localized === key ? error.message : localized}`
}

function translatedDifficulty(t: Translator, difficulty: string) {
  const key = `baselineBlueprint.difficulty.${difficulty.toLowerCase()}`
  const translated = t(key)
  return translated === key ? difficulty : translated
}

function formatMessage(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template,
  )
}
