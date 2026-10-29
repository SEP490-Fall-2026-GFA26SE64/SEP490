import * as React from 'react'
import {
  Activity,
  CheckCircle2,
  Clock,
  Database,
  Download,
  Eye,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Users,
} from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../shared/components/ui/Card'
import { Input } from '../../../shared/components/ui/Input'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { StatCard } from '../../../shared/components/ui/StatCard'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { getActiveCompany } from '../../../shared/stores/companyStore'
import './AdminDashboardPage.css'

interface AuditLogRecord {
  id: string
  timestamp: string
  actorName: string
  actorRole: 'System Administrator' | 'L&D Manager' | 'Expert' | 'Employee' | 'System Automated'
  action: string
  targetEntity: string
  severity: 'success' | 'info' | 'warning' | 'security'
  ipAddress: string
  details: string
}

const INITIAL_AUDIT_LOGS: AuditLogRecord[] = [
  {
    id: 'AUD-8921',
    timestamp: '2026-10-13 17:55:12',
    actorName: 'Elena Rostova',
    actorRole: 'System Administrator',
    action: 'USER_ROLE_ASSIGNED',
    targetEntity: 'User: Zoe Martinez (Employee -> Expert)',
    severity: 'security',
    ipAddress: '10.0.4.12',
    details: 'Elevated domain authority for occupation "Software Developers (15-1252.00)".',
  },
  {
    id: 'AUD-8920',
    timestamp: '2026-10-13 17:42:05',
    actorName: 'Sarah Connor',
    actorRole: 'L&D Manager',
    action: 'TARGET_ROLE_PUBLISHED',
    targetEntity: 'TargetRole: TR-001 (AI Knowledge Architect v1.0)',
    severity: 'success',
    ipAddress: '10.0.4.38',
    details: 'Verified Expert competency thresholds and published role to the enterprise catalog.',
  },
  {
    id: 'AUD-8919',
    timestamp: '2026-10-13 17:20:19',
    actorName: 'Dr. Sarah Chen',
    actorRole: 'Expert',
    action: 'CONTENT_SUBMITTED_FOR_APPROVAL',
    targetEntity: 'LearningModule: MOD-002 (Graph Neural Networks)',
    severity: 'info',
    ipAddress: '10.0.5.15',
    details: 'Submitted 4 modules and module assessment blueprint to L&D Manager for approval.',
  },
  {
    id: 'AUD-8918',
    timestamp: '2026-10-13 16:58:44',
    actorName: 'Automated Catalog Sync',
    actorRole: 'System Automated',
    action: 'CATALOG_SYNCHRONIZATION_CYCLE',
    targetEntity: 'Competency Framework Graph',
    severity: 'info',
    ipAddress: '127.0.0.1',
    details: 'Synchronized skill prerequisites across 128 micro-skills and 42 prerequisite connections.',
  },
  {
    id: 'AUD-8917',
    timestamp: '2026-10-13 16:15:30',
    actorName: 'Alex Chen',
    actorRole: 'Employee',
    action: 'DIAGNOSTIC_ASSESSMENT_COMPLETED',
    targetEntity: 'AssessmentSession: DIAG-2026-09',
    severity: 'success',
    ipAddress: '10.0.8.22',
    details: 'Submitted 15 baseline responses. Knowledge tracing updated competency estimates (Highest score: 92%).',
  },
  {
    id: 'AUD-8916',
    timestamp: '2026-10-13 15:40:02',
    actorName: 'Elena Rostova',
    actorRole: 'System Administrator',
    action: 'SYSTEM_CONFIG_UPDATED',
    targetEntity: 'Config: Knowledge Tracing Decay Rate',
    severity: 'warning',
    ipAddress: '10.0.4.12',
    details: 'Adjusted exponential forgetting factor from 0.05 to 0.03 per curricular guidelines.',
  },
  {
    id: 'AUD-8915',
    timestamp: '2026-10-13 14:11:55',
    actorName: 'System Monitor',
    actorRole: 'System Automated',
    action: 'SECURITY_INTEGRITY_HEARTBEAT',
    targetEntity: 'Enterprise Storage & Graph Engine',
    severity: 'success',
    ipAddress: '127.0.0.1',
    details: 'All micro-services, storage schemas, and ontology graph constraints verified.',
  },
]

