import { useQuery } from '@tanstack/react-query'
import { Activity, RefreshCw, Server } from 'lucide-react'
import { getSystemStatus } from '../../shared/api/system'
import { Button } from '../../shared/components/ui/Button'
import { Heading } from '../../shared/components/typography/Heading'
import { WorkspaceLayout } from '../../shared/layouts/WorkspaceLayout'
import './SystemStatusPage.css'

export function SystemStatusPage() {
  const status = useQuery({
    queryKey: ['system-status'],
    queryFn: ({ signal }) => getSystemStatus(signal),
  })
  const connection = status.isFetching ? 'Checking' : status.isError ? 'Unavailable' : 'Connected'

  return (
    <WorkspaceLayout>
        <div className="system-page-heading">
          <div><p className="eyebrow">Platform</p><Heading level={1} size="page">System status</Heading></div>
          <Button onClick={() => void status.refetch()} disabled={status.isFetching}>
            <RefreshCw size={17} aria-hidden="true" />Refresh
          </Button>
        </div>
        <section aria-labelledby="api-heading" className="status-section">
          <div className="status-section-heading">
            <Heading level={2} id="api-heading" className="status-title"><Server size={20} aria-hidden="true" />Backend API</Heading>
            <span className={`status-connection ${status.isError ? 'error' : ''}`} role="status">
              <Activity size={16} aria-hidden="true" />{connection}
            </span>
          </div>
          {status.isError && <p role="alert" className="status-error-message">Backend status unavailable.</p>}
          <dl className="status-details">
            <div><dt>Application</dt><dd>{status.data?.application ?? 'Not available'}</dd></div>
            <div><dt>Version</dt><dd>{status.data?.version ?? 'Not available'}</dd></div>
            <div><dt>Stage</dt><dd>{status.data?.stage ?? 'Not available'}</dd></div>
            <div><dt>Last successful check</dt><dd>{status.dataUpdatedAt ? new Date(status.dataUpdatedAt).toLocaleTimeString() : 'Not available'}</dd></div>
          </dl>
        </section>
    </WorkspaceLayout>
  )
}