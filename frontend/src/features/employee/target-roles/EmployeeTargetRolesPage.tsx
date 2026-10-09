import { Target } from 'lucide-react'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { ActiveTargetRoleSummary } from './ActiveTargetRoleSummary'
import { TargetRoleBrowsePanel } from './TargetRoleBrowsePanel'

export function EmployeeTargetRolesPage() {
  return (
    <WorkspaceLayout>
      <div className="space-y-6">
        <PageHeader
          title="Target Roles"
          description="Review your active target role or choose another role available to your organization."
          icon={<Target size={24} />}
        />
        <ActiveTargetRoleSummary />
        <TargetRoleBrowsePanel />
      </div>
    </WorkspaceLayout>
  )
}

export const LearnerTargetRolesPage = EmployeeTargetRolesPage
