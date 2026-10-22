import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AdaptiveBaselineApiError, disableAdaptiveBlueprint, finalizeAdaptiveBlueprint, getAdaptiveWorkspace,
  saveAdaptiveWorking, convertAdaptiveWorking, testAdaptiveBlueprint, isCommonConfiguration,
  type AdaptivePreview, type AdaptiveWorkspace, type AdaptiveVersionId,
} from './adaptiveBaselineApi'
import { adaptiveConfiguration, createAdaptiveDraft, sameAdaptiveConfiguration, type AdaptiveDraft } from './adaptiveBaselineDraft'

export type AdaptiveAction = 'save' | 'convert' | 'finalize' | 'disable'
export interface AdaptiveApproval { workingId: string | null; workingRevision: number; activationRevision: number; current: AdaptiveVersionId | null }
export const adaptiveApproval = (value: AdaptiveWorkspace): AdaptiveApproval => ({ workingId: value.working?.workingRevisionId ?? null, workingRevision: value.working?.revision ?? 0, activationRevision: value.activation?.revision ?? 0, current: value.activation?.current ?? null })
const failure = (cause: unknown) => cause instanceof AdaptiveBaselineApiError ? cause : new AdaptiveBaselineApiError(0, 'NETWORK_ERROR')

/** The route keys this hook's owner by Occupation; language changes never reload it. */
export function useAdaptiveBaselineWorkspace(occupationId: string | undefined) {
  const [workspace, setWorkspace] = useState<AdaptiveWorkspace | null>(null)
  const [draft, setDraft] = useState<AdaptiveDraft | null>(null)
  const [preview, setPreview] = useState<AdaptivePreview | null>(null)
  const [error, setError] = useState<AdaptiveBaselineApiError | null>(null)
  const [busy, setBusy] = useState(Boolean(occupationId))
  const [pending, setPending] = useState(false)
  const [writeCommitted, setWriteCommitted] = useState(false)
  const [needsRefresh, setNeedsRefresh] = useState(false)
  const [notice, setNotice] = useState<AdaptiveAction | 'noop' | null>(null)
  const [previewBinding, setPreviewBinding] = useState<string | null>(null)
  const generation = useRef(0)
  const locked = useRef(Boolean(occupationId))
  const retry = useRef<(() => Promise<void>) | null>(null)
  const needsRead = useRef(false)
  const configuration = workspace && draft ? adaptiveConfiguration(draft, workspace.capacity) : null
  const working = workspace?.working
  const legacy = Boolean(working && !isCommonConfiguration(working.configuration))
  const saved = Boolean(configuration && working && isCommonConfiguration(working.configuration) && sameAdaptiveConfiguration(configuration, working.configuration))
  const dirty = !saved && Boolean(workspace && draft && JSON.stringify(draft) !== JSON.stringify(createAdaptiveDraft(workspace)))
  const binding = working ? `${working.workingRevisionId}:${working.revision}` : null
  const canActivate = saved && Boolean(preview?.feasible) && previewBinding === binding

  const accept = useCallback((value: AdaptiveWorkspace) => {
    setWorkspace(value); setDraft(createAdaptiveDraft(value)); setPreview(null); setPreviewBinding(null)
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
    setDraft(value); setPreview(null); setPreviewBinding(null); setError(null); setNotice(null)
  }

  async function test() {
    if (!occupationId || !saved || !working || locked.current || retry.current || needsRefresh) return
    const token = generation.current
    locked.current = true; setBusy(true); setError(null); setPreview(null); setPreviewBinding(null); setNotice(null)
    try { const value = await testAdaptiveBlueprint(occupationId, working.workingRevisionId, working.revision); if (token === generation.current) { setPreview(value); setPreviewBinding(binding) } }
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

  function command(action: AdaptiveAction, reason = '', confirmed?: AdaptiveApproval) {
    if (!occupationId || !workspace || locked.current || retry.current || needsRefresh) return
    if (action === 'save' && (!configuration || saved || legacy)) return
    if (action === 'convert' && (!configuration || !legacy || !working)) return
    if (action === 'finalize' && !canActivate) return
    if (action === 'disable' && (!workspace.current || !reason.trim())) return
    const snapshot = adaptiveApproval(workspace)
    if (action !== 'save' && (!confirmed || JSON.stringify(confirmed) !== JSON.stringify(snapshot))) {
      setError(new AdaptiveBaselineApiError(409, 'VERSION_CONFLICT')); setNeedsRefresh(true); return
    }
    const key = crypto.randomUUID(), token = generation.current
    const write = action === 'save' ? () => saveAdaptiveWorking(occupationId, working?.revision ?? 0, working?.workingRevisionId ?? null, configuration!, key)
      : action === 'convert' ? () => convertAdaptiveWorking(occupationId, confirmed!.workingId!, confirmed!.workingRevision, configuration!, key)
      : action === 'finalize' ? () => finalizeAdaptiveBlueprint(occupationId, confirmed!.workingId!, confirmed!.workingRevision, confirmed!.activationRevision, confirmed!.current, key)
      : () => disableAdaptiveBlueprint(occupationId, confirmed!.activationRevision, confirmed!.current!, reason.trim(), key)
    const reconcile = async () => {
      const value = await getAdaptiveWorkspace(occupationId)
      if (token !== generation.current) return
      accept(value); retry.current = null; needsRead.current = false; setPending(false); setWriteCommitted(false); setNotice(action)
    }
    needsRead.current = false
    retry.current = async () => {
      await write()
      if (token !== generation.current) return
      setWriteCommitted(true)
      // Once the write succeeded, retry GET only; never submit a second command after a refresh failure.
      needsRead.current = true; retry.current = reconcile
      await reconcile()
    }
    setPending(true); setWriteCommitted(false); setPreview(null); setPreviewBinding(null); setNotice(null)
    void runPending()
  }

  return { workspace, draft, preview, error, busy, pending, writeCommitted, needsRefresh, notice, dirty, saved, legacy, canActivate,
    valid: Boolean(configuration), edit, refresh, test, command, retry: runPending }
}
