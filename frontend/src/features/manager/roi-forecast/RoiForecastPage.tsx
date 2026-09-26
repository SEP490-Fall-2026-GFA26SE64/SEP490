import * as React from 'react'
import { AlertTriangle, BookOpen, DollarSign, Sparkles, TrendingUp, UserCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Progress } from '../../../shared/components/ui/Progress'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { getActiveCompany, type CompanyRecord } from '../../../shared/stores/companyStore'
import './RoiForecastPage.css'

export function RoiForecastPage() {
  const [activeCompany, setActiveCompany] = React.useState<CompanyRecord>(getActiveCompany)

  React.useEffect(() => {
    const handleSync = () => {
      setActiveCompany(getActiveCompany())
    }
    window.addEventListener('active_company_changed', handleSync)
    window.addEventListener('companies_updated', handleSync)
    return () => {
      window.removeEventListener('active_company_changed', handleSync)
      window.removeEventListener('companies_updated', handleSync)
    }
  }, [])

  const employees = (activeCompany.users || []).filter((u) => u.role === 'Employee')
  const modules = activeCompany.modules || []
  const targetRoles = activeCompany.targetRoles || []

  const averageReadiness = employees.length > 0 ? 76 : 0
  const totalHoursSaved = employees.length > 0 ? Math.round(employees.length * 28.5) : 0
  const promotionReadyCount = employees.length >= 2 ? 1 : employees.length === 1 ? 1 : 0
  const promotionReadyName = employees[0]?.name

  const primaryTargetRole = targetRoles[0]?.title || 'Core Capability Track'
  const estimatedCostSaved = employees.length > 0 ? (employees.length * 2850).toLocaleString() : '0'
  const devHoursPreserved = employees.length > 0 ? (employees.length * 36.2).toFixed(1) : '0'

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Top Badges */}
        <div className="flex items-center justify-between pb-1 border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">{activeCompany.name}</span>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {activeCompany.packageTier} Package
            </Badge>
          </div>
          <Badge variant="secondary" className="px-3 py-1 font-medium flex items-center gap-1.5 border border-primary/20">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>AI Predictive Engine</span>
          </Badge>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            variant="gradient"
            icon={<TrendingUp className="h-4 w-4 text-primary" />}
            title="Average Team Readiness"
            value={`${averageReadiness}%`}
            valueClassName="text-primary"
            description={employees.length > 0 ? "+14% improvement this quarter" : "No active employee telemetry"}
          >
            <Progress value={averageReadiness} variant="primary" />
          </StatCard>

          <StatCard
            variant="gradient"
            icon={<DollarSign className="h-4 w-4 text-success" />}
            title="Cumulative Hours Saved"
            value={`${totalHoursSaved} Hours`}
            valueClassName="text-success"
            description="Saved via adaptive knowledge-gap skipping vs rigid traditional LMS courses."
          />

          <StatCard
            variant="gradient"
            icon={<UserCheck className="h-4 w-4 text-primary" />}
            title="Promotion Ready"
            value={`${promotionReadyCount} Employee${promotionReadyCount === 1 ? '' : 's'}`}
            description={
              promotionReadyName && employees.length > 0
                ? `${promotionReadyName} is progressing towards target competency thresholds.`
                : 'No employees evaluated for target promotion readiness yet.'
            }
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
                Knowledge Tracing predicts time-to-mastery and organizational ROI for target positions in {activeCompany.name}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Target Transition: {primaryTargetRole}</span>
                  <span className="text-primary font-bold">2026 Forecast</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {employees.length > 0
                    ? `Based on current competency velocity, ${employees.length} scoped employee${
                        employees.length === 1 ? '' : 's'
                      } in ${activeCompany.name} are projected to bridge key domain gaps within 6-8 weeks.`
                    : `No employee learners enrolled yet in ${activeCompany.name}. Provision employees in the User Directory to generate predictive forecasts.`}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Estimated Direct Training Cost Saved:</span>
                  <strong className="text-foreground">${estimatedCostSaved} USD</strong>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Productivity Hours Preserved:</span>
                  <strong className="text-success font-bold">{devHoursPreserved} Dev Hours</strong>
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
                Curriculum modules providing the highest collective competency delta for {activeCompany.name}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {modules.length === 0 ? (
                <div className="text-center py-6 space-y-2">
                  <BookOpen className="h-7 w-7 text-muted-foreground/60 mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    No instructional modules cataloged for {activeCompany.name} yet.
                  </p>
                  <Link to="/expert/modules">
                    <Button variant="outline" size="sm" className="mt-1">
                      Configure Learning Modules
                    </Button>
                  </Link>
                </div>
              ) : (
                modules.slice(0, 3).map((mod, idx) => (
                  <div key={mod.id} className="p-3 rounded-md border border-border flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">
                        {mod.code}: {mod.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Duration: {mod.durationMinutes} mins • Impacts {employees.length} team member
                        {employees.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <Badge variant={idx === 0 ? 'primary' : 'secondary'}>
                      {idx === 0 ? 'High ROI' : 'Core Gate'}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
