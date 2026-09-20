import { AlertTriangle, DollarSign, Sparkles, TrendingUp, UserCheck } from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Progress } from '../../../shared/components/ui/Progress'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { AVERAGE_READINESS, TOTAL_HOURS_SAVED } from '../data/managerData'
import './RoiForecastPage.css'

export function RoiForecastPage() {
  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Console Header */}
        <PageHeader
          icon={<TrendingUp className="h-8 w-8 text-primary" />}
          title="Predictive Upskilling & ROI Forecast"
          description="Forecast time-to-mastery using Knowledge Tracing velocity, compute direct corporate training cost savings, and target high-ROI group intervention modules."
          actions={
            <Badge variant="secondary" className="px-3 py-1 font-medium flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>AI Predictive Engine</span>
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
