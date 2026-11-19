import { useContext, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Send } from 'lucide-react'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Badge } from '../../../shared/components/ui/Badge'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { readRulePathway, rulePathwaysEnabled } from '../../../shared/api/requirementPathway'
import { readRoleFlow, type RoleFlowView } from './currentRoleFlowApi'
import { InitialRoleGapDialog } from './InitialRoleGapDialog'

/** Entry to the existing server preview/confirmation; never submits a request on mount. */
export function RolePathwayRequest({ view, selectionId, disabled = false }: { view?: RoleFlowView; selectionId?: string; disabled?: boolean }) {
  const identity = useContext(WorkspaceSessionContext)?.identity
  const { t, language } = useTranslation(), navigate = useNavigate(), client = useQueryClient(), [open, setOpen] = useState(false)
  const scope = `${identity?.organizationId ?? ''}:${identity?.accountId ?? ''}:${identity?.roles?.join(',') ?? ''}`
  const current = useQuery({ queryKey: ['currentRoleFlow', scope], queryFn: ({ signal }) => readRoleFlow(signal), enabled: rulePathwaysEnabled && !view && Boolean(identity), retry: false })
  const data = view ?? current.data, selection = data?.selection
  const pathway = useQuery({ queryKey: ['initialPathway', scope, 'ruleEmployee', null], queryFn: ({ signal }) => readRulePathway(null, signal), enabled: rulePathwaysEnabled && Boolean(identity && selection), retry: false, staleTime: 0, refetchOnWindowFocus: true,
    refetchInterval: query => query.state.error ? false : query.state.data && !query.state.data.targetReleased ? 15_000 : 30_000 })
  const saved = pathway.data
  const pathwayStamp = saved ? [saved.requestId, saved.revision, saved.reviewStatus, saved.targetReleased].join(':') : ''
  useEffect(() => { if (pathwayStamp) void client.invalidateQueries({ queryKey: ['currentRoleFlow', scope] }) }, [client, scope, pathwayStamp])
  if (!rulePathwaysEnabled) return null
  if (!view && current.isError) return <div className="flex flex-wrap items-center gap-2"><Text variant="caption" role="alert">{t('roleFlow.statusError')}</Text><Button size="sm" variant="outline" onClick={() => void current.refetch()}>{t('roleFlow.retry')}</Button></div>
  if (!selection?.available || !selection.levelId || selectionId && selectionId !== selection.selectionId) return null
  if (pathway.isPending) return <Text variant="caption" role="status">{t('initialPathway.loading')}</Text>
  if (pathway.isError || saved && (saved.archived || saved.selectionId !== selection.selectionId || saved.selectionRevision !== selection.revision || saved.roleId !== selection.role.id || saved.levelId !== selection.levelId)) return <div className="flex flex-wrap items-center gap-2"><Text variant="caption" role="alert">{t('roleFlow.statusError')}</Text><Button size="sm" variant="outline" onClick={() => { void pathway.refetch(); void client.invalidateQueries({ queryKey: ['currentRoleFlow', scope] }) }}>{t('roleFlow.retry')}</Button></div>
  if (saved) {
    const status = ['APPROVED', 'AWAITING_EXPERT_REVIEW', 'REJECTED'].includes(saved.reviewStatus) ? saved.reviewStatus : saved.generationStatus
    return <div className="flex flex-wrap items-center gap-2"><Badge variant={status === 'APPROVED' ? 'success' : 'warning'}>{t('initialPathway.state.' + status, status)}</Badge><Link className={buttonVariants({ variant: 'primary', size: 'sm', className: disabled ? 'pointer-events-none opacity-50' : '' })} aria-disabled={disabled || undefined} tabIndex={disabled ? -1 : undefined} to="/employee/pathway?view=role">{status === 'APPROVED' && !saved.targetReleased ? language === 'vi' ? 'Tiếp tục lộ trình' : 'Continue pathway' : t('roleFlow.viewPathway')}</Link></div>
  }
  if (!['COMPLETE', 'BASELINE_NOT_REQUIRED'].includes(data!.progress.state)) return null
  return <>
    <Button variant="primary" size="sm" className="shrink-0 gap-1 font-semibold" leftIcon={<Send size={14} aria-hidden="true" />} disabled={disabled} onClick={() => setOpen(true)}>{t('rulePathway.request')}</Button>
    {open && <InitialRoleGapDialog requestOnly role={selection.role} initialLevelId={selection.levelId} onClose={() => setOpen(false)} onBaseline={() => { setOpen(false); navigate('/employee/upskilling?tab=roles') }} />}
  </>
}
