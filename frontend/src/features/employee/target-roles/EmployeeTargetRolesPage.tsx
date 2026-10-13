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
      <div className="space-y-6 pb-16">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          {/* Actions Bar: Right-aligned tabs */}
          <PageHeader
            actions={
              <div className="w-full flex items-center justify-end gap-2.5">
                <TabsList className="w-auto bg-muted/70 p-1">
                  <TabsTrigger
                    value="upskill"
                    className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold data-[state=active]:bg-card"
                  >
                    <Sparkles size={15} className="text-primary" />
                    <span>Skills</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="target-roles"
                    className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold data-[state=active]:bg-card"
                  >
                    <Target size={15} className="text-primary" />
                    <span>Roles</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            }
          />

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

