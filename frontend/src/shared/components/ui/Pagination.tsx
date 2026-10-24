import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems?: number
  pageSize?: number
  onPageChange: (page: number) => void
  showItemRange?: boolean
  itemLabel?: string
  className?: string
  disabled?: boolean
  labels?: Partial<{ navigation: string; first: string; previous: string; next: string; last: string; showing: string; of: string }>
}

/**
 * Computes an array of page numbers and ellipsis tokens to render.
 */
function getPageRange(current: number, total: number): (number | 'ellipsis-start' | 'ellipsis-end')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  // Near the start: 1, 2, 3, 4, 5, ..., total
  if (current <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-end', total]
  }

  // Near the end: 1, ..., total - 4, total - 3, total - 2, total - 1, total
  if (current >= total - 3) {
    return [1, 'ellipsis-start', total - 4, total - 3, total - 2, total - 1, total]
  }

  // In the middle: 1, ..., current - 1, current, current + 1, ..., total
  return [1, 'ellipsis-start', current - 1, current, current + 1, 'ellipsis-end', total]
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  showItemRange = true,
  itemLabel = 'items',
  className,
  disabled = false,
  labels,
}: PaginationProps) {
  const copy = { navigation: 'Pagination', first: 'First page', previous: 'Prev', next: 'Next', last: 'Last page', showing: 'Showing', of: 'of', ...labels }
  if (totalPages <= 0 && (!totalItems || totalItems === 0)) {
    return null
  }

  const safeCurrentPage = Math.max(1, Math.min(currentPage, Math.max(1, totalPages)))
  const pageRange = getPageRange(safeCurrentPage, totalPages)

  const startItem = totalItems !== undefined ? (safeCurrentPage - 1) * pageSize + 1 : 0
  const endItem = totalItems !== undefined ? Math.min(safeCurrentPage * pageSize, totalItems) : 0

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 px-3 py-3 border-t border-border bg-card/40 text-xs select-none',
        className
      )}
      aria-label={copy.navigation}
    >
      {/* Left: Item Range & Summary */}
      <div className="flex items-center gap-3 text-muted-foreground order-2 sm:order-1">
        {showItemRange && totalItems !== undefined && (
          <span className="text-xs">
            {copy.showing} <strong className="font-semibold text-foreground">{totalItems === 0 ? 0 : startItem}</strong>–
            <strong className="font-semibold text-foreground">{endItem}</strong> {copy.of}{' '}
            <strong className="font-semibold text-foreground">{totalItems}</strong> {itemLabel}
          </span>
        )}
      </div>

      {/* Right: Page Navigation Buttons */}
      <nav className="flex items-center gap-1.5 order-1 sm:order-2" aria-label={copy.navigation}>
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={disabled || safeCurrentPage <= 1}
          title={copy.first}
          aria-label={copy.first}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors select-none cursor-pointer"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={disabled || safeCurrentPage <= 1}
          title={copy.previous}
          aria-label={copy.previous}
          className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors select-none cursor-pointer whitespace-nowrap"
        >
          <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
          <span>{copy.previous}</span>
        </button>

        {/* Page Number Buttons */}
        <div className="flex items-center gap-1">
          {pageRange.map((item, idx) => {
            if (item === 'ellipsis-start' || item === 'ellipsis-end') {
              return (
                <span
                  key={`${item}-${idx}`}
                  className="h-8 w-7 inline-flex items-center justify-center text-muted-foreground font-mono text-xs"
                >
                  •••
                </span>
              )
            }

            const isCurrent = item === safeCurrentPage
            return (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                disabled={disabled || isCurrent}
                aria-current={isCurrent ? 'page' : undefined}
                className={cn(
                  'h-8 min-w-[2rem] px-2.5 rounded-md text-xs font-medium transition-colors select-none',
                  isCurrent
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs cursor-default'
                    : 'bg-background hover:bg-muted text-foreground border border-border cursor-pointer disabled:opacity-50'
                )}
              >
                {item}
              </button>
            )
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={disabled || safeCurrentPage >= totalPages}
          title={copy.next}
          aria-label={copy.next}
          className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors select-none cursor-pointer whitespace-nowrap"
        >
          <span>{copy.next}</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={disabled || safeCurrentPage >= totalPages}
          title={copy.last}
          aria-label={copy.last}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors select-none cursor-pointer"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      </nav>
    </div>
  )
}

