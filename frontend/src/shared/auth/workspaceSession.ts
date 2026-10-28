import { createContext } from 'react'

export interface WorkspaceLayoutIdentity {
  fullName: string | null
  email: string
  organizationId: string | null
  organizationName: string | null
}

export const WorkspaceSessionContext = createContext<{
  identity: WorkspaceLayoutIdentity
  onSignOut: () => Promise<unknown>
} | null>(null)
