import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { PathwayError, readArchivedPathway, readInitialPathway } from '../../../shared/api/initialPathway'
import { useInitialPathwaySession } from '../../../shared/hooks/useInitialPathwaySession'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { InitialPathwayFeedback } from '../../../shared/components/InitialPathwayFeedback'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../shared/components/ui/Tabs'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { AdaptivePathwayTimeline } from '../components/AdaptivePathwayTimeline'
import { InteractiveRoleRoadmap } from '../components/InteractiveRoleRoadmap'

export function InitialEmployeePathway() {
  const session = useInitialPathwaySession(), { t } = useTranslation()
  return <WorkspaceLayout>{session.scope && session.data?.role === 'EMPLOYEE' ? <Pathway key={session.scope} scope={session.scope} /> : session.isPending ? <LoadingCard label={t('initialPathway.loading')} /> : <InitialPathwayFeedback error={session.error ?? new PathwayError('FORBIDDEN', 403)} onRetry={() => void session.refetch()} />}</WorkspaceLayout>
}
function Pathway({ scope }: { scope: string }) {
  const { t } = useTranslation(), tr = (key: string) => t('initialPathway.' + key), [params] = useSearchParams(), archiveId = params.get('archive')
  const [tab, setTab] = useState('roadmap')
  const path = useQuery({ queryKey: ['initialPathway', scope, 'employee', archiveId], queryFn: ({ signal }) => archiveId ? readArchivedPathway(archiveId, signal) : readInitialPathway(signal), retry: false, gcTime: 0,
    refetchInterval: query => !archiveId && !query.state.error && (query.state.data?.status?.reviewStatus === 'AWAITING_EXPERT_REVIEW' || ['PENDING', 'GENERATING', 'FAILED_RETRYABLE'].includes(query.state.data?.status?.displayState ?? '')) ? 4000 : false })
  const data = path.data, status = data?.status
  return <div className="min-w-0 space-y-5 pb-8">
    <PageHeader title={tr(archiveId ? 'history' : 'title')} description={status ? `${status.roleName} · ${status.levelName}` : undefined} actions={<Button variant="outline" disabled={path.isFetching} onClick={() => void path.refetch()}>{tr('refresh')}</Button>} />
    {path.isPending && <LoadingCard label={tr('loading')} />}
    {path.isError && <InitialPathwayFeedback error={path.error} onRetry={() => void path.refetch()} busy={path.isFetching} />}
    {data && !path.isError && <>
      {!status ? <EmptyState title={tr('empty')} action={<Link to="/employee/upskilling?tab=roles" className="font-semibold text-primary underline">{tr('roles')}</Link>} /> : <Card><CardContent className="space-y-3 p-4" role="status">
        <Badge variant={status.displayState === 'APPROVED' ? 'success' : 'warning'}>{tr('state.' + status.displayState)}</Badge>
        {status.displayState === 'NO_LEARNING_REQUIRED' && <Text>{tr('noLearningHelp')}</Text>}
        {['BLOCKED', 'UNRESOLVED', 'STALE'].includes(status.displayState) && <Text>{tr(status.reasonCode === 'SEARCH_LIMIT' ? 'searchLimitNote' : status.displayState === 'STALE' ? 'stale' : 'setup')}</Text>}
      </CardContent></Card>}
      {data.modules.length > 0 && <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="roadmap">{t('pathway.interactiveRoadmap')}</TabsTrigger><TabsTrigger value="timeline">{t('pathway.adaptiveTimeline')}</TabsTrigger></TabsList>
        <TabsContent value="roadmap" className="mt-4"><InteractiveRoleRoadmap pathway={data} /></TabsContent>
        <TabsContent value="timeline" className="mt-4"><AdaptivePathwayTimeline pathway={data} /></TabsContent>
      </Tabs>}
    </>}
  </div>
}
