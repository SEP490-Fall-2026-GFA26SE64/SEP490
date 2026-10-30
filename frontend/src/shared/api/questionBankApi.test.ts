import { afterEach, expect, it, vi } from 'vitest'
import { bankRequest } from './questionBankApi'
import { workspaceFetch } from './workspaceFetch'
vi.mock('./workspaceFetch', () => ({ workspaceFetch: vi.fn() }))
afterEach(() => { vi.clearAllMocks(); vi.useRealTimers() })
it('ends a stalled read with actionable recovery and cancels the request', async () => {
 vi.useFakeTimers()
 vi.mocked(workspaceFetch).mockImplementation(() => new Promise<Response>(() => undefined))
 const result = expect(bankRequest('/session')).rejects.toThrow('Reload the latest data before retrying')
 await vi.advanceTimersByTimeAsync(30000)
 await result
 expect(vi.mocked(workspaceFetch).mock.calls[0][1]?.signal?.aborted).toBe(true)
})
it('preserves a conflict response so the user can review before retrying', async () => {
 vi.mocked(workspaceFetch).mockResolvedValue(Response.json({ message: 'Question changed. Reload and review the current version.' }, { status: 409 }))
 await expect(bankRequest('/commands', { action: 'APPROVE' })).rejects.toThrow('Question changed')
})
it('does not display an unexpected HTML server response as question content', async () => {
 vi.mocked(workspaceFetch).mockResolvedValue(new Response('<html>Unavailable</html>'))
 await expect(bankRequest()).rejects.toThrow('Unexpected server response')
})
