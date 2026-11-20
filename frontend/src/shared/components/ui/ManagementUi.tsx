import type { ComponentProps, ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog } from './Dialog'
import { Button } from './Button'
import { cn } from '../../lib/utils'

/** Shared presentation for assessment/certificate management; other product dialogs keep their styling. */
export function ManagementDialog({ className, size, ...props }: ComponentProps<typeof Dialog>) {
  return <Dialog {...props} size={size} className={cn('rounded-xl p-6 sm:p-7', size === 'wide' ? 'max-w-3xl' : 'max-w-lg', className)} />
}
export function ManagementSection({ title, children, className, aside }: { title?: ReactNode; children: ReactNode; className?: string; aside?: ReactNode }) {
  return <section className={cn('space-y-3 rounded-lg border border-border bg-card p-4', className)}>{(title || aside) && <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>{aside}</div>}{children}</section>
}
export function ManagementSteps({ steps, current }: { steps: string[]; current: number }) {
  return <ol className="grid shrink-0 grid-cols-3 gap-2">{steps.map((step, index) => <li key={step} aria-current={index === current ? 'step' : undefined} className={cn('flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2.5 text-caption font-semibold', index === current ? 'border-primary bg-primary text-primary-foreground' : index < current ? 'border-primary/25 bg-secondary text-primary' : 'border-border bg-background text-muted-foreground')}><span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-current/30 text-xs">{index + 1}</span><span className="min-w-0">{step}</span></li>)}</ol>
}
export function ManagementTable({ children, className }: { children: ReactNode; className?: string }) {
  return <div className="overflow-x-auto"><table className={cn('w-full text-left text-body-sm [&_thead]:border-y [&_thead]:border-border [&_thead]:bg-background [&_thead_th]:px-3 [&_thead_th]:py-3 [&_thead_th]:text-left [&_thead_th]:text-xs [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-wide [&_thead_th]:text-muted-foreground [&_tbody]:divide-y [&_tbody]:divide-border [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-secondary/20 [&_td]:px-3 [&_td]:py-3 [&_tbody_th]:px-3 [&_tbody_th]:py-3 [&_tbody_th]:font-semibold [&_tbody_th]:text-left [&_tr>:last-child]:text-right', className)}>{children}</table></div>
}
export function CursorPagination({ page, count, size = 20, busy, onPage, locale }: { page: number; count: number; size?: number; busy?: boolean; onPage: (page: number) => void; locale: string }) {
  const vi = locale === 'vi'
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-3 text-xs text-muted-foreground"><span>{vi ? 'Hiển thị' : 'Showing'} {count ? page * size + 1 : 0}–{page * size + count} {vi ? 'mục' : 'items'}</span><div className="flex items-center gap-1"><Button size="sm" variant="outline" disabled={busy || !page} onClick={() => onPage(page - 1)}><ChevronLeft size={13} />{vi ? 'Trước' : 'Prev'}</Button><span aria-current="page" className="flex size-8 items-center justify-center rounded-md bg-primary font-semibold text-primary-foreground">{page + 1}</span><Button size="sm" variant="outline" disabled={busy || count < size} onClick={() => onPage(page + 1)}>{vi ? 'Sau' : 'Next'}<ChevronRight size={13} /></Button></div></div>
}
