import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Filter, MousePointerClick, RotateCcw, Search, ShieldAlert, Waypoints } from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Input } from '../../../shared/components/ui/Input'
import { PageLoader } from '../../../shared/components/ui/PageLoader'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { useCopy } from '../../subscription/SubscriptionFeedback'
import { catalogIndex, CATALOG_LABEL_COPY } from '../../guest/catalogSelection'
import { KNOWLEDGE_GRAPH_LABELS, type CatalogNode, type CatalogNodeLabel, type PlatformCatalog } from '../../guest/platformCatalogApi'
import { StarterCatalogGraph } from '../../guest/StarterCatalogGraph'
import { DEFAULT_FILTERS, knowledgeGraphView, LAYER_LABELS, SCOPE_LABELS, scopeOptions, withScope, type KnowledgeGraphFilters } from './knowledgeGraphFilters'
import { fetchOrganizationKnowledgeGraph, KnowledgeGraphApiError } from './organizationKnowledgeGraphApi'

type Copy = (en: string, vi: string) => string
const SELECT_CLASS = 'h-10 w-full min-w-0 rounded-md border border-input bg-card px-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
const RELATION_COPY: Record<string, { out: [string, string]; in: [string, string] }> = {
  HAS_ROLE: { out: ['Target roles', 'Vai trò mục tiêu'], in: ['Job position', 'Vị trí công việc'] },
  HAS_LEVEL: { out: ['Levels', 'Cấp độ'], in: ['Target role', 'Vai trò mục tiêu'] },
  HAS_COMPETENCY: { out: ['Competencies', 'Năng lực'], in: ['Levels', 'Cấp độ'] },
  HAS_SKILL: { out: ['Micro skills', 'Kỹ năng vi mô'], in: ['Competencies', 'Năng lực'] },
  REQUIRES_SKILL: { out: ['Required skills', 'Kỹ năng yêu cầu'], in: ['Required by levels', 'Được yêu cầu bởi cấp độ'] },
  HAS_SKILL_PREREQUISITE: { out: ['Prerequisites', 'Kỹ năng tiên quyết'], in: ['Prerequisite for', 'Là tiên quyết của'] },
  TEACHES: { out: ['Teaches', 'Giảng dạy'], in: ['Learning modules', 'Học phần'] },
  REQUIRES_CERTIFICATE: { out: ['Certificates', 'Chứng chỉ'], in: ['Required by skills', 'Được yêu cầu bởi kỹ năng'] },
}
const LAYER_COPY: Record<string, [string, string]> = {
  Competency: ['Competencies', 'Năng lực'], LearningModule: ['Learning modules', 'Học phần'], Certificate: ['Certificates', 'Chứng chỉ'],
}

export function OrganizationKnowledgeGraphExplorer({ organizationId }: { organizationId: string | null | undefined }) {
  const c = useCopy()
  const graph = useQuery({
    queryKey: ['organization-knowledge-graph', organizationId],
    queryFn: ({ signal }) => fetchOrganizationKnowledgeGraph(organizationId, signal),
    enabled: !!organizationId,
  })

  if (!organizationId) return <Notice tone="error" title={c('No organization selected', 'Chưa chọn tổ chức')}
    message={c('Sign in to an organization workspace to view its knowledge graph.', 'Hãy đăng nhập không gian của tổ chức để xem knowledge graph.')} />
  if (graph.isPending) return <PageLoader label={c('Loading the organization knowledge graph…', 'Đang tải knowledge graph của tổ chức…')} />
  if (graph.isError) {
    const status = graph.error instanceof KnowledgeGraphApiError ? graph.error.status : 0
    const forbidden = status === 401 || status === 403
    return <Notice tone="error" title={forbidden ? c('Access denied', 'Không có quyền truy cập') : c('Could not load the knowledge graph', 'Không tải được knowledge graph')}
      message={forbidden
        ? c('Only an Organization Administrator of this organization can view its knowledge graph.', 'Chỉ Quản trị viên của tổ chức này mới được xem knowledge graph.')
        : c('The knowledge graph service did not respond. Please try again.', 'Dịch vụ knowledge graph chưa phản hồi. Vui lòng thử lại.')}
      retry={forbidden ? undefined : () => void graph.refetch()} c={c} />
  }
  if (!graph.data.nodes.length) return <Notice tone="empty" title={c('The knowledge graph is empty', 'Knowledge graph đang trống')}
    message={c('This organization has no active job positions, skills, learning modules or certificates yet.', 'Tổ chức chưa có vị trí công việc, kỹ năng, học phần hoặc chứng chỉ đang hoạt động.')} />
  return <Explorer catalog={graph.data} c={c} />
}

