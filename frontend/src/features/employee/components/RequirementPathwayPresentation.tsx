import { Fragment, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Award, CheckCircle2, Lock, Target } from 'lucide-react'
import type { RulePathway, RuleStep, RuleModuleOption } from '../../../shared/api/requirementPathway'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader } from '../../../shared/components/ui/Card'
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { AssessmentStatus, SkillAssessmentEntry } from '../baseline-assessment/SkillAssessmentEntry'
import { usePathwayAssessmentStates } from '../baseline-assessment/usePathwayAssessmentStates'
import { cn } from '../../../shared/lib/utils'
import './InteractiveRoleRoadmap.css'

/** Place discovered prerequisites before their dependents, retaining the existing order elsewhere. */
function orderByDependencies(steps: RuleStep[], dependencies: RulePathway['dependencies']): RuleStep[] {
  const byId = new Map(steps.map(step => [step.id, step]))
  const position = new Map(steps.map((step, index) => [step.id, index]))
  const prerequisites = new Map<string, Set<string>>()
  for (const edge of dependencies) {
    if (!byId.has(edge.prerequisiteStepId) || !byId.has(edge.dependentStepId)) continue
    const required = prerequisites.get(edge.dependentStepId) ?? new Set<string>()
    required.add(edge.prerequisiteStepId)
    prerequisites.set(edge.dependentStepId, required)
  }
  const ordered: RuleStep[] = [], visited = new Set<string>()
  // The server-owned Plan rejects cycles; visited also prevents duplicate shared prerequisites.
  function visit(step: RuleStep) {
    if (visited.has(step.id)) return
    visited.add(step.id)
    const required = [...(prerequisites.get(step.id) ?? [])]
      .sort((a, b) => position.get(a)! - position.get(b)!)
    required.forEach(id => visit(byId.get(id)!))
    ordered.push(step)
  }
  steps.forEach(visit)
  return ordered
}

