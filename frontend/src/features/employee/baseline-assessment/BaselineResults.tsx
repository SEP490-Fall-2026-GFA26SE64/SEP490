import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { attemptPath, readHistory, startCommand, type BaselineCommand, type BaselineResult } from './baselineApi'

export function BaselineResultPanel({ result, locked, run }: { result: BaselineResult; locked: boolean; run: (command: BaselineCommand) => Promise<void> }) {
  const { t, language } = useTranslation(), tr = (key: string) => t(`employeeBaseline.${key}`)
  const invalidated = result.state === 'INVALIDATED'
  return <Card>
    <CardHeader><CardTitle>{tr('result')}: {result.occupationName}</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p>{tr(result.state)} · {new Date(result.completedAt).toLocaleString(language)}</p>
      <p>{t(`employeeBaseline.reasons.${result.completionReason}`, tr('recordedOutcome'))}</p>
      <p className="break-words">{tr('originalRole')}: {result.roleName ?? tr('exploration')}</p>
      {invalidated ? <p>{tr('invalidatedNotice')}</p> : <>
        <p>{tr('rawScore')}: {result.rawScore === null ? '—' : `${(result.rawScore * 100).toFixed(1)}%`}</p>
        <p className="text-sm text-muted-foreground">{tr('masteryNotice')}</p>
        <ul className="space-y-3">{result.skills.map(skill => <li key={skill.microSkillId} className="flex flex-wrap justify-between gap-2 rounded-md border border-border p-3 text-sm">
          <span className="break-words">{skill.microSkillName}</span><span>{(skill.mastery * 100).toFixed(1)}% · {tr('confidence')}: {tr(skill.confidence)}</span>
        </li>)}</ul>
        <p className="text-sm text-muted-foreground">{tr('noRetake')}</p>
      </>}
      {result.replacesAttemptId && <Link className="block break-all text-primary underline" to={attemptPath(result.replacesAttemptId)}>{tr('previousAttempt')}</Link>}
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
    {loading ? <p role="status">{tr('loading')}</p> : error ? <p role="alert">{tr('historyError')}</p> : items.length === 0 ? <p>{tr('emptyHistory')}</p>
      : <ul className="space-y-3">{items.map(item => <li key={item.attemptId} className="rounded-md border border-border p-3 text-sm">
        <Link className="break-words text-primary underline" to={attemptPath(item.attemptId)}>{item.occupationName} · {item.roleName ?? tr('exploration')}</Link>
        <p>{tr(item.state)} · {new Date(item.completedAt).toLocaleString(language)}</p>
      </li>)}</ul>}
    <Button variant="outline" disabled={loading} onClick={() => { setLoading(true); setError(false); setReload(value => value + 1) }}>{tr('refresh')}</Button>
  </CardContent></Card>
}
