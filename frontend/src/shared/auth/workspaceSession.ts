import { createContext } from 'react'

export interface WorkspaceLayoutIdentity {
  accountId?: string | null
  fullName: string | null
  email: string
  organizationId: string | null
  organizationName: string | null
  roles?: string[]
}

export const WorkspaceSessionContext = createContext<{
  identity: WorkspaceLayoutIdentity
  onSignOut: () => Promise<unknown>
} | null>(null)
