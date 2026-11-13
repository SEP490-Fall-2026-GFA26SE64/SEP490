import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, CheckCircle2, CircleHelp, Eye, GripVertical, ListChecks, Plus, RefreshCw, Save, Search, X } from 'lucide-react'
import { checkModuleSelection, moduleSelectionCommand, ruleReviewCommand, type RuleModuleOption, type RuleReviewDetail, type RuleStep, type RuleValidation } from '../../../shared/api/requirementPathway'
import { moduleRequest, type ModuleDocument } from '../../../shared/api/moduleAuthoringApi'
import type { PendingPathwayCommand } from '../../../shared/api/initialPathway'
import { InitialPathwayFeedback } from '../../../shared/components/InitialPathwayFeedback'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card } from '../../../shared/components/ui/Card'
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { Input } from '../../../shared/components/ui/Input'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { ModuleMarkdown } from '../../../shared/components/ui/ModuleMarkdown'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { RequirementModuleGraph, type ModuleDragEvents } from './RequirementModuleGraph'
import { ModuleAssessmentConfiguration } from './ModuleAssessmentConfiguration'

const optionKey = (module: RuleModuleOption) => `${module.moduleId}\n${module.moduleRevision}\n${module.contentVersion}`
const editableStep = (step: RuleStep) => step.requirement.provision === 'MODULE_ONLY' && !['FULFILLED', 'BYPASSED'].includes(step.state)
type DragModule = { stepId: string; key: string; from: 'graph' | 'catalog'; hash: string | null }
type PointerDrag = DragModule & { pointerId: number; startX: number; startY: number; moved: boolean; element: HTMLElement }

