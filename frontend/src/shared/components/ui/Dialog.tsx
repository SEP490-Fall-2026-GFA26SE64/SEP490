import { X } from 'lucide-react'
import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'

let openDialogs = 0
let previousBodyOverflow = ''
const dialogStack: symbol[] = []

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  className?: string
  containerClassName?: string
  ariaLabel?: string
  closeLabel?: string
  size?: 'default' | 'wide'
}

export function Dialog({ open, onOpenChange, children, className, containerClassName, ariaLabel, closeLabel = 'Close dialog', size = 'default' }: DialogProps) {
  const content = React.useRef<HTMLDivElement>(null)
  const identity = React.useRef(Symbol('dialog'))
  React.useEffect(() => {
    if (!open) return
    const id = identity.current
    dialogStack.push(id)
    if (openDialogs++ === 0) { previousBodyOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden' }
    return () => {
      const index = dialogStack.indexOf(id)
      if (index !== -1) dialogStack.splice(index, 1)
      if (--openDialogs === 0) document.body.style.overflow = previousBodyOverflow
    }
  }, [open])
  React.useEffect(() => {
    if (!open) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusable = () => Array.from(content.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex]:not([tabindex="-1"])') ?? []).filter(element => element.getClientRects().length > 0)
    const frame = requestAnimationFrame(() => (focusable()[0] ?? content.current)?.focus())
    function trap(event: KeyboardEvent) {
      if (event.key !== 'Tab' || dialogStack.at(-1) !== identity.current) return
      const nodes = focusable(), first = nodes[0], last = nodes[nodes.length - 1]
      if (!first) { event.preventDefault(); content.current?.focus(); return }
      if (!content.current?.contains(document.activeElement) || event.shiftKey && document.activeElement === first) { event.preventDefault(); (event.shiftKey ? last : first).focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', trap)
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', trap); if (previous?.isConnected) previous.focus() }
  }, [open])
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open && dialogStack.at(-1) === identity.current) {
        onOpenChange(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  if (!open) return null

  return createPortal(
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto scrollbar-hidden', containerClassName)}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-overlay/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
      />
      {/* Dialog content */}
      <div
        ref={content}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cn(
          'relative z-50 w-full max-w-lg max-h-[85vh] rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-150 my-auto flex flex-col overflow-hidden',
          size === 'wide' && 'max-w-7xl max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)]',
          className
        )}
      >
        {children}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4.5 top-4.5 z-20 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all cursor-pointer"
          aria-label={closeLabel}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>, document.body
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
  return <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-4 border-t border-border mt-5 shrink-0', className)} {...props} />
}

export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div tabIndex={0} className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hidden', className)} {...props} />
}
