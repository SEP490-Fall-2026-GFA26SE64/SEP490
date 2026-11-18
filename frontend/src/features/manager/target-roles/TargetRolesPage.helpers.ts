import {
type ComboboxOption
} from '../../../shared/components/ui/Combobox'
import {
getEligibleExpertsForJobPosition,
type TargetRoleModel
} from '../data/ldManagerMockData'

export const getExpertOptionsForJobPosition = (
  jobPositionCode?: string,
  organizationId?: string,
  departmentScope?: { id?: string; code?: string; name?: string } | null,
): ComboboxOption[] => {
  const eligible = getEligibleExpertsForJobPosition(
    jobPositionCode,
    organizationId,
    departmentScope,
  )

  return eligible.map((exp) => ({
    value: exp.id,
    label: exp.name,
    description: exp.title,
  }))
}

export type ManagerRoleStatus =
  | 'published'
  | 'submitted'
  | 'staged'
  | 'sent'
  | 'draft'
  | 'feedback'
  | 'rejected'
  | 'unpublished'

export const getManagerEffectiveStatus = (
  role: TargetRoleModel,
): ManagerRoleStatus => {
  if (role.status === 'published' || (role.status as string) === 'ACTIVE' || (role.status as string) === 'PUBLISHED') return 'published'
  if (role.status === 'unpublished' || (role.status as string) === 'UNPUBLISHED') return 'unpublished'
  if (role.status === 'submitted' || (role.status as string) === 'SUBMITTED') return 'submitted'
  if (role.status === 'staged' || (role.status as string) === 'STAGED') return 'staged'
  if (role.status === 'sent' || (role.status as string) === 'SENT') return 'sent'

  if (role.status === 'rejected') {
    return role.rejectionReason?.startsWith('[LD_MANAGER]:')
      ? 'rejected'
      : 'feedback'
  }

  return 'draft'
}

