import { Database, Network as NetworkIcon } from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { KnowledgeGraphViewer } from './components/KnowledgeGraphViewer'
import './KnowledgeGraphPage.css'

export function KnowledgeGraphPage() {
  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Page Header */}
        <PageHeader
          icon={<NetworkIcon className="h-8 w-8 text-primary" />}
          title="Organizational Competency Knowledge Graph"
          description="Semantic ontology bridging corporate roles, macro/micro-competencies, and educational learning assets via Neo4j graph topology."
          actions={
            <Badge variant="secondary" className="px-3 py-1 font-medium flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-primary" />
              <span>Neo4j Graph Database Connected</span>
            </Badge>
          }
        />

        {/* Graph Viewer */}
        <KnowledgeGraphViewer />
      </div>
    </WorkspaceLayout>
  )
}