export function RequirementModuleEditor({ id, scope, detail, disabled, onCommand, onApprove, onBypass, onDirtyChange }: {
  id: string; scope: string; detail: RuleReviewDetail; disabled: boolean; onCommand: (command: PendingPathwayCommand) => void;
  onApprove: () => void; onBypass: (step: RuleStep) => void; onDirtyChange: (dirty: boolean) => void;
}) {
  const { t } = useTranslation(), tr = (key: string) => t('moduleReview.' + key)
  const reorderableIds = detail.reorderableStepIds ?? []
  const initial = Object.fromEntries(detail.plan.steps.map(step => [step.id, step.options.map(optionKey).sort()]))
  const [stepOrder, setStepOrder] = useState(detail.plan.steps.map(step => step.id))
  const [bypassHelp, setBypassHelp] = useState(false), dragContext = useRef<PointerDrag | null>(null)
  const [chosen, setChosen] = useState<Record<string, string[]>>(initial), [focus, setFocus] = useState(''), [search, setSearch] = useState('')
  const [dragged, setDragged] = useState<DragModule | null>(null), [checking, setChecking] = useState(false), [checked, setChecked] = useState<RuleValidation | null>(null)
  const [error, setError] = useState<unknown>(null), [selected, setSelected] = useState<{ stepId: string | null; module: RuleModuleOption } | null>(null)
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)
  const checkFlight = useRef(false), changeRevision = useRef(0)
  const dirty = JSON.stringify(chosen) !== JSON.stringify(initial) || JSON.stringify(stepOrder) !== JSON.stringify(detail.plan.steps.map(step => step.id))
  const editable = !detail.archived && ['AWAITING_EXPERT_REVIEW', 'REJECTED'].includes(detail.status.reviewStatus) && Boolean(detail.status.revision)
  const blocked = disabled || checking || !editable
  const modules = new Map<string, RuleModuleOption>()
  detail.plan.steps.forEach(step => step.options.forEach(module => modules.set(step.id + '\n' + optionKey(module), module)))
  detail.candidates.forEach(candidate => modules.set(candidate.stepId + '\n' + optionKey(candidate.module), candidate.module))
  const steps = stepOrder.map(id => detail.plan.steps.find(step => step.id === id)!).map(step => ({ ...step, options: (chosen[step.id] ?? []).map(key => modules.get(step.id + '\n' + key)).filter((module): module is RuleModuleOption => Boolean(module)) }))
  const selections = steps.filter(editableStep).map(step => ({ stepId: step.id, options: step.options.map(({ moduleId, moduleRevision, contentVersion }) => ({ moduleId, moduleRevision, contentVersion })) }))
  const validation = checked ?? detail.validation
  const focusedStep = detail.plan.steps.find(step => step.id === focus)
  const related = detail.related.length ? detail.related : detail.candidates.map(candidate => ({ skillId: detail.plan.steps.find(step => step.id === candidate.stepId)!.requirement.skillId, knowledgeLevel: detail.plan.steps.find(step => step.id === candidate.stepId)!.requirement.knowledgeLevel, module: candidate.module }))
  const candidates = related.map(item => {
    const eligible = detail.candidates.filter(candidate => optionKey(candidate.module) === optionKey(item.module))
    const match = eligible.find(candidate => candidate.stepId === focus) ?? eligible[0]
    return { ...item, stepId: match?.stepId ?? null, skillName: detail.plan.steps.find(step => step.requirement.skillId === item.skillId)?.requirement.skillName ?? item.skillId }
  }).filter(candidate => !steps.some(step => step.options.some(module => optionKey(module) === optionKey(candidate.module)))).filter(candidate => (!focusedStep || candidate.skillId === focusedStep.requirement.skillId) && `${candidate.module.title} ${candidate.module.moduleId} ${candidate.skillName}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  useEffect(() => { onDirtyChange(dirty) }, [dirty, onDirtyChange])
  function change(stepId: string, module: RuleModuleOption, include: boolean) {
    const step = detail.plan.steps.find(item => item.id === stepId)
    if (blocked || !step || !editableStep(step)) return
    const key = optionKey(module)
    if (include && !detail.candidates.some(candidate => candidate.stepId === stepId && optionKey(candidate.module) === key)) return
    changeRevision.current++; setChecked(null); setError(null)
    setChosen(previous => ({ ...previous, [stepId]: (include ? [...new Set([...(previous[stepId] ?? []), key])] : (previous[stepId] ?? []).filter(value => value !== key)).sort() }))
    setFocus(stepId)
  }
  function move(stepId: string, direction: -1 | 1) {
    if (blocked || !reorderableIds.includes(stepId)) return
    const slots = stepOrder.map((id, index) => reorderableIds.includes(id) ? index : -1).filter(index => index >= 0)
    const position = slots.indexOf(stepOrder.indexOf(stepId)), target = slots[position + direction]
    if (position < 0 || target === undefined) return
    const next = [...stepOrder], source = slots[position]; [next[source], next[target]] = [next[target], next[source]]
    changeRevision.current++; setChecked(null); setError(null); setStepOrder(next); setFocus(stepId)
  }
  function clearDrag() {
    const value = dragContext.current; dragContext.current = null
    if (value?.element.hasPointerCapture(value.pointerId)) value.element.releasePointerCapture(value.pointerId)
    setDragged(null); setPointer(null)
  }
  function startDrag(event: PointerEvent<HTMLElement>, stepId: string, module: RuleModuleOption, from: DragModule['from']) {
    const step = detail.plan.steps.find(item => item.id === stepId), target = event.target as HTMLElement
    const handle = target.closest('[data-module-drag-handle]')
    if (event.button !== 0 || blocked || !step || !editableStep(step) || (!handle && target.closest('button,a,input,select,textarea'))) return
    if (from === 'catalog' && !detail.candidates.some(candidate => candidate.stepId === stepId && optionKey(candidate.module) === optionKey(module))) return
    event.preventDefault(); event.stopPropagation()
    const value: PointerDrag = { stepId, key: optionKey(module), from, hash: detail.status.contentHash, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false, element: event.currentTarget }
    dragContext.current = value; event.currentTarget.setPointerCapture(event.pointerId)
  }
  function moveDrag(event: PointerEvent<HTMLElement>) {
    const value = dragContext.current
    if (!value || event.pointerId !== value.pointerId) return
    if (!value.moved && Math.hypot(event.clientX - value.startX, event.clientY - value.startY) < 6) return
    event.preventDefault(); value.moved = true; setDragged(value); setPointer({ x: event.clientX, y: event.clientY })
  }
  function finishDrag(event: PointerEvent<HTMLElement>) {
    const value = dragContext.current
    if (!value || event.pointerId !== value.pointerId) return
    const zone = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-module-drop-zone]')?.dataset.moduleDropZone
    const accepted = value.moved && !blocked && value.hash === detail.status.contentHash && zone === (value.from === 'catalog' ? 'graph' : 'catalog')
    event.preventDefault(); event.stopPropagation(); clearDrag()
    const module = modules.get(value.stepId + String.fromCharCode(10) + value.key)
    if (accepted && module) change(value.stepId, module, value.from === 'catalog')
  }
  const dragEvents: ModuleDragEvents = { onPointerMove: moveDrag, onPointerUp: finishDrag, onPointerCancel: clearDrag, onLostPointerCapture: event => { if (event.target === event.currentTarget) clearDrag() } }
  useEffect(() => {
    if (!dragged) return
    const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); clearDrag() } }
    window.addEventListener('keydown', cancel)
    return () => window.removeEventListener('keydown', cancel)
  }, [dragged])
  async function check() {
    if (blocked || checkFlight.current) return
    const revision = changeRevision.current; checkFlight.current = true; setChecking(true); setError(null)
    try { const result = await checkModuleSelection(id, detail, selections, stepOrder); if (revision === changeRevision.current) setChecked(result) }
    catch (cause) { setError(cause) } finally { setChecking(false); checkFlight.current = false }
  }
  return <div className="space-y-3">
    <Card className="sticky top-[var(--workspace-header-height)] z-20 border-primary/20 bg-card p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><Badge variant={dirty ? 'warning' : 'outline'}>{tr(dirty ? 'unsaved' : 'saved')}</Badge><Badge variant={validation.valid ? 'success' : 'warning'}>{t('initialPathway.state.' + (validation.valid ? 'VALID' : 'UNRESOLVED'))}</Badge></div>
        <div className="flex flex-wrap justify-end gap-2"><Button size="sm" variant="outline" className="border-border font-semibold shadow-xs" disabled={blocked || dirty} leftIcon={<RefreshCw size={14} />} onClick={() => onCommand(ruleReviewCommand(id, detail, 'refresh'))}>{t('rulePathway.refreshProviders')}</Button><Button size="sm" variant="secondary" className="border border-primary/30 font-semibold" disabled={blocked} leftIcon={<ListChecks size={14} />} onClick={() => void check()} isLoading={checking}>{tr('check')}</Button><Button size="sm" variant="primary" className="font-semibold" disabled={blocked || !dirty} leftIcon={<Save size={14} />} onClick={() => onCommand(moduleSelectionCommand(id, detail, selections, stepOrder))}>{tr('save')}</Button><Button size="sm" disabled={blocked || dirty || !validation.valid} leftIcon={<CheckCircle2 size={14} />} onClick={onApprove}>{tr('approve')}</Button></div>
      </div>
      {dirty && <Text variant="caption" className="mt-2">{tr('saveBeforeApproval')}</Text>}
      {!editable && <Text variant="caption" className="mt-2">{tr('readOnly')}</Text>}
      {validation.issues.length > 0 && <details className="mt-2 text-body-sm"><summary className="cursor-pointer font-medium text-muted-foreground">{tr('issues')} ({validation.issues.length})</summary><div className="mt-2 max-h-28 space-y-1 overflow-y-auto">{validation.issues.map((issue, index) => <Text key={index} variant="caption" role={issue.blocking ? 'alert' : 'note'}>{detail.plan.steps.find(step => step.id === issue.stepId)?.requirement.skillName} · {t('initialPathway.diagnostics.' + issue.reason, t('rulePathway.issue'))}</Text>)}</div></details>}
    </Card>
    {Boolean(error) && <InitialPathwayFeedback error={error} busy={checking} onRetry={() => void check()} />}
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <Card className="flex h-[max(42rem,85dvh)] min-h-0 flex-col overflow-hidden border-primary/30 shadow-sm" data-module-drop-zone="graph"><div className="flex items-center justify-between gap-2 border-b border-primary/20 bg-secondary/50 px-4 py-4"><Heading level={2} size="card">{tr('graph')}</Heading><Badge variant="outline">{steps.length} {t('rulePathway.requirements')}</Badge></div>
        <RequirementModuleGraph dragEvents={dragEvents} steps={steps} reorderableIds={reorderableIds} onMove={move} active={focus} disabled={blocked} onFocus={setFocus} onDetails={(stepId, module) => setSelected({ stepId, module })} onExclude={(stepId, module) => change(stepId, module, false)} onDrag={(event, stepId, module) => startDrag(event, stepId, module, 'graph')} canDrop={dragged?.from === 'catalog' && !blocked} />
      </Card>
      <Card className={`flex h-[max(42rem,85dvh)] min-h-0 flex-col overflow-hidden border-primary/25 shadow-sm ${dragged?.from === 'graph' ? 'ring-2 ring-primary' : ''}`} data-module-drop-zone="catalog">
        <div className="space-y-3 border-b border-primary/20 bg-secondary/40 p-4"><div className="flex items-center justify-between gap-2"><Heading level={2} size="card">{tr('catalog')}</Heading><Badge variant="outline">{candidates.length}</Badge></div><Text variant="caption" className="text-foreground">{tr(dragged?.from === 'graph' ? 'excludeHint' : 'includeHint')}</Text>
          <Input leftIcon={<Search size={14} />} value={search} onChange={event => setSearch(event.target.value)} placeholder={tr('search')} aria-label={tr('search')} className="h-9" />
          <select value={focus} onChange={event => setFocus(event.target.value)} aria-label={tr('skillFilter')} className="h-9 w-full rounded-md border border-input bg-background px-3 text-body-sm"><option value="">{tr('allSkills')}</option>{detail.plan.steps.map(step => <option key={step.id} value={step.id}>{step.requirement.skillName} · {t('knowledgeLevel.' + step.requirement.knowledgeLevel)}</option>)}</select>
          {focusedStep && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-card p-2"><Badge variant="secondary">{t('knowledgeLevel.' + focusedStep.requirement.knowledgeLevel)}</Badge><div className="flex items-center gap-2">{detail.bypassableStepIds?.includes(focusedStep.id) && <Button size="sm" variant="secondary" className="border border-primary/40 font-semibold shadow-xs" disabled={blocked || dirty} onClick={() => onBypass(focusedStep)}>{t('rulePathway.bypass')}</Button>}<Button size="icon" variant="outline" className="size-8 border-primary/40 text-primary" aria-label={tr('bypassHelpTitle')} onClick={() => setBypassHelp(true)}><CircleHelp size={17} /></Button></div></div>}
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-background/40 p-4">
          {candidates.length === 0 && <Text variant="body-sm" className="rounded-lg border border-dashed border-border p-4">{tr('emptyAvailable')}</Text>}
          {candidates.map(candidate => { const module = candidate.module, included = candidate.stepId !== null && (chosen[candidate.stepId] ?? []).includes(optionKey(module)), step = detail.plan.steps.find(item => item.id === candidate.stepId), allowed = Boolean(step && editableStep(step))
            return <article key={candidate.skillId + ':' + optionKey(module)} data-module-drag-source draggable={false} {...dragEvents} onDragStart={event => event.preventDefault()} onPointerDown={event => { if (candidate.stepId && allowed) startDrag(event, candidate.stepId, module, 'catalog') }} className={`space-y-3 rounded-lg border p-3 ${allowed ? 'border-primary/40 bg-card shadow-sm' : 'border-border bg-muted/30'}`}>
              <div className="flex items-start gap-2"><button type="button" data-module-drag-handle disabled={blocked || !allowed} className="module-review-drag-handle mt-1 shrink-0" aria-label={tr('dragInclude')} title={tr('dragInclude')}><GripVertical size={18} aria-hidden="true" /></button><div className="min-w-0 flex-1"><Heading level={3} size="card" className="break-words">{module.title}</Heading><Text variant="caption" className="break-all">{module.moduleId}</Text><Text variant="caption">{candidate.skillName} · {t('knowledgeLevel.' + candidate.knowledgeLevel)}</Text></div></div>
              {!candidate.stepId && <Text variant="caption">{tr('outsideScope')}</Text>}
              <div className="flex flex-wrap items-center justify-between gap-2"><Badge variant={allowed ? 'secondary' : 'outline'}>{tr(allowed ? 'available' : 'outsideRequirement')}</Badge><div className="flex gap-2"><Button size="sm" variant="outline" className="border-primary/40 font-semibold text-primary hover:bg-secondary" leftIcon={<Eye size={14} />} onClick={() => setSelected({ stepId: candidate.stepId, module })}>{tr('details')}</Button><Button size="sm" variant={included ? 'outline' : 'primary'} disabled={blocked || !allowed} title={!candidate.stepId ? tr('outsideScope') : undefined} leftIcon={included ? <X size={14} /> : <Plus size={14} />} onClick={() => { if (candidate.stepId) change(candidate.stepId, module, !included) }}>{tr(included ? 'exclude' : 'include')}</Button></div></div>
            </article>
          })}
        </div>
      </Card>
    </div>
    {dragged && pointer && <div aria-hidden="true" className="pointer-events-none fixed z-50 max-w-64 rounded-lg bg-primary px-4 py-3 text-primary-foreground shadow-lg" style={{ left: pointer.x + 16, top: pointer.y + 16 }}><span className="block text-body-sm font-semibold">{tr(dragged.from === 'catalog' ? 'include' : 'exclude')}</span><span className="mt-1 block text-body-sm">{modules.get(dragged.stepId + '\n' + dragged.key)?.title}</span></div>}
    {bypassHelp && <Dialog open onOpenChange={setBypassHelp} className="border-border" ariaLabel={tr('bypassHelpTitle')}><DialogHeader className="mb-5"><DialogTitle><CircleHelp className="size-5 shrink-0 text-primary" />{tr('bypassHelpTitle')}</DialogTitle></DialogHeader><DialogBody className="space-y-5"><Text variant="body" tone="foreground">{tr('bypassEffect')}</Text><Text variant="body" tone="foreground">{tr('bypassHistory')}</Text><div className="rounded-lg bg-muted/50 p-4"><Text variant="body" tone="foreground">{tr('bypassNotAchievement')}</Text></div></DialogBody><DialogFooter><Button size="sm" onClick={() => setBypassHelp(false)}>{t('common.close')}</Button></DialogFooter></Dialog>}
    {selected && <ReviewModuleDetail outsideScope={selected.stepId === null} scope={scope} module={selected.module} included={selected.stepId !== null && (chosen[selected.stepId] ?? []).includes(optionKey(selected.module))} disabled={blocked || !selected.stepId || !editableStep(detail.plan.steps.find(step => step.id === selected.stepId)!)} onClose={() => setSelected(null)} onChange={include => { if (selected.stepId) change(selected.stepId, selected.module, include) }} />}
  </div>
}

function ReviewModuleDetail({ scope, module, included, disabled, outsideScope, onClose, onChange }: { outsideScope: boolean; scope: string; module: RuleModuleOption; included: boolean; disabled: boolean; onClose: () => void; onChange: (include: boolean) => void }) {
  const { t } = useTranslation()
  const query = useQuery({ queryKey: ['moduleReviewDetail', scope, module.moduleId, module.moduleRevision], queryFn: ({ signal }) => moduleRequest<ModuleDocument>('/modules/' + encodeURIComponent(module.moduleId), 'GET', undefined, signal), retry: false })
  const payload = query.data?.revisions.find(revision => revision.number === module.moduleRevision)?.payload
  return <Dialog open size="wide" className="max-w-3xl border-border" onOpenChange={open => { if (!open) onClose() }} ariaLabel={module.title}>
    <DialogHeader className="mb-5"><DialogTitle><BookOpen className="size-5 shrink-0 text-primary" />{module.title}</DialogTitle><DialogDescription>{module.moduleId} · {module.contentVersion}</DialogDescription></DialogHeader>
    <DialogBody className="space-y-4">{payload && <ModuleAssessmentConfiguration key={`${module.moduleId}:${module.moduleRevision}`} scope={scope} payload={payload} />}{query.data?.createdBy === 'DEVELOPMENT_SEED' && <div className="space-y-2 rounded-lg bg-muted/40 p-3"><Badge variant="secondary">{t('moduleReview.seedLabel')}</Badge><Text variant="caption">{t('moduleReview.seedHelp')}</Text></div>}{query.isPending && <LoadingCard label={t('initialPathway.loading')} />}{query.error && <InitialPathwayFeedback error={query.error} onRetry={() => void query.refetch()} />}{!query.isPending && !query.error && !payload && <Text>{t('initialPathway.state.UNAVAILABLE')}</Text>}{payload && <><div className="flex flex-wrap gap-2"><Badge variant="secondary">{t('knowledgeLevel.' + payload.knowledgeLevel)}</Badge><Badge variant="outline">{payload.duration} {t('moduleReview.minutes')}</Badge></div><div className="module-review-content"><ModuleMarkdown markdown={payload.content.markdown} /></div></>}</DialogBody>
    <DialogFooter><div className="mr-auto max-w-sm self-center">{outsideScope && <Text variant="body-sm" tone="foreground">{t('moduleReview.outsideScope')}</Text>}</div><Button size="sm" variant="outline" className="border-border font-semibold" onClick={onClose}>{t('common.close')}</Button><Button size="sm" variant={included ? 'destructive' : 'primary'} disabled={disabled} onClick={() => onChange(!included)}>{t('moduleReview.' + (included ? 'exclude' : 'include'))}</Button></DialogFooter>
  </Dialog>
}
