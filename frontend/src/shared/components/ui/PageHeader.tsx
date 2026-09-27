import * as React from 'react'
import { Heading } from '../typography/Heading'
import { cn } from '../../lib/utils'

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  actions?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  icon,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  if (!title && !description && !actions) {
    return null
  }

  if (!title && !description) {
    return (
      <div
        className={cn(
          'w-full flex items-center justify-end gap-3 flex-wrap pb-1',
          className
        )}
        {...props}
      >
        {actions}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6',
        className
      )}
      {...props}
    >
      <div>
        <Heading level={1} size="page" className="flex items-center gap-3">
          {icon && <span className="text-primary shrink-0 flex items-center">{icon}</span>}
          <span>{title}</span>
        </Heading>
        {description && (
          <p className="text-muted-foreground mt-1 text-sm max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 self-start md:self-center flex-wrap">
          {actions}
        </div>
      )}
    </div>
  )
}
