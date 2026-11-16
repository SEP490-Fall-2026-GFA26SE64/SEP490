import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Check, ChevronRight, Filter, LockKeyhole, MousePointerClick, Plus, RotateCcw, Search, Trash2, Waypoints } from 'lucide-react'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '../../shared/components/ui/Dialog'
import { Input } from '../../shared/components/ui/Input'
import { Heading } from '../../shared/components/typography/Heading'
import { Text } from '../../shared/components/typography/Text'
import { useCopy } from '../subscription/SubscriptionFeedback'
import { branchIds, catalogIndex, CATALOG_LABEL_COPY, emptyClosure, groupByName, lockedPrerequisites, MAX_CATALOG_SELECTION, removeBranch, requiredBy } from './catalogSelection'
import { CATALOG_LABELS, getPlatformCatalog, previewCatalogClosure, type CatalogNode, type CatalogNodeLabel, type PlatformCatalog } from './platformCatalogApi'
import { StarterCatalogGraph } from './StarterCatalogGraph'

export { MAX_CATALOG_SELECTION } from './catalogSelection'
const DRAG_TYPE = 'application/x-adapt-catalog-node'
const LABEL_COPY = CATALOG_LABEL_COPY
const SELECT_CLASS = 'h-10 w-full min-w-0 rounded-md border border-input bg-card px-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
const PARENT_EDGES = new Set(['HAS_ROLE', 'HAS_LEVEL', 'HAS_COMPETENCY'])
const PANEL_STORAGE_KEY = 'starter-catalog-panels'
const PANEL_LIMITS = { left: { min: 200, max: 480, initial: 240 }, right: { min: 220, max: 520, initial: 272 } }
const CENTER_MIN = 360
const HANDLE_WIDTH = 12
type PanelSizes = { left: number; right: number }

function clampPanels(sizes: PanelSizes, total: number, active: keyof PanelSizes = 'right'): PanelSizes {
  const passive = active === 'left' ? 'right' : 'left'
  const limit = (side: keyof PanelSizes, value: number, other: number) => Math.round(Math.max(PANEL_LIMITS[side].min,
    Math.min(PANEL_LIMITS[side].max, total ? total - other - CENTER_MIN - HANDLE_WIDTH * 2 : Infinity, value)))
  const passiveValue = limit(passive, sizes[passive], PANEL_LIMITS[active].min)
  return { [passive]: passiveValue, [active]: limit(active, sizes[active], passiveValue) } as PanelSizes
}

function readPanelSizes(): PanelSizes {
  const fallback = { left: PANEL_LIMITS.left.initial, right: PANEL_LIMITS.right.initial }
  try {
    const saved = JSON.parse(localStorage.getItem(PANEL_STORAGE_KEY) ?? 'null') as Partial<PanelSizes> | null
    return clampPanels({ left: Number(saved?.left) || fallback.left, right: Number(saved?.right) || fallback.right }, 0)
  } catch { return fallback }
}

function PanelResizer({ label, value, side, onResize, onCommit }: {
  label: string; value: number; side: keyof PanelSizes
  onResize: (delta: number) => PanelSizes; onCommit: (sizes: PanelSizes) => void
}) {
  // Moving the handle right grows the left panel but shrinks the right one.
  const direction = side === 'left' ? 1 : -1
  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.preventDefault()
    const handle = event.currentTarget
    const startX = event.clientX
    let latest = onResize(0)
    handle.setPointerCapture(event.pointerId)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    const move = (moveEvent: PointerEvent) => { latest = onResize((moveEvent.clientX - startX) * direction) }
    const end = () => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', end)
      handle.removeEventListener('pointercancel', end)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      onCommit(latest)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', end)
    handle.addEventListener('pointercancel', end)
  }
  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const limits = PANEL_LIMITS[side]
    const step = event.shiftKey ? 64 : 16
    const delta = { ArrowLeft: -step * direction, ArrowRight: step * direction, Home: limits.min - value, End: limits.max - value }[event.key]
    if (delta === undefined) return
    event.preventDefault()
    onCommit(onResize(delta))
  }
  return <div role="separator" aria-orientation="vertical" aria-label={label} aria-valuenow={value} tabIndex={0}
    aria-valuemin={PANEL_LIMITS[side].min} aria-valuemax={PANEL_LIMITS[side].max} title={label}
    onPointerDown={startDrag} onKeyDown={onKeyDown}
    onDoubleClick={() => onCommit(onResize(PANEL_LIMITS[side].initial - value))}
    className="group relative hidden cursor-col-resize touch-none select-none items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex">
    <span aria-hidden="true" className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover:bg-primary/40 group-active:bg-primary/60" />
    <span aria-hidden="true" className="relative h-10 w-1.5 rounded-full bg-border transition-colors group-hover:bg-primary group-focus-visible:bg-primary group-active:bg-primary" />
  </div>
}

