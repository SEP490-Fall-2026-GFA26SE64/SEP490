import type { ReactNode } from 'react'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { Card, CardContent, CardFooter } from '../../../shared/components/ui/Card'

/** Shared Employee Skill/Role catalog presentation; selection and learning stay with their owners. */
export function UpskillingCatalogCard({ title, description, badges, metadata, actions, active = false, footerDivider = true }: {
  title: string; description?: string | null; badges: ReactNode; metadata?: ReactNode; actions: ReactNode; active?: boolean; footerDivider?: boolean
}) {
  return <Card data-catalog-card="true" className={`flex min-w-0 flex-col transition-all duration-150 hover:shadow-md ${active ? 'border-primary ring-1 ring-primary/15' : 'hover:border-primary/40'}`}>
    <CardContent className="min-h-44 flex-1 space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">{badges}</div>
      <Heading level={3} size="card" className="break-words">{title}</Heading>
      <Text variant="body-sm" className="line-clamp-3 min-h-[3lh] whitespace-pre-wrap break-words">{description}</Text>
    </CardContent>
    <CardFooter className={`min-h-20 flex-wrap justify-between gap-3 bg-muted/20 px-5 py-3 ${footerDivider ? 'border-t border-border' : ''}`}>
      <div className="flex flex-wrap gap-3 text-caption text-muted-foreground">{metadata}</div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </CardFooter>
  </Card>
}
