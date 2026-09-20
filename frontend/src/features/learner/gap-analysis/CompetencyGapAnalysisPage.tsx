import { Award } from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { CompetencyGapAnalysis } from '../components/CompetencyGapAnalysis'
import './CompetencyGapAnalysisPage.css'

export function CompetencyGapAnalysisPage() {
  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        <PageHeader
          icon={<Award className="h-8 w-8 text-primary" />}
          title="Competency Gap Analysis"
          description="Inspect current mastery thresholds vs. target organizational requirements and explore personalized skill recommendations."
          actions={
            <Badge variant="secondary" className="px-3 py-1 font-medium">
              Target: AI Knowledge Architect
            </Badge>
          }
        />

        <CompetencyGapAnalysis />
      </div>
    </WorkspaceLayout>
  )
}
