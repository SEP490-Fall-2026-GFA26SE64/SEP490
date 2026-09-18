import { Database, Network as NetworkIcon } from 'lucide-react'

import { Heading } from '../../../shared/components/typography/Heading'
import { Badge } from '../../../shared/components/ui/Badge'
import { Breadcrumb } from '../../../shared/components/ui/Breadcrumb'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { KnowledgeGraphViewer } from './components/KnowledgeGraphViewer'
import './KnowledgeGraphPage.css'

export function KnowledgeGraphPage() {
  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        <Breadcrumb
          items={[
            { label: 'Platform Home', href: '/' },
            { label: 'Administrator', href: '/admin/dashboard' },
            { label: 'Knowledge Graph Explorer' },
          ]}
        />

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <Heading level={1} size="page" className="flex items-center gap-3">
              <NetworkIcon className="h-8 w-8 text-primary" />
              <span>Organizational Competency Knowledge Graph</span>
            </Heading>
            <p className="text-muted-foreground mt-1 text-sm max-w-3xl">
              Semantic ontology bridging corporate roles, macro/micro-competencies, and educational learning assets via Neo4j graph topology.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1 font-medium flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-primary" />
              <span>Neo4j Graph Database Connected</span>
            </Badge>
          </div>
        </div>

        {/* Graph Viewer */}
        <KnowledgeGraphViewer />
      </div>
    </WorkspaceLayout>
  )
}
