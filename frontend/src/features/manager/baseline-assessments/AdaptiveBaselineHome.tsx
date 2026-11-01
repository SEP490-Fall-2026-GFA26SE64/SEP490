import { useContext, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { AdaptiveBaselineDirectory } from './AdaptiveBaselineDirectory'
import { AssessmentPolicyTab } from './AssessmentPolicyTab'
import { AssessmentPolicyNotice } from './AssessmentPolicyNotice'
import { baselineReturnPath } from './assessmentPolicyNavigation'

export function AdaptiveBaselineHome() {
  const session = useContext(WorkspaceSessionContext)
  const identity = session?.identity
  return <BaselineTabs key={`${identity?.organizationId}:${identity?.accountId}:${identity?.roles?.join(',')}`} />
}
function BaselineTabs() {
  const { t } = useTranslation(), [locked, setLocked] = useState(false), [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'policy' ? 'policy' : 'blueprints'
  function setTab(value: string) {
    if (locked) return
    const next = new URLSearchParams(params); next.set('tab', value); setParams(next, { replace: true })
  }
  return <div className="min-w-0 space-y-5"><PageHeader title={t('assessmentPolicy.pageTitle')} description={t('assessmentPolicy.pageHelp')} />
    <Tabs value={tab} onValueChange={setTab}><TabsList role="tablist" aria-label={t('assessmentPolicy.pageTitle')} onKeyDown={event => {
      if (locked || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const next = event.key === 'Home' ? 'blueprints' : event.key === 'End' ? 'policy' : tab === 'blueprints' ? 'policy' : 'blueprints'
      setTab(next); document.getElementById(next === 'blueprints' ? 'baseline-blueprints-tab' : 'baseline-policy-tab')?.focus()
    }}>
      <TabsTrigger id="baseline-blueprints-tab" role="tab" tabIndex={tab === 'blueprints' ? 0 : -1} aria-selected={tab === 'blueprints'} aria-controls="baseline-blueprints-panel" value="blueprints" disabled={locked}>{t('assessmentPolicy.blueprints')}</TabsTrigger>
      <TabsTrigger id="baseline-policy-tab" role="tab" tabIndex={tab === 'policy' ? 0 : -1} aria-selected={tab === 'policy'} aria-controls="baseline-policy-panel" value="policy" disabled={locked}>{t('assessmentPolicy.title')}</TabsTrigger>
    </TabsList><div id="baseline-blueprints-panel" role="tabpanel" aria-labelledby="baseline-blueprints-tab" hidden={tab !== 'blueprints'} className="mt-5 space-y-5">{tab === 'blueprints' && <AssessmentPolicyNotice />}<AdaptiveBaselineDirectory embedded /></div>
      <TabsContent id="baseline-policy-panel" role="tabpanel" aria-labelledby="baseline-policy-tab" value="policy" className="mt-5"><AssessmentPolicyTab onPendingChange={setLocked} returnToBaseline={baselineReturnPath(params)} /></TabsContent>
    </Tabs></div>
}
