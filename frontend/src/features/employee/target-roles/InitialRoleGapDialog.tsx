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
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../shared/components/ui/Dialog'
import type { CurrentRole } from './currentRoleFlowApi'
import { RoleLevelPicker } from './RoleLevelPicker'

export function InitialRoleGapDialog({ role, onClose, onBaseline }: { role: CurrentRole; onClose: () => void; onBaseline: (levelId: string) => void }) {
  const session = useInitialPathwaySession(), { t } = useTranslation()
  if (!session.scope) return <Dialog open onOpenChange={open => { if (!open) onClose() }} ariaLabel={t('initialPathway.gapTitle')}>
    <DialogHeader><DialogTitle>{t('initialPathway.gapTitle')}</DialogTitle></DialogHeader>
    {session.isError ? <InitialPathwayFeedback error={session.error} onRetry={() => void session.refetch()} /> : <LoadingCard label={t('initialPathway.loading')} />}
  </Dialog>
  return <GapDialog key={session.scope + ':' + role.id} role={role} scope={session.scope} authorized={session.data?.role === 'EMPLOYEE'} onClose={onClose} onBaseline={onBaseline} />
}
function GapDialog({ role, scope, authorized, onClose, onBaseline }: { role: CurrentRole; scope: string; authorized: boolean; onClose: () => void; onBaseline: (levelId: string) => void }) {
  const { t } = useTranslation(), tr = (key: string) => t('initialPathway.' + key), navigate = useNavigate(), client = useQueryClient()
  const [levelId, setLevelId] = useState('')
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
      setPending(null); onClose(); navigate('/employee/pathway')
    } catch (cause) {
      const e = cause instanceof PathwayError ? cause : new PathwayError('NETWORK_ERROR'); setError(e)
      if (!e.ambiguous && !committed.current) { setPending(null); await preview.refetch() }
    } finally { lock.current = false; setBusy(false) }
  }
  const blocked = busy || pending !== null
  return <Dialog open onOpenChange={open => { if (!open && !blocked) onClose() }} ariaLabel={tr('gapTitle')} closeLabel={tr('cancel')} className="max-w-3xl">
    <DialogHeader><DialogTitle>{tr('gapTitle')}</DialogTitle><DialogDescription>{tr('gapDescription')}</DialogDescription></DialogHeader>
    <div className="min-h-0 space-y-4 overflow-y-auto">
      <Text className="break-words font-semibold">{role.name}</Text>
      <RoleLevelPicker levels={role.levels} value={levelId} disabled={blocked || !authorized} onChange={value => { setLevelId(value); setError(null) }} />
      {authorized && levelId && preview.isPending && <LoadingCard label={tr('loading')} />}
      {failure && <InitialPathwayFeedback error={failure} busy={busy || preview.isFetching} onRetry={() => { if (pending) void confirm(); else void preview.refetch() }} />}
      {preview.data && !preview.isError && <><Text className="break-words font-semibold">{preview.data.roleName} · {preview.data.levelName}</Text><InitialGapTable result={preview.data.result} />
        {preview.data.result.need === 'NO_LEARNING_REQUIRED' && <Text>{tr('noLearningHelp')}</Text>}</>}
      {pending && <Text role="status">{tr('uncertain')}</Text>}
    </div>
    <DialogFooter><Button variant="outline" disabled={blocked} onClick={onClose}>{tr('cancel')}</Button>
      {failure instanceof PathwayError && failure.code === 'BASELINE_REQUIRED' && <Button disabled={blocked || !levelId} onClick={() => onBaseline(levelId)}>{tr('chooseBaseline')}</Button>}
      {preview.data && !preview.isError && <Button isLoading={busy} disabled={!authorized || preview.isFetching} onClick={() => void confirm()}>{tr(pending ? 'retryExact' : preview.data.result.need === 'NO_LEARNING_REQUIRED' ? 'confirmNoGap' : 'confirm')}</Button>}
    </DialogFooter>
  </Dialog>
}
