import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, Eye, Pencil, Plus, RefreshCw, Search, ExternalLink } from 'lucide-react'
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
import { DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { ManagementDialog as Dialog, ManagementSection, ManagementSteps, ManagementTable, CursorPagination } from '../../../shared/components/ui/ManagementUi'
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
  const [pickerLevel, setPickerLevel] = useState(''), [pickerSort, setPickerSort] = useState('name')
  const [view, setView] = useState<CertificateDefinition | null>(null)
  const [search, setSearch] = useState(''), [filterLevel, setFilterLevel] = useState('')
  const [offset, setOffset] = useState(0), [open, setOpen] = useState(false), [skillId, setSkillId] = useState(''), [level, setLevel] = useState<KnowledgeLevel | ''>('')
  const [description, setDescription] = useState(''), [notice, setNotice] = useState('')
  const [name, setName] = useState(''), [url, setUrl] = useState(''), [pending, setPending] = useState<PendingPathwayCommand | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<PathwayError | null>(null), [invalid, setInvalid] = useState(false)
  const lock = useRef(false), committed = useRef(false)
  const [replacing, setReplacing] = useState<CertificateDefinition | null>(null)
  const catalog = useQuery({ queryKey: ['certificates', scope, 'catalog', offset, search, filterLevel], queryFn: ({ signal }) => readCertificates(offset, signal, search, filterLevel), retry: false, gcTime: 0 })
  const skills = useQuery({ queryKey: ['certificates', scope, 'skills'], queryFn: () => fetchMicroSkills(organizationId), retry: false, gcTime: 0 })
  const selected = skills.data?.find(skill => skill.id === skillId), blocked = busy || Boolean(pending)
  async function save() {
    if (lock.current || !selected || !level || !selected.version) return
    let normalized: URL
    try { normalized = new URL(url); if (normalized.protocol !== 'https:' || normalized.username || normalized.password || !name.trim() || name.length > 300 || description.length > 6000 || url.length > 2048) throw Error() }
    catch { setInvalid(true); return }
    const command = pending ?? createCertificateCommand({ skillId, knowledgeLevel: level, name: name.trim(), description: description.trim(), referenceUrl: normalized.href, expectedSkillVersion: selected.version, replacesDefinitionId: replacing?.id ?? null })
    setPending(command); setBusy(true); setError(null); setInvalid(false); lock.current = true
    try {
      if (!committed.current) { await sendCertificateDefinition(command); committed.current = true }
      if (!catalog.isError) setNotice(vi ? 'Đã lưu chứng chỉ.' : 'Certificate saved.')
      await client.invalidateQueries({ queryKey: ['certificates', scope, 'catalog'] })
      setPending(null); setOpen(false); setReplacing(null); setName(''); setDescription(''); setUrl(''); setSkillId(''); setLevel(''); committed.current = false; setNotice(vi ? 'Đã lưu chứng chỉ.' : 'Certificate saved.')
      await client.invalidateQueries({ queryKey: ['initialPathway', scope] })
    } catch (cause) { const failure = cause instanceof PathwayError ? cause : new PathwayError('NETWORK_ERROR'); setError(failure); if (!failure.ambiguous && !committed.current) setPending(null) }
    finally { lock.current = false; setBusy(false) }
  }
  const options = (skills.data ?? []).filter(skill => skill.version).flatMap(skill => (skill.certificateOnlyKnowledgeLevels ?? [])
    .filter(value => !pickerLevel || value === pickerLevel)
    .map(value => ({ value: skill.id + ':' + value, label: skill.name, description: t('knowledgeLevel.' + value) + ' · v' + skill.version })))
    .sort((a, b) => pickerSort === 'name' ? a.label.localeCompare(b.label, language) : a.description.localeCompare(b.description, language) || a.label.localeCompare(b.label, language))
  function begin(item?: CertificateDefinition) {
    setStep(item ? 1 : 0); setPickerLevel(''); setPickerSort('name'); setReplacing(item ?? null)
    setSkillId(item?.skillId ?? ''); setLevel(item?.knowledgeLevel ?? ''); setName(item?.name ?? ''); setDescription(item?.description ?? '')
    setUrl(item?.referenceUrl ?? ''); setInvalid(false); setError(null); setOpen(true)
  }
  function referenceLabel(value: string) { try { return new URL(value).hostname } catch { return value } }
  return <div className="space-y-5">
    <Card className="overflow-hidden"><CardHeader>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1"><CardTitle className="flex items-center gap-2"><Award className="size-4 text-primary" />{tr('title')}</CardTitle><CardDescription>{tr('description')}</CardDescription></div>
        <div className="flex flex-wrap items-center gap-2">
          <Input className="h-8 w-56 bg-background text-caption" leftIcon={<Search size={14} />} placeholder={vi ? 'Tìm chứng chỉ hoặc Skill…' : 'Search certificate or Skill…'} aria-label={vi ? 'Tìm chứng chỉ hoặc Skill' : 'Search certificate or Skill'} value={search} onChange={event => { setSearch(event.target.value); setOffset(0) }} />
          <div className="w-44"><Combobox size="sm" value={filterLevel} placeholder={vi ? 'Mức: Tất cả' : 'Level: All'} aria-label={tr('level')} onChange={value => { setFilterLevel(value); setOffset(0) }} options={['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'].map(value => ({ value, label: t('knowledgeLevel.' + value) }))} /></div>
          <Button variant="outline" size="icon" className="size-8" title={t('initialPathway.refresh')} aria-label={t('initialPathway.refresh')} disabled={catalog.isFetching || blocked} onClick={() => { void catalog.refetch(); void skills.refetch() }}><RefreshCw size={14} /></Button>
          <Button size="sm" disabled={blocked || !skills.data} onClick={() => begin()}><Plus size={14} />{tr('add')}</Button>
        </div>
      </div>
    </CardHeader><CardContent className="space-y-4 p-0">
      {notice && <Text role="status" tone="success" className="px-4">{notice}</Text>}
      {(catalog.error || skills.error) && <div className="px-4"><InitialPathwayFeedback error={catalog.error ?? skills.error} onRetry={() => { void catalog.refetch(); void skills.refetch() }} /></div>}
      {catalog.isPending && <LoadingCard label={t('initialPathway.loading')} />}
      {catalog.data && <>
        <ManagementTable className="min-w-180"><thead><tr>{['skill', 'level', 'name', 'reference'].map(key => <th key={key} scope="col">{tr(key)}</th>)}<th scope="col">{t('initialPathway.reviewUi.actions')}</th></tr></thead>
          <tbody>{catalog.data.map(item => <tr key={item.id}>
            <th scope="row">{item.skillName}</th><td>{t('knowledgeLevel.' + item.knowledgeLevel)}</td>
            <td><span className="font-semibold">{item.name}</span><div className="mt-1 flex items-center gap-2"><Badge variant="success">{vi ? 'Đang sử dụng' : 'Active'}</Badge><span className="text-xs text-muted-foreground">v{item.version}</span></div></td>
            <td><a className="inline-flex max-w-52 items-center gap-1.5 text-caption text-primary hover:underline" title={item.referenceUrl} href={item.referenceUrl} target="_blank" rel="noopener noreferrer"><span className="truncate">{referenceLabel(item.referenceUrl)}</span><ExternalLink size={12} className="shrink-0" /></a></td>
            <td><div className="flex justify-end gap-1.5"><Button size="icon" variant="outline" className="size-8 text-primary" title={vi ? 'Xem chứng chỉ' : 'View certificate'} aria-label={vi ? 'Xem chứng chỉ' : 'View certificate'} onClick={() => setView(item)}><Eye size={14} /></Button><Button size="icon" variant="outline" className="size-8" title={tr('replace')} aria-label={tr('replace')} disabled={blocked || !skills.data} onClick={() => begin(item)}><Pencil size={14} /></Button></div></td>
          </tr>)}</tbody>
        </ManagementTable>
        {catalog.data.length === 0 && <EmptyState title={tr('title')} description={vi ? 'Không có chứng chỉ phù hợp bộ lọc.' : 'No certificates match these filters.'} />}
        <CursorPagination page={offset / 20} count={catalog.data.length} busy={catalog.isFetching || blocked} locale={language} onPage={page => setOffset(page * 20)} />
      </>}
    </CardContent></Card>

    {view && <Dialog open size="wide" ariaLabel={view.name} onOpenChange={value => { if (!value) setView(null) }}>
      <DialogHeader><DialogTitle><Award size={18} className="text-primary" />{vi ? 'Thông tin chứng chỉ' : 'Certificate details'}</DialogTitle><DialogDescription>{view.name}</DialogDescription></DialogHeader>
      <DialogBody className="space-y-4">
        <ManagementSection title={vi ? 'Skill và mức kiến thức' : 'Skill & knowledge level'} aside={<Badge variant="success">{vi ? 'Đang sử dụng' : 'Active'} · v{view.version}</Badge>}><Text variant="body-sm" className="font-semibold text-foreground">{view.skillName} · {t('knowledgeLevel.' + view.knowledgeLevel)}</Text></ManagementSection>
        <ManagementSection title={tr('competencyDescription')}><Text variant="body-sm" className="whitespace-pre-wrap break-words">{view.description || (vi ? 'Chưa có mô tả.' : 'No description provided.')}</Text></ManagementSection>
        <ManagementSection title={tr('reference')}><a className="break-all text-body-sm text-primary underline" href={view.referenceUrl} target="_blank" rel="noopener noreferrer">{view.referenceUrl}</a></ManagementSection>
      </DialogBody><DialogFooter><Button variant="outline" onClick={() => setView(null)}>{vi ? 'Đóng' : 'Close'}</Button></DialogFooter>
    </Dialog>}

    {open && <Dialog open size="wide" onOpenChange={value => { if (!value && !blocked) setOpen(false) }} ariaLabel={tr(replacing ? 'replace' : 'add')}>
      <DialogHeader><DialogTitle><Award className="size-5 text-primary" />{tr(replacing ? 'replace' : 'add')}</DialogTitle><DialogDescription>{tr(replacing ? 'replaceHelp' : 'description')}</DialogDescription></DialogHeader>
      <DialogBody className="space-y-4 pr-1">
        <ManagementSteps current={step} steps={[vi ? 'Skill và mức' : 'Skill & level', vi ? 'Thông tin' : 'Certificate details', vi ? 'Kiểm tra' : 'Review']} />
        {step === 0 && <>
          <ManagementSection title={vi ? 'Bộ lọc' : 'Filters'}>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label={tr('level')}><Combobox value={pickerLevel} onChange={setPickerLevel} placeholder={vi ? 'Tất cả mức kiến thức' : 'All knowledge levels'} options={['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'].map(value => ({ value, label: t('knowledgeLevel.' + value) }))} /></FormField>
              <FormField label={vi ? 'Sắp xếp' : 'Sort'}><Combobox value={pickerSort} clearable={false} onChange={setPickerSort} options={[{ value: 'name', label: vi ? 'Tên Skill' : 'Skill name' }, { value: 'level', label: tr('level') }]} /></FormField>
            </div>
          </ManagementSection>
          <ManagementSection title={vi ? 'Chọn Skill và mức kiến thức' : 'Select Skill & knowledge level'}>
            <Text variant="caption">{vi ? 'Chọn yêu cầu đã cấu hình dùng chứng chỉ. Tìm trong danh sách để xem các Skill phù hợp.' : 'Choose a requirement configured for certificate provision. Search the list to find an eligible Skill.'}</Text>
            <Combobox wrapOptions options={options} value={skillId && level ? skillId + ':' + level : ''} disabled={blocked || Boolean(replacing)} placeholder={vi ? 'Tìm và chọn Skill…' : 'Search & select Skill…'} searchPlaceholder={vi ? 'Tìm theo tên Skill hoặc mức…' : 'Search Skill name or level…'} emptyMessage={vi ? 'Không có yêu cầu phù hợp.' : 'No matching requirements.'} onChange={value => { const split = value.lastIndexOf(':'); setSkillId(split < 0 ? '' : value.slice(0, split)); setLevel(split < 0 ? '' : value.slice(split + 1) as KnowledgeLevel) }} />
          </ManagementSection>
          {selected && level && <ManagementSection title={vi ? 'Yêu cầu đã chọn' : 'Selected requirement'} aside={<Badge variant="outline">{t('knowledgeLevel.' + level)}</Badge>}><Text variant="body-sm" className="font-semibold text-foreground">{selected.name}</Text><Text variant="caption">{vi ? 'Phiên bản Skill' : 'Skill version'}: {selected.version}</Text></ManagementSection>}
        </>}
        {step === 1 && <>
          <ManagementSection title={vi ? 'Yêu cầu đã chọn' : 'Selected requirement'} aside={level && <Badge variant="outline">{t('knowledgeLevel.' + level)}</Badge>}><Text variant="body-sm" className="font-semibold text-foreground">{selected?.name}</Text></ManagementSection>
          <ManagementSection title={vi ? 'Thông tin chứng chỉ' : 'Certificate details'}>
            <FormField label={tr('name')}><Input required aria-invalid={invalid && !name.trim()} value={name} maxLength={300} disabled={blocked} onChange={event => setName(event.target.value)} /></FormField>
            <FormField label={tr('competencyDescription')}><textarea rows={4} maxLength={6000} value={description} disabled={blocked} onChange={event => setDescription(event.target.value)} className="w-full resize-y rounded-md border border-input bg-background p-3 text-body-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></FormField>
          </ManagementSection>
          <ManagementSection title={tr('reference')}><Input type="url" required aria-label={tr('reference')} aria-invalid={invalid} aria-describedby={invalid ? 'certificate-reference-error' : undefined} value={url} maxLength={2048} disabled={blocked} onChange={event => setUrl(event.target.value)} /><Text variant="caption">{vi ? 'Sử dụng liên kết HTTPS tới đơn vị cấp hoặc tài liệu tham chiếu.' : 'Use an HTTPS link to the issuer or reference material.'}</Text></ManagementSection>
          {invalid && <Text id="certificate-reference-error" variant="caption" tone="destructive" role="alert">{vi ? 'Nhập tên và liên kết HTTPS hợp lệ.' : 'Enter a name and a valid HTTPS link.'}</Text>}
        </>}
        {step === 2 && <>
          <ManagementSection title={tr('name')} aside={level && <Badge variant="outline">{t('knowledgeLevel.' + level)}</Badge>}><Text className="font-semibold">{name}</Text><Text variant="body-sm">{selected?.name}</Text></ManagementSection>
          <ManagementSection title={tr('competencyDescription')}><Text variant="body-sm" className="whitespace-pre-wrap break-words">{description.trim() || (vi ? 'Chưa có mô tả.' : 'No description provided.')}</Text></ManagementSection>
          <ManagementSection title={tr('reference')}><a href={url} target="_blank" rel="noopener noreferrer" className="break-all text-body-sm text-primary underline">{url}</a></ManagementSection>
          <Text variant="caption">{vi ? 'Chứng chỉ áp dụng cho đúng Skill, mức kiến thức và phiên bản Skill đã chọn.' : 'This definition applies to the selected Skill, knowledge level and Skill version.'}</Text>
        </>}
        {invalid && <Text role="alert" tone="destructive">{tr('invalid')}</Text>}
        {error && <InitialPathwayFeedback error={error} busy={busy} onRetry={() => void save()} />}{pending && <Text role="status">{t('initialPathway.uncertain')}</Text>}
      </DialogBody><DialogFooter>
        <Button variant="outline" disabled={blocked} onClick={() => setOpen(false)}>{t('initialPathway.cancel')}</Button>
        {step > 0 && <Button variant="outline" disabled={blocked || Boolean(replacing && step === 1)} onClick={() => setStep(value => value - 1)}>{vi ? 'Quay lại' : 'Back'}</Button>}
        {step < 2 ? <Button disabled={blocked || (step === 0 ? !selected || !level : !name.trim() || !url.trim())} onClick={() => { if (step === 1) { try { const link = new URL(url); if (link.protocol !== 'https:' || link.username || link.password) throw Error(); setUrl(link.href) } catch { setInvalid(true); return } } setInvalid(false); setStep(value => value + 1) }}>{vi ? 'Tiếp tục' : 'Continue'}</Button> : <Button isLoading={busy} disabled={Boolean(pending && !error) || !selected || !level || !name.trim() || !url.trim()} onClick={() => void save()}>{t(pending ? 'initialPathway.retryExact' : replacing ? 'certificates.replace' : 'certificates.add')}</Button>}
      </DialogFooter>
    </Dialog>}
  </div>
}
