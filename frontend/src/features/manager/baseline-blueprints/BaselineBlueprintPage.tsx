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
  createBlueprint,
  generateAssessment,
  publishAssessment,
  reviewAssessment,
  reviseBlueprint,
} from './baselineBlueprintApi'
import { developmentBaselineRoles } from './developmentBaselineCatalog'

type BusyAction = 'save' | 'generate' | 'review' | 'publish' | null
type CountField = 'easyQuestionCount' | 'mediumQuestionCount' | 'hardQuestionCount'
type WeightField = 'easyScoreWeight' | 'mediumScoreWeight' | 'hardScoreWeight'

export function BaselineBlueprintPage() {
  const { toast } = useToast()
  const [name, setName] = React.useState('Development baseline assessment')
  const [roles, setRoles] = React.useState<BlueprintRole[]>(developmentBaselineRoles)
  const [blueprint, setBlueprint] = React.useState<BaselineBlueprint | null>(null)
  const [assessment, setAssessment] = React.useState<AssessmentDraft | null>(null)
  const [shortages, setShortages] = React.useState<CoverageShortage[]>([])
  const [coverageValidated, setCoverageValidated] = React.useState(false)
  const [busy, setBusy] = React.useState<BusyAction>(null)
  const saveKey = React.useRef<string | undefined>(undefined)
  const generationKey = React.useRef<string | undefined>(undefined)

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
    if (!name.trim() || roles.length === 0 || !roles.some((role) => role.enabled)) {
      showError('Blueprint name and at least one enabled role are required.')
      return
    }
    if (roles.some((role) => !approximatelyOne(
      role.easyScoreWeight + role.mediumScoreWeight + role.hardScoreWeight,
    ))) {
      showError('Easy, Medium and Hard score weights must add up to 1 for every role.')
      return
    }
    setBusy('save')
    setShortages([])
    try {
      const payload = toDraft(name, roles)
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

  const showError = (description: string) => toast({ title: 'Baseline blueprint action failed', description, variant: 'destructive' })

  return (
    <WorkspaceLayout>
      <div className="space-y-6">
        <PageHeader
          title="Baseline assessment blueprint"
          description="Choose catalog roles, set exact question counts by micro-skill and difficulty, then generate, review and publish one immutable assessment version."
          icon={<FileQuestion size={24} />}
          actions={<Badge variant={assessment?.publicationState === 'PUBLISHED' ? 'success' : 'outline'}>
            {assessment?.publicationState ?? (blueprint ? `BLUEPRINT V${blueprint.version}` : 'UNSAVED')}
          </Badge>}
        />

        {roles.length === 0 && (
          <Card className="border-warning/50">
            <CardContent className="flex gap-3 pt-6 text-sm">
              <AlertTriangle className="mt-0.5 shrink-0 text-warning" size={18} />
              <p>The L&D catalog adapter is not available in this build. Development catalog fixtures are enabled only by the Vite development mode.</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="block max-w-xl space-y-1 text-sm font-medium">
              Blueprint name
              <Input value={name} disabled={busy !== null} onChange={(event) => {
                markEdited()
                setName(event.target.value)
              }} />
            </label>

            <div className="space-y-4">
              {roles.map((role, roleIndex) => (
                <RoleConfiguration
                  key={role.roleId}
                  role={role}
                  roleIndex={roleIndex}
                  disabled={busy !== null}
                  onToggle={(enabled) => updateRole(roleIndex, (current) => ({ ...current, enabled }))}
                  onCount={updateCount}
                  onWeight={updateWeight}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <CoverageStatus validated={coverageValidated} shortages={shortages} />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" leftIcon={<Save size={15} />} isLoading={busy === 'save'} disabled={busy !== null || roles.length === 0} onClick={() => void handleSave()}>
                  {blueprint ? 'Save new version' : 'Save blueprint'}
                </Button>
                <Button leftIcon={<FileQuestion size={15} />} isLoading={busy === 'generate'} disabled={busy !== null || !blueprint || !coverageValidated || assessment !== null} onClick={() => void handleGenerate()}>
                  Generate assessment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {shortages.length > 0 && <ShortageTable shortages={shortages} />}
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

function RoleConfiguration({ role, roleIndex, disabled, onToggle, onCount, onWeight }: {
  role: BlueprintRole
  roleIndex: number
  disabled: boolean
  onToggle: (enabled: boolean) => void
  onCount: (roleIndex: number, skillIndex: number, field: CountField, value: string) => void
  onWeight: (roleIndex: number, field: WeightField, value: string) => void
}) {
  const total = role.skills.reduce((sum, skill) => sum
    + skill.easyQuestionCount + skill.mediumQuestionCount + skill.hardQuestionCount, 0)
  return (
    <section className={`rounded-lg border p-4 ${role.enabled ? 'border-primary/30' : 'border-border opacity-70'}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" checked={role.enabled} disabled={disabled} onChange={(event) => onToggle(event.target.checked)} />
          {role.roleNameSnapshot}
        </label>
        <Badge variant={role.enabled ? 'primary' : 'secondary'}>{total} questions</Badge>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-3 rounded-md bg-muted/40 p-3 text-xs">
        {(['easy', 'medium', 'hard'] as const).map((difficulty) => {
          const field = `${difficulty}ScoreWeight` as WeightField
          return <label key={field} className="space-y-1 capitalize">{difficulty} score weight
            <Input type="number" min="0" max="1" step="0.05" value={role[field]} disabled={disabled || !role.enabled} onChange={(event) => onWeight(roleIndex, field, event.target.value)} />
          </label>
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr><th className="pb-2">Micro-skill</th><th className="pb-2 text-center">Easy</th><th className="pb-2 text-center">Medium</th><th className="pb-2 text-center">Hard</th><th className="pb-2 text-right">Total</th></tr>
          </thead>
          <tbody>
            {role.skills.map((skill, skillIndex) => {
              const skillTotal = skill.easyQuestionCount + skill.mediumQuestionCount + skill.hardQuestionCount
              return <tr key={skill.microSkillId} className="border-b border-border/60 last:border-0">
                <td className="py-2 pr-4 font-medium">{skill.microSkillNameSnapshot}</td>
                {(['easy', 'medium', 'hard'] as const).map((difficulty) => {
                  const field = `${difficulty}QuestionCount` as CountField
                  return <td key={field} className="w-28 p-2"><Input className="text-center" type="number" min="0" value={skill[field]} disabled={disabled || !role.enabled} onChange={(event) => onCount(roleIndex, skillIndex, field, event.target.value)} /></td>
                })}
                <td className="py-2 text-right font-mono font-semibold">{skillTotal}</td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function CoverageStatus({ validated, shortages }: { validated: boolean; shortages: CoverageShortage[] }) {
  if (shortages.length > 0) return <Badge variant="destructive">Coverage short in {shortages.length} bucket(s)</Badge>
  if (validated) return <Badge variant="success">Catalog and coverage validated</Badge>
  return <Badge variant="outline">Coverage not validated</Badge>
}

function ShortageTable({ shortages }: { shortages: CoverageShortage[] }) {
  return <Card className="border-destructive/40"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle size={17} />Question coverage shortages</CardTitle></CardHeader><CardContent>
    <div className="space-y-2 text-sm">{shortages.map((item) => <div key={`${item.roleId}-${item.microSkillId}-${item.difficulty}`} className="grid grid-cols-2 gap-2 rounded bg-muted/40 p-2 md:grid-cols-5">
      <span>{item.microSkillId}</span><span>{item.difficulty}</span><span>Required: {item.required}</span><span>Available: {item.available}</span><strong>Missing: {item.missing}</strong>
    </div>)}</div>
  </CardContent></Card>
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

function toDraft(name: string, roles: BlueprintRole[]): BlueprintDraft {
  return {
    name: name.trim(),
    occupationId: null,
    occupationNameSnapshot: null,
    roles: roles.map(({ totalQuestionCount: _ignored, ...role }) => role),
  }
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

function approximatelyOne(value: number) {
  return Math.abs(value - 1) < 0.000001
}
