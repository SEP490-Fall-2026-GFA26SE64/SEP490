import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { attemptPath, BaselineError, executeCommand, readAttempt, readResult, submitCommand, type BaselineAttempt, type BaselineCommand, type BaselineResult } from './baselineApi'

/** Commands live only in memory. Unknown outcomes lock new writes until exact replay succeeds. */
export function useBaselineAttempt(attemptId?: string) {
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState<BaselineAttempt | null>(null)
  const [result, setResult] = useState<BaselineResult | null>(null)
  const [busy, setBusy] = useState(Boolean(attemptId))
  const [error, setError] = useState<BaselineError | null>(null)
  const [needsRefresh, setNeedsRefresh] = useState(false)
  const [pending, setPending] = useState<BaselineCommand | null>(null)
  const [seconds, setSeconds] = useState(0)
  const clock = useRef({ remaining: 0, receivedAt: 0 })
  const lock = useRef(false), alive = useRef(true)
  function clearDenied(cause: unknown) {
    if (cause instanceof BaselineError && [401, 403, 404].includes(cause.status)) { setAttempt(null); setResult(null) }
  }
  function accept(value: BaselineAttempt) {
    setAttempt(value); setResult(null)
    clock.current = { remaining: Math.max(0, Date.parse(value.deadlineAt) - Date.parse(value.observedAt)), receivedAt: performance.now() }
    setSeconds(Math.ceil(clock.current.remaining / 1000))
  }
  useEffect(() => {
    alive.current = true
    const controller = new AbortController()
    if (attemptId) {
      lock.current = true
      void readAttempt(attemptId, controller.signal).then(async value => {
        if (controller.signal.aborted) return
        if (value.id !== attemptId) throw new BaselineError('INVALID_RESPONSE', 200)
        accept(value)
        if (value.state !== 'IN_PROGRESS') {
          const detail = await readResult(value.id, controller.signal)
          if (!controller.signal.aborted) setResult(detail)
        }
      }).catch(cause => { if (!controller.signal.aborted) { clearDenied(cause); setError(asError(cause)); setNeedsRefresh(true) } })
        .finally(() => { if (!controller.signal.aborted) { lock.current = false; setBusy(false) } })
    }
    return () => { alive.current = false; controller.abort() }
  }, [attemptId])
  useEffect(() => {
    if (attempt?.state !== 'IN_PROGRESS') return
    const timer = window.setInterval(() => setSeconds(Math.max(0, Math.ceil((clock.current.remaining - (performance.now() - clock.current.receivedAt)) / 1000))), 500)
    return () => window.clearInterval(timer)
  }, [attempt])
  async function refresh() {
    if (!attemptId || lock.current || pending) return
    lock.current = true; setBusy(true); setError(null)
    try {
      const value = await readAttempt(attemptId)
      if (!alive.current) return
      if (value.id !== attemptId) throw new BaselineError('INVALID_RESPONSE', 200)
      accept(value)
      if (value.state !== 'IN_PROGRESS') {
        const detail = await readResult(value.id)
        if (alive.current) setResult(detail)
      }
      if (alive.current) setNeedsRefresh(false)
    } catch (cause) { if (alive.current) { clearDenied(cause); setError(asError(cause)); setNeedsRefresh(true) } }
    finally { if (alive.current) { lock.current = false; setBusy(false) } }
  }
  async function run(value: BaselineCommand) {
    if (lock.current || (pending && pending !== value) || (needsRefresh && !pending)) return
    lock.current = true; setBusy(true); setPending(value); setError(null)
    try {
      const next = await executeCommand(value)
      if (!alive.current) return
      if (attemptId && value.path !== '' && next.id !== attemptId) throw new BaselineError('INVALID_RESPONSE', 200)
      setPending(null); setNeedsRefresh(false); accept(next)
      // Read after a committed response: never resend a successful write for a failed result GET.
      if (!attemptId || next.id !== attemptId) { navigate(attemptPath(next.id)); return }
      if (next.state !== 'IN_PROGRESS') {
        try { const detail = await readResult(next.id); if (alive.current) setResult(detail) }
        catch (cause) { if (alive.current) { clearDenied(cause); setError(asError(cause)); setNeedsRefresh(true) } }
      }
    } catch (cause) {
      if (!alive.current) return
      const failure = asError(cause)
      clearDenied(failure); setError(failure)
      if (!failure.ambiguous) { setPending(null); setNeedsRefresh(Boolean(attemptId)) }
    } finally { if (alive.current) { lock.current = false; setBusy(false) } }
  }
  // Zero on the display cannot finalize an attempt. Re-read server time until it reports expiry.
  useEffect(() => {
    if (!attemptId || attempt?.state !== 'IN_PROGRESS' || seconds > 0 || pending || error || busy) return
    const timer = window.setTimeout(() => {
      if (attempt.expired) void run(submitCommand(attempt))
      else void refresh()
    }, 1000)
    return () => window.clearTimeout(timer)
  })
  return { attempt, result, busy, error, pending, seconds, needsRefresh, run, refresh,
    locked: busy || Boolean(pending) || needsRefresh }
}
function asError(cause: unknown) { return cause instanceof BaselineError ? cause : new BaselineError('NETWORK_ERROR') }
