import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Dialog, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { AdaptiveShortages } from './AdaptiveBaselineFeedback'
import type { AdaptivePreview } from './adaptiveBaselineApi'
import { paginatePreview, type PreviewPage } from './previewPagination'
import './AdaptiveAssessmentPreview.css'

export function AdaptiveAssessmentPreview({ preview, skillNames, onClose }: {
  preview: AdaptivePreview; skillNames: Record<string, string>; onClose: () => void
}) {
  const { t } = useTranslation(), tr = (key: string) => t('adaptiveBaseline.' + key)
  const [zoom, setZoom] = useState(100), [expanded, setExpanded] = useState(false)
  const [position, setPosition] = useState({ question: 0, offset: 0 })
  const [pages, setPages] = useState<PreviewPage[]>([])
  const measure = useRef<HTMLDivElement>(null)
  const index = Math.max(0, pages.findIndex(page => page.question === position.question && page.start <= position.offset && position.offset < page.end))
  const page = pages[index], question = page?.question ?? 0
  const questionPages = pages.filter(value => value.question === question)
  const questionPage = questionPages.findIndex(value => value === page) + 1
  const item = preview.sample[question]
  const firstNumber = Math.max(0, Math.min(question - 1, preview.sample.length - 3))
  const numbers = Array.from({ length: Math.min(3, preview.sample.length) }, (_, i) => firstNumber + i)
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])
  useLayoutEffect(() => {
    const element = measure.current
    if (!element) return
    let disposed = false, frame = 0
    function layout() {
      if (!disposed && element && element.clientWidth && element.clientHeight) setPages(paginatePreview(preview.sample, element))
    }
    function schedule() { if (disposed) return; cancelAnimationFrame(frame); frame = requestAnimationFrame(layout) }
    layout()
    const observer = new ResizeObserver(schedule)
    observer.observe(element)
    void document.fonts.ready.then(schedule)
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect() }
  }, [preview, zoom, expanded])
  function move(next: number) {
    const target = pages[next]
    if (target) setPosition({ question: target.question, offset: target.start })
  }
  function choose(next: number) { setPosition({ question: next, offset: 0 }) }
  return <Dialog open onOpenChange={open => { if (!open) onClose() }} closeLabel={tr('previewReader.close')} ariaLabel={tr('test')}
    containerClassName="overflow-hidden p-2 sm:p-4"
    className={'assessment-preview ' + (expanded ? 'assessment-preview-expanded' : '')}>
    <div className="flex min-h-0 flex-1 flex-col" style={{ '--preview-font-scale': zoom / 100 } as CSSProperties}
      onKeyDown={event => {
        if (event.altKey || event.ctrlKey || event.metaKey || (event.target as HTMLElement).closest('input, textarea, select')) return
        if (event.key === 'ArrowLeft') { event.preventDefault(); move(index - 1) }
        if (event.key === 'ArrowRight') { event.preventDefault(); move(index + 1) }
      }}>
      <DialogHeader className="assessment-preview-heading">
        <div className="flex flex-wrap items-center gap-2"><DialogTitle>{tr('test')}</DialogTitle>
          <Badge variant={preview.feasible ? 'success' : 'warning'}>{tr(preview.feasible ? 'feasible' : 'infeasible')}</Badge></div>
        <Text variant="caption" className="assessment-preview-hint">{tr('previewNotice')}</Text>
      </DialogHeader>
      {preview.sample.length > 0 ? <>
        <div className="assessment-preview-toolbar flex shrink-0 flex-wrap items-center justify-between gap-2 border-y border-border py-2">
          <Text variant="body-sm" tone="foreground" className="font-semibold tabular-nums" role="status">
            {t('baselineUi.question')} {question + 1} / {preview.sample.length}
            {questionPages.length > 1 && <span className="ml-2 text-caption text-muted-foreground">· {tr('previewReader.page')} {questionPage} / {questionPages.length}</span>}
          </Text>
          <div className="flex items-center gap-1" role="group" aria-label={tr('previewReader.zoom')}>
            <Button size="icon" variant="outline" className="h-8 w-8" disabled={zoom <= 80} aria-label={tr('previewReader.zoomOut')} title={tr('previewReader.zoomOut')} onClick={() => setZoom(value => value - 10)}><ZoomOut size={16} /></Button>
            <Button size="sm" variant="ghost" className="px-2 tabular-nums" aria-label={tr('previewReader.resetZoom')} onClick={() => setZoom(100)}>{zoom}%</Button>
            <Button size="icon" variant="outline" className="h-8 w-8" disabled={zoom >= 150} aria-label={tr('previewReader.zoomIn')} title={tr('previewReader.zoomIn')} onClick={() => setZoom(value => value + 10)}><ZoomIn size={16} /></Button>
            <Button size="icon" variant="outline" className="ml-1 h-8 w-8" aria-label={tr(expanded ? 'previewReader.restore' : 'previewReader.expand')} title={tr(expanded ? 'previewReader.restore' : 'previewReader.expand')} aria-pressed={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</Button>
          </div>
        </div>
        <Text variant="caption" className="assessment-preview-skill py-2" title={item ? skillNames[item.microSkillId] : undefined}>
          {item && (skillNames[item.microSkillId] ?? tr('skill'))} · {item && tr(item.reason)}
        </Text>
        <div className="relative min-h-0 flex-1 rounded-lg border border-primary/20 bg-secondary/20 p-3 sm:p-4">
          <div className="relative h-full min-h-0">
            <div ref={measure} aria-hidden="true" className="assessment-preview-sheet invisible pointer-events-none" />
            <div className="assessment-preview-sheet" role="region" aria-label={t('baselineUi.question') + ' ' + (question + 1)} aria-live="polite" aria-atomic="true">
              {page?.parts.map((part, i) => <Text key={i} className="assessment-preview-copy" data-option={part.option}>{part.text}</Text>)}
            </div>
          </div>
        </div>
        <nav className="assessment-preview-navigation shrink-0 space-y-2 pt-3" aria-label={tr('previewReader.navigation')}>
          <div className="flex items-center justify-between gap-2">
            <Button size="sm" variant="outline" disabled={!pages.length || index === 0} onClick={() => move(index - 1)} leftIcon={<ChevronLeft size={16} />}>{tr('paging.previous')}</Button>
            <Text variant="caption" className="assessment-preview-hint">{tr('previewReader.keyboard')}</Text>
            <Button size="sm" disabled={!pages.length || index === pages.length - 1} onClick={() => move(index + 1)} rightIcon={<ChevronRight size={16} />}>{tr('paging.next')}</Button>
          </div>
          <div className="flex items-center justify-center gap-1">
            {firstNumber > 0 && <><Button size="sm" className="px-2" variant="outline" onClick={() => choose(0)} aria-label={t('baselineUi.question') + ' 1'}>1</Button>{firstNumber > 1 && <span aria-hidden="true">…</span>}</>}
            {numbers.map(number => <Button key={number} size="sm" className="px-2.5" variant={question === number ? 'primary' : 'outline'} aria-current={question === number ? 'page' : undefined} aria-label={t('baselineUi.question') + ' ' + (number + 1)} onClick={() => choose(number)}>{number + 1}</Button>)}
            {firstNumber + numbers.length < preview.sample.length && <>{firstNumber + numbers.length < preview.sample.length - 1 && <span aria-hidden="true">…</span>}<Button size="sm" className="px-2" variant="outline" onClick={() => choose(preview.sample.length - 1)} aria-label={t('baselineUi.question') + ' ' + preview.sample.length}>{preview.sample.length}</Button></>}
          </div>
        </nav>
      </> : <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-warning/40 bg-warning/5 p-4">
        <AdaptiveShortages values={preview.shortages} skillNames={skillNames} />
        {!preview.shortages.length && <Text tone="foreground">{tr('previewReader.empty')}</Text>}
      </div>}
    </div>
  </Dialog>
}
