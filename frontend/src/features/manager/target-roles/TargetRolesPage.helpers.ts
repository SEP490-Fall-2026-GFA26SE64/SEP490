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
  | 'sent'
  | 'draft'
  | 'feedback'
  | 'rejected'
  | 'unpublished'

export const getManagerEffectiveStatus = (
  role: TargetRoleModel,
): ManagerRoleStatus => {
  if (role.status === 'published') return 'published'
  if (role.status === 'unpublished') return 'unpublished'
  if (role.status === 'submitted') return 'submitted'
  if (role.status === 'sent') return 'sent'

  if (role.status === 'rejected') {
    return role.rejectionReason?.startsWith('[LD_MANAGER]:')
      ? 'rejected'
      : 'feedback'
  }

  return 'draft'
}

