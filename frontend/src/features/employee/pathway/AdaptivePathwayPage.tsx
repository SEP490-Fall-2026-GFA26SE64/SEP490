import * as React from 'react'
import {
  ArrowRight,
  CheckCircle2,
  GitFork,
  ListOrdered,
  Lock,
  RefreshCw,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'
import { TargetRoleSelector } from '../../../shared/components/ui/TargetRoleSelector'
import { useEmployeeLearningState } from '../../../shared/hooks/useEmployeeLearningState'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { AdaptivePathwayTimeline } from '../../learner/components/AdaptivePathwayTimeline'
import { InteractiveRoleRoadmap } from '../../learner/components/InteractiveRoleRoadmap'

export function AdaptivePathwayPage() {
  const [activeTab, setActiveTab] = React.useState('roadmap')
  const { profile, isLearningLocked, toggleDiagnosticLock } = useEmployeeLearningState()

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* =========================================================================
            CLEAN SNUG HEADER BAR WITH TARGET ROLE SELECTOR
           ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border px-4 py-3 rounded-xl shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <TargetRoleSelector />
            <span className="text-xs text-muted-foreground hidden md:inline">
              Assigned by: {profile.assignedByManager || 'David Miller (Line Manager)'} &bull; Due: {profile.deadline || '2026-12-31'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isLearningLocked ? (
              <Badge variant="warning" className="text-xs font-semibold px-2.5 py-1">
                <Lock size={12} className="mr-1 inline" /> Diagnostic Assessment Required
              </Badge>
            ) : (
              <Badge variant="success" className="text-xs font-semibold px-2.5 py-1">
                <CheckCircle2 size={12} className="mr-1 inline" /> Pathway Active & Calibrated
              </Badge>
            )}
          </div>
        </div>

        {/* =========================================================================
            LOCKED STATE OVERLAY IF DIAGNOSTIC IS NOT YET COMPLETED
           ========================================================================= */}
        {isLearningLocked ? (
          <Card className="border border-warning/30 bg-gradient-to-br from-card via-card to-warning/5 shadow-xs overflow-hidden">
            <CardContent className="py-12 px-6 text-center max-w-2xl mx-auto space-y-5">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-warning/15 text-warning border border-warning/30 flex items-center justify-center shadow-xs">
                <Lock size={28} />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground tracking-tight">
                  Adaptive Learning Pathway Locked
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Your Line Manager (<strong className="text-foreground">{profile.assignedByManager || 'David Miller'}</strong>)
                  has assigned your new target role as{' '}
                  <strong className="text-primary">{profile.targetRole || 'AI Knowledge Architect'}</strong>.
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Before your personalized curriculum map and interactive timeline can be generated,
                  you must complete the initial <strong className="text-foreground">Diagnostic Assessment</strong> in the
                  assessment quiz. This ensures accurate Bayesian Knowledge Tracing and eliminates redundant prerequisites.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/employee/assessment?diagnostic=true">
                  <Button
                    variant="primary"
                    size="default"
                    rightIcon={<ArrowRight size={16} />}
                    className="font-bold shadow-xs px-5"
                  >
                    Take Diagnostic Assessment Now
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  size="default"
                  onClick={toggleDiagnosticLock}
                  className="text-xs font-semibold hover:border-primary/40"
                  leftIcon={<RefreshCw size={13} />}
                >
                  Quick Unlock (Demo Test)
                </Button>
              </div>

              <div className="pt-4 border-t border-border/60 text-[11px] text-muted-foreground font-mono">
                Rule Policy: ISO-27001 Competency Governance &bull; Baseline Diagnostic Mandatory
              </div>
            </CardContent>
          </Card>
        ) : (
          /* =========================================================================
              UNLOCKED PATHWAY VIEW: ROADMAP VS TIMELINE
             ========================================================================= */
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-border">
              <TabsList className="bg-muted/80 p-1">
                <TabsTrigger
                  value="roadmap"
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold data-[state=active]:bg-card"
                >
                  <GitFork size={15} className="text-primary" />
                  <span>Interactive Roadmap</span>
                </TabsTrigger>
                <TabsTrigger
                  value="timeline"
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold data-[state=active]:bg-card"
                >
                  <ListOrdered size={15} />
                  <span>Adaptive Timeline</span>
                </TabsTrigger>
              </TabsList>

              <span className="text-xs text-muted-foreground hidden sm:inline">
                {activeTab === 'roadmap'
                  ? 'Visualizing Target Role ontology tree: Yellow = Modules, Orange = Micro-skills'
                  : 'Linear prerequisite timeline with Bayesian mastery gates'}
              </span>
            </div>

            {/* TAB 1: INTERACTIVE ROADMAP */}
            <TabsContent value="roadmap" className="mt-4">
              <InteractiveRoleRoadmap />
            </TabsContent>

            {/* TAB 2: ADAPTIVE TIMELINE */}
            <TabsContent value="timeline" className="mt-4">
              <AdaptivePathwayTimeline />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </WorkspaceLayout>
  )
}
