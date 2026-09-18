import {
  DollarSign,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import { Heading } from '../../../shared/components/typography/Heading'
import { Badge } from '../../../shared/components/ui/Badge'
import { Breadcrumb } from '../../../shared/components/ui/Breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Progress } from '../../../shared/components/ui/Progress'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { AVERAGE_READINESS, TEAM_MEMBERS, TOTAL_HOURS_SAVED } from '../data/managerData'
import './TeamMatrixPage.css'

export function TeamMatrixPage() {
  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        <Breadcrumb
          items={[
            { label: 'Platform Home', href: '/' },
            { label: 'Manager Console', href: '/manager/team-matrix' },
            { label: 'Team Competency Matrix' },
          ]}
        />

        {/* Console Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <Heading level={1} size="page" className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <span>Team Competency Matrix</span>
            </Heading>
            <p className="text-muted-foreground mt-1 text-sm max-w-3xl">
              Track team competency coverage, benchmark employee capability scores against Neo4j ontology targets, and identify critical skill gaps.
            </p>
          </div>

          <Badge variant="secondary" className="px-3 py-1 font-medium flex items-center gap-1.5 self-start md:self-center">
            <Users className="h-4 w-4 text-primary" />
            <span>3 Team Members Scoped</span>
          </Badge>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-card to-secondary/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-primary" /> Average Team Readiness
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-primary">{AVERAGE_READINESS}%</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={AVERAGE_READINESS} variant="primary" />
              <p className="text-xs text-muted-foreground mt-1.5">+14% improvement this quarter</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-secondary/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                <DollarSign className="h-4 w-4 text-success" /> Cumulative Hours Saved
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-success">{TOTAL_HOURS_SAVED} Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Saved via adaptive knowledge-gap skipping vs rigid traditional LMS courses.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-secondary/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                <UserCheck className="h-4 w-4 text-primary" /> Promotion Ready
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground">1 Employee</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Elena Rostova has reached 92% of target competency thresholds.</p>
            </CardContent>
          </Card>
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
                                  ? 'primary'
                                  : 'warning'
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
                                ? 'primary'
                                : 'warning'
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
