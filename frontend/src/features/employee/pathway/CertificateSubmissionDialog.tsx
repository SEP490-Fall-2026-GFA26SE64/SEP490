import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { certificateFilePath, prepareCertificateSubmission, readCertificateHistory, sendCertificateSubmission, uploadCertificate, type PendingCertificateUpload } from '../../../shared/api/certificates'
import { PathwayError, type PendingPathwayCommand } from '../../../shared/api/initialPathway'
import type { RulePathway, RuleStep } from '../../../shared/api/requirementPathway'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { InitialPathwayFeedback } from '../../../shared/components/InitialPathwayFeedback'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { Input } from '../../../shared/components/ui/Input'
import { FormField } from '../../../shared/components/ui/FormField'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'

export function CertificateSubmissionDialog({ scope, pathway, step, onClose }: { scope: string; pathway: RulePathway; step: RuleStep; onClose: () => void }) {
  const { t, language } = useTranslation(), tr = (key: string) => t('certificates.' + key), client = useQueryClient()
  const [snapshot, setSnapshot] = useState({ pathway, step }), expected = { revision: snapshot.pathway.revision ?? 0, contentHash: snapshot.pathway.contentHash ?? '', stepId: snapshot.step.id }
  const [offset, setOffset] = useState(0), [mode, setMode] = useState('link'), [link, setLink] = useState(''), [file, setFile] = useState<File | null>(null), [assetId, setAssetId] = useState<string | null>(null)
  const [pendingUpload, setPendingUpload] = useState<PendingCertificateUpload | null>(null), [pendingSubmit, setPendingSubmit] = useState<PendingPathwayCommand | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState<PathwayError | null>(null), [invalid, setInvalid] = useState<string | null>(null), [submitted, setSubmitted] = useState(false), lock = useRef(false)
  const history = useQuery({ queryKey: ['certificates', scope, 'own', pathway.requestId, step.id, offset], queryFn: ({ signal }) => readCertificateHistory(pathway.requestId, step.id, offset, signal), retry: false, gcTime: 0, refetchInterval: query => offset === 0 && query.state.data?.[0]?.status === 'PENDING' && !query.state.error ? 5000 : false })
  const latest = offset === 0 ? history.data?.[0] : null, blocked = busy || Boolean(pendingUpload || pendingSubmit), canSubmit = offset === 0 && history.isSuccess && !history.isFetching && latest?.status !== 'PENDING' && latest?.status !== 'APPROVED' && !pathway.archived && step.state !== 'FULFILLED' && !submitted
  async function submit() {
    if (lock.current || !canSubmit && !pendingUpload && !pendingSubmit) return
    lock.current = true; setBusy(true); setError(null); setInvalid(null)
    try {
      let command = pendingSubmit
      if (!command) {
        let uploaded = assetId, normalizedLink: string | null = null
        if (mode === 'link') {
          try { const url = new URL(link); if (url.protocol !== 'https:' || url.username || url.password || /\s/.test(link) || link.length > 2048) throw Error(); normalizedLink = url.href }
          catch { setInvalid('invalid'); return }
        } else if (!uploaded) {
          if (!file || file.size < 1 || file.size > 10485760 || !/\.(pdf|png|jpe?g)$/i.test(file.name)) { setInvalid('invalidFile'); return }
          let upload = pendingUpload
          if (!upload) {
            const bytes = await file.arrayBuffer(), digest = await crypto.subtle.digest('SHA-256', bytes), sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
            upload = { requestId: pathway.requestId, expected, file, sha256, key: crypto.randomUUID() }; setPendingUpload(upload)
          }
          const accepted = await uploadCertificate(upload); uploaded = accepted.assetId; setAssetId(uploaded); setPendingUpload(null)
        }
        command = prepareCertificateSubmission(pathway.requestId, expected, normalizedLink, mode === 'file' ? uploaded : null, latest?.status === 'REJECTED' ? latest.id : null)
        setPendingSubmit(command)
      }
      const accepted = await sendCertificateSubmission(command)
      setPendingSubmit(null); setSubmitted(true)
      client.setQueryData(['certificates', scope, 'own', pathway.requestId, step.id, 0], [accepted, ...(history.data ?? []).filter(item => item.id !== accepted.id)].slice(0, 20))
      await client.invalidateQueries({ queryKey: ['initialPathway', scope] })
    } catch (cause) {
      const failure = cause instanceof PathwayError ? cause : new PathwayError('NETWORK_ERROR'); setError(failure)
      if (!failure.ambiguous) { setPendingUpload(null); setPendingSubmit(null); void history.refetch() }
    } finally { lock.current = false; setBusy(false) }
  }
  return <Dialog open size="wide" onOpenChange={open => { if (!open && !blocked) onClose() }} ariaLabel={tr('submit')}><DialogHeader><DialogTitle>{snapshot.step.requirement.skillName} · {t('knowledgeLevel.' + snapshot.step.requirement.knowledgeLevel)}</DialogTitle><DialogDescription>{tr('evidenceHelp')}</DialogDescription></DialogHeader><DialogBody className="space-y-5">
    <Text className="font-semibold">{snapshot.step.certificate?.name}</Text>{snapshot.step.certificate && <a href={snapshot.step.certificate.referenceUrl} target="_blank" rel="noopener noreferrer" className="block w-fit rounded-lg border border-primary/25 bg-secondary/50 px-3 py-2 text-body-sm font-medium text-primary underline underline-offset-4">{t('rulePathway.certificateReference')}</a>}
    {history.isPending && <LoadingCard label={t('initialPathway.loading')} />}{(error || history.error) && <InitialPathwayFeedback error={error ?? history.error} busy={busy} onRetry={() => { if (pendingUpload || pendingSubmit) void submit(); else void history.refetch() }} />}
    {error && ['STALE_PATHWAY_REVISION', 'CERTIFICATE_PROVISION_CHANGED'].includes(error.code) && !blocked && <Button variant="outline" onClick={() => { setSnapshot({ pathway, step }); setError(null); setInvalid(null) }}>{t('initialPathway.refresh')}</Button>}
    {canSubmit && <Tabs value={mode} onValueChange={value => { if (!blocked) { setMode(value); setLink(''); setFile(null); setAssetId(null); setInvalid(null) } }}><TabsList><TabsTrigger value="link" disabled={blocked}>{tr('link')}</TabsTrigger><TabsTrigger value="file" disabled={blocked}>{tr('file')}</TabsTrigger></TabsList><TabsContent value="link" className="space-y-2"><FormField label={tr('evidenceLink')}><Input type="url" maxLength={2048} value={link} disabled={blocked} onChange={event => setLink(event.target.value)} /></FormField></TabsContent><TabsContent value="file" className="space-y-2"><FormField label={tr('file')}><Input type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={blocked} onChange={event => { setFile(event.target.files?.[0] ?? null); setAssetId(null) }} /></FormField>{file && <Text variant="caption">{file.name} · {(file.size / 1048576).toLocaleString(language, { maximumFractionDigits: 2 })} MiB</Text>}</TabsContent></Tabs>}
    {invalid && <Text role="alert" className="text-destructive">{tr(invalid)}</Text>}{(pendingUpload || pendingSubmit) && <Text role="status">{t('initialPathway.uncertain')}</Text>}{submitted && <Text role="status">{tr('submitted')}</Text>}
    <section className="space-y-3"><Text className="font-semibold">{tr('history')}</Text>{history.data?.length === 0 && <Text variant="body-sm">{tr('noHistory')}</Text>}{history.data?.map(item => <div key={item.id} className="space-y-2 rounded-lg border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><Badge variant={item.status === 'APPROVED' ? 'success' : item.status === 'REJECTED' ? 'destructive' : 'warning'}>{tr(item.status.toLowerCase())}</Badge><Text variant="caption">{new Date(item.submittedAt).toLocaleString(language)}</Text></div>{item.link ? <a className="block break-all text-body-sm text-primary underline" href={item.link} target="_blank" rel="noopener noreferrer">{item.link}</a> : <a className={buttonVariants({ variant: 'outline', size: 'sm' })} href={certificateFilePath(item.id)}>{tr('download')} · {item.filename}</a>}{item.decision && <><Text variant="body-sm">{item.decision.reason}</Text><Text variant="caption">{new Date(item.decision.decidedAt).toLocaleString(language)}</Text></>}</div>)}{history.data && <div className="flex justify-between gap-3"><Button variant="outline" size="sm" disabled={!offset || blocked || history.isFetching} onClick={() => setOffset(value => Math.max(0, value - 20))}>{t('initialPathway.previous')}</Button><Button variant="outline" size="sm" disabled={history.data.length < 20 || blocked || history.isFetching} onClick={() => setOffset(value => value + 20)}>{t('initialPathway.next')}</Button></div>}</section>
  </DialogBody><DialogFooter><Button variant="outline" disabled={blocked} onClick={onClose}>{t('initialPathway.cancel')}</Button>{(canSubmit || pendingUpload || pendingSubmit) && <Button isLoading={busy} disabled={busy || Boolean((pendingUpload || pendingSubmit) && !error) || !pendingUpload && !pendingSubmit && (mode === 'link' ? !link.trim() : !file)} onClick={() => void submit()}>{t(pendingUpload || pendingSubmit ? 'initialPathway.retryExact' : 'certificates.submit')}</Button>}</DialogFooter></Dialog>
}
