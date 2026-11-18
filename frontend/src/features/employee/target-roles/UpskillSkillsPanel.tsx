import { useQuery } from '@tanstack/react-query'
import { ArrowLeft,ArrowRight,Info,LayoutGrid,List,Search,SlidersHorizontal,X } from 'lucide-react'
import { useContext,useEffect,useRef,useState } from 'react'
import { useNavigate,useSearchParams } from 'react-router-dom'
import { fetchMicroSkills,type MicroSkillDto } from '../../../shared/api/microSkillApi'
import type { KnowledgeLevel } from '../../../shared/api/requirementPathway'
import { readSkillModules,searchSkillModules,startSkillModule,type OptionalSkillModule } from '../../../shared/api/skillLearningApi'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { PageLoader } from '../../../shared/components/ui/PageLoader'
import { Heading } from '../../../shared/components/typography/Heading'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Combobox } from '../../../shared/components/ui/Combobox'
import { Dialog,DialogBody,DialogFooter,DialogHeader,DialogTitle } from '../../../shared/components/ui/Dialog'
import { Input } from '../../../shared/components/ui/Input'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { Tabs,TabsContent,TabsList,TabsTrigger } from '../../../shared/components/ui/Tabs'
import { useTranslation } from "../../../shared/i18n/LanguageContext"
import { readSkillKnowledgeProfile } from '../baseline-assessment/knowledgeProfileApi'
import { INDIVIDUAL_KNOWLEDGE_LEVELS,individualKnowledgeState } from './individualSkillKnowledge'
import { ModuleCatalogResults } from './ModuleCatalogResults'
import { SkillLevelAssessmentPanel } from './SkillLevelAssessmentPanel'

export function UpskillSkillsPanel() {
  const identity = useContext(WorkspaceSessionContext)?.identity
  return <ScopedSkillsPanel key={`${identity?.organizationId}/${identity?.accountId}`} />
}

