export interface BenchmarkRequest {
  scale?: '1k' | '5k' | '10k'
  fixtureSet?: 1 | 2 | 3
  testRuns?: number
  warmupRuns?: number
  minHops?: number
  maxHops?: number
  executeOnLiveCatalog?: boolean
}

export interface FixturePreviewItem {
  startId: string
  startName: string
  startType?: string
  targetId: string
  targetName: string
  targetType?: string
  hops: number
}

export interface StepBreakdown {
  indexLookupMs: number
  queueInitMs: number
  traversalMs: number
  pathReconstructionMs: number
  totalMeanMs: number
}

export interface DifferenceBreakdown {
  branchingFactorPct: number
  branchingFactorMs: number
  pageCacheMissPct: number
  pageCacheMissMs: number
  bTreeDepthPct: number
  bTreeDepthMs: number
  totalDifferenceMs: number
}

export interface PathSample {
  startId: string
  startName: string
  startType?: string
  targetId: string
  targetName: string
  targetType?: string
  hops: number
  latencyMs: number
}

export interface ScaleComparisonItem {
  scale: string
  label: string
  nodes: number
  relationships: number
  meanLatencyMs: number
  p95LatencyMs: number
  speedupVsLinear: number
}

export interface BenchmarkResponse {
  researchQuestion: string
  scale: string
  scaleLabel: string
  catalogNodes: number
  catalogRelationships: number
  neo4jVersion: string
  totalRuns: number
  warmupRuns: number
  meanLatencyMs: number
  p95LatencyMs: number
  p50LatencyMs: number
  minLatencyMs: number
  maxLatencyMs: number
  stdDevMs: number
  sublinearScalingFactor: number
  stepBreakdown: StepBreakdown
  differenceBreakdown: DifferenceBreakdown
  samplePaths: PathSample[]
  scaleComparison: ScaleComparisonItem[]
  defenseArguments: string[]
  recentRuns: number[]
  executedAt: string
}

export interface OverviewResponse {
  neo4jVersion: string
  totalNodes: number
  totalRelationships: number
  availableScales: string[]
  defaultRuns: number
  defaultWarmupRuns: number
  ready: boolean
}

export async function getBenchmarkOverview(): Promise<OverviewResponse> {
  const res = await fetch('/api/v1/platform/benchmark/overview', {
    headers: { 'Accept': 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`Failed to load benchmark overview: ${res.statusText}`)
  }
  return res.json()
}

export async function getFixturePreview(
  scale: string = '1k',
  fixtureSet: number = 1,
  limit: number = 1000
): Promise<FixturePreviewItem[]> {
  // 1. Prefer direct static fixture asset (instant, pure, contains all 1,000 verified pairs)
  try {
    const staticRes = await fetch(`/fixtures/test_pairs_${scale}_set${fixtureSet}.json`)
    if (staticRes.ok) {
      const all: FixturePreviewItem[] = await staticRes.json()
      return limit > 0 ? all.slice(0, limit) : all
    }
  } catch {
    // proceed to backend API
  }

  // 2. Fallback to backend platform benchmark fixtures endpoint
  try {
    const res = await fetch(
      `/api/v1/platform/benchmark/fixtures?scale=${encodeURIComponent(scale)}&setIndex=${fixtureSet}&limit=${limit}`,
      {
        headers: { 'Accept': 'application/json' },
      }
    )
    if (res.ok) {
      return res.json()
    }
  } catch {
    // ignore
  }

  throw new Error(`Failed to load fixture preview: ${scale} set ${fixtureSet}`)
}

export async function runGraphBenchmark(req: BenchmarkRequest = {}): Promise<BenchmarkResponse> {
  const res = await fetch('/api/v1/platform/benchmark/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    throw new Error(`Failed to execute graph benchmark: ${res.statusText}`)
  }
  return res.json()
}

