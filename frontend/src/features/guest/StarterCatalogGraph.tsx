import * as React from 'react'
import { Award, BookOpen, Building2, Check, Circle, Crosshair, Diamond, Hexagon, LayoutGrid, Maximize2, Minimize2, Pentagon, Square, Waypoints, ZoomIn, ZoomOut } from 'lucide-react'
import { DataSet } from 'vis-data'
import { Network, type Edge, type Node, type NodeOptions } from 'vis-network'
import { Button } from '../../shared/components/ui/Button'
import { graphToken } from '../../shared/components/ui/ontologyGraphStyle'
import { drawNode, measureNode, NODE_SPECS, readPalette, type GraphPalette } from './catalogGraphRenderer'
import { CATALOG_LABEL_COPY, layoutCatalog, placeNewNodes, type Point } from './catalogSelection'
import { CATALOG_LABELS, type CatalogNode, type CatalogNodeLabel, type PlatformCatalog } from './platformCatalogApi'

const LEGEND_ICONS = { Organization: Building2, Department: Pentagon, JobPosition: Square, TargetRole: Circle, Level: Diamond, Competency: Hexagon, MicroSkill: Circle, LearningModule: BookOpen, Certificate: Award }
const LEGEND_TONE: Record<CatalogNodeLabel, string> = {
  Organization: 'text-primary', Department: 'text-foreground',
  JobPosition: 'text-primary', TargetRole: 'text-primary', Level: 'text-muted-foreground', Competency: 'text-primary',
  MicroSkill: 'text-success', LearningModule: 'text-warning', Certificate: 'text-destructive',
}
const FILLED_LEGEND = new Set<CatalogNodeLabel>(['MicroSkill', 'JobPosition', 'Level'])
const MIN_SCALE = 0.08
const MAX_SCALE = 2.5
// Restyling thousands of edges on every focus change blocks the main thread; beyond this only nodes dim.
const DIM_EDGE_LIMIT = 600
type EdgeMode = 'base' | 'catalog' | 'connected' | 'dim'
type RenderState = {
  byId: Map<string, CatalogNode>
  selected: Set<string>
  focusId?: string
  neighbourhood: Set<string> | null
  palette: GraphPalette | null
  metrics: Map<string, ReturnType<typeof measureNode>>
  readOnly?: boolean
}

// Only paint properties change per mode: updating `smooth` makes vis-network rebuild every edge type.
function edgeLook(type: string, mode: EdgeMode): Edge {
  const prerequisite = type === 'HAS_SKILL_PREREQUISITE'
  const relation = prerequisite || type === 'TEACHES' || type === 'REQUIRES_CERTIFICATE'
  const tone = prerequisite ? 'destructive' : type === 'TEACHES' ? 'warning' : 'muted-foreground'
  const color = mode === 'connected' ? graphToken('primary') : mode === 'catalog' ? graphToken('primary', 0.5)
    : mode === 'dim' ? graphToken('muted-foreground', 0.08) : graphToken(tone, relation ? 0.55 : 0.32)
  return {
    color: { color, highlight: graphToken('primary'), hover: graphToken('primary'), inherit: false },
    width: mode === 'connected' ? 2.4 : mode === 'catalog' ? 1.6 : 1.1,
    // The left-to-right layout already shows hierarchy direction; arrowheads (and their costly border search) are kept where they add meaning.
    arrows: { to: { enabled: relation || mode === 'connected', type: 'arrow', scaleFactor: mode === 'connected' ? 0.55 : 0.4 } },
  }
}

function edgeShape(type: string): Edge {
  const prerequisite = type === 'HAS_SKILL_PREREQUISITE'
  return {
    dashes: prerequisite ? [6, 5] : type === 'TEACHES' ? [2, 4] : false,
    smooth: prerequisite ? { enabled: true, type: 'curvedCW', roundness: 0.25 }
      : { enabled: true, type: 'cubicBezier', forceDirection: 'horizontal', roundness: 0.5 },
  }
}

function edgeMode(edge: { from: string; to: string }, selected: Set<string>, focusId: string | undefined, dimOthers = true): EdgeMode {
  if (focusId && (edge.from === focusId || edge.to === focusId)) return 'connected'
  if (focusId && dimOthers) return 'dim'
  return selected.has(edge.from) && selected.has(edge.to) ? 'catalog' : 'base'
}

