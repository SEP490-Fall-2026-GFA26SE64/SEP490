import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import type { RulePathway, RuleStep } from '../../../shared/api/requirementPathway'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { AssessmentStatus, SkillAssessmentEntry } from '../baseline-assessment/SkillAssessmentEntry'
import { usePathwayAssessmentStates } from '../baseline-assessment/usePathwayAssessmentStates'
import { cn } from '../../../shared/lib/utils'


export function RequirementDetails({ pathway, step, assessmentState, preview, onClose, onCertificate, optionKey, certificateOnly, onSelectStep, onLockChange }: { pathway: RulePathway; step: RuleStep; assessmentState: ReturnType<typeof usePathwayAssessmentStates>; preview: boolean; onClose: () => void; onCertificate?: (step: RuleStep) => void; optionKey?: string; certificateOnly?: boolean; onSelectStep?: (step: RuleStep) => void; onLockChange?: (locked: boolean) => void }) {
  const { t } = useTranslation(), tr = (key: string) => t('rulePathway.' + key)
  const [locked, setLocked] = useState(false)
  const updateLock = useCallback((value: boolean) => { setLocked(value); onLockChange?.(value) }, [onLockChange])
  const options = certificateOnly ? [] : optionKey ? step.options.filter(option => option.moduleId + ':' + option.moduleRevision === optionKey) : step.options
  const showCertificate = !optionKey && step.certificate
  const title = certificateOnly ? step.certificate?.name : optionKey ? options[0]?.title : step.requirement.skillName
  const prerequisites = pathway.dependencies.filter(edge => edge.dependentStepId === step.id).map(edge => pathway.steps.find(item => item.id === edge.prerequisiteStepId)).filter((item): item is RuleStep => Boolean(item))
  const summary = <section className="space-y-4 rounded-xl border border-border bg-muted/20 p-4" aria-label={tr('detail.relatedRequirement')}>
    <Heading level={3} size="card">{tr('detail.relatedRequirement')}</Heading>
    <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
      <div className="min-w-0"><dt className="text-caption text-muted-foreground">{tr('detail.skill')}</dt><dd className="mt-1 break-words text-body-sm font-semibold">{step.requirement.skillName}</dd></div>
      <div><dt className="text-caption text-muted-foreground">{tr('detail.knowledge')}</dt><dd className="mt-1 text-body-sm font-semibold">{t('knowledgeLevel.' + step.requirement.knowledgeLevel)}</dd></div>
      <div className="min-w-0"><dt className="text-caption text-muted-foreground">{tr('detail.role')}</dt><dd className="mt-1 break-words text-body-sm">{pathway.roleName}</dd></div>
      <div><dt className="text-caption text-muted-foreground">{tr('detail.roleLevel')}</dt><dd className="mt-1 text-body-sm">{pathway.levelName}</dd></div>
      <div className="space-y-2 sm:col-span-2"><dt className="text-caption text-muted-foreground">{tr('detail.requirementStatus')}</dt><dd><Badge variant={step.state === 'FULFILLED' ? 'success' : 'warning'}>{tr('employeeLabels.state.' + step.state)}</Badge></dd></div>
    </dl>
    <div className="space-y-2 border-t border-border pt-3"><Text variant="body-sm" tone="foreground" className="font-semibold">{tr('detail.explanation')}</Text><Text variant="body-sm">{t('rulePathway.reason.' + step.reason, step.reason)}</Text><Text variant="body-sm">{tr('completionHelp')}</Text></div>
      {step.kind === 'PARALLEL_SUPPLEMENT' && <Text variant="body-sm">{tr('parallelHelp')}</Text>}
      {prerequisites.length > 0 && <div className="space-y-2"><Heading level={3} size="card">{t('initialPathway.prerequisites')}</Heading><Text variant="body-sm">{tr('supplementHelp')}</Text>{prerequisites.map(item => onSelectStep ? <Button key={item.id} variant="outline" disabled={locked} className="h-auto whitespace-normal text-left [&>span]:whitespace-normal" onClick={() => onSelectStep(item)}>{item.requirement.skillName} · {t('knowledgeLevel.' + item.requirement.knowledgeLevel)} · {tr('employeeLabels.state.' + item.state)}</Button> : <Text key={item.id} variant="body-sm">{item.requirement.skillName} · {t('knowledgeLevel.' + item.requirement.knowledgeLevel)} · {tr('employeeLabels.state.' + item.state)}</Text>)}</div>}
      </section>
  const actions = <>
      {options.length > 0 && <div className="space-y-3"><Heading level={3} size="card">{tr(optionKey ? 'detail.moduleProgress' : 'alternatives')}</Heading>{options.map(option => <div key={option.moduleId + ':' + option.moduleRevision} className={cn("space-y-3 rounded-lg border p-4", assessmentState(step, option) === 'failed' ? "border-destructive/40 bg-destructive/5" : assessmentState(step, option) === 'passed' ? "border-success/30 bg-success/5" : option.completedAt || option.startedAt ? "border-warning/40 bg-warning/10" : "border-primary/25 bg-secondary/20")}>{!optionKey && <Text tone="foreground" className="font-semibold">{option.title}</Text>}<Text variant="caption">{tr('detail.contentStatus')}</Text><Badge variant={option.completedAt ? 'success' : option.startedAt ? 'warning' : 'outline'}>{tr(option.completedAt ? 'contentComplete' : option.startedAt ? 'started' : 'notStarted')}</Badge>{assessmentState(step, option) && <div className="space-y-2"><Text variant="caption">{tr('detail.assessmentStatus')}</Text><AssessmentStatus state={assessmentState(step, option)} partialLabel={tr('employeeLabels.partiallyPassed')} />{assessmentState(step, option) === 'prerequisites' && <Text variant="body-sm">{tr('employeeLabels.partiallyPassedHelp')}</Text>}</div>}{!option.completedAt && !pathway.archived && !preview && step.requirement.provision === 'MODULE_ONLY' && <Text variant="body-sm">{tr('detail.assessmentAfterContent')}</Text>}{!preview && <div className="space-y-2"><Text variant="caption">{tr('detail.actions')}</Text><div className="flex flex-wrap gap-2">{(!step.learningLocked || option.startedAt) && <Link className={buttonVariants({ variant: 'primary', size: 'sm' })} to={'/employee/modules/' + encodeURIComponent(option.moduleId)}>{t('initialPathway.learn')}</Link>}{option.completedAt && !pathway.archived && <SkillAssessmentEntry pathway={pathway} step={step} option={option} onLockChange={updateLock} disabled={locked} />}</div></div>}</div>)}</div>}
      {step.learningLocked && !preview && <Text variant="body-sm" className="flex items-center gap-2"><Lock className="size-4" />{tr('employeeLabels.locked')}</Text>}
      {showCertificate && <div className="flex flex-col items-start gap-4 rounded-xl border border-primary/30 bg-secondary/40 p-5"><Text className="font-semibold">{showCertificate.name}</Text><a className="inline-flex min-h-9 items-center rounded-lg border border-primary/20 bg-card px-3 py-1.5 text-body-sm font-medium text-primary underline underline-offset-4" href={showCertificate.referenceUrl} target="_blank" rel="noopener noreferrer">{tr('certificateReference')}</a>{!preview && onCertificate && <Button disabled={locked} onClick={() => { onCertificate(step); onClose() }}>{pathway.archived || step.state === 'FULFILLED' ? t('certificates.history') : tr('certificate')}</Button>}</div>}
    </>
  const content = <>{summary}{actions}</>
  return <Dialog open size="wide" className="employee-requirement-popup sm:max-w-3xl" containerClassName="employee-requirement-popup-layer" onOpenChange={open => { if (!open && !locked) onClose() }} ariaLabel={title ?? step.requirement.skillName} closeLabel={t('common.close')}>
    <DialogHeader className="rounded-lg bg-secondary/50 p-4 pr-10"><Text variant="eyebrow">{tr(optionKey ? 'detail.module' : certificateOnly ? 'detail.certificate' : 'detail.requirement')}</Text><DialogTitle>{title}</DialogTitle><DialogDescription>{tr('detail.relatedRequirement')}: {step.requirement.skillName}</DialogDescription></DialogHeader>
    <DialogBody className="space-y-5">{content}</DialogBody><DialogFooter><Button variant="outline" disabled={locked} onClick={onClose}>{t('common.close')}</Button></DialogFooter>
  </Dialog>
}
