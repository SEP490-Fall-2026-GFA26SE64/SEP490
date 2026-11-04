import { RegistrationApiError } from './registrationApi'

export type CatalogNodeLabel = 'JobPosition' | 'TargetRole' | 'MicroSkill' | 'LearningModule'
export interface CatalogNode { id: string; label: CatalogNodeLabel; name: string; code: string | null }
export interface CatalogEdge { from: string; to: string; type: 'HAS_ROLE' | 'REQUIRES' | 'PREREQUISITE' | 'TEACHES' }
export interface PlatformCatalog { version: string; nodes: CatalogNode[]; edges: CatalogEdge[] }
export interface CatalogClosure {
  templateVersion: string | null
  selected: string[]
  nodeCount: number
  relationshipCount: number
  nodesByLabel: Record<string, number>
}

const LABELS = new Set<CatalogNodeLabel>(['JobPosition', 'TargetRole', 'MicroSkill', 'LearningModule'])
const EDGE_TYPES = new Set(['HAS_ROLE', 'REQUIRES', 'PREREQUISITE', 'TEACHES'])

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
    return { id: text(n.id), label, name: text(n.name), code: n.code == null ? null : text(n.code) }
  })
  const ids = new Set(nodes.map(node => node.id))
  const edges = v.edges.map(item => {
    const e = record(item)
    const type = text(e.type)
    if (!EDGE_TYPES.has(type)) throw new Error('Unexpected catalog response.')
    return { from: text(e.from), to: text(e.to), type: type as CatalogEdge['type'] }
  }).filter(edge => ids.has(edge.from) && ids.has(edge.to))
  return { version: text(v.version), nodes, edges }
}

export async function getPlatformCatalog(signal?: AbortSignal): Promise<PlatformCatalog> {
  return parsePlatformCatalog(await read(await fetch('/api/v1/platform-catalog', { signal, credentials: 'same-origin' })))
}

export async function previewCatalogClosure(nodeIds: string[]): Promise<CatalogClosure> {
  const csrf = record(await read(await fetch('/api/v1/registration/csrf', { credentials: 'same-origin', cache: 'no-store' })))
  const header = text(csrf.headerName)
  if (header !== 'X-CSRF-TOKEN') throw new Error('Unexpected catalog response.')
  const v = record(await read(await fetch('/api/v1/registration/catalog-closure', {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', [header]: text(csrf.token) },
    body: JSON.stringify({ nodeIds }),
  })))
  const byLabel = record(v.nodesByLabel)
  return {
    templateVersion: v.templateVersion == null ? null : text(v.templateVersion),
    selected: Array.isArray(v.selected) ? v.selected.map(text) : [],
    nodeCount: count(v.nodeCount),
    relationshipCount: count(v.relationshipCount),
    nodesByLabel: Object.fromEntries(Object.entries(byLabel).map(([key, value]) => [key, count(value)])),
  }
}