function CatalogGraph({ catalog, ids, selected, focused, onFocus, onClearFocus, onExplore, copy, labels = CATALOG_LABELS, readOnly = false,
  ariaLabel, showPrerequisiteLegend = true, labelCopy = CATALOG_LABEL_COPY }: {
  catalog: PlatformCatalog
  ids: Set<string>
  selected: Set<string>
  focused: CatalogNode | undefined
  onFocus: (id: string) => void
  onClearFocus?: () => void
  onExplore?: (id: string) => void
  copy: (en: string, vi: string) => string
  /** Node types shown in the legend. */
  labels?: CatalogNodeLabel[]
  /** Viewing mode without a "your catalog" selection. */
  readOnly?: boolean
  /** Overrides node type names in the legend and tooltips. */
  labelCopy?: typeof CATALOG_LABEL_COPY
  /** Overrides the default accessible description of the canvas. */
  ariaLabel?: string
  /** Read-only legends show the prerequisite edge style unless the graph has no prerequisites. */
  showPrerequisiteLegend?: boolean
}) {
  const container = React.useRef<HTMLDivElement>(null)
  const frame = React.useRef<HTMLDivElement>(null)
  const network = React.useRef<Network | null>(null)
  const handlers = React.useRef({ onFocus, onClearFocus, onExplore })
  const copyRef = React.useRef(copy)
  const labelCopyRef = React.useRef(labelCopy)
  React.useEffect(() => { handlers.current = { onFocus, onClearFocus, onExplore }; copyRef.current = copy; labelCopyRef.current = labelCopy }, [onFocus, onClearFocus, onExplore, copy, labelCopy])
  const [failure, setFailure] = React.useState(false)
  const [attempt, setAttempt] = React.useState(0)
  const [fullscreen, setFullscreen] = React.useState(false)
  const [themeVersion, refreshTheme] = React.useReducer((version: number) => version + 1, 0)
  const nodes = React.useRef(new DataSet<Node>([]))
  const edges = React.useRef(new DataSet<Edge>([]))
  const edgeModes = React.useRef(new Map<string, EdgeMode>())
  const view = React.useRef<RenderState>({ byId: new Map(), selected: new Set(), neighbourhood: null, palette: null, metrics: new Map() })
  const pendingSizes = React.useRef(new Set<string>())
  const styleInputs = React.useRef({ selected, focused })
  React.useLayoutEffect(() => { styleInputs.current = { selected, focused } })
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const inCatalog = React.useMemo(() => [...ids].filter(id => selected.has(id)).length, [ids, selected])
  React.useLayoutEffect(() => { view.current.readOnly = readOnly; network.current?.redraw() }, [readOnly])

  // One stable renderer reads the latest state from a ref, so selection/focus changes only need a redraw.
  const renderer = React.useCallback(({ ctx, id, x, y, state }: {
    ctx: CanvasRenderingContext2D; id: string | number; x: number; y: number; state: { selected: boolean; hover: boolean }
  }) => {
    const current = view.current
    const node = current.byId.get(String(id))
    if (!node || !current.palette) return {}
    let metrics = current.metrics.get(node.id)
    if (!metrics) {
      metrics = measureNode(ctx, node.label, node.name)
      current.metrics.set(node.id, metrics)
      pendingSizes.current.add(node.id)
      if (pendingSizes.current.size === 1) requestAnimationFrame(() => {
        // Updating size makes vis-network adopt the measured card bounds for edges, hit testing and fit.
        nodes.current.update([...pendingSizes.current].filter(key => nodes.current.get(key))
          .map(key => ({ id: key, size: current.metrics.get(key)!.width / 2 })))
        pendingSizes.current.clear()
      })
    }
    const palette = current.palette
    const nodeState = {
      inCatalog: current.selected.has(node.id), hover: state.hover, badge: !current.readOnly,
      focused: state.selected || current.focusId === node.id,
      dimmed: !!current.neighbourhood && !current.neighbourhood.has(node.id),
    }
    return { drawNode: () => drawNode(ctx, x, y, node.label, metrics, nodeState, palette),
      nodeDimensions: { width: metrics.width, height: metrics.height } }
  }, [])

  React.useEffect(() => {
    const observer = new MutationObserver(refreshTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    const onFullscreen = () => setFullscreen(document.fullscreenElement === frame.current)
    document.addEventListener('fullscreenchange', onFullscreen)
    let active = true
    void document.fonts?.ready.then(() => {
      if (!active) return
      view.current.metrics.clear()
      network.current?.redraw()
    })
    return () => { active = false; observer.disconnect(); document.removeEventListener('fullscreenchange', onFullscreen) }
  }, [])

  React.useEffect(() => {
    if (!container.current) return
    let observer: ResizeObserver | undefined
    try {
      const target = container.current
      const instance = new Network(target, { nodes: nodes.current, edges: edges.current }, {
        physics: { enabled: false },
        layout: { improvedLayout: false },
        // ctxRenderer is supported at runtime but missing from vis-network's NodeOptions typings.
        nodes: { shape: 'custom', ctxRenderer: renderer, chosen: false } as NodeOptions,
        edges: { chosen: false, hoverWidth: 0.6, selectionWidth: 0.6 },
        interaction: { hover: true, hoverConnectedEdges: true, multiselect: false, hideEdgesOnDrag: true, hideEdgesOnZoom: true,
          zoomSpeed: 0.6, tooltipDelay: 350, keyboard: { enabled: true, bindToWindow: false } },
      })
      network.current = instance
      instance.on('click', event => {
        if (event.nodes?.length) handlers.current.onFocus(String(event.nodes[0]))
        else if (!event.edges?.length) handlers.current.onClearFocus?.()
      })
      instance.on('doubleClick', event => { if (event.nodes?.length) handlers.current.onExplore?.(String(event.nodes[0])) })
      instance.on('hoverNode', () => { target.style.cursor = 'pointer' })
      instance.on('blurNode', () => { target.style.cursor = '' })
      instance.on('dragStart', () => { target.style.cursor = 'grabbing' })
      instance.on('dragEnd', () => { target.style.cursor = '' })
      instance.on('zoom', () => {
        const scale = instance.getScale()
        if (scale < MIN_SCALE || scale > MAX_SCALE) instance.moveTo({ scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale)) })
      })
      let revealed = false
      observer = new ResizeObserver(entries => {
        if (entries.some(entry => entry.contentRect.width > 0 && entry.contentRect.height > 0)) {
          instance.redraw()
          if (!revealed) { instance.fit({ animation: false }); revealed = true }
        }
      })
      observer.observe(target)
    } catch (error) {
      console.error('Starter catalog graph could not render', error)
      // oxlint-disable-next-line react/set-state-in-effect -- Report a synchronous failure from constructing the external graph renderer.
      setFailure(true)
    }
    const modes = edgeModes.current
    return () => { observer?.disconnect(); network.current?.destroy(); network.current = null; modes.clear() }
  }, [attempt, renderer])

  React.useEffect(() => {
    view.current.palette = readPalette()
    edgeModes.current.clear()
    network.current?.redraw()
  }, [themeVersion])

  React.useEffect(() => {
    const byId = new Map(catalog.nodes.map(node => [node.id, node]))
    if (view.current.byId.size && [...view.current.byId].some(([id, node]) => byId.get(id)?.name !== node.name)) view.current.metrics.clear()
    view.current.byId = byId
    network.current?.storePositions()
    nodes.current.remove(nodes.current.getIds().filter(id => !ids.has(String(id))))
    const existing = new Map<string, Point>()
    for (const node of nodes.current.get()) if (node.x !== undefined && node.y !== undefined) existing.set(String(node.id), { x: node.x, y: node.y })
    // New nodes open beside their parents; nodes already on the canvas (including dragged ones) never move.
    const placed = placeNewNodes(catalog, ids, existing)
    // Measuring before insertion avoids a second size update pass over every new node after the first frame.
    const measure = container.current?.querySelector('canvas')?.getContext('2d')
    const added = catalog.nodes.filter(node => ids.has(node.id) && !nodes.current.get(node.id))
    if (measure) for (const node of added) if (!view.current.metrics.has(node.id))
      view.current.metrics.set(node.id, measureNode(measure, node.label, node.name))
    nodes.current.add(added.map(node => ({
      id: node.id, shape: 'custom', size: (view.current.metrics.get(node.id)?.width ?? NODE_SPECS[node.label].maxWidth) / 2,
      title: `${node.name} · ${copyRef.current(...labelCopyRef.current[node.label])}`, ...placed.get(node.id),
    })))
    const visibleEdges = catalog.edges.filter(edge => ids.has(edge.from) && ids.has(edge.to))
    const edgeIds = new Set(visibleEdges.map(edge => edge.id))
    const stale = edges.current.getIds().filter(id => !edgeIds.has(String(id)))
    edges.current.remove(stale)
    for (const id of stale) edgeModes.current.delete(String(id))
    // New edges start in their final style so the style effect does not have to update them again.
    const { selected: chosen, focused: target } = styleInputs.current
    const focusId = target && ids.has(target.id) ? target.id : undefined
    edges.current.add(visibleEdges.filter(edge => !edges.current.get(edge.id)).map(edge => {
      const mode = edgeMode(edge, chosen, focusId, visibleEdges.length <= DIM_EDGE_LIMIT)
      edgeModes.current.set(edge.id, mode)
      return { id: edge.id, from: edge.from, to: edge.to, ...edgeShape(edge.type), ...edgeLook(edge.type, mode) }
    }))
    const instance = network.current
    const frame = container.current
    if (!instance || !frame || !existing.size || !placed.size) return
    const offscreen = [...placed.values()].some(point => {
      const dom = instance.canvasToDOM?.(point)
      return dom && (dom.x < 40 || dom.y < 40 || dom.x > frame.clientWidth - 40 || dom.y > frame.clientHeight - 40)
    })
    if (!offscreen) return
    const anchors = visibleEdges.filter(edge => placed.has(edge.to) && existing.has(edge.from)).map(edge => edge.from)
    // Never zoom in past the current scale; vis-network throws (and the dialog crashes) unless max > min.
    const minZoomLevel = Math.min(0.35, instance.getScale())
    instance.fit({ nodes: [...new Set([...anchors, ...placed.keys()])], minZoomLevel, maxZoomLevel: Math.max(instance.getScale(), minZoomLevel + 0.01),
      animation: reduced() ? false : { duration: 400, easingFunction: 'easeInOutQuad' } })
  }, [catalog, ids, attempt])

  React.useEffect(() => {
    const focusId = focused && ids.has(focused.id) ? focused.id : undefined
    const neighbourhood = focusId ? new Set([focusId]) : null
    const visibleEdges = catalog.edges.filter(edge => ids.has(edge.from) && ids.has(edge.to))
    if (focusId) for (const edge of visibleEdges) if (edge.from === focusId || edge.to === focusId) {
      neighbourhood!.add(edge.from); neighbourhood!.add(edge.to)
    }
    Object.assign(view.current, { selected, focusId, neighbourhood })
    const changes: Edge[] = []
    for (const edge of visibleEdges) {
      const mode = edgeMode(edge, selected, focusId, visibleEdges.length <= DIM_EDGE_LIMIT)
      if (edgeModes.current.get(edge.id) === mode) continue
      edgeModes.current.set(edge.id, mode)
      changes.push({ id: edge.id, ...edgeLook(edge.type, mode) })
    }
    if (changes.length) edges.current.update(changes)
    else network.current?.redraw()
  }, [selected, ids, focused, themeVersion, attempt, catalog])

  React.useEffect(() => {
    if (!focused || !ids.has(focused.id)) return
    network.current?.selectNodes([focused.id])
  }, [focused, ids])

  const animation = () => reduced() ? false : { duration: 250, easingFunction: 'easeInOutQuad' as const }
  const zoom = (factor: number) => network.current?.moveTo({
    scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, (network.current.getScale() || 1) * factor)), animation: animation() })
  const controls = [
    { name: copy('Zoom in', 'Phóng to'), Icon: ZoomIn, action: 0 },
    { name: copy('Zoom out', 'Thu nhỏ'), Icon: ZoomOut, action: 1 },
    { name: copy('Fit graph', 'Vừa khung'), Icon: Crosshair, action: 2 },
    { name: copy('Re-arrange layout', 'Sắp xếp lại bố cục'), Icon: LayoutGrid, action: 3 },
    { name: fullscreen ? copy('Exit fullscreen', 'Thoát toàn màn hình') : copy('Fullscreen graph', 'Graph toàn màn hình'),
      Icon: fullscreen ? Minimize2 : Maximize2,
      action: 4 },
  ]
  const handleControl = (action: number) => {
    switch (action) {
      case 0: zoom(1.25); break
      case 1: zoom(1 / 1.25); break
      case 2: network.current?.fit({ animation: animation() }); break
      case 3: { 
      nodes.current.update([...layoutCatalog(catalog, ids)].map(([id, point]) => ({ id, ...point })))
      network.current?.fit({ animation: animation() })
    
        break
      }
      case 4: { 
        const request = document.fullscreenElement ? document.exitFullscreen() : frame.current?.requestFullscreen()
        request?.catch(error => { console.error('Catalog fullscreen failed', error); setFailure(true) })
      
        break
      }
    }
  }


  return <div ref={frame} className="starter-catalog-graph relative min-h-72 flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
    <div ref={container} data-testid="catalog-graph" role="application" tabIndex={0}
      aria-label={ariaLabel ?? (readOnly
        ? copy('Organization knowledge graph. Arrow keys pan, plus and minus zoom. Use the filters to change which nodes are shown.',
          'Knowledge graph của tổ chức. Phím mũi tên để di chuyển, cộng/trừ để phóng to. Dùng bộ lọc để đổi các node hiển thị.')
        : copy('Starter catalog graph. Arrow keys pan, plus and minus zoom. Use the item list and selection buttons for keyboard selection.',
          'Graph catalog. Phím mũi tên để di chuyển, cộng/trừ để phóng to. Dùng danh sách và nút chọn để thao tác bằng bàn phím.'))}
      className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      style={{ backgroundImage: `radial-gradient(${graphToken('border')} 1px, transparent 1px)`, backgroundSize: '22px 22px' }} />
    <div role="toolbar" aria-label={copy('Graph controls', 'Điều khiển graph')}
      className="absolute left-3 top-3 flex flex-col gap-0.5 rounded-lg border border-border bg-card/95 p-1 shadow-sm backdrop-blur">
      {controls.map(({ name, Icon, action }) => <Button key={name} type="button" size="sm" variant="ghost" aria-label={name} title={name}
        className="h-8 w-8 p-0" onClick={() => handleControl(action)}><Icon size={16} aria-hidden="true" /></Button>)}
    </div>
    <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1 text-caption text-muted-foreground shadow-sm backdrop-blur">
      <Waypoints size={14} aria-hidden="true" />
      <span><span className="font-semibold text-foreground">{ids.size}</span> {copy(ids.size === 1 ? 'node' : 'nodes', 'node')}</span>
      {!readOnly && <>
        <span aria-hidden="true" className="h-3 w-px bg-border" />
        <span><span className="font-semibold text-primary">{inCatalog}</span> {copy('in catalog', 'trong catalog')}</span>
      </>}
    </div>
    <ul aria-label={copy('Graph node types', 'Loại node graph')}
      className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-card/95 px-3 py-1.5 text-caption text-muted-foreground shadow-sm backdrop-blur">
      {labels.map(label => {
        const Icon = LEGEND_ICONS[label]
        return <li key={label} className="inline-flex items-center gap-1.5">
          <Icon size={12} aria-hidden="true" className={LEGEND_TONE[label]}
            fill={FILLED_LEGEND.has(label) ? 'currentColor' : 'none'} />{copy(...labelCopy[label])}
        </li>
      })}
      {readOnly ? showPrerequisiteLegend && <li className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="w-4 border-t-2 border-dashed border-destructive/60" />{copy('Prerequisite', 'Tiên quyết')}
      </li> : <li className="inline-flex items-center gap-1.5 font-medium text-foreground">
        <span aria-hidden="true" className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary">
          <Check size={9} strokeWidth={3} className="text-primary-foreground" /></span>{copy('In your catalog', 'Trong catalog')}
      </li>}
    </ul>
    {!ids.size && <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><Waypoints size={22} aria-hidden="true" /></span>
      <p className="text-body-sm text-muted-foreground">{copy('No graph items match these filters.', 'Không có node phù hợp với bộ lọc.')}</p>
    </div>}
    {failure && <div role="alert" className="absolute inset-x-3 bottom-14 rounded-lg border border-destructive/30 bg-card p-3 text-body-sm shadow-sm">
      <p>{readOnly ? copy('Graph unavailable. Retry to render it again.', 'Graph chưa khả dụng. Hãy thử hiển thị lại.')
        : copy('Graph unavailable. You can still use the item list.', 'Graph chưa khả dụng. Bạn vẫn có thể chọn từ danh sách.')}</p>
      <Button type="button" size="sm" variant="outline" onClick={() => { setFailure(false); setAttempt(value => value + 1) }}>{copy('Retry graph', 'Thử lại graph')}</Button>
    </div>}
  </div>
}

// Memoised so parent re-renders (list filtering, notices) never touch the canvas unless graph inputs change.
export const StarterCatalogGraph = React.memo(CatalogGraph)
