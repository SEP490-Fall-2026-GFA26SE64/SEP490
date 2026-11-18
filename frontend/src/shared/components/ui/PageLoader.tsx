import { useEffect, useState } from 'react'
import { Network, RotateCw } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './Button'

// Read the persisted UI language directly so the loader also works before/outside LanguageProvider (boot, Suspense).
function storedLanguage() {
  try {
    return localStorage.getItem('app_language') === 'vi' ? 'vi' : 'en'
  } catch {
    return 'en'
  }
}

type PageLoaderProps = {
  /** `fullscreen` covers the viewport for route/auth transitions; `inline` fills a content region inside the workspace shell. */
  variant?: 'fullscreen' | 'inline'
  /** `sm` renders a compact single-row loader for small regions such as dropdowns or panels. Inline only. */
  size?: 'md' | 'sm'
  label?: string
  className?: string
}

/** Delay before a long-running load explains itself, so a slow server never looks like a frozen page. */
export const PAGE_LOADER_SLOW_MS = 8000

/** The single loading treatment for every page transition and page-level data load. */
export function PageLoader({ variant = 'inline', size = 'md', label, className }: PageLoaderProps) {
  const vi = storedLanguage() === 'vi'
  const text = label ?? (vi ? 'Đang tải…' : 'Loading…')
  const fullscreen = variant === 'fullscreen'
  const compact = !fullscreen && size === 'sm'
  // Phase-align the ring with the clock so consecutive loaders (pre-boot splash -> route gate -> page) spin continuously.
  const [delay] = useState(() => `-${Math.round(performance.now() % 900)}ms`)
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (compact) return
    const timer = window.setTimeout(() => setSlow(true), PAGE_LOADER_SLOW_MS)
    return () => window.clearTimeout(timer)
  }, [compact])
  return <div role="status" aria-live="polite" data-page-loader={variant}
    className={cn('alg-loader', fullscreen ? 'alg-loader--fullscreen' : compact ? 'alg-loader--sm' : 'alg-loader--inline', className)}>
    <div className="alg-loader__mark" aria-hidden="true">
      <span className="alg-loader__halo" />
      <span className="alg-loader__ring" style={{ animationDelay: delay }} />
      <span className="alg-loader__core"><Network strokeWidth={2.2} /></span>
    </div>
    {fullscreen && <p className="alg-loader__brand">Adapt-Learn-Graph</p>}
    <p className="alg-loader__label">{text}</p>
    {!compact && <div className="alg-loader__bar" aria-hidden="true" />}
    {slow && <div className="alg-loader__slow" data-page-loader-slow>
      <p>{vi ? 'Vẫn đang tải. Máy chủ phản hồi chậm hơn bình thường…' : 'Still loading. The server is responding slower than usual…'}</p>
      {fullscreen && <Button variant="outline" size="sm" leftIcon={<RotateCw className="size-3.5" aria-hidden="true" />} onClick={() => window.location.reload()}>
        {vi ? 'Tải lại trang' : 'Reload page'}
      </Button>}
    </div>}
  </div>
}
