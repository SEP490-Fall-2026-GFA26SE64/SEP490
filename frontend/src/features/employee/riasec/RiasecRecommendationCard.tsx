import { Pin } from 'lucide-react'
import { Button } from '../../../shared/components/ui/Button'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { cn } from '../../../shared/lib/utils'
import type { Recommendation } from './riasecApi'
export function RiasecRecommendationCard({ recommendation: r, isPinned, preview, onPreview, onFocusPreview, onToggle, onDetails }: {
  recommendation: Recommendation; isPinned: boolean; preview: boolean;
  onPreview: (id: string | null) => void; onFocusPreview: (id: string | null) => void;
  onToggle: () => void; onDetails: () => void
}) {
  const { language } = useTranslation()
  const copy = (en: string, vn: string) => language === 'vi' ? vn : en
  const id = r.position.id
  return <article data-testid="riasec-recommendation" className={cn('min-w-0 rounded-xl border bg-background/60 transition-colors duration-300 motion-reduce:transition-none', preview || isPinned ? 'border-primary/60 bg-secondary/30' : 'border-border', isPinned && 'ring-1 ring-primary/30')}
            onPointerEnter={e => { if (e.pointerType === 'mouse') onPreview(id) }} onPointerLeave={() => onPreview(null)}>
            <button type="button" aria-pressed={isPinned} aria-label={`${copy('Pin comparison', 'Ghim so sánh')}: ${r.position.name}`}
              className="block w-full cursor-pointer rounded-t-xl px-3 pt-3 pb-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onFocus={e => { if (e.currentTarget.matches(':focus-visible')) onFocusPreview(id) }}
              onBlur={() => onFocusPreview(null)} onClick={onToggle}>
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-caption font-medium text-primary">Job Position</span>
                {isPinned && <span className="ml-auto inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-caption text-secondary-foreground"><Pin aria-hidden="true" className="h-3 w-3" />{copy('Pinned', '\u0110ang ghim')}</span>}
              </span>
              <span className="mt-0.5 block break-words text-body-sm font-semibold leading-snug text-secondary-foreground">{r.position.name}</span>
              <span className="mt-1.5 line-clamp-2 break-words text-caption text-muted-foreground">{r.position.description}</span>

            </button>
            <div className="px-3 pb-3"><Button variant="outline" size="sm" className="h-7 max-w-full" onClick={onDetails} aria-label={`${copy('View details', 'Xem chi tiết')}: ${r.position.name}`}>{copy('View details', 'Xem chi tiết')}</Button></div>
          </article>
}
