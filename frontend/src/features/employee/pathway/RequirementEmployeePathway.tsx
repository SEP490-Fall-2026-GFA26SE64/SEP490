import { useToast } from '../../../shared/hooks/useToast'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, GitBranch, History, LockKeyhole, RefreshCw, Target } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { readRulePathway, type RuleStep } from '../../../shared/api/requirementPathway'
import { PathwayError, sendPathwayCommand, type PendingPathwayCommand } from '../../../shared/api/initialPathway'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { InitialPathwayFeedback } from '../../../shared/components/InitialPathwayFeedback'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { RequirementPathwayPresentation } from '../components/RequirementPathwayPresentation'
import { PathwayTimingSummary } from './PathwayTimingSummary'
import { CertificateSubmissionDialog } from './CertificateSubmissionDialog'
import { readCurrentKnowledgeTarget } from '../baseline-assessment/assignedKnowledgeRoleApi'
import { PathwayPlaceholder } from './PathwayPlaceholder'
import { BypassedGapsPanel } from '../components/BypassedGapsPanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'
import { PathwayHistory } from './PathwayHistory'
import { CompletePathwayButton } from './CompletePathwayButton'

export function RequirementEmployeePathway({ scope }: { scope: string }) {
  const [params, setParams] = useSearchParams()
  const { language } = useTranslation(), vi = language === 'vi'
  const tab = params.has('archive') || params.get('tab') === 'history' ? 'history' : 'current'
  const content = <OwnedRequirementEmployeePathway key={scope + ':' + (params.get('archive') ?? 'current')} scope={scope} />
  return <Tabs value={tab} className="min-w-0 space-y-5" onValueChange={value => {
    const next = new URLSearchParams(params); next.delete('archive'); next.delete('assessmentModule')
    if (value === 'history') next.set('tab', value); else next.delete('tab')
    setParams(next)
  }}>
    <div className="flex justify-end"><TabsList aria-label={vi ? 'Lộ trình học tập' : 'Pathways'} className="w-auto gap-1">
      <TabsTrigger value="current" className="gap-2"><GitBranch size={15} aria-hidden="true" />{vi ? 'Hiện tại' : 'Current'}</TabsTrigger>
      <TabsTrigger value="history" className="gap-2"><History size={15} aria-hidden="true" />{vi ? 'Lịch sử' : 'History'}</TabsTrigger>
    </TabsList></div>
    <TabsContent value="current">{tab === 'current' && content}</TabsContent>
    <TabsContent value="history"><PathwayHistory key={scope} scope={scope}>{content}</PathwayHistory></TabsContent>
  </Tabs>
}
function OwnedRequirementEmployeePathway({ scope }: { scope: string }) {
  const { toast } = useToast(), previousReview = useRef<{ id: string; state: string } | null>(null)
  const { t, language } = useTranslation(), [params] = useSearchParams(), archive = params.get('archive')
  const [pending, setPending] = useState<PendingPathwayCommand | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState<PathwayError | null>(null), lock = useRef(false)
  const [certificateStep, setCertificateStep] = useState<RuleStep | null>(null)
  const [graphLocked, setGraphLocked] = useState(false)
  const graphStart=useRef<HTMLDivElement>(null),autoScrolled=useRef(false)
  const query = useQuery({ queryKey: ['initialPathway', scope, 'ruleEmployee', archive], queryFn: ({ signal }) => readRulePathway(archive, signal), retry: false, gcTime: 60_000, staleTime: 15_000, refetchOnWindowFocus: false,
    refetchInterval: current => {
      const value = current.state.data
      if (current.state.error || !value || value.archived) return false
      if (['PENDING', 'GENERATING', 'FAILED_RETRYABLE'].includes(value.generationStatus) || value.reviewStatus === 'AWAITING_EXPERT_REVIEW') return 10_000
      return value.reviewStatus === 'APPROVED' && value.steps.some(step => !['FULFILLED', 'ASSESSED_SATISFIED', 'BYPASSED'].includes(step.state)) ? 30_000 : false
    } })
  const targetEnabled = !archive && query.isSuccess && query.data === null
  const target = useQuery({ queryKey: ['initialPathway', scope, 'currentTargetLabel'], queryFn: ({ signal }) => readCurrentKnowledgeTarget(signal, { requirements: false }), enabled: targetEnabled, retry: false, gcTime: 60_000, staleTime: 15_000, refetchOnWindowFocus: false })
  const targetError = targetEnabled ? target.error : null
  const denied = [query.error, targetError].some(failure => failure && 'status' in failure && [401, 403].includes(Number(failure.status)))
  const data = denied ? undefined : query.data, state = data?.reviewStatus === 'APPROVED' ? 'APPROVED' : data?.reviewStatus === 'REJECTED' ? 'REJECTED' : data?.reviewStatus === 'AWAITING_EXPERT_REVIEW' ? 'AWAITING_EXPERT_REVIEW' : data?.generationStatus
  const completed = data?.timing?.state === 'COMPLETED'
  const readOnly = Boolean(archive || data?.archived)
  useEffect(() => {
    if (!data || data.archived) return
    const previous = previousReview.current
    if (previous?.id === data.requestId && previous.state !== 'APPROVED' && data.reviewStatus === 'APPROVED') toast({ variant: 'success', duration: 1000, description: language === 'vi' ? 'Lộ trình của bạn đã được duyệt.' : 'Your pathway has been approved.' })
    previousReview.current = { id: data.requestId, state: data.reviewStatus }
  }, [data, language, toast])
  const scrollReady=Boolean(data&&!readOnly&&!completed&&state==='APPROVED'&&data.steps.length>0&&!query.error&&!params.has('assessmentModule'))
  useEffect(()=>{
    if(!scrollReady||autoScrolled.current)return
    let second=0
    const first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>{
      if(!graphStart.current)return
      autoScrolled.current=true
      graphStart.current.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})
    })})
    return ()=>{cancelAnimationFrame(first);cancelAnimationFrame(second)}
  },[scrollReady])
  async function retry() {
    if (lock.current || !data) return
    const command = pending ?? { key: crypto.randomUUID(), path: `employee/initial-pathway-requests/${encodeURIComponent(data.requestId)}/retry`, body: '{}' }
    lock.current = true; setBusy(true); setError(null); setPending(command)
    try { await sendPathwayCommand(command); setPending(null); await query.refetch() }
    catch (cause) { const failure = cause instanceof PathwayError ? cause : new PathwayError('NETWORK_ERROR'); setError(failure); if (!failure.ambiguous) setPending(null) }
    finally { lock.current = false; setBusy(false) }
  }
  return <div className="min-w-0 space-y-5 pb-8"><h1 className="sr-only">{t('initialPathway.title')}</h1>
    {!data && <><Card><CardContent className="flex flex-wrap items-center gap-2 p-4"><Target className="size-4 text-primary" /><Text variant="caption">{t('initialPathway.targetRole')}</Text>{target.data && !target.isError && !denied && <Text className="font-semibold">{target.data.roleName}{target.data.levelName ? ` · ${target.data.levelName}` : ''}</Text>}</CardContent></Card><PathwayPlaceholder target={!target.isError && !denied ? target.data : null}>
      {query.isPending || targetEnabled && target.isPending ? <LoadingCard label={t('initialPathway.loading')} /> : query.isError || targetError ? <InitialPathwayFeedback error={query.error ?? targetError} busy={query.isFetching || target.isFetching} onRetry={() => { if (query.isError) void query.refetch(); if (targetError) void target.refetch() }} /> : <><Text role="status" variant="body-sm">{t('initialPathway.empty')}</Text><Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} to="/employee/upskilling?tab=roles">{t('initialPathway.roles')}</Link></>}
    </PathwayPlaceholder></>}
    {data && <div className="space-y-5"><Card><CardContent className="space-y-3 p-4"><div className="flex min-w-0 flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 flex-wrap items-center gap-2"><Target className="size-4 shrink-0 text-primary" /><Text as="span" variant="caption">{t('initialPathway.targetRole')}</Text><span className="min-w-0 break-words text-body-sm font-semibold">{data.roleName} · {data.levelName}</span><Badge variant={completed ? 'success' : data.archived ? 'outline' : state === 'APPROVED' ? 'success' : 'warning'}>{completed ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-3" aria-hidden="true" />{language === 'vi' ? 'Hoàn thành' : 'Completed'}</span> : data.archived ? (language === 'vi' ? 'Đã hủy' : 'Cancelled') : t('initialPathway.state.' + state)}</Badge>{readOnly && <Text as="span" variant="caption" className="inline-flex items-center gap-1"><LockKeyhole className="size-3" aria-hidden="true" />{language === 'vi' ? 'Chỉ đọc' : 'Read-only'}</Text>}</div>
      <div className="flex max-w-full flex-wrap items-center gap-2">{!readOnly && !completed && state === 'APPROVED' && <CompletePathwayButton requestId={data.requestId} disabled={busy || graphLocked} />}<Button variant="ghost" size="icon" aria-label={t('initialPathway.refresh')} disabled={query.isFetching || busy || graphLocked} onClick={() => void query.refetch()}><RefreshCw className="size-4" /></Button></div></div>
      <PathwayTimingSummary timing={data.timing} cancelled={data.archived && !completed} /></CardContent></Card>
      {(query.error || error) && <InitialPathwayFeedback error={error ?? query.error} busy={busy || query.isFetching} onRetry={() => { if (pending) void retry(); else void query.refetch() }} />}
      {data.steps.length > 0 && state !== 'APPROVED' && !data.archived && <Card><CardContent className="space-y-3 p-4"><Text role="status">{state === 'NO_LEARNING_REQUIRED' ? t('initialPathway.noLearningHelp') : t('rulePathway.pending')}</Text>{['BLOCKED', 'FAILED_RETRYABLE', 'STALE'].includes(data.generationStatus) && data.revision === null && <Button variant="outline" disabled={busy} onClick={() => void retry()}>{t('rulePathway.retryGeneration')}</Button>}</CardContent></Card>}
      {data.steps.length > 0 && <div ref={graphStart} style={{scrollMarginTop:'calc(var(--workspace-header-height, 58px) + 24px)'}}><RequirementPathwayPresentation pathway={data} preview={readOnly} onCertificate={readOnly ? undefined : setCertificateStep} onInteractionLockChange={setGraphLocked} /></div>}
      {data.steps.length === 0 && <PathwayPlaceholder target={data}><Text role="status" variant="body-sm">{t('initialPathway.state.' + state)}</Text>{!data.archived && ['BLOCKED', 'FAILED_RETRYABLE', 'STALE'].includes(data.generationStatus) && data.revision === null && <Button variant="outline" disabled={busy} onClick={() => void retry()}>{t('rulePathway.retryGeneration')}</Button>}</PathwayPlaceholder>}
    </div>}
    {!readOnly && !denied && <BypassedGapsPanel availableOnly pathway={data} />}
    {!readOnly && data && certificateStep && data.steps.some(item => item.id === certificateStep.id) && <CertificateSubmissionDialog key={data.requestId + ':' + certificateStep.id} scope={scope} pathway={data} step={data.steps.find(item => item.id === certificateStep.id)!} onClose={() => setCertificateStep(null)} />}
  </div>
}
