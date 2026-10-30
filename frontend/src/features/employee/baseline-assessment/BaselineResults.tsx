import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader } from '../../../shared/components/ui/Card'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { useQuery } from '@tanstack/react-query'
import { Heading } from '../../../shared/components/typography/Heading'
import { readMyMastery } from '../target-roles/currentRoleFlowApi'
import { MasterySkills } from './MasterySkills'
import { MasteryHelp } from './MasteryHelp'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { attemptPath, readHistory, type BaselineCommand, type BaselineResult } from './baselineApi'

export function BaselineResultPanel({ result }: { result: BaselineResult; locked: boolean; run: (command: BaselineCommand) => Promise<void> }) {
  const { t, language } = useTranslation(), tr = (key: string) => t(`employeeBaseline.${key}`)
  const invalidated = result.state === 'INVALIDATED'
  const profile = useQuery({ queryKey: ['my-mastery'], queryFn: ({ signal }) => readMyMastery(signal), enabled: !invalidated, retry: false })
  return <Card className={invalidated ? "overflow-hidden border-warning/50" : "overflow-hidden border-success/40"}>
    <CardHeader className={invalidated ? "border-b border-warning/30 bg-warning/5 p-5" : "border-b border-success/20 bg-success/5 p-5"}><div className="flex items-start justify-between gap-3"><Heading level={2} size="subsection" className="break-words">{tr('result')}: {result.occupationName}</Heading><MasteryHelp /></div>
      <div className="flex flex-wrap gap-2"><Badge variant="outline" className="max-w-full whitespace-normal">{tr(`scopes.${result.assessmentScope}`)}</Badge><Badge variant={invalidated ? 'warning' : 'success'}>{tr(result.state)}</Badge></div>
    </CardHeader>
    <CardContent className="space-y-4 p-5">
      {invalidated && result.completionReason === 'MANUAL' && <Text variant="body-sm" role="status">{tr('insufficientEvidence')}</Text>}
      <Text variant="body-sm" className="text-muted-foreground">{tr('scopeNotice')}</Text>
      <dl className="grid gap-3 text-body-sm sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted/30 p-3"><dt className="text-muted-foreground">{tr('startedDate')}</dt><dd className="mt-1 font-semibold"><time dateTime={result.startedAt}>{new Date(result.startedAt).toLocaleString(language)}</time></dd></div>
        <div className="rounded-lg border border-border bg-muted/30 p-3"><dt className="text-muted-foreground">{tr('completedDate')}</dt><dd className="mt-1 font-semibold"><time dateTime={result.completedAt}>{new Date(result.completedAt).toLocaleString(language)}</time></dd></div>
        {result.roleName && <div className="rounded-lg border border-border bg-muted/30 p-3 sm:col-span-2"><dt className="text-muted-foreground">{tr('originalRole')}</dt><dd className="mt-1 break-words font-semibold">{result.roleName}</dd></div>}
      </dl>
      <Text variant="body-sm">{t(`employeeBaseline.reasons.${result.completionReason}`, tr('recordedOutcome'))}</Text>
      {invalidated ? <Text variant="body-sm">{tr('invalidatedNotice')}</Text> : <>
        <Text variant="body-sm">{t('baselineUi.completedHint')}</Text>
        <StatCard variant="gradient" valueClassName="text-primary" className="border-primary/25" title={t('baselineUi.score')} value={result.rawScore === null ? '—' : `${(result.rawScore * 100).toFixed(1)}%`} description={t('baselineUi.scoreHint')} />
        <Heading level={3} size="subsection">{t('baselineUi.masteryTitle')}</Heading>
        <Text variant="body-sm" className="text-muted-foreground">{t('baselineUi.confidenceHint')}</Text>
        <MasterySkills skills={result.skills.map(skill => ({ id: skill.microSkillId, name: skill.microSkillName, mastery: skill.mastery, confidence: skill.confidence }))} />
        {profile.isPending ? <LoadingCard label={tr('loading')} /> : profile.isError ? <div role="alert"><Text variant="body-sm">{t('baselineUi.profileError')}</Text><Button variant="outline" onClick={() => void profile.refetch()}>{tr('retry')}</Button></div> : <Text variant="body-sm" role="status">{t(profile.data.some(p => p.attemptId === result.attemptId) ? 'baselineUi.profileSaved' : 'baselineUi.profilePending')}</Text>}
        <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} to="/employee/my-mastery">{t('baselineUi.myMastery')}</Link>
        <Text variant="body-sm" className="text-muted-foreground">{tr('noRetake')}</Text>
      </>}
      {result.replacesAttemptId && <Link className="block text-primary underline" to={attemptPath(result.replacesAttemptId)}>{tr('previousAttempt')}</Link>}
      {result.replacementAttemptId ? <Link className="block text-primary underline" to={attemptPath(result.replacementAttemptId)}>{tr('replacement')}</Link>
        : invalidated && <Link className="block text-primary underline" to="/employee/upskilling?tab=roles">{tr('startReplacement')}</Link>}
    </CardContent>
  </Card>
}

export function BaselineHistory() {
  const { t, language } = useTranslation(), tr = (key: string) => t(`employeeBaseline.${key}`)
  const [items, setItems] = useState<BaselineResult[]>([]), [error, setError] = useState(false), [loading, setLoading] = useState(true), [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void readHistory(controller.signal).then(value => { if (!controller.signal.aborted) setItems(value) })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reload])
  return <Card><CardHeader className="p-5 pb-4"><Heading level={2} size="card">{tr('history')}</Heading></CardHeader><CardContent className="space-y-3 px-5 pb-5">
    {loading ? <LoadingCard label={tr('loading')} /> : error ? <Text variant="body-sm" tone="destructive" role="alert" className="text-destructive">{tr('historyError')}</Text> : items.length === 0 ? <EmptyState bordered={false} title={tr('emptyHistory')} description={tr('historyEmptyHint')}
      action={<Link className={buttonVariants({ variant: 'outline', size: 'sm' })} to="/employee/upskilling?tab=roles">{tr('backToStart')}</Link>} />
      : <ul className="space-y-3">{items.map(item => <li key={item.attemptId} className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
        <Link className="break-words font-semibold text-primary underline" to={attemptPath(item.attemptId)}>{item.occupationName}</Link>
        <div className="flex flex-wrap gap-2"><Badge variant="outline" className="max-w-full whitespace-normal">{tr(`scopes.${item.assessmentScope}`)}</Badge><Badge variant={item.state === 'INVALIDATED' ? 'warning' : 'success'}>{tr(item.state)}</Badge></div>
        {item.roleName && <Text variant="body-sm" className="break-words">{tr('originalRole')}: {item.roleName}</Text>}
        <Text variant="caption" className="text-muted-foreground">{tr('completedDate')}: <time dateTime={item.completedAt}>{new Date(item.completedAt).toLocaleString(language)}</time></Text>
      </li>)}</ul>}
    <Button variant="outline" disabled={loading} onClick={() => { setLoading(true); setError(false); setItems([]); setReload(value => value + 1) }}>{tr('refresh')}</Button>
  </CardContent></Card>
}
