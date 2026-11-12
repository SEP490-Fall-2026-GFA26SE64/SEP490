import * as React from 'react'
import { cn } from '../../lib/utils'

interface TabsContextValue {
  value: string
  baseId: string
  onValueChange: (val: string) => void
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  onValueChange: (value: string) => void
}

export function Tabs({ value, onValueChange, className, children, ...props }: TabsProps) {
  const baseId = React.useId()
  return (
    <TabsContext.Provider value={{ value, onValueChange, baseId }}>
      <div className={cn('w-full', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex h-10 w-full items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

export function TabsTrigger({ value, className, children, onKeyDown, ...props }: TabsTriggerProps) {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error('TabsTrigger must be used within Tabs')

  const isSelected = context.value === value

  return (
    <button
      type="button"
      role="tab"
      id={`${context.baseId}-tab-${encodeURIComponent(value)}`}
      aria-controls={`${context.baseId}-panel-${encodeURIComponent(value)}`}
      tabIndex={isSelected ? 0 : -1}
      onKeyDown={event => {
        onKeyDown?.(event)
        if (event.defaultPrevented || !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
        const tabs = Array.from(event.currentTarget.closest('[role="tablist"]')?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)') ?? [])
        const index = tabs.indexOf(event.currentTarget)
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
        event.preventDefault(); tabs[next]?.focus(); tabs[next]?.click()
      }}
      aria-selected={isSelected}
      data-state={isSelected ? 'active' : 'inactive'}
      onClick={() => context.onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
        isSelected
          ? 'bg-card text-foreground shadow-xs font-semibold'
          : 'hover:text-foreground text-muted-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  forceMount?: boolean
  value: string
}

export function TabsContent({ value, forceMount = false, className, children, ...props }: TabsContentProps) {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error('TabsContent must be used within Tabs')

  if (context.value !== value && !forceMount) return null

  return (
    <div role="tabpanel" hidden={context.value !== value} id={`${context.baseId}-panel-${encodeURIComponent(value)}`} aria-labelledby={`${context.baseId}-tab-${encodeURIComponent(value)}`} tabIndex={0} className={cn('focus-visible:outline-none animate-in fade-in-50', className)} {...props}>
      {children}
    </div>
  )
}
