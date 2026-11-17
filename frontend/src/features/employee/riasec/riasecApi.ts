import { workspaceFetch } from '../../../shared/api/workspaceFetch'
export const dimensions = ['R', 'I', 'A', 'S', 'E', 'C'] as const
export type Dimension = typeof dimensions[number]
export type Scores = Record<Dimension, number>
export type Draft = { draftId: string | null; answers: Record<string, number>; revision: number; editorId: string | null }
export type Recommendation = { rank: number; position: { id: string; code: string; name: string; description: string; scores: Scores }; explanation: string; comparisons?: { dimension: Dimension; employeeScore: number; positionScore: number }[] }
export type Result = { id: string; scores: Scores; submittedAt: string; deletedAt: string | null; aiStatus: string; recommendations: Recommendation[] | null; failureCode: string | null }
export type View = { draft: Draft; results: Result[]; currentId: string | null; activePositionIds: string[] }
export class RiasecError extends Error {
  code: string
  status: number
  constructor(code: string, status: number) { super(code); this.code = code; this.status = status }
}
export async function riasecRequest<T>(path = '', method = 'GET', data?: unknown): Promise<T> {
  const res = await workspaceFetch(`/api/v1/employee/riasec${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) })
  const value = await res.json().catch(() => null)
  if (!res.ok) throw new RiasecError(value?.code ?? 'RIASEC_UNAVAILABLE', res.status)
  return value as T
}
export const aiRunning = (result?: Result) => !!result && ['QUEUED', 'PROCESSING'].includes(result.aiStatus)
