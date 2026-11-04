import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Network, type Options } from 'vis-network'
import { DataSet } from 'vis-data'
import { Plus, Search, Trash2, Waypoints } from 'lucide-react'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Input } from '../../shared/components/ui/Input'
import { useTranslation } from '../../shared/i18n/LanguageContext'
import { useCopy } from '../subscription/SubscriptionFeedback'
import { getPlatformCatalog, previewCatalogClosure, type CatalogNode, type CatalogNodeLabel, type PlatformCatalog } from './platformCatalogApi'

export const MAX_CATALOG_SELECTION = 300
const DRAG_TYPE = 'application/x-adapt-catalog-node'
const MIN_GRAPH_SCALE = 0.6

const LABEL_COPY: Record<CatalogNodeLabel, [string, string]> = {
  JobPosition: ['Job position', 'Vị trí công việc'],
  TargetRole: ['Target role', 'Vai trò mục tiêu'],
  MicroSkill: ['Micro-skill', 'Kỹ năng nhỏ'],
  LearningModule: ['Learning module', 'Học phần'],
}

const FILTERS: { value: 'roles' | 'skills' | 'modules'; labels: CatalogNodeLabel[]; copy: [string, string] }[] = [
  { value: 'roles', labels: ['JobPosition', 'TargetRole'], copy: ['Job positions & roles', 'Vị trí công việc & vai trò'] },
  { value: 'skills', labels: ['MicroSkill'], copy: ['Micro-skills', 'Kỹ năng nhỏ'] },
  { value: 'modules', labels: ['LearningModule'], copy: ['Learning modules', 'Học phần'] },
]

function token(name: string, alpha = 1): string {
  const value = typeof window === 'undefined' ? '' : getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (!value) return alpha === 1 ? 'gray' : 'rgba(128,128,128,0.4)'
  return alpha === 1 ? `hsl(${value})` : `hsl(${value} / ${alpha})`
}

interface PickerProps {
  value: string[]
  onChange: (next: string[]) => void
}

