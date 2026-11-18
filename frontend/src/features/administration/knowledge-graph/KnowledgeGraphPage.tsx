import * as React from 'react'
import { Waypoints } from 'lucide-react'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { getActiveCompany, resolveWorkspaceOrgId } from '../../../shared/stores/companyStore'
import { useCopy } from '../../subscription/SubscriptionFeedback'
import { OrganizationKnowledgeGraphExplorer } from './OrganizationKnowledgeGraphExplorer'

export function KnowledgeGraphPage() {
  const c = useCopy()
  const session = React.useContext(WorkspaceSessionContext)
  const organizationId = resolveWorkspaceOrgId(session?.identity?.organizationId || getActiveCompany()?.id)
  return (
    <WorkspaceLayout>
      <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4 pb-8">
        <PageHeader icon={<Waypoints size={26} aria-hidden="true" />} title={c('Knowledge graph', 'Knowledge graph')}
          description={c('Explore how job positions, target roles, levels, skills, prerequisites, learning modules and certificates connect in your organization.',
            'Khám phá cách vị trí công việc, vai trò mục tiêu, cấp độ, kỹ năng, kỹ năng tiên quyết, học phần và chứng chỉ liên kết trong tổ chức.')} />
        <OrganizationKnowledgeGraphExplorer organizationId={organizationId} />
      </div>
    </WorkspaceLayout>
  )
}
