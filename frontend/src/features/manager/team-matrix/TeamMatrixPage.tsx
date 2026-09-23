import {
  CheckCircle2,
  DollarSign,
  Search,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import * as React from 'react'
import { Badge } from '../../../shared/components/ui/Badge'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Progress } from '../../../shared/components/ui/Progress'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { AVERAGE_READINESS, TEAM_MEMBERS, TOTAL_HOURS_SAVED } from '../data/managerData'
import './TeamMatrixPage.css'

export function TeamMatrixPage() {
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'ready' | 'on_track' | 'needs_attention'>('all')
  const [searchQuery, setSearchQuery] = React.useState('')

  const filteredMembers = TEAM_MEMBERS.filter((member) => {
    const matchesFilter = statusFilter === 'all' || member.status === statusFilter
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.currentRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.targetRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.criticalGap.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Console Header */}
        <PageHeader
          icon={<Users className="h-8 w-8 text-primary" />}
          title="Team Competency Matrix"
          description="Track team competency coverage, benchmark employee capability scores against Neo4j ontology targets, and identify critical skill gaps."
          actions={
            <Badge variant="secondary" className="px-3 py-1 font-medium flex items-center gap-1.5 border border-primary/20">
              <Users className="h-4 w-4 text-primary" />
              <span>{TEAM_MEMBERS.length} Team Members Scoped</span>
            </Badge>
          }
        />

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            variant="gradient"
            icon={<TrendingUp className="h-4 w-4 text-primary" />}
            title="Average Team Readiness"
            value={`${AVERAGE_READINESS}%`}
            valueClassName="text-primary"
            description="+14% improvement this quarter"
          >
            <Progress value={AVERAGE_READINESS} variant="primary" />
          </StatCard>

          <StatCard
            variant="gradient"
            icon={<DollarSign className="h-4 w-4 text-success" />}
            title="Cumulative Hours Saved"
            value={`${TOTAL_HOURS_SAVED} Hours`}
            valueClassName="text-success"
            description="Saved via adaptive knowledge-gap skipping vs rigid traditional LMS courses."
          />

          <StatCard
            variant="gradient"
            icon={<UserCheck className="h-4 w-4 text-primary" />}
            title="Promotion Ready"
            value="1 Employee"
            description="Elena Rostova has reached 92% of target competency thresholds."
          />
        </div>

        {/* Team Matrix Table - Unified Big Container Design */}
        <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
          {/* Big Container Header: Title, Description, and Integrated Filter Pills */}
          <div className="p-5 sm:p-6 border-b border-border bg-muted/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary shrink-0" />
                <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                  Team Role Progression & Gap Identification
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Live competency scores mapped against target role ontologies from the Neo4j Knowledge Graph
              </p>
            </div>

            {/* Interactive Filter Pills Embedded in Header */}
            <div className="flex items-center gap-1.5 flex-wrap p-1 rounded-xl bg-card border border-border shadow-2xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-secondary text-primary shadow-2xs font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                All ({TEAM_MEMBERS.length})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('ready')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'ready'
                    ? 'bg-success/15 text-success font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>Ready ({TEAM_MEMBERS.filter((m) => m.status === 'ready').length})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('on_track')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'on_track'
                    ? 'bg-warning/20 text-warning font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <span>On Track ({TEAM_MEMBERS.filter((m) => m.status === 'on_track').length})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('needs_attention')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'needs_attention'
                    ? 'bg-destructive/15 text-destructive font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <span>Needs Support ({TEAM_MEMBERS.filter((m) => m.status === 'needs_attention').length})</span>
              </button>
            </div>
          </div>

          {/* Quick Search Bar within Container */}
          <div className="p-3.5 border-b border-border bg-muted/5 flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Filter by employee, role, or skill gap..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/25 transition-colors"
              />
            </div>
            <span className="text-[11px] text-muted-foreground font-mono ml-auto pr-2">
              Showing {filteredMembers.length} of {TEAM_MEMBERS.length} members
            </span>
          </div>

          {/* Table Surface */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                  <th className="px-5 py-3.5 font-bold">Employee</th>
                  <th className="px-5 py-3.5 font-bold">Current Role</th>
                  <th className="px-5 py-3.5 font-bold">Target Role</th>
                  <th className="px-5 py-3.5 font-bold">Readiness Score</th>
                  <th className="px-5 py-3.5 font-bold">Critical Skill Gap</th>
                  <th className="px-5 py-3.5 font-bold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-xs text-muted-foreground">
                      No team members match the active filters.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {member.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </div>
                          <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                            {member.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground font-medium text-xs">
                        {member.currentRole}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="outline" className="font-semibold text-primary border-primary/30 bg-secondary/30 text-xs">
                          {member.targetRole}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="w-32 space-y-1.5">
                          <div className="flex justify-between text-xs font-mono font-bold">
                            <span
                              className={
                                member.readinessScore >= 80
                                  ? 'text-success'
                                  : member.readinessScore >= 50
                                    ? 'text-warning'
                                    : 'text-destructive'
                              }
                            >
                              {member.readinessScore}%
                            </span>
                          </div>
                          <Progress
                            value={member.readinessScore}
                            variant={
                              member.readinessScore >= 80
                                ? 'success'
                                : member.readinessScore >= 50
                                  ? 'warning'
                                  : 'destructive'
                            }
                          />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-md bg-muted text-foreground border border-border">
                          {member.criticalGap}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Badge
                          variant={
                            member.status === 'ready'
                              ? 'success'
                              : member.status === 'on_track'
                                ? 'warning'
                                : 'destructive'
                          }
                          className="font-bold text-xs shadow-2xs"
                        >
                          {member.status === 'ready'
                            ? 'Ready for Promotion'
                            : member.status === 'on_track'
                              ? 'On Track'
                              : 'Needs Support'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
