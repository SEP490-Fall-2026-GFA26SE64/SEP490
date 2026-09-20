import { Compass } from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { AdaptivePathwayTimeline } from '../components/AdaptivePathwayTimeline'
import './AdaptivePathwayPage.css'

export function AdaptivePathwayPage() {
  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        <PageHeader
          icon={<Compass className="h-8 w-8 text-primary" />}
          title="Adaptive Learning Pathway"
          description="Real-time adaptive learning recommendations driven by Neo4j Knowledge Graph ontology and Dynamic Knowledge Tracing."
          actions={
            <Badge variant="secondary" className="px-3 py-1 font-medium">
              Target: AI Knowledge Architect
            </Badge>
          }
        />

        <AdaptivePathwayTimeline />
      </div>
    </WorkspaceLayout>
  )
}
