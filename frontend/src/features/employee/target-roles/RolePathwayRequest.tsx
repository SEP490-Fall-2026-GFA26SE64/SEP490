import { useContext, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Send } from 'lucide-react'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { Button } from '../../../shared/components/ui/Button'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { rulePathwaysEnabled } from '../../../shared/api/requirementPathway'
import { readRoleFlow, type RoleFlowView } from './currentRoleFlowApi'
import { InitialRoleGapDialog } from './InitialRoleGapDialog'

/** Entry to the existing server preview/confirmation; never submits a request on mount. */
export function RolePathwayRequest({ view, selectionId, disabled = false }: { view?: RoleFlowView; selectionId?: string; disabled?: boolean }) {
  const identity = useContext(WorkspaceSessionContext)?.identity
  const { t } = useTranslation(), navigate = useNavigate(), [open, setOpen] = useState(false)
  const scope = `${identity?.organizationId ?? ''}:${identity?.accountId ?? ''}:${identity?.roles?.join(',') ?? ''}`
  const current = useQuery({ queryKey: ['currentRoleFlow', scope], queryFn: ({ signal }) => readRoleFlow(signal), enabled: rulePathwaysEnabled && !view && Boolean(identity), retry: false })
  const data = view ?? current.data, selection = data?.selection
  if (!rulePathwaysEnabled) return null
  if (!view && current.isError) return <div className="flex flex-wrap items-center gap-2"><Text variant="caption" role="alert">{t('roleFlow.statusError')}</Text><Button size="sm" variant="outline" onClick={() => void current.refetch()}>{t('roleFlow.retry')}</Button></div>
  if (!selection?.available || !selection.levelId || selectionId && selectionId !== selection.selectionId
    || !['COMPLETE', 'BASELINE_NOT_REQUIRED'].includes(data!.progress.state)) return null
  return <>
    <Button variant="primary" size="sm" className="shrink-0 gap-1 font-semibold" leftIcon={<Send size={14} aria-hidden="true" />} disabled={disabled} onClick={() => setOpen(true)}>{t('rulePathway.request')}</Button>
    {open && <InitialRoleGapDialog requestOnly role={selection.role} initialLevelId={selection.levelId} onClose={() => setOpen(false)} onBaseline={() => { setOpen(false); navigate('/employee/upskilling?tab=roles') }} />}
  </>
}
