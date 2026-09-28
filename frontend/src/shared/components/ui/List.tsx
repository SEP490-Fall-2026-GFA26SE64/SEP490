import * as React from 'react'
import { cn } from '../../lib/utils'

export interface ListProps extends React.HTMLAttributes<HTMLUListElement> {
  bordered?: boolean
  divided?: boolean
}

export function List({ className, bordered = true, divided = true, children, ...props }: ListProps) {
  return (
    <ul
      className={cn(
        'w-full rounded-md bg-card text-card-foreground',
        bordered && 'border border-border shadow-2xs',
        divided && '[&>li:not(:last-child)]:border-b [&>li:not(:last-child)]:border-border',
        className,
      )}
      {...props}
    >
      {children}
    </ul>
  )
}

export interface ListItemProps extends React.LiHTMLAttributes<HTMLLIElement> {
  icon?: React.ReactNode
  badge?: React.ReactNode
  interactive?: boolean
  selected?: boolean
}

export function ListItem({
  className,
  icon,
  badge,
  interactive = false,
  selected = false,
  children,
  ...props
}: ListItemProps) {
  return (
    <li
      className={cn(
        'flex items-center justify-between px-4 py-3 text-sm transition-colors',
        interactive && 'cursor-pointer hover:bg-muted/60',
        selected && 'bg-secondary/60 text-secondary-foreground font-medium',
        className,
      )}
      {...props}
    >
      <div className="flex items-center space-x-3 min-w-0">
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
        <div className="min-w-0 truncate">{children}</div>
      </div>
      {badge && <div className="ml-3 shrink-0">{badge}</div>}
    </li>
  )
}
