import { useLocation } from 'react-router-dom'
import { ModuleManagementWorkspace } from '../../expert/modules/ModuleManagementWorkspace'

export function LdModuleWorkspaceRoute() {
  const { pathname } = useLocation()
  return <ModuleManagementWorkspace mode={pathname.endsWith('/approvals') ? 'approvals' : 'modules'} />
}
