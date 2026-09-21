import * as React from 'react'
import { Compass, GitFork, ListOrdered, Sparkles } from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../../shared/components/ui/Tabs'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { AdaptivePathwayTimeline } from '../components/AdaptivePathwayTimeline'
import { InteractiveRoleRoadmap } from '../components/InteractiveRoleRoadmap'
import './AdaptivePathwayPage.css'

export function AdaptivePathwayPage() {
  const [activeTab, setActiveTab] = React.useState('roadmap')

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        <PageHeader
          icon={<Compass className="h-8 w-8 text-primary" />}
          title="Adaptive Learning Pathway"
          description="Interactive curriculum map and real-time adaptive learning recommendations driven by Neo4j Knowledge Graph ontology."
          actions={
            <Badge variant="secondary" className="px-3 py-1 font-medium flex items-center gap-1.5">
              <Sparkles size={14} className="text-primary" />
              <span>Target: AI Knowledge Architect</span>
            </Badge>
          }
        />

        {/* Pathway View Tabs: Interactive Roadmap (roadmap.sh style) vs. Adaptive Timeline */}
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

          {/* TAB 1: INTERACTIVE ROADMAP (roadmap.sh style) */}
          <TabsContent value="roadmap" className="mt-4">
            <InteractiveRoleRoadmap />
          </TabsContent>

          {/* TAB 2: ADAPTIVE TIMELINE (Linear module steps) */}
          <TabsContent value="timeline" className="mt-4">
            <AdaptivePathwayTimeline />
          </TabsContent>
        </Tabs>
      </div>
    </WorkspaceLayout>
  )
}
