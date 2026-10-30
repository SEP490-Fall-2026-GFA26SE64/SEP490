import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { initialSession } from '../api/initialPathway'

/** Server session scopes caches. Browser portal/company/localStorage never authorize this flow. */
export function useInitialPathwaySession() {
  const client = useQueryClient()
  const session = useQuery({ queryKey: ['initialPathwaySession'], queryFn: ({ signal }) => initialSession(signal), retry: false, gcTime: 0 })
  useEffect(() => {
    const changed = () => { void client.cancelQueries({ queryKey: ['initialPathway'] }); client.removeQueries({ queryKey: ['initialPathway'] }); void client.resetQueries({ queryKey: ['initialPathwaySession'] }) }
    window.addEventListener('initial_pathway_session_changed', changed)
    return () => window.removeEventListener('initial_pathway_session_changed', changed)
  }, [client])
  const scope = session.data ? `${session.data.organizationId}:${session.data.actorId}:${session.data.role}` : null
  return { ...session, scope }
}
