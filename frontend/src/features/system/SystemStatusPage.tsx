import { useQuery } from '@tanstack/react-query'
import { Activity, RefreshCw, Server } from 'lucide-react'
import { getSystemStatus } from '../../shared/api/system'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/ui/Card'
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
      <div className="space-y-6 pb-16">
        {/* Top Actions */}
        <div className="flex items-center justify-end pb-1 border-b border-border/60">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`h-4 w-4 ${status.isFetching ? 'animate-spin' : ''}`} />}
            onClick={() => void status.refetch()}
            disabled={status.isFetching}
          >
            Refresh Telemetry
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              <span>Backend Core API Service</span>
            </CardTitle>
            <Badge
              variant={status.isError ? 'destructive' : status.isFetching ? 'warning' : 'success'}
              className="gap-1 font-semibold"
            >
              <Activity className="h-3.5 w-3.5" />
              {connection}
            </Badge>
          </CardHeader>
          <CardContent className="pt-4">
            {status.isError && (
              <p role="alert" className="text-sm text-destructive font-medium mb-4">
                Backend status service unavailable. Check network or server configuration.
              </p>
            )}
            <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <dt className="text-muted-foreground uppercase font-semibold text-[11px]">Application</dt>
                <dd className="text-sm font-bold text-foreground mt-1">{status.data?.application ?? 'Adapt-Learn-Graph'}</dd>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <dt className="text-muted-foreground uppercase font-semibold text-[11px]">Version</dt>
                <dd className="text-sm font-bold text-foreground mt-1">{status.data?.version ?? 'v1.4.0-enterprise'}</dd>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <dt className="text-muted-foreground uppercase font-semibold text-[11px]">Stage</dt>
                <dd className="text-sm font-bold text-foreground mt-1">{status.data?.stage ?? 'Production / Active'}</dd>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <dt className="text-muted-foreground uppercase font-semibold text-[11px]">Last Check</dt>
                <dd className="text-sm font-bold text-foreground mt-1">
                  {status.dataUpdatedAt ? new Date(status.dataUpdatedAt).toLocaleTimeString() : 'Recent'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </WorkspaceLayout>
  )
}