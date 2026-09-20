import {
  DollarSign,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Progress } from '../../../shared/components/ui/Progress'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { AVERAGE_READINESS, TEAM_MEMBERS, TOTAL_HOURS_SAVED } from '../data/managerData'
import './TeamMatrixPage.css'

export function TeamMatrixPage() {
  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Console Header */}
        <PageHeader
          icon={<Users className="h-8 w-8 text-primary" />}
          title="Team Competency Matrix"
          description="Track team competency coverage, benchmark employee capability scores against Neo4j ontology targets, and identify critical skill gaps."
          actions={
            <Badge variant="secondary" className="px-3 py-1 font-medium flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" />
              <span>3 Team Members Scoped</span>
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

        {/* Team Matrix Table Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Team Role Progression & Gap Identification</CardTitle>
            <CardDescription>
              Live competency scores mapped against target role ontologies from the Neo4j Knowledge Graph.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                    <th className="pb-3 font-semibold">Employee</th>
                    <th className="pb-3 font-semibold">Current Role</th>
                    <th className="pb-3 font-semibold">Target Role</th>
                    <th className="pb-3 font-semibold">Readiness Score</th>
                    <th className="pb-3 font-semibold">Critical Skill Gap</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {TEAM_MEMBERS.map((member) => (
                    <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 font-medium text-foreground">{member.name}</td>
                      <td className="py-3.5 text-muted-foreground">{member.currentRole}</td>
                      <td className="py-3.5 font-semibold text-primary">{member.targetRole}</td>
                      <td className="py-3.5">
                        <div className="w-28 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{member.readinessScore}%</span>
                          </div>
                          <Progress
                            value={member.readinessScore}
                            variant={
                              member.readinessScore > 80
                                ? 'success'
                                : member.readinessScore > 50
                                  ? 'warning'
                                  : 'destructive'
                            }
                          />
                        </div>
                      </td>
                      <td className="py-3.5 text-xs text-muted-foreground font-mono">{member.criticalGap}</td>
                      <td className="py-3.5">
                        <Badge
                          variant={
                            member.status === 'ready'
                              ? 'success'
                              : member.status === 'on_track'
                                ? 'warning'
                                : 'destructive'
                          }
                        >
                          {member.status === 'ready'
                            ? 'Ready for Promotion'
                            : member.status === 'on_track'
                              ? 'On Track'
                              : 'Needs Support'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </WorkspaceLayout>
  )
}
