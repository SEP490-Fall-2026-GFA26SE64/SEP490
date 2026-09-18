import { Compass } from 'lucide-react'
import { Heading } from '../../../shared/components/typography/Heading'
import { Badge } from '../../../shared/components/ui/Badge'
import { Breadcrumb } from '../../../shared/components/ui/Breadcrumb'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { AdaptivePathwayTimeline } from '../components/AdaptivePathwayTimeline'
import './AdaptivePathwayPage.css'

export function AdaptivePathwayPage() {
  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        <Breadcrumb
          items={[
            { label: 'Platform Home', href: '/' },
            { label: 'Learner Portal', href: '/learner/pathway' },
            { label: 'Adaptive Pathway' },
          ]}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <Heading level={1} size="page" className="flex items-center gap-3">
              <Compass className="h-8 w-8 text-primary" />
              <span>Adaptive Learning Pathway</span>
            </Heading>
            <p className="text-muted-foreground mt-1 text-sm max-w-3xl">
              Real-time adaptive learning recommendations driven by Neo4j Knowledge Graph ontology and Dynamic Knowledge Tracing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1 font-medium">
              Target: AI Knowledge Architect
            </Badge>
          </div>
        </div>

        <AdaptivePathwayTimeline />
      </div>
    </WorkspaceLayout>
  )
}