export function RequirementPathwayPresentation({ pathway, mode, search = '', preview = false, onCertificate }: {
  pathway: RulePathway; mode: 'roadmap' | 'timeline'; search?: string; preview?: boolean; onCertificate?: (step: RuleStep) => void
}) {
  const { t } = useTranslation(), tr = (key: string) => t('rulePathway.' + key)
  const [params] = useSearchParams()
  const assessmentState = usePathwayAssessmentStates(pathway, preview)
  const [selectedId, setSelectedId] = useState<string | null>(() => pathway.steps.find(step => (!params.get('assessmentStep') || step.id === params.get('assessmentStep')) && step.options.some(option => option.moduleId === params.get('assessmentModule') && String(option.moduleRevision) === params.get('assessmentRevision')))?.id ?? null), selected = pathway.steps.find(step => step.id === selectedId)
  const query = search.trim().toLocaleLowerCase(), matches = (step: RuleStep) => !query || `${step.requirement.skillId} ${step.requirement.skillName} ${step.requirement.knowledgeLevel} ${step.options.map(option => option.title).join(' ')}`.toLocaleLowerCase().includes(query)
  const required = orderByDependencies(pathway.steps.filter(step => step.kind === 'REQUIRED'), pathway.dependencies), parallel = pathway.steps.filter(step => step.kind === 'PARALLEL_SUPPLEMENT')
  function leaf(step: RuleStep, option: RuleModuleOption) {
    return <Button key={option.moduleId + ':' + option.moduleRevision} variant="outline" className={cn('roadmap-skill-box h-auto min-h-10 w-full whitespace-normal [&>span]:w-full [&>span]:whitespace-normal', assessmentState(step, option) === 'passed' ? 'is-achieved' : option.completedAt || option.startedAt ? 'is-exam-ready' : 'is-not-achieved', assessmentState(step, option) === 'failed' && '!border-destructive !bg-destructive/5')} onClick={() => setSelectedId(step.id)}>
      <span className="min-w-0 break-words text-left">{option.title}<span className="mt-2 block"><Badge variant={option.completedAt ? 'success' : option.startedAt ? 'warning' : 'outline'}>{tr(option.completedAt ? 'contentComplete' : option.startedAt ? 'started' : 'notStarted')}</Badge></span><span className="mt-2 block"><AssessmentStatus state={assessmentState(step, option)} /></span></span>
    </Button>
  }
  function certificateLeaf(step: RuleStep) {
    if (!step.certificate) return null
    return <Button variant="outline" className={cn('roadmap-skill-box h-auto min-h-10 w-full whitespace-normal [&>span]:whitespace-normal', step.state === 'FULFILLED' ? 'is-achieved' : 'is-not-achieved')} onClick={() => setSelectedId(step.id)}><Award className="size-4 shrink-0" />{step.certificate.name}</Button>
  }
  function roots(steps: RuleStep[]) {
    if (mode === 'timeline') return <Card className="min-w-0 overflow-hidden"><CardHeader className="border-b border-border bg-muted/20"><Heading level={2} size="subsection">{t('pathway.adaptiveTimeline')}</Heading></CardHeader><CardContent className="p-4 sm:p-6"><div className="relative"><div className="pointer-events-none absolute bottom-6 left-5 top-6 w-px bg-border" aria-hidden="true" /><ol className="relative space-y-6">{steps.map((step, index) => <li key={step.id} className={cn('relative flex min-w-0 items-start gap-3 sm:gap-5', !matches(step) && 'opacity-40')}>
      <span className={cn('relative z-10 flex size-10 shrink-0 items-center justify-center rounded-xl border-2', step.state === 'FULFILLED' ? 'border-success bg-success text-success-foreground' : 'border-primary bg-card text-primary')}>{step.state === 'FULFILLED' ? <CheckCircle2 className="size-4" /> : index + 1}</span>
      <div className="min-w-0 flex-1 space-y-4 rounded-xl border border-border bg-card p-4 shadow-2xs"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><Button variant="link" className="h-auto max-w-full whitespace-normal p-0 text-left text-card font-semibold text-foreground [&>span]:whitespace-normal" onClick={() => setSelectedId(step.id)}>{step.requirement.skillName}</Button><Text variant="caption">{t('knowledgeLevel.' + step.requirement.knowledgeLevel)}</Text></div><Badge variant={step.state === 'FULFILLED' ? 'success' : 'warning'}>{tr('state.' + step.state)}</Badge></div><Text variant="body-sm">{t('rulePathway.reason.' + step.reason, step.reason)}</Text><Text variant="caption">{tr('alternatives')}</Text><div className="grid gap-2 sm:grid-cols-2">{step.options.map(option => leaf(step, option))}{certificateLeaf(step)}</div></div>
    </li>)}</ol></div></CardContent></Card>
    return <section className="roadmap-container approved-roadmap requirement-roadmap" aria-label={t('pathway.interactiveRoadmap')}><div className="roadmap-canvas"><div className="roadmap-target-role-node max-w-full space-y-2"><span className="inline-flex items-center gap-2 text-caption font-semibold uppercase text-primary"><Target className="size-4" />{t('initialPathway.targetRole')}</span><Heading level={2} size="page">{pathway.roleName}</Heading><Text variant="body-sm">{pathway.levelName}</Text></div>
      {steps.map(step => <Fragment key={step.id}><div className="roadmap-spine-segment h-12" aria-hidden="true" /><div className={cn('approved-roadmap-row', !matches(step) && 'opacity-40')}><div className="approved-roadmap-skills is-left">{step.options.filter((_, index) => index % 2 === 0).map(option => leaf(step, option))}</div>
        <Button className={cn("roadmap-module-box h-auto w-full whitespace-normal [&>span]:block [&>span]:w-full [&>span]:whitespace-normal", step.state === 'FULFILLED' && 'is-fulfilled')} onClick={() => setSelectedId(step.id)}><span className="mb-2 block border-b border-primary-foreground/25 pb-2 text-caption">{t('knowledgeLevel.' + step.requirement.knowledgeLevel)} · {tr('state.' + step.state)}</span><span className="block break-words">{step.requirement.skillName}</span></Button>
        <div className="approved-roadmap-skills is-right">{step.options.filter((_, index) => index % 2 !== 0).map(option => leaf(step, option))}{certificateLeaf(step)}</div></div></Fragment>)}
    </div></section>
  }
  return <div className="space-y-5">
    {required.length > 0 && <section className="space-y-3"><Heading level={2} size="card">{tr('required')}</Heading>{roots(required)}</section>}
    {parallel.length > 0 && <section className="space-y-3"><Heading level={2} size="card">{tr('parallel')}</Heading><Text variant="body-sm">{tr('parallelHelp')}</Text>{roots(parallel)}</section>}
    {selected && <RequirementDetails key={selected.id} pathway={pathway} step={selected} assessmentState={assessmentState} preview={preview} onClose={() => setSelectedId(null)} onCertificate={onCertificate} />}
  </div>
}
function RequirementDetails({ pathway, step, assessmentState, preview, onClose, onCertificate }: { pathway: RulePathway; step: RuleStep; assessmentState: ReturnType<typeof usePathwayAssessmentStates>; preview: boolean; onClose: () => void; onCertificate?: (step: RuleStep) => void }) {
  const { t } = useTranslation(), tr = (key: string) => t('rulePathway.' + key)
  const [locked, setLocked] = useState(false)
  const prerequisites = pathway.dependencies.filter(edge => edge.dependentStepId === step.id).map(edge => pathway.steps.find(item => item.id === edge.prerequisiteStepId)).filter((item): item is RuleStep => Boolean(item))
  return <Dialog open size="wide" onOpenChange={open => { if (!open && !locked) onClose() }} ariaLabel={step.requirement.skillName}>
    <DialogHeader className="rounded-lg bg-secondary/50 p-4 pr-10"><DialogTitle>{step.requirement.skillName} · {t('knowledgeLevel.' + step.requirement.knowledgeLevel)}</DialogTitle><DialogDescription>{pathway.roleName} · {pathway.levelName}</DialogDescription></DialogHeader>
    <DialogBody className="space-y-5"><Badge variant={step.state === 'FULFILLED' ? 'success' : 'warning'}>{tr('state.' + step.state)}</Badge><Text>{t('rulePathway.reason.' + step.reason, step.reason)}</Text><Text variant="body-sm" tone="foreground">{tr('completionHelp')}</Text>
      {step.kind === 'PARALLEL_SUPPLEMENT' && <Text variant="body-sm">{tr('parallelHelp')}</Text>}
      {prerequisites.length > 0 && <div className="space-y-2"><Heading level={3} size="card">{t('initialPathway.prerequisites')}</Heading><Text variant="body-sm">{tr('supplementHelp')}</Text>{prerequisites.map(item => <Text key={item.id} variant="body-sm">{item.requirement.skillName} · {t('knowledgeLevel.' + item.requirement.knowledgeLevel)} · {tr('state.' + item.state)}</Text>)}</div>}
      <div className="rounded-lg bg-muted/40 p-3"><Text variant="caption" tone="foreground" className="font-semibold">{tr('outcomes')}</Text><Text variant="body-sm" tone="foreground">{step.requirement.outcomeCodes.join(', ')}</Text></div>
      {step.options.length > 0 && <div className="space-y-3"><Heading level={3} size="card">{tr('alternatives')}</Heading>{step.options.map(option => <div key={option.moduleId + ':' + option.moduleRevision} className={cn("space-y-3 rounded-lg border p-4", assessmentState(step, option) === 'failed' ? "border-destructive/40 bg-destructive/5" : assessmentState(step, option) === 'passed' ? "border-success/30 bg-success/5" : option.completedAt || option.startedAt ? "border-warning/40 bg-warning/10" : "border-primary/25 bg-secondary/20")}><Text tone="foreground" className="font-semibold">{option.title}</Text><Badge variant={option.completedAt ? 'success' : option.startedAt ? 'warning' : 'outline'}>{tr(option.completedAt ? 'contentComplete' : option.startedAt ? 'started' : 'notStarted')}</Badge><AssessmentStatus state={assessmentState(step, option)} />{!preview && <div className="flex flex-wrap gap-2">{(!step.learningLocked || option.startedAt) && <Link className={buttonVariants({ variant: 'primary', size: 'sm' })} to={'/employee/modules/' + encodeURIComponent(option.moduleId)}>{t('initialPathway.learn')}</Link>}{option.completedAt && !pathway.archived && <SkillAssessmentEntry pathway={pathway} step={step} option={option} onLockChange={setLocked} disabled={locked} />}</div>}</div>)}</div>}
      {step.learningLocked && !preview && <Text variant="body-sm" className="flex items-center gap-2"><Lock className="size-4" />{tr('locked')}</Text>}
      {step.certificate && <div className="flex flex-col items-start gap-4 rounded-xl border border-primary/30 bg-secondary/40 p-5"><Text className="font-semibold">{step.certificate.name}</Text><a className="inline-flex min-h-9 items-center rounded-lg border border-primary/20 bg-card px-3 py-1.5 text-body-sm font-medium text-primary underline underline-offset-4" href={step.certificate.referenceUrl} target="_blank" rel="noopener noreferrer">{tr('certificateReference')}</a>{!preview && onCertificate && <Button disabled={locked} onClick={() => { onCertificate(step); onClose() }}>{pathway.archived || step.state === 'FULFILLED' ? t('certificates.history') : tr('certificate')}</Button>}</div>}
    </DialogBody><DialogFooter><Button variant="outline" disabled={locked} onClick={onClose}>{t('initialPathway.cancel')}</Button></DialogFooter>
  </Dialog>
}
