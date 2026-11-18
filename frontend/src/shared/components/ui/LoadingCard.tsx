import { PageLoader } from './PageLoader'

export function LoadingCard({ label }: { label: string }) {
  return <PageLoader label={label} />
}
