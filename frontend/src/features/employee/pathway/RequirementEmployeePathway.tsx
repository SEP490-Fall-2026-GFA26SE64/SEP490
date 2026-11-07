import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GitFork, ListOrdered, RefreshCw, Search, Target } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { readRulePathway, type RuleStep } from '../../../shared/api/requirementPathway'
import { PathwayError, sendPathwayCommand, type PendingPathwayCommand } from '../../../shared/api/initialPathway'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { InitialPathwayFeedback } from '../../../shared/components/InitialPathwayFeedback'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { Input } from '../../../shared/components/ui/Input'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../shared/components/ui/Tabs'
import { RequirementPathwayPresentation } from '../components/RequirementPathwayPresentation'
import { CertificateSubmissionDialog } from './CertificateSubmissionDialog'

export function RequirementEmployeePathway({ scope }: { scope: string }) {
  const [params] = useSearchParams()
  return <OwnedRequirementEmployeePathway key={scope + ':' + (params.get('archive') ?? 'current')} scope={scope} />
}
function OwnedRequirementEmployeePathway({ scope }: { scope: string }) {
  const { t } = useTranslation(), [params] = useSearchParams(), archive = params.get('archive')
  const [tab, setTab] = useState('roadmap'), [search, setSearch] = useState(''), [pending, setPending] = useState<PendingPathwayCommand | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState<PathwayError | null>(null), lock = useRef(false)
  const [certificateStep, setCertificateStep] = useState<RuleStep | null>(null)
  const query = useQuery({ queryKey: ['initialPathway', scope, 'ruleEmployee', archive], queryFn: ({ signal }) => readRulePathway(archive, signal), retry: false, gcTime: 0,
    refetchInterval: current => !archive && !current.state.error && current.state.data && !current.state.data.archived ? 5000 : false })
  const data = query.data, state = data?.reviewStatus === 'APPROVED' ? 'APPROVED' : data?.reviewStatus === 'AWAITING_EXPERT_REVIEW' ? 'AWAITING_EXPERT_REVIEW' : data?.generationStatus
  async function retry() {
    if (lock.current || !data) return
    const command = pending ?? { key: crypto.randomUUID(), path: `employee/initial-pathway-requests/${encodeURIComponent(data.requestId)}/retry`, body: '{}' }
    lock.current = true; setBusy(true); setError(null); setPending(command)
    try { await sendPathwayCommand(command); setPending(null); await query.refetch() }
    catch (cause) { const failure = cause instanceof PathwayError ? cause : new PathwayError('NETWORK_ERROR'); setError(failure); if (!failure.ambiguous) setPending(null) }
    finally { lock.current = false; setBusy(false) }
  }
  const required = data?.steps.filter(step => step.kind === 'REQUIRED') ?? [], achieved = required.filter(step => step.state === 'FULFILLED').length
  return <div className="min-w-0 space-y-5 pb-8"><h1 className="sr-only">{t('initialPathway.title')}</h1>
    {query.isPending && <LoadingCard label={t('initialPathway.loading')} />}
    {(query.error || error) && <InitialPathwayFeedback error={error ?? query.error} busy={busy || query.isFetching} onRetry={() => { if (pending) void retry(); else void query.refetch() }} />}
    {!query.isPending && !query.error && !data && <EmptyState title={t('initialPathway.empty')} action={<Link className={buttonVariants({ variant: 'secondary' })} to="/employee/upskilling?tab=roles">{t('initialPathway.roles')}</Link>} />}
    {data && !query.error && <Tabs value={tab} onValueChange={setTab} className="space-y-5"><div className="flex min-w-0 flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-2xs"><Target className="size-4 shrink-0 text-primary" /><Text as="span" variant="caption">{t('initialPathway.targetRole')}</Text><span className="min-w-0 break-words text-body-sm font-semibold">{data.roleName} · {data.levelName}</span><Badge variant={data.archived ? 'outline' : state === 'APPROVED' ? 'success' : 'warning'}>{t('initialPathway.state.' + (data.archived ? 'ARCHIVED' : state))}</Badge></div>
      <div className="flex max-w-full flex-wrap items-center gap-2"><TabsList className="h-auto w-auto max-w-full flex-wrap"><TabsTrigger value="roadmap" className="gap-1.5"><GitFork className="size-4 text-primary" />{t('pathway.interactiveRoadmap')}</TabsTrigger><TabsTrigger value="timeline" className="gap-1.5"><ListOrdered className="size-4 text-primary" />{t('pathway.adaptiveTimeline')}</TabsTrigger></TabsList><Button variant="ghost" size="icon" aria-label={t('initialPathway.refresh')} disabled={query.isFetching || busy} onClick={() => void query.refetch()}><RefreshCw className="size-4" /></Button></div></div>
      {state !== 'APPROVED' && !data.archived && <Card><CardContent className="space-y-3 p-4"><Text role="status">{state === 'NO_LEARNING_REQUIRED' ? t('initialPathway.noLearningHelp') : t('rulePathway.pending')}</Text>{['BLOCKED', 'FAILED_RETRYABLE', 'STALE'].includes(data.generationStatus) && data.revision === null && <Button variant="outline" disabled={busy} onClick={() => void retry()}>{t('rulePathway.retryGeneration')}</Button>}</CardContent></Card>}
      {data.steps.length > 0 && <><Card><CardContent className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-3 sm:p-4"><Text variant="body-sm" className="font-semibold">{t('rulePathway.official')}: {achieved}/{required.length}</Text><div className="w-full min-w-0 sm:w-72"><Input leftIcon={<Search className="size-4" />} aria-label={t('initialPathway.display.searchSkills')} placeholder={t('initialPathway.display.searchSkills')} value={search} onChange={event => setSearch(event.target.value)} /></div></CardContent></Card><TabsContent value="roadmap"><RequirementPathwayPresentation pathway={data} mode="roadmap" search={search} onCertificate={setCertificateStep} /></TabsContent><TabsContent value="timeline"><RequirementPathwayPresentation pathway={data} mode="timeline" search={search} onCertificate={setCertificateStep} /></TabsContent></>}
    </Tabs>}
    {data && certificateStep && data.steps.some(item => item.id === certificateStep.id) && <CertificateSubmissionDialog key={data.requestId + ':' + certificateStep.id} scope={scope} pathway={data} step={data.steps.find(item => item.id === certificateStep.id)!} onClose={() => setCertificateStep(null)} />}
  </div>
}
