import { Card, CardContent } from './Card'

export function LoadingCard({ label }: { label: string }) {
  return <Card role="status"><CardContent className="space-y-3 pt-6"><span className="sr-only">{label}</span>
    <div aria-hidden="true" className="h-5 w-1/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
    <div aria-hidden="true" className="h-20 animate-pulse rounded bg-muted motion-reduce:animate-none" />
  </CardContent></Card>
}
