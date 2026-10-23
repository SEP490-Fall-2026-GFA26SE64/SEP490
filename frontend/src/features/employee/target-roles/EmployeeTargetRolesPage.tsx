import { Navigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { ActiveSkillSummary } from './ActiveSkillSummary'
import { CurrentRolePanel } from './CurrentRolePanel'
import { UpskillSkillsPanel } from './UpskillSkillsPanel'

export function EmployeeTargetRolesPage() {
  const { t } = useTranslation()
  return <WorkspaceLayout><div className="space-y-6 pb-16">
    <PageHeader title={t('nav.targetRoles')} />
    <CurrentRolePanel />
  </div></WorkspaceLayout>
}

export function EmployeeUpskillingPage() {
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  if (['roles', 'target-roles'].includes(searchParams.get('tab') ?? '')) {
    const query = new URLSearchParams(searchParams)
    query.delete('tab')
    return <Navigate to={{ pathname: '/employee/target-roles', search: query.toString() }} replace />
  }
  return <WorkspaceLayout><div className="space-y-6 pb-16">
    <PageHeader title={t('nav.upskilling')} />
    <ActiveSkillSummary />
    <UpskillSkillsPanel />
  </div></WorkspaceLayout>
}

export const LearnerTargetRolesPage = EmployeeTargetRolesPage

