import { researchIdentity } from './researchAccess'

export interface Metrics { count: number; meanMs: number; p95Ms: number; minMs: number; maxMs: number; medianMs?: number | null }
export interface ResearchResult {
  nodeCount: number; edgeCount: number; nodeCounts: Record<string, number>; edgeCounts: Record<string, number>
  trial?: { seed: number; round: number; uniqueByHop: Record<string, number>; warmupQueries: number; structure: { averageDegree: number; maxDegree: number }; attempted: number; errors: number; timeouts: number } | null
  generationMs: number; importMs: number; overall: Metrics; byHop: Record<string, Metrics>
}
export interface ResearchRun {
  id: string; createdBy: string; status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'; createdAt: string
  finishedAt: string | null; seed: number; sizes: number[]; sourceHash: string; sourceVersion: string
  rulesVersion: string; iterations: number; warmup: number; completedQueries: number; phase: string
  protocol?: { seeds: number[]; pairsPerHop: number; rounds: number } | null; totalQueries?: number; planReady?: boolean
  failure: string | null; environment: Record<string, string>; results: ResearchResult[]
}
export interface ResearchCatalog {
  sourceVersion: string; sourceHash: string; nodeCounts: Record<string, number>; edgeCounts: Record<string, number>
  defaultSeeds?: number[]; defaultPairsPerHop?: number; maxPairsPerHop?: number; defaultRounds?: number; maxRounds?: number; maxSeeds?: number; maxTotalQueries?: number
  sizes: number[]; iterations: number; minIterations: number; maxIterations: number; warmup: number; rulesVersion: string
}
const BASE = '/api/v1/admin/research'
export class ResearchApi {
  private csrfHeader = ''
  private csrfToken = ''
  private async request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers)
    const identity = researchIdentity()
    if (!identity) throw new Error('Administrator access is required.')
    // Matches the existing local portal bridge; production authorization uses the server principal.
    headers.set('X-User-Role', 'ADMIN')
    headers.set('X-User-Id', identity.userId)
    if (init.method && init.method !== 'GET') {
      if (!this.csrfToken) await this.prepareSession()
      headers.set('Content-Type', 'application/json')
      headers.set(this.csrfHeader, this.csrfToken)
    }
    const response = await fetch(BASE + path, { ...init, headers, credentials: 'same-origin', cache: 'no-store' })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.message || (response.status === 401 ? 'Sign in to the administrator portal to use Research.' : response.status === 403 ? 'Access denied or session expired. Return to the administrator portal.' : `Research request failed (${response.status}).`))
    }
    return response
  }
  private async prepareSession() {
    const session = await (await this.request('/session')).json()
    this.csrfHeader = session.csrfHeader; this.csrfToken = session.csrfToken
  }
  async catalog(): Promise<ResearchCatalog> { return (await this.request('/catalog')).json() }
  async runs(): Promise<ResearchRun[]> { return (await this.request('/runs')).json() }
  async start(seed: number, sizes: number[], iterations: number): Promise<ResearchRun> {
    return (await this.request('/runs', { method: 'POST', body: JSON.stringify({ seed, sizes, iterations }) })).json()
  }
  async startStudy(seeds: number[], sizes: number[], pairsPerHop: number, rounds: number): Promise<ResearchRun> {
    return (await this.request('/runs', { method: 'POST', body: JSON.stringify({ seeds, sizes, pairsPerHop, rounds }) })).json()
  }
  async download(path: string, filename: string) {
    const response = await this.request(path)
    const url = URL.createObjectURL(await response.blob())
    const link = document.createElement('a'); link.href = url; link.download = filename
    document.body.append(link); link.click(); link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
