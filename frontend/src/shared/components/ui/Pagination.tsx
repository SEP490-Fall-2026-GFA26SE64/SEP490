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
}: PaginationProps) {
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
      aria-label="Pagination Navigation"
    >
      {/* Left: Item Range & Summary */}
      <div className="flex items-center gap-3 text-muted-foreground order-2 sm:order-1">
        {showItemRange && totalItems !== undefined && (
          <span className="text-xs">
            Showing <strong className="font-semibold text-foreground">{totalItems === 0 ? 0 : startItem}</strong>–
            <strong className="font-semibold text-foreground">{endItem}</strong> of{' '}
            <strong className="font-semibold text-foreground">{totalItems}</strong> {itemLabel}
          </span>
        )}
      </div>

      {/* Right: Page Navigation Buttons */}
      <nav className="flex items-center gap-1.5 order-1 sm:order-2" aria-label="Pagination">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={disabled || safeCurrentPage <= 1}
          title="First page"
          aria-label="First page"
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors select-none cursor-pointer"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={disabled || safeCurrentPage <= 1}
          title="Previous page"
          aria-label="Previous page"
          className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors select-none cursor-pointer whitespace-nowrap"
        >
          <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
          <span>Prev</span>
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
          title="Next page"
          aria-label="Next page"
          className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors select-none cursor-pointer whitespace-nowrap"
        >
          <span>Next</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={disabled || safeCurrentPage >= totalPages}
          title="Last page"
          aria-label="Last page"
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors select-none cursor-pointer"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      </nav>
    </div>
  )
}

