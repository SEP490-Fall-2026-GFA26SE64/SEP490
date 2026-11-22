import { useContext, useEffect, useState } from 'react'
import { WorkspaceSessionContext } from '../auth/workspaceSession'
import { workspaceFetch } from '../api/workspaceFetch'
export function useAutoFillAccess() {
  const identity = useContext(WorkspaceSessionContext)?.identity
  const scope = `${identity?.organizationId}:${identity?.accountId}`
  const [allowed, setAllowed] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    void workspaceFetch('/api/v1/employee/baseline-attempts/auto-fill-access', { signal: controller.signal }).then(async response => {
      if (response.ok && await response.json() === true && !controller.signal.aborted) setAllowed(scope)
    }).catch(() => {})
    return () => controller.abort()
  }, [scope])
  return allowed === scope
}
