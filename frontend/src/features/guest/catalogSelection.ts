import { CATALOG_LABELS, type CatalogClosure, type CatalogEdge, type CatalogNode, type CatalogNodeLabel, type PlatformCatalog } from './platformCatalogApi'

export const MAX_CATALOG_SELECTION = 300

export const CATALOG_LABEL_COPY: Record<CatalogNodeLabel, [string, string]> = {
  JobPosition: ['Job position', 'Vị trí công việc'], TargetRole: ['Target role', 'Vai trò mục tiêu'],
  Level: ['Level', 'Cấp độ'], Competency: ['Competency', 'Năng lực'], MicroSkill: ['Micro-skill', 'Kỹ năng nhỏ'],
}

export function groupByName<T extends { name: string }>(items: T[]): { name: string; items: T[] }[] {
  const groups = new Map<string, { name: string; items: T[] }>()
  for (const item of items) {
    const key = item.name.trim().toLocaleLowerCase()
    const group = groups.get(key)
    if (group) group.items.push(item)
    else groups.set(key, { name: item.name.trim(), items: [item] })
  }
  return [...groups.values()]
}

type CatalogIndex = {
  byId: Map<string, CatalogNode>
  children: Map<string, string[]>
  outgoing: Map<string, CatalogEdge[]>
  incoming: Map<string, CatalogEdge[]>
  branches: Map<string, ReadonlySet<string>>
}
const indexes = new WeakMap<PlatformCatalog, CatalogIndex>()

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

/** Adjacency lists built once per catalog response; the catalog object is immutable query data. */
export function catalogIndex(catalog: PlatformCatalog): CatalogIndex {
  let index = indexes.get(catalog)
  if (index) return index
  index = { byId: new Map(catalog.nodes.map(node => [node.id, node])), children: new Map(), outgoing: new Map(), incoming: new Map(), branches: new Map() }
  for (const edge of catalog.edges) {
    push(index.outgoing, edge.from, edge)
    push(index.incoming, edge.to, edge)
    if (edge.type !== 'HAS_SKILL_PREREQUISITE') push(index.children, edge.from, edge.to)
  }
  indexes.set(catalog, index)
  return index
}

/** Memoized per catalog: the returned set is shared and must not be mutated. */
export function branchIds(catalog: PlatformCatalog, start: string): ReadonlySet<string> {
  const index = catalogIndex(catalog)
  const cached = index.branches.get(start)
  if (cached) return cached
  const ids = new Set<string>()
  const pending = [start]
  while (pending.length) {
    const id = pending.pop()!
    if (ids.has(id)) continue
    ids.add(id)
    const next = index.children.get(id)
    if (next) for (const child of next) pending.push(child)
  }
  index.branches.set(start, ids)
  return ids
}

/** Effective prerequisites that something else in the catalog still depends on. */
export function lockedPrerequisites(catalog: PlatformCatalog, effectiveIds: ReadonlySet<string>): Set<string> {
  const locked = new Set<string>()
  for (const edge of catalog.edges) if (edge.type === 'HAS_SKILL_PREREQUISITE' && effectiveIds.has(edge.from)) locked.add(edge.to)
  return locked
}

const STRUCTURAL_CHILD: Partial<Record<CatalogNodeLabel, string>> = { JobPosition: 'HAS_ROLE', TargetRole: 'HAS_LEVEL', Level: 'HAS_COMPETENCY' }

export function requiredBy(catalog: PlatformCatalog, effectiveIds: ReadonlySet<string>, id: string): string[] {
  const index = catalogIndex(catalog)
  if (!effectiveIds.has(id)) return []
  const structural = STRUCTURAL_CHILD[index.byId.get(id)?.label ?? 'MicroSkill']
  const result = new Set<string>()
  for (const edge of index.incoming.get(id) ?? []) if (edge.type === 'HAS_SKILL_PREREQUISITE' && effectiveIds.has(edge.from)) result.add(edge.from)
  for (const edge of index.outgoing.get(id) ?? []) if (edge.type === structural && effectiveIds.has(edge.to)) result.add(edge.to)
  return [...result]
}

export function removeBranch(catalog: PlatformCatalog, selected: string[], id: string): string[] {
  const removed = branchIds(catalog, id)
  return selected.filter(item => !removed.has(item))
}

export function emptyClosure(): CatalogClosure {
  return { templateVersion: null, selected: [], nodeCount: 0, relationshipCount: 0, nodesByLabel: {},
    nodeIds: [], edges: [], inclusions: [] }
}

const STRUCTURAL = new Set(['HAS_ROLE', 'HAS_LEVEL', 'HAS_COMPETENCY', 'HAS_SKILL', 'REQUIRES_SKILL'])
const COLUMN_GAP = 300
const SUB_COLUMN_GAP = 230
const ROW_GAP = 72

