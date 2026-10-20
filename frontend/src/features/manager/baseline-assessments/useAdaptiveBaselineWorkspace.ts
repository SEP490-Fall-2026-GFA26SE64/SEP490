import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AdaptiveBaselineApiError, disableAdaptiveBlueprint, finalizeAdaptiveBlueprint, getAdaptiveWorkspace,
  saveAdaptiveWorking, testAdaptiveBlueprint,
  type AdaptiveConfiguration, type AdaptivePreview, type AdaptiveWorkspace,
} from './adaptiveBaselineApi'
import { adaptiveConfiguration, createAdaptiveDraft, type AdaptiveDraft } from './adaptiveBaselineDraft'

export type AdaptiveAction = 'save' | 'finalize' | 'disable'
const failure = (cause: unknown) => cause instanceof AdaptiveBaselineApiError ? cause : new AdaptiveBaselineApiError(0, 'NETWORK_ERROR')
const canonical = (config: AdaptiveConfiguration) => JSON.stringify({ ...config, roles: Object.fromEntries(Object.entries(config.roles).sort(([a], [b]) => a.localeCompare(b))) })

/** The route keys this hook's owner by Occupation; language changes never reload it. */
export function useAdaptiveBaselineWorkspace(occupationId: string | undefined) {
  const [workspace, setWorkspace] = useState<AdaptiveWorkspace | null>(null)
  const [draft, setDraft] = useState<AdaptiveDraft | null>(null)
  const [preview, setPreview] = useState<AdaptivePreview | null>(null)
  const [error, setError] = useState<AdaptiveBaselineApiError | null>(null)
  const [busy, setBusy] = useState(Boolean(occupationId))
  const [pending, setPending] = useState(false)
  const [needsRefresh, setNeedsRefresh] = useState(false)
  const [notice, setNotice] = useState<AdaptiveAction | null>(null)
  const generation = useRef(0)
  const locked = useRef(Boolean(occupationId))
  const retry = useRef<(() => Promise<void>) | null>(null)
  const needsRead = useRef(false)
  const configuration = workspace && draft ? adaptiveConfiguration(draft, workspace.capacity) : null
  const dirty = Boolean(workspace && draft && JSON.stringify(draft) !== JSON.stringify(createAdaptiveDraft(workspace)))
  const saved = Boolean(configuration && workspace?.working && canonical(configuration) === canonical(workspace.working.configuration))

  const accept = useCallback((value: AdaptiveWorkspace) => {
    setWorkspace(value); setDraft(createAdaptiveDraft(value)); setPreview(null)
    setError(null); setNeedsRefresh(false)
  }, [])

  useEffect(() => {
    const token = ++generation.current
    const controller = new AbortController()
    if (occupationId) void getAdaptiveWorkspace(occupationId, controller.signal)
      .then(value => { if (generation.current === token) accept(value) })
      .catch(cause => { if (generation.current === token && !controller.signal.aborted) setError(failure(cause)) })
      .finally(() => { if (generation.current === token) { locked.current = false; setBusy(false) } })
    return () => { generation.current = token + 1; controller.abort() }
  }, [occupationId, accept])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    if (dirty || pending) window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, pending])

  async function refresh() {
    if (!occupationId || locked.current || retry.current) return
    const token = generation.current
    locked.current = true; setBusy(true); setError(null)
    try { const value = await getAdaptiveWorkspace(occupationId); if (token === generation.current) { accept(value); setNotice(null) } }
    catch (cause) { if (token === generation.current) setError(failure(cause)) }
    finally { if (token === generation.current) { locked.current = false; setBusy(false) } }
  }

  function edit(value: AdaptiveDraft) {
    if (locked.current || retry.current || needsRefresh) return
    setDraft(value); setPreview(null); setError(null); setNotice(null)
  }

  async function test() {
    if (!occupationId || !configuration || locked.current || retry.current || needsRefresh) return
    const token = generation.current
    locked.current = true; setBusy(true); setError(null); setPreview(null); setNotice(null)
    try { const value = await testAdaptiveBlueprint(occupationId, configuration); if (token === generation.current) setPreview(value) }
    catch (cause) {
      if (token === generation.current) { const value = failure(cause); setError(value); if ([401, 403, 409].includes(value.status)) setNeedsRefresh(true) }
    } finally { if (token === generation.current) { locked.current = false; setBusy(false) } }
  }

  async function runPending() {
    if (locked.current || !retry.current) return
    const token = generation.current
    locked.current = true; setBusy(true); setError(null)
    try { await retry.current() }
    catch (cause) {
      if (token === generation.current) {
        const value = failure(cause)
        setError(value)
        // A committed response may have been lost. Keep the exact closure/key until resolved.
        const ambiguous = value.status === 0 || value.status >= 500 || value.code === 'INVALID_RESPONSE'
        if (!ambiguous && !needsRead.current) { retry.current = null; setPending(false); setNeedsRefresh(true) }
      }
    } finally { if (token === generation.current) { locked.current = false; setBusy(false) } }
  }

  function command(action: AdaptiveAction, reason = '') {
    if (!occupationId || !workspace || locked.current || retry.current || needsRefresh) return
    if ((action === 'save' && !configuration) || (action === 'finalize' && !saved) || (action === 'disable' && (!workspace.current || !reason.trim()))) return
    const key = crypto.randomUUID(), token = generation.current
    const revision = workspace.activation?.revision ?? 0
    const write = action === 'save' ? () => saveAdaptiveWorking(occupationId, workspace.working?.revision ?? 0, configuration!, key)
      : action === 'finalize' ? () => finalizeAdaptiveBlueprint(occupationId, workspace.working!.workingRevisionId, workspace.working!.revision, revision, key)
        : () => disableAdaptiveBlueprint(occupationId, revision, reason.trim(), key)
    const reconcile = async () => {
      const value = await getAdaptiveWorkspace(occupationId)
      if (token !== generation.current) return
      accept(value); retry.current = null; needsRead.current = false; setPending(false); setNotice(action)
    }
    needsRead.current = false
    retry.current = async () => {
      await write()
      if (token !== generation.current) return
      // Once the write succeeded, retry GET only; never submit a second command after a refresh failure.
      needsRead.current = true; retry.current = reconcile
      await reconcile()
    }
    setPending(true); setPreview(null); setNotice(null)
    void runPending()
  }

  return { workspace, draft, preview, error, busy, pending, needsRefresh, notice, dirty, saved,
    valid: Boolean(configuration), edit, refresh, test, command, retry: runPending }
}
