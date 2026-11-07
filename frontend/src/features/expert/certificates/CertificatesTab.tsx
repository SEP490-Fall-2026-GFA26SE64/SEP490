import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, Plus, RefreshCw } from 'lucide-react'
import { fetchMicroSkills } from '../../../shared/api/microSkillApi'
import { createCertificateCommand, readCertificates, sendCertificateDefinition, type CertificateDefinition } from '../../../shared/api/certificates'
import { PathwayError, type PendingPathwayCommand } from '../../../shared/api/initialPathway'
import type { KnowledgeLevel } from '../../../shared/api/requirementPathway'
import { useInitialPathwaySession } from '../../../shared/hooks/useInitialPathwaySession'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { InitialPathwayFeedback } from '../../../shared/components/InitialPathwayFeedback'
import { Text } from '../../../shared/components/typography/Text'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { Combobox } from '../../../shared/components/ui/Combobox'
import { Input } from '../../../shared/components/ui/Input'
import { FormField } from '../../../shared/components/ui/FormField'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { CertificateReviewPanel } from './CertificateReviewPanel'

export function CertificatesTab() {
  const session = useInitialPathwaySession(), { t } = useTranslation()
  if (!session.scope || session.data?.role !== 'DOMAIN_EXPERT') return session.isPending ? <LoadingCard label={t('initialPathway.loading')} /> : <InitialPathwayFeedback error={session.error ?? new PathwayError('FORBIDDEN', 403)} onRetry={() => void session.refetch()} />
  return <OwnedCertificates key={session.scope} scope={session.scope} organizationId={session.data.organizationId} />
}
function OwnedCertificates({ scope, organizationId }: { scope: string; organizationId: string }) {
  const { t } = useTranslation(), tr = (key: string) => t('certificates.' + key), client = useQueryClient()
  const [offset, setOffset] = useState(0), [open, setOpen] = useState(false), [skillId, setSkillId] = useState(''), [level, setLevel] = useState<KnowledgeLevel | ''>('')
  const [name, setName] = useState(''), [url, setUrl] = useState(''), [pending, setPending] = useState<PendingPathwayCommand | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<PathwayError | null>(null), [invalid, setInvalid] = useState(false)
  const lock = useRef(false), committed = useRef(false)
  const [replacing, setReplacing] = useState<CertificateDefinition | null>(null)
  const catalog = useQuery({ queryKey: ['certificates', scope, 'catalog', offset], queryFn: ({ signal }) => readCertificates(offset, signal), retry: false, gcTime: 0 })
  const skills = useQuery({ queryKey: ['certificates', scope, 'skills'], queryFn: () => fetchMicroSkills(organizationId), retry: false, gcTime: 0 })
  const selected = skills.data?.find(skill => skill.id === skillId), blocked = busy || Boolean(pending)
  async function save() {
    if (lock.current || !selected || !level || !selected.version) return
    let normalized: URL
    try { normalized = new URL(url); if (normalized.protocol !== 'https:' || normalized.username || normalized.password || !name.trim() || name.length > 300 || url.length > 2048) throw Error() }
    catch { setInvalid(true); return }
    const command = pending ?? createCertificateCommand({ skillId, knowledgeLevel: level, name: name.trim(), referenceUrl: normalized.href, expectedSkillVersion: selected.version, replacesDefinitionId: replacing?.id ?? null })
    setPending(command); setBusy(true); setError(null); setInvalid(false); lock.current = true
    try {
      if (!committed.current) { await sendCertificateDefinition(command); committed.current = true }
      const latest = await readCertificates(offset); client.setQueryData(['certificates', scope, 'catalog', offset], latest)
      setPending(null); setOpen(false); setReplacing(null); setName(''); setUrl(''); setSkillId(''); setLevel(''); committed.current = false
      await client.invalidateQueries({ queryKey: ['initialPathway', scope] })
    } catch (cause) { const failure = cause instanceof PathwayError ? cause : new PathwayError('NETWORK_ERROR'); setError(failure); if (!failure.ambiguous && !committed.current) setPending(null) }
    finally { lock.current = false; setBusy(false) }
  }
  return <div className="space-y-5"><Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><Award className="size-4 text-primary" />{tr('title')}</CardTitle><CardDescription>{tr('description')}</CardDescription></div><div className="flex gap-2"><Button variant="ghost" size="icon" aria-label={t('initialPathway.refresh')} disabled={catalog.isFetching || blocked} onClick={() => { void catalog.refetch(); void skills.refetch() }}><RefreshCw className="size-4" /></Button><Button size="sm" disabled={blocked || !skills.data} onClick={() => { setReplacing(null); setSkillId(''); setLevel(''); setName(''); setUrl(''); setInvalid(false); setOpen(true); setError(null) }}><Plus className="size-4" />{tr('add')}</Button></div></div></CardHeader><CardContent className="space-y-4">
    {(catalog.error || skills.error) && <InitialPathwayFeedback error={catalog.error ?? skills.error} onRetry={() => { void catalog.refetch(); void skills.refetch() }} />}{catalog.isPending && <LoadingCard label={t('initialPathway.loading')} />}
    {catalog.data && <><div className="overflow-x-auto scrollbar-hidden"><table className="w-full min-w-140 text-left text-body-sm"><thead className="border-y border-border bg-muted/40"><tr>{['skill', 'level', 'name', 'reference'].map(key => <th key={key} scope="col" className="px-4 py-3 font-semibold">{tr(key)}</th>)}<th scope="col" className="px-4 py-3 font-semibold">{t('initialPathway.reviewUi.actions')}</th></tr></thead><tbody className="divide-y divide-border">{catalog.data.map(item => <tr key={item.id}>
      <th scope="row" className="px-4 py-3 font-medium">{item.skillName}</th><td className="px-4 py-3">{t('knowledgeLevel.' + item.knowledgeLevel)}</td><td className="px-4 py-3">{item.name}</td><td className="max-w-80 break-all px-4 py-3"><a className="text-primary underline" href={item.referenceUrl} target="_blank" rel="noopener noreferrer">{item.referenceUrl}</a></td><td className="px-4 py-3"><Button size="sm" variant="outline" disabled={blocked || !skills.data} onClick={() => { setReplacing(item); setSkillId(item.skillId); setLevel(item.knowledgeLevel); setName(item.name); setUrl(item.referenceUrl); setInvalid(false); setError(null); setOpen(true) }}>{tr('replace')}</Button></td>
    </tr>)}</tbody></table></div>{catalog.data.length === 0 && <EmptyState title={tr('title')} description={tr('description')} />}<div className="flex justify-between gap-3"><Button variant="outline" size="sm" disabled={!offset || catalog.isFetching || blocked} onClick={() => setOffset(value => Math.max(0, value - 20))}>{t('initialPathway.previous')}</Button><Button variant="outline" size="sm" disabled={catalog.data.length < 20 || catalog.isFetching || blocked} onClick={() => setOffset(value => value + 20)}>{t('initialPathway.next')}</Button></div></>}
    </CardContent></Card><CertificateReviewPanel scope={scope} />
    {open && <Dialog open size="wide" onOpenChange={value => { if (!value && !blocked) setOpen(false) }} ariaLabel={tr(replacing ? 'replace' : 'add')}>
      <DialogHeader><DialogTitle>{tr(replacing ? 'replace' : 'add')}</DialogTitle><DialogDescription>{tr(replacing ? 'replaceHelp' : 'description')}</DialogDescription></DialogHeader>
      <DialogBody className="space-y-4"><div className="grid gap-4 sm:grid-cols-2">
        <FormField label={tr('skill')}><Combobox value={skillId} disabled={blocked || Boolean(replacing)} onChange={value => { setSkillId(value); setLevel('') }} options={(skills.data ?? []).filter(skill => skill.version && (skill.certificateOnlyKnowledgeLevels?.length ?? 0) > 0).map(skill => ({ value: skill.id, label: skill.name }))} /></FormField>
        <FormField label={tr('level')}><Combobox value={level} disabled={blocked || !selected || Boolean(replacing)} onChange={value => setLevel(value as KnowledgeLevel)} options={(selected?.certificateOnlyKnowledgeLevels ?? []).map(value => ({ value, label: t('knowledgeLevel.' + value) }))} /></FormField>
      </div><FormField label={tr('name')}><Input required value={name} maxLength={300} disabled={blocked} onChange={event => setName(event.target.value)} /></FormField>
        <FormField label={tr('reference')}><Input type="url" required value={url} maxLength={2048} disabled={blocked} onChange={event => setUrl(event.target.value)} /></FormField>
        {invalid && <Text role="alert" className="text-destructive">{tr('invalid')}</Text>}{error && <InitialPathwayFeedback error={error} busy={busy} onRetry={() => void save()} />}{pending && <Text role="status">{t('initialPathway.uncertain')}</Text>}
      </DialogBody><DialogFooter><Button variant="outline" disabled={blocked} onClick={() => setOpen(false)}>{t('initialPathway.cancel')}</Button><Button isLoading={busy} disabled={Boolean(pending && !error) || !selected || !level || !name.trim() || !url.trim()} onClick={() => void save()}>{t(pending ? 'initialPathway.retryExact' : replacing ? 'certificates.replace' : 'certificates.add')}</Button></DialogFooter>
    </Dialog>}
  </div>
}
