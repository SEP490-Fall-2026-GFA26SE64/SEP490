import { useEffect, useRef, useState, type HTMLAttributes, type PointerEvent } from 'react'
import { ArrowDown, ArrowUp, Focus, GripVertical, LockKeyhole, Minus, Plus, X } from 'lucide-react'
import { Button } from '../../../shared/components/ui/Button'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import type { RuleModuleOption, RuleStep } from '../../../shared/api/requirementPathway'
import '../../employee/components/InteractiveRoleRoadmap.css'
import './RequirementModuleEditor.css'

export type ModuleDragEvents = Pick<HTMLAttributes<HTMLElement>, 'onPointerMove' | 'onPointerUp' | 'onPointerCancel' | 'onLostPointerCapture'>

export function RequirementModuleGraph({ steps, disabled, active, reorderableIds, onMove, onFocus, onDetails, onExclude, onDrag, dragEvents, canDrop }: {
  steps: RuleStep[]; disabled: boolean; active: string; reorderableIds: string[]; onMove: (id: string, direction: -1 | 1) => void;
  onFocus: (id: string) => void; onDetails: (stepId: string, module: RuleModuleOption) => void;
  onExclude: (stepId: string, module: RuleModuleOption) => void;
  dragEvents: ModuleDragEvents; onDrag: (event: PointerEvent<HTMLElement>, stepId: string, module: RuleModuleOption) => void; canDrop: boolean;
}) {
  const { t } = useTranslation(), tr = (key: string) => t('moduleReview.' + key)
  const viewport = useRef<HTMLDivElement>(null), map = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(0.85), [size, setSize] = useState({ width: 0, height: 0 })
  const pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  useEffect(() => {
    const element = map.current
    if (!element) return
    const observer = new ResizeObserver(() => setSize({ width: element.offsetWidth, height: element.offsetHeight }))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const orderKey = steps.map(step => step.id).join(',')
  useEffect(() => {
    if (!active) return
    const frame = requestAnimationFrame(() => {
      const branch = Array.from(map.current?.children ?? []).find(element => (element as HTMLElement).dataset.stepId === active) as HTMLElement | undefined
      if (branch && viewport.current) viewport.current.scrollTo({ top: Math.max(0, branch.offsetTop * zoom - 24), behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
    // Selecting a skill scrolls to its root; zoom changes preserve the viewport.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, orderKey])
  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const wheel = (event: WheelEvent) => { if (event.ctrlKey) { event.preventDefault(); setZoom(value => Math.min(1.5, Math.max(0.5, value + (event.deltaY < 0 ? 0.05 : -0.05)))) } }
    element.addEventListener('wheel', wheel, { passive: false })
    return () => element.removeEventListener('wheel', wheel)
  }, [])
  function fit() {
    if (!viewport.current || !map.current) return
    setZoom(Math.min(1, Math.max(0.5, (viewport.current.clientWidth - 24) / map.current.offsetWidth)))
    viewport.current.scrollTo({ left: 0, top: 0, behavior: 'smooth' })
  }
  function leaf(step: RuleStep, module: RuleModuleOption) {
    const protectedStep = ['FULFILLED', 'BYPASSED'].includes(step.state)
    return <article key={module.moduleId + ':' + module.moduleRevision} className="module-review-option" data-module-drag-source draggable={false} {...dragEvents} onDragStart={event => event.preventDefault()} onPointerDown={event => onDrag(event, step.id, module)}>
      <div className="module-review-option-top"><span className="inline-flex items-center gap-2"><button type="button" data-module-drag-handle disabled={disabled || protectedStep} className="module-review-drag-handle" aria-label={tr('dragExclude')} title={tr('dragExclude')}><GripVertical size={16} /></button>{tr('included')}</span><Button size="icon" variant="outline" className="module-review-exclude size-7" disabled={disabled || protectedStep} aria-label={tr('exclude') + ': ' + module.title} title={tr('exclude')} onClick={() => onExclude(step.id, module)}><X size={14} /></Button></div>
      <button type="button" className="module-review-option-title" onClick={() => onDetails(step.id, module)}>{module.title}<span className="mt-2 block text-caption text-muted-foreground">{module.moduleId}<span className="mt-1 block">{tr('version')} {module.contentVersion}</span></span></button>
    </article>
  }
  const movable = steps.filter(step => reorderableIds.includes(step.id)).map(step => step.id)
  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/40 px-4 py-3">
      <Text variant="caption" className="max-w-xs text-foreground">{tr('graphHint')}</Text>
      <div className="flex items-center gap-1"><Button size="icon" variant="outline" className="size-8 border-primary/40 text-primary" aria-label={tr('zoomOut')} onClick={() => setZoom(value => Math.max(0.5, value - 0.1))}><Minus size={14} /></Button><Text variant="caption" className="min-w-10 text-center font-semibold text-foreground">{Math.round(zoom * 100)}%</Text><Button size="icon" variant="outline" className="size-8 border-primary/40 text-primary" aria-label={tr('zoomIn')} onClick={() => setZoom(value => Math.min(1.5, value + 0.1))}><Plus size={14} /></Button><Button size="icon" variant="secondary" className="size-8 border border-primary/40" aria-label={tr('fit')} onClick={fit}><Focus size={14} /></Button></div>
    </div>
    {canDrop && <div className="border-b border-primary/40 bg-secondary px-4 py-3 text-body-sm font-semibold text-secondary-foreground" role="status">{tr('dropInclude')}</div>}
    <div ref={viewport} className={`module-review-viewport ${canDrop ? 'ring-2 ring-inset ring-primary' : ''}`}
      onPointerDown={event => { if (event.button !== 0 || (event.target as HTMLElement).closest('button,[data-module-drag-source]')) return; pan.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop }; event.currentTarget.setPointerCapture(event.pointerId) }}
      onPointerMove={event => { if (pan.current) { event.currentTarget.scrollLeft = pan.current.left + pan.current.x - event.clientX; event.currentTarget.scrollTop = pan.current.top + pan.current.y - event.clientY } }}
      onPointerUp={event => { pan.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }} onPointerCancel={() => { pan.current = null }}>
      <div className="module-review-scroll-area" style={{ width: size.width * zoom, height: size.height * zoom }}>
        <div ref={map} className="module-review-map" style={{ transform: `translateX(-50%) scale(${zoom})` }}>
          {steps.map((step, index) => { const movableIndex = movable.indexOf(step.id), locked = movableIndex < 0
            return <section key={step.id} data-step-id={step.id} className={`module-review-branch ${active === step.id ? 'is-focused' : ''}`} aria-label={step.requirement.skillName}>
              <div className="module-review-options is-left">{step.options.filter((_, i) => i % 2 === 0).map(module => leaf(step, module))}</div>
              <div className="module-review-root">
                <Button className="roadmap-module-box module-review-skill" aria-pressed={active === step.id} onClick={() => onFocus(active === step.id ? '' : step.id)}>
                  <span className="module-review-root-label">{index + 1} / {t('knowledgeLevel.' + step.requirement.knowledgeLevel)}</span><span className="module-review-root-title">{step.requirement.skillName}</span><span className="module-review-root-label">{step.options.length} {tr('modules')}</span>
                </Button>
                <div className="module-review-order-controls">{locked ? <span className="inline-flex items-center gap-1 text-caption text-muted-foreground" title={tr('positionLocked')}><LockKeyhole size={13} />{tr('fixedPosition')}</span> : <><Button size="icon" variant="outline" className="size-7 border-primary/40 text-primary" disabled={disabled || movableIndex === 0} aria-label={tr('moveUp') + ': ' + step.requirement.skillName} onClick={() => onMove(step.id, -1)}><ArrowUp size={13} /></Button><Button size="icon" variant="outline" className="size-7 border-primary/40 text-primary" disabled={disabled || movableIndex === movable.length - 1} aria-label={tr('moveDown') + ': ' + step.requirement.skillName} onClick={() => onMove(step.id, 1)}><ArrowDown size={13} /></Button></>}</div>
                {step.options.length === 0 && <Text variant="caption" className="rounded-lg border border-dashed border-primary/40 bg-card p-2 text-center">{tr('noSelection')}</Text>}
              </div>
              <div className="module-review-options is-right">{step.options.filter((_, i) => i % 2 !== 0).map(module => leaf(step, module))}</div>
            </section>
          })}
        </div>
      </div>
    </div>
  </div>
}
