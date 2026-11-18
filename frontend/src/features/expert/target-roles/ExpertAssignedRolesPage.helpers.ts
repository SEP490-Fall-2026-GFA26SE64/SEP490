import {
type TargetRoleModel
} from '../../manager/data/ldManagerMockData'

export type ExpertRoleStatus =
  | 'published'
  | 'unpublished'
  | 'submitted'
  | 'sent'
  | 'approved'
  | 'draft'
  | 'feedback'
  | 'rejected'

export const getExpertEffectiveStatus = (
  role: TargetRoleModel,
): ExpertRoleStatus => {
  if (role.status === 'published' || (role.status as string) === 'ACTIVE') return 'published'
  if (role.status === 'unpublished') return 'unpublished'
  if (role.status === 'submitted' || role.status === 'approved' || (role.status as string) === 'APPROVED') return 'submitted'
  if (role.status === 'sent') return 'sent'
  if (role.status === 'rejected') {
    return 'rejected'
  }

  return 'draft'
}

