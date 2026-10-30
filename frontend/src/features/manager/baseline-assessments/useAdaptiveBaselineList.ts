import { useEffect, useRef, useState } from 'react'
import { AdaptiveBaselineApiError, disableAdaptiveBlueprint, listAdaptiveBlueprints, type AdaptiveListPage, type AdaptiveListQuery, type AdaptiveListRow } from './adaptiveBaselineApi'

/** Historical management reads and Deactivate never depend on the live Catalog workspace. */
export function useAdaptiveBaselineList() {
  const [query, setQuery] = useState<AdaptiveListQuery>({ search: '', status: '', direction: 'NEWEST', page: 0, size: 20 })
  const [search, setSearch] = useState(''), [reload, setReload] = useState(0)
  const [result, setResult] = useState<AdaptiveListPage | null>(null)
  const [busy, setBusy] = useState(true), [pending, setPending] = useState(false)
  const [error, setError] = useState<AdaptiveBaselineApiError | null>(null), [notice, setNotice] = useState(false)
  const alive = useRef(true), lock = useRef(false), retry = useRef<(() => Promise<void>) | null>(null)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    const timer = window.setTimeout(() => { if (!retry.current && query.search !== search.trim()) { setBusy(true); setError(null); setQuery(previous => ({ ...previous, search: search.trim(), page: 0 })) } }, 300)
    return () => window.clearTimeout(timer)
  }, [search, query.search])
  useEffect(() => {
    const controller = new AbortController()
    void listAdaptiveBlueprints(query, controller.signal).then(value => {
      if (controller.signal.aborted) return
      if (value.total > 0 && query.page > 0 && value.rows.length === 0) { setQuery(previous => ({ ...previous, page: 0 })); return }
      setResult(value)
    }).catch(cause => { if (!controller.signal.aborted) { setError(asFailure(cause)); setResult(null) } })
      .finally(() => { if (!controller.signal.aborted) setBusy(false) })
    return () => controller.abort()
  }, [query, reload])
  async function runPending() {
    if (lock.current || !retry.current) return
    lock.current = true; setBusy(true); setError(null)
    try { await retry.current() }
    catch (cause) {
      if (!alive.current) return
      const value = asFailure(cause); setError(value)
      if (value.status > 0 && value.status < 500 && value.code !== 'INVALID_RESPONSE') { retry.current = null; setPending(false); setResult(null) }
    } finally { if (alive.current) { lock.current = false; setBusy(false) } }
  }
  function deactivate(row: AdaptiveListRow, reason: string) {
    if (busy || lock.current || retry.current || row.status !== 'ACTIVE' || !row.current || !reason.trim()) return
    const key = crypto.randomUUID(), confirmed = { ...row.current }, revision = row.revision, occupation = row.occupationId
    const reconcile = async () => {
      const value = await listAdaptiveBlueprints(query)
      if (!alive.current) return
      setResult(value); setPending(false); setNotice(true); retry.current = null
    }
    retry.current = async () => {
      await disableAdaptiveBlueprint(occupation, revision, confirmed, reason.trim(), key)
      if (!alive.current) return
      retry.current = reconcile // Known success: retry GET only, even if reconciliation fails.
      await reconcile()
    }
    setPending(true); setNotice(false); void runPending()
  }
  return { query, result, search, busy, pending, error, notice, deactivate, retry: runPending,
    setSearch: (value: string) => { if (!pending) setSearch(value) },
    changeQuery: (value: Partial<AdaptiveListQuery>) => { if (!busy && !pending) { setBusy(true); setError(null); setQuery(previous => ({ ...previous, ...value })) } },
    refresh: () => { if (!busy && !pending) { setBusy(true); setError(null); setNotice(false); setReload(previous => previous + 1) } } }
}
function asFailure(cause: unknown) { return cause instanceof AdaptiveBaselineApiError ? cause : new AdaptiveBaselineApiError(0, 'NETWORK_ERROR') }
