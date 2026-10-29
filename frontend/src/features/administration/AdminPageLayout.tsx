import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { WorkspaceLayout } from '../../shared/layouts/WorkspaceLayout'
import { PageHeader } from '../../shared/components/ui/PageHeader'
import { request, type Identity } from '../subscription/subscriptionApi'

export function AdminPageLayout({ identity, organizationName, title, description, actions, children }: {
  identity: Identity
  organizationName?: string | null
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  const cache = useQueryClient()
  return <WorkspaceLayout identity={{ fullName: identity.fullName, email: identity.email,
    organizationId: identity.organizationId, organizationName: organizationName ?? null }}
    onSignOut={async () => {
      await request('/api/v1/workspace-auth/sign-out', 'POST')
      cache.clear()
    }}>
    <div className="admin-page space-y-6 pb-8">
      <PageHeader title={title} description={description} actions={actions} />
      {children}
    </div>
  </WorkspaceLayout>
}