function ScopedSkillsPanel() {
  const identity = useContext(WorkspaceSessionContext)?.identity
  const { language } = useTranslation(), vi = language === 'vi'
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const scope = `${identity?.organizationId}/${identity?.accountId}`
  const [search, setSearch] = useState(() => searchParams.get('search') ?? new URLSearchParams(window.location.search).get('search') ?? '')
  const [resultType, setResultType] = useState('SKILL')
  const [view, setView] = useState<'list' | 'grid'>('grid')
  const [filterOpen, setFilterOpen] = useState(false)
  const [draftSkill, setDraftSkill] = useState(''), [draftLevel, setDraftLevel] = useState('')
  const [ownerSkill, setOwnerSkill] = useState('')
  const [moduleLevel, setModuleLevel] = useState('')
  const [modulePage, setModulePage] = useState(0), [skillPage, setSkillPage] = useState(0)
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search), 300); return () => clearTimeout(timer) }, [search])
  function resetPages() { setModulePage(0); setSkillPage(0) }
  const showSkills = resultType !== 'MODULE', showModules = resultType !== 'SKILL'
  const [selected, setSelected] = useState<MicroSkillDto | null>(null)
  const selectedRegion = useRef<HTMLElement>(null), returnSkill = useRef('')
  const [restoredSkillId, setRestoredSkillId] = useState('')
  useEffect(() => {
    if (selected) selectedRegion.current?.focus()
    else if (returnSkill.current) document.getElementById(returnSkill.current)?.focus()
  }, [selected])
  const urlSkillId = searchParams.get('skillId') ?? ''
  const urlLevel = searchParams.get('level')
  const [level, setLevel] = useState<KnowledgeLevel>(() =>
    urlLevel && INDIVIDUAL_KNOWLEDGE_LEVELS.includes(urlLevel as KnowledgeLevel) ? (urlLevel as KnowledgeLevel) : 'FOUNDATION'
  )
  const [busy, setBusy] = useState(''), [actionError, setActionError] = useState('')
  const catalog = useQuery({ queryKey: ['individualSkills', scope], queryFn: () => fetchMicroSkills(identity!.organizationId!), enabled: Boolean(identity?.organizationId), retry: false, gcTime: 0 })
  if (!urlSkillId && restoredSkillId) setRestoredSkillId('')
  if (urlSkillId && !selected && restoredSkillId !== urlSkillId) {
    const match = (catalog.data ?? []).find(s => s.id === urlSkillId && s.status === 'ACTIVE')
    if (match) {
      setRestoredSkillId(urlSkillId)
      setSelected(match)
      if (urlLevel && INDIVIDUAL_KNOWLEDGE_LEVELS.includes(urlLevel as KnowledgeLevel)) setLevel(urlLevel as KnowledgeLevel)
    }
  }
  const moduleResults = useQuery({ queryKey: ['individualModuleSearch', scope, debouncedSearch, ownerSkill, moduleLevel, modulePage], queryFn: ({ signal }) => searchSkillModules(debouncedSearch, ownerSkill, moduleLevel, modulePage, signal), enabled: Boolean(identity?.organizationId) && showModules && !selected && search === debouncedSearch, retry: false, gcTime: 0 })
  const provision = useQuery({ queryKey: ['individualSkillModules', scope, selected?.id], queryFn: ({ signal }) => readSkillModules(selected!.id, signal), enabled: Boolean(selected), retry: false, gcTime: 0 })
  const profile = useQuery({ queryKey: ['individualSkillKnowledge', scope, selected?.id, selected?.version], queryFn: ({ signal }) => readSkillKnowledgeProfile(selected!.id, signal), enabled: Boolean(selected), retry: false, gcTime: 0, refetchInterval: selected ? 5000 : false })
  const modules = provision.isError ? [] : provision.data ?? []
  const entries = profile.isError ? null : profile.data ?? null
  const visible = (catalog.data ?? []).filter(s => s.status === 'ACTIVE' && `${s.name} ${s.code} ${s.description ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()))
  const labels: Record<KnowledgeLevel, string> = { FOUNDATION: vi ? 'Nền tảng' : 'Foundation', INTERMEDIATE: vi ? 'Trung cấp' : 'Intermediate', ADVANCED: vi ? 'Nâng cao' : 'Advanced' }
  const statusLabels = { achieved: vi ? 'Đã đạt' : 'Achieved', review: vi ? 'Cần xem xét' : 'Needs review', notAchieved: vi ? 'Chưa đạt' : 'Not achieved', unavailable: vi ? 'Chưa có dữ liệu' : 'Unavailable' }
  const reasons: Record<string, string> = {
    PATHWAY_MODULE_LOCKED: vi ? 'Module đang bị khóa trong lộ trình.' : 'This module is locked in your pathway.',
    PREREQUISITE_NOT_MET: vi ? 'Chưa đạt kiến thức tiên quyết.' : 'Prerequisite knowledge has not been achieved.',
    SKILL_VERSION_CHANGED: vi ? 'Nội dung cần cập nhật theo phiên bản kỹ năng.' : 'Content needs to match the current skill version.',
  }
  function select(skill: MicroSkillDto, returnId = `skill-action-${encodeURIComponent(skill.id)}`) { returnSkill.current = returnId; setSelected(skill); setLevel('FOUNDATION'); setActionError(''); setFilterOpen(false) }
  async function open(skillId: string, module: OptionalSkillModule) {
    if (busy || module.unavailableReason || !module.knowledgeLevel || !module.skillVersion) return
    setBusy(module.moduleId); setActionError('')
    try {
      await startSkillModule(skillId, module.moduleId)
      const query = new URLSearchParams({ from: 'upskilling', skillId, level: module.knowledgeLevel })
      const path = `/employee/modules/${encodeURIComponent(module.moduleId)}?${query.toString()}`
      void navigate(path)
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : (vi ? 'Không thể mở module.' : 'Cannot open module.')) }
    finally { setBusy('') }
  }
  return <section className="space-y-4" aria-label={vi ? 'Học kỹ năng độc lập' : 'Individual skills'}>
    {!selected && <>
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-border bg-card p-2 sm:flex sm:gap-3">
      <label htmlFor="skill-search" className="sr-only">{vi ? 'Tìm kỹ năng hoặc module' : 'Search skills or modules'}</label>
      <div className="relative col-span-2 min-w-0 flex-1"><Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="skill-search" type="search" className="border-0 bg-transparent pl-9 shadow-none" value={search} maxLength={100} onChange={e => { setSearch(e.target.value); resetPages() }} placeholder={vi ? 'Tìm kỹ năng hoặc module…' : 'Search skills or modules…'} /></div>
      <div role="group" aria-label={vi ? 'Loại kết quả' : 'Result type'} className="flex gap-0.5 rounded-md bg-muted p-1">
        {[['SKILL', 'Skills'], ['MODULE', 'Modules'], ['ALL', vi ? 'Tất cả' : 'All']].map(([value, name]) => <Button key={value} variant="ghost" size="sm" aria-pressed={resultType === value} className={`min-h-9 flex-1 px-3 text-body-sm ${resultType === value ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`} onClick={() => { setResultType(value); resetPages() }}>{name}</Button>)}
      </div>
      {showModules && <Button variant="outline" className="gap-2" aria-haspopup="dialog" onClick={() => { setDraftSkill(ownerSkill); setDraftLevel(moduleLevel); setFilterOpen(true) }}><SlidersHorizontal size={16} aria-hidden="true" />{vi ? 'Bộ lọc' : 'Filters'}{Boolean(ownerSkill || moduleLevel) && <Badge variant="secondary">{Number(Boolean(ownerSkill)) + Number(Boolean(moduleLevel))}</Badge>}</Button>}
    </div>
    {showModules && Boolean(ownerSkill || moduleLevel || search) && <div className="flex flex-wrap items-center gap-2" aria-label={vi ? 'Bộ lọc đang áp dụng' : 'Applied filters'}>
      {ownerSkill && <Button variant="outline" size="sm" className="gap-2 font-normal" aria-label={vi ? 'Xóa bộ lọc skill' : 'Remove skill filter'} onClick={() => { setOwnerSkill(''); resetPages() }}>{catalog.data?.find(s => s.id === ownerSkill)?.name ?? ownerSkill}<X size={13} aria-hidden="true" /></Button>}
      {moduleLevel && <Button variant="outline" size="sm" className="gap-2 font-normal" aria-label={vi ? 'Xóa bộ lọc level' : 'Remove level filter'} onClick={() => { setModuleLevel(''); resetPages() }}>{labels[moduleLevel as KnowledgeLevel]}<X size={13} aria-hidden="true" /></Button>}
      <Button variant="link" size="sm" className="text-muted-foreground" onClick={() => { setSearch(''); setOwnerSkill(''); setModuleLevel(''); setResultType('SKILL'); resetPages() }}>{vi ? 'Xóa tất cả' : 'Reset filters'}</Button>
    </div>}
    <Dialog open={filterOpen} onOpenChange={setFilterOpen} className="overflow-visible" ariaLabel={vi ? 'Lọc module' : 'Filter modules'} closeLabel={vi ? 'Đóng bộ lọc' : 'Close filters'}>
      <DialogHeader><DialogTitle>{vi ? 'Lọc module' : 'Filter modules'}</DialogTitle></DialogHeader>
      <DialogBody className="space-y-5 overflow-visible"><p className="text-body-sm text-muted-foreground">{vi ? 'Thu hẹp nội dung theo kỹ năng và mức kiến thức.' : 'Narrow modules by skill and knowledge level.'}</p>
        <div className="space-y-2"><label htmlFor="module-skill" className="text-body-sm font-medium">{vi ? 'Thuộc skill' : 'Belongs to skill'}</label><Combobox id="module-skill" value={draftSkill} placeholder={vi ? 'Tất cả skill' : 'All skills'} searchPlaceholder={vi ? 'Tìm skill…' : 'Find skill…'} options={(catalog.data ?? []).filter(s => s.status === 'ACTIVE').map(s => ({ value: s.id, label: s.name, description: s.code }))} onChange={setDraftSkill} /></div>
        <div className="space-y-2"><label htmlFor="module-level" className="text-body-sm font-medium">{vi ? 'Mức kiến thức của module' : 'Module knowledge level'}</label><Combobox id="module-level" value={draftLevel} placeholder={vi ? 'Tất cả level' : 'All levels'} options={INDIVIDUAL_KNOWLEDGE_LEVELS.map(value => ({ value, label: labels[value] }))} onChange={setDraftLevel} /></div>
      </DialogBody>
      <DialogFooter className="sm:justify-between"><Button variant="ghost" onClick={() => { setDraftSkill(''); setDraftLevel('') }}>{vi ? 'Xóa bộ lọc' : 'Clear filters'}</Button><Button className="gap-2" onClick={() => { setOwnerSkill(draftSkill); setModuleLevel(draftLevel); resetPages(); setFilterOpen(false) }}>{vi ? 'Xem kết quả' : 'Show results'}<ArrowRight size={15} aria-hidden="true" /></Button></DialogFooter>
    </Dialog>
    {!identity?.organizationId && <p role="alert">{vi ? 'Cần đăng nhập vào tổ chức.' : 'Sign in to your workspace.'}</p>}
    {catalog.isPending && identity?.organizationId && <PageLoader label={vi ? 'Đang tải kỹ năng…' : 'Loading skills…'} />}
    {catalog.isError && <div role="alert" className="space-y-2"><p>{vi ? 'Không tải được danh sách kỹ năng.' : 'Could not load skills.'}</p><Button variant="outline" onClick={() => void catalog.refetch()}>{vi ? 'Thử lại' : 'Retry'}</Button></div>}
    {showSkills && catalog.isSuccess && !visible.length && <p className="rounded-xl border border-border bg-card p-5 text-body-sm text-muted-foreground">{vi ? 'Không có kỹ năng phù hợp.' : 'No matching skills.'}</p>}
    {showSkills && visible.length > 0 && <section className="space-y-3" aria-label="Skills"><div className="overflow-hidden rounded-lg border border-border bg-card" role="list">{visible.slice(skillPage * 20, (skillPage + 1) * 20).map(skill => <div key={skill.id} role="listitem" className="flex min-w-0 flex-col gap-3 border-b border-border p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-5">
      <div className="min-w-0 space-y-1.5"><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary" className="max-w-full break-words whitespace-normal">{skill.code}</Badge><Heading level={3} size="card" className="break-words">{skill.name}</Heading></div>{skill.description && <p className="line-clamp-2 break-words text-body-sm text-muted-foreground">{skill.description}</p>}</div>
      <Button id={`skill-action-${encodeURIComponent(skill.id)}`} size="sm" variant="primary" className="shrink-0 self-start gap-2 sm:self-center" onClick={() => select(skill)}>{vi ? 'Xem modules' : 'View modules'}<ArrowRight size={14} aria-hidden="true" /></Button>
    </div>)}</div><Pagination currentPage={skillPage + 1} totalPages={Math.ceil(visible.length / 20)} totalItems={visible.length} pageSize={20} locale={vi ? 'vi' : 'en'} onPageChange={value => setSkillPage(value - 1)} /></section>}
    {actionError && !selected && <p role="alert" className="text-body-sm text-destructive">{actionError}</p>}
    {showModules && <section aria-label="Modules" className="space-y-3"><div className="flex items-center justify-between gap-3"><Heading level={2} size="card">{moduleResults.isSuccess && search === debouncedSearch ? `${moduleResults.data.totalItems} ${vi || moduleResults.data.totalItems === 1 ? 'module' : 'modules'}` : 'Modules'}</Heading><div role="group" aria-label={vi ? 'Kiểu hiển thị' : 'Display mode'} className="flex gap-0.5 rounded-md border border-border bg-card p-0.5"><Button size="sm" variant="ghost" className={`px-2 ${view === 'list' ? 'bg-muted' : 'text-muted-foreground'}`} aria-label={vi ? 'Hiển thị danh sách' : 'List view'} aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={17} aria-hidden="true" /></Button><Button size="sm" variant="ghost" className={`px-2 ${view === 'grid' ? 'bg-muted' : 'text-muted-foreground'}`} aria-label={vi ? 'Hiển thị thẻ' : 'Card view'} aria-pressed={view === 'grid'} onClick={() => setView('grid')}><LayoutGrid size={17} aria-hidden="true" /></Button></div></div>
      {(moduleResults.isPending || search !== debouncedSearch) && <PageLoader label={vi ? 'Đang tìm module…' : 'Searching modules…'} />}
      {moduleResults.isError && search === debouncedSearch && <div role="alert" className="space-y-2"><p>{vi ? 'Không tải được module.' : 'Could not load module results.'}</p><Button variant="outline" onClick={() => void moduleResults.refetch()}>{vi ? 'Thử lại' : 'Retry module search'}</Button></div>}
      {moduleResults.isSuccess && search === debouncedSearch && <>
        {!moduleResults.data.items.length && <p className="rounded-lg border border-border bg-card p-4 text-body-sm text-muted-foreground">{vi ? 'Không có module phù hợp. Thử đổi từ khóa hoặc xóa bộ lọc.' : 'No matching modules. Try another search or reset the filters.'}</p>}
        {moduleResults.data.items.length > 0 && <ModuleCatalogResults items={moduleResults.data.items} view={view} vi={vi} busy={busy} labels={labels} reasons={reasons} onOpen={({ skillId, module }) => void open(skillId, module)} onViewSkill={item => { const skill = catalog.data?.find(s => s.id === item.skillId); if (skill) { select(skill, `module-skill-${encodeURIComponent(item.module.moduleId)}`); setLevel(item.module.knowledgeLevel ?? 'FOUNDATION') } }} />}
        <Pagination currentPage={modulePage + 1} totalPages={Math.ceil(moduleResults.data.totalItems / moduleResults.data.pageSize)} totalItems={moduleResults.data.totalItems} pageSize={moduleResults.data.pageSize} locale={vi ? 'vi' : 'en'} disabled={moduleResults.isFetching} onPageChange={value => setModulePage(value - 1)} />
      </>}
    </section>}
    <p className="flex items-start gap-2 text-caption text-muted-foreground"><Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{vi ? 'Hoàn thành nội dung trước khi làm Skill Assessment. Achievement được ghi nhận khi đánh giá đạt.' : 'Complete module content before the Skill Assessment. Official achievement is awarded after a passing assessment.'}</span></p>
    </>}
    {selected && <section ref={selectedRegion} tabIndex={-1} className="space-y-4 outline-none" aria-label={vi ? 'Modules của skill' : 'Skill modules'}>
      <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" disabled={Boolean(busy)} onClick={() => {
        setSelected(null)
        setActionError('')
        if (searchParams.has('skillId') || searchParams.has('level')) {
          const next = new URLSearchParams(searchParams)
          next.delete('skillId')
          next.delete('level')
          setSearchParams(next, { replace: true })
        }
      }}><ArrowLeft size={15} aria-hidden="true" />{vi ? 'Quay lại danh sách Skills' : 'Back to skills'}</Button>
      <div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{selected.code}</Badge><Heading level={2} size="subsection" className="break-words">{selected.name}</Heading></div>{selected.description && <p className="text-body-sm text-muted-foreground">{selected.description}</p>}</div>
        <div className="space-y-4">
          <p className="text-body-sm text-muted-foreground">{vi ? 'Chọn mức kiến thức, học một module phù hợp, rồi làm Skill Assessment ở mức đó. Hoàn thành nội dung chưa đồng nghĩa đã đạt kỹ năng.' : 'Choose a knowledge level, study a compatible module, then take the Skill Assessment for that level. Content completion alone does not award achievement.'}</p>
          {selected?.version && <p className="text-caption text-muted-foreground">{vi ? 'Trạng thái cho phiên bản kỹ năng: ' : 'Achievement status for skill version: '}{selected.version}</p>}
          {profile.isError && <div role="alert" className="space-y-2"><p className="text-body-sm text-destructive">{vi ? 'Chưa tải được achievement. Trạng thái đạt chưa xác định.' : 'Achievement could not be loaded. Achievement status is unknown.'}</p><Button variant="outline" size="sm" onClick={() => void profile.refetch()}>{vi ? 'Tải lại achievement' : 'Retry achievement'}</Button></div>}
          <Tabs value={level} onValueChange={value => { setLevel(value as KnowledgeLevel); void provision.refetch() }}>
            <TabsList className="h-auto items-stretch" aria-label={vi ? 'Mức kiến thức' : 'Knowledge level'}>{INDIVIDUAL_KNOWLEDGE_LEVELS.map(item => {
              const state = individualKnowledgeState(entries, selected?.id ?? '', selected?.version, item)
              return <TabsTrigger key={item} value={item} className="min-w-0 flex-1 flex-col gap-1 whitespace-normal px-2 py-2 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"><span className="break-words">{labels[item]}</span><Badge variant={state.status === 'achieved' || state.status === 'review' ? 'outline' : 'secondary'} className={`whitespace-normal text-[length:var(--text-caption)] ${state.status === 'achieved' ? 'border-success/30 bg-success/10' : state.status === 'review' ? 'border-warning/30 bg-warning/10' : ''}`}>{profile.isPending ? (vi ? 'Đang kiểm tra…' : 'Checking…') : statusLabels[state.status]}</Badge></TabsTrigger>
            })}</TabsList>
            {INDIVIDUAL_KNOWLEDGE_LEVELS.map(item => {
              const options = modules.filter(module => module.knowledgeLevel === item)
              const state = individualKnowledgeState(entries, selected?.id ?? '', selected?.version, item)
              return <TabsContent key={item} value={item} className="space-y-3 pt-3">
                {state.achieved && state.needsReview && <p className="text-body-sm text-muted-foreground">{vi ? 'Achievement đã đạt vẫn được giữ. Kết quả đánh giá gần nhất cần được xem xét.' : 'Your existing achievement is retained. A later assessment result needs review.'}</p>}
                {provision.isPending && <PageLoader label={vi ? 'Đang tải module…' : 'Loading modules…'} />}
                {provision.isError && <div role="alert" className="space-y-2"><p className="text-body-sm text-destructive">{vi ? 'Không tải được module. Hãy thử lại.' : 'Could not load modules. Please retry.'}</p><Button variant="outline" disabled={Boolean(busy)} onClick={() => void provision.refetch()}>{vi ? 'Thử lại' : 'Retry'}</Button></div>}
                {provision.isSuccess && !options.length && <p className="text-body-sm text-muted-foreground">{vi ? 'Chưa có module đã duyệt ở mức kiến thức này.' : 'No approved modules are available at this knowledge level.'}</p>}
                {provision.isSuccess && <SkillLevelAssessmentPanel key={`${selected.id}:${selected.version}:${item}`} skillId={selected.id} modules={options} skillVersion={selected.version} level={item} levelLabel={labels[item]} vi={vi} />}
                {options.length > 0 && <ModuleCatalogResults items={options.map(module => ({ skillId: selected.id, skillName: selected.name, module }))} view="grid" vi={vi} busy={busy} labels={labels} reasons={reasons} onOpen={({ skillId, module }) => void open(skillId, module)} />}

              </TabsContent>
            })}
          </Tabs>
          {modules.some(module => !module.knowledgeLevel) && <p className="text-body-sm text-muted-foreground">{vi ? 'Một số module chưa cấu hình mức kiến thức; chưa thể dùng cho luồng học này.' : 'Some modules have no configured knowledge level and cannot be used in this learning flow.'}</p>}
          {actionError && <p role="alert" className="text-body-sm text-destructive">{actionError}</p>}
        </div>
    </section>}
  </section>
}
