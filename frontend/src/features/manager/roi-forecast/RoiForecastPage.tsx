import { AlertTriangle, DollarSign, Sparkles, TrendingUp, UserCheck } from 'lucide-react'
import { Heading } from '../../../shared/components/typography/Heading'
import { Badge } from '../../../shared/components/ui/Badge'
import { Breadcrumb } from '../../../shared/components/ui/Breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Progress } from '../../../shared/components/ui/Progress'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { AVERAGE_READINESS, TOTAL_HOURS_SAVED } from '../data/managerData'
import './RoiForecastPage.css'

export function RoiForecastPage() {
  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        <Breadcrumb
          items={[
            { label: 'Platform Home', href: '/' },
            { label: 'Manager Console', href: '/manager/team-matrix' },
            { label: 'Predictive Upskilling & ROI' },
          ]}
        />

        {/* Console Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <Heading level={1} size="page" className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              <span>Predictive Upskilling & ROI Forecast</span>
            </Heading>
            <p className="text-muted-foreground mt-1 text-sm max-w-3xl">
              Forecast time-to-mastery using Knowledge Tracing velocity, compute direct corporate training cost savings, and target high-ROI group intervention modules.
            </p>
          </div>

          <Badge variant="secondary" className="px-3 py-1 font-medium flex items-center gap-1.5 self-start md:self-center">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>AI Predictive Engine</span>
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

        {/* Forecast & High-Priority Modules Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span>Predictive Upskilling Forecast</span>
              </CardTitle>
              <CardDescription>
                Knowledge Tracing predicts time-to-mastery and organizational ROI for target positions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Target Transition: AI Knowledge Architect</span>
                  <span className="text-primary font-bold">Q4 2026 Forecast</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Based on current competency velocity, 2 engineers are predicted to bridge their Knowledge Graph and GNN gaps within 7 weeks.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Estimated Direct Training Cost Saved:</span>
                  <strong className="text-foreground">$8,450 USD</strong>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Productivity Hours Preserved:</span>
                  <strong className="text-success font-bold">108.5 Dev Hours</strong>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <span>High-Priority Intervention Modules</span>
              </CardTitle>
              <CardDescription>
                Modules providing the highest collective competency delta across the team.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-md border border-border flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">MOD-301: Graph Neural Networks & Node Embeddings</p>
                  <p className="text-xs text-muted-foreground">Impacts: 2 team members • Resolves 4 critical gaps</p>
                </div>
                <Badge variant="primary">High ROI</Badge>
              </div>

              <div className="p-3 rounded-md border border-border flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">MOD-204: Neo4j Cypher Optimization</p>
                  <p className="text-xs text-muted-foreground">Impacts: 3 team members • Foundation for pathway</p>
                </div>
                <Badge variant="secondary">Core Gate</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
