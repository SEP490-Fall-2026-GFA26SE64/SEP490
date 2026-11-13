import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Award, BookOpen, CheckCircle2, ChevronDown, LocateFixed, Lock, Flag, Crosshair, ZoomIn, ZoomOut } from 'lucide-react'
import type { RuleModuleOption, RulePathway, RuleStep } from '../../../shared/api/requirementPathway'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { AssessmentStatus } from '../baseline-assessment/SkillAssessmentEntry'
import type { usePathwayAssessmentStates } from '../baseline-assessment/usePathwayAssessmentStates'
import { cn } from '../../../shared/lib/utils'
import { RequirementDetails } from './RequirementDetails'
import './EmployeeRequirementGraph.css'

type Selection = { stepId: string; optionKey?: string; certificateOnly?: boolean }
const moduleKey = (option: RuleModuleOption) => option.moduleId + ':' + option.moduleRevision
const nodeKey = (selection: Selection) => JSON.stringify([selection.stepId, selection.optionKey ?? (selection.certificateOnly ? 'certificate' : 'requirement')])

export function EmployeeRequirementGraph({ pathway, steps, preview, assessmentState, onCertificate, onInteractionLockChange }: {
  pathway: RulePathway; steps: RuleStep[]; preview: boolean
  assessmentState: ReturnType<typeof usePathwayAssessmentStates>; onCertificate?: (step: RuleStep) => void; onInteractionLockChange?: (locked: boolean) => void
}) {
  const { t } = useTranslation(), tr = (key: string) => t('rulePathway.' + key)
  const [params] = useSearchParams(), id = useId()
  const current = steps.flatMap(step => step.options.map(option => ({ step, option })))
    .find(({ step, option }) => assessmentState(step, option) === 'inProgress')
    ?? steps.flatMap(step => step.options.map(option => ({ step, option })))
      .find(({ step, option }) => step.state !== 'FULFILLED' && step.state !== 'BYPASSED' && option.startedAt && !option.completedAt)
    ?? steps.flatMap(step => step.options.map(option => ({ step, option })))
      .find(({ step, option }) => step.state === 'IN_PROGRESS' && option.startedAt)
  const [selection, setSelection] = useState<Selection>(() => {
    const deepLink = steps.flatMap(step => step.options.map(option => ({ step, option }))).find(({ step, option }) =>
      (!params.get('assessmentStep') || step.id === params.get('assessmentStep')) && option.moduleId === params.get('assessmentModule') && String(option.moduleRevision) === params.get('assessmentRevision'))
    const initial = deepLink ?? current
    return initial ? { stepId: initial.step.id, optionKey: moduleKey(initial.option) } : { stepId: (steps.find(step => step.state !== 'FULFILLED' && step.state !== 'BYPASSED') ?? steps[0]).id }
  })
  const [showAll, setShowAll] = useState(false), [detailsOpen, setDetailsOpen] = useState(() => steps.some(step => (!params.get('assessmentStep') || step.id === params.get('assessmentStep')) && step.options.some(option => option.moduleId === params.get('assessmentModule') && String(option.moduleRevision) === params.get('assessmentRevision')))), [locked, setLocked] = useState(false)
  const updateLock = useCallback((value: boolean) => { setLocked(value); onInteractionLockChange?.(value) }, [onInteractionLockChange])
  // A refreshed plan can remove a branch; fall back without inventing learning state.
  const selectedStep = steps.find(step => step.id === selection.stepId) ?? steps[0]
  const selected: Selection = { stepId: selectedStep.id, optionKey: selectedStep.options.some(option => moduleKey(option) === selection.optionKey) ? selection.optionKey : undefined, certificateOnly: Boolean(selection.certificateOnly && selectedStep.certificate) }
  const canvas = useRef<HTMLDivElement>(null), viewport = useRef<HTMLDivElement>(null)
  const nodes = useRef(new Map<string, HTMLElement>()), paths = useRef(new Map<string, SVGPathElement>())
  const clips = useRef(new Map<string, SVGRectElement>())
  const anchor = useRef<{ key: string; top: number } | null>(null)
  const locate = useRef<string | null>(null)
  const [zoom, setZoom] = useState(0.8)
  const zoomLayout = useRef<HTMLDivElement>(null), zoomSpace = useRef<HTMLDivElement>(null)
  function changeZoom(next: number) {
    const box = viewport.current?.getBoundingClientRect()
    if (box) {
      const visible = steps.map(step => ({ key: nodeKey({ stepId: step.id }), node: nodes.current.get(nodeKey({ stepId: step.id })) }))
        .filter((entry): entry is { key: string; node: HTMLElement } => Boolean(entry.node && entry.node.getBoundingClientRect().bottom > box.top && entry.node.getBoundingClientRect().top < box.bottom))
        .sort((a, b) => Math.abs(a.node.getBoundingClientRect().top - box.top - box.height / 2) - Math.abs(b.node.getBoundingClientRect().top - box.top - box.height / 2))
      const nearest = visible[0]
      anchor.current = nearest ? { key: nearest.key, top: nearest.node.getBoundingClientRect().top - box.top } : null
    }
    setZoom(Math.max(0.65, Math.min(1.5, Math.round(next * 100) / 100)))
  }

  function holdBranch(stepId: string) {
    const key = nodeKey({ stepId }), node = nodes.current.get(key), box = viewport.current?.getBoundingClientRect()
    anchor.current = node && box && node.getBoundingClientRect().bottom > box.top && node.getBoundingClientRect().top < box.bottom
      ? { key, top: node.getBoundingClientRect().top - box.top } : null
  }
  function select(next: Selection, reveal = false, openDetails = false) {
    if (locked) return
    const key = nodeKey({ stepId: next.stepId })
    holdBranch(next.stepId)
    if (reveal) { locate.current = key; anchor.current = null }
    setSelection(next); setDetailsOpen(openDetails); setShowAll(false)
  }

  // Observe real node bounds throughout the CSS expansion, including interrupted
  // transitions. SVG endpoints follow layout every frame, without a second easing.
  useLayoutEffect(() => {
    const surface = canvas.current, scroller = viewport.current
    if (!surface || !scroller) return
    function draw() {
      if (!surface || !scroller) return
      if (zoomLayout.current) {
        zoomLayout.current.style.width = scroller.clientWidth / zoom + 'px'
        zoomLayout.current.style.transform = 'translateX(-50%) scale(' + zoom + ')'
      }
      if (zoomSpace.current) zoomSpace.current.style.height = surface.offsetHeight * zoom + 'px'
      const bounds = surface.getBoundingClientRect()
      const rect = (key: string) => {
        const r = nodes.current.get(key)?.getBoundingClientRect()
        return r ? { x: (r.left - bounds.left) / zoom, y: (r.top - bounds.top) / zoom, w: r.width / zoom, h: r.height / zoom } : null
      }
      const role = rect('role')
      if (!role) return
      for (const [index, step] of steps.entries()) {
        const requirement = rect(nodeKey({ stepId: step.id }))
        if (!requirement) continue
        const row = nodes.current.get(nodeKey({ stepId: step.id }))?.closest('.employee-graph-branch')?.getBoundingClientRect()
        const clip = clips.current.get(step.id)
        if (row && clip) {
          clip.setAttribute('x', '0'); clip.setAttribute('y', String((row.top - bounds.top) / zoom))
          clip.setAttribute('width', String(surface.offsetWidth)); clip.setAttribute('height', String(row.height / zoom + 6))
        }
        const x = requirement.x + requirement.w / 2, y = requirement.y
        // This trail groups Role requirements in display order, without arrows.
        // Only API dependencies in details convey actual prerequisites.
        const previous = index === 0 ? role : rect(nodeKey({ stepId: steps[index - 1].id }))
        if (previous) {
          const x1 = previous.x + previous.w / 2, y1 = previous.y + previous.h
          const previousRow = index > 0 ? nodes.current.get(nodeKey({ stepId: steps[index - 1].id }))?.closest('.employee-graph-branch')?.getBoundingClientRect() : null
          const exitY = previousRow ? (previousRow.bottom - bounds.top) / zoom + 12 : y1
          const mid = exitY + (y - exitY) / 2
          const singleColumn = getComputedStyle(surface).getPropertyValue('--employee-graph-single').trim() === '1'
          const lane = singleColumn && previousRow ? surface.offsetWidth - 10 : x1
          const corner = Math.min(12, Math.max(0, (exitY - y1) / 2))
          const lead = singleColumn && previousRow ? `M ${x1} ${y1} C ${x1} ${y1 + corner}, ${lane} ${y1 + corner}, ${lane} ${y1 + corner * 2} L ${lane} ${exitY}` : `M ${x1} ${y1} L ${x1} ${exitY}`
          paths.current.get(step.id)?.setAttribute('d', `${lead} C ${lane} ${mid}, ${x} ${mid}, ${x} ${y}`)
        }
        const choices: Selection[] = [...step.options.map(option => ({ stepId: step.id, optionKey: moduleKey(option) })), ...(step.certificate ? [{ stepId: step.id, certificateOnly: true }] : [])]
        for (const choice of choices) {
          const key = nodeKey(choice), target = rect(key), path = paths.current.get(key)
          if (!target || !path) continue
          const below = getComputedStyle(surface).getPropertyValue('--employee-graph-stacked').trim() === '1'
          if (below) {
            // Route down the outside of each wing so multiple choices never
            // send an edge through the earlier choice's text on small screens.
            const left = target.x + target.w / 2 < x, x1 = requirement.x + requirement.w * (left ? 0.25 : 0.75), y1 = requirement.y + requirement.h
            const x2 = left ? target.x : target.x + target.w, y2 = target.y + target.h / 2, lane = x2 + (left ? -8 : 8)
            path.setAttribute('d', `M ${x1} ${y1} C ${x1} ${y1 + 12}, ${lane} ${y1 + 12}, ${lane} ${y1 + 24} L ${lane} ${y2 - 8} Q ${lane} ${y2}, ${x2} ${y2}`)
          } else {
            const left = target.x < requirement.x, x1 = left ? requirement.x : requirement.x + requirement.w, y1 = requirement.y + requirement.h / 2
            const x2 = left ? target.x + target.w : target.x, y2 = target.y + target.h / 2
            const mid = (x1 + x2) / 2
            path.setAttribute('d', `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`)
          }
        }
      }
      if (anchor.current) {
        const node = nodes.current.get(anchor.current.key)
        if (node) scroller.scrollTop += node.getBoundingClientRect().top - scroller.getBoundingClientRect().top - anchor.current.top
      }
    }
    draw()
    if (locate.current) {
      const node = nodes.current.get(locate.current)
      if (node) {
        scroller.scrollTop += node.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 32
        node.focus({ preventScroll: true })
        anchor.current = { key: locate.current, top: node.getBoundingClientRect().top - scroller.getBoundingClientRect().top }
      }
      locate.current = null
    }
    const observer = new ResizeObserver(draw)
    observer.observe(scroller)
    observer.observe(surface)
    nodes.current.forEach(node => observer.observe(node))
    surface.querySelectorAll('.employee-graph-options').forEach(node => observer.observe(node))
    const cancelAnchor = () => { anchor.current = null }
    const anchorTimeout = window.setTimeout(cancelAnchor, 300)
    scroller.addEventListener('wheel', cancelAnchor, { passive: true })
    scroller.addEventListener('touchstart', cancelAnchor, { passive: true })
    scroller.addEventListener('pointerdown', cancelAnchor, { passive: true })
    scroller.addEventListener('keydown', cancelAnchor)
    return () => { window.clearTimeout(anchorTimeout); observer.disconnect(); scroller.removeEventListener('wheel', cancelAnchor); scroller.removeEventListener('touchstart', cancelAnchor); scroller.removeEventListener('pointerdown', cancelAnchor); scroller.removeEventListener('keydown', cancelAnchor) }
  })

  function closeDetails() {
    setDetailsOpen(false)
    nodes.current.get(nodeKey(selected))?.focus({ preventScroll: true })
  }
  const registerNode = (key: string) => (node: HTMLElement | null) => { if (node) nodes.current.set(key, node); else nodes.current.delete(key) }
  const registerPath = (key: string) => (path: SVGPathElement | null) => { if (path) paths.current.set(key, path); else paths.current.delete(key) }
  function choiceNode(step: RuleStep, option?: RuleModuleOption) {
    const choice: Selection = { stepId: step.id, ...(option ? { optionKey: moduleKey(option) } : { certificateOnly: true }) }, active = nodeKey(selected) === nodeKey(choice)
    const state = option ? assessmentState(step, option) : null
    return <Button key={nodeKey(choice)} ref={registerNode(nodeKey(choice))} variant="outline" disabled={locked} aria-pressed={active} aria-haspopup="dialog" onClick={() => select(choice, false, true)} className={cn('employee-graph-node employee-graph-choice', !option && 'is-certificate', active && 'is-selected', state === 'failed' && 'is-failed', option && (option.completedAt || option.startedAt) && 'is-started')}>
      <span className="space-y-2"><span className="employee-graph-type">{option ? <BookOpen className="size-4 shrink-0" aria-hidden="true" /> : <Award className="size-4 shrink-0" aria-hidden="true" />}{tr(option ? 'graph.module' : 'graph.certificate')}</span><span className="block font-semibold">{option?.title ?? step.certificate?.name}</span>
        {option ? <><span className="block"><Badge variant={option.completedAt ? 'success' : option.startedAt ? 'warning' : 'outline'}>{tr(option.completedAt ? 'contentComplete' : option.startedAt ? 'started' : 'notStarted')}</Badge></span><span className="block"><AssessmentStatus state={state} partialLabel={tr('employeeLabels.partiallyPassed')} /></span></> : <span className="block text-caption text-muted-foreground">{tr('graph.certificateHelp')}</span>}
      </span>
    </Button>
  }
  const required = steps.filter(step => step.kind === 'REQUIRED'), achieved = required.filter(step => step.state === 'FULFILLED').length
  return <div className="employee-requirement-graph"><div className="employee-pathway-layout"><div className="employee-pathway-graph-pane space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3"><Text variant="body-sm">{tr('graph.help')}</Text><div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={locked} aria-pressed={showAll} onClick={() => { holdBranch(selectedStep.id); setShowAll(value => !value) }}>{tr(showAll ? 'graph.focus' : 'graph.expandAll')}</Button>
      <Button variant="outline" disabled={locked || !current || pathway.archived} onClick={() => { if (current) select({ stepId: current.step.id, optionKey: moduleKey(current.option) }, true) }}><LocateFixed className="mr-2 size-4" aria-hidden="true" />{tr('graph.current')}</Button>
      <Button variant="secondary" disabled={locked} aria-haspopup="dialog" onClick={() => setDetailsOpen(true)}>{tr('graph.details')}</Button>
    </div></div>
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={tr('employeeLabels.zoom')}>
      <Button variant="outline" size="icon" disabled={zoom <= 0.65} aria-label={tr('employeeLabels.zoomOut')} onClick={() => changeZoom(zoom - 0.1)}><ZoomOut className="size-4" aria-hidden="true" /></Button>
      <Button variant="outline" aria-label={tr('employeeLabels.resetZoom')} onClick={() => changeZoom(1)}>{Math.round(zoom * 100)}%</Button>
      <Button variant="outline" size="icon" disabled={zoom >= 1.5} aria-label={tr('employeeLabels.zoomIn')} onClick={() => changeZoom(zoom + 0.1)}><ZoomIn className="size-4" aria-hidden="true" /></Button>
    </div>
    <div ref={viewport} className="employee-graph-viewport scrollbar-hidden" role="region" aria-label={t('pathway.interactiveRoadmap')} tabIndex={0}>
      <div ref={zoomSpace} className="employee-graph-zoom-space"><div ref={zoomLayout} className="employee-graph-zoom-layout"><div ref={canvas} className="employee-graph-canvas">
        <svg className="employee-graph-wires" aria-hidden="true"><defs>{steps.map((step, index) => <clipPath key={step.id} id={id + '-clip-' + index}><rect ref={node => { if (node) clips.current.set(step.id, node); else clips.current.delete(step.id) }} /></clipPath>)}</defs>{steps.map(step => <path key={step.id} ref={registerPath(step.id)} />)}{steps.flatMap((step, index) => [...step.options.map(option => ({ stepId: step.id, optionKey: moduleKey(option) })), ...(step.certificate ? [{ stepId: step.id, certificateOnly: true }] : [])].map(choice => <path key={nodeKey(choice)} ref={registerPath(nodeKey(choice))} clipPath={`url(#${id}-clip-${index})`} className={cn('is-alternative', (showAll || selectedStep.id === step.id) && 'is-visible')} />))}</svg>
        <div ref={registerNode('role')} className="employee-graph-role"><Text variant="eyebrow" className="employee-graph-type justify-center"><Flag className="size-5" aria-hidden="true" />{t('initialPathway.targetRole')}</Text><Heading level={2} size="subsection">{pathway.roleName}</Heading><Text variant="body-sm">{pathway.levelName}</Text></div>
        {steps.map(step => {
          const open = showAll || selectedStep.id === step.id, active = selectedStep.id === step.id
          const choices = [...step.options.map(option => ({ key: moduleKey(option), option })), ...(step.certificate ? [{ key: 'certificate', option: undefined }] : [])]
          return <div key={step.id} className={cn('employee-graph-branch', active && 'is-active')}>
            <Button ref={registerNode(nodeKey({ stepId: step.id }))} disabled={locked} aria-expanded={open} aria-controls={id + '-choices-' + step.id} aria-pressed={active && !selected.optionKey && !selected.certificateOnly} variant="outline" className={cn('employee-graph-node employee-graph-requirement', active && 'is-selected', step.state === 'FULFILLED' && 'is-fulfilled')} onClick={() => select({ stepId: step.id })}>
              <span className="space-y-2"><span className="employee-graph-type"><Crosshair className="size-5 shrink-0" aria-hidden="true" /><span>{tr('graph.requirement')}</span><ChevronDown className={cn('ml-auto size-4 shrink-0', open && 'rotate-180')} aria-hidden="true" /></span><span className="block text-caption text-muted-foreground">{tr(step.kind === 'REQUIRED' ? 'employeeLabels.required' : 'employeeLabels.parallel')}</span><span className="block font-semibold">{step.requirement.skillName}</span><span className="block text-caption">{t('knowledgeLevel.' + step.requirement.knowledgeLevel)}</span><span className="flex flex-wrap items-center gap-2">{step.state === 'FULFILLED' && <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />}<Badge variant={step.state === 'FULFILLED' ? 'success' : 'warning'}>{tr('employeeLabels.state.' + step.state)}</Badge>{step.learningLocked && <Lock className="size-4 shrink-0" aria-label={tr('employeeLabels.locked')} />}</span><span className="block text-caption">{tr('graph.options')}: {choices.length}</span></span>
            </Button>
            <div id={id + '-choices-' + step.id} className="employee-graph-options" data-open={open} inert={!open} aria-hidden={!open}>
              <div className="employee-graph-options-inner">{[0, 1].map(side => <div key={side} className={cn('employee-graph-wing', side === 0 ? 'is-left' : 'is-right')}>{choices.filter((_, index) => index % 2 === side).map(choice => choiceNode(step, choice.option))}</div>)}</div>
            </div>
          </div>
        })}
      </div>
    </div>
    </div></div>
    <div className="flex flex-wrap gap-x-5 gap-y-2"><Text variant="caption">{tr('graph.roleEdges')}</Text><Text variant="caption">{tr('graph.optionEdges')}</Text></div>
    <Text variant="caption" role="status" aria-live="polite">{tr('graph.selected')}: {selectedStep.requirement.skillName}{selected.optionKey ? ' · ' + selectedStep.options.find(option => moduleKey(option) === selected.optionKey)?.title : selected.certificateOnly ? ' · ' + selectedStep.certificate?.name : ''}</Text>
    </div>
    <aside tabIndex={0} className="employee-pathway-timeline scrollbar-hidden" aria-label={t('pathway.adaptiveTimeline')}>
      <section className="rounded-xl border border-border bg-card p-4" aria-labelledby={id + '-timeline'}><div className="flex flex-wrap items-center justify-between gap-2"><Heading id={id + '-timeline'} level={2} size="card">{t('pathway.adaptiveTimeline')}</Heading><Text as="span" variant="caption" tone="foreground" className="ml-auto font-semibold">{tr('employeeLabels.requirementsMet')}: {achieved}/{required.length}</Text></div><Text variant="caption" className="mt-2">{tr('graph.timelineHelp')}</Text><ol className="employee-pathway-mini-timeline mt-4">{steps.map(step => <li key={step.id}><Button variant="ghost" disabled={locked} className={cn('h-auto w-full justify-start whitespace-normal p-2 text-left [&>span]:block [&>span]:w-full [&>span]:whitespace-normal', step.id === selectedStep.id && 'bg-secondary')} aria-current={step.id === selectedStep.id ? 'step' : undefined} onClick={() => select({ stepId: step.id }, true)}><span className="block font-semibold">{step.requirement.skillName}</span><span className="my-1 block text-caption text-muted-foreground">{t('knowledgeLevel.' + step.requirement.knowledgeLevel)} · {tr(step.kind === 'REQUIRED' ? 'employeeLabels.required' : 'employeeLabels.parallel')}</span><Badge variant={step.state === 'FULFILLED' ? 'success' : 'warning'}>{tr('employeeLabels.state.' + step.state)}</Badge></Button></li>)}</ol></section>
    </aside></div>
    {detailsOpen && <RequirementDetails key={nodeKey(selected)} pathway={pathway} step={selectedStep} assessmentState={assessmentState} preview={preview} optionKey={selected.optionKey} certificateOnly={selected.certificateOnly} onClose={closeDetails} onCertificate={onCertificate} onLockChange={updateLock} onSelectStep={step => select({ stepId: step.id }, true)} />}
  </div>
}
