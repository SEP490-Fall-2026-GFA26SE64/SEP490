import * as React from 'react'
import {
  Activity,
  Clock,
  Database,
  Download,
  Network,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
} from 'lucide-react'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Card, CardContent, CardHeader } from '../../shared/components/ui/Card'
import { Input } from '../../shared/components/ui/Input'
import { PageHeader } from '../../shared/components/ui/PageHeader'
import { Pagination } from '../../shared/components/ui/Pagination'
import { useToast } from '../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../shared/layouts/WorkspaceLayout'
import {
  loadPlatformAuditLogs,
  type PlatformAuditEvent,
} from './platformAdminStore'

export function PlatformActivityMonitoringPage() {
  const { toast } = useToast()
  const [logs, setLogs] = React.useState<PlatformAuditEvent[]>(loadPlatformAuditLogs)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [severityFilter, setSeverityFilter] = React.useState<'ALL' | 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR'>('ALL')
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 10

  const reloadLogs = React.useCallback(() => {
    setLogs(loadPlatformAuditLogs())
  }, [])

  React.useEffect(() => {
    window.addEventListener('platform_audit_updated', reloadLogs)
    return () => window.removeEventListener('platform_audit_updated', reloadLogs)
  }, [reloadLogs])

  const filtered = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.organizationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    if (severityFilter === 'SUCCESS') return log.severity === 'success'
    if (severityFilter === 'INFO') return log.severity === 'info'
    if (severityFilter === 'WARNING') return log.severity === 'warning'
    if (severityFilter === 'ERROR') return log.severity === 'error'
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleExportCsv = () => {
    const headers = ['ID', 'Timestamp', 'Organization', 'Actor', 'Action', 'Severity', 'Details']
    const rows = filtered.map((l) => [
      l.id,
      l.timestamp,
      `"${l.organizationName}"`,
      `"${l.actor}"`,
      l.action,
      l.severity,
      `"${l.details.replace(/"/g, '""')}"`,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `platform_audit_log_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: 'Audit Log Exported',
      description: `Downloaded ${filtered.length} audit event records as CSV.`,
      variant: 'success',
    })
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        <PageHeader
          title="Platform Activity & Audit Telemetry"
          description="Cross-tenant telemetry monitoring workspace setup outcomes, PayOS subscription settlements, service latencies, and platform security audits."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={reloadLogs} className="flex items-center gap-1.5 text-xs">
                <RefreshCw size={13} />
                <span>Refresh</span>
              </Button>
              <Button variant="primary" size="sm" onClick={handleExportCsv} className="flex items-center gap-1.5 text-xs">
                <Download size={13} />
                <span>Export Log (CSV)</span>
              </Button>
            </div>
          }
        />

        {/* System Health Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border-border bg-card shadow-xs">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold text-muted-foreground">Neo4j Graph Core</span>
              <Badge variant="success" className="text-[10px] py-0">Operational</Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-foreground">24 ms</span>
              <span className="text-[11px] text-muted-foreground">P95 traversal</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <Network size={12} className="text-primary" /> Multi-tenant boundary verified
            </p>
          </Card>

          <Card className="p-4 border-border bg-card shadow-xs">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold text-muted-foreground">PostgreSQL Relational</span>
              <Badge variant="success" className="text-[10px] py-0">Operational</Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-foreground">11 ms</span>
              <span className="text-[11px] text-muted-foreground">Avg query time</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <Database size={12} className="text-success" /> Flyway baseline V1 validated
            </p>
          </Card>

          <Card className="p-4 border-border bg-card shadow-xs">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold text-muted-foreground">PayOS Webhook Service</span>
              <Badge variant="success" className="text-[10px] py-0">99.9% Up</Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-foreground">180 ms</span>
              <span className="text-[11px] text-muted-foreground">Signature verify</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <ShieldCheck size={12} className="text-primary" /> HMAC-SHA256 active
            </p>
          </Card>

          <Card className="p-4 border-border bg-card shadow-xs">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold text-muted-foreground">MinIO Private Storage</span>
              <Badge variant="success" className="text-[10px] py-0">Operational</Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-foreground">100%</span>
              <span className="text-[11px] text-muted-foreground">Uptime 30d</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <Server size={12} className="text-primary" /> Isolated tenant buckets
            </p>
          </Card>
        </div>

        {/* Audit Event Feed Table */}
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="pb-3 border-b border-border/70">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search size={15} className="absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  className="pl-9 text-xs h-9"
                  placeholder="Filter by action, tenant, details..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>

              {/* Severity Tabs */}
              <div className="inline-flex items-center rounded-lg border border-border bg-muted/60 p-1 text-xs w-full sm:w-auto">
                {(['ALL', 'SUCCESS', 'INFO', 'WARNING', 'ERROR'] as const).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => {
                      setSeverityFilter(sev)
                      setCurrentPage(1)
                    }}
                    className={`flex-1 sm:flex-none px-2.5 py-1 rounded-md font-bold transition-all ${
                      severityFilter === sev
                        ? 'bg-card text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {sev === 'ALL' ? 'All Events' : sev}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {paginated.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Activity size={32} className="mx-auto text-muted-foreground/50" />
                <h4 className="text-sm font-bold text-foreground">No matching audit events</h4>
                <p className="text-xs text-muted-foreground">Adjust filters or search parameters to inspect records.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Event ID & Timestamp</th>
                      <th className="py-3 px-4">Organization Tenant</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Severity</th>
                      <th className="py-3 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginated.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="font-mono font-bold text-foreground">{log.id}</p>
                          <p className="text-[11px] font-mono text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock size={11} /> {log.timestamp}
                          </p>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-bold text-foreground">{log.organizationName}</span>
                          <p className="text-[10px] font-mono text-muted-foreground">{log.organizationId}</p>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-medium text-foreground">{log.actor}</span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-xs bg-muted/80 px-2 py-0.5 rounded text-foreground">
                            {log.action}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              log.severity === 'success'
                                ? 'success'
                                : log.severity === 'warning'
                                ? 'warning'
                                : log.severity === 'error'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="text-[10px] py-0.5 uppercase font-bold"
                          >
                            {log.severity}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-muted-foreground leading-relaxed max-w-md">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>

          {totalPages > 1 && (
            <div className="p-3 border-t border-border flex justify-end">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </Card>
      </div>
    </WorkspaceLayout>
  )
}
