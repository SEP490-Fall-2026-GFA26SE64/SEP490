import { requireOrganizationId } from '../../../shared/api/organizationScope'
import { workspaceFetch } from '../../../shared/api/workspaceFetch'
import { KNOWLEDGE_GRAPH_LABELS, type CatalogEdge, type CatalogNode, type CatalogNodeLabel, type PlatformCatalog } from '../../guest/platformCatalogApi'

const LABELS = new Set<string>(KNOWLEDGE_GRAPH_LABELS)
const EDGE_TYPES = new Set<string>(['HAS_ROLE', 'HAS_LEVEL', 'HAS_COMPETENCY', 'HAS_SKILL', 'REQUIRES_SKILL', 'HAS_SKILL_PREREQUISITE',
  'TEACHES', 'REQUIRES_CERTIFICATE'])

export class KnowledgeGraphApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Unexpected knowledge graph response.')
  return value as Record<string, unknown>
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value) throw new Error('Unexpected knowledge graph response.')
  return value
}
function optional(value: unknown): string | null {
  return value == null ? null : text(value)
}

/** Validates the payload and drops relationships whose endpoints are not visible nodes. */
export function parseOrganizationKnowledgeGraph(value: unknown): PlatformCatalog {
  const body = record(value)
  if (!Array.isArray(body.nodes) || !Array.isArray(body.edges)) throw new Error('Unexpected knowledge graph response.')
  const nodes: CatalogNode[] = body.nodes.map(item => {
    const node = record(item)
    const label = text(node.label)
    if (!LABELS.has(label)) throw new Error('Unexpected knowledge graph node type.')
    return { id: text(node.id), label: label as CatalogNodeLabel, name: text(node.name), code: optional(node.code),
      description: optional(node.description), status: optional(node.status), reviewStatus: optional(node.reviewStatus) }
  })
  const ids = new Set(nodes.map(node => node.id))
  const edges: CatalogEdge[] = body.edges.map(item => {
    const edge = record(item)
    const type = text(edge.type)
    if (!EDGE_TYPES.has(type)) throw new Error('Unexpected knowledge graph relationship.')
    return { id: text(edge.id), from: text(edge.from), to: text(edge.to), type: type as CatalogEdge['type'], properties: {} }
  }).filter(edge => ids.has(edge.from) && ids.has(edge.to))
  return { version: 'organization', nodes, edges }
}

export async function fetchOrganizationKnowledgeGraph(organizationId: string | null | undefined, signal?: AbortSignal): Promise<PlatformCatalog> {
  const organization = requireOrganizationId(organizationId)
  const response = await workspaceFetch(`/api/v1/organizations/${encodeURIComponent(organization)}/knowledge-graph`,
    { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) {
    let message = ''
    try { const error = record(await response.json()); if (typeof error.message === 'string') message = error.message } catch { /* non-JSON error body */ }
    throw new KnowledgeGraphApiError(response.status, message || `Knowledge graph request failed (${response.status}).`)
  }
  return parseOrganizationKnowledgeGraph(await response.json())
}
