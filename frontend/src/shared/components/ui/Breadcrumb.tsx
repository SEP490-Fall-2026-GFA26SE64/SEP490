import { ChevronRight, Home } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[]
  showHomeIcon?: boolean
}

export function Breadcrumb({ items, showHomeIcon = true, className, ...props }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center text-sm text-muted-foreground', className)} {...props}>
      <ol className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap">
        {showHomeIcon && (
          <li className="inline-flex items-center">
            <Link
              to="/"
              className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors"
              aria-label="Home"
            >
              <Home className="h-4 w-4" />
            </Link>
          </li>
        )}

        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={index} className="inline-flex items-center">
              {(showHomeIcon || index > 0) && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 mx-1 shrink-0" aria-hidden="true" />
              )}

              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className="inline-flex items-center hover:text-primary transition-colors font-medium text-muted-foreground"
                >
                  {item.icon && <span className="mr-1.5 shrink-0">{item.icon}</span>}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span className="inline-flex items-center font-semibold text-foreground" aria-current={isLast ? 'page' : undefined}>
                  {item.icon && <span className="mr-1.5 shrink-0">{item.icon}</span>}
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
