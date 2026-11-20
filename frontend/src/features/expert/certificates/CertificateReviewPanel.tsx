import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, Eye, RefreshCw } from 'lucide-react'
import { certificateFilePath, prepareCertificateDecision, readCertificateReview, readCertificateReviewQueue, sendCertificateSubmission } from '../../../shared/api/certificates'
import { PathwayError, type PendingPathwayCommand } from '../../../shared/api/initialPathway'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { InitialPathwayFeedback } from '../../../shared/components/InitialPathwayFeedback'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { ManagementDialog as Dialog, ManagementSection, ManagementTable, CursorPagination } from '../../../shared/components/ui/ManagementUi'
import { Combobox } from '../../../shared/components/ui/Combobox'
import { Input } from '../../../shared/components/ui/Input'
import { FormField } from '../../../shared/components/ui/FormField'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'

export function CertificateReviewPanel({ scope }: { scope: string }) {
  const { t, language } = useTranslation(), vi = language === 'vi', tr = (key: string) => t('certificates.' + key)
  const [offset, setOffset] = useState(0), [selected, setSelected] = useState<string | null>(null)
  const [status, setStatus] = useState<'PENDING' | 'REVIEWED'>('PENDING')
  const queue = useQuery({ queryKey: ['certificates', scope, 'reviewQueue', status, offset], queryFn: ({ signal }) => readCertificateReviewQueue(offset, signal, status), retry: false, gcTime: 0 })
  return <Card className="overflow-hidden"><CardHeader>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="space-y-1"><CardTitle className="flex items-center gap-2"><Award className="size-4 text-primary" />{tr('reviewQueue')}</CardTitle><CardDescription>{tr('reviewHelp')}</CardDescription></div>
      <div className="flex items-center gap-2"><div className="w-48"><Combobox size="sm" value={status} clearable={false} aria-label={vi ? 'Trạng thái duyệt' : 'Review status'} options={[{ value: 'PENDING', label: vi ? 'Chờ duyệt' : 'Pending review' }, { value: 'REVIEWED', label: vi ? 'Lịch sử duyệt' : 'Review history' }]} onChange={value => { setStatus(value as 'PENDING' | 'REVIEWED'); setOffset(0) }} /></div><Button variant="outline" size="icon" className="size-8" title={t('initialPathway.refresh')} aria-label={t('initialPathway.refresh')} disabled={queue.isFetching} onClick={() => void queue.refetch()}><RefreshCw size={14} /></Button></div>
    </div>
  </CardHeader><CardContent className="space-y-4 p-0">
    {queue.isPending && <LoadingCard label={t('initialPathway.loading')} />}{queue.error && <div className="px-4"><InitialPathwayFeedback error={queue.error} onRetry={() => void queue.refetch()} /></div>}
    {queue.data && <>
      <ManagementTable className="min-w-180"><thead><tr>{[t('initialPathway.reviewUi.employee'), tr('skill'), tr('level'), vi ? 'Trạng thái' : 'Status', status === 'REVIEWED' ? (vi ? 'Ngày xử lý' : 'Reviewed') : (vi ? 'Ngày nộp' : 'Submitted'), t('initialPathway.reviewUi.actions')].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{queue.data.map(item => <tr key={item.id}>
          <th scope="row"><div className="flex items-center gap-2"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs text-primary">{(item.learnerName?.trim() || 'E').split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()}</span>{item.learnerName || (vi ? 'Nhân viên' : 'Employee')}</div></th>
          <td><div className="font-medium">{item.requirement.skillName}</div><div className="mt-1 text-xs text-muted-foreground">{item.certificate.name}</div></td>
          <td>{t('knowledgeLevel.' + item.requirement.knowledgeLevel)}</td><td><Badge variant={item.status === 'APPROVED' ? 'success' : item.status === 'REJECTED' ? 'destructive' : 'warning'}>{tr(item.status.toLowerCase())}</Badge></td>
          <td className="text-xs text-muted-foreground">{new Date(item.decision?.decidedAt ?? item.submittedAt).toLocaleString(language)}</td>
          <td><Button size="icon" variant="outline" className="size-8 text-primary" title={t('initialPathway.reviewUi.review')} aria-label={t('initialPathway.reviewUi.review')} onClick={() => setSelected(item.id)}><Eye size={14} /></Button></td>
        </tr>)}</tbody>
      </ManagementTable>
      {queue.data.length === 0 && <EmptyState title={status === 'PENDING' ? tr('noPending') : (vi ? 'Chưa có lịch sử duyệt.' : 'No reviewed submissions yet.')} />}
      <CursorPagination page={offset / 20} count={queue.data.length} busy={queue.isFetching} locale={language} onPage={page => setOffset(page * 20)} />
    </>}
    {selected && <ReviewEvidence key={scope + ':' + selected} id={selected} scope={scope} onClose={() => setSelected(null)} />}
  </CardContent></Card>
}
function ReviewEvidence({ id, scope, onClose }: { id: string; scope: string; onClose: () => void }) {
  const { t, language } = useTranslation(), tr = (key: string) => t('certificates.' + key), client = useQueryClient(), vi = language === 'vi'
  const detail = useQuery({ queryKey: ['certificates', scope, 'review', id], queryFn: ({ signal }) => readCertificateReview(id, signal), retry: false, gcTime: 0 })
  const [reason, setReason] = useState(''), [pending, setPending] = useState<PendingPathwayCommand | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<PathwayError | null>(null), lock = useRef(false)
  const [confirmation, setConfirmation] = useState<'APPROVED' | 'REJECTED' | null>(null)
  async function decide(command: PendingPathwayCommand) {
    if (lock.current) return
    lock.current = true; setPending(command); setBusy(true); setError(null); setConfirmation(null)
    try {
      const accepted = await sendCertificateSubmission(command)
      client.setQueryData(['certificates', scope, 'review', id], accepted); setPending(null)
      await client.invalidateQueries({ queryKey: ['certificates', scope, 'reviewQueue'] }); await client.invalidateQueries({ queryKey: ['initialPathway', scope] })
    } catch (cause) { const failure = cause instanceof PathwayError ? cause : new PathwayError('NETWORK_ERROR'); setError(failure); if (!failure.ambiguous) { setPending(null); void detail.refetch() } }
    finally { lock.current = false; setBusy(false) }
  }
  const d = detail.data, blocked = busy || Boolean(pending)
  return <>
    <Dialog open size="wide" onOpenChange={open => { if (!open && !blocked) onClose() }} ariaLabel={tr('reviewer')}>
      <DialogHeader><DialogTitle><Award size={18} className="text-primary" />{tr('reviewer')}</DialogTitle><DialogDescription>{tr('reviewHelp')}</DialogDescription></DialogHeader>
      <DialogBody className="space-y-4 pr-1">
        {detail.isPending && <LoadingCard label={t('initialPathway.loading')} />}
        {(error || detail.error) && <InitialPathwayFeedback error={error ?? detail.error} busy={busy} onRetry={() => { if (pending) void decide(pending); else void detail.refetch() }} />}
        {d && <>
          <ManagementSection title={vi ? 'Nhân viên và yêu cầu' : 'Employee & requirement'} aside={<Badge variant={d.status === 'APPROVED' ? 'success' : d.status === 'REJECTED' ? 'destructive' : 'warning'}>{tr(d.status.toLowerCase())}</Badge>}>
            <div className="grid gap-3 sm:grid-cols-2"><div><Text variant="caption">{t('initialPathway.reviewUi.employee')}</Text><Text variant="body-sm" className="font-semibold text-foreground">{d.learnerName || (vi ? 'Nhân viên' : 'Employee')}</Text></div><div><Text variant="caption">Skill · {tr('level')}</Text><Text variant="body-sm" className="font-semibold text-foreground">{d.requirement.skillName} · {t('knowledgeLevel.' + d.requirement.knowledgeLevel)}</Text></div></div>
          </ManagementSection>
          <ManagementSection title={vi ? 'Chứng chỉ yêu cầu' : 'Certificate definition'}><Text className="font-semibold">{d.certificate.name}</Text>{d.certificate.description && <Text variant="body-sm" className="whitespace-pre-wrap break-words">{d.certificate.description}</Text>}<a className="text-body-sm text-primary underline" href={d.certificate.referenceUrl} target="_blank" rel="noopener noreferrer">{t('rulePathway.certificateReference')}</a></ManagementSection>
          <ManagementSection title={vi ? 'Minh chứng đã nộp' : 'Submitted evidence'}>
            {d.link ? <a className="block break-all text-body-sm text-primary underline" href={d.link} target="_blank" rel="noopener noreferrer">{d.link}</a> : <a className={buttonVariants({ variant: 'outline', size: 'sm' })} href={certificateFilePath(d.id, true)}>{tr('download')} · {d.filename}</a>}
            <Text variant="caption">{vi ? 'Ngày nộp' : 'Submitted'}: {new Date(d.submittedAt).toLocaleString(language)}</Text>
          </ManagementSection>
          <ManagementSection title={d.decision ? (vi ? 'Kết quả duyệt' : 'Review decision') : (vi ? 'Nhận xét duyệt' : 'Review notes')}>
            {d.decision ? <><Text variant="body-sm" className="whitespace-pre-wrap break-words">{d.decision.reason}</Text><Text variant="caption">{new Date(d.decision.decidedAt).toLocaleString(language)}</Text></> : <FormField label={tr('reason')}><Input required value={reason} maxLength={4000} disabled={blocked} onChange={event => setReason(event.target.value)} /></FormField>}
          </ManagementSection>
        </>}{pending && <Text role="status">{t('initialPathway.uncertain')}</Text>}
      </DialogBody>
      <DialogFooter><Button variant="outline" disabled={blocked} onClick={onClose}>{vi ? 'Đóng' : 'Close'}</Button>{d?.status === 'PENDING' && <><Button variant="outline" disabled={blocked || !reason.trim()} onClick={() => setConfirmation('REJECTED')}>{tr('reject')}</Button><Button disabled={blocked || !reason.trim()} onClick={() => setConfirmation('APPROVED')}>{tr('approve')}</Button></>}</DialogFooter>
    </Dialog>
    <Dialog open={confirmation !== null} onOpenChange={open => { if (!open && !busy) setConfirmation(null) }} ariaLabel={vi ? 'Xác nhận duyệt minh chứng' : 'Confirm evidence decision'}>
      <DialogHeader><DialogTitle><Award size={18} className="text-primary" />{confirmation === 'APPROVED' ? (vi ? 'Duyệt minh chứng?' : 'Approve evidence?') : (vi ? 'Từ chối minh chứng?' : 'Reject evidence?')}</DialogTitle><DialogDescription>{d?.learnerName} · {d?.requirement.skillName}</DialogDescription></DialogHeader>
      <DialogBody><ManagementSection title={tr('reason')}><Text variant="body-sm" className="whitespace-pre-wrap break-words">{reason}</Text></ManagementSection></DialogBody>
      <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setConfirmation(null)}>{t('initialPathway.cancel')}</Button><Button variant={confirmation === 'REJECTED' ? 'destructive' : 'primary'} disabled={busy || !d || !confirmation || !reason.trim()} onClick={() => { if (d && confirmation) void decide(prepareCertificateDecision(d, confirmation, reason.trim())) }}>{vi ? 'Xác nhận' : 'Confirm'}</Button></DialogFooter>
    </Dialog>
  </>
}
