import { afterEach, describe, expect, it, vi } from 'vitest'
import { workspaceFetch } from './workspaceFetch'
afterEach(() => vi.unstubAllGlobals())
describe('workspace mutation request protection', () => {
  it('coalesces concurrent CSRF retrieval without reusing a completed token request', async () => {
    let release: ((value: Response) => void) | undefined
    const fetcher = vi.fn(async (input: string | URL, _init?: RequestInit) =>
      input === '/api/v1/workspace-auth/csrf'
        ? new Promise<Response>((resolve) => {
            release = resolve
          })
        : Response.json({ ok: true }),
    )
    vi.stubGlobal('fetch', fetcher)
    const first = workspaceFetch('/one', { method: 'POST' })
    const second = workspaceFetch('/two', { method: 'PUT' })
    expect(fetcher).toHaveBeenCalledTimes(1)
    release!(
      Response.json({ headerName: 'X-CSRF-TOKEN', token: 'first-test-token' }),
    )
    await Promise.all([first, second])
    expect(fetcher).toHaveBeenCalledTimes(3)
    const third = workspaceFetch('/three', { method: 'POST' })
    expect(fetcher).toHaveBeenCalledTimes(4)
    release!(
      Response.json({ headerName: 'X-CSRF-TOKEN', token: 'new-test-token' }),
    )
    await third
    const headers = fetcher.mock.calls.at(-1)?.[1]?.headers as Headers
    expect(headers.get('X-CSRF-TOKEN')).toBe('new-test-token')
  })
  it('does not issue mutations when request protection cannot be obtained', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({}, { status: 401 }))
    vi.stubGlobal('fetch', fetcher)
    await expect(workspaceFetch('/one', { method: 'POST' })).rejects.toThrow(
      'Sign in again',
    )
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
