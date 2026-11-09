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
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { Input } from '../../../shared/components/ui/Input'
import { FormField } from '../../../shared/components/ui/FormField'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'

export function CertificateReviewPanel({ scope }: { scope: string }) {
  const { t, language } = useTranslation(), vi = language === 'vi', tr = (key: string) => t('certificates.' + key)
  const [offset, setOffset] = useState(0), [selected, setSelected] = useState<string | null>(null)
  const [status, setStatus] = useState<'PENDING' | 'REVIEWED'>('PENDING')
  const queue = useQuery({ queryKey: ['certificates', scope, 'reviewQueue', status, offset], queryFn: ({ signal }) => readCertificateReviewQueue(offset, signal, status), retry: false, gcTime: 0 })
  return <Card className="overflow-hidden border-primary/20"><CardHeader className="border-b border-border bg-secondary/30">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="space-y-1"><CardTitle className="flex items-center gap-2"><span className="rounded-lg bg-secondary p-2 text-primary"><Award className="size-4" /></span>{tr('reviewQueue')}</CardTitle><CardDescription>{tr('reviewHelp')}</CardDescription></div><Button variant="outline" size="icon" aria-label={t('initialPathway.refresh')} disabled={queue.isFetching} onClick={() => void queue.refetch()}><RefreshCw className="size-4" /></Button></div>
    <div className="flex flex-wrap gap-2 pt-3">{(['PENDING', 'REVIEWED'] as const).map(value => <Button key={value} variant={status === value ? 'primary' : 'outline'} size="sm" aria-pressed={status === value} onClick={() => { setStatus(value); setOffset(0) }}>{value === 'PENDING' ? (vi ? 'Chờ duyệt' : 'Pending review') : (vi ? 'Lịch sử duyệt' : 'Review history')}</Button>)}</div>
  </CardHeader><CardContent className="space-y-4 pt-5">
    {queue.isPending && <LoadingCard label={t('initialPathway.loading')} />}{queue.error && <InitialPathwayFeedback error={queue.error} onRetry={() => void queue.refetch()} />}
    {queue.data && <><div className="overflow-x-auto scrollbar-hidden"><table className="w-full min-w-140 text-left text-body-sm"><thead className="border-y border-border bg-muted/40"><tr>{[t('initialPathway.reviewUi.employee'), tr('skill'), tr('level'), vi ? 'Trạng thái' : 'Status', status === 'REVIEWED' ? (vi ? 'Ngày xử lý' : 'Reviewed') : (vi ? 'Ngày nộp' : 'Submitted'), t('initialPathway.reviewUi.actions')].map(label => <th key={label} scope="col" className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{queue.data.map(item => <tr key={item.id} className="hover:bg-secondary/20"><th scope="row" className="px-4 py-4 font-semibold"><div className="flex items-center gap-2.5"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">{(item.learnerName?.trim() || 'E').split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()}</span>{item.learnerName || (vi ? 'Nhân viên' : 'Employee')}</div></th><td className="px-4 py-4"><div className="font-medium">{item.requirement.skillName}</div><div className="mt-1 text-xs text-muted-foreground">{item.certificate.name}</div></td><td className="px-4 py-4">{t('knowledgeLevel.' + item.requirement.knowledgeLevel)}</td><td className="px-4 py-4"><Badge variant={item.status === 'APPROVED' ? 'success' : item.status === 'REJECTED' ? 'destructive' : 'warning'}>{tr(item.status.toLowerCase())}</Badge></td><td className="px-4 py-4 text-xs text-muted-foreground">{new Date(item.decision?.decidedAt ?? item.submittedAt).toLocaleString(language)}</td><td className="px-4 py-4"><Button size="sm" variant={status === 'PENDING' ? 'secondary' : 'outline'} onClick={() => setSelected(item.id)}><Eye className="size-4" />{status === 'PENDING' ? t('initialPathway.reviewUi.review') : (vi ? 'Xem chi tiết' : 'View details')}</Button></td></tr>)}</tbody></table></div>{queue.data.length === 0 && <EmptyState title={status === 'PENDING' ? tr('noPending') : (vi ? 'Chưa có lịch sử duyệt.' : 'No reviewed submissions yet.')} />}<div className="flex justify-between gap-3"><Button size="sm" variant="outline" disabled={!offset || queue.isFetching} onClick={() => setOffset(value => Math.max(0, value - 20))}>{t('initialPathway.previous')}</Button><Button size="sm" variant="outline" disabled={queue.data.length < 20 || queue.isFetching} onClick={() => setOffset(value => value + 20)}>{t('initialPathway.next')}</Button></div></>}
    {selected && <ReviewEvidence key={scope + ':' + selected} id={selected} scope={scope} onClose={() => setSelected(null)} />}
  </CardContent></Card>
}
function ReviewEvidence({ id, scope, onClose }: { id: string; scope: string; onClose: () => void }) {
  const { t, language } = useTranslation(), tr = (key: string) => t('certificates.' + key), client = useQueryClient()
  const detail = useQuery({ queryKey: ['certificates', scope, 'review', id], queryFn: ({ signal }) => readCertificateReview(id, signal), retry: false, gcTime: 0 })
  const [reason, setReason] = useState(''), [pending, setPending] = useState<PendingPathwayCommand | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<PathwayError | null>(null), lock = useRef(false)
  async function decide(command: PendingPathwayCommand) {
    if (lock.current) return
    lock.current = true; setPending(command); setBusy(true); setError(null)
    try {
      const accepted = await sendCertificateSubmission(command)
      client.setQueryData(['certificates', scope, 'review', id], accepted); setPending(null)
      await client.invalidateQueries({ queryKey: ['certificates', scope, 'reviewQueue'] }); await client.invalidateQueries({ queryKey: ['initialPathway', scope] })
    } catch (cause) { const failure = cause instanceof PathwayError ? cause : new PathwayError('NETWORK_ERROR'); setError(failure); if (!failure.ambiguous) { setPending(null); void detail.refetch() } }
    finally { lock.current = false; setBusy(false) }
  }
  const d = detail.data, blocked = busy || Boolean(pending)
  return <Dialog open size="wide" onOpenChange={open => { if (!open && !blocked) onClose() }} ariaLabel={tr('reviewer')}><DialogHeader><DialogTitle>{tr('reviewer')}</DialogTitle><DialogDescription>{tr('reviewHelp')}</DialogDescription></DialogHeader><DialogBody className="space-y-4">
    {detail.isPending && <LoadingCard label={t('initialPathway.loading')} />}{(error || detail.error) && <InitialPathwayFeedback error={error ?? detail.error} busy={busy} onRetry={() => { if (pending) void decide(pending); else void detail.refetch() }} />}
    {d && <><Text className="font-semibold">{d.requirement.skillName} · {t('knowledgeLevel.' + d.requirement.knowledgeLevel)}</Text><Text>{d.certificate.name}</Text><Text variant="caption">{t('initialPathway.reviewUi.employee')}: {d.learnerName || (language === 'vi' ? 'Nhân viên' : 'Employee')}</Text><Badge variant={d.status === 'APPROVED' ? 'success' : d.status === 'REJECTED' ? 'destructive' : 'warning'}>{tr(d.status.toLowerCase())}</Badge><a className="block text-body-sm text-primary underline" href={d.certificate.referenceUrl} target="_blank" rel="noopener noreferrer">{t('rulePathway.certificateReference')}</a><Text variant="body-sm">{t('rulePathway.outcomes')}: {d.requirement.outcomeCodes.join(', ')}</Text>
      {d.link ? <a className="block break-all text-body-sm text-primary underline" href={d.link} target="_blank" rel="noopener noreferrer">{d.link}</a> : <a className={buttonVariants({ variant: 'outline', size: 'sm' })} href={certificateFilePath(d.id, true)}>{tr('download')} · {d.filename}</a>}
      {d.decision ? <div className="space-y-2 rounded-xl border border-primary/25 bg-secondary/30 p-4"><Text>{d.decision.reason}</Text><Text variant="caption">{new Date(d.decision.decidedAt).toLocaleString(language)}</Text></div> : <FormField label={tr('reason')}><Input required value={reason} maxLength={4000} disabled={blocked} onChange={event => setReason(event.target.value)} /></FormField>}
    </>}{pending && <Text role="status">{t('initialPathway.uncertain')}</Text>}
  </DialogBody><DialogFooter><Button variant="outline" disabled={blocked} onClick={onClose}>{t('initialPathway.cancel')}</Button>{d?.status === 'PENDING' && <><Button variant="outline" disabled={blocked || !reason.trim()} onClick={() => void decide(prepareCertificateDecision(d, 'REJECTED', reason.trim()))}>{tr('reject')}</Button><Button disabled={blocked || !reason.trim()} onClick={() => void decide(prepareCertificateDecision(d, 'APPROVED', reason.trim()))}>{tr('approve')}</Button></>}</DialogFooter></Dialog>
}
