import { X } from 'lucide-react'
import * as React from 'react'
import { cn } from '../../lib/utils'

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  className?: string
  containerClassName?: string
}

export function Dialog({ open, onOpenChange, children, className, containerClassName }: DialogProps) {
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto', containerClassName)}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
      />
      {/* Dialog content */}
      <div
        className={cn(
          'relative z-50 w-full max-w-lg max-h-[85vh] rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-150 my-auto flex flex-col overflow-hidden',
          className
        )}
      >
        {children}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4.5 top-4.5 z-20 rounded-lg p-1.5 text-muted-foreground/70 hover:text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 text-left mb-4 pr-12 shrink-0', className)} {...props} />
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-bold leading-snug tracking-tight text-foreground flex items-center gap-2', className)} {...props} />
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs text-muted-foreground leading-relaxed', className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t border-border/40 mt-5 shrink-0', className)} {...props} />
}
