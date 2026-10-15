import { AlertTriangle, CheckCircle2, ClipboardCheck, FileQuestion, Save, Send } from 'lucide-react'
import * as React from 'react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Input } from '../../../shared/components/ui/Input'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import {
  BaselineBlueprintApiError,
  type AssessmentDraft,
  type BaselineBlueprint,
  type BlueprintDraft,
  type BlueprintRole,
  type CoverageShortage,
  type OccupationDetail,
  type OccupationSummary,
  createBlueprint,
  generateAssessment,
  getLatestBlueprintByOccupation,
  getOccupation,
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
  type WeightField,
} from './BaselineRoleConfiguration'

type BusyAction = 'save' | 'generate' | 'review' | 'publish' | null

export function BaselineBlueprintPage() {
  const { toast } = useToast()
  const showError = React.useCallback((description: string) => toast({
    title: 'Baseline blueprint action failed', description, variant: 'destructive',
  }), [toast])
  const [name, setName] = React.useState('')
  const [occupations, setOccupations] = React.useState<OccupationSummary[]>([])
  const [selectedOccupationId, setSelectedOccupationId] = React.useState('')
  const [selectedOccupation, setSelectedOccupation] = React.useState<OccupationDetail | null>(null)
  const [roles, setRoles] = React.useState<BlueprintRole[]>([])
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
    setRoles([])
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
      showError(errorMessage(error))
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
      setSelectedOccupation(occupation)
      setName(saved?.name ?? `${occupation.name} baseline assessment`)
      setRoles(saved?.roles ?? rolesFromOccupation(occupation))
      setBlueprint(saved)
      setCoverageValidated(saved !== null)
    }).catch((error: unknown) => {
      if (active) showError(errorMessage(error))
    }).finally(() => {
      if (active) setCatalogBusy(false)
    })
    return () => { active = false }
  }, [selectedOccupationId, showError])

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

  const updateWeight = (roleIndex: number, field: WeightField, value: string) => {
    const weight = Math.min(1, Math.max(0, Number.parseFloat(value) || 0))
    updateRole(roleIndex, (role) => ({ ...role, [field]: weight }))
  }

  const handleSave = async () => {
    if (!selectedOccupation || !name.trim() || roles.length === 0 || !roles.some((role) => roleTotal(role) > 0)) {
      showError('Choose an Occupation, enter a blueprint name and configure at least one question.')
      return
    }
    if (roles.filter((role) => roleTotal(role) > 0).some((role) => !approximatelyOne(
      role.easyScoreWeight + role.mediumScoreWeight + role.hardScoreWeight,
    ))) {
      showError('Easy, Medium and Hard score weights must add up to 1 for every participating role.')
      return
    }
    if (roles.some(hasWeightWithoutQuestions)) {
      showError('A difficulty with 0 questions must also have score weight 0 for that role.')
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
      setRoles(saved.roles)
      setCoverageValidated(true)
      saveKey.current = undefined
      toast({
        title: `Blueprint v${saved.version} saved`,
        description: 'Catalog references and question coverage were accepted by the backend.',
        variant: 'success',
      })
    } catch (error) {
      handleApiError(error, setShortages, showError)
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
        title: `Assessment draft v${generated.version} generated`,
        description: `${generated.items.length} exact question versions are now pinned.`,
        variant: 'success',
      })
    } catch (error) {
      handleApiError(error, setShortages, showError)
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
      toast({ title: 'Current content reviewed', description: shortHash(reviewed.contentHash), variant: 'success' })
    } catch (error) {
      handleApiError(error, setShortages, showError)
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
      toast({ title: 'Baseline assessment published', description: `Version ${published.version} is immutable.`, variant: 'success' })
    } catch (error) {
      handleApiError(error, setShortages, showError)
    } finally {
      setBusy(null)
    }
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6">
        <PageHeader
          title="Baseline assessment blueprint"
          description="Choose one Occupation, configure all of its roles, then generate, review and publish one immutable baseline assessment version."
          icon={<FileQuestion size={24} />}
          actions={<Badge variant={assessment?.publicationState === 'PUBLISHED' ? 'success' : 'outline'}>
            {assessment?.publicationState ?? (blueprint ? `BLUEPRINT V${blueprint.version}` : 'UNSAVED')}
          </Badge>}
        />

        {!catalogBusy && occupations.length === 0 && (
          <Card className="border-warning/50">
            <CardContent className="flex gap-3 pt-6 text-sm">
              <AlertTriangle className="mt-0.5 shrink-0 text-warning" size={18} />
              <p>No Occupation catalog is available. The development Occupation fixture is enabled only by Vite development mode.</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>1. Select Occupation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block max-w-xl space-y-1 text-sm font-medium">
              Occupation
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedOccupationId}
                disabled={catalogBusy || busy !== null}
                onChange={(event) => chooseOccupation(event.target.value)}
              >
                <option value="">Select an Occupation</option>
                {occupations.map((occupation) => (
                  <option key={occupation.id} value={occupation.id}>
                    {occupation.name} ({occupation.roleCount} roles)
                  </option>
                ))}
              </select>
            </label>
            {selectedOccupation && (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{selectedOccupation.roles.length} roles</Badge>
                <span>Catalog {selectedOccupation.catalogVersion}</span>
                <span>All roles remain visible in this blueprint.</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Configure blueprint</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="block max-w-xl space-y-1 text-sm font-medium">
              Blueprint name
              <Input value={name} disabled={catalogBusy || busy !== null || !selectedOccupation} onChange={(event) => {
                markEdited()
                setName(event.target.value)
              }} />
            </label>

            <BaselineRoleConfiguration
              key={`${selectedOccupationId}-${roles[0]?.roleId ?? 'loading'}`}
              roles={roles}
              disabled={catalogBusy || busy !== null}
              onCount={updateCount}
              onWeight={updateWeight}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <CoverageStatus validated={coverageValidated} shortages={shortages} />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" leftIcon={<Save size={15} />} isLoading={busy === 'save'} disabled={catalogBusy || busy !== null || !selectedOccupation || roles.length === 0} onClick={() => void handleSave()}>
                  {blueprint ? 'Save new version' : 'Save blueprint'}
                </Button>
                <Button leftIcon={<FileQuestion size={15} />} isLoading={busy === 'generate'} disabled={busy !== null || !blueprint || !coverageValidated || assessment !== null} onClick={() => void handleGenerate()}>
                  Generate assessment
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
  if (shortages.length > 0) return <Badge variant="destructive">Coverage short in {shortages.length} bucket(s)</Badge>
  if (validated) return <Badge variant="success">Catalog and coverage validated</Badge>
  return <Badge variant="outline">Coverage not validated</Badge>
}

function ShortageTable({ shortages, roles }: { shortages: CoverageShortage[]; roles: BlueprintRole[] }) {
  return <Card className="border-destructive/40"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle size={17} />Question coverage shortages</CardTitle></CardHeader><CardContent>
    <div className="space-y-2 text-sm">{shortages.map((item) => <div key={`${item.roleId}-${item.microSkillId}-${item.difficulty}`} className="space-y-2 rounded bg-muted/40 p-2">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <span>{item.microSkillId}</span><span>{item.difficulty}</span><span>Required: {item.required}</span><span>Available: {item.available}</span><strong>Missing: {item.missing}</strong>
      </div>
      {(item.roleRequirements?.length ?? 0) > 0 && <p className="text-xs text-muted-foreground">
        Role demand: {item.roleRequirements?.map((requirement) => `${roleName(roles, requirement.roleId)} (${requirement.required})`).join(', ')}
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
  const reviewed = assessment.reviewedContentHash === assessment.contentHash
  const published = assessment.publicationState === 'PUBLISHED'
  return <Card><CardHeader><CardTitle className="flex flex-wrap items-center justify-between gap-3"><span>Assessment draft v{assessment.version}</span><Badge variant={published ? 'success' : reviewed ? 'warning' : 'outline'}>{published ? 'PUBLISHED' : reviewed ? 'REVIEWED' : 'DRAFT'}</Badge></CardTitle></CardHeader><CardContent className="space-y-4">
    <div className="grid gap-2 rounded-md bg-muted/40 p-3 text-xs md:grid-cols-3">
      <span><strong>Items:</strong> {assessment.items.length}</span>
      <span><strong>Blueprint:</strong> v{assessment.blueprintVersion}</span>
      <span className="truncate font-mono" title={assessment.contentHash}><strong>Hash:</strong> {shortHash(assessment.contentHash)}</span>
    </div>
    <ol className="max-h-96 space-y-2 overflow-y-auto pr-1">{assessment.items.map((item) => <li key={item.position} className="rounded-md border border-border p-3 text-sm">
      <div className="mb-1 flex flex-wrap gap-2 text-xs text-muted-foreground"><span>#{item.position}</span><span>{item.roleNameSnapshot}</span><span>{item.microSkillNameSnapshot}</span><Badge variant="secondary">{item.difficulty}</Badge></div>
      <p>{item.prompt}</p>
    </li>)}</ol>
    <div className="flex justify-end gap-2 border-t border-border pt-4">
      <Button variant="outline" leftIcon={<ClipboardCheck size={15} />} isLoading={busy === 'review'} disabled={busy !== null || reviewed || published} onClick={onReview}>Review this hash</Button>
      <Button leftIcon={<Send size={15} />} isLoading={busy === 'publish'} disabled={busy !== null || !reviewed || published} onClick={onPublish}>Publish</Button>
    </div>
    {reviewed && <p className="flex items-center gap-2 text-xs text-success"><CheckCircle2 size={14} />Reviewed hash matches the displayed manifest.</p>}
  </CardContent></Card>
}

function toDraft(name: string, occupation: OccupationDetail, roles: BlueprintRole[]): BlueprintDraft {
  return {
    name: name.trim(),
    occupationId: occupation.id,
    occupationNameSnapshot: occupation.name,
    roles: roles.map(({ totalQuestionCount: _ignored, ...role }) => ({
      ...role,
      enabled: roleTotal(role) > 0,
    })),
  }
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
    easyScoreWeight: 0.3,
    mediumScoreWeight: 0.4,
    hardScoreWeight: 0.3,
    skills: role.skills.map((skill) => ({
      microSkillId: skill.id,
      microSkillNameSnapshot: skill.name,
      easyQuestionCount: 0,
      mediumQuestionCount: 0,
      hardQuestionCount: 0,
    })),
  }))
}

function roleTotal(role: BlueprintRole) {
  return role.skills.reduce((total, skill) => total
    + skill.easyQuestionCount + skill.mediumQuestionCount + skill.hardQuestionCount, 0)
}

function hasWeightWithoutQuestions(role: BlueprintRole) {
  if (roleTotal(role) === 0) return false
  return (difficultyTotal(role, 'easy') === 0 && role.easyScoreWeight !== 0)
    || (difficultyTotal(role, 'medium') === 0 && role.mediumScoreWeight !== 0)
    || (difficultyTotal(role, 'hard') === 0 && role.hardScoreWeight !== 0)
}

function difficultyTotal(role: BlueprintRole, difficulty: 'easy' | 'medium' | 'hard') {
  const field = `${difficulty}QuestionCount` as CountField
  return role.skills.reduce((total, skill) => total + skill[field], 0)
}

function handleApiError(
  error: unknown,
  setShortages: React.Dispatch<React.SetStateAction<CoverageShortage[]>>,
  showError: (message: string) => void,
) {
  if (error instanceof BaselineBlueprintApiError) {
    setShortages(error.coverageShortages)
    showError(`${error.code}: ${error.message}`)
    return
  }
  showError(error instanceof Error ? error.message : 'Unexpected frontend error')
}

function shortHash(hash: string) {
  return `${hash.slice(0, 12)}…${hash.slice(-8)}`
}

function errorMessage(error: unknown) {
  return error instanceof BaselineBlueprintApiError
    ? `${error.code}: ${error.message}`
    : error instanceof Error ? error.message : 'Unexpected frontend error'
}

function approximatelyOne(value: number) {
  return Math.abs(value - 1) < 0.000001
}
