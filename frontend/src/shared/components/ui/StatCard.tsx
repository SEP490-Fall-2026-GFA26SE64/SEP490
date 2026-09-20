import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './Card'
import { cn } from '../../lib/utils'

export interface StatCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode
  value: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  variant?: 'default' | 'gradient'
  valueClassName?: string
}

export function StatCard({
  title,
  value,
  description,
  icon,
  variant = 'default',
  valueClassName,
  className,
  children,
  ...props
}: StatCardProps) {
  return (
    <Card
      className={cn(
        variant === 'gradient'
          ? 'bg-gradient-to-br from-card to-secondary/30'
          : 'bg-card border-border',
        className
      )}
      {...props}
    >
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {icon && <span className="text-primary shrink-0">{icon}</span>}
          <span>{title}</span>
        </CardDescription>
        <CardTitle className={cn('text-2xl font-bold text-foreground mt-0.5', valueClassName)}>
          {value}
        </CardTitle>
      </CardHeader>
      {(description || children) && (
        <CardContent className="pt-0 space-y-2">
          {children}
          {description && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
        </CardContent>
      )}
    </Card>
  )
}
