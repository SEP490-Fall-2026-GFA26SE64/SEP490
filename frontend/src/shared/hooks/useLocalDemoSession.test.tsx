import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useLocalDemoSession } from './useLocalDemoSession'
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); localStorage.clear() })
it.each(['false', ''])('RB16 flag %s denies session establishment despite URL/localStorage', async flag => {
  vi.stubEnv('VITE_LOCAL_BASELINE_DEMO_ENABLED', flag); const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
  localStorage.setItem('active_actor', 'employee'); window.history.replaceState({}, '', '/employee/upskilling')
  const { result } = renderHook(useLocalDemoSession)
  expect(await result.current.establish('employee-a')).toBe(false); expect(fetcher).not.toHaveBeenCalled()
})
it('RB16 only allowlisted persona enters credentialed server session, synchronous duplicate denied', async () => {
  vi.stubEnv('VITE_LOCAL_BASELINE_DEMO_ENABLED', 'true')
  let resolve!: (value: Response) => void
  const fetcher = vi.fn(() => new Promise<Response>(done => { resolve = done })); vi.stubGlobal('fetch', fetcher)
  const { result } = renderHook(useLocalDemoSession)
  expect(await result.current.establish('employee-in-url')).toBe(false)
  let pending!: Promise<boolean>
  act(() => { pending = result.current.establish('employee-a') })
  expect(await result.current.establish('admin')).toBe(false)
  expect(fetcher).toHaveBeenCalledWith('/api/v1/local-baseline-demo/session', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{"persona":"employee-a"}' })
  resolve(new Response(null, { status: 204 })); expect(await pending).toBe(true)
})
it.each([401, 403, 503, 0])('RB16 session failure %s returns false and releases lock for explicit retry', async status => {
  vi.stubEnv('VITE_LOCAL_BASELINE_DEMO_ENABLED', 'true')
  const fetcher = vi.fn(); if (status) fetcher.mockResolvedValueOnce(new Response(null, { status })); else fetcher.mockRejectedValueOnce(Error('network'))
  fetcher.mockResolvedValueOnce(new Response(null, { status: 204 })); vi.stubGlobal('fetch', fetcher)
  const { result } = renderHook(useLocalDemoSession)
  expect(await result.current.establish('employee-a')).toBe(false); expect(await result.current.establish('employee-a')).toBe(true)
})
