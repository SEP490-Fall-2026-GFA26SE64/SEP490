import * as React from 'react'
import {
  ArrowRight,
  GitFork,
  ListOrdered,
  Lock,
  RefreshCw,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'
import { TargetRoleSelector } from '../../../shared/components/ui/TargetRoleSelector'
import { useEmployeeLearningState } from '../../../shared/hooks/useEmployeeLearningState'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { AdaptivePathwayTimeline } from '../components/AdaptivePathwayTimeline'
import { InteractiveRoleRoadmap } from '../components/InteractiveRoleRoadmap'
import { InitialEmployeePathway } from './InitialEmployeePathway'

export function AdaptivePathwayPage() {
  const { profile } = useEmployeeLearningState()
  return profile.selectedViewType === 'skill' ? <IndependentSkillPathwayPage /> : <InitialEmployeePathway />
}
function IndependentSkillPathwayPage() {
  const [activeTab, setActiveTab] = React.useState('roadmap')
  const { profile, isLearningLocked, toggleDiagnosticLock } = useEmployeeLearningState()
  const { t } = useTranslation()

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Actions Bar */}
          <PageHeader
            actions={
              <div className="w-full flex items-center justify-between gap-2.5 flex-wrap">
                <TargetRoleSelector />

                <TabsList className="w-auto bg-muted/70 p-1">
                  <TabsTrigger
                    value="roadmap"
                    className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold data-[state=active]:bg-card"
                  >
                    <GitFork size={15} className="text-primary" />
                    <span>{t('pathway.interactiveRoadmap')}</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="timeline"
                    className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold data-[state=active]:bg-card"
                  >
                    <ListOrdered size={15} className="text-primary" />
                    <span>{t('pathway.adaptiveTimeline')}</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            }
          />

          {/* LOCKED STATE OVERLAY IF DIAGNOSTIC IS NOT YET COMPLETED */}
          {isLearningLocked && profile.selectedViewType !== 'skill' ? (
            <Card className="border border-warning/30 bg-gradient-to-br from-card via-card to-warning/5 shadow-xs overflow-hidden mt-6">
              <CardContent className="py-12 px-6 text-center max-w-2xl mx-auto space-y-5">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-warning/15 text-warning border border-warning/30 flex items-center justify-center shadow-xs">
                  <Lock size={28} />
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-foreground tracking-tight">
                    Adaptive Learning Pathway Calibration Pending
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    You have selected your target role as{' '}
                    <strong className="text-primary">{profile.targetRole || 'AI Knowledge Architect'}</strong>.
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Before your personalized curriculum map and interactive timeline can be calibrated,
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
                  System Policy: Continuous Knowledge Tracing &bull; Baseline Diagnostic Mandatory
                </div>
              </CardContent>
            </Card>
          ) : (
            <>


              {/* TAB 1: INTERACTIVE ROADMAP */}
              <TabsContent value="roadmap" className="mt-4">
                <InteractiveRoleRoadmap />
              </TabsContent>

              {/* TAB 2: ADAPTIVE TIMELINE */}
              <TabsContent value="timeline" className="mt-4">
                <AdaptivePathwayTimeline />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </WorkspaceLayout>
  )
}
