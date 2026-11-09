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
import { Badge } from '../../../shared/components/ui/Badge'

export function CertificatesTab({ mode = 'manage' }: { mode?: 'manage' | 'review' }) {
  const session = useInitialPathwaySession(), { t } = useTranslation()
  if (!session.scope || session.data?.role !== 'DOMAIN_EXPERT') return session.isPending ? <LoadingCard label={t('initialPathway.loading')} /> : <InitialPathwayFeedback error={session.error ?? new PathwayError('FORBIDDEN', 403)} onRetry={() => void session.refetch()} />
  return mode === 'review' ? <CertificateReviewPanel scope={session.scope} /> : <OwnedCertificates key={session.scope} scope={session.scope} organizationId={session.data.organizationId} />
}
function OwnedCertificates({ scope, organizationId }: { scope: string; organizationId: string }) {
  const { t, language } = useTranslation(), tr = (key: string) => t('certificates.' + key), client = useQueryClient(), vi = language === 'vi'
  const [step, setStep] = useState(0)
  const [skillSearch, setSkillSearch] = useState('')
  const [search, setSearch] = useState(''), [filterLevel, setFilterLevel] = useState('')
  const [offset, setOffset] = useState(0), [open, setOpen] = useState(false), [skillId, setSkillId] = useState(''), [level, setLevel] = useState<KnowledgeLevel | ''>('')
  const [name, setName] = useState(''), [url, setUrl] = useState(''), [pending, setPending] = useState<PendingPathwayCommand | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<PathwayError | null>(null), [invalid, setInvalid] = useState(false)
  const lock = useRef(false), committed = useRef(false)
  const [replacing, setReplacing] = useState<CertificateDefinition | null>(null)
  const catalog = useQuery({ queryKey: ['certificates', scope, 'catalog', offset, search, filterLevel], queryFn: ({ signal }) => readCertificates(offset, signal, search, filterLevel), retry: false, gcTime: 0 })
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
      await client.invalidateQueries({ queryKey: ['certificates', scope, 'catalog'] })
      setPending(null); setOpen(false); setReplacing(null); setName(''); setUrl(''); setSkillId(''); setLevel(''); committed.current = false
      await client.invalidateQueries({ queryKey: ['initialPathway', scope] })
    } catch (cause) { const failure = cause instanceof PathwayError ? cause : new PathwayError('NETWORK_ERROR'); setError(failure); if (!failure.ambiguous && !committed.current) setPending(null) }
    finally { lock.current = false; setBusy(false) }
  }
  return <div className="space-y-5"><Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><Award className="size-4 text-primary" />{tr('title')}</CardTitle><CardDescription>{tr('description')}</CardDescription></div><div className="flex gap-2"><Button variant="ghost" size="icon" aria-label={t('initialPathway.refresh')} disabled={catalog.isFetching || blocked} onClick={() => { void catalog.refetch(); void skills.refetch() }}><RefreshCw className="size-4" /></Button><Button size="sm" disabled={blocked || !skills.data} onClick={() => { setStep(0); setSkillSearch(''); setReplacing(null); setSkillId(''); setLevel(''); setName(''); setUrl(''); setInvalid(false); setOpen(true); setError(null) }}><Plus className="size-4" />{tr('add')}</Button></div></div><div className="flex flex-wrap gap-3 pt-3"><Input className="sm:max-w-80" placeholder={vi ? 'Tìm tên certificate hoặc Skill…' : 'Search certificate or Skill…'} value={search} onChange={event => { setSearch(event.target.value); setOffset(0) }} /><div className="sm:w-56"><Combobox value={filterLevel} onChange={value => { setFilterLevel(value); setOffset(0) }} options={[{ value: '', label: vi ? 'Tất cả mức kiến thức' : 'All knowledge levels' }, ...['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'].map(value => ({ value, label: t('knowledgeLevel.' + value) }))]} /></div></div></CardHeader><CardContent className="space-y-4">
    {(catalog.error || skills.error) && <InitialPathwayFeedback error={catalog.error ?? skills.error} onRetry={() => { void catalog.refetch(); void skills.refetch() }} />}{catalog.isPending && <LoadingCard label={t('initialPathway.loading')} />}
    {catalog.data && <><div className="overflow-x-auto scrollbar-hidden"><table className="w-full min-w-140 text-left text-body-sm"><thead className="border-y border-border bg-muted/40"><tr>{['skill', 'level', 'name', 'reference'].map(key => <th key={key} scope="col" className="px-4 py-3 font-semibold">{tr(key)}</th>)}<th scope="col" className="px-4 py-3 font-semibold">{t('initialPathway.reviewUi.actions')}</th></tr></thead><tbody className="divide-y divide-border">{catalog.data.map(item => <tr key={item.id}>
      <th scope="row" className="px-4 py-3 font-medium">{item.skillName}</th><td className="px-4 py-3">{t('knowledgeLevel.' + item.knowledgeLevel)}</td><td className="px-4 py-3"><span className="font-semibold">{item.name}</span><div className="mt-1"><Badge variant="success">{vi ? 'Đang sử dụng' : 'Active'}</Badge><span className="ml-2 text-xs text-muted-foreground">v{item.version}</span></div></td><td className="max-w-80 break-all px-4 py-3"><a className="text-primary underline" href={item.referenceUrl} target="_blank" rel="noopener noreferrer">{item.referenceUrl}</a></td><td className="px-4 py-3"><Button size="sm" variant="outline" disabled={blocked || !skills.data} onClick={() => { setStep(1); setReplacing(item); setSkillId(item.skillId); setLevel(item.knowledgeLevel); setName(item.name); setUrl(item.referenceUrl); setInvalid(false); setError(null); setOpen(true) }}>{tr('replace')}</Button></td>
    </tr>)}</tbody></table></div>{catalog.data.length === 0 && <EmptyState title={tr('title')} description={tr('description')} />}<div className="flex justify-between gap-3"><Button variant="outline" size="sm" disabled={!offset || catalog.isFetching || blocked} onClick={() => setOffset(value => Math.max(0, value - 20))}>{t('initialPathway.previous')}</Button><Button variant="outline" size="sm" disabled={catalog.data.length < 20 || catalog.isFetching || blocked} onClick={() => setOffset(value => value + 20)}>{t('initialPathway.next')}</Button></div></>}
    </CardContent></Card>
    {open && <Dialog open size="wide" className="h-[min(46rem,calc(100dvh-2rem))] sm:h-[min(46rem,calc(100dvh-3rem))]" onOpenChange={value => { if (!value && !blocked) setOpen(false) }} ariaLabel={tr(replacing ? 'replace' : 'add')}>
      <DialogHeader className="border-b border-border pb-4"><DialogTitle><span className="rounded-lg bg-secondary p-2 text-primary"><Award className="size-5" /></span>{tr(replacing ? 'replace' : 'add')}</DialogTitle><DialogDescription>{tr(replacing ? 'replaceHelp' : 'description')}</DialogDescription></DialogHeader>
      <ol className="mb-5 grid shrink-0 grid-cols-3 gap-2 sm:gap-3">{[vi ? 'Chọn Skill và mức' : 'Skill & level', vi ? 'Thông tin certificate' : 'Certificate details', vi ? 'Xác nhận' : 'Confirm'].map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${step === index ? 'border-primary bg-primary text-primary-foreground shadow-xs' : index < step ? 'border-primary/30 bg-secondary text-primary' : 'border-border bg-muted/40 text-muted-foreground'}`}><span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-current/30">{index + 1}</span><span>{label}</span></li>)}</ol><DialogBody className="space-y-5 px-1 py-1">{step === 0 && <><Text variant="body-sm">{vi ? 'Chọn Skill và mức kiến thức được cấu hình dùng certificate. Certificate luôn gắn với một yêu cầu cụ thể.' : 'Choose a Skill and knowledge level configured for certificate provision. Each certificate belongs to one exact requirement.'}</Text><div className="space-y-3">
        <Input value={skillSearch} placeholder={vi ? 'Tìm Skill…' : 'Search Skills…'} onChange={event => setSkillSearch(event.target.value)} />
        <div className="grid gap-3 sm:grid-cols-2">{(skills.data ?? []).filter(skill => skill.version && skill.name.toLocaleLowerCase().includes(skillSearch.toLocaleLowerCase())).flatMap(skill => (skill.certificateOnlyKnowledgeLevels ?? []).map(value => <button key={skill.id + ':' + value} type="button" disabled={blocked || Boolean(replacing)} aria-pressed={skillId === skill.id && level === value} onClick={() => { setSkillId(skill.id); setLevel(value as KnowledgeLevel) }} className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${skillId === skill.id && level === value ? 'border-primary bg-secondary text-primary shadow-xs' : 'border-border bg-card hover:border-primary/40 hover:bg-secondary/30'}`}>
          <span className="space-y-2"><span className="block text-sm font-semibold">{skill.name}</span><Badge variant={skillId === skill.id && level === value ? 'secondary' : 'outline'}>{t('knowledgeLevel.' + value)}</Badge></span><span className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${skillId === skill.id && level === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>{skillId === skill.id && level === value ? '✓' : ''}</span>
        </button>))}</div>
        {!(skills.data ?? []).some(skill => skill.version && (skill.certificateOnlyKnowledgeLevels?.length ?? 0) > 0 && skill.name.toLocaleLowerCase().includes(skillSearch.toLocaleLowerCase())) && <Text variant="body-sm">{vi ? 'Không có Skill–mức phù hợp.' : 'No matching Skill-level requirements.'}</Text>}
      </div></>}{step === 1 && <><Text className="rounded-xl border border-primary/20 bg-secondary/60 p-4 font-semibold text-primary">{selected?.name} · {level && t('knowledgeLevel.' + level)}</Text><FormField label={tr('name')}><Input required value={name} maxLength={300} disabled={blocked} onChange={event => setName(event.target.value)} /></FormField>
        <FormField label={tr('reference')}><Input type="url" required value={url} maxLength={2048} disabled={blocked} onChange={event => setUrl(event.target.value)} /></FormField>
        </>}{step === 2 && <div className="rounded-xl border border-primary/30 border-l-4 border-l-primary bg-secondary/40 p-5 sm:p-6 space-y-4"><Text className="font-semibold">{name}</Text><Text variant="body-sm">{selected?.name} · {level && t('knowledgeLevel.' + level)}</Text><a href={url} target="_blank" rel="noopener noreferrer" className="block break-all text-sm text-primary underline">{url}</a><Text variant="caption">{vi ? 'Yêu cầu đầu ra được lấy từ cấu hình Skill. Tạo certificate không tự công nhận kết quả cho employee.' : 'Required outcomes come from the Skill configuration. Creating a certificate does not award employee achievement.'}</Text></div>}
        {invalid && <Text role="alert" className="text-destructive">{tr('invalid')}</Text>}{error && <InitialPathwayFeedback error={error} busy={busy} onRetry={() => void save()} />}{pending && <Text role="status">{t('initialPathway.uncertain')}</Text>}
      </DialogBody><DialogFooter><Button variant="outline" disabled={blocked} onClick={() => setOpen(false)}>{t('initialPathway.cancel')}</Button>{step > 0 && <Button variant="outline" disabled={blocked || Boolean(replacing && step === 1)} onClick={() => setStep(value => value - 1)}>{vi ? 'Quay lại' : 'Back'}</Button>}{step < 2 ? <Button disabled={blocked || (step === 0 ? !selected || !level : !name.trim() || !url.trim())} onClick={() => { if (step === 1) { try { const link = new URL(url); if (link.protocol !== 'https:' || link.username || link.password) throw Error(); setUrl(link.href) } catch { setInvalid(true); return } } setInvalid(false); setStep(value => value + 1) }}>{vi ? 'Tiếp tục' : 'Continue'}</Button> : <Button isLoading={busy} disabled={Boolean(pending && !error) || !selected || !level || !name.trim() || !url.trim()} onClick={() => void save()}>{t(pending ? 'initialPathway.retryExact' : replacing ? 'certificates.replace' : 'certificates.add')}</Button>}</DialogFooter>
    </Dialog>}
  </div>
}
