import * as React from 'react'
import { Sparkles, Target } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { ActiveSkillSummary } from './ActiveSkillSummary'
import { ActiveTargetRoleSummary } from './ActiveTargetRoleSummary'
import { TargetRoleBrowsePanel } from './TargetRoleBrowsePanel'
import { UpskillSkillsPanel } from './UpskillSkillsPanel'

export function EmployeeTargetRolesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialTab =
    tabParam === 'roles' || tabParam === 'target-roles' ? 'target-roles' : 'upskill'
  const [activeTab, setActiveTab] = React.useState<'upskill' | 'target-roles'>(initialTab)

  React.useEffect(() => {
    if (tabParam === 'roles' || tabParam === 'target-roles') {
      setActiveTab('target-roles')
    } else if (tabParam === 'skills' || tabParam === 'upskill') {
      setActiveTab('upskill')
    }
  }, [tabParam])

  const handleTabChange = (val: string) => {
    const nextTab = val as 'upskill' | 'target-roles'
    setActiveTab(nextTab)
    const newParams = new URLSearchParams(searchParams)
    newParams.set('tab', nextTab === 'upskill' ? 'skills' : 'roles')
    setSearchParams(newParams, { replace: true })
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6">
        <PageHeader
          title="Skills & Target Roles"
          description="Explore recommended micro-skills to upskill or set and manage your active target role."
          icon={<Target size={24} />}
        />

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="bg-muted/80 p-1 rounded-xl max-w-md border border-border">
            <TabsTrigger
              value="upskill"
              className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg"
            >
              <Sparkles size={15} className="text-primary" />
              <span>Skills</span>
            </TabsTrigger>
            <TabsTrigger
              value="target-roles"
              className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg"
            >
              <Target size={15} className="text-primary" />
              <span>Roles</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upskill" className="mt-6 space-y-6">
            <ActiveSkillSummary />
            <UpskillSkillsPanel />
          </TabsContent>

          <TabsContent value="target-roles" className="mt-6 space-y-6">
            <ActiveTargetRoleSummary />
            <TargetRoleBrowsePanel />
          </TabsContent>
        </Tabs>
      </div>
    </WorkspaceLayout>
  )
}

export const LearnerTargetRolesPage = EmployeeTargetRolesPage