export function GuestCatalogPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const c = useCopy()
  const [open, setOpen] = React.useState(false)
  const catalog = useQuery({ queryKey: ['platform-catalog'], queryFn: ({ signal }) => getPlatformCatalog(signal), staleTime: 300_000, retry: false })
  return <section aria-labelledby="catalog-picker-title" className="rounded-xl border border-border bg-background p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-1">
        <Heading level={3} size="card" id="catalog-picker-title" className="flex items-center gap-2"><Waypoints size={18} aria-hidden="true" />
          {c('Starter catalog', 'Catalog khởi tạo')}
        </Heading>
        <Text variant="body-sm" className="text-muted-foreground">{value.length
          ? c(`${value.length} chosen items. Required structure and prerequisites are included automatically.`, `${value.length} mục đã chọn. Tự kèm cấu trúc cha và kỹ năng tiên quyết bắt buộc.`)
          : c('Start with job positions, roles and skills from the platform, or leave your catalog empty.', 'Bắt đầu từ vị trí, vai trò và kỹ năng của nền tảng, hoặc để catalog trống.')}</Text>
      </div>
      <Button type="button" variant={value.length ? 'outline' : 'primary'} onClick={() => setOpen(true)}>
        {c(value.length ? 'Edit catalog' : 'Choose catalog', value.length ? 'Chỉnh catalog' : 'Chọn catalog')}<ArrowRight size={16} aria-hidden="true" />
      </Button>
    </div>
    {value.length > 0 && <div className="mt-3 flex flex-wrap gap-2" aria-label={c('Applied catalog selection', 'Catalog đã áp dụng')}>
      {CATALOG_LABELS.map(label => {
        const total = catalog.data?.nodes.filter(node => node.label === label && value.includes(node.id)).length ?? 0
        return total ? <Badge key={label} variant="outline">{c(...LABEL_COPY[label])}: {total}</Badge> : null
      })}
    </div>}
    <Dialog open={open} onOpenChange={setOpen} ariaLabel={c('Choose starter catalog', 'Chọn catalog khởi tạo')} size="wide"
      className="h-[94dvh] max-h-[94dvh] max-w-[96vw] gap-0 p-3 sm:p-5" containerClassName="p-2 sm:p-3">
      <DialogHeader className="mb-3">
        <DialogTitle><Waypoints size={20} aria-hidden="true" />{c('Build your starter catalog', 'Xây dựng catalog khởi tạo')}</DialogTitle>
        <Text variant="body-sm" className="text-muted-foreground">{c('Explore a branch, add it, then keep only what you need.',
          'Khám phá, thêm một nhánh rồi giữ lại những mục cần thiết.')}</Text>
      </DialogHeader>
      {catalog.isPending ? <p role="status" className="flex-1 p-4">{c('Loading the platform catalog...', 'Đang tải catalog nền tảng...')}</p>
        : catalog.isError ? <div role="alert" className="flex-1 space-y-3 rounded-lg border border-destructive/30 p-4">
          <Text>{c('The platform catalog is unavailable. Your applied selection has not changed.', 'Chưa tải được catalog. Lựa chọn đã áp dụng không thay đổi.')}</Text>
          <Button type="button" variant="outline" onClick={() => void catalog.refetch()}>{c('Retry catalog', 'Tải lại catalog')}</Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{c('Back to registration', 'Về đăng ký')}</Button>
        </div> : catalog.data && open ? <CatalogWorkspace key="draft" catalog={catalog.data} value={value}
          onApply={next => { onChange(next); setOpen(false) }} onCancel={() => setOpen(false)} /> : null}
    </Dialog>
  </section>
}

