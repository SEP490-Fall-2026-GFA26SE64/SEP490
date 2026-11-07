import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { readRulePreview, ruleConfirmation } from '../../../shared/api/requirementPathway'
import { PathwayError, sendPathwayCommand, type PendingPathwayCommand } from '../../../shared/api/initialPathway'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { InitialPathwayFeedback } from '../../../shared/components/InitialPathwayFeedback'
import { Text } from '../../../shared/components/typography/Text'
import { Button } from '../../../shared/components/ui/Button'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { Dialog, DialogBody, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../shared/components/ui/Dialog'
import type { CurrentRole } from './currentRoleFlowApi'
import { RoleLevelPicker } from './RoleLevelPicker'
import { Send, Target, ListChecks } from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Heading } from '../../../shared/components/typography/Heading'

export function RequirementGapDialog({ role, initialLevelId, scope, authorized, onClose, onBaseline, fixedLevel = false }: { role: CurrentRole; initialLevelId?: string | null; scope: string; authorized: boolean; onClose: () => void; onBaseline: (levelId: string) => void; fixedLevel?: boolean }) {
  const { t } = useTranslation(), navigate = useNavigate(), client = useQueryClient()
  const [levelId, setLevelId] = useState(initialLevelId ?? ''), [pending, setPending] = useState<PendingPathwayCommand | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState<PathwayError | null>(null), lock = useRef(false), committed = useRef(false)
  const selected = Boolean(initialLevelId && levelId === initialLevelId)
  const query = useQuery({ queryKey: ['initialPathway', scope, 'rulePreview', role.id, levelId], queryFn: ({ signal }) => readRulePreview(role.id, levelId, signal), enabled: authorized && selected, retry: false, gcTime: 0 })
  async function confirm() {
    if (lock.current || !query.data) return
    const command = pending ?? ruleConfirmation(query.data); setPending(command); setBusy(true); setError(null); lock.current = true
    try {
      if (!committed.current) { await sendPathwayCommand(command); committed.current = true }
      await client.invalidateQueries({ queryKey: ['initialPathway', scope] }); await client.invalidateQueries({ queryKey: ['currentRoleFlow'] })
      setPending(null); onClose(); navigate('/employee/pathway?view=role')
    } catch (cause) { const failure = cause instanceof PathwayError ? cause : new PathwayError('NETWORK_ERROR'); setError(failure); if (!failure.ambiguous && !committed.current) { setPending(null); void query.refetch() } }
    finally { lock.current = false; setBusy(false) }
  }
  const blocked = busy || pending !== null, level = role.levels.find(item => item.id === levelId)
  useEffect(() => {
    if (!pending) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn)
  }, [pending])
  return <Dialog open size="wide" className={fixedLevel ? 'max-w-2xl border-primary/20' : 'border-primary/20'} onOpenChange={open => { if (!open && !blocked) onClose() }} ariaLabel={t(fixedLevel ? 'rulePathway.request' : 'initialPathway.gapTitle')}>
    <DialogHeader className="-mx-6 -mt-6 border-b border-primary/20 bg-secondary/50 px-6 py-5 pr-14 sm:-mx-7 sm:-mt-7 sm:px-7 sm:pr-14"><DialogTitle><Send size={20} className="shrink-0 text-primary" aria-hidden="true" />{t(fixedLevel ? 'rulePathway.request' : 'initialPathway.gapTitle')}</DialogTitle><DialogDescription className="text-body-sm">{t(fixedLevel ? 'rulePathway.requestHelp' : 'rulePathway.previewHelp')}</DialogDescription></DialogHeader>
    <DialogBody className={fixedLevel ? 'space-y-4' : 'grid items-start gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]'}>{!fixedLevel && <div className="space-y-4"><Text className="break-words font-semibold">{role.name}</Text><RoleLevelPicker levels={role.levels} value={levelId} disabled={blocked || !authorized} onChange={value => { setLevelId(value); setError(null) }} /></div>}<div className="min-w-0 space-y-4">
      {selected && query.isPending && <LoadingCard label={t('initialPathway.loading')} />}
      {(error || query.error || !authorized) && <InitialPathwayFeedback error={error ?? query.error ?? new PathwayError('FORBIDDEN', 403)} onRetry={() => { if (pending) void confirm(); else void query.refetch() }} />}
      {!selected && levelId && <Text>{t('roleFlow.selectFirst')}</Text>}
      {query.data && <>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-secondary/20 p-3">
          <Heading level={3} size="card" className="flex min-w-0 items-center gap-2"><Target size={17} className="shrink-0 text-primary" aria-hidden="true" /><span className="break-words">{role.name}</span></Heading><Badge variant="secondary" className="border border-primary/20">{level?.name}</Badge>
        </div>
        {query.data.required.length === 0 ? <Text>{t('rulePathway.noRequirements')}</Text> : <section className="overflow-hidden rounded-xl border border-border">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-3"><Heading level={3} size="card" className="flex items-center gap-2"><ListChecks size={17} className="text-primary" aria-hidden="true" />{t('rulePathway.required')}</Heading><Badge variant="outline" className="border-primary/20 bg-card text-primary">{query.data.required.length}</Badge></div>
          <div className="overflow-x-auto scrollbar-hidden"><table className="w-full text-left text-body-sm"><thead className="border-b border-border bg-muted/20 text-muted-foreground"><tr><th scope="col" className="px-4 py-2.5 font-semibold">{t('initialPathway.skill')}</th><th scope="col" className="px-4 py-2.5 font-semibold">{t('baselineWizard.knowledgeLevel')}</th></tr></thead><tbody className="divide-y divide-border">{query.data.required.map(item => <tr key={item.skillId + ':' + item.knowledgeLevel} className="even:bg-background/60"><th scope="row" className="px-4 py-3 font-medium">{item.skillName}</th><td className="px-4 py-3"><Badge variant="secondary" className="border border-primary/20">{t('knowledgeLevel.' + item.knowledgeLevel)}</Badge></td></tr>)}</tbody></table></div>
        </section>}
        {query.data.baselineRequired && <Text>{t('rulePathway.baselineRequired')}</Text>}{query.data.parallelCount > 0 && <Text variant="body-sm">{t('rulePathway.parallel')}: {query.data.parallelCount} · {t('rulePathway.parallelHelp')}</Text>}
      </>}
      {pending && <Text role="status">{t('initialPathway.uncertain')}</Text>}
    </div></DialogBody><DialogFooter className="border-primary/20"><Button size="sm" variant="outline" disabled={blocked} onClick={onClose}>{t('initialPathway.cancel')}</Button>
      {authorized && levelId && (!selected || query.data?.baselineRequired) && <Button disabled={blocked} onClick={() => onBaseline(levelId)}>{t(selected ? 'initialPathway.chooseBaseline' : 'roleFlow.choose')}</Button>}
      {query.data && !query.data.baselineRequired && <Button size="sm" className="font-semibold" leftIcon={<Send size={14} aria-hidden="true" />} isLoading={busy} disabled={!authorized || query.isFetching || Boolean(pending && !error)} onClick={() => void confirm()}>{t(pending ? 'initialPathway.retryExact' : fixedLevel ? query.data.required.length === 0 ? 'rulePathway.confirmNoLearning' : 'rulePathway.sendRequest' : 'initialPathway.confirm')}</Button>}
    </DialogFooter>
  </Dialog>
}
