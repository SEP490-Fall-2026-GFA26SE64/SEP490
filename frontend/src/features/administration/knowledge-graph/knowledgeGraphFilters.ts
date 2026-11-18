import { branchIds, catalogIndex } from '../../guest/catalogSelection'
import { type CatalogNodeLabel, type PlatformCatalog } from '../../guest/platformCatalogApi'

export const SCOPE_LABELS: CatalogNodeLabel[] = ['JobPosition', 'TargetRole', 'Level', 'Competency']
export const LAYER_LABELS: CatalogNodeLabel[] = ['Competency', 'LearningModule', 'Certificate']

export interface KnowledgeGraphFilters {
  query: string
  type: CatalogNodeLabel | 'all'
  scopes: Partial<Record<CatalogNodeLabel, string>>
  hidden: ReadonlySet<CatalogNodeLabel>
}

export const DEFAULT_FILTERS: KnowledgeGraphFilters = { query: '', type: 'all', scopes: {}, hidden: new Set() }

// Climbing these keeps the hierarchy path of every visible node on the canvas as context.
const PARENT_EDGES = new Set(['HAS_ROLE', 'HAS_LEVEL', 'HAS_COMPETENCY', 'HAS_SKILL', 'REQUIRES_SKILL'])
const SKILL_PARENT_EDGES = new Set(['HAS_SKILL', 'REQUIRES_SKILL'])

/**
 * Nodes shown on the canvas: filter matches, their parent path, prerequisite chains, and the modules and certificates
 * attached to visible skills. Hidden layers are removed last so they never appear as context either.
 */
export function knowledgeGraphView(catalog: PlatformCatalog, filters: KnowledgeGraphFilters, pinned: ReadonlySet<string> = new Set()) {
  const index = catalogIndex(catalog)
  const { hidden } = filters
  const shown = (id: string) => { const label = index.byId.get(id)?.label; return !!label && !hidden.has(label) }
  const scopeIds = SCOPE_LABELS.map(label => filters.scopes[label]).filter((id): id is string => !!id && index.byId.has(id))
  const scopeSets = scopeIds.map(id => branchIds(catalog, id))
  const term = filters.query.trim().toLocaleLowerCase()
  const inScope = (id: string) => scopeSets.every(ids => ids.has(id))
  const matches = catalog.nodes.filter(node => !hidden.has(node.label)
    && (filters.type === 'all' || node.label === filters.type)
    && (!term || `${node.name} ${node.code ?? ''}`.toLocaleLowerCase().includes(term))
    && (inScope(node.id) || isAttachedToScope(node.id)))

  function isAttachedToScope(id: string) {
    if (!scopeSets.length) return true
    // Modules sit outside skill branches, so they belong to a scope through the skills they teach.
    return (index.outgoing.get(id) ?? []).some(edge => edge.type === 'TEACHES' && inScope(edge.to))
  }

  const visible = new Set([...pinned, ...matches.map(node => node.id), ...(matches.length ? scopeIds : [])])
  const pending = [...visible]
  // Skills are shared widely: inside a scope, only climb to skill parents that belong to it.
  const climb = (type: string, from: string) => PARENT_EDGES.has(type) && shown(from)
    && (!scopeSets.length || !SKILL_PARENT_EDGES.has(type) || inScope(from))
  while (pending.length) for (const edge of index.incoming.get(pending.pop()!) ?? [])
    if (!visible.has(edge.from) && climb(edge.type, edge.from)) { visible.add(edge.from); pending.push(edge.from) }
  pending.push(...visible)
  while (pending.length) for (const edge of index.outgoing.get(pending.pop()!) ?? [])
    if (edge.type === 'HAS_SKILL_PREREQUISITE' && !visible.has(edge.to)) { visible.add(edge.to); pending.push(edge.to) }
  for (const id of [...visible]) {
    const label = index.byId.get(id)?.label
    if (label === 'MicroSkill') {
      for (const edge of index.incoming.get(id) ?? []) if (edge.type === 'TEACHES' && shown(edge.from)) visible.add(edge.from)
      for (const edge of index.outgoing.get(id) ?? []) if (edge.type === 'REQUIRES_CERTIFICATE' && shown(edge.to)) visible.add(edge.to)
    } else if (label === 'LearningModule') {
      for (const edge of index.outgoing.get(id) ?? []) if (edge.type === 'TEACHES') visible.add(edge.to)
    } else if (label === 'Certificate') {
      for (const edge of index.incoming.get(id) ?? []) if (edge.type === 'REQUIRES_CERTIFICATE') visible.add(edge.from)
    }
  }
  for (const id of [...visible]) if (!shown(id)) visible.delete(id)
  const hits = new Set(term ? matches.map(node => node.id).filter(id => visible.has(id)) : [])
  return { ids: visible, hits, matchCount: matches.length }
}

/** Options for one scope picker, narrowed by every scope chosen above it. */
export function scopeOptions(catalog: PlatformCatalog, scopes: KnowledgeGraphFilters['scopes'], label: CatalogNodeLabel) {
  const parents = SCOPE_LABELS.slice(0, SCOPE_LABELS.indexOf(label)).flatMap(parent => scopes[parent] ? [branchIds(catalog, scopes[parent]!)] : [])
  return catalog.nodes.filter(node => node.label === label && parents.every(ids => ids.has(node.id)))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Choosing a scope clears the scopes below it, which may no longer belong to the new branch. */
export function withScope(scopes: KnowledgeGraphFilters['scopes'], label: CatalogNodeLabel, id: string): KnowledgeGraphFilters['scopes'] {
  const depth = SCOPE_LABELS.indexOf(label)
  const kept = Object.fromEntries(Object.entries(scopes).filter(([key]) => SCOPE_LABELS.indexOf(key as CatalogNodeLabel) < depth))
  return id ? { ...kept, [label]: id } : kept
}
