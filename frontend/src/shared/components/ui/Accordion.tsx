import { ChevronDown } from 'lucide-react'
import * as React from 'react'
import { cn } from '../../lib/utils'

interface AccordionContextValue {
  openItems: string[]
  toggleItem: (id: string) => void
}

const AccordionContext = React.createContext<AccordionContextValue | undefined>(undefined)
const AccordionItemContext = React.createContext<string | undefined>(undefined)

export interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'single' | 'multiple'
  defaultValue?: string[]
}

export function Accordion({ defaultValue = [], type = 'single', className, children, ...props }: AccordionProps) {
  const [openItems, setOpenItems] = React.useState<string[]>(defaultValue)

  const toggleItem = React.useCallback(
    (id: string) => {
      setOpenItems((prev) => {
        if (type === 'single') {
          return prev.includes(id) ? [] : [id]
        }
        return prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      })
    },
    [type],
  )

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem }}>
      <div className={cn('divide-y divide-border border border-border rounded-lg bg-card', className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

export interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

export function AccordionItem({ value, className, children, ...props }: AccordionItemProps) {
  return (
    <AccordionItemContext.Provider value={value}>
      <div data-value={value} className={cn('py-1 px-4', className)} {...props}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  )
}

export interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value?: string
}

export function AccordionTrigger({ value, className, children, ...props }: AccordionTriggerProps) {
  const context = React.useContext(AccordionContext)
  const itemValue = React.useContext(AccordionItemContext)
  const resolvedValue = value || itemValue

  if (!context || !resolvedValue) {
    throw new Error('AccordionTrigger must be used within Accordion and AccordionItem')
  }

  const isOpen = context.openItems.includes(resolvedValue)

  return (
    <button
      type="button"
      onClick={() => context.toggleItem(resolvedValue)}
      className={cn(
        'flex w-full items-center justify-between py-3 text-sm font-medium text-foreground transition-all hover:text-primary cursor-pointer',
        className,
      )}
      aria-expanded={isOpen}
      {...props}
    >
      <div className="text-left">{children}</div>
      <ChevronDown
        className={cn(
          'h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-2',
          isOpen && 'rotate-180',
        )}
      />
    </button>
  )
}

export interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
}

export function AccordionContent({ value, className, children, ...props }: AccordionContentProps) {
  const context = React.useContext(AccordionContext)
  const itemValue = React.useContext(AccordionItemContext)
  const resolvedValue = value || itemValue

  if (!context || !resolvedValue) {
    throw new Error('AccordionContent must be used within Accordion and AccordionItem')
  }

  const isOpen = context.openItems.includes(resolvedValue)
  if (!isOpen) return null

  return (
    <div className={cn('pb-4 pt-1 text-sm text-muted-foreground animate-in fade-in-50', className)} {...props}>
      {children}
    </div>
  )
}
