import { moduleRequest, type ManualPathway } from '../../../shared/api/moduleAuthoringApi'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GitFork, ListOrdered, RefreshCw, Search, Sparkles, Target } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { PathwayError, readArchivedPathway, readInitialPathway } from '../../../shared/api/initialPathway'
import { useInitialPathwaySession } from '../../../shared/hooks/useInitialPathwaySession'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { InitialPathwayFeedback } from '../../../shared/components/InitialPathwayFeedback'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { Input } from '../../../shared/components/ui/Input'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../shared/components/ui/Tabs'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { AdaptivePathwayTimeline } from '../components/AdaptivePathwayTimeline'
import { InteractiveRoleRoadmap } from '../components/InteractiveRoleRoadmap'
import { baselineTargetMet, pathwayAccessNote } from '../../../shared/api/initialPathwayMessages'

export function InitialEmployeePathway() {
  const session = useInitialPathwaySession(), { t } = useTranslation()
  const assignments = useQuery({ queryKey: ['manualPathways', session.scope], queryFn: ({ signal }) => moduleRequest<ManualPathway[]>('/pathways', 'GET', undefined, signal), enabled: Boolean(session.scope && session.data?.role === 'EMPLOYEE'), retry: false })
  return <WorkspaceLayout>{Boolean(assignments.data?.length) && <Link className={buttonVariants({ variant: 'outline', className: 'mb-4' })} to="/employee/pathway?view=assigned">{t('initialPathway.display.assignedModules')}</Link>}{session.scope && session.data?.role === 'EMPLOYEE' ? <Pathway key={session.scope} scope={session.scope} /> : session.isPending ? <LoadingCard label={t('initialPathway.loading')} /> : <InitialPathwayFeedback error={session.error ?? new PathwayError('FORBIDDEN', 403)} onRetry={() => void session.refetch()} />}</WorkspaceLayout>
}
function Pathway({ scope }: { scope: string }) {
  const { t, language } = useTranslation(), tr = (key: string) => t('initialPathway.' + key), ui = (key: string) => tr('display.' + key), [params] = useSearchParams(), archiveId = params.get('archive')
  const [tab, setTab] = useState('roadmap'), [search, setSearch] = useState('')
  const path = useQuery({ queryKey: ['initialPathway', scope, 'employee', archiveId], queryFn: ({ signal }) => archiveId ? readArchivedPathway(archiveId, signal) : readInitialPathway(signal), retry: false, gcTime: 0,
    refetchInterval: query => !archiveId && !query.state.error && (query.state.data?.status?.reviewStatus === 'AWAITING_EXPERT_REVIEW' || ['PENDING', 'GENERATING', 'FAILED_RETRYABLE'].includes(query.state.data?.status?.displayState ?? '')) ? 4000 : false })
  const data = path.data, status = data?.status, query = search.trim().toLocaleLowerCase()
  const mandatory = [...new Map((data?.baseline?.skills ?? []).filter(skill => skill.mandatory).map(skill => [skill.skillId, skill])).values()]
  const met = mandatory.filter(baselineTargetMet).length
  const matches = (data?.modules ?? []).filter(({ module }) => `${module.id} ${module.title} ${module.targets.map(target => data?.baseline?.skills.find(skill => skill.skillId === target.skillId)?.name ?? target.skillId).join(' ')}`.toLocaleLowerCase().includes(query)).length
  const accessNotes = [...new Set((data?.modules ?? []).filter(item => item.reasonCode && ['LOCKED', 'UNAVAILABLE'].includes(item.accessState)).map(item => pathwayAccessNote(item.reasonCode, t)))]
  return <div className="min-w-0 space-y-5 pb-8">
    <h1 className="sr-only">{tr(archiveId ? 'history' : 'title')}</h1>
    {path.isPending && <LoadingCard label={tr('loading')} />}
    {path.isError && <InitialPathwayFeedback error={path.error} onRetry={() => void path.refetch()} busy={path.isFetching} />}
    {data && !path.isError && <Tabs value={tab} onValueChange={setTab} className="space-y-5">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-1"><Button variant="secondary" size="sm" aria-pressed="true"><Target className="size-3.5" />{ui('roleMode')}</Button><Link to="/employee/upskilling?tab=skills" title={ui('chooseSkill')} className={buttonVariants({ variant: 'ghost', size: 'sm' })}><Sparkles className="mr-1 size-3.5" />{ui('skillMode')}</Link></div>
          {status && <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-2xs"><Target className="size-4 shrink-0 text-primary" /><Text as="span" variant="caption">{tr('targetRole')}</Text><span className="min-w-0 break-words text-[length:var(--text-body-sm)] font-semibold">{status.roleName} · {status.levelName}</span><Badge variant={data.archived ? 'outline' : status.displayState === 'APPROVED' ? 'success' : 'warning'} className="max-w-full whitespace-normal">{tr('state.' + (data.archived ? 'ARCHIVED' : status.displayState))}</Badge></div>}
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-2"><TabsList className="h-auto w-auto max-w-full flex-wrap"><TabsTrigger value="roadmap" className="gap-1.5"><GitFork className="size-4 text-primary" />{t('pathway.interactiveRoadmap')}</TabsTrigger><TabsTrigger value="timeline" className="gap-1.5"><ListOrdered className="size-4 text-primary" />{t('pathway.adaptiveTimeline')}</TabsTrigger></TabsList><Button variant="ghost" size="icon" title={tr('refresh')} aria-label={tr('refresh')} disabled={path.isFetching} onClick={() => void path.refetch()}><RefreshCw className="size-4" /></Button></div>
      </div>
      {!status && <div data-testid="empty-initial-pathway" />}
      {status && status.displayState !== 'APPROVED' && !data.archived && <Card><CardContent className="p-4"><Text role="status">{status.displayState === 'NO_LEARNING_REQUIRED' ? tr('noLearningHelp') : ['BLOCKED', 'UNRESOLVED', 'STALE'].includes(status.displayState) ? tr(status.reasonCode === 'SEARCH_LIMIT' ? 'searchLimitNote' : status.displayState === 'STALE' ? 'stale' : 'setup') : tr('state.' + status.displayState)}</Text></CardContent></Card>}
      {data.modules.length > 0 && <>
        <Card><CardContent className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-3 sm:p-4"><div className="flex min-w-0 flex-wrap items-center gap-2" title={ui('snapshotHelp')}>
          <Text as="span" variant="body-sm" tone="foreground" className="font-semibold">{ui('baselineTargets')}: {data.baseline && mandatory.length ? `${met}/${mandatory.length} ${ui('targetsMet')} (${mandatory.length - met} ${ui('remaining')})` : ui('snapshotUnavailable')}</Text>
          {data.baseline && mandatory.length > 0 && <Badge variant={met === mandatory.length ? 'success' : 'secondary'}>{(met * 100 / mandatory.length).toLocaleString(language, { maximumFractionDigits: 0 })}%</Badge>}
        </div><div className="w-full min-w-0 sm:w-72"><Input leftIcon={<Search className="size-4" />} aria-label={ui('searchSkills')} placeholder={ui('searchSkills')} value={search} onChange={event => setSearch(event.target.value)} /></div></CardContent></Card>
        {query && matches === 0 && <Text variant="body-sm" role="status">{ui('noMatches')}</Text>}
        {accessNotes.length > 0 && <div className="space-y-1 rounded-lg border border-border bg-muted/30 px-4 py-3" role="note">{accessNotes.map(note => <Text key={note} variant="caption">{note}</Text>)}</div>}
        <TabsContent value="roadmap"><InteractiveRoleRoadmap pathway={data} search={search} /></TabsContent>
        <TabsContent value="timeline"><AdaptivePathwayTimeline pathway={data} search={search} /></TabsContent>
      </>}
    </Tabs>}
  </div>
}
