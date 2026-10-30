import { workspaceFetch } from './workspaceFetch'
export interface BankContent { prompt: string; options: string[]; correctAnswer: number | null; skillId: string; skillName: string | null; difficulty: string | null; explanation: string | null }
export interface BankVersion { id: string; number: number; state: 'DRAFT' | 'SUBMITTED' | 'PUBLISHED'; content: BankContent; editedBy: string | null; editedAt: string | null; submittedBy: string | null; submittedAt: string | null; reviewedBy: string | null; reviewedAt: string | null; reason: string | null; viewed: Record<string,string> }
export interface BankQuestion { id: string; code: string; createdBy: string | null; createdAt: string | null; owner: string | null; revision: number; retired: boolean; request: 'RETIRE' | 'REACTIVATE' | null; versions: BankVersion[] }
export interface BankAudit { id: string; question: string; version: string | null; action: string; actor: string; at: string; reason: string | null; snapshot: BankContent | null }
export interface BankView { id: string; name: string; questions: BankQuestion[]; history: BankAudit[] }
export interface BankChoice { id: string; name: string }
export interface BankSession { actor: { id: string; organization: string; role: 'DOMAIN_EXPERT' | 'LD_MANAGER' }; skills: BankChoice[]; experts: BankChoice[]; people: BankChoice[]; maxImportRows: number; maxImportBytes: number }
export interface BankNotice { id: string; recipient: string; title: string; body: string; createdAt: string; readAt: string | null }
export interface BankRow { code: string; content: BankContent }
export interface BankPreview { id: string; expiresAt: string; rows: BankRow[]; errors: string[]; warnings: string[]; committed: boolean; expected: Record<string,number> }
export async function bankRequest<T>(path = '', data?: unknown, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) controller.abort()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { reject(new Error('Request timed out. Reload the latest data before retrying.')); controller.abort() }, 30000) })
  try {
    const request = async (): Promise<T> => {
      const response = await workspaceFetch('/api/v1/question-bank' + path, { method: data === undefined ? 'GET' : 'POST', ...(data === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }), signal: controller.signal })
      if (!response.ok) { const payload: unknown = await response.json().catch(() => null); throw new Error(payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string' ? payload.message : `Request failed (${response.status})`) }
      if (response.status === 204 || response.headers.get('content-length') === '0') return undefined as T
      const text = await response.text()
      try { return text ? JSON.parse(text) as T : undefined as T } catch { throw new Error('Unexpected server response. Reload and retry.') }
    }
    return await Promise.race([request(), timeout])
  } finally {
    if (timer) clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
  }
}
