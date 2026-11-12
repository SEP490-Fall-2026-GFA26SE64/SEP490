import { useRef, useState, type ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { MoreHorizontal } from 'lucide-react'
import { Button } from './Button'

export function RowActions({ label, disabled, children, compact = false }: { label: string; disabled: boolean; children: ReactNode; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null), actionChosen = useRef(false)
  return <Popover.Root open={open} onOpenChange={setOpen}><Popover.Trigger asChild><Button ref={trigger} variant="outline" size="icon" className={compact ? 'size-8' : undefined} title={label} aria-label={label} disabled={disabled}><MoreHorizontal className="size-4" aria-hidden="true" /></Button></Popover.Trigger><Popover.Portal><Popover.Content role="dialog" aria-label={label} align="end" sideOffset={6} collisionPadding={12} className="z-50 w-60 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card p-1.5 shadow-md focus:outline-none [&>div]:flex-col [&>div]:items-stretch [&_button]:justify-start [&_button]:border-0 [&_button]:bg-transparent [&_button]:text-foreground [&_button]:shadow-none [&_button:hover]:bg-muted" onCloseAutoFocus={event => { if (actionChosen.current) { event.preventDefault(); actionChosen.current = false } }} onClick={event => { if ((event.target as HTMLElement).closest('button')) { actionChosen.current = true; trigger.current?.focus(); setOpen(false) } }}>{children}</Popover.Content></Popover.Portal></Popover.Root>
}
