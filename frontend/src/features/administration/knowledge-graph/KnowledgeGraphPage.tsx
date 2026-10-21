import { Database } from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { KnowledgeGraphViewer } from './components/KnowledgeGraphViewer'
import './KnowledgeGraphPage.css'

export function KnowledgeGraphPage() {
  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Actions Bar */}
        <PageHeader
          actions={
            <Badge variant="secondary" className="px-3 py-1 font-medium flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-primary" />
              <span>Competency Graph Engine Connected</span>
            </Badge>
          }
        />

        {/* Graph Viewer */}
        <KnowledgeGraphViewer />
      </div>
    </WorkspaceLayout>
  )
}
