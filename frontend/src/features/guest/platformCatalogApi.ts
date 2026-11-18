import { RegistrationApiError } from './registrationApi'

export type CatalogNodeLabel = 'Organization' | 'Department' | 'JobPosition' | 'TargetRole' | 'Level' | 'Competency' | 'MicroSkill' | 'LearningModule' | 'Certificate'
export interface CatalogNode {
  id: string; label: CatalogNodeLabel; name: string; code: string | null; description?: string | null
  status?: string | null; reviewStatus?: string | null
}
export interface CatalogEdge {
  id: string
  from: string
  to: string
  type: 'HAS_DEPARTMENT' | 'HAS_JOB_POSITION' | 'HAS_ROLE' | 'HAS_LEVEL' | 'HAS_COMPETENCY' | 'HAS_SKILL' | 'REQUIRES_SKILL' | 'HAS_SKILL_PREREQUISITE' | 'TEACHES' | 'REQUIRES_CERTIFICATE'
  properties: Record<string, unknown>
}
export interface PlatformCatalog { version: string; nodes: CatalogNode[]; edges: CatalogEdge[] }
export interface CatalogClosure {
  templateVersion: string | null
  selected: string[]
  nodeCount: number
  relationshipCount: number
  nodesByLabel: Record<string, number>
  nodeIds: string[]
  edges: CatalogEdge[]
  inclusions: { nodeId: string; reason: 'ANCESTOR' | 'PREREQUISITE'; requiredBy: string }[]
}

/** Starter-catalog hierarchy; scope pickers rely on this exact order. */
export const CATALOG_LABELS: CatalogNodeLabel[] = ['JobPosition', 'TargetRole', 'Level', 'Competency', 'MicroSkill']
/** Organization knowledge graph adds learning content and certificates after the skill column. */
export const KNOWLEDGE_GRAPH_LABELS: CatalogNodeLabel[] = [...CATALOG_LABELS, 'LearningModule', 'Certificate']
/** Organization structure imported at registration: Department -> Job position -> Target role -> Level. */
export const ORGANIZATION_STRUCTURE_LABELS: CatalogNodeLabel[] = ['Organization', 'Department', 'JobPosition', 'TargetRole', 'Level']
/** Left-to-right graph column order for every node type. */
export const GRAPH_COLUMN_LABELS: CatalogNodeLabel[] = ['Organization', 'Department', ...KNOWLEDGE_GRAPH_LABELS]
const LABELS = new Set(CATALOG_LABELS)
const EDGE_TYPES = new Set(['HAS_ROLE', 'HAS_LEVEL', 'HAS_COMPETENCY', 'HAS_SKILL', 'REQUIRES_SKILL', 'HAS_SKILL_PREREQUISITE'])

function parseEdge(item: unknown): CatalogEdge {
  const e = record(item)
  const type = text(e.type)
  if (!EDGE_TYPES.has(type)) throw new Error('Unexpected catalog relationship.')
  return { id: text(e.id), from: text(e.from), to: text(e.to), type: type as CatalogEdge['type'], properties: record(e.properties) }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Unexpected catalog response.')
  return value as Record<string, unknown>
}
function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Unexpected catalog response.')
  return value
}
function count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw new Error('Unexpected catalog response.')
  return value
}

async function read(response: Response): Promise<unknown> {
  const body = await response.text()
  const payload: unknown = body ? JSON.parse(body) : null
  if (!response.ok) {
    const error = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}
    throw new RegistrationApiError(response.status, typeof error.code === 'string' ? error.code : 'SERVICE_UNAVAILABLE',
      typeof error.message === 'string' ? error.message : 'The platform catalog is unavailable.',
      typeof error.field === 'string' ? error.field : null)
  }
  return payload
}

export function parsePlatformCatalog(value: unknown): PlatformCatalog {
  const v = record(value)
  if (!Array.isArray(v.nodes) || !Array.isArray(v.edges)) throw new Error('Unexpected catalog response.')
  const nodes = v.nodes.map(item => {
    const n = record(item)
    const label = text(n.label) as CatalogNodeLabel
    if (!LABELS.has(label)) throw new Error('Unexpected catalog response.')
    return { id: text(n.id), label, name: text(n.name), code: n.code == null ? null : text(n.code),
      description: n.description == null ? null : text(n.description) }
  })
  const ids = new Set(nodes.map(node => node.id))
  const edges = v.edges.map(parseEdge).filter(edge => ids.has(edge.from) && ids.has(edge.to))
  return { version: text(v.version), nodes, edges }
}

export async function getPlatformCatalog(signal?: AbortSignal): Promise<PlatformCatalog> {
  return parsePlatformCatalog(await read(await fetch('/api/v1/platform-catalog', { signal, credentials: 'same-origin' })))
}

export async function previewCatalogClosure(nodeIds: string[], signal?: AbortSignal): Promise<CatalogClosure> {
  const csrf = record(await read(await fetch('/api/v1/registration/csrf', { signal, credentials: 'same-origin', cache: 'no-store' })))
  const header = text(csrf.headerName)
  if (header !== 'X-CSRF-TOKEN') throw new Error('Unexpected catalog response.')
  const v = record(await read(await fetch('/api/v1/registration/catalog-closure', {
    method: 'POST', signal, credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', [header]: text(csrf.token) },
    body: JSON.stringify({ nodeIds }),
  })))
  const byLabel = record(v.nodesByLabel)
  if (!Array.isArray(v.selected) || !Array.isArray(v.nodeIds) || !Array.isArray(v.edges) || !Array.isArray(v.inclusions))
    throw new Error('Unexpected catalog preview.')
  return {
    templateVersion: v.templateVersion == null ? null : text(v.templateVersion),
    selected: v.selected.map(text),
    nodeCount: count(v.nodeCount),
    relationshipCount: count(v.relationshipCount),
    nodesByLabel: Object.fromEntries(Object.entries(byLabel).map(([key, value]) => [key, count(value)])),
    nodeIds: v.nodeIds.map(text),
    edges: v.edges.map(parseEdge),
    inclusions: v.inclusions.map(item => {
      const inclusion = record(item)
      if (inclusion.reason !== 'ANCESTOR' && inclusion.reason !== 'PREREQUISITE') throw new Error('Unexpected catalog inclusion.')
      return { nodeId: text(inclusion.nodeId), reason: inclusion.reason, requiredBy: text(inclusion.requiredBy) }
    }),
  }
}
