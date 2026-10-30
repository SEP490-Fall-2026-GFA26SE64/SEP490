import { Sparkles, Target } from 'lucide-react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { Heading } from '../../../shared/components/typography/Heading'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { ActiveSkillSummary } from './ActiveSkillSummary'
import { CurrentRolePanel } from './CurrentRolePanel'
import { UpskillSkillsPanel } from './UpskillSkillsPanel'

/** Retain old bookmarks while using one Upskilling surface. */
export function EmployeeTargetRolesPage() {
  const [params] = useSearchParams()
  const { hash } = useLocation()
  const query = new URLSearchParams(params)
  query.set('tab', 'roles')
  return <Navigate to={{ pathname: '/employee/upskilling', search: query.toString(), hash }} replace />
}

export function EmployeeUpskillingPage() {
  const [params, setParams] = useSearchParams()
  const { t } = useTranslation()
  const tab = params.get('tab') === 'skills' ? 'skills' : 'roles'
  const changeTab = (value: string) => {
    const query = new URLSearchParams(params)
    query.set('tab', value)
    setParams(query)
  }
  return <WorkspaceLayout>
    <Heading level={1} className="sr-only">{t('nav.upskilling')}</Heading>
    <Tabs value={tab} onValueChange={changeTab} className="min-w-0 space-y-5 pb-8">
      <div className="flex justify-end">
        <TabsList role="tablist" aria-label={t('nav.upskilling')} className="w-auto gap-1">
          {(['skills', 'roles'] as const).map(value => <TabsTrigger key={value} value={value}
            id={`upskilling-${value}-tab`} role="tab" aria-selected={tab === value}
            aria-controls={`upskilling-${value}-panel`} tabIndex={tab === value ? 0 : -1}
            className="gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onKeyDown={event => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
              event.preventDefault()
              const next = event.key === 'Home' ? 'skills' : event.key === 'End' ? 'roles' : value === 'roles' ? 'skills' : 'roles'
              changeTab(next)
              document.getElementById(`upskilling-${next}-tab`)?.focus()
            }}>
            {value === 'roles' ? <Target size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
            {t(`upskillingUi.${value}`)}
          </TabsTrigger>)}
        </TabsList>
      </div>
      {/* Keep exact pending selection/start commands alive when switching to Skills. */}
      <div hidden={tab !== 'roles'} id="upskilling-roles-panel" role="tabpanel" aria-labelledby="upskilling-roles-tab" className="min-w-0">
        <CurrentRolePanel />
      </div>
      <TabsContent value="skills" id="upskilling-skills-panel" role="tabpanel" aria-labelledby="upskilling-skills-tab" className="min-w-0 space-y-5">
        <ActiveSkillSummary />
        <UpskillSkillsPanel />
      </TabsContent>
    </Tabs>
  </WorkspaceLayout>
}

export const LearnerTargetRolesPage = EmployeeTargetRolesPage