function Notice({ tone, title, message, retry, c }: { tone: 'error' | 'empty'; title: string; message: string; retry?: () => void; c?: Copy }) {
  return <div role={tone === 'error' ? 'alert' : 'status'}
    className={`space-y-3 rounded-lg border bg-card p-5 ${tone === 'error' ? 'border-destructive/30' : 'border-border'}`}>
    <Heading level={2} size="card" className="flex items-center gap-2">
      {tone === 'error' ? <ShieldAlert size={18} aria-hidden="true" className="text-destructive" /> : <Waypoints size={18} aria-hidden="true" className="text-primary" />}{title}</Heading>
    <Text variant="body-sm" className="text-muted-foreground">{message}</Text>
    {retry && c && <Button type="button" variant="outline" size="sm" onClick={retry}>{c('Try again', 'Thử lại')}</Button>}
  </div>
}

function Explorer({ catalog, c }: { catalog: PlatformCatalog; c: Copy }) {
  const [filters, setFilters] = React.useState<KnowledgeGraphFilters>(DEFAULT_FILTERS)
  const [pinned, setPinned] = React.useState<ReadonlySet<string>>(new Set())
  const [focusedId, setFocusedId] = React.useState<string>()
  const [mobileView, setMobileView] = React.useState<'filters' | 'graph'>('graph')
  const index = React.useMemo(() => catalogIndex(catalog), [catalog])
  const view = React.useMemo(() => knowledgeGraphView(catalog, filters, pinned), [catalog, filters, pinned])
  const hits = React.useMemo(() => new Set(view.hits), [view.hits])
  const focused = focusedId ? index.byId.get(focusedId) : undefined
  const update = (patch: Partial<KnowledgeGraphFilters>) => { setFilters(previous => ({ ...previous, ...patch })); setPinned(new Set()) }

  const explore = React.useCallback((node: CatalogNode) => {
    setFocusedId(node.id)
    const depth = SCOPE_LABELS.indexOf(node.label)
    if (depth < 0) return
    // Drilling deeper keeps the current canvas; starting from a job position begins a fresh view.
    setPinned(node.label === 'JobPosition' ? new Set() : new Set(view.ids))
    setFilters(previous => ({ ...previous, query: '', scopes: withScope(previous.scopes, node.label, node.id),
      type: KNOWLEDGE_GRAPH_LABELS[KNOWLEDGE_GRAPH_LABELS.indexOf(node.label) + 1] ?? 'all' }))
  }, [view.ids])
  const exploreId = React.useCallback((id: string) => { const node = index.byId.get(id); if (node) explore(node) }, [index, explore])
  const clearFocus = React.useCallback(() => setFocusedId(undefined), [])
  const panel = (key: typeof mobileView) => `${mobileView === key ? 'flex' : 'hidden lg:flex'} min-h-0 min-w-0 flex-col`
  const counts = React.useMemo(() => {
    const result = new Map<CatalogNodeLabel, number>()
    for (const node of catalog.nodes) result.set(node.label, (result.get(node.label) ?? 0) + 1)
    return result
  }, [catalog])

  return <div className="flex min-h-0 flex-1 flex-col">
    <div role="group" aria-label={c('Knowledge graph panels', 'Khu vực knowledge graph')} className="mb-3 flex gap-1 rounded-lg bg-muted p-1 lg:hidden">
      {(['filters', 'graph'] as const).map(key => <Button key={key} type="button" size="sm" className="flex-1"
        variant={mobileView === key ? 'primary' : 'ghost'} aria-pressed={mobileView === key} onClick={() => setMobileView(key)}>
        {key === 'filters' ? c('Filters', 'Bộ lọc') : c('Graph', 'Graph')}</Button>)}
    </div>
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside aria-label={c('Knowledge graph filters', 'Bộ lọc knowledge graph')} className={`${panel('filters')} gap-3 overflow-y-auto rounded-lg border border-border bg-card p-4 shadow-sm`}>
        <Heading level={2} size="card" className="flex items-center gap-2"><Filter size={16} aria-hidden="true" />{c('Filters', 'Bộ lọc')}</Heading>
        <label className="relative block"><span className="sr-only">{c('Search nodes', 'Tìm node')}</span>
          <Search size={16} aria-hidden="true" className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={filters.query} onChange={event => update({ query: event.target.value })} placeholder={c('Name or code', 'Tên hoặc mã')} className="pl-8" />
        </label>
        <label className="block text-caption">{c('Node type', 'Loại node')}
          <select className={SELECT_CLASS} value={filters.type} onChange={event => update({ type: event.target.value as KnowledgeGraphFilters['type'] })}>
            <option value="all">{c('All types', 'Tất cả loại')}</option>
            {KNOWLEDGE_GRAPH_LABELS.map(label => <option key={label} value={label}>{c(...CATALOG_LABEL_COPY[label])} ({counts.get(label) ?? 0})</option>)}
          </select>
        </label>
        {SCOPE_LABELS.map(label => <label key={label} className="block text-caption">{c(...CATALOG_LABEL_COPY[label])}
          <select className={SELECT_CLASS} value={filters.scopes[label] ?? ''} onChange={event => update({ scopes: withScope(filters.scopes, label, event.target.value) })}>
            <option value="">{c('All', 'Tất cả')}</option>
            {scopeOptions(catalog, filters.scopes, label).map(node => <option key={node.id} value={node.id}>{node.name}</option>)}
          </select>
        </label>)}
        <fieldset className="space-y-1">
          <legend className="text-caption">{c('Show layers', 'Hiển thị lớp')}</legend>
          {LAYER_LABELS.map(label => <label key={label} className="flex items-center gap-2 text-body-sm">
            <input type="checkbox" checked={!filters.hidden.has(label)} onChange={event => {
              const hidden = new Set(filters.hidden)
              if (event.target.checked) hidden.delete(label); else hidden.add(label)
              update({ hidden })
            }} />{c(...LAYER_COPY[label])}</label>)}
        </fieldset>
        <Button type="button" size="sm" variant="ghost" onClick={() => { setFilters(DEFAULT_FILTERS); setPinned(new Set()) }}>
          <RotateCcw size={14} aria-hidden="true" />{c('Clear filters', 'Xóa bộ lọc')}</Button>
        <p role="status" aria-live="polite" className="text-caption text-muted-foreground" data-testid="knowledge-graph-summary">
          {filters.query.trim()
            ? c(`${view.hits.size} highlighted of ${view.ids.size} nodes shown`, `${view.hits.size} node nổi bật trong ${view.ids.size} node đang hiển thị`)
            : c(`${view.ids.size} of ${catalog.nodes.length} nodes shown`, `Đang hiển thị ${view.ids.size}/${catalog.nodes.length} node`)}
        </p>
      </aside>
      <section aria-label={c('Knowledge graph canvas', 'Canvas knowledge graph')} className={`${panel('graph')} min-h-[32rem] gap-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Heading level={2} size="card" className="flex items-center gap-2"><Waypoints size={16} aria-hidden="true" />{c('Organization knowledge graph', 'Knowledge graph của tổ chức')}</Heading>
          <div className="flex flex-wrap items-center gap-2">
            {pinned.size > 0 && <Button type="button" size="sm" variant="ghost" onClick={() => setPinned(new Set())}>
              <RotateCcw size={14} aria-hidden="true" />{c('Show current branch only', 'Chỉ hiện nhánh hiện tại')}</Button>}
            <Text variant="caption" className="hidden items-center gap-1 text-muted-foreground xl:inline-flex"><MousePointerClick size={14} aria-hidden="true" />
              {c('Click to highlight · double-click to explore · scroll to zoom', 'Nhấn để làm nổi bật · nhấn đúp để khám phá · cuộn để phóng to')}</Text>
          </div>
        </div>
        {view.ids.size ? <StarterCatalogGraph catalog={catalog} ids={view.ids} selected={hits} focused={focused} onFocus={setFocusedId}
          onClearFocus={clearFocus} onExplore={exploreId} copy={c} labels={KNOWLEDGE_GRAPH_LABELS} readOnly />
          : <div role="status" className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-background p-6 text-center">
            <Text variant="body-sm" className="text-muted-foreground">{c('No nodes match these filters. Try clearing filters.', 'Không có node phù hợp. Hãy thử xóa bộ lọc.')}</Text></div>}
        <NodeDetails node={focused} catalog={catalog} onFocus={setFocusedId} onExplore={explore} c={c} />
      </section>
    </div>
  </div>
}

function NodeDetails({ node, catalog, onFocus, onExplore, c }: {
  node: CatalogNode | undefined; catalog: PlatformCatalog; onFocus: (id: string) => void; onExplore: (node: CatalogNode) => void; c: Copy
}) {
  const index = React.useMemo(() => catalogIndex(catalog), [catalog])
  const groups = React.useMemo(() => {
    if (!node) return []
    const result = new Map<string, CatalogNode[]>()
    const add = (key: string, id: string) => { const target = index.byId.get(id); if (target) result.set(key, [...(result.get(key) ?? []), target]) }
    for (const edge of index.outgoing.get(node.id) ?? []) add(`out:${edge.type}`, edge.to)
    for (const edge of index.incoming.get(node.id) ?? []) add(`in:${edge.type}`, edge.from)
    return [...result.entries()].map(([key, nodes]) => {
      const [direction, type] = key.split(':') as ['out' | 'in', string]
      return { key, title: RELATION_COPY[type]?.[direction] ?? [type, type], nodes: nodes.sort((a, b) => a.name.localeCompare(b.name)) }
    })
  }, [node, index])

  return <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-card p-3 shadow-sm" data-testid="knowledge-graph-details">
    {node ? <div className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Heading level={3} size="card" className="break-words">{node.name}</Heading>
          <Badge variant="outline">{c(...CATALOG_LABEL_COPY[node.label])}</Badge>
          {node.code && <Badge variant="secondary">{node.code}</Badge>}
          {node.status && <Badge variant="outline">{node.status}</Badge>}
          {node.reviewStatus && <Badge variant="outline">{node.reviewStatus}</Badge>}
        </div>
        {SCOPE_LABELS.includes(node.label) && <Button type="button" size="sm" variant="outline" onClick={() => onExplore(node)}>{c('Explore branch', 'Khám phá nhánh')}</Button>}
      </div>
      {node.description && <Text variant="body-sm" className="text-muted-foreground">{node.description}</Text>}
      {groups.map(group => <div key={group.key} className="flex flex-wrap items-center gap-1">
        <Text variant="caption" className="mr-1 font-semibold">{c(...group.title)}:</Text>
        {group.nodes.slice(0, 12).map(target => <button key={target.id} type="button" onClick={() => onFocus(target.id)}
          className="rounded-md border border-border bg-background px-2 py-0.5 text-caption text-foreground hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring">{target.name}</button>)}
        {group.nodes.length > 12 && <Text variant="caption" className="text-muted-foreground">+{group.nodes.length - 12}</Text>}
      </div>)}
    </div>
      : <Text variant="body-sm" className="text-muted-foreground">{c('Select a node to see its details and relationships. Double-click a job position, role, level or competency to explore its branch.',
        'Chọn một node để xem chi tiết và quan hệ. Nhấn đúp vào vị trí, vai trò, cấp độ hoặc năng lực để khám phá nhánh.')}</Text>}
  </div>
}