/** Lets a Guest copy platform catalog items into the new workspace. Nothing selected starts an empty catalog. */
export function GuestCatalogPicker({ value, onChange }: PickerProps) {
  const { language } = useTranslation()
  const c = useCopy()
  const catalog = useQuery({ queryKey: ['platform-catalog'], queryFn: ({ signal }) => getPlatformCatalog(signal), staleTime: 300_000, retry: false })
  const selectionKey = [...value].sort()
  const closure = useQuery({
    queryKey: ['platform-catalog-closure', selectionKey],
    queryFn: () => previewCatalogClosure(value),
    enabled: value.length > 0 && catalog.isSuccess,
    retry: false,
  })
  const [filter, setFilter] = React.useState<'roles' | 'skills' | 'modules'>('roles')
  const [query, setQuery] = React.useState('')
  const [dropActive, setDropActive] = React.useState(false)
  const [announcement, setAnnouncement] = React.useState('')
  const dropRef = React.useRef<HTMLDivElement>(null)
  const nodes = React.useMemo(() => new Map((catalog.data?.nodes ?? []).map(node => [node.id, node])), [catalog.data])

  const add = React.useCallback((id: string) => {
    const node = nodes.get(id)
    if (!node || value.includes(id) || value.length >= MAX_CATALOG_SELECTION) return
    onChange([...value, id])
    setAnnouncement(`${node.name} ${language === 'vi' ? 'đã được thêm' : 'added'}`)
  }, [language, nodes, onChange, value])
  const remove = (id: string) => {
    onChange(value.filter(item => item !== id))
    setAnnouncement(`${nodes.get(id)?.name ?? id} ${language === 'vi' ? 'đã được bỏ' : 'removed'}`)
  }

  const visibleLabels = FILTERS.find(item => item.value === filter)!.labels
  const term = query.trim().toLowerCase()
  const listed = (catalog.data?.nodes ?? []).filter(node => visibleLabels.includes(node.label)
    && (!term || node.name.toLowerCase().includes(term) || (node.code ?? '').toLowerCase().includes(term))).slice(0, 60)

  return <section aria-labelledby="catalog-picker-title" className="space-y-3 rounded-lg border border-border bg-card p-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h3 id="catalog-picker-title" className="flex items-center gap-2 text-[length:var(--text-card)] font-semibold text-foreground">
          <Waypoints size={18} aria-hidden="true" />{c('Starter catalog (optional)', 'Catalog khởi tạo (không bắt buộc)')}
        </h3>
        <p className="text-body-sm text-muted-foreground">{c('Drag roles, skills or modules from the platform graph into your catalog. Their required levels, prerequisites and teaching modules are copied with them. Leave it empty to start from scratch.',
          'Kéo vai trò, kỹ năng hoặc học phần từ graph nền tảng vào catalog của bạn. Các cấp độ, kỹ năng tiên quyết và học phần liên quan được sao chép kèm. Để trống nếu muốn bắt đầu từ đầu.')}</p>
      </div>
    </div>

    {catalog.isPending ? <p role="status" className="text-body-sm text-muted-foreground">{c('Loading the platform catalog...', 'Đang tải catalog nền tảng...')}</p>
      : catalog.isError ? <p role="status" className="rounded-md border border-border bg-muted p-3 text-body-sm text-muted-foreground">
        {c('The platform catalog is unavailable. You can continue with an empty catalog.', 'Chưa tải được catalog nền tảng. Bạn có thể tiếp tục với catalog trống.')}</p>
        : <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-3">
            <div role="tablist" aria-label={c('Catalog item type', 'Loại mục catalog')} className="flex flex-wrap gap-2">
              {FILTERS.map(item => <Button key={item.value} type="button" role="tab" size="sm" aria-selected={filter === item.value}
                variant={filter === item.value ? 'primary' : 'outline'} onClick={() => setFilter(item.value)}>{c(...item.copy)}</Button>)}
            </div>
            <CatalogGraph catalog={catalog.data} labels={visibleLabels} selected={value} dropRef={dropRef} onDrop={add}
              ariaLabel={c('Platform catalog graph. Drag a node into Your catalog, or double-click it.', 'Graph catalog nền tảng. Kéo node vào Catalog của bạn hoặc nhấp đúp.')} />
            <label className="relative block">
              <span className="sr-only">{c('Search catalog items', 'Tìm mục catalog')}</span>
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={event => setQuery(event.target.value)} className="pl-9"
                placeholder={c('Search by name or code', 'Tìm theo tên hoặc mã')} />
            </label>
            <ul aria-label={c('Platform catalog items', 'Các mục catalog nền tảng')} className="max-h-64 divide-y divide-border overflow-y-auto rounded-md border border-border">
              {listed.length === 0 && <li className="p-3 text-body-sm text-muted-foreground">{c('No matching items.', 'Không có mục phù hợp.')}</li>}
              {listed.map(node => <li key={node.id} draggable={!value.includes(node.id)}
                onDragStart={event => { event.dataTransfer.setData(DRAG_TYPE, node.id); event.dataTransfer.effectAllowed = 'copy' }}
                className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-body-sm font-medium text-foreground">{node.name}</span>
                  <span className="text-caption text-muted-foreground">{c(...LABEL_COPY[node.label])}{node.code ? ` · ${node.code}` : ''}</span>
                </span>
                <Button type="button" size="sm" variant="outline" disabled={value.includes(node.id) || value.length >= MAX_CATALOG_SELECTION}
                  aria-label={`${c('Add', 'Thêm')} ${node.name}`} onClick={() => add(node.id)}>
                  <Plus size={14} aria-hidden="true" />{value.includes(node.id) ? c('Added', 'Đã thêm') : c('Add', 'Thêm')}
                </Button>
              </li>)}
            </ul>
          </div>

          <div ref={dropRef} data-testid="catalog-drop-zone" aria-labelledby="catalog-selection-title"
            onDragOver={event => { if (event.dataTransfer.types.includes(DRAG_TYPE)) { event.preventDefault(); setDropActive(true) } }}
            onDragLeave={() => setDropActive(false)}
            onDrop={event => { event.preventDefault(); setDropActive(false); const id = event.dataTransfer.getData(DRAG_TYPE); if (id) add(id) }}
            className={`flex min-h-48 flex-col gap-3 rounded-lg border-2 border-dashed p-4 transition-colors ${dropActive ? 'border-primary bg-secondary' : 'border-border bg-muted/40'}`}>
            <div className="flex items-center justify-between gap-2">
              <h4 id="catalog-selection-title" className="text-body-sm font-semibold text-foreground">{c('Your catalog', 'Catalog của bạn')}</h4>
              <Badge variant="outline">{value.length}/{MAX_CATALOG_SELECTION}</Badge>
            </div>
            {value.length === 0 ? <p className="text-body-sm text-muted-foreground">{c('Nothing selected. Your workspace will start with an empty catalog.', 'Chưa chọn mục nào. Không gian sẽ bắt đầu với catalog trống.')}</p>
              : <ul aria-label={c('Selected catalog items', 'Các mục đã chọn')} className="space-y-2">
                {value.map(id => { const node = nodes.get(id); return <li key={id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-body-sm font-medium text-foreground">{node?.name ?? id}</span>
                    {node && <span className="text-caption text-muted-foreground">{c(...LABEL_COPY[node.label])}</span>}
                  </span>
                  <Button type="button" size="sm" variant="ghost" aria-label={`${c('Remove', 'Bỏ')} ${node?.name ?? id}`} onClick={() => remove(id)}>
                    <Trash2 size={14} aria-hidden="true" />
                  </Button>
                </li> })}
              </ul>}
            {value.length > 0 && <div role="status" aria-live="polite" className="mt-auto rounded-md bg-card p-3 text-caption text-muted-foreground">
              {closure.isPending ? c('Calculating what will be copied...', 'Đang tính các mục sẽ được sao chép...')
                : closure.isError ? <span className="text-destructive">{closure.error.message}</span>
                  : closure.data && <>
                    <span className="block font-semibold text-foreground" data-testid="catalog-closure-summary">
                      {c(`${closure.data.nodeCount} items and ${closure.data.relationshipCount} relationships will be copied`,
                        `Sẽ sao chép ${closure.data.nodeCount} mục và ${closure.data.relationshipCount} quan hệ`)}
                    </span>
                    {Object.entries(closure.data.nodesByLabel).map(([label, total]) => `${label}: ${total}`).join(' · ')}
                  </>}
            </div>}
          </div>
        </div>}
    <p className="sr-only" aria-live="polite">{announcement}</p>
  </section>
}

interface GraphProps {
  catalog: PlatformCatalog
  labels: CatalogNodeLabel[]
  selected: string[]
  dropRef: React.RefObject<HTMLDivElement | null>
  onDrop: (id: string) => void
  ariaLabel: string
}

function CatalogGraph({ catalog, labels, selected, dropRef, onDrop, ariaLabel }: GraphProps) {
  const container = React.useRef<HTMLDivElement>(null)
  const network = React.useRef<Network | null>(null)
  const dataset = React.useRef<DataSet<{ id: string; label: string; group: string; title: string; color?: object }> | null>(null)
  const dropHandler = React.useRef(onDrop)
  const [failed, setFailed] = React.useState(false)
  dropHandler.current = onDrop

  React.useEffect(() => {
    if (!container.current) return
    const shown = new Set(labels)
    const visible = catalog.nodes.filter((node: CatalogNode) => shown.has(node.label))
    const ids = new Set(visible.map(node => node.id))
    try {
      const nodes = new DataSet(visible.map(node => ({ id: node.id, label: node.name.length > 28 ? `${node.name.slice(0, 26)}…` : node.name, group: node.label, title: node.name })))
      const edges = new DataSet(catalog.edges.filter(edge => ids.has(edge.from) && ids.has(edge.to))
        .map((edge, index) => ({ id: `${edge.type}-${index}`, from: edge.from, to: edge.to })))
      const font = { color: token('--foreground'), size: 12, face: 'IBM Plex Sans' }
      const options: Options = {
        autoResize: true,
        physics: { stabilization: { iterations: 150 }, barnesHut: { springLength: 120, avoidOverlap: 0.2 } },
        nodes: { scaling: { label: { drawThreshold: 4 } } },
        interaction: { hover: true, dragNodes: true, tooltipDelay: 200 },
        edges: { color: { color: token('--border'), highlight: token('--primary') }, arrows: { to: { enabled: true, scaleFactor: 0.4 } }, smooth: false },
        groups: {
          JobPosition: { shape: 'box', font, color: { background: token('--secondary'), border: token('--primary') } },
          TargetRole: { shape: 'box', font, color: { background: token('--card'), border: token('--primary') } },
          MicroSkill: { shape: 'dot', size: 10, font, color: { background: token('--success'), border: token('--success') } },
          LearningModule: { shape: 'diamond', size: 10, font, color: { background: token('--warning'), border: token('--warning') } },
        },
      }
      network.current?.destroy()
      dataset.current = nodes
      const instance = new Network(container.current, { nodes, edges }, options)
      network.current = instance
      instance.on('dragEnd', params => {
        const id = params.nodes?.[0]
        const zone = dropRef.current?.getBoundingClientRect()
        const canvas = container.current?.getBoundingClientRect()
        if (!id || !zone || !canvas) return
        const x = canvas.left + params.pointer.DOM.x, y = canvas.top + params.pointer.DOM.y
        if (x >= zone.left && x <= zone.right && y >= zone.top && y <= zone.bottom) dropHandler.current(String(id))
      })
      instance.on('doubleClick', params => { const id = params.nodes?.[0]; if (id) dropHandler.current(String(id)) })
      // Large views would otherwise shrink below the label threshold; keep names readable and let the user pan or zoom.
      instance.once('stabilizationIterationsDone', () => {
        instance.fit()
        if (instance.getScale() < MIN_GRAPH_SCALE) instance.moveTo({ scale: MIN_GRAPH_SCALE })
      })
      setFailed(false)
    } catch {
      setFailed(true)
    }
    return () => { network.current?.destroy(); network.current = null }
  }, [catalog, dropRef, labels])

  React.useEffect(() => {
    const current = dataset.current
    if (!current) return
    current.update(current.getIds().map(id => ({ id: String(id), borderWidth: selected.includes(String(id)) ? 4 : 1 }) as never))
  }, [selected])

  if (failed) return null
  return <div ref={container} role="img" aria-label={ariaLabel} data-testid="catalog-graph"
    className="h-80 w-full rounded-md border border-border bg-background" />
}