export type Point = { x: number; y: number }

/**
 * Positions only the nodes that are not on the canvas yet: children open in a column beside their parent,
 * shifted down until they clear nodes that already occupy that area. Existing coordinates never move.
 */
export function placeNewNodes(catalog: PlatformCatalog, ids: Set<string>, existing: Map<string, Point>): Map<string, Point> {
  if (existing.size && [...ids].every(id => existing.has(id))) return new Map()
  const fallback = layoutCatalog(catalog, ids)
  if (!existing.size) return fallback
  const occupied = new Map(existing)
  const placed = new Map<string, Point>()
  const parents = new Map<string, string[]>()
  for (const edge of catalog.edges) if (STRUCTURAL.has(edge.type) && ids.has(edge.from) && ids.has(edge.to))
    push(parents, edge.to, edge.from)
  const depth = new Map(catalog.nodes.map(node => [node.id, CATALOG_LABELS.indexOf(node.label)]))
  // Anchor beside the most specific parent already on screen (e.g. Competency rather than Level).
  const parentOf = (id: string) => (parents.get(id) ?? []).filter(parent => occupied.has(parent))
    .sort((a, b) => (depth.get(b) ?? 0) - (depth.get(a) ?? 0))[0]
  const fresh = catalog.nodes.filter(node => ids.has(node.id) && !existing.has(node.id))
  const clear = (band: Point[], point: Point) => band.every(other =>
    Math.abs(other.x - point.x) >= SUB_COLUMN_GAP * 0.8 || Math.abs(other.y - point.y) >= ROW_GAP * 0.8)
  for (const label of CATALOG_LABELS) {
    const groups = new Map<string, string[]>()
    for (const node of fresh) if (node.label === label) {
      const parent = parentOf(node.id)
      const key = parent ?? ''
      push(groups, key, node.id)
    }
    for (const [parent, members] of groups) {
      const anchor = parent ? occupied.get(parent)! : undefined
      const rows = Math.min(members.length, Math.max(8, Math.ceil(Math.sqrt(members.length) * 2)))
      const points = members.map((id, index) => {
        const sub = Math.floor(index / rows)
        const rowsInSub = Math.min(rows, members.length - sub * rows)
        return anchor
          ? { x: anchor.x + COLUMN_GAP + sub * SUB_COLUMN_GAP, y: anchor.y + (index % rows - (rowsInSub - 1) / 2) * ROW_GAP }
          : fallback.get(id)!
      })
      const xs = points.map(point => point.x)
      const band = [...occupied.values()].filter(other => other.x > Math.min(...xs) - SUB_COLUMN_GAP && other.x < Math.max(...xs) + SUB_COLUMN_GAP)
      let shift = 0
      for (let attempt = 0; attempt < 200 && !points.every(point => clear(band, { x: point.x, y: point.y + shift })); attempt++) shift += ROW_GAP
      members.forEach((id, index) => {
        const point = { x: points[index].x, y: points[index].y + shift }
        placed.set(id, point)
        occupied.set(id, point)
      })
    }
  }
  return placed
}

/** Left-to-right columns per node type; each column is ordered by its parents' positions so branches stay aligned. */
export function layoutCatalog(catalog: PlatformCatalog, ids: Set<string>): Map<string, Point> {
  const parents = new Map<string, string[]>()
  for (const edge of catalog.edges) if (STRUCTURAL.has(edge.type) && ids.has(edge.from) && ids.has(edge.to))
    push(parents, edge.to, edge.from)
  const rank = new Map<string, number>()
  const positions = new Map<string, Point>()
  let x = 0
  for (const label of CATALOG_LABELS) {
    const column = catalog.nodes.filter(node => node.label === label && ids.has(node.id))
    if (!column.length) continue
    const scores = new Map(column.map(node => {
      const parentRanks = (parents.get(node.id) ?? []).map(id => rank.get(id)).filter((value): value is number => value !== undefined)
      return [node.id, parentRanks.length ? parentRanks.reduce((sum, value) => sum + value, 0) / parentRanks.length : Number.POSITIVE_INFINITY]
    }))
    column.sort((a, b) => (scores.get(a.id)! - scores.get(b.id)!) || a.name.localeCompare(b.name))
    const rows = Math.min(column.length, Math.max(12, Math.ceil(Math.sqrt(column.length) * 2)))
    column.forEach((node, index) => {
      rank.set(node.id, index / column.length)
      const sub = Math.floor(index / rows)
      const rowsInSub = Math.min(rows, column.length - sub * rows)
      positions.set(node.id, { x: x + sub * SUB_COLUMN_GAP, y: (index % rows - (rowsInSub - 1) / 2) * ROW_GAP })
    })
    x += (Math.ceil(column.length / rows) - 1) * SUB_COLUMN_GAP + COLUMN_GAP
  }
  return positions
}
