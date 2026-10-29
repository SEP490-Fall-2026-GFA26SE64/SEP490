import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PathwayError, preparePathwayConfirmation, readRoleGaps, sendPathwayCommand, type PendingPathwayCommand } from '../../../shared/api/initialPathway'
import { useInitialPathwaySession } from '../../../shared/hooks/useInitialPathwaySession'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { InitialGapTable } from '../../../shared/components/InitialGapTable'
import { InitialPathwayFeedback } from '../../../shared/components/InitialPathwayFeedback'
import { Text } from '../../../shared/components/typography/Text'
import { Button } from '../../../shared/components/ui/Button'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { Dialog, DialogBody, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../shared/components/ui/Dialog'
import type { CurrentRole } from './currentRoleFlowApi'
import { RoleLevelPicker } from './RoleLevelPicker'

export function InitialRoleGapDialog({ role, initialLevelId, onClose, onBaseline }: { role: CurrentRole; initialLevelId?: string | null; onClose: () => void; onBaseline: (levelId: string) => void }) {
  const session = useInitialPathwaySession(), { t } = useTranslation()
  if (!session.scope) return <Dialog open size="wide" onOpenChange={open => { if (!open) onClose() }} ariaLabel={t('initialPathway.gapTitle')}>
    <DialogHeader><DialogTitle>{t('initialPathway.gapTitle')}</DialogTitle></DialogHeader>
    {session.isError ? <InitialPathwayFeedback error={session.error} onRetry={() => void session.refetch()} /> : <LoadingCard label={t('initialPathway.loading')} />}
  </Dialog>
  return <GapDialog key={session.scope + ':' + role.id + ':' + (initialLevelId ?? '')} role={role} initialLevelId={initialLevelId} scope={session.scope} authorized={session.data?.role === 'EMPLOYEE'} onClose={onClose} onBaseline={onBaseline} />
}
function GapDialog({ role, initialLevelId, scope, authorized, onClose, onBaseline }: { role: CurrentRole; initialLevelId?: string | null; scope: string; authorized: boolean; onClose: () => void; onBaseline: (levelId: string) => void }) {
  const { t } = useTranslation(), tr = (key: string) => t('initialPathway.' + key), navigate = useNavigate(), client = useQueryClient()
  const [levelId, setLevelId] = useState(() => role.levels.some(level => level.id === initialLevelId) ? initialLevelId! : '')
  const preview = useQuery({ queryKey: ['initialPathway', scope, 'gap', role.id, levelId], queryFn: ({ signal }) => readRoleGaps(role.id, levelId, signal), enabled: authorized && Boolean(levelId), retry: false, gcTime: 0 })
  const [pending, setPending] = useState<PendingPathwayCommand | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<PathwayError | null>(null)
  const lock = useRef(false), committed = useRef(false)
  const failure = error ?? (!authorized ? new PathwayError('FORBIDDEN', 403) : preview.error)
  async function confirm() {
    if (lock.current || !preview.data || preview.data.roleId !== role.id || preview.data.levelId !== levelId) return
    const command = pending ?? preparePathwayConfirmation(preview.data)
    lock.current = true; setBusy(true); setPending(command); setError(null)
    try {
      if (!committed.current) { await sendPathwayCommand(command); committed.current = true }
      await client.invalidateQueries({ queryKey: ['currentRoleFlow'] })
      await client.invalidateQueries({ queryKey: ['initialPathway', scope] })
      setPending(null); onClose(); navigate('/employee/pathway?view=role')
    } catch (cause) {
      const e = cause instanceof PathwayError ? cause : new PathwayError('NETWORK_ERROR'); setError(e)
      if (!e.ambiguous && !committed.current) { setPending(null); await preview.refetch() }
    } finally { lock.current = false; setBusy(false) }
  }
  const blocked = busy || pending !== null
  return <Dialog open size="wide" onOpenChange={open => { if (!open && !blocked) onClose() }} ariaLabel={tr('gapTitle')} closeLabel={tr('cancel')}>
    <DialogHeader><DialogTitle className="text-section">{tr('gapTitle')}</DialogTitle><DialogDescription className="text-body-sm">{tr('gapDescription')}</DialogDescription></DialogHeader>
    <DialogBody className="grid items-start gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="space-y-4"><Text className="break-words font-semibold">{role.name}</Text>
        <RoleLevelPicker levels={role.levels} value={levelId} disabled={blocked || !authorized} onChange={value => { setLevelId(value); setError(null) }} />
      </div>
      <div className="min-w-0 space-y-4">
      {authorized && levelId && preview.isPending && <LoadingCard label={tr('loading')} />}
      {failure && <InitialPathwayFeedback error={failure} busy={busy || preview.isFetching} onRetry={() => { if (pending) void confirm(); else void preview.refetch() }} />}
      {preview.data && !preview.isError && <><Text className="break-words font-semibold">{preview.data.roleName} · {preview.data.levelName}</Text><InitialGapTable result={preview.data.result} />
        {preview.data.result.need === 'NO_LEARNING_REQUIRED' && <Text>{tr('noLearningHelp')}</Text>}</>}
      {pending && <Text role="status">{tr('uncertain')}</Text>}
      </div>
    </DialogBody>
    <DialogFooter><Button variant="outline" disabled={blocked} onClick={onClose}>{tr('cancel')}</Button>
      {failure instanceof PathwayError && failure.code === 'BASELINE_REQUIRED' && <Button disabled={blocked || !levelId} onClick={() => onBaseline(levelId)}>{tr('chooseBaseline')}</Button>}
      {preview.data && !preview.isError && <Button className="h-auto min-h-10 whitespace-normal [&>span]:whitespace-normal" isLoading={busy} disabled={!authorized || preview.isFetching} onClick={() => void confirm()}>{tr(pending ? 'retryExact' : preview.data.result.need === 'NO_LEARNING_REQUIRED' ? 'confirmNoGap' : 'confirm')}</Button>}
    </DialogFooter>
  </Dialog>
}
