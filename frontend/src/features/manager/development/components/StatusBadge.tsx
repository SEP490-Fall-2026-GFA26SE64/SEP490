import { statusLabels, statusTone, type DevelopmentStatus } from '../developmentMetrics'

export function StatusBadge({ status, vi }: { status: DevelopmentStatus; vi: boolean }) {
  return <span className="ld-status" data-status={status} data-pulse={status === 'at_risk'} style={{ '--status': `var(${statusTone[status]})` } as React.CSSProperties}>
    <i aria-hidden="true" />{statusLabels[status][vi ? 1 : 0]}
  </span>
}
