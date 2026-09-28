import * as React from 'react'
import { Card, CardContent } from './Card'
import { Heading } from '../typography/Heading'
import { Text } from '../typography/Text'
import { cn } from '../../lib/utils'

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  bordered?: boolean
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  bordered = true,
  className,
  ...props
}: EmptyStateProps) {
  const content = (
    <div
      className={cn(
        'text-center py-12 px-6 max-w-md mx-auto flex flex-col items-center justify-center space-y-4',
        className
      )}
      {...props}
    >
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-secondary text-primary border border-primary/20 flex items-center justify-center shadow-2xs shrink-0 animate-in fade-in-50 zoom-in-95 duration-200">
          {icon}
        </div>
      )}
      <div className="space-y-1.5">
        <Heading level={3} size="subsection" className="text-foreground">
          {title}
        </Heading>
        {description && (
          <Text variant="muted" className="text-xs leading-relaxed max-w-sm">
            {description}
          </Text>
        )}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  )

  if (bordered) {
    return (
      <Card className="border border-border/80 shadow-2xs">
        <CardContent className="p-0">{content}</CardContent>
      </Card>
    )
  }

  return content
}