export function AdminDashboardPage() {
  const { toast } = useToast()
  const activeCompany = getActiveCompany()

  // Active view tab
  const [activeTab, setActiveTab] = React.useState<'config' | 'audit'>('config')

  // System Configuration Form State
  const [sessionTimeout, setSessionTimeout] = React.useState('60')
  const [maxSessions, setMaxSessions] = React.useState('3')
  const [dktTrigger, setDKTTrigger] = React.useState('IMMEDIATE')
  const [dktMasteryThreshold, setDktMasteryThreshold] = React.useState('80')
  const [graphSyncInterval, setGraphSyncInterval] = React.useState('5000')
  const [auditRetentionDays, setAuditRetentionDays] = React.useState('90')
  const [zeroTrustTls, setZeroTrustTls] = React.useState(true)
  const [isSavingConfig, setIsSavingConfig] = React.useState(false)

  // Audit Logs State & Filters
  const [auditLogs] = React.useState<AuditLogRecord[]>(INITIAL_AUDIT_LOGS)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [severityFilter, setSeverityFilter] = React.useState<string>('ALL')
  const [selectedAuditLog, setSelectedAuditLog] = React.useState<AuditLogRecord | null>(null)
  const [auditCurrentPage, setAuditCurrentPage] = React.useState(1)
  const auditPageSize = 10

  React.useEffect(() => {
    setAuditCurrentPage(1)
  }, [searchQuery, severityFilter])

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingConfig(true)

    setTimeout(() => {
      setIsSavingConfig(false)
      toast({
        title: 'System Configuration Persisted',
        description: 'Organization-wide technical options and administrative parameters have been applied.',
        variant: 'success',
      })
    }, 450)
  }

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.targetEntity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSeverity = severityFilter === 'ALL' || log.severity === severityFilter
    return matchesSearch && matchesSeverity
  })

  const paginatedLogs = filteredLogs.slice((auditCurrentPage - 1) * auditPageSize, auditCurrentPage * auditPageSize)

  const getSeverityBadge = (severity: AuditLogRecord['severity']) => {
    switch (severity) {
      case 'success':
        return <Badge variant="success">Success</Badge>
      case 'info':
        return <Badge variant="secondary">Info</Badge>
      case 'warning':
        return <Badge variant="warning">Warning</Badge>
      case 'security':
        return <Badge variant="destructive">Security</Badge>
    }
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Actions Bar */}
        <PageHeader
          actions={
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="px-3 py-1 font-medium flex items-center gap-1.5 shadow-2xs">
                <Database className="h-4 w-4 text-primary" />
                <span>Competency Engine: Operational</span>
              </Badge>
              <Badge variant="outline" className="px-3 py-1 font-medium flex items-center gap-1.5 border-border shadow-2xs">
                <ShieldCheck className="h-4 w-4 text-success" />
                <span>Zero-Trust: Enforced</span>
              </Badge>
            </div>
          }
        />

        {/* Aggregate KPI StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            variant="gradient"
            icon={<Users className="h-4 w-4 text-primary" />}
            title="Active Accounts"
            value={`${activeCompany.users.length} Users`}
            valueClassName="text-primary"
            description="Accounts across 4 unified roles"
          />

          <StatCard
            variant="gradient"
            icon={<CheckCircle2 className="h-4 w-4 text-success" />}
            title="System & Storage Health"
            value="Healthy"
            valueClassName="text-success"
            description="Core Services & Graph Engine Online"
          />

          <StatCard
            variant="gradient"
            icon={<Clock className="h-4 w-4 text-primary" />}
            title="24h Audit Records"
            value={`${auditLogs.length} Events`}
            description="Operational activity tracked"
          />

          <StatCard
            variant="gradient"
            icon={<Settings2 className="h-4 w-4 text-primary" />}
            title="Enterprise Scope"
            value="TechNova"
            description="Single-tenant internal system"
          />
        </div>

        {/* Unified Tab Container: System Config vs Operational Audit Logs */}
        <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
          {/* Big Container Header with Switcher Tabs */}
          <div className="p-5 sm:p-6 border-b border-border bg-muted/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary shrink-0" />
                <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                  System Administration & Oversight
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Maintain system access, organization-wide technical parameters, and operational audit trails.
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-muted border border-border self-start md:self-center">
              <button
                type="button"
                onClick={() => setActiveTab('config')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'config'
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Settings2 size={13} />
                <span>System Configuration</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'audit'
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Activity size={13} />
                <span>Activity Audit Log ({auditLogs.length})</span>
              </button>
            </div>
          </div>

          {/* TAB 1: SYSTEM CONFIGURATION */}
          {activeTab === 'config' && (
            <form onSubmit={handleSaveConfig} className="p-5 sm:p-7 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Section A: Authentication & Access Security */}
                <Card className="border border-border shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Session & Authentication Parameters
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Organization-wide session controls and internal boundary timeouts.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1.5">
                        Session Inactivity Timeout (minutes)
                      </label>
                      <Input
                        type="number"
                        min="5"
                        max="720"
                        value={sessionTimeout}
                        onChange={(e) => setSessionTimeout(e.target.value)}
                        required
                      />
                      <span className="text-[11px] text-muted-foreground mt-1 block">
                        Users are automatically signed out after this period of inactivity.
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1.5">
                        Max Concurrent Logins Per User
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={maxSessions}
                        onChange={(e) => setMaxSessions(e.target.value)}
                        required
                      />
                    </div>

                    <div className="pt-1 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-foreground block">
                          Zero-Trust Internal TLS Policy
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Encrypt all intra-service communications between API and databases.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={zeroTrustTls}
                        onChange={(e) => setZeroTrustTls(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Section B: Knowledge Tracing & Graph Parameters */}
                <Card className="border border-border shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Database className="h-4 w-4 text-primary" />
                      Knowledge Graph & DKT Engine Parameters
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Core hyper-parameters governing adaptive knowledge tracing updates.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1.5">
                        Knowledge Tracing Recalculation Mode
                      </label>
                      <select
                        value={dktTrigger}
                        onChange={(e) => setDKTTrigger(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                      >
                        <option value="IMMEDIATE">Immediate (Upon Each Assessment Submission)</option>
                        <option value="BATCH">Hourly Batch Recalculation</option>
                      </select>
                      <span className="text-[11px] text-muted-foreground mt-1 block">
                        Triggers dynamic pathway recalculation upon recorded evidence.
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1.5">
                        Default Micro-Skill Mastery Target Threshold (%)
                      </label>
                      <Input
                        type="number"
                        min="50"
                        max="100"
                        value={dktMasteryThreshold}
                        onChange={(e) => setDktMasteryThreshold(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1.5">
                        Data Synchronization Interval (ms)
                      </label>
                      <Input
                        type="number"
                        min="1000"
                        max="60000"
                        step="1000"
                        value={graphSyncInterval}
                        onChange={(e) => setGraphSyncInterval(e.target.value)}
                        required
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Section C: Audit & Logging Retention */}
                <Card className="border border-border shadow-none md:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Audit Trail & Diagnostic Retention
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Storage policies for operational activity records and system audit trails.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1.5">
                          Audit Trail Retention Window (Days)
                        </label>
                        <Input
                          type="number"
                          min="30"
                          max="365"
                          value={auditRetentionDays}
                          onChange={(e) => setAuditRetentionDays(e.target.value)}
                          required
                        />
                      </div>
                      <div className="flex items-center gap-3 pt-6">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          leftIcon={<Download size={14} />}
                          onClick={() => {
                            toast({
                              title: 'Audit Archive Exported',
                              description: 'Encrypted JSON log file generated for compliance inspection.',
                              variant: 'info',
                            })
                          }}
                          className="font-semibold text-xs"
                        >
                          Export Compliance Archive
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Form Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSavingConfig}
                  leftIcon={<CheckCircle2 size={14} />}
                  className="font-semibold shadow-2xs"
                >
                  {isSavingConfig ? 'Applying Parameters...' : 'Save Configuration Parameters'}
                </Button>
              </div>
            </form>
          )}

          {/* TAB 2: OPERATIONAL AUDIT LOG */}
          {activeTab === 'audit' && (
            <div className="space-y-0">
              {/* Filter and Search Bar Embedded */}
              <div className="p-4 sm:p-5 border-b border-border bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search action, actor, or target..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/25 transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    aria-label="Filter by Event Type"
                    className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/25 cursor-pointer"
                  >
                    <option value="ALL">All Event Types</option>
                    <option value="security">Security & Roles</option>
                    <option value="success">Successful Events</option>
                    <option value="info">System Info</option>
                    <option value="warning">System Warnings</option>
                  </select>
                </div>
              </div>

              {/* Audit Ledger Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase text-[11px] tracking-wider">
                      <th className="py-2.5 px-3">EVENT ID / TIME</th>
                      <th className="py-2.5 px-3">ACTOR</th>
                      <th className="py-2.5 px-3">ACTION</th>
                      <th className="py-2.5 px-3">TARGET RESOURCE</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-muted/20 transition-colors cursor-pointer group"
                        onClick={() => setSelectedAuditLog(log)}
                      >
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-foreground block">{log.id}</span>
                          <span className="text-[11px] text-muted-foreground">{log.timestamp}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-foreground block group-hover:text-primary transition-colors">{log.actorName}</span>
                          <span className="text-[11px] text-muted-foreground">{log.actorRole}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-semibold text-primary">{log.action}</span>
                        </td>
                        <td className="py-3 px-3 text-foreground truncate max-w-xs">{log.targetEntity}</td>
                        <td className="py-3 px-3">{getSeverityBadge(log.severity)}</td>
                        <td className="py-3 px-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Inspect Audit Event"
                            aria-label="Inspect Audit Event"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedAuditLog(log)
                            }}
                          >
                            <Eye className="h-4 w-4 text-primary" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-xs text-muted-foreground">
                          No operational audit records matched your filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredLogs.length > 0 && (
                <Pagination
                  currentPage={auditCurrentPage}
                  totalPages={Math.ceil(filteredLogs.length / auditPageSize) || 1}
                  totalItems={filteredLogs.length}
                  pageSize={auditPageSize}
                  onPageChange={setAuditCurrentPage}
                  itemLabel="events"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inspect Audit Record Dialog */}
      <Dialog open={!!selectedAuditLog} onOpenChange={(open) => !open && setSelectedAuditLog(null)} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Audit Event: {selectedAuditLog?.id}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Recorded at {selectedAuditLog?.timestamp}
          </DialogDescription>
        </DialogHeader>

        {selectedAuditLog && (
          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actor:</span>
                <span className="font-semibold text-foreground">{selectedAuditLog.actorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role:</span>
                <span className="font-medium text-foreground">{selectedAuditLog.actorRole}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IP Address:</span>
                <span className="font-mono text-foreground">{selectedAuditLog.ipAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Action:</span>
                <span className="font-mono font-bold text-primary">{selectedAuditLog.action}</span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-foreground block mb-1">Target Resource</span>
              <p className="p-2 rounded bg-muted/20 border border-border text-foreground font-mono">
                {selectedAuditLog.targetEntity}
              </p>
            </div>

            <div>
              <span className="font-semibold text-foreground block mb-1">Event Details & Description</span>
              <p className="p-3 rounded-lg bg-muted/30 border border-border text-foreground leading-relaxed">
                {selectedAuditLog.details}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setSelectedAuditLog(null)}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    </WorkspaceLayout>
  )
}
