import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { Progress } from '../../../shared/components/ui/Progress'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { attemptPath, readHistory, startCommand, type BaselineCommand, type BaselineResult } from './baselineApi'

export function BaselineResultPanel({ result, locked, run }: { result: BaselineResult; locked: boolean; run: (command: BaselineCommand) => Promise<void> }) {
  const { t, language } = useTranslation(), tr = (key: string) => t(`employeeBaseline.${key}`)
  const invalidated = result.state === 'INVALIDATED'
  return <Card>
    <CardHeader><CardTitle className="break-words">{tr('result')}: {result.occupationName}</CardTitle>
      <div className="flex flex-wrap gap-2"><Badge variant="outline" className="max-w-full whitespace-normal">{tr(`scopes.${result.assessmentScope}`)}</Badge><Badge variant={invalidated ? 'warning' : 'success'}>{tr(result.state)}</Badge></div>
    </CardHeader>
    <CardContent className="space-y-4">
      <Text variant="body-sm" className="text-muted-foreground">{tr('scopeNotice')}</Text>
      <dl className="grid gap-3 text-body-sm sm:grid-cols-2">
        <div><dt className="text-muted-foreground">{tr('startedDate')}</dt><dd><time dateTime={result.startedAt}>{new Date(result.startedAt).toLocaleString(language)}</time></dd></div>
        <div><dt className="text-muted-foreground">{tr('completedDate')}</dt><dd><time dateTime={result.completedAt}>{new Date(result.completedAt).toLocaleString(language)}</time></dd></div>
        {result.roleName && <div className="sm:col-span-2"><dt className="text-muted-foreground">{tr('originalRole')}</dt><dd className="break-words">{result.roleName}</dd></div>}
      </dl>
      <Text>{t(`employeeBaseline.reasons.${result.completionReason}`, tr('recordedOutcome'))}</Text>
      {invalidated ? <Text>{tr('invalidatedNotice')}</Text> : <>
        <StatCard title={tr('rawScore')} value={result.rawScore === null ? '—' : `${(result.rawScore * 100).toFixed(1)}%`} description={tr('masteryNotice')} />
        <ul className="grid gap-3 lg:grid-cols-2">{result.skills.map(skill => <li key={skill.microSkillId} className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex flex-wrap justify-between gap-2"><Text className="min-w-0 break-words font-semibold">{skill.microSkillName}</Text><Text>{(skill.mastery * 100).toFixed(1)}%</Text></div>
          <Progress value={skill.mastery * 100} role="progressbar" aria-label={skill.microSkillName} aria-valuemin={0} aria-valuemax={100} aria-valuenow={skill.mastery * 100} />
          <Text variant="caption" className="text-muted-foreground">{tr('confidence')}: {tr(skill.confidence)}</Text>
        </li>)}</ul>
        <Text variant="body-sm" className="text-muted-foreground">{tr('noRetake')}</Text>
      </>}
      {result.replacesAttemptId && <Link className="block text-primary underline" to={attemptPath(result.replacesAttemptId)}>{tr('previousAttempt')}</Link>}
      {result.replacementAttemptId ? <Link className="block text-primary underline" to={attemptPath(result.replacementAttemptId)}>{tr('replacement')}</Link>
        : invalidated && <Button disabled={locked} onClick={() => void run(startCommand(result.occupationId))}>{tr('startReplacement')}</Button>}
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
  return <Card><CardHeader><CardTitle>{tr('history')}</CardTitle></CardHeader><CardContent className="space-y-3">
    {loading ? <LoadingCard label={tr('loading')} /> : error ? <Text role="alert" className="text-destructive">{tr('historyError')}</Text> : items.length === 0 ? <EmptyState bordered={false} title={tr('emptyHistory')} description={tr('historyEmptyHint')}
      action={<Button variant="outline" onClick={() => document.getElementById('baseline-start')?.querySelector('button')?.focus()}>{tr('backToStart')}</Button>} />
      : <ul className="space-y-3">{items.map(item => <li key={item.attemptId} className="space-y-2 rounded-lg border border-border p-4">
        <Link className="break-words font-semibold text-primary underline" to={attemptPath(item.attemptId)}>{item.occupationName}</Link>
        <div className="flex flex-wrap gap-2"><Badge variant="outline" className="max-w-full whitespace-normal">{tr(`scopes.${item.assessmentScope}`)}</Badge><Badge variant={item.state === 'INVALIDATED' ? 'warning' : 'success'}>{tr(item.state)}</Badge></div>
        {item.roleName && <Text variant="body-sm" className="break-words">{tr('originalRole')}: {item.roleName}</Text>}
        <Text variant="caption" className="text-muted-foreground">{tr('completedDate')}: <time dateTime={item.completedAt}>{new Date(item.completedAt).toLocaleString(language)}</time></Text>
      </li>)}</ul>}
    <Button variant="outline" disabled={loading} onClick={() => { setLoading(true); setError(false); setItems([]); setReload(value => value + 1) }}>{tr('refresh')}</Button>
  </CardContent></Card>
}