function CatalogWorkspace({ catalog, value, onApply, onCancel }: {
  catalog: PlatformCatalog; value: string[]; onApply: (value: string[]) => void; onCancel: () => void
}) {
  // A stable copy function lets the memoised panels below skip re-rendering on focus/hover changes.
  const language = useCopy()('en', 'vi')
  const c = React.useCallback<Copy>((en, vi) => language === 'vi' ? vi : en, [language])
  const [draft, setDraft] = React.useState(value)
  const [type, setType] = React.useState<CatalogNodeLabel | 'all'>('JobPosition')
  const [query, setQuery] = React.useState('')
  const [scopes, setScopes] = React.useState<Partial<Record<CatalogNodeLabel, string>>>({})
  const [selectedOnly, setSelectedOnly] = React.useState(false)
  const [focusedId, setFocusedId] = React.useState<string>()
  const [mobileView, setMobileView] = React.useState<'browse' | 'graph' | 'selection'>('browse')
  const [shown, setShown] = React.useState(40)
  const [notice, setNotice] = React.useState('')
  const [dropActive, setDropActive] = React.useState(false)
  const [pinned, setPinned] = React.useState<Set<string>>(() => new Set())
  const nodes = React.useMemo(() => new Map(catalog.nodes.map(node => [node.id, node])), [catalog])
  const selectedKey = React.useMemo(() => [...draft].sort(), [draft])
  const closure = useQuery({
    queryKey: ['platform-catalog-closure', catalog.version, selectedKey],
    queryFn: ({ signal }) => previewCatalogClosure(selectedKey, signal), enabled: draft.length > 0, retry: false,
  })
  const emptyPreview = React.useMemo(() => emptyClosure(), [])
  const preview = !draft.length ? emptyPreview : closure.data
  const effective = React.useMemo(() => new Set(preview?.nodeIds ?? draft), [preview?.nodeIds, draft])
  const explicit = React.useMemo(() => new Set(draft), [draft])
  const copyCounts = React.useMemo(() => {
    const counts: Record<CatalogNodeLabel, number> = { JobPosition: 0, TargetRole: 0, Level: 0, Competency: 0, MicroSkill: 0 }
    for (const id of preview?.nodeIds ?? []) { const label = nodes.get(id)?.label; if (label) counts[label] += 1 }
    return counts
  }, [preview?.nodeIds, nodes])
  const ready = draft.length === 0 || closure.isSuccess && !closure.isFetching
  const focused = focusedId ? nodes.get(focusedId) : undefined
  const scopeSets = React.useMemo(() => Object.values(scopes).filter((id): id is string => !!id).map(id => branchIds(catalog, id)), [catalog, scopes])
  const results = React.useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    return catalog.nodes.filter(node => (type === 'all' || node.label === type)
      && scopeSets.every(ids => ids.has(node.id))
      && (!selectedOnly || effective.has(node.id))
      && (!term || `${node.name} ${node.code ?? ''}`.toLocaleLowerCase().includes(term)))
  }, [catalog, type, scopeSets, selectedOnly, effective, query])
  const graphIds = React.useMemo(() => {
    const index = catalogIndex(catalog)
    const anchors = results.length ? Object.values(scopes).filter((id): id is string => !!id) : []
    const visible = new Set([...pinned, ...results.map(node => node.id), ...anchors])
    // Keep parent connectors as context without treating them as chosen.
    const pending = [...visible]
    while (pending.length) for (const edge of index.incoming.get(pending.pop()!) ?? [])
      if (PARENT_EDGES.has(edge.type) && !visible.has(edge.from)) { visible.add(edge.from); pending.push(edge.from) }
    // Prerequisites are shown on their own; climbing their (often shared) parents would flood the canvas.
    pending.push(...visible)
    while (pending.length) for (const edge of index.outgoing.get(pending.pop()!) ?? [])
      if (edge.type === 'HAS_SKILL_PREREQUISITE' && !visible.has(edge.to)) { visible.add(edge.to); pending.push(edge.to) }
    return visible
  }, [catalog, results, pinned, scopes])
  const scopeOptions = React.useMemo(() => CATALOG_LABELS.slice(0, 4).map((label, index) => {
    const parents = CATALOG_LABELS.slice(0, index).flatMap(parent => scopes[parent] ? [branchIds(catalog, scopes[parent]!)] : [])
    return catalog.nodes.filter(node => node.label === label && parents.every(ids => ids.has(node.id)))
  }), [catalog, scopes])
  const covers = (id: string) => {
    let all = true, some = false
    for (const member of branchIds(catalog, id)) { if (effective.has(member)) some = true; else all = false }
    return { all, some }
  }

  function add(id: string) {
    const branch = branchIds(catalog, id)
    const next = [...new Set([...draft, ...branch])]
    if (next.length > MAX_CATALOG_SELECTION) {
      setNotice(c('This branch exceeds the 300 chosen-item limit. Choose a smaller role, level or competency.', 'Nhánh này vượt giới hạn 300 mục chọn. Hãy chọn vai trò, cấp độ hoặc năng lực nhỏ hơn.'))
      return
    }
    setDraft(next)
    setFocusedId(id)
  }

  function remove(...targets: string[]) {
    const remaining = targets.reduce((current, id) => removeBranch(catalog, current, id), draft)
    const remainingEffective = new Set(remaining)
    const pending = [...remaining]
    const outgoing = catalogIndex(catalog).outgoing
    while (pending.length) {
      const current = pending.pop()!
      for (const edge of outgoing.get(current) ?? []) if (edge.type === 'HAS_SKILL_PREREQUISITE' && !remainingEffective.has(edge.to)) {
        remainingEffective.add(edge.to); pending.push(edge.to)
      }
    }
    if (targets.some(id => remainingEffective.has(id))) {
      setNotice(c('Remove the dependent skills before removing this prerequisite.', 'Hãy bỏ các kỹ năng phụ thuộc trước khi bỏ kỹ năng tiên quyết này.'))
      return
    }
    setDraft(remaining)
    setNotice(c('Item or branch removed.', 'Đã bỏ mục hoặc nhánh.'))
  }

  function explore(node: CatalogNode) {
    setFocusedId(node.id)
    const index = CATALOG_LABELS.indexOf(node.label)
    if (node.label === 'MicroSkill') { setMobileView('graph'); return }
    // Drilling deeper keeps what is already on the graph; starting from a job position begins a fresh view.
    setPinned(node.label === 'JobPosition' ? new Set() : new Set(graphIds))
    setScopes(previous => Object.fromEntries([...Object.entries(previous).filter(([label]) => CATALOG_LABELS.indexOf(label as CatalogNodeLabel) < index), [node.label, node.id]]))
    setType(CATALOG_LABELS[index + 1])
    setQuery('')
    setShown(40)
  }

  function clearFilters() { setType('all'); setScopes({}); setQuery(''); setSelectedOnly(false); setShown(40); setPinned(new Set()) }
  const latest = React.useRef({ add, remove, explore })
  React.useLayoutEffect(() => { latest.current = { add, remove, explore } })
  const actions = React.useMemo<Actions>(() => ({
    add: id => latest.current.add(id),
    remove: (...ids) => latest.current.remove(...ids),
    explore: node => latest.current.explore(node),
    focus: id => setFocusedId(id),
    inspect: id => { setFocusedId(id); setMobileView('graph') },
    clearFocus: () => setFocusedId(undefined),
  }), [])
  const exploreId = React.useCallback((id: string) => { const node = nodes.get(id); if (node) actions.explore(node) }, [nodes, actions])
  const selectScope = React.useCallback((label: CatalogNodeLabel, index: number, id: string) => {
    setScopes(previous => ({ ...Object.fromEntries(Object.entries(previous).filter(([key]) => CATALOG_LABELS.indexOf(key as CatalogNodeLabel) < index)), [label]: id }))
    setType(CATALOG_LABELS[index + 1]); setShown(40); setPinned(new Set())
  }, [])
  const panel = (key: typeof mobileView) => `${mobileView === key ? 'flex' : 'hidden lg:flex'} min-h-0 min-w-0 flex-col`
  const layout = React.useRef<HTMLDivElement>(null)
  const [panelSizes, setPanelSizes] = React.useState(readPanelSizes)
  // Drag updates CSS variables directly so the heavy workspace does not re-render on every pointer move.
  const resizeTo = (side: keyof PanelSizes) => (delta: number) => {
    const grid = layout.current
    const next = clampPanels({ ...panelSizes, [side]: panelSizes[side] + delta }, grid?.clientWidth ?? 0, side)
    grid?.style.setProperty('--catalog-left', `${next.left}px`)
    grid?.style.setProperty('--catalog-right', `${next.right}px`)
    return next
  }
  const commitPanels = (next: PanelSizes) => {
    setPanelSizes(next)
    try { localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(next)) } catch { /* storage unavailable: keep in memory */ }
  }

  return <>
    <div role="group" aria-label={c('Catalog panels', 'Khu vực catalog')} className="mb-3 flex gap-1 rounded-lg bg-muted p-1 lg:hidden">
      {(['browse', 'graph', 'selection'] as const).map((key, index) => <Button key={key} type="button" size="sm"
        variant={mobileView === key ? 'primary' : 'ghost'} aria-pressed={mobileView === key} className="flex-1"
        onClick={() => setMobileView(key)}>{[c('Browse', 'Khám phá'), c('Graph', 'Graph'), c('Your catalog', 'Đã chọn')][index]}</Button>)}
    </div>
    <div ref={layout} style={{ '--catalog-left': `${panelSizes.left}px`, '--catalog-right': `${panelSizes.right}px` } as React.CSSProperties}
      className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[var(--catalog-left)_0.75rem_minmax(0,1fr)_0.75rem_var(--catalog-right)] lg:gap-0">
      <aside className={`${panel('browse')} overflow-y-auto rounded-lg border border-border bg-background p-3`}>
        <Heading level={3} size="card" className="mb-3 flex items-center gap-2"><Filter size={16} aria-hidden="true" />{c('Explore catalog', 'Khám phá catalog')}</Heading>
        <div className="space-y-2">
          <label className="relative block"><span className="sr-only">{c('Search catalog items', 'Tìm mục catalog')}</span>
            <Search size={16} aria-hidden="true" className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={event => { setQuery(event.target.value); setShown(40); setPinned(new Set()) }} placeholder={c('Name or code', 'Tên hoặc mã')} className="pl-8" />
          </label>
          <label className="block text-caption">{c('Item type', 'Loại mục')}
            <select className={SELECT_CLASS} value={type} onChange={event => { setType(event.target.value as typeof type); setShown(40); setPinned(new Set()) }}>
              <option value="all">{c('All types', 'Tất cả loại')}</option>
              {CATALOG_LABELS.map(label => <option value={label} key={label}>{c(...LABEL_COPY[label])}</option>)}
            </select>
          </label>
          {CATALOG_LABELS.slice(0, 4).map((label, index) => <ScopeSelect key={label} label={label} index={index} value={scopes[label] ?? ''}
            options={scopeOptions[index]} onSelect={selectScope} c={c} />)}
          <label className="flex items-center gap-2 py-1 text-body-sm"><input type="checkbox" checked={selectedOnly} onChange={event => { setSelectedOnly(event.target.checked); setPinned(new Set()) }} />
            {c('Selected only', 'Chỉ mục đã chọn')}</label>
          <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>{c('Clear filters', 'Xóa bộ lọc')}</Button>
        </div>
        <p role="status" className="my-2 text-caption text-muted-foreground">{results.length} {c('matching items', 'mục phù hợp')}</p>
        <ul aria-label={c('Platform catalog items', 'Các mục catalog nền tảng')} className="space-y-2">
          {results.slice(0, shown).map(node => {
            const { all, some } = covers(node.id)
            return <ResultRow key={node.id} node={node} focused={focusedId === node.id} all={all} some={some} actions={actions} c={c} />
          })}
        </ul>
        {!results.length && <Text variant="body-sm" className="py-4 text-muted-foreground">{c('No matching items. Try clearing filters.', 'Không có mục phù hợp. Hãy thử xóa bộ lọc.')}</Text>}
        {shown < results.length && <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => setShown(count => count + 40)}>{c('Show more', 'Xem thêm')}</Button>}
      </aside>
      <PanelResizer side="left" value={panelSizes.left} onResize={resizeTo('left')} onCommit={commitPanels}
        label={c('Resize explore catalog panel', 'Đổi kích thước khu khám phá catalog')} />
      <div className={`${panel('graph')} gap-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Heading level={3} size="card" className="flex items-center gap-2"><Waypoints size={16} aria-hidden="true" />{c('Explore graph', 'Khám phá graph')}</Heading>
          <div className="flex flex-wrap items-center gap-2">
            {pinned.size > 0 && <Button type="button" size="sm" variant="ghost" onClick={() => setPinned(new Set())}>
              <RotateCcw size={14} aria-hidden="true" />{c('Show current branch only', 'Chỉ hiện nhánh hiện tại')}</Button>}
            <Text variant="caption" className="hidden items-center gap-1 text-muted-foreground xl:inline-flex"><MousePointerClick size={14} aria-hidden="true" />
              {c('Click to highlight · double-click to explore · scroll to zoom', 'Nhấn để làm nổi bật · nhấn đúp để khám phá · cuộn để phóng to')}</Text>
          </div>
        </div>
        <StarterCatalogGraph catalog={catalog} ids={graphIds} selected={effective} focused={focused} onFocus={setFocusedId}
          onClearFocus={actions.clearFocus} onExplore={exploreId} copy={c} />
        <div className="max-h-44 overflow-y-auto rounded-lg border border-border bg-card p-3 shadow-sm">
          {focused ? <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2"><Heading level={4} size="card" className="break-words">{focused.name}</Heading>
                <Badge variant="outline">{c(...LABEL_COPY[focused.label])}</Badge>
                {effective.has(focused.id) && <Badge variant="secondary"><Check size={12} aria-hidden="true" />{c('In your catalog', 'Trong catalog')}</Badge>}</div>
              {focused.description && <Text variant="body-sm" className="text-muted-foreground">{focused.description}</Text>}
            </div>
            <div className="flex flex-wrap gap-2">{focused.label !== 'MicroSkill' && <Button type="button" size="sm" variant="outline" onClick={() => explore(focused)}>{c('Explore branch', 'Khám phá nhánh')}</Button>}
              <Button type="button" size="sm" disabled={covers(focused.id).all} onClick={() => add(focused.id)}><Plus size={14} aria-hidden="true" />{c('Add branch', 'Thêm nhánh')}</Button></div></div>
            : <Text variant="body-sm" className="text-muted-foreground">{c('Select a node or a list item to inspect it. Filters only change what you see, not your catalog.', 'Chọn node hoặc mục trong danh sách để xem chi tiết. Bộ lọc không thay đổi catalog đã chọn.')}</Text>}
        </div>
      </div>
      <PanelResizer side="right" value={panelSizes.right} onResize={resizeTo('right')} onCommit={commitPanels}
        label={c('Resize your catalog panel', 'Đổi kích thước khu catalog của bạn')} />
      <aside className={`${panel('selection')} gap-3 rounded-lg border p-3 ${dropActive ? 'border-primary bg-secondary' : 'border-border bg-background'}`}
        data-testid="catalog-drop-zone"
        onDragOver={event => { if (event.dataTransfer.types.includes(DRAG_TYPE)) { event.preventDefault(); setDropActive(true) } }}
        onDragLeave={() => setDropActive(false)} onDrop={event => { event.preventDefault(); setDropActive(false); const id = event.dataTransfer.getData(DRAG_TYPE); if (nodes.has(id)) add(id) }}>
        <div className="flex items-center justify-between gap-2"><Heading level={3} size="card">{c('Your catalog', 'Catalog của bạn')}</Heading><Badge variant="outline">{draft.length}/300</Badge></div>
        <Text variant="caption" className="text-muted-foreground">{c('Remove a chosen parent to remove its branch. Locked dependencies explain what still needs them.', 'Bỏ mục cha đã chọn để bỏ nhánh. Mục khóa cho biết phần nào còn cần chúng.')}</Text>
        <Button type="button" size="sm" variant="ghost" disabled={!draft.length} onClick={() => { setDraft([]); setNotice(c('Selection cleared.', 'Đã xóa lựa chọn.')) }}><Trash2 size={14} aria-hidden="true" />{c('Clear selection', 'Xóa lựa chọn')}</Button>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!draft.length ? <Text variant="body-sm" className="text-muted-foreground">{c('Nothing selected. Your workspace will start with an empty catalog.', 'Chưa chọn mục nào. Không gian sẽ bắt đầu với catalog trống.')}</Text>
            : <SelectionList catalog={catalog} effective={effective} explicit={explicit} ready={ready} actions={actions} c={c} />}
        </div>
        <div role="status" aria-live="polite" className="rounded-lg border border-border bg-card p-3 text-caption">
          {draft.length > 0 && closure.isError ? <><p className="text-destructive">{c('Could not preview this selection. Retry or clear it before applying.', 'Chưa xem trước được lựa chọn. Thử lại hoặc xóa trước khi áp dụng.')}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => void closure.refetch()}>{c('Retry preview', 'Thử lại xem trước')}</Button></>
            : !ready ? c('Calculating what will be copied...', 'Đang tính các mục sẽ được sao chép...')
              : <span data-testid="catalog-closure-summary">{c(
                `Will copy ${plural(copyCounts.JobPosition, 'job position')}, ${plural(copyCounts.TargetRole, 'target role')}, ${plural(copyCounts.Competency, 'competency', 'competencies')} and ${plural(copyCounts.MicroSkill, 'micro skill')}`,
                `Sẽ sao chép ${copyCounts.JobPosition} job position, ${copyCounts.TargetRole} target role, ${copyCounts.Competency} competency và ${copyCounts.MicroSkill} micro skill`)}</span>}
        </div>
      </aside>
    </div>
    <p role="status" aria-live="polite" className="min-h-5 pt-2 text-caption text-muted-foreground">{notice}</p>
    <DialogFooter className="mt-2 pt-3">
      <Button type="button" variant="outline" onClick={onCancel}>{c('Cancel', 'Hủy')}</Button>
      <Button type="button" disabled={!ready} onClick={() => onApply(draft)}>{c('Apply catalog', 'Áp dụng catalog')}<Check size={16} aria-hidden="true" /></Button>
    </DialogFooter>
  </>
}

type Copy = (en: string, vi: string) => string
type Actions = {
  add: (id: string) => void
  remove: (...ids: string[]) => void
  explore: (node: CatalogNode) => void
  focus: (id: string) => void
  inspect: (id: string) => void
  clearFocus: () => void
}

const ScopeSelect = React.memo(function ScopeSelect({ label, index, value, options, onSelect, c }: {
  label: CatalogNodeLabel; index: number; value: string; options: CatalogNode[]
  onSelect: (label: CatalogNodeLabel, index: number, id: string) => void; c: Copy
}) {
  return <label className="block text-caption">{c(...LABEL_COPY[label])}
    <select className={SELECT_CLASS} value={value} onChange={event => onSelect(label, index, event.target.value)}>
      <option value="">{c('All', 'T?t c?')}</option>{options.map(node => <option key={node.id} value={node.id}>{node.name}</option>)}</select>
  </label>
})

const ResultRow = React.memo(function ResultRow({ node, focused, all, some, actions, c }: {
  node: CatalogNode; focused: boolean; all: boolean; some: boolean; actions: Actions; c: Copy
}) {
  return <li draggable onDragStart={event => { event.dataTransfer.setData(DRAG_TYPE, node.id); event.dataTransfer.effectAllowed = 'copy' }}
    className={`rounded-lg border bg-card p-2 [content-visibility:auto] [contain-intrinsic-size:auto_4.5rem] ${focused ? 'border-primary' : 'border-border'}`}>
    <button type="button" className="block w-full break-words text-left text-body-sm font-medium hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => actions.focus(node.id)}>{node.name}</button>
    <p className="mt-1 break-words text-caption text-muted-foreground">{c(...LABEL_COPY[node.label])}</p>
    <div className="mt-2 flex flex-wrap items-center gap-1">
      <Button type="button" size="sm" variant={all ? 'secondary' : 'outline'} aria-label={`${c('Add', 'Th?m')} ${node.name}`}
        disabled={all} onClick={() => actions.add(node.id)}>{all ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
        {all ? c('Added', '?? th?m') : some ? c('Add remaining', 'Th?m ph?n c?n l?i') : c('Add branch', 'Th?m nh?nh')}</Button>
      <Button type="button" size="sm" variant="ghost" aria-label={`${c('Explore', 'Kh?m ph?')} ${node.name}`} onClick={() => actions.explore(node)}><ChevronRight size={16} aria-hidden="true" /></Button>
    </div>
    {some && !all && <span className="text-caption text-muted-foreground">{c('Partially selected', '?? ch?n m?t ph?n')}</span>}
  </li>
})

// Re-renders only when the selection itself changes, never on graph focus or filter changes.
const SelectionList = React.memo(function SelectionList({ catalog, effective, explicit, ready, actions, c }: {
  catalog: PlatformCatalog; effective: Set<string>; explicit: Set<string>; ready: boolean; actions: Actions; c: Copy
}) {
  const { byId } = catalogIndex(catalog)
  const name = (id: string) => byId.get(id)?.name ?? id
  const levelRoles = React.useMemo(() => {
    const roles = new Map<string, string[]>()
    for (const edge of catalog.edges) if (edge.type === 'HAS_LEVEL') {
      const list = roles.get(edge.to)
      if (list) list.push(edge.from); else roles.set(edge.to, [edge.from])
    }
    return roles
  }, [catalog])
  const locked = React.useMemo(() => lockedPrerequisites(catalog, effective), [catalog, effective])
  const isLocked = (id: string) => !explicit.has(id) || locked.has(id)
  const groups = React.useMemo(() => {
    const byLabel = new Map<CatalogNodeLabel, CatalogNode[]>(CATALOG_LABELS.map(label => [label, []]))
    for (const node of catalog.nodes) if (effective.has(node.id)) byLabel.get(node.label)?.push(node)
    return byLabel
  }, [catalog, effective])
  return <ul aria-label={c('Selected catalog items', 'C?c m?c ?? ch?n')} className="space-y-2">
    {CATALOG_LABELS.map(label => {
      const items = groups.get(label) ?? []
      // Levels repeat per role (Junior/Middle/Senior ? N roles), so collapse them into one row per distinct name.
      const levelGroups = label === 'Level' ? groupByName(items) : undefined
      return items.length ? <li key={label}><details open className="group rounded-lg border border-border bg-card shadow-xs">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-2 text-body-sm font-semibold [&::-webkit-details-marker]:hidden">
          <ChevronRight size={14} aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-90" />
          {c(...LABEL_COPY[label])}{' '}<Badge variant="outline">{levelGroups?.length ?? items.length}</Badge>
        </summary>
        <ul className="space-y-2 p-2 pt-0">
          {levelGroups ? levelGroups.map(group => {
            const roleIds = new Set(group.items.flatMap(node => levelRoles.get(node.id) ?? []).filter(id => effective.has(id)))
            const removable = group.items.filter(node => !isLocked(node.id)).map(node => node.id)
            const roleNames = [...roleIds].map(name).join(', ')
            return <li key={group.name} className="rounded-lg border border-border bg-background p-2 [content-visibility:auto] [contain-intrinsic-size:auto_4.5rem]">
              <div className="flex items-start justify-between gap-2">
                <button type="button" className="min-w-0 break-words text-left text-body-sm font-medium hover:text-primary"
                  onClick={() => actions.inspect(group.items[0].id)}>{group.name}</button>
                <Button type="button" variant="ghost" size="sm" disabled={!removable.length || !ready} aria-label={`${c('Remove', 'B?')} ${group.name}`}
                  title={removable.length ? c(`Remove ${group.name} from every role`, `B? ${group.name} kh?i m?i vai tr?`) : undefined}
                  onClick={() => actions.remove(...removable)}>
                  {removable.length ? <Trash2 size={14} aria-hidden="true" /> : <LockKeyhole size={14} aria-hidden="true" />}</Button>
              </div>
              <p className="line-clamp-2 break-words text-caption text-muted-foreground" title={roleNames}>
                {c(`${roleIds.size} target role${roleIds.size === 1 ? '' : 's'}`, `${roleIds.size} vai tr? m?c ti?u`)}{roleIds.size ? `: ${roleNames}` : ''}</p>
            </li>
          }) : items.map(node => {
            const nodeLocked = isLocked(node.id)
            return <li key={node.id} className="rounded-lg border border-border bg-background p-2 [content-visibility:auto] [contain-intrinsic-size:auto_4.5rem]">
              <div className="flex items-start justify-between gap-2"><button type="button" className="min-w-0 break-words text-left text-body-sm font-medium hover:text-primary" onClick={() => actions.inspect(node.id)}>{node.name}</button>
                <Button type="button" variant="ghost" size="sm" disabled={nodeLocked || !ready} aria-label={`${c('Remove', 'B?')} ${node.name}`} onClick={() => actions.remove(node.id)}>
                  {nodeLocked ? <LockKeyhole size={14} aria-hidden="true" /> : <Trash2 size={14} aria-hidden="true" />}</Button></div>
              <p className="text-caption text-muted-foreground">{c(...LABEL_COPY[node.label])}</p>
              {nodeLocked && <p className="mt-1 break-words text-caption text-muted-foreground">{c('Required by', 'B?t bu?c v?')}: {requiredBy(catalog, effective, node.id).map(name).join(', ') || c('selected structure', 'c?u tr?c ?? ch?n')}</p>}
            </li>
          })}
        </ul>
      </details></li> : null
    })}
  </ul>
})

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`
}
